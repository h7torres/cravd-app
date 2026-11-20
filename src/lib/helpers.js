import { useEffect, useState } from "react";

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

// For the class demo, everyone who signs up or opens the app shows up as active
// for this long, so the Active now list is full. They can still turn it off.
export const DEMO_ACTIVE_MINUTES = 120;
// The dining hall closest to our class
export const DEFAULT_ZONE = "64 Degrees";

export const ZONES = [
  "64 Degrees",
  "Geisel",
  "Price Center",
  "Revelle",
  "Muir",
  "Marshall",
  "Warren",
  "ERC",
  "Sixth",
  "Seventh",
  "Eighth",
];

// General flavor words people pick for their "food profile". Kept broad on purpose:
// they're a lead for matching, not a full description of someone's taste.
//
// The words and cues come from the ~250 dish names on the real UCSD dining menus
// (via Triton Taste): each word is matched against words that actually show up in
// dish names, so any dish gets flavor tags automatically from its name.
export const FLAVOR_CUES = {
  spicy: ["spicy", "chipotle", "chile", "chili", "buffalo", "jerk", "kimchi", "harissa", "sriracha", "ancho", "jalapeno", "jalapeño", "diablo", "lava", "hot", "gochujang", "szechuan", "sichuan", "birria", "al pastor", "cajun", "nashville"],
  savory: ["savory", "garlic", "bbq", "teriyaki", "miso", "gravy", "brisket", "bacon", "sausage", "mushroom", "crimini", "parmesan", "peppered", "carne asada", "kalua", "bulgogi", "pork", "beef", "steak", "tri tip", "umami", "club", "blt", "stir fry", "udon"],
  sweet: ["sweet", "cake", "cheesecake", "chocolate", "waffle", "pancake", "pancakes", "crepes", "crepe", "gelato", "pie", "pudding", "nutella", "strawberry", "mango", "banana", "vanilla", "churro", "french toast", "honey", "tart", "cookie", "brownie", "donut", "matcha", "acai", "parfait", "orange chicken", "beignets", "taiyaki", "frappe", "latte", "chai", "pumpkin"],
  fresh: ["salad", "poke", "roll", "acai", "avocado", "ahi", "tuna", "salmon", "chop", "lemon", "yogurt", "parfait", "fruit", "herb", "cucumber", "ceviche", "banh mi", "mediterranean", "caprese", "fish taco", "oats"],
  filling: ["loaded", "burrito", "burger", "cheeseburger", "fries", "mac", "brisket", "smash", "combo", "sampler", "loco moco", "plate", "steak", "meatball", "bolognese", "lasagna", "philly", "pot pie", "rigatoni", "fried rice", "hash"],
  flavorful: ["curry", "thai", "korean", "shawarma", "kofta", "jerk", "bulgogi", "harissa", "tandoor", "pesto", "japchae", "banh", "birria", "kimchi", "pastor", "garlic", "miso", "mazza", "kalbi", "gochujang", "teriyaki", "szechuan", "masala", "gumbo", "sofrito", "cubano", "bibimbap", "mongolian", "huli", "dobu jorim", "bun cha", "rasta", "vietnamese", "udon"],
  crispy: ["fried", "crispy", "tempura", "fries", "tots", "tater", "tenders", "wings", "katsu", "chips", "nachos", "crunch", "fritter", "tostada", "churro", "potstickers", "beignets"],
  cheesy: ["cheese", "cheesy", "cheeseburger", "mac", "alfredo", "parmesan", "quesadilla", "nachos", "pizza", "mozzarella", "cheddar", "queso", "philly", "margherita"],
  creamy: ["alfredo", "coconut", "curry", "pudding", "cheesecake", "mac", "gelato", "tres leches", "crepes", "creamy", "cream", "butter", "carbonara", "risotto", "yogurt", "chowder", "bisque", "rasta", "latte", "frappe"],
  smoky: ["smoked", "chargrilled", "grilled", "bbq", "barbecue", "roasted", "seared", "tandoor", "brisket", "pulled", "charred", "kalua", "huli"],
  comfort: ["mac", "pizza", "burger", "cheeseburger", "fries", "grilled cheese", "waffle", "pancake", "pancakes", "french toast", "tenders", "pot pie", "gravy", "chili", "loco moco", "meatball", "toast", "biscuit", "ramen", "pudding", "toasted cheese", "chowder", "oatmeal", "congee", "spaghetti", "banana pudding", "soup", "breadstick", "focaccia", "breakfast"],
  healthy: ["salad", "poke", "grain", "tofu", "acai", "oats", "oatmeal", "chop", "veggie", "vegan", "quinoa", "steamed", "ahi", "lentil", "chana", "power bowl"],
};

