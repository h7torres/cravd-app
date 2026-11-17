import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { sendInvite } from "../lib/actions";
import {
  arr,
  DAY,
  downIds,
  isFree,
  isLive,
  isPlan,
  joinNames,
  participants,
  timeAgo,
  useNow,
  whenLabel,
} from "../lib/helpers";
import Avatar from "../components/Avatar";
import DishThumb from "../components/DishThumb";
import InviteCard from "../components/InviteCard";
import StatusPanel from "../components/StatusPanel";

// The fast lane: people first. Falls back to recent friend activity, then to a prompt.
export default function Home() {
  const { me, usersById, itemsById, items, invites, reviews } = useData();
  const now = useNow();
  const [picked, setPicked] = useState([]);
  const [sentMsg, setSentMsg] = useState("");

  const friendIds = arr(me.friends);
  const friends = friendIds.map((id) => usersById[id]).filter(Boolean);
  const freeFriends = friends.filter((f) => isFree(f, now));
  const byMeet = (a, b) => a.meetAt - b.meetAt;

  const eating = invites.filter((inv) => inv.status === "eating" && participants(inv).includes(me.id));
  const plans = invites
    .filter((inv) => isPlan(inv, now) && participants(inv).includes(me.id))
    .sort(byMeet);
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

  const hasLive =
    eating.length + plans.length + incoming.length + waiting.length + freeFriends.length > 0;

  // Rung 2: recent friend activity
  const weekAgo = now - 7 * DAY;
  const activity = [
    ...reviews
      .filter((r) => r.createdAt > weekAgo && arr(r.authorIds).some((id) => friendIds.includes(id)))
      .map((r) => ({
        key: r.id,
        at: r.createdAt,
        who: arr(r.authorIds).map((id) => usersById[id]?.name).filter(Boolean),
        verb: "reviewed",
        item: itemsById[r.itemId],
      })),
    ...invites
      .filter(
        (inv) =>
          inv.status === "done" &&
          !inv.reviewId &&
          (inv.doneAt || 0) > weekAgo &&
          !participants(inv).includes(me.id) &&
          participants(inv).some((id) => friendIds.includes(id))
      )
      .map((inv) => ({
        key: inv.id,
        at: inv.doneAt,
        who: participants(inv).map((id) => usersById[id]?.name).filter(Boolean),
        verb: "ate",
        item: itemsById[inv.itemId],
      })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  // Rung 3: the dish most of your friends love
  const crowdPick = items
    .map((item) => ({ item, fans: friends.filter((f) => arr(f.favorites).includes(item.id)) }))
    .filter((x) => x.fans.length > 0)
    .sort((a, b) => b.fans.length - a.fans.length)[0];

  function togglePick(id) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function quickInvite(urgency) {
    if (picked.length === 0) return;
    await sendInvite({ fromId: me.id, toIds: picked, urgency, visibility: "friends" });
    setSentMsg(`Invite sent to ${joinNames(picked.map((id) => usersById[id]?.name).filter(Boolean))}.`);
    setPicked([]);
  }

  const planProps = { me, usersById, itemsById, now };

  return (
    <div className="stack">
      <h1>Hey {me.name}</h1>
      <StatusPanel me={me} now={now} />

      {eating.length > 0 && (
        <section className="stack">
          <h2>Finish your review</h2>
          {eating.map((inv) => (
            <PlanCard key={inv.id} invite={inv} eating {...planProps} />
          ))}
        </section>
      )}

      {plans.length > 0 && (
        <section className="stack">
          <h2>Your plans</h2>
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

      {freeFriends.length > 0 && (
        <section className="stack">
          <h2>Free right now</h2>
          <div className="card stack">
            {freeFriends.map((f) => (
              <label key={f.id} className="user-row check">
                <input type="checkbox" checked={picked.includes(f.id)} onChange={() => togglePick(f.id)} />
                <Avatar user={f} size={36} now={now} />
                <span className="grow">
                  <span className="block">{f.name}</span>
                  <span className="block muted small">near {f.status.zone}</span>
                </span>
              </label>
            ))}
            {picked.length > 0 ? (
              <div className="stack">
                <span className="small">
                  Quick invite {joinNames(picked.map((id) => usersById[id]?.name).filter(Boolean))}:
                </span>
                <div className="row wrap">
                  <button className="btn btn-small btn-primary" onClick={() => quickInvite("now")}>
                    Right now
                  </button>
                  <button className="btn btn-small" onClick={() => quickInvite("10")}>
                    In 10 min
                  </button>
                  <button className="btn btn-small" onClick={() => quickInvite("20")}>
                    In 20 min
                  </button>
                  <Link className="btn btn-small" to={`/invite/new?to=${picked.join(",")}`}>
                    Pick a dish…
                  </Link>
                </div>
              </div>
            ) : (
              <p className="muted small">Tap people to invite them in one go.</p>
            )}
          </div>
        </section>
      )}
      {sentMsg && <p className="success">{sentMsg}</p>}

      {waiting.length > 0 && (
        <section className="stack">
          <h2>Waiting on replies</h2>
          {waiting.map((inv) => (
            <InviteCard key={inv.id} invite={inv} now={now} mode="outgoing" />
          ))}
        </section>
      )}

      {!hasLive && (
        <section className="stack">
          <h2>Nobody's around right now</h2>

          {friends.length === 0 ? (
            <div className="card empty stack">
              <p>You don't have friends on Cravd yet.</p>
              <p className="muted small">Browse reviews to find people whose taste matches yours.</p>
              <div className="row wrap" style={{ justifyContent: "center" }}>
                <Link className="btn btn-primary" to="/explore">
                  Explore
                </Link>
                <Link className="btn" to="/friends">
                  Find people
                </Link>
              </div>
            </div>
          ) : (
            <>
              {activity.length > 0 && (
                <div className="card stack">
                  <span className="muted small">Recently from your friends</span>
                  {activity.map((a) => (
                    <div key={a.key} className="row">
                      <DishThumb item={a.item} size={36} />
                      <span className="grow small">
                        <strong>{joinNames(a.who)}</strong>{" "}
                        {a.verb === "ate"
                          ? `got ${a.item ? a.item.name : "lunch"} together`
                          : `reviewed ${a.item?.name || "a dish"}`}
                      </span>
                      <span className="muted small">{timeAgo(a.at, now)}</span>
                    </div>
                  ))}
                </div>
              )}

              {crowdPick && (
                <Link
                  className="card row plan-card"
                  to={`/invite/new?item=${crowdPick.item.id}&to=${crowdPick.fans
                    .map((f) => f.id)
                    .join(",")}&when=planned`}
                >
                  <DishThumb item={crowdPick.item} size={44} />
                  <span className="grow">
                    <strong>
                      {joinNames(crowdPick.fans.map((f) => f.name))}{" "}
                      {crowdPick.fans.length === 1 ? "loves" : "love"} {crowdPick.item.name}
                    </strong>
                    <span className="block muted small">Invite them for another day?</span>
                  </span>
                </Link>
              )}

              <Link className="card row plan-card" to="/blend">
                <span className="dish-thumb" style={{ width: 44, height: 44, fontSize: 24 }}>
                  🤝
                </span>
                <span className="grow">
                  <strong>Blend with a friend</strong>
                  <span className="block muted small">Find the dish you'd both be happy with.</span>
                </span>
              </Link>
            </>
          )}
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
  return (
    <Link to={`/meal/${invite.id}`} className="card row plan-card">
      <DishThumb item={item} size={44} />
      <span className="grow">
        <strong>{eating ? `Review with ${joinNames(others)}` : `Eating with ${joinNames(others)}`}</strong>
        <span className="block muted small">
          {item ? item.name : "Dish TBD"} · {eating ? "happening now" : whenLabel(invite, now)}
        </span>
      </span>
      <span className="btn btn-small btn-primary">{eating ? "Review" : "Open"}</span>
    </Link>
  );
}
