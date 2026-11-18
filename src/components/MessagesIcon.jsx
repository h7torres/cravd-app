import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { getConversationRows, subscribeThreads } from "../lib/messages";

export default function MessagesIcon() {
  const { me, usersById, itemsById, invites } = useData();
  const [threads, setThreads] = useState([]);
  useEffect(() => {
    if (!me?.id) return;
    return subscribeThreads(me.id, setThreads, (err) => console.error("Unread badge:", err));
  }, [me?.id]);
  const unreadCount = getConversationRows({ me, usersById, itemsById, invites, threads })
    .filter((r) => r.unread).length;

  return <Link className="messages-icon" to="/messages" aria-label={`Messages${unreadCount ? `, ${unreadCount} unread conversations` : ""}`} title="Messages">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
    {unreadCount > 0 && <span className="badge message-icon-badge">{unreadCount}</span>}
  </Link>;
}
