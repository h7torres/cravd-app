import { useEffect, useState } from "react";

export const MIN = 60 * 1000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const ZONES = [
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

export const PREFS = [
  "spicy",
  "savory",
  "sweet",
  "cheesy",
  "crunchy",
  "comfort",
  "healthy",
  "light",
  "vegetarian",
  "vegan",
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

export function sharedTags(item, user) {
  const prefs = new Set(arr(user?.prefs));
  return arr(item?.tags).filter((t) => prefs.has(t));
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

export function colorFor(key = "") {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 55%, 55%)`;
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
  if (invite.meetAt <= now) return "right now";
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
