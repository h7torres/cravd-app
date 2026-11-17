import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { toggleUpvote } from "../lib/actions";
import { arr, joinNames, sharedTags, timeAgo } from "../lib/helpers";
import Avatar from "./Avatar";
import DishThumb from "./DishThumb";

export default function ReviewCard({ review, now, showDish = true }) {
  const { me, usersById, itemsById } = useData();
  const item = itemsById[review.itemId];
  const authorIds = arr(review.authorIds);
  const authors = authorIds.map((id) => usersById[id]).filter(Boolean);
  const upvotes = arr(review.upvotes);
  const liked = upvotes.includes(me.id);
  const friendIds = arr(me.friends);

  // Social signals: friends who liked or wrote this
  const friendLikers = upvotes
    .filter((id) => friendIds.includes(id) && !authorIds.includes(id))
    .map((id) => usersById[id])
    .filter(Boolean);
  const friendAuthors = authors.filter((a) => friendIds.includes(a.id));
  const inviteTargets = [
    ...new Map([...friendLikers, ...friendAuthors].map((u) => [u.id, u])).values(),
  ];

  const tasteMatch = item
    ? inviteTargets.map((u) => ({ u, tags: sharedTags(item, u) })).find((x) => x.tags.length)
    : null;

  return (
    <article className="card review">
      {showDish && item && (
        <Link to={`/items/${item.id}`} className="review-dish">
          <DishThumb item={item} size={40} />
          <div>
            <strong>{item.name}</strong>
            <div className="muted small">{item.diningHall}</div>
          </div>
        </Link>
      )}

      {friendLikers.length > 0 && (
        <p className="signal">♥ {joinNames(friendLikers.map((u) => u.name))} liked this</p>
      )}
      {tasteMatch && (
        <p className="muted small">
          Fits {tasteMatch.u.name}'s taste: {tasteMatch.tags.join(", ")}
        </p>
      )}

      {review.photo && <img className="review-photo" src={review.photo} alt="" />}

      {authors.length > 1 && (
        <p className="muted small">{joinNames(authors.map((a) => a.name))} ate here together</p>
      )}

      {authors.map((a) => (
        <div key={a.id} className="review-part">
          <Link to={`/profile/${a.id}`}>
            <Avatar user={a} size={28} />
          </Link>
          <div>
            <Link to={`/profile/${a.id}`} className="name">
              {a.name}
            </Link>
            <p>{review.parts?.[a.id]}</p>
          </div>
        </div>
      ))}

      <div className="row between wrap">
        <span className="muted small">{timeAgo(review.createdAt, now)}</span>
        <div className="row">
          {inviteTargets.length > 0 && item && (
            <Link
              className="btn btn-small btn-primary"
              to={`/invite/new?item=${item.id}&to=${inviteTargets.map((u) => u.id).join(",")}`}
            >
              Invite {joinNames(inviteTargets.map((u) => u.name))}
            </Link>
          )}
          <button
            className={`btn btn-small ${liked ? "btn-liked" : ""}`}
            onClick={() => toggleUpvote(review.id, me.id, liked)}
          >
            {liked ? "♥ Liked" : "♡ Like"}
          </button>
        </div>
      </div>
    </article>
  );
}
