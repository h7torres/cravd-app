import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { acceptFriendRequest, cancelFriendRequest } from "../lib/actions";
import { arr, handleOf, isFree, joinNames, mutualFriends, useNow } from "../lib/helpers";
import Avatar from "../components/Avatar";
import { FollowButton, FriendButton } from "../components/RelationshipButtons";

export default function Friends() {
  const { me, users, usersById, friendRequests } = useData();
  const now = useNow();
  const [query, setQuery] = useState("");

  const friendIds = arr(me.friends);
  const incoming = friendRequests
    .filter((r) => r.toId === me.id)
    .map((r) => ({ r, u: usersById[r.fromId] }))
    .filter((x) => x.u);
  const outgoing = friendRequests
    .filter((r) => r.fromId === me.id)
    .map((r) => ({ r, u: usersById[r.toId] }))
    .filter((x) => x.u);
  const friends = friendIds
    .map((id) => usersById[id])
    .filter(Boolean)
    .sort((a, b) => Number(isFree(b, now)) - Number(isFree(a, now)));
  const following = arr(me.following).map((id) => usersById[id]).filter(Boolean);

  const q = query.trim().toLowerCase();
  const results = q
    ? users.filter((u) => u.id !== me.id && `${u.name || ""} ${handleOf(u)}`.toLowerCase().includes(q))
    : [];

  const suggested = users
    .filter((u) => u.id !== me.id && !friendIds.includes(u.id))
    .map((u) => ({
      u,
      mutuals: mutualFriends(me, u).map((id) => usersById[id]?.name).filter(Boolean),
      taste: arr(u.prefs).filter((p) => arr(me.prefs).includes(p)),
    }))
    .filter((x) => x.mutuals.length || x.taste.length)
    .sort((a, b) => b.mutuals.length - a.mutuals.length || b.taste.length - a.taste.length)
    .slice(0, 8);

  return (
    <div className="stack">
      <h1>Friends</h1>
      <input type="search" placeholder="Search by name or @handle" value={query} onChange={(e) => setQuery(e.target.value)} />

      {q && (
        <section className="card">
          {results.length === 0 && <p className="muted">No one found.</p>}
          {results.map((u) => (
            <UserRow key={u.id} user={u} now={now} sub={`@${handleOf(u)}`}>
              <FriendButton me={me} user={u} />
            </UserRow>
          ))}
        </section>
      )}

      {incoming.length > 0 && (
        <section>
          <h2>Requests</h2>
          <div className="card">
            {incoming.map(({ r, u }) => (
              <UserRow key={r.id} user={u} now={now} sub={mutualLine(me, u, usersById)}>
                <button className="btn btn-small btn-primary" onClick={() => acceptFriendRequest(r)}>
                  Accept
                </button>
                <button className="btn btn-small" onClick={() => cancelFriendRequest(r.id)}>
                  Decline
                </button>
              </UserRow>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Your friends</h2>
        <div className="card">
          {friends.length === 0 && <p className="muted">No friends yet. Try the suggestions below.</p>}
          {friends.map((f) => (
            <UserRow key={f.id} user={f} now={now} sub={isFree(f, now) ? `Free near ${f.status.zone}` : `@${handleOf(f)}`}>
              <Link className="btn btn-small" to={`/invite/new?to=${f.id}`}>
                Invite
              </Link>
            </UserRow>
          ))}
        </div>
      </section>

      {outgoing.length > 0 && (
        <section>
          <h2>Sent requests</h2>
          <div className="card">
            {outgoing.map(({ r, u }) => (
              <UserRow key={r.id} user={u} now={now} sub={`@${handleOf(u)}`}>
                <button className="btn btn-small" onClick={() => cancelFriendRequest(r.id)}>
                  Cancel
                </button>
              </UserRow>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Following</h2>
        <div className="card">
          {following.length === 0 && (
            <p className="muted small">Follow people whose reviews you like. It's not the same as being friends.</p>
          )}
          {following.map((u) => (
            <UserRow key={u.id} user={u} now={now} sub={`@${handleOf(u)}`}>
              <FollowButton me={me} user={u} />
            </UserRow>
          ))}
        </div>
      </section>

      {suggested.length > 0 && (
        <section>
          <h2>Suggested</h2>
          <div className="card">
            {suggested.map(({ u, mutuals, taste }) => (
              <UserRow
                key={u.id}
                user={u}
                now={now}
                sub={[
                  mutuals.length ? `Friends with ${joinNames(mutuals)}` : "",
                  taste.length ? `both like ${taste.slice(0, 2).join(" & ")}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              >
                <FriendButton me={me} user={u} />
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
      <Link to={`/profile/${user.id}`}>
        <Avatar user={user} size={40} now={now} />
      </Link>
      <div className="grow">
        <Link to={`/profile/${user.id}`} className="name">
          {user.name}
        </Link>
        {sub && <div className="muted small">{sub}</div>}
      </div>
      <div className="row">{children}</div>
    </div>
  );
}
