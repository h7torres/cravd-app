import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { sendInvite } from "../lib/actions";
import {
  arr,
  downIds,
  isFree,
  isLive,
  isPlan,
  joinNames,
  participants,
  sharedPrefs,
  tasteMatches,
  useNow,
  whenLabel,
} from "../lib/helpers";
import Avatar from "../components/Avatar";
import DishThumb from "../components/DishThumb";
import InviteCard from "../components/InviteCard";
import ReviewCard from "../components/ReviewCard";
import StatusPanel from "../components/StatusPanel";

const FEED_SIZE = 6;

// Home: who's active (and inviting them), your invites and plans, then what your
// friends have been liking and posting.
export default function Home() {
  const { me, usersById, itemsById, invites, reviews } = useData();
  const now = useNow();
  const [picked, setPicked] = useState([]);
  const [mode, setMode] = useState("group");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");

  const friendIds = arr(me.friends);
  const friends = friendIds.map((id) => usersById[id]).filter(Boolean);
  const activeFriends = friends.filter((f) => isFree(f, now));
  const byMeet = (a, b) => a.meetAt - b.meetAt;

  // ---- Invites & plans ----
  const eating = invites.filter((inv) => inv.status === "eating" && participants(inv).includes(me.id));
  const plans = invites.filter((inv) => isPlan(inv, now) && participants(inv).includes(me.id)).sort(byMeet);
  const incoming = invites
    .filter(
      (inv) =>
        isLive(inv, now) &&
        inv.fromId !== me.id &&
        arr(inv.toIds).includes(me.id) &&
        inv.responses?.[me.id] !== "down"
    )
    .sort(byMeet);
  const waiting = invites
    .filter((inv) => inv.fromId === me.id && isLive(inv, now) && downIds(inv).length === 0)
    .sort(byMeet);

  // ---- Feed: reviews my friends posted or liked, topped up with popular campus posts ----
  const friendTouched = (r) =>
    arr(r.authorIds).some((id) => friendIds.includes(id)) || arr(r.upvotes).some((id) => friendIds.includes(id));
  const friendFeed = reviews
    .filter((r) => itemsById[r.itemId] && friendTouched(r))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 12);
  const campusFeed =
    friendFeed.length >= FEED_SIZE
      ? []
      : reviews
          .filter((r) => itemsById[r.itemId] && !friendTouched(r))
          .sort((a, b) => arr(b.upvotes).length - arr(a.upvotes).length || b.createdAt - a.createdAt)
          .slice(0, FEED_SIZE - friendFeed.length);

  const tasteTwins = tasteMatches(me, friends).slice(0, 3);

  // ---- Inviting ----
  function togglePick(id) {
    setSentMsg("");
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function inviteAll() {
    setSentMsg("");
    setPicked(friendIds.filter((id) => usersById[id]));
  }

  async function send(urgency) {
    if (picked.length === 0 || sending) return;
    setSending(true);
    const names = joinNames(picked.map((id) => usersById[id]?.name).filter(Boolean));
    try {
      if (mode === "group" || picked.length === 1) {
        await sendInvite({ fromId: me.id, toIds: picked, urgency, visibility: "friends" });
        setSentMsg(picked.length === 1 ? `Invite sent to ${names}.` : `Group invite sent to ${names}.`);
      } else {
        await Promise.all(
          picked.map((id) => sendInvite({ fromId: me.id, toIds: [id], urgency, visibility: "friends" }))
        );
        setSentMsg(`${picked.length} separate invites sent to ${names}.`);
      }
      setPicked([]);
    } catch (err) {
      console.error(err);
      setSentMsg("Couldn't send. Try again.");
    }
    setSending(false);
  }

  const pickedNames = picked.map((id) => usersById[id]?.name).filter(Boolean);
  const planProps = { me, usersById, itemsById, now };

  return (
    <div className="stack">
      <h1>Hey {me.name}</h1>

      {/* ---- Active now ---- */}
      <section className="stack">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Active now</h2>
          {friends.length > 0 && (
            <button className="btn btn-small" onClick={inviteAll}>
              Invite all friends
            </button>
          )}
        </div>

        <StatusPanel me={me} now={now} />

        <div className="card stack">
          {activeFriends.length === 0 && (
            <p className="muted small">
              No friends are active right now. You can still invite everyone and see who's down.
            </p>
          )}
          {activeFriends.map((f) => {
            const shared = sharedPrefs(me, f);
            return (
              <label key={f.id} className="user-row check">
                <input type="checkbox" checked={picked.includes(f.id)} onChange={() => togglePick(f.id)} />
                <Avatar user={f} size={36} now={now} />
                <span className="grow">
                  <span className="block">{f.name}</span>
                  <span className="block muted small">
                    near {f.status.zone}
                    {shared.length > 0 && ` · you both like ${joinNames(shared.slice(0, 2))}`}
                  </span>
                </span>
              </label>
            );
          })}

          {picked.length > 0 ? (
            <div className="stack send-bar">
              <span className="small">
                Ask <strong>{joinNames(pickedNames)}</strong> if they want to eat. You'll pick a dish together once
                someone says yes.
              </span>
              {picked.length > 1 && (
                <div className="chips">
                  <button className={`chip ${mode === "group" ? "chip-on" : ""}`} onClick={() => setMode("group")}>
                    Group invite · eat together
                  </button>
                  <button
                    className={`chip ${mode === "individual" ? "chip-on" : ""}`}
                    onClick={() => setMode("individual")}
                  >
                    Individual invites
                  </button>
                </div>
              )}
              <div className="row wrap">
                <button className="btn btn-small btn-primary" disabled={sending} onClick={() => send("now")}>
                  Right now
                </button>
                <button className="btn btn-small" disabled={sending} onClick={() => send("10")}>
                  In 10 min
                </button>
                <button className="btn btn-small" disabled={sending} onClick={() => send("20")}>
                  In 20 min
                </button>
                <Link className="btn btn-small" to={`/invite/new?to=${picked.join(",")}`}>
                  Later or with a dish…
                </Link>
              </div>
              <button className="btn-link" onClick={() => setPicked([])}>
                Clear
              </button>
            </div>
          ) : (
            activeFriends.length > 0 && <p className="muted small">Tap people to ask if they want to eat.</p>
          )}
          {sentMsg && <p className="success">{sentMsg}</p>}
        </div>
      </section>

      {/* ---- Invites & plans (only when there's something) ---- */}
      {eating.length + plans.length > 0 && (
        <section className="stack">
          <h2>Your plans</h2>
          {eating.map((inv) => (
            <PlanCard key={inv.id} invite={inv} eating {...planProps} />
          ))}
          {plans.map((inv) => (
            <PlanCard key={inv.id} invite={inv} {...planProps} />
          ))}
        </section>
      )}

      {incoming.length > 0 && (
        <section className="stack">
          <h2>Invites for you</h2>
          {incoming.map((inv) => (
            <InviteCard key={inv.id} invite={inv} now={now} mode="incoming" />
          ))}
        </section>
      )}

      {waiting.length > 0 && (
        <section className="stack">
          <h2>Waiting on replies</h2>
          {waiting.map((inv) => (
            <InviteCard key={inv.id} invite={inv} now={now} mode="outgoing" />
          ))}
        </section>
      )}

      {/* ---- What friends are liking and posting ---- */}
      <section className="stack">
        <h2>From your friends</h2>
        {friendFeed.length === 0 && (
          <p className="muted small">
            When your friends like or post a meal, it shows up here so you can invite them to try it with you.
          </p>
        )}
        {friendFeed.map((r) => (
          <ReviewCard key={r.id} review={r} now={now} />
        ))}
      </section>

      {campusFeed.length > 0 && (
        <section className="stack">
          <h2>Popular on campus</h2>
          {campusFeed.map((r) => (
            <ReviewCard key={r.id} review={r} now={now} />
          ))}
        </section>
      )}

      {tasteTwins.length > 0 && (
        <section className="stack">
          <h2>Similar taste</h2>
          <div className="card">
            {tasteTwins.map(({ u, shared }) => (
              <div key={u.id} className="user-row">
                <Link to={`/profile/${u.id}`}>
                  <Avatar user={u} size={36} now={now} />
                </Link>
                <span className="grow">
                  <Link to={`/profile/${u.id}`} className="name">
                    {u.name}
                  </Link>
                  <span className="block muted small">You both like {joinNames(shared.slice(0, 3))}</span>
                </span>
                <Link className="btn btn-small btn-primary" to={`/invite/new?to=${u.id}`}>
                  Ask to eat
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PlanCard({ invite, eating, me, usersById, itemsById, now }) {
  const others = participants(invite)
    .filter((id) => id !== me.id)
    .map((id) => usersById[id]?.name)
    .filter(Boolean);
  const item = itemsById[invite.itemId];
  const hasDown = downIds(invite).length > 0;
  const action = eating || (item && hasDown) ? "Post together" : !item ? "Pick dish" : "Open";
  return (
    <Link to={`/meal/${invite.id}`} className="card row plan-card">
      <DishThumb item={item} size={44} />
      <span className="grow">
        <strong>Eating with {joinNames(others)}</strong>
        <span className="block muted small">
          {item ? item.name : "Pick a dish together"} · {eating ? "happening now" : whenLabel(invite, now)}
        </span>
      </span>
      <span className="btn btn-small btn-primary">{action}</span>
    </Link>
  );
}
