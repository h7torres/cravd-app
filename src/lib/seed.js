import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { DAY, flavorTags, HOUR, MIN } from "./helpers";

// Real UCSD dining hall dishes. Names and halls come from Triton Taste
// (tritontaste.com, an unofficial student site), used with their permission.
// sourceUrl points at each dish's Triton Taste page. Their photos can't be linked
// directly (their server only serves images to their own site), so photos still
// need to be copied into public/dishes/ and set as photoURL, credited to Triton Taste. Descriptions, flavor tags and allergens are our own
// rough estimates for the demo: check the official HDH labels before relying on them.
const ITEMS = [
  { id: "d_korean_chicken_bowl", name: "Korean Chicken Bowl with Rice", category: "Bowls", diningHall: "64 Degrees", emoji: "🍚", tags: ["savory", "spicy", "filling"], description: "Sweet-spicy Korean chicken over rice.", allergens: ["soy", "sesame", "gluten"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-64-degrees-korean-chicken-bowl-with-rice-bba5cafa" },
  { id: "d_orange_chicken_bowl", name: "Orange Chicken Bowl with Rice", category: "Bowls", diningHall: "64 Degrees", emoji: "🍊", tags: ["sweet", "crispy", "filling"], description: "Crispy orange chicken over rice.", allergens: ["gluten", "soy", "eggs"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-64-degrees-orange-chicken-bowl-with-rice-a9908e85" },
  { id: "d_dobu_jorim_tofu", name: "Dobu Jorim Tofu Bowl with Rice", category: "Bowls", diningHall: "64 Degrees", emoji: "🥢", tags: ["savory", "spicy", "healthy"], description: "Braised Korean-style tofu over rice.", allergens: ["soy", "sesame"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-64-degrees-dobu-jorim-tofu-bowl-with-rice-58c98491" },
  { id: "d_thai_coconut_chicken", name: "Thai Coconut Chicken Bowl with Rice", category: "Bowls", diningHall: "64 Degrees", emoji: "🥥", tags: ["flavorful", "spicy", "savory"], description: "Coconut curry chicken over rice.", allergens: ["soy", "fish"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-64-degrees-thai-coconut-chicken-bowl-with-rice-192dc96d" },
  { id: "d_spicy_tuna_tempura_roll", name: "Spicy Tuna and Tempura Shrimp Roll", category: "Sushi & Poke", diningHall: "64 Degrees", emoji: "🍣", tags: ["spicy", "crispy", "fresh"], description: "Spicy tuna with crunchy tempura shrimp.", allergens: ["fish", "shellfish", "gluten", "eggs", "soy", "sesame"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-64-degrees-spicy-tuna-and-tempura-shrimp-roll-21fe7b1c" },
  { id: "d_carne_asada_fries", name: "Carne Asada Fries", category: "Fries & Sides", diningHall: "64 Degrees", emoji: "🍟", tags: ["savory", "cheesy", "filling"], description: "Fries loaded with carne asada and cheese.", allergens: ["dairy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-64-degrees-carne-asada-fries-5b3cf243" },
  { id: "d_churro_french_toast", name: "Churro French Toast", category: "Breakfast", diningHall: "64 Degrees", emoji: "🍞", tags: ["sweet", "comfort"], description: "Cinnamon-sugar French toast.", allergens: ["gluten", "dairy", "eggs"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-64-degrees-churro-french-toast-8c097133" },
  { id: "d_tres_leches", name: "Tres Leches Cake", category: "Desserts", diningHall: "64 Degrees", emoji: "🍰", tags: ["sweet", "comfort"], description: "Milk-soaked sponge cake.", allergens: ["gluten", "dairy", "eggs"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-64-degrees-tres-leches-cake-28af8396" },
  { id: "d_korean_bbq_smash", name: "Korean BBQ Smash Burger", category: "Burgers & Sandwiches", diningHall: "Canyon Vista", emoji: "🍔", tags: ["savory", "flavorful", "filling"], description: "Smash burger with Korean BBQ sauce.", allergens: ["gluten", "dairy", "eggs", "soy", "sesame"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-canyon-vista-korean-bbq-smash-burger-2c8a636c" },
  { id: "d_mongolian_bbq_bowl", name: "Mongolian BBQ Chicken Bowl", category: "Bowls", diningHall: "Canyon Vista", emoji: "🍗", tags: ["savory", "sweet", "filling"], description: "Stir-fried chicken in Mongolian BBQ sauce.", allergens: ["soy", "gluten"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-canyon-vista-mongolian-bbq-chicken-bowl-10d1c224" },
  { id: "d_acai_bowl", name: "Acai Bowl", category: "Breakfast", diningHall: "Canyon Vista", emoji: "🫐", tags: ["sweet", "fresh", "healthy"], description: "Acai blend topped with fruit and granola.", allergens: ["tree nuts"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-canyon-vista-acai-bowl-58d60e80" },
  { id: "d_cv_poke", name: "BYO Poke Bowl", category: "Sushi & Poke", diningHall: "Canyon Vista", emoji: "🥗", tags: ["fresh", "healthy"], description: "Build your own poke bowl.", allergens: ["fish", "soy", "sesame"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-canyon-vista-byo-poke-bowl-44e367b1" },
  { id: "d_huli_huli", name: "Huli Huli Chicken Plate", category: "Plates", diningHall: "Canyon Vista", emoji: "🍍", tags: ["sweet", "savory", "flavorful"], description: "Hawaiian-style grilled chicken plate.", allergens: ["soy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-canyon-vista-huli-huli-chicken-plate-a898a663" },
  { id: "d_buffalo_chicken_sandwich", name: "Buffalo Chicken Sandwich", category: "Burgers & Sandwiches", diningHall: "Canyon Vista", emoji: "🥪", tags: ["spicy", "flavorful", "crispy"], description: "Crispy chicken tossed in buffalo sauce.", allergens: ["gluten", "dairy", "eggs"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-canyon-vista-buffalo-chicken-sandwich-76b15c54" },
  { id: "d_oreo_cheesecake", name: "Oreo Cheesecake", category: "Desserts", diningHall: "Canyon Vista", emoji: "🍰", tags: ["sweet"], description: "Cheesecake with cookie crust.", allergens: ["gluten", "dairy", "eggs", "soy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-canyon-vista-oreo-cheesecake-f4696915" },
  { id: "d_loaded_chicken_fries", name: "Loaded Chicken Fries", category: "Fries & Sides", diningHall: "Canyon Vista", emoji: "🍟", tags: ["cheesy", "filling", "comfort"], description: "Fries topped with chicken and cheese.", allergens: ["gluten", "dairy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-canyon-vista-loaded-chicken-fries-fa3e7c7b" },
  { id: "d_taco_sampler", name: "Taco Sampler Plate", category: "Tacos & Mexican", diningHall: "Sixth", emoji: "🌮", tags: ["spicy", "savory", "flavorful"], description: "A mix of tacos to try.", allergens: ["dairy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-sixth-taco-sampler-plate-31a971eb" },
  { id: "d_tonkotsu_ramen", name: "Tonkotsu Pork Ramen", category: "Noodles & Pasta", diningHall: "Sixth", emoji: "🍜", tags: ["savory", "flavorful", "comfort"], description: "Rich pork-broth ramen.", allergens: ["gluten", "eggs", "soy", "sesame"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-sixth-tonkotsu-pork-ramen-8f9f1e72" },
  { id: "d_smoked_brisket", name: "Smoked Beef Brisket Plate", category: "Plates", diningHall: "Sixth", emoji: "🥩", tags: ["savory", "filling", "comfort"], description: "Smoked brisket with sides.", allergens: [], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-sixth-smoked-beef-brisket-plate-0e0a6edb" },
  { id: "d_lava_poke", name: "Lava Poke Bowl with Rice", category: "Sushi & Poke", diningHall: "Sixth", emoji: "🌋", tags: ["spicy", "fresh"], description: "Poke with a spicy lava sauce.", allergens: ["fish", "soy", "sesame", "eggs"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-sixth-lava-poke-bowl-with-rice-cbb178d5" },
  { id: "d_birria_fries", name: "Birria Loaded Fries", category: "Fries & Sides", diningHall: "Sixth", emoji: "🍟", tags: ["spicy", "savory", "cheesy"], description: "Fries loaded with birria and cheese.", allergens: ["dairy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-sixth-birria-loaded-fries-6775872d" },
  { id: "d_banana_pudding", name: "Banana Pudding", category: "Desserts", diningHall: "Sixth", emoji: "🍌", tags: ["sweet", "comfort"], description: "Layers of pudding, banana and wafers.", allergens: ["dairy", "eggs", "gluten"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-sixth-banana-pudding-aead7eed" },
  { id: "d_garlic_butter_shrimp", name: "Garlic Butter Shrimp Plate", category: "Plates", diningHall: "Pines", emoji: "🍤", tags: ["savory", "flavorful"], description: "Shrimp in garlic butter.", allergens: ["shellfish", "dairy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-pines-garlic-butter-shrimp-plate-e34652c8" },
  { id: "d_bun_cha", name: "Bun Cha Pork Belly Noodle Bowl", category: "Noodles & Pasta", diningHall: "Pines", emoji: "🥢", tags: ["savory", "flavorful", "fresh"], description: "Vietnamese-style pork belly with noodles.", allergens: ["fish", "soy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-pines-bun-cha-pork-belly-noodle-bowl-535fb3eb" },
  { id: "d_spicy_tuna_roll", name: "Spicy Tuna Roll", category: "Sushi & Poke", diningHall: "The Bistro", emoji: "🍣", tags: ["spicy", "fresh"], description: "Classic spicy tuna roll.", allergens: ["fish", "soy", "sesame", "eggs"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/the-bistro-spicy-tuna-roll" },
  { id: "d_detroit_pizza", name: "Classic Red Top Detroit Style Pizza", category: "Pizza", diningHall: "OceanView", emoji: "🍕", tags: ["cheesy", "savory", "comfort"], description: "Square pizza with crispy cheese edges.", allergens: ["gluten", "dairy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-oceanview-classic-red-top-detroit-style-pizza-d7c22c72" },
  { id: "d_philly_cheesesteak", name: "Philly Cheesesteak", category: "Burgers & Sandwiches", diningHall: "OceanView", emoji: "🥖", tags: ["cheesy", "savory", "filling"], description: "Steak and melted cheese on a roll.", allergens: ["gluten", "dairy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-oceanview-philly-cheesesteak-40847567" },
  { id: "d_margherita_pizza", name: "Personal Margherita Pizza", category: "Pizza", diningHall: "Foodworx", emoji: "🍕", tags: ["cheesy", "fresh"], description: "Tomato, mozzarella and basil.", allergens: ["gluten", "dairy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-foodworx-personal-margherita-pizza-73ff76e9" },
  { id: "d_belgian_waffle", name: "Belgian Waffle", category: "Breakfast", diningHall: "Ventanas", emoji: "🧇", tags: ["sweet", "comfort"], description: "Thick, crispy waffle.", allergens: ["gluten", "dairy", "eggs"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-ventanas-belgian-waffle-de201cb4" },
  { id: "d_caribbean_curry_pasta", name: "Caribbean Curry Pasta", category: "Noodles & Pasta", diningHall: "Ventanas", emoji: "🍝", tags: ["spicy", "flavorful"], description: "Pasta in a Caribbean curry sauce.", allergens: ["gluten", "dairy"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-ventanas-caribbean-curry-pasta-d658afed" },
  { id: "d_matcha_oats", name: "Strawberry Matcha Overnight Oats", category: "Breakfast", diningHall: "Seventh Market", emoji: "🍓", tags: ["sweet", "fresh", "healthy"], description: "Overnight oats with matcha and strawberry.", allergens: ["dairy", "gluten"], photoCredit: "Triton Taste", sourceUrl: "https://tritontaste.com/dishes/community-seventh-market-strawberry-matcha-overnight-oats-5d274c0a" },
];

// Placeholder dishes from earlier versions of the seed, removed when it runs again
const OLD_ITEM_IDS = [
  "i_katsu", "i_poke", "i_pepperoni", "i_margherita", "i_carnitas", "i_veggie_tacos", "i_burger",
  "i_plant_burger", "i_ramen", "i_pad_thai", "i_cookie", "i_cheesecake", "i_wings", "i_mac",
];

// Sample accounts: they exist only so Explore and the Home feed have something to
// show on day one. Flagged `demo: true`, so they never appear as classmates or friends.
const USERS = [
  { id: "u_cris", name: "Cris", handle: "cris", bio: "Will try anything once.", prefs: ["spicy", "savory", "flavorful"], favorites: ["d_tonkotsu_ramen", "d_detroit_pizza", "d_buffalo_chicken_sandwich"], friends: ["u_miguel", "u_ana", "u_dev"], following: ["u_sofia"] },
  { id: "u_miguel", name: "Miguel", handle: "miguelito", bio: "Taco Tuesday is every day.", prefs: ["spicy", "savory", "filling"], favorites: ["d_taco_sampler", "d_birria_fries", "d_korean_bbq_smash"], friends: ["u_cris", "u_ana", "u_jay"], following: ["u_sofia"] },
  { id: "u_ana", name: "Ana", handle: "ana.eats", bio: "Dessert first.", prefs: ["sweet", "fresh", "healthy"], favorites: ["d_acai_bowl", "d_tres_leches", "d_matcha_oats"], friends: ["u_cris", "u_miguel", "u_sofia", "u_dev"], following: [] },
  { id: "u_jay", name: "Jay", handle: "jay", bio: "Poke bowl enjoyer. Gym after.", prefs: ["fresh", "healthy"], favorites: ["d_cv_poke", "d_spicy_tuna_roll"], friends: ["u_sofia", "u_miguel", "u_dev"], following: ["u_cris"] },
  { id: "u_sofia", name: "Sofia", handle: "sofiafood", bio: "Honest reviews since week 1.", prefs: ["sweet", "cheesy", "comfort"], favorites: ["d_philly_cheesesteak", "d_banana_pudding", "d_churro_french_toast"], friends: ["u_jay", "u_ana", "u_dev"], following: [] },
  { id: "u_dev", name: "Dev", handle: "dev", bio: "Mostly plants, sometimes brisket.", prefs: ["spicy", "savory", "healthy"], favorites: ["d_dobu_jorim_tofu", "d_thai_coconut_chicken", "d_smoked_brisket"], friends: ["u_cris", "u_ana", "u_jay", "u_sofia"], following: [] },
];

// Every review is co-written by the two people who ate together.
// These are sample takes we wrote, not real reviews from any site.
const REVIEWS = [
  { id: "r_1", itemId: "d_tonkotsu_ramen", authorIds: ["u_cris", "u_dev"], parts: { u_cris: "Broth is rich. Add chili oil and it's perfect.", u_dev: "Heavy but worth it on a cold day." }, upvotes: ["u_miguel", "u_ana"], ago: 5 * HOUR },
  { id: "r_2", itemId: "d_taco_sampler", authorIds: ["u_miguel", "u_cris"], parts: { u_miguel: "Get it to try everything, then come back for your favorite.", u_cris: "The spicy one was the best by far." }, upvotes: ["u_ana", "u_jay"], ago: 2 * DAY },
  { id: "r_3", itemId: "d_korean_bbq_smash", authorIds: ["u_sofia", "u_jay"], parts: { u_sofia: "The sauce makes it. Crispy edges on the patty.", u_jay: "Too heavy before the gym, but I get the hype." }, upvotes: ["u_cris", "u_miguel"], ago: 3 * HOUR },
  { id: "r_4", itemId: "d_tres_leches", authorIds: ["u_ana", "u_sofia"], parts: { u_ana: "Soft and not too sweet. Goes fast.", u_sofia: "Get it before the dinner rush." }, upvotes: ["u_dev"], ago: 7 * HOUR },
  { id: "r_5", itemId: "d_cv_poke", authorIds: ["u_jay", "u_ana"], parts: { u_jay: "Load up on the fish, go light on sauce.", u_ana: "Light enough for a lecture right after." }, upvotes: ["u_sofia", "u_dev"], ago: 4 * DAY },
  { id: "r_6", itemId: "d_detroit_pizza", authorIds: ["u_cris", "u_miguel"], parts: { u_cris: "The cheesy corners are the whole point.", u_miguel: "Two slices and I'm done for the day." }, upvotes: ["u_ana", "u_dev", "u_sofia"], ago: 6 * DAY },
  { id: "r_7", itemId: "d_dobu_jorim_tofu", authorIds: ["u_dev", "u_ana"], parts: { u_dev: "Best tofu on campus. Actually has flavor.", u_ana: "A little spicy, which I didn't expect. Loved it." }, upvotes: ["u_cris"], ago: 2 * DAY },
  { id: "r_8", itemId: "d_philly_cheesesteak", authorIds: ["u_sofia", "u_miguel"], parts: { u_sofia: "So much cheese. No complaints.", u_miguel: "Got a second one. No regrets." }, upvotes: ["u_jay"], ago: DAY },
  { id: "r_9", itemId: "d_birria_fries", authorIds: ["u_jay", "u_dev"], parts: { u_jay: "Huge portion. Split it with someone.", u_dev: "The consommé on the side is the move." }, upvotes: ["u_sofia", "u_miguel"], ago: 9 * HOUR },
  { id: "r_10", itemId: "d_buffalo_chicken_sandwich", authorIds: ["u_miguel", "u_jay"], parts: { u_miguel: "Real buffalo heat, not the sad kind.", u_jay: "Messy but worth it. Bring napkins." }, upvotes: ["u_cris"], ago: 3 * DAY },
  { id: "r_11", itemId: "d_acai_bowl", authorIds: ["u_ana", "u_cris"], parts: { u_ana: "Fresh fruit and the granola stays crunchy.", u_cris: "Good, but I'm still hungry after." }, upvotes: ["u_jay"], ago: 5 * DAY },
  { id: "r_12", itemId: "d_banana_pudding", authorIds: ["u_sofia", "u_dev"], parts: { u_sofia: "Tastes like home. Get the corner piece.", u_dev: "Sweet, simple, gone in a minute." }, upvotes: ["u_ana", "u_miguel"], ago: 30 * HOUR },
];

export async function seedDemoData() {
  const now = Date.now();
  const demoIds = new Set(USERS.map((u) => u.id));

  const snap = await getDocs(collection(db, "users"));
  const classmateIds = snap.docs.map((d) => d.id).filter((id) => !demoIds.has(id));

  const batch = writeBatch(db);

  ITEMS.forEach(({ id, ...item }) => {
    // Hand-picked tags plus the flavor words the dish name itself suggests
    const tags = [...new Set([...item.tags, ...flavorTags(item.name)])];
    batch.set(doc(db, "items", id), { photoURL: "", photoCredit: "", sourceUrl: "", ...item, tags });
  });

  USERS.forEach(({ id, ...user }) => {
    batch.set(doc(db, "users", id), {
      ...user,
      demo: true,
      allergens: [],
      shareAllergens: false,
      photoURL: "",
      createdAt: now - 45 * DAY,
      status: { free: false, zone: "", until: 0 },
    });
  });

  // Everyone in the class is friends with everyone else (and not with sample accounts)
  classmateIds.forEach((id) => {
    batch.set(doc(db, "users", id), { friends: classmateIds.filter((other) => other !== id) }, { merge: true });
  });

  // Each sample review comes from a finished meal (the first author sent the invite)
  REVIEWS.forEach(({ id, ago, ...review }) => {
    const mealId = `m_${id}`;
    const [fromId, ...toIds] = review.authorIds;
    const at = now - ago;
    batch.set(doc(db, "reviews", id), {
      ...review,
      inviteId: mealId,
      ownerId: fromId,
      photo: "",
      createdAt: at,
    });
    batch.set(doc(db, "invites", mealId), {
      fromId,
      toIds,
      itemId: review.itemId,
      urgency: "now",
      visibility: "friends",
      note: "",
      meetAt: at - 40 * MIN,
      expiresAt: at - 25 * MIN,
      responses: Object.fromEntries(toIds.map((t) => [t, "down"])),
      status: "done",
      ateAt: at - 40 * MIN,
      doneAt: at,
      reviewId: id,
      createdAt: at - 50 * MIN,
    });
  });

  // Leftovers from older versions of the seed
  ["t_open", "t_cris", "m_1", "m_2", "m_3"].forEach((id) => batch.delete(doc(db, "invites", id)));
  OLD_ITEM_IDS.forEach((id) => batch.delete(doc(db, "items", id)));

  await batch.commit();
}

// ---- Placeholder friend activity ----
// Run this once classmates have joined (e.g. at the start of the demo), so
// everyone's "From your friends" feed has something to act on:
//  - each classmate likes a couple of sample posts that fit their taste
//  - pairs of classmates get a placeholder collab post, labeled "Demo post"
// Everything it creates is flagged `demoActivity: true` so it can be removed.

const DEMO_TAKES = [
  "Would get this again.",
  "Better than I expected.",
  "Solid pick for a quick lunch.",
  "Came hungry, left full.",
  "Good, but I'd add more sauce.",
  "My new go-to.",
  "Worth the line.",
  "Exactly what I was craving.",
];

function tasteScore(item, user) {
  const prefs = new Set((user.prefs || []).map((p) => String(p).toLowerCase()));
  const tags = new Set([...(item.tags || []), ...flavorTags(item.name || "")]);
  return [...tags].filter((t) => prefs.has(t)).length;
}

function safeFor(item, user) {
  const mine = new Set((user.allergens || []).map((a) => String(a).toLowerCase()));
  return !(item.allergens || []).some((a) => mine.has(a));
}

export async function seedFriendActivity() {
  const now = Date.now();
  const snap = await getDocs(collection(db, "users"));
  const classmates = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => !u.demo);
  if (classmates.length === 0) throw new Error("No classmates have joined yet.");

  const itemsById = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
  const batch = writeBatch(db);

  // 1) Likes: each classmate likes the 2 sample posts closest to their taste
  const likes = Object.fromEntries(REVIEWS.map((r) => [r.id, [...r.upvotes]]));
  classmates.forEach((u, idx) => {
    REVIEWS.map((r, i) => ({ r, score: tasteScore(itemsById[r.itemId], u) * 10 - ((i + idx) % REVIEWS.length) }))
      .filter(({ r }) => safeFor(itemsById[r.itemId], u))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .forEach(({ r }) => likes[r.id].push(u.id));
  });
  Object.entries(likes).forEach(([id, upvotes]) => {
    batch.update(doc(db, "reviews", id), { upvotes: [...new Set(upvotes)] });
  });

  // 2) Placeholder collab posts: pair classmates up and pick a dish that fits both
  const pool = [...classmates];
  let n = 0;
  while (pool.length >= 2 && n < 6) {
    const a = pool.shift();
    pool.sort((x, y) => tasteScore({ tags: y.prefs }, a) - tasteScore({ tags: x.prefs }, a));
    const b = pool.shift();
    const item = [...ITEMS]
      .filter((i) => safeFor(i, a) && safeFor(i, b))
      .sort((x, y) => tasteScore(y, a) + tasteScore(y, b) - (tasteScore(x, a) + tasteScore(x, b)))[n % 3];
    if (!item) continue;
    const at = now - (n + 1) * 2 * HOUR;
    const reviewRef = doc(collection(db, "reviews"));
    const mealRef = doc(collection(db, "invites"));
    batch.set(reviewRef, {
      itemId: item.id,
      inviteId: mealRef.id,
      ownerId: a.id,
      authorIds: [a.id, b.id],
      parts: { [a.id]: DEMO_TAKES[(2 * n) % DEMO_TAKES.length], [b.id]: DEMO_TAKES[(2 * n + 1) % DEMO_TAKES.length] },
      photo: "",
      upvotes: [],
      createdAt: at,
      demoActivity: true,
    });
    batch.set(mealRef, {
      fromId: a.id,
      toIds: [b.id],
      itemId: item.id,
      urgency: "now",
      visibility: "friends",
      note: "",
      meetAt: at - 40 * MIN,
      expiresAt: at - 25 * MIN,
      responses: { [b.id]: "down" },
      status: "done",
      ateAt: at - 40 * MIN,
      doneAt: at,
      reviewId: reviewRef.id,
      createdAt: at - 50 * MIN,
      demoActivity: true,
    });
    n += 1;
  }

  await batch.commit();
  return { classmates: classmates.length, posts: n };
}

export async function clearFriendActivity() {
  const batch = writeBatch(db);
  const [reviewsSnap, invitesSnap] = await Promise.all([
    getDocs(query(collection(db, "reviews"), where("demoActivity", "==", true))),
    getDocs(query(collection(db, "invites"), where("demoActivity", "==", true))),
  ]);
  reviewsSnap.docs.forEach((d) => batch.delete(d.ref));
  invitesSnap.docs.forEach((d) => batch.delete(d.ref));
  // Put the sample posts' likes back to how they started
  REVIEWS.forEach((r) => batch.update(doc(db, "reviews", r.id), { upvotes: r.upvotes }));
  await batch.commit();
  return reviewsSnap.size;
}