// Phrases that would trigger the wrong word (grilled cheese isn't smoky, etc.)
const FLAVOR_EXCLUDE = {
  smoky: ["grilled cheese"],
  spicy: ["hot chocolate", "hot cocoa"],
  fresh: ["cinnamon roll", "egg roll"],
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Flavor words a dish gets from its name alone
export function flavorTags(name) {
  const base = ` ${String(name || "").toLowerCase()} `;
  return Object.entries(FLAVOR_CUES)
    .filter(([word, cues]) => {
      const text = (FLAVOR_EXCLUDE[word] || []).reduce((t, phrase) => t.split(phrase).join(" "), base);
      return cues.some((cue) => new RegExp(`[^a-z]${escapeRe(cue)}[^a-z]`).test(text));
    })
    .map(([word]) => word);
}

export const PREFS = Object.keys(FLAVOR_CUES);

export const MAX_PREFS = 4;

export const ALLERGENS = [
  "peanuts",
  "tree nuts",
  "dairy",
  "eggs",
  "gluten",
  "soy",
  "fish",
  "shellfish",
  "sesame",
];

export const arr = (x) => (Array.isArray(x) ? x : []);

// Re-renders every 30s so expiry times and "free" status stay accurate
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function isFree(user, now) {
  const s = user?.status;
  return Boolean(s?.free && s.until > now);
}

// ---- Invites ----

export function downIds(invite) {
  return Object.entries(invite.responses || {})
    .filter(([, r]) => r === "down")
    .map(([id]) => id);
}

export function participants(invite) {
  return [invite.fromId, ...downIds(invite).filter((id) => id !== invite.fromId)];
}

// Still open and not expired
export function isLive(invite, now) {
  return invite.status === "open" && invite.expiresAt > now;
}

// Someone said they're down, and it's within 3 hours of the meet time
export function isPlan(invite, now) {
  return (
    invite.status === "open" &&
    downIds(invite).length > 0 &&
    now < invite.meetAt + 3 * HOUR
  );
}

export function canSeeInvite(invite, me) {
  if (!me) return false;
  if (invite.fromId === me.id || arr(invite.toIds).includes(me.id)) return true;
  if (invite.visibility === "anyone") return true;
  if (invite.visibility === "followers") {
    return arr(me.following).includes(invite.fromId) || arr(me.friends).includes(invite.fromId);
  }
  return false;
}

// ---- People & taste ----

export function mutualFriends(a, b) {
  const theirs = new Set(arr(b?.friends));
  return arr(a?.friends).filter((id) => theirs.has(id));
}

const norm = (s) => String(s || "").trim().toLowerCase();

// Everything a food keyword can match on a dish: its tags, category and name words
export function itemKeywords(item) {
  const words = [
    ...arr(item?.tags),
    ...flavorTags(item?.name),
    item?.category,
    ...norm(item?.name).split(/\s+/),
  ].map(norm).filter(Boolean);
  return new Set(words);
}

// Which of this person's food keywords the dish matches
export function sharedTags(item, user) {
  const keys = itemKeywords(item);
  return [...new Set(arr(user?.prefs).map(norm))].filter((p) => keys.has(p));
}

// Food keywords two people have in common
export function sharedPrefs(a, b) {
  const theirs = new Set(arr(b?.prefs).map(norm));
  return [...new Set(arr(a?.prefs).map(norm))].filter((p) => theirs.has(p));
}

// Allergens on this dish that the person listed
export function allergyConflicts(item, user) {
  const mine = new Set(arr(user?.allergens).map(norm));
  return arr(item?.allergens).map(norm).filter((a) => mine.has(a));
}

// Friends ranked by how much food taste they share with me
export function tasteMatches(me, people) {
  return people
    .map((u) => ({ u, shared: sharedPrefs(me, u) }))
    .filter((x) => x.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || (a.u.name || "").localeCompare(b.u.name || ""));
}

// Dishes that work for a whole group: skips anything that conflicts with ANYONE's
// allergens (without saying whose), then ranks by favorites and shared keywords.
export function groupPicks(people, items, limit = 6) {
  return items
    .filter((item) => people.every((p) => allergyConflicts(item, p).length === 0))
    .map((item) => {
      const fans = people.filter((p) => arr(p.favorites).includes(item.id));
      const matches = people.map((p) => ({ p, tags: sharedTags(item, p) })).filter((x) => x.tags.length);
      const score = fans.length * 3 + matches.reduce((n, x) => n + x.tags.length, 0) + (matches.length === people.length ? 2 : 0);
      return { item, fans, matches, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (a.item.name || "").localeCompare(b.item.name || ""))
    .slice(0, limit);
}

export function joinNames(names) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} & ${rest} other${rest === 1 ? "" : "s"}`;
}

export function initials(name = "?") {
  return (
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}

const AVATAR_COLORS = ["#2742d6", "#12a16b", "#d93a3a", "#7048e8", "#e8590c", "#0b8a9c", "#c2255c", "#5c6bc0"];

export function colorFor(key = "") {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function handleOf(user) {
  return user?.handle || (user?.name || "").toLowerCase().replace(/\s+/g, "");
}

// ---- Time ----

export function clockTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function whenLabel(invite, now) {
  if (invite.urgency === "planned") {
    return new Date(invite.meetAt).toLocaleString([], {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (invite.urgency === "now" || invite.meetAt <= now) return "right now";
  return `in ${Math.ceil((invite.meetAt - now) / MIN)} min`;
}

export function timeLeft(ms, now) {
  const diff = ms - now;
  if (diff <= 0) return "expired";
  if (diff < HOUR) return `${Math.ceil(diff / MIN)} min left`;
  return `${Math.round(diff / HOUR)} hr left`;
}

export function timeAgo(ms, now) {
  const diff = now - ms;
  if (diff < MIN) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

// Rounds a time up to the next 15-minute mark (12:07 -> 12:15)
export function nextQuarterHour(ms) {
  const q = 15 * MIN;
  return Math.ceil(ms / q) * q;
}

// "Free for" choices in 15-minute steps, up to 3 hours
export const FREE_FOR_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 15);

export function durationLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function toLocalInput(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// ---- Photos ----
// Shrinks a photo so it can be stored directly in Firestore (no Storage/Blaze plan needed)
export function compressImage(file, maxSize = 640, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

// Most common dish tags across the dishes a user has reviewed ("keywords" for their profile)
export function reviewKeywords(userId, reviews, itemsById, limit = 5) {
  const counts = {};
  reviews
    .filter((r) => arr(r.authorIds).includes(userId))
    .forEach((r) => {
      arr(itemsById[r.itemId]?.tags).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}
