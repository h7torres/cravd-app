import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { MIN } from "./helpers";

// ---- Profile & status ----

export function setStatus(uid, { free, zone, minutes }) {
  return updateDoc(doc(db, "users", uid), {
    status: free
      ? { free: true, zone: zone || "", until: Date.now() + minutes * MIN }
      : { free: false, zone: "", until: 0 },
  });
}

export function updateProfile(uid, fields) {
  return updateDoc(doc(db, "users", uid), fields);
}

export function toggleFavorite(uid, itemId, isFav) {
  return updateDoc(doc(db, "users", uid), {
    favorites: isFav ? arrayRemove(itemId) : arrayUnion(itemId),
  });
}

// ---- Follow & friends ----

export function toggleFollow(uid, targetId, isFollowing) {
  return updateDoc(doc(db, "users", uid), {
    following: isFollowing ? arrayRemove(targetId) : arrayUnion(targetId),
  });
}

export function sendFriendRequest(fromId, toId) {
  return addDoc(collection(db, "friendRequests"), { fromId, toId, createdAt: Date.now() });
}

// Also used for declining
export function cancelFriendRequest(requestId) {
  return deleteDoc(doc(db, "friendRequests", requestId));
}

export function acceptFriendRequest(request) {
  const batch = writeBatch(db);
  batch.update(doc(db, "users", request.fromId), { friends: arrayUnion(request.toId) });
  batch.update(doc(db, "users", request.toId), { friends: arrayUnion(request.fromId) });
  batch.delete(doc(db, "friendRequests", request.id));
  return batch.commit();
}

export function removeFriend(a, b) {
  const batch = writeBatch(db);
  batch.update(doc(db, "users", a), { friends: arrayRemove(b) });
  batch.update(doc(db, "users", b), { friends: arrayRemove(a) });
  return batch.commit();
}

// ---- Invites ----
// Urgent invites expire 15 min after the meet time. Planned ones expire 1 hr after.
// Expiry is the default way an invite goes away, so nobody has to "unsend".

const URGENCY_MINUTES = { now: 0, 10: 10, 20: 20 };

// `source` records which part of the app the invite came from (for the demo evaluation)
export function sendInvite({ fromId, toIds, itemId, urgency, plannedFor, note, visibility, source, mode }) {
  const now = Date.now();
  const meetAt = urgency === "planned" ? plannedFor : now + URGENCY_MINUTES[urgency] * MIN;
  const expiresAt = urgency === "planned" ? meetAt + 60 * MIN : meetAt + 15 * MIN;
  return addDoc(collection(db, "invites"), {
    fromId,
    toIds,
    itemId: itemId || null,
    urgency,
    meetAt,
    expiresAt,
    note: note || "",
    visibility: visibility || "friends",
    responses: {},
    status: "open",
    createdAt: now,
    source: source || "other",
    mode: mode || (toIds.length > 1 ? "group" : "single"),
  });
}

export function respondToInvite(inviteId, uid, response) {
  return updateDoc(doc(db, "invites", inviteId), {
    [`responses.${uid}`]: response,
    [`respondedAt.${uid}`]: Date.now(),
  });
}

export function joinOpenTable(inviteId, uid) {
  return updateDoc(doc(db, "invites", inviteId), {
    [`responses.${uid}`]: "down",
    [`respondedAt.${uid}`]: Date.now(),
  });
}

export function cancelInvite(inviteId) {
  return updateDoc(doc(db, "invites", inviteId), { status: "cancelled" });
}

export function setInviteItem(inviteId, itemId) {
  return updateDoc(doc(db, "invites", inviteId), {
    itemId: itemId || null,
    ...(itemId ? { dishPickedAt: Date.now() } : {}),
  });
}

// ---- Meals & collaborative reviews ----
// The draft lives on the invite until the inviter publishes it.

export function startMeal(inviteId) {
  return updateDoc(doc(db, "invites", inviteId), { status: "eating", ateAt: Date.now() });
}

export function saveDraftPart(inviteId, uid, text) {
  return updateDoc(doc(db, "invites", inviteId), { [`draft.parts.${uid}`]: text });
}

export function saveDraftPhoto(inviteId, photo) {
  return updateDoc(doc(db, "invites", inviteId), { "draft.photo": photo });
}

export async function publishMealReview(invite, parts) {
  const authorIds = Object.keys(parts)
    .filter((id) => parts[id]?.trim())
    .sort((a, b) => (a === invite.fromId ? -1 : b === invite.fromId ? 1 : 0));

  const ref = await addDoc(collection(db, "reviews"), {
    itemId: invite.itemId,
    inviteId: invite.id,
    ownerId: invite.fromId,
    authorIds,
    parts: Object.fromEntries(authorIds.map((id) => [id, parts[id].trim()])),
    photo: invite.draft?.photo || "",
    upvotes: [],
    createdAt: Date.now(),
  });

  await updateDoc(doc(db, "invites", invite.id), {
    status: "done",
    doneAt: Date.now(),
    reviewId: ref.id,
  });
}

// The meal still counts even if nobody writes a review
export function skipReview(inviteId) {
  return updateDoc(doc(db, "invites", inviteId), { status: "done", doneAt: Date.now() });
}

// ---- Solo reviews ----

export function postSoloReview({ uid, itemId, text, photo }) {
  return addDoc(collection(db, "reviews"), {
    itemId,
    inviteId: null,
    ownerId: uid,
    authorIds: [uid],
    parts: { [uid]: text },
    photo: photo || "",
    upvotes: [],
    createdAt: Date.now(),
  });
}

export function toggleUpvote(reviewId, uid, hasUpvoted) {
  return updateDoc(doc(db, "reviews", reviewId), {
    upvotes: hasUpvoted ? arrayRemove(uid) : arrayUnion(uid),
  });
}

// ---- Onboarding ----
// No sign-in for the class prototype: a profile is just a name + food profile.
// The class is small, so every new person becomes friends with every classmate
// already on Cravd (both directions). Demo/sample accounts are left out.
export async function createProfile({ name, prefs, allergens, shareAllergens, classmateIds }) {
  const ref = doc(collection(db, "users"));
  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(ref, {
    name: name.trim(),
    handle: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ""),
    bio: "",
    photoURL: "",
    prefs,
    allergens,
    shareAllergens,
    favorites: [],
    friends: classmateIds,
    following: [],
    status: { free: false, zone: "", until: 0 },
    createdAt: now,
  });
  classmateIds.forEach((id) => {
    batch.update(doc(db, "users", id), { friends: arrayUnion(ref.id) });
  });
  await batch.commit();
  return ref.id;
}

// ---- Picking a dish together ----
// For "want to eat?" invites with no dish: after people say yes, each can vote,
// and anyone in the plan can lock a dish in.

export function voteDish(inviteId, uid, itemId) {
  return updateDoc(doc(db, "invites", inviteId), { [`votes.${uid}`]: itemId });
}

// ---- Comments on review posts ----

export function addComment({ reviewId, authorId, text }) {
  return addDoc(collection(db, "comments"), {
    reviewId,
    authorId,
    text: text.trim().slice(0, 500),
    createdAt: Date.now(),
  });
}

export function deleteComment(commentId) {
  return deleteDoc(doc(db, "comments", commentId));
}

// ---- Evaluation events ----
// Small, anonymous-enough log for the demo write-up. Never blocks the UI.
export function logEvent(type, data = {}) {
  return addDoc(collection(db, "events"), { type, ...data, at: Date.now() }).catch((err) =>
    console.warn("Couldn't log event", err)
  );
}
