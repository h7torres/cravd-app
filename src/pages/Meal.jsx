import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { publishMealReview, saveDraftPart, saveDraftPhoto, setInviteItem, skipReview, voteDish } from "../lib/actions";
import { allergyConflicts, arr, compressImage, downIds, groupPicks, joinNames, participants, useNow, whenLabel } from "../lib/helpers";
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
          {invite.reviewId ? "You posted this together." : "No post, and that's fine. The meal still counts."}
        </p>
        {invite.reviewId && item && (
          <div>
            <Link className="btn btn-primary" to={`/items/${item.id}`}>
              See the post
            </Link>
          </div>
        )}
      </div>
    );
  }

  const hasDown = downIds(invite).length > 0;
  const composing = invite.status === "eating" || (invite.status === "open" && hasDown && item);

  // ---- Waiting for a yes, or picking a dish together ----
  if (!composing) {
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

        {!hasDown && <p className="muted small card">Waiting for someone to say yes.</p>}
        {hasDown && !item && (
          <PickTogether invite={invite} people={people.map((id) => usersById[id]).filter(Boolean)} busy={busy} run={run} />
        )}
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  // ---- Accepted with a dish: post the meal together ----
  const missingTakes = people.filter((id) => !allParts[id]?.trim()).map((id) => (id === me.id ? "you" : usersById[id]?.name));
  const hasPhoto = Boolean(invite.draft?.photo);
  const ready = hasPhoto && missingTakes.length === 0 && Boolean(invite.itemId);

  return (
    <div className="stack">
      <h1>Post your meal with {otherNames}</h1>

      <div className="card row">
        <DishThumb item={item} size={48} />
        <span className="grow">
          {item ? (
            <>
              <strong>{item.name}</strong>
              <span className="block muted small">{item.diningHall}</span>
            </>
          ) : (
            <select value="" onChange={(e) => run(() => setInviteItem(invite.id, e.target.value))}>
              <option value="">What did you get?</option>
              {sortedItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.emoji} {i.name} · {i.diningHall}
                </option>
              ))}
            </select>
          )}
        </span>
        {item && invite.status === "open" && (
          <button className="btn-link" disabled={busy} onClick={() => run(() => setInviteItem(invite.id, ""))}>
            Change
          </button>
        )}
      </div>

      <section className="stack">
        <h2>1. Add one photo</h2>
        <p className="muted small">The food, you, or both of you.</p>
        {hasPhoto && <img className="review-photo" src={invite.draft.photo} alt="" />}
        <label className="photo-drop">
          {hasPhoto ? "Change photo" : "📸 Upload a photo"}
          <input type="file" accept="image/*" onChange={handlePhoto} />
        </label>
      </section>

      <section className="stack">
        <h2>2. Your take</h2>
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
            Save my take
          </button>
          {saved && <span className="success">Saved</span>}
        </div>
      </section>

      <section className="stack">
        <h2>{others.length === 1 ? `${others[0].name}'s take` : "Their takes"}</h2>
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
          <button className="btn btn-primary btn-block" disabled={busy || !ready} onClick={publish}>
            Post together
          </button>
          {!ready && (
            <p className="muted small">
              Still needed: {[!hasPhoto && "a photo", missingTakes.length > 0 && `a take from ${joinNames(missingTakes)}`].filter(Boolean).join(" and ")}.
            </p>
          )}
          <p className="muted small">It shows up on everyone's profile and adds a meal point for each of you.</p>
          <button className="btn-link" disabled={busy} onClick={skip}>
            Skip the post, we just ate
          </button>
        </div>
      ) : (
        <p className="muted small card">
          {owner?.name || "The inviter"} posts this once everyone has written their take. It'll show up on both your
          profiles and add a meal point for each of you.
        </p>
      )}
    </div>
  );
}

// For "want to eat?" invites: once people say yes, everyone sees dishes that fit
// the whole group, votes, and anyone can lock one in. Dishes that clash with
// anyone's allergies are left out without saying whose.
function PickTogether({ invite, people, busy, run }) {
  const { me, items, itemsById, usersById } = useData();
  const votes = invite.votes || {};
  const picks = groupPicks(people, items);
  const safeItems = items
    .filter((i) => people.every((p) => allergyConflicts(i, p).length === 0))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const myVote = votes[me.id];

  // Dishes people voted for that aren't already in the suggestions
  const votedExtra = [...new Set(Object.values(votes))]
    .filter((id) => !picks.some((p) => p.item.id === id))
    .map((id) => itemsById[id])
    .filter(Boolean)
    .map((item) => ({ item, fans: [], matches: [] }));

  const voterNames = (itemId) =>
    Object.entries(votes)
      .filter(([, v]) => v === itemId)
      .map(([uid]) => (uid === me.id ? "you" : usersById[uid]?.name))
      .filter(Boolean);

  function reason({ fans, matches }) {
    const bits = [];
    if (fans.length) bits.push(`${joinNames(fans.map((f) => (f.id === me.id ? "you" : f.name)))} love${fans.length === 1 && fans[0].id !== me.id ? "s" : ""} it`);
    const tasteNames = matches.filter((m) => !fans.includes(m.p)).map((m) => (m.p.id === me.id ? "you" : m.p.name));
    if (tasteNames.length) bits.push(`fits ${joinNames(tasteNames)}`);
    return bits.join(" · ");
  }

  return (
    <section className="stack">
      <h2>Pick a dish together</h2>
      <p className="muted small">
        Based on everyone's favorites and food profiles. Anything that clashes with someone's allergies is left out.
      </p>

      {[...picks, ...votedExtra].map((pick) => {
        const voters = voterNames(pick.item.id);
        return (
          <div key={pick.item.id} className={`card row ${myVote === pick.item.id ? "pick-voted" : ""}`}>
            <DishThumb item={pick.item} size={48} />
            <span className="grow">
              <strong>{pick.item.name}</strong>
              <span className="block muted small">{pick.item.diningHall}</span>
              {reason(pick) && <span className="block small">{reason(pick)}</span>}
              {voters.length > 0 && <span className="block signal">Voted: {joinNames(voters)}</span>}
            </span>
            <span className="stack" style={{ gap: 6 }}>
              <button
                className={`btn btn-small ${myVote === pick.item.id ? "btn-on" : ""}`}
                disabled={busy}
                onClick={() => run(() => voteDish(invite.id, me.id, pick.item.id))}
              >
                {myVote === pick.item.id ? "Voted" : "Vote"}
              </button>
              <button className="btn btn-small btn-primary" disabled={busy} onClick={() => run(() => setInviteItem(invite.id, pick.item.id))}>
                Lock in
              </button>
            </span>
          </div>
        );
      })}

      {picks.length === 0 && <p className="muted small">No strong matches yet, so pick anything below.</p>}

      <select
        value=""
        disabled={busy}
        onChange={(e) => e.target.value && run(() => voteDish(invite.id, me.id, e.target.value))}
      >
        <option value="">Vote for something else…</option>
        {safeItems.map((i) => (
          <option key={i.id} value={i.id}>
            {i.emoji} {i.name} · {i.diningHall}
          </option>
        ))}
      </select>
      {arr(Object.keys(votes)).length > 0 && (
        <p className="muted small">Anyone in the plan can lock in a dish once you agree.</p>
      )}
    </section>
  );
}
