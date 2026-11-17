import { arrayUnion, collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { DAY, HOUR, MIN } from "./helpers";

// Placeholder dishes: swap in the real menu and real photos (photoURL) before the demo.
const ITEMS = [
  { id: "i_katsu", name: "Chicken Katsu Bowl", category: "Bowls", diningHall: "64 Degrees", emoji: "🍛", tags: ["savory", "crunchy", "comfort"], description: "Crispy chicken over rice with katsu sauce." },
  { id: "i_poke", name: "Salmon Poke Bowl", category: "Bowls", diningHall: "Foodworx", emoji: "🥗", tags: ["healthy", "light"], description: "Salmon, rice, edamame and cucumber with ponzu." },
  { id: "i_pepperoni", name: "Pepperoni Pizza", category: "Pizza", diningHall: "Pines", emoji: "🍕", tags: ["cheesy", "savory", "comfort"], description: "Classic slice, best fresh out of the oven." },
  { id: "i_margherita", name: "Margherita Flatbread", category: "Pizza", diningHall: "Canyon Vista", emoji: "🫓", tags: ["cheesy", "vegetarian", "light"], description: "Tomato, mozzarella and basil on a thin crust." },
  { id: "i_carnitas", name: "Carnitas Tacos", category: "Tacos", diningHall: "OceanView Terrace", emoji: "🌮", tags: ["savory", "spicy"], description: "Three tacos with salsa verde and onions." },
  { id: "i_veggie_tacos", name: "Roasted Veggie Tacos", category: "Tacos", diningHall: "Café Ventanas", emoji: "🌯", tags: ["vegan", "vegetarian", "healthy", "spicy"], description: "Roasted vegetables with chipotle crema." },
  { id: "i_burger", name: "Classic Cheeseburger", category: "Burgers", diningHall: "Pines", emoji: "🍔", tags: ["savory", "cheesy", "comfort"], description: "Beef patty, cheddar, pickles and house sauce." },
  { id: "i_plant_burger", name: "Plant-Based Burger", category: "Burgers", diningHall: "Roots", emoji: "🥬", tags: ["vegan", "savory"], description: "Plant-based patty with vegan aioli." },
  { id: "i_ramen", name: "Spicy Miso Ramen", category: "Noodles", diningHall: "64 Degrees", emoji: "🍜", tags: ["spicy", "savory", "comfort"], description: "Miso broth with chili oil, egg and scallions." },
  { id: "i_pad_thai", name: "Pad Thai", category: "Noodles", diningHall: "Canyon Vista", emoji: "🍝", tags: ["sweet", "savory"], description: "Rice noodles with tamarind sauce and peanuts." },
  { id: "i_cookie", name: "Chocolate Chip Cookie", category: "Desserts", diningHall: "OceanView Terrace", emoji: "🍪", tags: ["sweet", "comfort"], description: "Big, soft, and usually warm." },
  { id: "i_cheesecake", name: "Strawberry Cheesecake", category: "Desserts", diningHall: "Café Ventanas", emoji: "🍰", tags: ["sweet"], description: "Creamy cheesecake with strawberry topping." },
  { id: "i_wings", name: "Buffalo Wings", category: "Comfort", diningHall: "Foodworx", emoji: "🍗", tags: ["spicy", "savory", "crunchy"], description: "Six wings with ranch and celery." },
  { id: "i_mac", name: "Mac and Cheese", category: "Comfort", diningHall: "Pines", emoji: "🧀", tags: ["cheesy", "comfort", "vegetarian"], description: "Baked mac with a crunchy top." },
];

const USERS = [
  { id: "u_cris", name: "Cris", handle: "cris", bio: "Will try anything once. Ramen over everything.", prefs: ["spicy", "savory", "comfort"], favorites: ["i_ramen", "i_pepperoni", "i_wings"], friends: ["u_miguel", "u_ana", "u_dev"], following: ["u_sofia"], freeMinutes: 60, zone: "Geisel" },
  { id: "u_miguel", name: "Miguel", handle: "miguelito", bio: "Taco Tuesday is every day.", prefs: ["spicy", "savory", "crunchy"], favorites: ["i_carnitas", "i_pepperoni", "i_burger"], friends: ["u_cris", "u_ana"], following: ["u_sofia", "u_jay"], freeMinutes: 45, zone: "Price Center" },
  { id: "u_ana", name: "Ana", handle: "ana.eats", bio: "Vegetarian. Dessert first.", prefs: ["vegetarian", "sweet", "healthy"], favorites: ["i_veggie_tacos", "i_cheesecake", "i_margherita"], friends: ["u_cris", "u_miguel"], following: [] },
  { id: "u_jay", name: "Jay", handle: "jay", bio: "Poke bowl enjoyer. Gym after.", prefs: ["healthy", "light"], favorites: ["i_poke", "i_pad_thai"], friends: ["u_sofia"], following: ["u_cris"], freeMinutes: 30, zone: "Sixth" },
  { id: "u_sofia", name: "Sofia", handle: "sofiafood", bio: "Honest reviews since week 1.", prefs: ["sweet", "cheesy", "comfort"], favorites: ["i_mac", "i_cookie", "i_katsu"], friends: ["u_jay"], following: [] },
  { id: "u_dev", name: "Dev", handle: "dev", bio: "Plant-based, still loves a good burger.", prefs: ["vegan", "savory", "spicy"], favorites: ["i_plant_burger", "i_veggie_tacos", "i_ramen"], friends: ["u_cris"], following: ["u_ana"] },
];

const REVIEWS = [
  { id: "r_1", itemId: "i_ramen", inviteId: "m_1", ownerId: "u_cris", authorIds: ["u_cris", "u_dev"], parts: { u_cris: "The chili oil actually has heat. Get the extra egg.", u_dev: "Broth was great, but I wish there was a tofu option." }, upvotes: ["u_miguel", "u_ana"], ago: DAY },
  { id: "r_2", itemId: "i_carnitas", inviteId: null, ownerId: "u_miguel", authorIds: ["u_miguel"], parts: { u_miguel: "The salsa verde carries. Ask for extra onions." }, upvotes: ["u_cris"], ago: 2 * DAY },
  { id: "r_3", itemId: "i_burger", inviteId: "m_2", ownerId: "u_sofia", authorIds: ["u_sofia", "u_jay"], parts: { u_sofia: "Better than it needs to be. The sauce is the move.", u_jay: "Too heavy before the gym, but I get the hype." }, upvotes: ["u_cris", "u_miguel"], ago: 3 * HOUR },
  { id: "r_4", itemId: "i_cheesecake", inviteId: null, ownerId: "u_ana", authorIds: ["u_ana"], parts: { u_ana: "Creamy, not too sweet. Goes fast after 1pm." }, upvotes: ["u_sofia"], ago: 5 * HOUR },
  { id: "r_5", itemId: "i_poke", inviteId: null, ownerId: "u_jay", authorIds: ["u_jay"], parts: { u_jay: "Fresh salmon, generous portion. Skip the spicy mayo." }, upvotes: [], ago: 4 * DAY },
  { id: "r_6", itemId: "i_pepperoni", inviteId: "m_3", ownerId: "u_cris", authorIds: ["u_cris", "u_miguel"], parts: { u_cris: "Depends on timing. A fresh slice is elite.", u_miguel: "Never had a bad one. Cris is too picky." }, upvotes: ["u_ana", "u_dev", "u_sofia"], ago: 6 * DAY },
  { id: "r_7", itemId: "i_veggie_tacos", inviteId: null, ownerId: "u_dev", authorIds: ["u_dev"], parts: { u_dev: "Best vegan option on campus. The crema makes it." }, upvotes: ["u_ana"], ago: 2 * DAY },
  { id: "r_8", itemId: "i_mac", inviteId: null, ownerId: "u_sofia", authorIds: ["u_sofia"], parts: { u_sofia: "Crunchy top, creamy middle. Comfort food done right." }, upvotes: ["u_miguel"], ago: DAY },
];

const MEALS = [
  { id: "m_1", fromId: "u_cris", toIds: ["u_dev"], itemId: "i_ramen", reviewId: "r_1", ago: DAY },
  { id: "m_2", fromId: "u_sofia", toIds: ["u_jay"], itemId: "i_burger", reviewId: "r_3", ago: 3 * HOUR },
  { id: "m_3", fromId: "u_cris", toIds: ["u_miguel"], itemId: "i_pepperoni", reviewId: "r_6", ago: 6 * DAY },
];

export async function seedDemoData() {
  const now = Date.now();
  const demoIds = new Set(USERS.map((u) => u.id));

  // Existing (non-demo) users get connected to Cris and Miguel
  const snap = await getDocs(collection(db, "users"));
  const realIds = snap.docs.map((d) => d.id).filter((id) => !demoIds.has(id));

  const batch = writeBatch(db);

  ITEMS.forEach(({ id, ...item }) => {
    batch.set(doc(db, "items", id), { photoURL: "", ...item });
  });

  USERS.forEach(({ id, freeMinutes, zone, friends, ...user }) => {
    const connectReal = id === "u_cris" || id === "u_miguel";
    batch.set(doc(db, "users", id), {
      ...user,
      friends: connectReal ? [...friends, ...realIds] : friends,
      photoURL: "",
      createdAt: now - 45 * DAY,
      status: freeMinutes
        ? { free: true, zone, until: now + freeMinutes * MIN }
        : { free: false, zone: "", until: 0 },
    });
  });

  realIds.forEach((id) => {
    batch.set(
      doc(db, "users", id),
      {
        friends: arrayUnion("u_cris", "u_miguel"),
        following: arrayUnion("u_sofia"),
      },
      { merge: true }
    );
  });

  REVIEWS.forEach(({ id, ago, ...review }) => {
    batch.set(doc(db, "reviews", id), { ...review, photo: "", createdAt: now - ago });
  });

  MEALS.forEach(({ id, ago, ...meal }) => {
    batch.set(doc(db, "invites", id), {
      ...meal,
      urgency: "now",
      visibility: "friends",
      note: "",
      meetAt: now - ago,
      expiresAt: now - ago + 15 * MIN,
      responses: Object.fromEntries(meal.toIds.map((t) => [t, "down"])),
      status: "done",
      ateAt: now - ago,
      doneAt: now - ago,
      createdAt: now - ago - 10 * MIN,
    });
  });

  // An open table anyone can join
  batch.set(doc(db, "invites", "t_open"), {
    fromId: "u_miguel",
    toIds: ["u_cris"],
    itemId: "i_carnitas",
    urgency: "20",
    visibility: "anyone",
    note: "Taco run, table's open",
    meetAt: now + 20 * MIN,
    expiresAt: now + 35 * MIN,
    responses: {},
    status: "open",
    createdAt: now,
  });

  // A live invite from Cris to your real users
  if (realIds.length) {
    batch.set(doc(db, "invites", "t_cris"), {
      fromId: "u_cris",
      toIds: realIds,
      itemId: "i_ramen",
      urgency: "10",
      visibility: "friends",
      note: "Ramen after class?",
      meetAt: now + 10 * MIN,
      expiresAt: now + 25 * MIN,
      responses: {},
      status: "open",
      createdAt: now,
    });
  }

  await batch.commit();
}
