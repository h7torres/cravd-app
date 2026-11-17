import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { publishMealReview, saveDraftPart, saveDraftPhoto, setInviteItem, skipReview, startMeal } from "../lib/actions";
import { compressImage, downIds, joinNames, participants, useNow, whenLabel } from "../lib/helpers";
import Avatar from "../components/Avatar";
import DishThumb from "../components/DishThumb";

// Plan → sitting down → two-voice review. Each person writes their own half;
// the person who sent the invite publishes it. Skipping the review is always allowed.
export default function Meal() {
  const { inviteId } = useParams();
  const { me, invites, usersById, itemsById, items } = useData();
  const now = useNow();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const invite = invites.find((inv) => inv.id === inviteId);
  if (!invite) {
    return (
      <div className="stack">
        <h1>Plan not found</h1>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  const people = participants(invite);
  if (!people.includes(me.id)) {
    return (
      <div className="stack">
        <h1>This isn't one of your plans</h1>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  const isOwner = invite.fromId === me.id;
  const owner = usersById[invite.fromId];
  const others = people.filter((id) => id !== me.id).map((id) => usersById[id]).filter(Boolean);
  const otherNames = joinNames(others.map((u) => u.name)) || "your friends";
  const item = invite.itemId ? itemsById[invite.itemId] : null;
  const parts = invite.draft?.parts || {};
  const myText = draft ?? parts[me.id] ?? "";
  const allParts = { ...parts, [me.id]: myText };
  const writtenCount = Object.values(allParts).filter((t) => t?.trim()).length;
  const sortedItems = [...items].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
    }
    setBusy(false);
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (file) run(async () => saveDraftPhoto(invite.id, await compressImage(file)));
  }

  function saveMine() {
    run(async () => {
      await saveDraftPart(invite.id, me.id, myText);
      setDraft(null);
      setSaved(true);
    });
  }

  function publish() {
    run(async () => {
      if (draft !== null) await saveDraftPart(invite.id, me.id, myText);
      await publishMealReview(invite, allParts);
      navigate(`/items/${invite.itemId}`);
    });
  }

  function skip() {
    run(async () => {
      await skipReview(invite.id);
      navigate("/");
    });
  }

  if (invite.status === "cancelled") {
    return (
      <div className="stack">
        <h1>This invite was cancelled</h1>
        <Link to="/">Back home</Link>
      </div>
    );
  }

  if (invite.status === "done") {
    return (
      <div className="stack">
        <h1>Meal with {otherNames}</h1>
        {item && (
          <div className="row">
            <DishThumb item={item} size={48} />
            <strong>{item.name}</strong>
          </div>
        )}
        <p className="muted">
          {invite.reviewId ? "You reviewed this together." : "No review, and that's fine. The meal still counts."}
        </p>
        {invite.reviewId && item && (
          <div>
            <Link className="btn btn-primary" to={`/items/${item.id}`}>
              See the review
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (invite.status === "open") {
    const hasDown = downIds(invite).length > 0;
    return (
      <div className="stack">
        <h1>Eating with {otherNames}</h1>
        <div className="card stack">
          <div className="row">
            {others.map((u) => (
              <Avatar key={u.id} user={u} size={36} now={now} />
            ))}
          </div>
          <p>
            <strong>{whenLabel(invite, now)}</strong>
            {item ? ` · ${item.name} at ${item.diningHall}` : " · dish TBD"}
          </p>
          {invite.note && <p className="muted">“{invite.note}”</p>}
        </div>
        <p className="muted small">
          When you're sitting down together, start the meal. You'll be asked for a photo and a quick review, or you can skip it.
        </p>
        <button className="btn btn-primary btn-block" disabled={!hasDown || busy} onClick={() => run(() => startMeal(invite.id))}>
          We're sitting down
        </button>
        {!hasDown && <p className="muted small">Nobody has said they're down yet.</p>}
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  // status === "eating": collaborative review
  return (
    <div className="stack">
      <h1>Eating with {otherNames}</h1>

      <section className="stack">
        <h2>What did you get?</h2>
        <select value={invite.itemId || ""} onChange={(e) => run(() => setInviteItem(invite.id, e.target.value))}>
          <option value="">Pick a dish</option>
          {sortedItems.map((i) => (
            <option key={i.id} value={i.id}>
              {i.emoji} {i.name} · {i.diningHall}
            </option>
          ))}
        </select>
      </section>

      <section className="stack">
        <h2>Photo</h2>
        {invite.draft?.photo && <img className="review-photo" src={invite.draft.photo} alt="" />}
        <label className="photo-drop">
          {invite.draft?.photo ? "Retake photo" : "📸 Take a photo of the food, and of you if you want"}
          <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
        </label>
      </section>

      <section className="stack">
        <h2>Your take</h2>
        <textarea
          placeholder="What did you think?"
          value={myText}
          onChange={(e) => {
            setDraft(e.target.value);
            setSaved(false);
          }}
        />
        <div className="row">
          <button className="btn btn-small" disabled={busy || draft === null} onClick={saveMine}>
            Save my part
          </button>
          {saved && <span className="success">Saved</span>}
        </div>
      </section>

      <section className="stack">
        <h2>Their take</h2>
        {others.map((u) => (
          <div key={u.id} className="review-part card">
            <Avatar user={u} size={28} />
            <div>
              <strong className="small">{u.name}</strong>
              {parts[u.id]?.trim() ? <p>{parts[u.id]}</p> : <p className="muted small">Hasn't written yet</p>}
            </div>
          </div>
        ))}
      </section>

      {error && <p className="error">{error}</p>}

      {isOwner ? (
        <div className="stack">
          <button className="btn btn-primary btn-block" disabled={busy || !invite.itemId || writtenCount === 0} onClick={publish}>
            Publish review
          </button>
          {!invite.itemId && <p className="muted small">Pick the dish before publishing.</p>}
          <p className="muted small">It'll show up on the profile of everyone who wrote a part.</p>
          <button className="btn-link" disabled={busy} onClick={skip}>
            Skip the review, we just ate
          </button>
        </div>
      ) : (
        <p className="muted small card">
          {owner?.name || "The inviter"} publishes this once everyone's written their part. It'll show up on both your profiles.
        </p>
      )}
    </div>
  );
}
