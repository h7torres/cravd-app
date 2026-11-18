import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { arr, isFree, timeAgo, useNow } from "../lib/helpers";
import { getConversationRows, subscribeThreads, threadIdFor } from "../lib/messages";
import Avatar from "../components/Avatar";

export default function Messages() {
  const { me, usersById, itemsById, invites } = useData();
  const navigate = useNavigate();
  const now = useNow();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!me?.id) return;
    return subscribeThreads(me.id, (rows) => {
      setThreads(rows);
      setLoading(false);
      setError("");
    }, (err) => {
      console.error(err);
      setLoading(false);
      setError("Couldn't load chats from Firestore. Check its permissions.");
    });
  }, [me?.id]);

  const friends = arr(me?.friends).map((id) => usersById[id]).filter(Boolean)
    .sort((a, b) => Number(isFree(b, now)) - Number(isFree(a, now)) || (a.name || "").localeCompare(b.name || ""));
  const matches = friends.filter((f) => (f.name || "").toLowerCase().includes(search.toLowerCase()));
  const rows = getConversationRows({ me, usersById, itemsById, invites, threads });

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1>Messages</h1>
          <p className="muted small">Make plans, share dishes, and catch up.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPickerOpen(true)}>+ New</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {loading && <p className="muted">Loading conversations…</p>}
      {!loading && rows.length === 0 && (
        <div className="card stack empty">
          <strong>No conversations yet</strong>
          <p className="muted small">Message a friend, or send them an invite to eat. Your invites will show here automatically.</p>
          <button className="btn btn-primary" onClick={() => setPickerOpen(true)}>Message a friend</button>
        </div>
      )}
      {rows.map((thread) => (
        <button className="card row message-row" key={thread.id} onClick={() => navigate(`/messages/${thread.id}`)}>
          <Avatar user={thread.friend} size={46} />
          <span className="grow message-row-text">
            <strong>{thread.friend.name}</strong>
            <span className="muted small message-preview">{thread.preview}</span>
          </span>
          <span className="message-row-meta">
            <span className="muted small">{thread.latestAt ? timeAgo(thread.latestAt, now) : ""}</span>
            {thread.unread && <span className="message-unread-dot" aria-label="Unread conversation" />}
          </span>
        </button>
      ))}
      {pickerOpen && (
        <div className="sheet-backdrop" onClick={() => setPickerOpen(false)}>
          <section className="sheet card stack" role="dialog" aria-modal="true" aria-label="New message" onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <h2>Message a friend</h2>
              <button className="btn btn-small" onClick={() => setPickerOpen(false)} aria-label="Close">✕</button>
            </div>
            <input autoFocus type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search friends" />
            {friends.length === 0 && <p className="muted small">Add a friend first to start a chat.</p>}
            {friends.length > 0 && matches.length === 0 && <p className="muted small">No matching friends.</p>}
            {matches.map((friend) => (
              <button className="pick" key={friend.id} onClick={() => navigate(`/messages/${threadIdFor(me.id, friend.id)}`)}>
                <Avatar user={friend} size={40} now={now} />
                <span className="grow"><strong>{friend.name}</strong>{isFree(friend, now) && <span className="block muted small">Free to eat</span>}</span>
                <span aria-hidden="true">›</span>
              </button>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
