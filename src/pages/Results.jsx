import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useData } from "../context/DataContext";
import { arr, downIds, MIN, toLocalInput } from "../lib/helpers";

const SOURCE_LABELS = {
  active: "Active now (ticked friends)",
  invite_all: "Invite all friends",
  taste: "Similar taste",
  friend_feed: "Friend feed post",
  explore: "Explore post",
  dish_page: "Dish page",
  profile_post: "Post on a profile",
  profile: "Profile invite button",
  friends: "Friends page",
  blend: "Blend",
  share_sheet: "Send to a friend (messages)",
  invite_tab: "+ Invite tab",
  other: "Other",
};

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function fmtDuration(ms) {
  if (ms == null) return "–";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "–");

// Numbers for the P3 evaluation and the P4 write-up. Only counts real activity:
// invites sent from the app (they carry a `source`), not seeded sample data.
export default function Results() {
  const { invites, reviews, comments, usersById, ready } = useData();
  const [events, setEvents] = useState([]);
  // Only count activity after this time, so rehearsals don't mix into the real demo
  const [since, setSince] = useState(() => {
    try {
      return localStorage.getItem("cravdResultsSince") || "";
    } catch {
      return "";
    }
  });
  const sinceMs = since ? new Date(since).getTime() : 0;

  function changeSince(value) {
    setSince(value);
    try {
      localStorage.setItem("cravdResultsSince", value);
    } catch {
      // ignore storage errors
    }
  }

  useEffect(
    () =>
      onSnapshot(collection(db, "events"), (snap) =>
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    []
  );

  const isClassmate = (id) => usersById[id] && !usersById[id].demo;
  const sent = invites.filter((inv) => inv.source && !inv.demoActivity && inv.createdAt >= sinceMs);
  const accepted = sent.filter((inv) => downIds(inv).length > 0);
  const dishPicked = accepted.filter((inv) => inv.itemId);
  const posted = sent.filter((inv) => inv.reviewId);

  // By path into the invite
  const bySource = Object.entries(
    sent.reduce((acc, inv) => {
      const k = inv.source;
      acc[k] = acc[k] || { sent: 0, accepted: 0 };
      acc[k].sent += 1;
      if (downIds(inv).length) acc[k].accepted += 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1].sent - a[1].sent);

  // Group vs individual vs one-to-one
  const byMode = sent.reduce((acc, inv) => {
    acc[inv.mode || "single"] = (acc[inv.mode || "single"] || 0) + 1;
    return acc;
  }, {});

  // How long people took to answer
  const responseTimes = sent.flatMap((inv) =>
    Object.values(inv.respondedAt || {}).map((t) => t - inv.createdAt).filter((d) => d >= 0)
  );

  // Time from opening the app to sending an invite (same person, within 30 min)
  const opens = events.filter((e) => e.type === "app_open" && e.at >= sinceMs);
  const openToInvite = sent
    .map((inv) => {
      const last = opens
        .filter((e) => e.userId === inv.fromId && e.at <= inv.createdAt && inv.createdAt - e.at <= 30 * MIN)
        .sort((a, b) => b.at - a.at)[0];
      return last ? inv.createdAt - last.at : null;
    })
    .filter((d) => d != null);

  // Time from yes to a locked-in dish (for "want to eat?" invites)
  const pickTimes = dishPicked
    .filter((inv) => inv.dishPickedAt)
    .map((inv) => inv.dishPickedAt - Math.min(...Object.values(inv.respondedAt || { x: inv.dishPickedAt })))
    .filter((d) => d >= 0);

  const classmateLikes = reviews.reduce((n, r) => n + arr(r.upvotes).filter(isClassmate).length, 0);
  const classmateComments = comments.filter((c) => isClassmate(c.authorId) && c.createdAt >= sinceMs).length;
  const activePeople = new Set([...opens.map((e) => e.userId), ...sent.map((i) => i.fromId)].filter(isClassmate));

  function downloadCsv() {
    const rows = [
      ["inviteId", "from", "to", "source", "mode", "urgency", "hadDishAtSend", "createdAt", "accepted", "dishPicked", "posted"],
      ...sent.map((inv) => [
        inv.id,
        usersById[inv.fromId]?.name || inv.fromId,
        arr(inv.toIds).map((id) => usersById[id]?.name || id).join(" / "),
        inv.source,
        inv.mode || "single",
        inv.urgency,
        inv.dishPickedAt ? "no" : inv.itemId ? "yes" : "no",
        new Date(inv.createdAt).toISOString(),
        downIds(inv).length > 0 ? "yes" : "no",
        inv.itemId ? "yes" : "no",
        inv.reviewId ? "yes" : "no",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "cravd-invites.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="app-shell">
      <main className="page stack">
        <div className="row between">
          <h1 style={{ margin: 0 }}>Demo results</h1>
          <Link className="btn btn-small" to="/">
            Back
          </Link>
        </div>
        <p className="muted small">
          Live numbers from the demo. Only invites sent in the app count, not the sample data.
        </p>
        <div className="card stack small">
          <label className="stack small">
            Only count activity since
            <input type="datetime-local" step={900} value={since} onChange={(e) => changeSince(e.target.value)} />
          </label>
          <div className="row wrap">
            <button className="btn btn-small" onClick={() => changeSince(toLocalInput(Date.now()))}>
              Start counting now
            </button>
            {since && (
              <button className="btn btn-small" onClick={() => changeSince("")}>
                Count everything
              </button>
            )}
          </div>
          <span className="muted">Likes are counted for all time, since they don't have a timestamp.</span>
        </div>
        {!ready && <p className="muted">Loading…</p>}

        <div className="stat-grid">
          <Stat label="People active" value={activePeople.size} />
          <Stat label="Invites sent" value={sent.length} />
          <Stat label="Got a yes" value={`${accepted.length} (${pct(accepted.length, sent.length)})`} />
          <Stat label="Posted together" value={`${posted.length} (${pct(posted.length, accepted.length)})`} />
          <Stat label="Open app → invite (median)" value={fmtDuration(median(openToInvite))} />
          <Stat label="Time to answer (median)" value={fmtDuration(median(responseTimes))} />
          <Stat label="Yes → dish picked (median)" value={fmtDuration(median(pickTimes))} />
          <Stat label="Likes · comments" value={`${classmateLikes} · ${classmateComments}`} />
        </div>

        <section className="stack">
          <h2>Funnel</h2>
          <div className="card stack small">
            <FunnelRow label="Invites sent" n={sent.length} of={sent.length} />
            <FunnelRow label="Someone said yes" n={accepted.length} of={sent.length} />
            <FunnelRow label="Dish locked in" n={dishPicked.length} of={sent.length} />
            <FunnelRow label="Posted together" n={posted.length} of={sent.length} />
          </div>
        </section>

        <section className="stack">
          <h2>Which path led to the invite</h2>
          <div className="card">
            {bySource.length === 0 && <p className="muted small">No invites yet.</p>}
            {bySource.map(([src, s]) => (
              <div key={src} className="user-row small">
                <span className="grow">{SOURCE_LABELS[src] || src}</span>
                <span>
                  <strong>{s.sent}</strong> sent · {pct(s.accepted, s.sent)} got a yes
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="stack">
          <h2>How people invited</h2>
          <div className="card small">
            <p>One friend: {byMode.single || 0}</p>
            <p>Group invite: {byMode.group || 0}</p>
            <p>Individual invites (sent separately): {byMode.individual || 0}</p>
          </div>
        </section>

        <div>
          <button className="btn" disabled={!sent.length} onClick={downloadCsv}>
            Download invites as CSV
          </button>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card stat">
      <span className="stat-value">{value}</span>
      <span className="muted small">{label}</span>
    </div>
  );
}

function FunnelRow({ label, n, of }) {
  const w = of ? Math.round((n / of) * 100) : 0;
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="row between">
        <span>{label}</span>
        <strong>
          {n} {of ? `(${w}%)` : ""}
        </strong>
      </div>
      <div className="funnel-bar">
        <span style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}
