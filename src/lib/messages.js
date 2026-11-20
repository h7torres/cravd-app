import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { arr, clockTime, MIN } from "./helpers";

// Keep the ID format previously used by the Cravd messaging prototype.
// Only 1:1 chats are created by this UI; participantIds already supports groups.
export function threadIdFor(a, b) {
  if (!a || !b || a === b) throw new Error("Two different users are required.");
  return [a, b].sort().join("_");
}

export function subscribeThreads(uid, onData, onError) {
  if (!uid) return () => {};
  return onSnapshot(
    query(collection(db, "threads"), where("participantIds", "array-contains", uid)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export function subscribeThread(threadId, onData, onError) {
  return onSnapshot(doc(db, "threads", threadId), (snap) => {
    onData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, onError);
}

export function subscribeMessages(threadId, onData, onError) {
  // Sort on the client so a composite Firestore index is not required.
  return onSnapshot(
    query(collection(db, "messages"), where("threadId", "==", threadId)),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt))),
    onError
  );
}

export function timestamp(value) {
  if (typeof value === "number") return value;
  if (value && typeof value.toMillis === "function") return value.toMillis();
  return 0;
}

export function inviteMessagesForPair(invites, selfId, otherId) {
  return invites
    .filter((inv) =>
      (inv.fromId === selfId && arr(inv.toIds).includes(otherId)) ||
      (inv.fromId === otherId && arr(inv.toIds).includes(selfId))
    )
    .map((inv) => ({
      id: `invite-${inv.id}`,
      senderId: inv.fromId,
      threadId: threadIdFor(selfId, otherId),
      type: "invite",
      itemId: inv.itemId,
      inviteId: inv.id,
      createdAt: inv.createdAt || 0,
      virtual: true,
    }));
}

export function combineMessages(realMessages, virtualInvites) {
  const inviteIds = new Set(realMessages.filter((m) => m.type === "invite").map((m) => m.inviteId));
  return [...realMessages, ...virtualInvites.filter((inv) => !inviteIds.has(inv.inviteId))]
    .sort((a, b) => timestamp(a.createdAt) - timestamp(b.createdAt));
}

export function preview(message, itemsById, invites = []) {
  if (!message) return "Start chatting";
  if (typeof message === "string") return message;
  switch (message.type) {
    case "text": return message.text || "Message";
    case "dish": return `Sent a dish: ${itemsById[message.itemId]?.name || "a dish"}`;
    case "invite": {
      const invite = invites.find((inv) => inv.id === message.inviteId);
      const name = itemsById[message.itemId || invite?.itemId]?.name || "Let's eat";
      return `Invite: ${name}${invite?.meetAt ? `, ${clockTime(invite.meetAt)}` : ""}`;
    }
    case "counter": return `Suggested a different time${message.proposedFor ? `: ${clockTime(timestamp(message.proposedFor))}` : ""}`;
    default: return "New message";
  }
}

// Merge stored chat threads with invitations from the existing invites data.
// Existing invites require NO migration and appear automatically in both inboxes.
export function getConversationRows({ me, usersById, itemsById, invites, threads }) {
  if (!me) return [];
  const validFriends = arr(me.friends).filter((id) => usersById[id]);
  const threadMap = new Map(threads.map((t) => [t.id, t]));
  return validFriends.map((id) => {
    const threadId = threadIdFor(me.id, id);
    const thread = threadMap.get(threadId);
    const inviteEvents = inviteMessagesForPair(invites, me.id, id);
    const newestInvite = inviteEvents.reduce((latest, event) =>
      !latest || timestamp(event.createdAt) > timestamp(latest.createdAt) ? event : latest, null);
    const storedLast = thread?.lastMessage;
    const storedTime = storedLast ? timestamp(thread?.lastMessageAt) : 0;
    const inviteTime = timestamp(newestInvite?.createdAt);
    const latest = inviteTime > storedTime ? newestInvite : storedLast;
    const latestAt = Math.max(storedTime, inviteTime);
    if (!latest && !latestAt) return null;
    const readAt = timestamp(thread?.lastReadAt?.[me.id]);
    return {
      id: threadId,
      friend: usersById[id],
      lastMessage: latest,
      preview: preview(latest, itemsById, invites),
      latestAt,
      unread: latestAt > readAt && latest?.senderId !== me.id,
    };
  }).filter(Boolean).sort((a, b) => b.latestAt - a.latestAt);
}

export async function sendThreadMessage({ senderId, recipientId, type, text, itemId, inviteId, proposedFor }) {
  if (!senderId || !recipientId || senderId === recipientId) throw new Error("Choose a friend first.");
  if (!["text", "dish", "invite", "counter"].includes(type)) throw new Error("Unknown message type.");
  if (type === "text" && !text?.trim()) throw new Error("Type a message first.");
  if (type === "dish" && !itemId) throw new Error("Choose a dish first.");
  if (type === "invite" && !inviteId) throw new Error("Invite missing.");
  if (type === "counter" && (!inviteId || !Number.isFinite(proposedFor))) throw new Error("Choose a time first.");

  const participantIds = [senderId, recipientId].sort();
  const threadId = threadIdFor(senderId, recipientId);
  const now = Date.now();
  const payload = {
    threadId, senderId, type, createdAt: now,
    ...(type === "text" ? { text: text.trim().slice(0, 2000) } : {}),
    ...(itemId ? { itemId } : {}),
    ...(inviteId ? { inviteId } : {}),
    ...(type === "counter" ? { proposedFor, counterStatus: "pending" } : {}),
  };
  const messageRef = doc(collection(db, "messages"));
  const batch = writeBatch(db);
  batch.set(messageRef, payload);
  batch.set(doc(db, "threads", threadId), {
    participantIds,
    lastMessage: { ...payload },
    lastMessageAt: now,
    lastReadAt: { [senderId]: now },
  }, { merge: true });
  await batch.commit();
  return threadId;
}

export async function markThreadRead(threadId, selfId, otherId) {
  const now = Date.now();
  await setDoc(doc(db, "threads", threadId), {
    participantIds: [selfId, otherId].sort(),
    lastReadAt: { [selfId]: now },
  }, { merge: true });
}

export async function decideCounter({ inviteId, messageId, currentUserId, accept }) {
  const inviteRef = doc(db, "invites", inviteId);
  const messageRef = doc(db, "messages", messageId);
  await runTransaction(db, async (tx) => {
    const [inviteSnap, msgSnap] = await Promise.all([tx.get(inviteRef), tx.get(messageRef)]);
    if (!inviteSnap.exists() || !msgSnap.exists()) throw new Error("This suggestion is no longer available.");
    const inv = inviteSnap.data();
    const msg = msgSnap.data();
    if (inv.fromId !== currentUserId || msg.type !== "counter" || msg.inviteId !== inviteId ||
        !arr(inv.toIds).includes(msg.senderId)) throw new Error("You can't respond to this suggestion.");
    if (msg.counterStatus !== "pending") throw new Error("This suggestion has already been answered.");
    // A pending suggestion can still be accepted after the original time passes:
    // accepting sets a new meet time and expiry.
    if (inv.status !== "open") throw new Error("The invite is no longer available.");
    if (accept) {
      const proposedFor = timestamp(msg.proposedFor);
      if (proposedFor <= Date.now()) throw new Error("That time has passed. Ask for another time.");
      tx.update(inviteRef, {
        urgency: "planned",
        meetAt: proposedFor,
        expiresAt: proposedFor + 60 * MIN,
        [`responses.${msg.senderId}`]: "down",
      });
    }
    tx.update(messageRef, { counterStatus: accept ? "accepted" : "declined" });
  });
}
