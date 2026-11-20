import { useState } from "react";
import { useData } from "../context/DataContext";
import { sendInvite } from "../lib/actions";
import { arr, isFree, nextQuarterHour, toLocalInput, useNow } from "../lib/helpers";
import { sendThreadMessage, threadIdFor } from "../lib/messages";
import Avatar from "./Avatar";
import DishPicker from "./DishPicker";
import DishThumb from "./DishThumb";

const TIMES = [["now", "Right now"], ["10", "In 10 min"], ["20", "In 20 min"], ["planned", "Later"]];

function defaultLater() {
  return toLocalInput(nextQuarterHour(Date.now() + 60 * 60 * 1000));
}

// From dish cards: select friends; from a chat: a single pre-selected friend.
export default function SendToFriendSheet({ item = null, lockedFriendId = null, onClose, onSent }) {
  const { me, usersById, items } = useData();
  const now = useNow();
  const friends = arr(me.friends).map((id) => usersById[id]).filter(Boolean)
    .sort((a, b) => Number(isFree(b, now)) - Number(isFree(a, now)) || (a.name || "").localeCompare(b.name || ""));
  const [chosen, setChosen] = useState(lockedFriendId ? [lockedFriendId] : []);
  const [itemId, setItemId] = useState(item?.id || "");
  const [urgency, setUrgency] = useState("now");
  const [plannedFor, setPlannedFor] = useState(defaultLater);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(id) {
    setChosen((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit(mode) {
    if (busy) return;
    setError("");
    const recipientIds = chosen.filter((id) => friends.some((f) => f.id === id));
    if (!recipientIds.length) return setError("Pick at least one friend.");
    if (mode === "dish" && !itemId) return setError("Pick a dish first.");
    const plannedMs = new Date(plannedFor).getTime();
    // Runs in a click handler, not during render.
    // eslint-disable-next-line react-hooks/purity
    if (mode === "invite" && urgency === "planned" && !(plannedMs > Date.now())) return setError("Pick a future time.");
    setBusy(true);
    try {
      let inviteRef = null;
      if (mode === "invite") {
        inviteRef = await sendInvite({
          fromId: me.id, toIds: recipientIds, itemId: itemId || null,
          urgency, plannedFor: plannedMs, note: note.trim(), visibility: "friends",
          source: "share_sheet",
        });
      }
      // Use a separate 1:1 thread for each friend. Group threads can be added later.
      const results = await Promise.allSettled(recipientIds.map((recipientId) => sendThreadMessage({
        senderId: me.id, recipientId, type: mode === "invite" ? "invite" : "dish",
        ...(itemId ? { itemId } : {}),
        ...(inviteRef ? { inviteId: inviteRef.id } : {}),
      })));
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length && !inviteRef) throw new Error("Could not share the dish. Check Firestore permissions.");
      // An invite created successfully in the existing invites collection still
      // shows up in the inbox even if the optional chat-message write failed.
      onSent(threadIdFor(me.id, recipientIds[0]), failed.length > 0);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not send. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet card stack" role="dialog" aria-modal="true" aria-label="Send to a friend" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>Send to a friend</h2>
          <button type="button" className="btn btn-small" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {item && <div className="row"><DishThumb item={item} size={48} /><span className="grow"><strong>{item.name}</strong><span className="block muted small">{item.diningHall}</span></span></div>}
        {!lockedFriendId && <div className="stack"><strong className="small">Choose friends</strong>
          {friends.length === 0 && <p className="muted small">Add friends to share a dish or send an invite.</p>}
          {friends.map((f) => <label className="pick" key={f.id}>
            <input type="checkbox" checked={chosen.includes(f.id)} onChange={() => toggle(f.id)} style={{ width: "auto" }} />
            <Avatar user={f} size={36} now={now} /><span className="grow">{f.name}{isFree(f, now) && <span className="block muted small">Free to eat</span>}</span>
          </label>)}
        </div>}
        {!item && <DishPicker items={items} selectedId={itemId} onPick={(picked) => setItemId(picked.id)} label="Optional dish for the invite" />}
        <strong className="small">When?</strong>
        <div className="chips">{TIMES.map(([key, label]) => <button key={key} className={`chip ${urgency === key ? "chip-on" : ""}`} onClick={() => setUrgency(key)}>{label}</button>)}</div>
        {urgency === "planned" && <input type="datetime-local" step={900} value={plannedFor} onChange={(e) => setPlannedFor(e.target.value)} />}
        <input placeholder="Optional note (e.g. pizza after class?)" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy || !chosen.length} onClick={() => submit("invite")}>{busy ? "Sending…" : "Send invite"}</button>
        {itemId && <button className="btn btn-block" disabled={busy || !chosen.length} onClick={() => submit("dish")}>Just share the dish</button>}
      </section>
    </div>
  );
}
