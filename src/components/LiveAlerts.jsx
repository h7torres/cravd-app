import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { respondToInvite } from "../lib/actions";
import { arr, isLive, joinNames, useNow, whenLabel } from "../lib/helpers";
import Avatar from "./Avatar";

const SEEN_KEY = "cravdSeenYes";

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

// There are no push notifications, so this makes sure people notice invites in
// the room: a banner on every screen, a count in the browser tab, and a buzz on
// phones that support it.
export default function LiveAlerts() {
  const { me, invites, usersById, itemsById } = useData();
  const now = useNow(15000);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [seenYes, setSeenYes] = useState(loadSeen);
  const [busy, setBusy] = useState(false);
  const lastCount = useRef(0);

  // Invites to me that I haven't answered
  const incoming = invites
    .filter(
      (inv) =>
        isLive(inv, now) &&
        inv.fromId !== me.id &&
        arr(inv.toIds).includes(me.id) &&
        !inv.responses?.[me.id] &&
        !dismissed.has(inv.id)
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  // People who said yes to my invites, that I haven't seen yet
  const newYes = invites
    .filter((inv) => inv.fromId === me.id && inv.status === "open")
    .flatMap((inv) =>
      Object.entries(inv.responses || {})
        .filter(([uid, r]) => r === "down" && !seenYes.has(`${inv.id}:${uid}`))
        .map(([uid]) => ({ inv, uid }))
    );

  const count = incoming.length + newYes.length;

  useEffect(() => {
    document.title = count > 0 ? `(${count}) Cravd` : "Cravd";
    if (count > lastCount.current) {
      try {
        navigator.vibrate?.(200);
      } catch {
        // not supported
      }
    }
    lastCount.current = count;
  }, [count]);

  function markSeen(keys) {
    setSeenYes((prev) => {
      const next = new Set([...prev, ...keys]);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  async function answer(inv, value) {
    setBusy(true);
    try {
      await respondToInvite(inv.id, me.id, value);
    } catch (err) {
      console.error(err);
    }
    setBusy(false);
  }

  const invite = incoming[0];
  const yesGroup = newYes.length ? newYes.filter((y) => y.inv.id === newYes[0].inv.id) : [];

  if (!invite && yesGroup.length === 0) return null;

  return (
    <div className="live-alerts" role="status" aria-live="polite">
      {invite && (
        <div className="live-alert">
          <div className="row">
            <Avatar user={usersById[invite.fromId]} size={32} />
            <span className="grow small">
              <strong>{usersById[invite.fromId]?.name || "A friend"}</strong> wants to eat {whenLabel(invite, now)}
              {invite.itemId && itemsById[invite.itemId] ? `: ${itemsById[invite.itemId].name}` : ""}
              {incoming.length > 1 && <span className="muted"> · +{incoming.length - 1} more</span>}
            </span>
            <button
              type="button"
              className="btn btn-small"
              aria-label="Dismiss"
              onClick={() => setDismissed((prev) => new Set([...prev, invite.id]))}
            >
              ✕
            </button>
          </div>
          <div className="row">
            <button className="btn btn-small btn-primary" disabled={busy} onClick={() => answer(invite, "down")}>
              I'm down
            </button>
            <button className="btn btn-small" disabled={busy} onClick={() => answer(invite, "cant")}>
              Can't
            </button>
            <Link className="btn btn-small" to="/">
              Details
            </Link>
          </div>
        </div>
      )}

      {yesGroup.length > 0 && (
        <div className="live-alert live-alert-yes">
          <div className="row">
            <span className="grow small">
              🎉 <strong>{joinNames(yesGroup.map((y) => usersById[y.uid]?.name || "Someone"))}</strong>{" "}
              {yesGroup.length === 1 ? "is" : "are"} down!
              {yesGroup[0].inv.itemId ? " Time to eat." : " Pick a dish together."}
            </span>
          </div>
          <div className="row">
            <Link
              className="btn btn-small btn-primary"
              to={`/meal/${yesGroup[0].inv.id}`}
              onClick={() => markSeen(yesGroup.map((y) => `${y.inv.id}:${y.uid}`))}
            >
              {yesGroup[0].inv.itemId ? "Open plan" : "Pick a dish"}
            </Link>
            <button className="btn btn-small" onClick={() => markSeen(yesGroup.map((y) => `${y.inv.id}:${y.uid}`))}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
