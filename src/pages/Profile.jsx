import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useUser } from "../context/UserContext";
import { removeFriend, updateProfile } from "../lib/actions";
import { threadIdFor } from "../lib/messages";
import {
  arr,
  clockTime,
  compressImage,
  handleOf,
  isFree,
  joinNames,
  mutualFriends,
  participants,
  PREFS,
  timeAgo,
  useNow,
} from "../lib/helpers";
import Avatar from "../components/Avatar";
import DishThumb from "../components/DishThumb";
import ReviewCard from "../components/ReviewCard";
import { FollowButton, FriendButton } from "../components/RelationshipButtons";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function Profile() {
  const { userId } = useParams();
  const { me, usersById, reviews, invites, itemsById } = useData();
  const { logout } = useUser();
  const navigate = useNavigate();
  const now = useNow();
  const [editing, setEditing] = useState(false);

  const user = usersById[userId];
  if (!user) {
    return (
      <div className="stack">
        <h1>User not found</h1>
        <Link to="/friends">Find people</Link>
      </div>
    );
  }

  if (editing) return <EditProfile me={me} onDone={() => setEditing(false)} />;

  const isMe = user.id === me.id;
  const isFriend = arr(me.friends).includes(user.id);
  const showPrivate = isMe || isFriend;

  const userReviews = reviews
    .filter((r) => arr(r.authorIds).includes(user.id))
    .sort((a, b) => b.createdAt - a.createdAt);
  const mutuals = isMe ? [] : mutualFriends(me, user).map((id) => usersById[id]).filter(Boolean);
  // Names of friends who follow them, never a follower count
  const followedBy = isMe
    ? []
    : arr(me.friends)
        .filter((fid) => arr(usersById[fid]?.following).includes(user.id))
        .map((id) => usersById[id])
        .filter(Boolean);
  const meals = invites
    .filter((inv) => (inv.status === "eating" || inv.status === "done") && participants(inv).includes(user.id))
    .sort((a, b) => (b.doneAt || b.ateAt || 0) - (a.doneAt || a.ateAt || 0));
  const together = isMe ? [] : meals.filter((inv) => participants(inv).includes(me.id));
  const favorites = arr(user.favorites).map((id) => itemsById[id]).filter(Boolean);
  const since = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString([], { month: "short", year: "numeric" })
    : null;
  const sharedPrefs = isMe ? [] : arr(user.prefs).filter((p) => arr(me.prefs).includes(p));

  return (
    <div className="stack">
      <div className="hero">
        <Avatar user={user} size={88} now={showPrivate ? now : undefined} />
        <h1>{user.name}</h1>
        <p className="muted">@{handleOf(user)}</p>
        {user.bio && <p>{user.bio}</p>}
        <p className="muted small">
          {[since && `On Cravd since ${since}`, plural(userReviews.length, "review"), plural(meals.length, "shared meal")]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {arr(user.prefs).length > 0 && (
          <div className="chips" style={{ justifyContent: "center" }}>
            {arr(user.prefs).map((p) => (
              <span key={p} className={`chip ${sharedPrefs.includes(p) ? "chip-match" : ""}`}>
                {p}
              </span>
            ))}
          </div>
        )}

        {!isMe && (
          <div className="row">
            <FriendButton me={me} user={user} />
            <FollowButton me={me} user={user} />
          </div>
        )}
        {mutuals.length > 0 && (
          <p className="small muted">
            {joinNames(mutuals.map((u) => u.name))} {mutuals.length === 1 ? "is a mutual friend" : "are mutual friends"}
          </p>
        )}
        {followedBy.length > 0 && <p className="small muted">Followed by {joinNames(followedBy.map((u) => u.name))}</p>}
      </div>

      {isFriend && (
        <div className="card stack">
          {isFree(user, now) ? (
            <span className="chip chip-free">
              Free near {user.status.zone} until {clockTime(user.status.until)}
            </span>
          ) : (
            <span className="muted small">Not marked as free right now</span>
          )}
          {together.length > 0 && <p className="small">You've eaten together {plural(together.length, "time")}.</p>}
          <div className="row wrap">
            <Link className="btn" to={`/messages/${threadIdFor(me.id, user.id)}`}>Message</Link>
            <Link className="btn btn-primary" to={`/invite/new?to=${user.id}`}>
              Invite {user.name}
            </Link>
            <Link className="btn" to={`/blend?with=${user.id}`}>
              Blend tastes
            </Link>
          </div>
        </div>
      )}

      {!isMe && !isFriend && (
        <p className="card small muted">
          Add {user.name} as a friend to see their favorites, when they're free, and to invite them to eat.
        </p>
      )}

      {isMe && (
        <div className="row wrap">
          <button className="btn" onClick={() => setEditing(true)}>
            Edit profile
          </button>
          <button
            className="btn"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Switch user
          </button>
        </div>
      )}

      {showPrivate && (
        <section className="stack">
          <h2>Favorites</h2>
          {favorites.length === 0 && <p className="muted small">No favorites yet.</p>}
          {favorites.map((item) => (
            <Link key={item.id} to={`/items/${item.id}`} className="card row plan-card">
              <DishThumb item={item} size={40} />
              <span className="grow">
                <strong>{item.name}</strong>
                <span className="block muted small">{item.diningHall}</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      {isMe && meals.length > 0 && (
        <section className="stack">
          <h2>Meals</h2>
          <div className="card stack">
            {meals.map((inv) => {
              const others = participants(inv)
                .filter((id) => id !== me.id)
                .map((id) => usersById[id]?.name)
                .filter(Boolean);
              const item = itemsById[inv.itemId];
              return (
                <Link key={inv.id} to={`/meal/${inv.id}`} className="row plan-card">
                  <DishThumb item={item} size={32} />
                  <span className="grow small">
                    With <strong>{joinNames(others)}</strong>
                    {item ? ` · ${item.name}` : ""}
                  </span>
                  <span className="muted small">{timeAgo(inv.doneAt || inv.ateAt || inv.meetAt, now)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="stack">
        <h2>Reviews</h2>
        {userReviews.length > 0 ? (
          userReviews.map((r) => <ReviewCard key={r.id} review={r} now={now} />)
        ) : (
          <p className="muted small">No reviews yet.</p>
        )}
      </section>

      {isFriend && (
        <button className="btn-link" onClick={() => removeFriend(me.id, user.id)}>
          Remove friend
        </button>
      )}
    </div>
  );
}

function EditProfile({ me, onDone }) {
  const [name, setName] = useState(me.name || "");
  const [handle, setHandle] = useState(me.handle || "");
  const [bio, setBio] = useState(me.bio || "");
  const [prefs, setPrefs] = useState(arr(me.prefs));
  const [photoURL, setPhotoURL] = useState(me.photoURL || "");
  const [saving, setSaving] = useState(false);

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (file) setPhotoURL(await compressImage(file, 256, 0.8));
  }

  function togglePref(p) {
    setPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function save() {
    setSaving(true);
    await updateProfile(me.id, {
      name: name.trim() || me.name,
      handle: handle.trim().replace(/^@/, ""),
      bio: bio.trim(),
      prefs,
      photoURL,
    });
    onDone();
  }

  return (
    <div className="stack">
      <h1>Edit profile</h1>
      <div className="hero">
        <Avatar user={{ ...me, photoURL }} size={88} />
        <label className="btn btn-small">
          Change photo
          <input type="file" accept="image/*" hidden onChange={handlePhoto} />
        </label>
      </div>
      <label className="stack small">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="stack small">
        Handle
        <input value={handle} placeholder="yourname" onChange={(e) => setHandle(e.target.value)} />
      </label>
      <label className="stack small">
        Bio
        <textarea value={bio} maxLength={140} onChange={(e) => setBio(e.target.value)} />
      </label>
      <div className="stack small">
        Food preferences
        <div className="chips">
          {PREFS.map((p) => (
            <button key={p} className={`chip ${prefs.includes(p) ? "chip-on" : ""}`} onClick={() => togglePref(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <button className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
