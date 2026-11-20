import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { arr, isFree, useNow } from "../lib/helpers";
import {
  combineMessages, decideCounter, inviteMessagesForPair, markThreadRead,
  sendThreadMessage, subscribeMessages, subscribeThread, threadIdFor, timestamp,
} from "../lib/messages";
import Avatar from "../components/Avatar";
import DishPicker from "../components/DishPicker";
import MessageBubble from "../components/MessageBubble";
import SendToFriendSheet from "../components/SendToFriendSheet";

export default function Thread() {
  const { threadId } = useParams();
  const { me, usersById, items, invites } = useData();
  const navigate = useNavigate();
  const now = useNow();
  const friendId = arr(me.friends).find((id) => threadIdFor(me.id, id) === threadId);
  const friend = friendId ? usersById[friendId] : null;
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [dishPickerOpen, setDishPickerOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const bottomRef = useRef(null);
  const readRequestAt = useRef(0);

  useEffect(() => {
    if (!friendId) return;
    const stopThread = subscribeThread(threadId, setThread, (err) => {
      console.error(err);
      setError("Unable to load this chat. Check Firestore permissions.");
    });
    const stopMessages = subscribeMessages(threadId, (rows) => {
      setMessages(rows);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
      setError("Unable to load messages. Check Firestore permissions.");
    });
    return () => { stopThread(); stopMessages(); };
  }, [threadId, friendId]);

  const virtualInvites = friend ? inviteMessagesForPair(invites, me.id, friend.id) : [];
  const allMessages = combineMessages(messages, virtualInvites);
  const lastEvent = allMessages.at(-1);
  const lastIncomingAt = allMessages.reduce((time, msg) =>
    msg.senderId !== me.id ? Math.max(time, timestamp(msg.createdAt)) : time, 0);
  const lastReadAt = timestamp(thread?.lastReadAt?.[me.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [threadId, lastEvent?.id, allMessages.length]);

  useEffect(() => {
    readRequestAt.current = 0;
  }, [threadId]);

  useEffect(() => {
    if (!friend || loading || lastIncomingAt <= lastReadAt ||
        readRequestAt.current >= lastIncomingAt) return;
    readRequestAt.current = lastIncomingAt;
    markThreadRead(threadId, me.id, friend.id).catch((err) => {
      console.error(err);
      readRequestAt.current = 0;
      setError("Couldn't mark messages as read.");
    });
  }, [friend, loading, threadId, me.id, lastIncomingAt, lastReadAt]);

  async function sendText(event) {
    event.preventDefault();
    if (!text.trim() || busy || !friend) return;
    setBusy(true);
    setError("");
    try {
      await sendThreadMessage({ senderId: me.id, recipientId: friend.id, type: "text", text });
      setText("");
    } catch (err) { console.error(err); setError(err.message || "Couldn't send your message."); }
    finally { setBusy(false); }
  }

  async function shareDish(item) {
    if (busy || !friend) return;
    setBusy(true);
    setError("");
    try {
      await sendThreadMessage({ senderId: me.id, recipientId: friend.id, type: "dish", itemId: item.id });
      setAttachOpen(false);
      setDishPickerOpen(false);
    } catch (err) { console.error(err); setError("Couldn't share this dish."); }
    finally { setBusy(false); }
  }

  async function sendCounter(inviteId, proposedFor) {
    if (!friend) throw new Error("Friend unavailable.");
    await sendThreadMessage({ senderId: me.id, recipientId: friend.id, type: "counter", inviteId, proposedFor });
  }

  async function respondToCounter(message, accept) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await decideCounter({ inviteId: message.inviteId, messageId: message.id, currentUserId: me.id, accept }); }
    catch (err) { console.error(err); setError(err.message || "Couldn't respond to the time suggestion."); }
    finally { setBusy(false); }
  }

  if (!friend) return <div className="card stack"><h2>Conversation unavailable</h2><p className="muted">You can only message friends.</p><Link className="btn" to="/messages">Back to Messages</Link></div>;

  return (
    <div className="stack message-thread">
      <header className="row message-thread-header">
        <button type="button" className="btn btn-small" onClick={() => navigate("/messages")} aria-label="Back to inbox">←</button>
        <Link to={`/profile/${friend.id}`} className="row grow message-person">
          <Avatar user={friend} size={42} now={now} />
          <span><strong>{friend.name}</strong>{isFree(friend, now) && <span className="block small muted">Free{friend.status?.zone ? ` near ${friend.status.zone}` : ""}</span>}</span>
        </Link>
      </header>
      <div className="message-history stack" aria-live="polite">
        {loading && <p className="muted small">Loading messages…</p>}
        {!loading && allMessages.length === 0 && <div className="empty"><strong>Say hello to {friend.name}!</strong><p className="muted small">Send a message, dish, or invite.</p></div>}
        {allMessages.map((msg) => <MessageBubble key={msg.id} message={msg} now={now} onCounter={sendCounter} onDecideCounter={respondToCounter} busy={busy} />)}
        <div ref={bottomRef} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {attachOpen && <div className="card stack">
        <button className="btn" onClick={() => { setDishPickerOpen((v) => !v); setInviteOpen(false); }}>Share a dish</button>
        <button className="btn" onClick={() => { setInviteOpen(true); setAttachOpen(false); setDishPickerOpen(false); }}>Send an invite</button>
        {dishPickerOpen && <DishPicker items={items} onPick={shareDish} label="Choose a dish to share" />}
      </div>}
      <form className="row message-compose" onSubmit={sendText}>
        <button type="button" className="btn" onClick={() => { setAttachOpen((v) => !v); setDishPickerOpen(false); }} aria-label="Attach dish or invite">+</button>
        <input aria-label="Message" placeholder="Message…" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={!text.trim() || busy}>{busy ? "…" : "Send"}</button>
      </form>
      {inviteOpen && <SendToFriendSheet lockedFriendId={friend.id} onClose={() => setInviteOpen(false)} onSent={() => setInviteOpen(false)} />}
    </div>
  );
}
