import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { sendInvite } from "../lib/actions";
import { arr, isFree, toLocalInput, useNow } from "../lib/helpers";
import Avatar from "../components/Avatar";

const WHEN = [
  ["now", "Right now"],
  ["10", "In 10 min"],
  ["20", "In 20 min"],
  ["planned", "Later"],
];

const VISIBILITY = [
  ["friends", "Just who I picked"],
  ["followers", "My followers can join too"],
  ["anyone", "Anyone on campus can join"],
];

function tomorrowNoon() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return toLocalInput(d.getTime());
}

export default function NewInvite() {
  const { me, usersById, items } = useData();
  const now = useNow();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const friendIds = arr(me.friends);
  const friends = friendIds
    .map((id) => usersById[id])
    .filter(Boolean)
    .sort((a, b) => Number(isFree(b, now)) - Number(isFree(a, now)) || (a.name || "").localeCompare(b.name || ""));

  const [toIds, setToIds] = useState(() =>
    (params.get("to") || "").split(",").filter((id) => friendIds.includes(id))
  );
  const [itemId, setItemId] = useState(params.get("item") || "");
  const [urgency, setUrgency] = useState(params.get("when") === "planned" ? "planned" : "now");
  const [plannedFor, setPlannedFor] = useState(tomorrowNoon);
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState("friends");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function toggle(id) {
    setToIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSend() {
    setError("");
    if (visibility === "friends" && toIds.length === 0) {
      setError("Pick at least one friend, or open the table to more people.");
      return;
    }
    const plannedMs = new Date(plannedFor).getTime();
    if (urgency === "planned" && !(plannedMs > Date.now())) {
      setError("Pick a time in the future.");
      return;
    }
    setSending(true);
    try {
      await sendInvite({ fromId: me.id, toIds, itemId, urgency, plannedFor: plannedMs, note: note.trim(), visibility });
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Couldn't send the invite. Try again.");
      setSending(false);
    }
  }

  const sortedItems = [...items].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="stack">
      <h1>Send an invite</h1>

      <section className="stack">
        <h2>Who</h2>
        {friends.length === 0 ? (
          <p className="muted small">
            You don't have friends yet. You can still open the table to followers or anyone below.
          </p>
        ) : (
          <div className="chips">
            {friends.map((f) => (
              <button key={f.id} className={`chip row ${toIds.includes(f.id) ? "chip-on" : ""}`} onClick={() => toggle(f.id)}>
                <Avatar user={f} size={20} now={now} />
                {f.name}
                {isFree(f, now) && <span className="small"> · {f.status.zone}</span>}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="stack">
        <h2>When</h2>
        <div className="chips">
          {WHEN.map(([key, label]) => (
            <button key={key} className={`chip ${urgency === key ? "chip-on" : ""}`} onClick={() => setUrgency(key)}>
              {label}
            </button>
          ))}
        </div>
        {urgency === "planned" ? (
          <input type="datetime-local" value={plannedFor} onChange={(e) => setPlannedFor(e.target.value)} />
        ) : (
          <p className="muted small">If nobody answers, this disappears 15 min after the meet time.</p>
        )}
      </section>

      <section className="stack">
        <h2>Dish</h2>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">No dish yet, decide together</option>
          {sortedItems.map((i) => (
            <option key={i.id} value={i.id}>
              {i.emoji} {i.name} · {i.diningHall}
            </option>
          ))}
        </select>
      </section>

      <section className="stack">
        <h2>Note</h2>
        <input placeholder="pizza after class?" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} />
      </section>

      <section className="stack">
        <h2>Who can see it</h2>
        {VISIBILITY.map(([key, label]) => (
          <label key={key} className="check">
            <input type="radio" name="visibility" checked={visibility === key} onChange={() => setVisibility(key)} />
            {label}
          </label>
        ))}
      </section>

      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={sending} onClick={handleSend}>
        {sending ? "Sending…" : "Send invite"}
      </button>
    </div>
  );
}
