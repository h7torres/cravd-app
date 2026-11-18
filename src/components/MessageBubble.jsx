import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { clockTime, isLive } from "../lib/helpers";
import DishThumb from "./DishThumb";
import InviteMessageCard from "./InviteMessageCard";

export default function MessageBubble({ message, now, onCounter, onDecideCounter, busy }) {
  const { me, usersById, itemsById, invites } = useData();
  const mine = message.senderId === me.id;
  const item = itemsById[message.itemId];
  const inv = invites.find((i) => i.id === message.inviteId);
  const senderName = usersById[message.senderId]?.name || "Friend";
  const counterTime = Number(message.proposedFor);
  const canAcceptCounter = !mine && inv?.fromId === me.id &&
    message.counterStatus === "pending" && isLive(inv, now) && counterTime > now;

  return (
    <div className={`message-bubble-wrap ${mine ? "message-mine" : "message-theirs"}`}>
      <div className={`message-bubble ${mine ? "message-bubble-mine" : "message-bubble-theirs"}`}>
        {message.type === "text" && <p>{message.text}</p>}
        {message.type === "dish" && (
          item ? <Link className="message-dish row" to={`/items/${item.id}`}>
            <DishThumb item={item} size={56} />
            <span><strong>{item.name}</strong><span className="block muted small">{item.diningHall}</span><span className="block small">View dish ›</span></span>
          </Link> : <p>Shared a dish</p>
        )}
        {message.type === "invite" && <InviteMessageCard inviteId={message.inviteId} now={now} onCounter={onCounter} />}
        {message.type === "counter" && <div className="stack">
          <strong>{senderName} suggested a different time</strong>
          <span>{counterTime ? new Date(counterTime).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "Time unavailable"}</span>
          {message.counterStatus === "accepted" && <p className="success small">✓ Works for me — invite updated</p>}
          {message.counterStatus === "declined" && <p className="muted small">Suggestion declined</p>}
          {canAcceptCounter && <div className="row wrap">
            <button disabled={busy} className="btn btn-primary" onClick={() => onDecideCounter(message, true)}>Works for me</button>
            <button disabled={busy} className="btn" onClick={() => onDecideCounter(message, false)}>Can't do that time</button>
          </div>}
          {message.counterStatus === "pending" && !mine && inv?.fromId === me.id && !canAcceptCounter && <p className="muted small">This suggestion is no longer available.</p>}
        </div>}
      </div>
      <span className="muted message-timestamp">{message.createdAt ? clockTime(typeof message.createdAt === "number" ? message.createdAt : message.createdAt.toMillis?.() || 0) : ""}</span>
    </div>
  );
}
