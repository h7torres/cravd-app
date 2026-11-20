import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { toggleFavorite } from "../lib/actions";
import { allergyConflicts, arr, joinNames, sharedTags, useNow } from "../lib/helpers";
import Avatar from "../components/Avatar";
import DishThumb from "../components/DishThumb";
import ReviewCard from "../components/ReviewCard";
import SendToFriendSheet from "../components/SendToFriendSheet";

export default function ItemDetail() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const { me, users, usersById, itemsById, reviews } = useData();
  const now = useNow();

  const item = itemsById[itemId];
  if (!item) {
    return (
      <div className="stack">
        <h1>Dish not found</h1>
        <Link to="/explore">Back to Explore</Link>
      </div>
    );
  }

  const isFav = arr(me.favorites).includes(item.id);
  // The count is public, but names are only shown for friends
  const fanCount = users.filter((u) => arr(u.favorites).includes(item.id)).length;
  const conflicts = allergyConflicts(item, me);
  const friends = arr(me.friends).map((id) => usersById[id]).filter(Boolean);
  const friendFans = friends.filter((f) => arr(f.favorites).includes(item.id));
  const tasteFriends = friends
    .filter((f) => !friendFans.includes(f))
    .map((f) => ({ f, tags: sharedTags(item, f) }))
    .filter((x) => x.tags.length > 0);
  const myMatches = sharedTags(item, me);
  const itemReviews = reviews.filter((r) => r.itemId === item.id).sort((a, b) => b.createdAt - a.createdAt);

  const inviteHref = `/invite/new?item=${item.id}${
    friendFans.length ? `&to=${friendFans.map((f) => f.id).join(",")}` : ""
  }`;

  return (
    <div className="stack">
      {shareOpen && <SendToFriendSheet item={item} onClose={() => setShareOpen(false)} onSent={(threadId) => navigate(`/messages/${threadId}`)} />}
      <DishThumb item={item} wide />
      {item.photoURL && item.photoCredit && (
        <a className="photo-credit" href={item.sourceUrl || "https://tritontaste.com"} target="_blank" rel="noreferrer">
          Photo: {item.photoCredit}
        </a>
      )}
      <div>
        <h1 style={{ marginBottom: 2 }}>{item.name}</h1>
        <p className="muted">
          {item.diningHall} · {item.category}
        </p>
      </div>
      {item.description && <p>{item.description}</p>}

      {conflicts.length > 0 && (
        <p className="card allergy-warn">⚠ Contains {conflicts.join(", ")}, which is on your allergy list.</p>
      )}
      {arr(item.allergens).length > 0 && (
        <p className="muted small">Contains: {arr(item.allergens).join(", ")}</p>
      )}

      {arr(item.tags).length > 0 && (
        <div className="chips">
          {arr(item.tags).map((t) => (
            <span key={t} className={`chip ${myMatches.includes(t) ? "chip-match" : ""}`}>
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="card stack">
        <div className="row between">
          <span className="small">
            {fanCount} {fanCount === 1 ? "person has" : "people have"} this as a favorite
          </span>
          <button
            className={`btn btn-small ${isFav ? "btn-liked" : ""}`}
            onClick={() => toggleFavorite(me.id, item.id, isFav)}
          >
            {isFav ? "♥ Favorite" : "♡ Favorite"}
          </button>
        </div>

        {friendFans.length > 0 && (
          <div className="row">
            {friendFans.slice(0, 4).map((f) => (
              <Link key={f.id} to={`/profile/${f.id}`}>
                <Avatar user={f} size={28} now={now} />
              </Link>
            ))}
            <span className="signal">
              {joinNames(friendFans.map((f) => f.name))} {friendFans.length === 1 ? "loves" : "love"} this
            </span>
          </div>
        )}

        {tasteFriends.slice(0, 2).map(({ f, tags }) => (
          <p key={f.id} className="muted small">
            Fits {f.name}'s taste: {tags.join(", ")}
          </p>
        ))}

        <button className="btn btn-block" onClick={() => setShareOpen(true)}>Send to a friend</button>
        <Link className="btn btn-primary btn-block" to={inviteHref}>
          {friendFans.length
            ? `Invite ${joinNames(friendFans.map((f) => f.name))} to try this`
            : "Invite someone to try this"}
        </Link>
      </div>

      <section className="stack">
        <h2>Reviews</h2>
        {itemReviews.length > 0 ? (
          itemReviews.map((r) => <ReviewCard key={r.id} review={r} now={now} showDish={false} />)
        ) : (
          <p className="muted">No reviews yet.</p>
        )}
      </section>

      <p className="card muted small">
        Reviews on Cravd are posted by the people who ate together.{" "}
        <Link to={inviteHref}>Invite someone to try this</Link> and post it together afterwards.
      </p>
    </div>
  );
}
