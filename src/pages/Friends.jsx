import "../styles/friendsExplore.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { acceptFriendRequest, cancelFriendRequest } from "../lib/actions";
import { arr, handleOf, isFree, joinNames, mutualFriends, sharedPrefs, useNow } from "../lib/helpers";
import Avatar from "../components/Avatar";
import { FollowButton, FriendButton } from "../components/RelationshipButtons";

const nameSort = (a, b) => (a.name || "").localeCompare(b.name || "");

export default function Friends() {
  const { me, users, usersById, friendRequests } = useData();
  const now = useNow();
  const [tab, setTab] = useState("friends");
  const [query, setQuery] = useState("");

  const friendIds = arr(me.friends);
  const followingIds = arr(me.following);
  const incoming = friendRequests
    .filter((r) => r.toId === me.id)
    .map((r) => ({ r, u: usersById[r.fromId] }))
    .filter(({ u }) => u);
  const outgoing = friendRequests
    .filter((r) => r.fromId === me.id)
    .map((r) => ({ r, u: usersById[r.toId] }))
    .filter(({ u }) => u);

  const friends = friendIds
    .map((id) => usersById[id])
    .filter(Boolean)
    .sort((a, b) => Number(isFree(b, now)) - Number(isFree(a, now)) || nameSort(a, b));
  const following = followingIds.map((id) => usersById[id]).filter(Boolean).sort(nameSort);
  const normalized = query.trim().toLowerCase().replace(/^@/, "");
  const findable = users
    .filter((u) => u.id !== me.id && !friendIds.includes(u.id) && !u.demo)
    .sort(nameSort);
  // Search everyone (including existing friends); suggestions only show non-friends
  const searchResults = normalized
    ? users.filter((u) => u.id !== me.id).sort(nameSort).filter((u) => `${u.name || ""} ${handleOf(u)}`.toLowerCase().includes(normalized))
    : [];

  const suggested = findable
    .map((u) => ({
      u,
      mutuals: mutualFriends(me, u).map((id) => usersById[id]?.name).filter(Boolean),
      taste: sharedPrefs(me, u),
    }))
    .sort((a, b) =>
      b.mutuals.length - a.mutuals.length ||
      b.taste.length - a.taste.length ||
      nameSort(a.u, b.u)
    )
    .slice(0, 8);

  return (
    <div className="stack">
      <h1>Friends</h1>
      <p className="muted small">Find the people you want to grab lunch with. Following lets you keep up with their reviews.</p>

      {incoming.length > 0 && (
        <section className="card stack" aria-label="Pending friend requests">
          <div className="row between">
            <h2 style={{ margin: 0 }}>Friend requests</h2>
            <span className="chip chip-match">{incoming.length} new</span>
          </div>
          {incoming.map(({ r, u }) => (
            <UserRow key={r.id} user={u} now={now} sub={mutualLine(me, u, usersById)}>
              <button className="btn btn-small btn-primary" onClick={() => acceptFriendRequest(r)}>Accept</button>
              <button className="btn btn-small" onClick={() => cancelFriendRequest(r.id)}>Decline</button>
            </UserRow>
          ))}
        </section>
      )}

      <div className="tabs friends-tabs" role="tablist" aria-label="People sections">
        {[
          ["friends", `Friends (${friends.length})`],
          ["following", `Following (${following.length})`],
          ["discover", "Add / Suggested"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`chip ${tab === id ? "chip-on" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        <section className="stack" role="tabpanel">
          <h2>Your friends</h2>
          <div className="card">
            {friends.length === 0 && (
              <div className="stack">
                <p className="muted small">You haven't added friends yet. Find classmates who share your food preferences.</p>
                <button className="btn btn-primary" onClick={() => setTab("discover")}>Find friends</button>
              </div>
            )}
            {friends.map((f) => (
              <UserRow
                key={f.id}
                user={f}
                now={now}
                sub={isFree(f, now) ? `Free near ${f.status.zone}` : sharedPrefs(me, f).length ? `You both like ${sharedPrefs(me, f).slice(0, 3).join(", ")}` : `@${handleOf(f)}`}
              >
                <Link className="btn btn-small" to={`/invite/new?to=${f.id}`}>Invite</Link>
              </UserRow>
            ))}
          </div>
        </section>
      )}

      {tab === "following" && (
        <section className="stack" role="tabpanel">
          <h2>Following</h2>
          <p className="muted small">Follow classmates to keep up with their food reviews, even when you aren't friends.</p>
          <div className="card">
            {following.length === 0 && (
              <div className="stack">
                <p className="muted small">You aren't following anyone yet.</p>
                <button className="btn" onClick={() => setTab("discover")}>Find people to follow</button>
              </div>
            )}
            {following.map((u) => (
              <UserRow key={u.id} user={u} now={now} sub={`@${handleOf(u)}`}>
                {!friendIds.includes(u.id) && <FriendButton me={me} user={u} />}
                <FollowButton me={me} user={u} />
              </UserRow>
            ))}
          </div>
        </section>
      )}

      {tab === "discover" && (
        <section className="stack" role="tabpanel">
          <h2>Add friends and follow people</h2>
          <input
            type="search"
            aria-label="Search classmates by name or handle"
            placeholder="Search by name or @handle"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {outgoing.length > 0 && !normalized && (
            <section className="card stack">
              <strong>Requests you've sent</strong>
              {outgoing.map(({ r, u }) => (
                <UserRow key={r.id} user={u} now={now} sub="Waiting for a response">
                  <button className="btn btn-small" onClick={() => cancelFriendRequest(r.id)}>Cancel</button>
                </UserRow>
              ))}
            </section>
          )}

          <h2>{normalized ? `Search results (${searchResults.length})` : "Suggested classmates"}</h2>
          <div className="card">
            {normalized && searchResults.length === 0 && <p className="muted small">No classmates match that search.</p>}
            {!normalized && suggested.length === 0 && <p className="muted small">No suggestions available yet.</p>}
            {(normalized ? searchResults.map((u) => ({ u, mutuals: [], taste: [] })) : suggested).map(({ u, mutuals, taste }) => (
              <UserRow
                key={u.id}
                user={u}
                now={now}
                sub={[
                  mutuals.length ? `Friends with ${joinNames(mutuals)}` : "",
                  taste.length ? `Both like ${taste.slice(0, 2).join(" & ")}` : "",
                ].filter(Boolean).join(" · ") || `@${handleOf(u)}`}
              >
                <FriendButton me={me} user={u} />
                <FollowButton me={me} user={u} />
              </UserRow>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function mutualLine(me, user, usersById) {
  const names = mutualFriends(me, user).map((id) => usersById[id]?.name).filter(Boolean);
  return names.length ? `Friends with ${joinNames(names)}` : `@${handleOf(user)}`;
}

function UserRow({ user, now, sub, children }) {
  return (
    <div className="user-row">
      <Link to={`/profile/${user.id}`} aria-label={`View ${user.name}'s profile`}>
        <Avatar user={user} size={40} now={now} />
      </Link>
      <div className="grow">
        <Link to={`/profile/${user.id}`} className="name">{user.name}</Link>
        {sub && <div className="muted small">{sub}</div>}
      </div>
      <div className="row relationship-actions">{children}</div>
    </div>
  );
}
