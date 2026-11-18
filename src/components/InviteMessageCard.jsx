import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, deleteField, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { useData } from "../context/DataContext";
import { respondToInvite } from "../lib/actions";
import { sendThreadMessage } from "../lib/messages";
import { arr, isLive, toLocalInput, whenLabel } from "../lib/helpers";
import DishThumb from "./DishThumb";

export default function InviteMessageCard({ inviteId, now, onCounter }) {
  const { me, invites, itemsById, usersById } = useData();
  const invite = invites.find((inv) => inv.id === inviteId);

  if (!invite) return <p className="muted small">This invite is unavailable.</p>;
  const item = itemsById[invite.itemId];
  const isSender = invite.fromId === me.id;
  const isRecipient = arr(invite.toIds).includes(me.id);
  const live = isLive(invite, now);
  const responses = Object.entries(invite.responses || {}).map(([id, response]) => {
    const name = id === me.id ? "You" : usersById[id]?.name || "A friend";
    const label = response === "down" ? (id === me.id ? "are down" : "is down") :
      response === "cant" || response === "declined" ? "can't make it" : "responded";
    return `${name} ${label}`;
  });

  return (
    <article className="invite-message stack">
      {item && <Link className="invite-message-dish" to={`/items/${item.id}`}>
        <DishThumb item={item} wide />
        <strong>{item.name}</strong>
        <span className="muted small">{item.diningHall}</span>
      </Link>}
      {!item && <strong>Let's eat together!</strong>}
      <span className="small"><strong>When:</strong> {whenLabel(invite, now)}</span>
      {invite.note && <p className="small">“{invite.note}”</p>}
      {responses.length > 0 && <p className="muted small">{responses.join(" · ")}</p>}
      {isRecipient && !isSender && (
        <InviteReplyControls invite={invite} now={now} onCounter={onCounter} />
      )}
      {isSender && !live && <p className="muted small">Invite expired or closed</p>}
    </article>
  );
}

// Shared by incoming Home invites and invite cards in chat.
// eslint-disable-next-line react-refresh/only-export-components
export function InviteReplyControls({ invite, now, onCounter }) {
  const { me, usersById } = useData();
  const response = invite.responses?.[me.id];
  const live = isLive(invite, now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [proposedFor, setProposedFor] = useState(() => toLocalInput(Date.now() + 30 * 60000));
  const [undoUntil, setUndoUntil] = useState(0);
  const [pendingCounter, setPendingCounter] = useState(null);

  // Time suggestions are already stored as `counter` messages.
  // Subscribe so the "waiting" state also survives navigation and reloads.
  useEffect(() => {
    if (!me?.id) return undefined;
    return onSnapshot(
      query(collection(db, "messages"), where("inviteId", "==", invite.id)),
      (snapshot) => {
        const pending = snapshot.docs
          .map((d) => d.data())
          .filter((m) => m.type === "counter" && m.senderId === me.id && m.counterStatus === "pending")
          .sort((a, b) => b.createdAt - a.createdAt);
        setPendingCounter(pending[0] || null);
      },
      (err) => console.error("Could not load invite suggestions:", err)
    );
  }, [invite.id, me?.id]);

  useEffect(() => {
    if (!undoUntil) return undefined;
    const timer = setTimeout(() => setUndoUntil(0), Math.max(0, undoUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [undoUntil]);

  async function answer(value) {
    if (busy || !live) return;
    setBusy(true);
    setError("");
    try {
      await respondToInvite(invite.id, me.id, value);
      setUndoUntil(value === "cant" ? Date.now() + 8000 : 0);
    } catch (err) {
      console.error(err);
      setError("Couldn't save your response. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (busy || response !== "cant" || Date.now() >= undoUntil) return;
    setBusy(true);
    setError("");
    try {
      // Remove just this user's response. Do not add a new response value.
      await updateDoc(doc(db, "invites", invite.id), {
        [`responses.${me.id}`]: deleteField(),
      });
      setUndoUntil(0);
    } catch (err) {
      console.error(err);
      setError("Couldn't undo your response. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendSuggestion() {
    if (busy || !live) return;
    const time = new Date(proposedFor).getTime();
    if (!Number.isFinite(time) || time <= Date.now()) {
      setError("Choose a future date and time.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (onCounter) {
        await onCounter(invite.id, time);
      } else {
        await sendThreadMessage({
          senderId: me.id,
          recipientId: invite.fromId,
          type: "counter",
          inviteId: invite.id,
          proposedFor: time,
        });
      }
      setPendingCounter({ senderId: me.id, proposedFor: time, counterStatus: "pending", createdAt: Date.now() });
      setPickerOpen(false);
    } catch (err) {
      console.error(err);
      setError("Couldn't suggest a time. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function chooseTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setProposedFor(toLocalInput(tomorrow.getTime()));
  }

  return (
    <div className="invite-reply stack">
      {!live ? (
        <p className="muted small">Expired</p>
      ) : response === "down" ? (
        <p className="success">You're in ✓ · {whenLabel(invite, now)}</p>
      ) : response === "cant" ? (
        <div className="row wrap">
          <span className="muted">You declined</span>
          {undoUntil > Date.now() && (
            <button type="button" className="btn-link invite-reply-link" disabled={busy} onClick={undo}>Undo</button>
          )}
        </div>
      ) : pendingCounter ? (
        <p className="muted small">
          You suggested {new Date(pendingCounter.proposedFor).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}, waiting on {usersById[invite.fromId]?.name || "your friend"}
        </p>
      ) : response ? (
        <p className="muted small">You responded: {response}</p>
      ) : (
        <>
          <div className="invite-reply-buttons">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => answer("down")}>Yes, I'm down</button>
            <button type="button" className="btn" disabled={busy} onClick={() => answer("cant")}>Can't make it</button>
          </div>
          <button type="button" className="btn-link invite-reply-link" disabled={busy} aria-expanded={pickerOpen} onClick={() => setPickerOpen((open) => !open)}>
            Suggest a different time
          </button>
          {pickerOpen && (
            <div className="stack invite-reply-picker">
              <div className="row wrap">
                <button type="button" className="chip" disabled={busy} onClick={() => setProposedFor(toLocalInput(Date.now() + 30 * 60000))}>In 30 min</button>
                <button type="button" className="chip" disabled={busy} onClick={() => setProposedFor("")}>After class</button>
                <button type="button" className="chip" disabled={busy} onClick={chooseTomorrow}>Tomorrow</button>
              </div>
              <label className="small" htmlFor={`proposed-${invite.id}`}>Proposed time (choose when class ends if needed)</label>
              <input id={`proposed-${invite.id}`} type="datetime-local" value={proposedFor} min={toLocalInput(now)} onChange={(e) => setProposedFor(e.target.value)} />
              <button type="button" className="btn btn-primary" disabled={busy} onClick={sendSuggestion}>Send suggestion</button>
            </div>
          )}
        </>
      )}
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  );
}
