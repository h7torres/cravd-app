import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { addComment, deleteComment, toggleUpvote } from "../lib/actions";
import { arr, joinNames, sharedPrefs, timeAgo } from "../lib/helpers";
import Avatar from "./Avatar";
import DishThumb from "./DishThumb";

function ThumbIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M7 10v11H3.5A1.5 1.5 0 0 1 2 19.5v-8A1.5 1.5 0 0 1 3.5 10H7zm0 0 4.2-7.3a1.9 1.9 0 0 1 3.5 1.3L14 9h5.3a2 2 0 0 1 2 2.4l-1.6 8A2 2 0 0 1 17.7 21H7"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A review is posted like a collab post: everyone who ate together is credited,
// there's one photo, and each person's take is a caption. Like counts are hidden.
export default function ReviewCard({ review, now, showDish = true }) {
  const { me, usersById, itemsById, comments } = useData();
  const [openFor, setOpenFor] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  // Bumped on every like so the thumbs-up pop animation replays
  const [pop, setPop] = useState(0);

  const item = itemsById[review.itemId];
  const authorIds = arr(review.authorIds);
  const authors = authorIds.map((id) => usersById[id]).filter(Boolean);
  const upvotes = arr(review.upvotes);
  const liked = upvotes.includes(me.id);
  const friendIds = arr(me.friends);
  const isFriend = (u) => friendIds.includes(u.id);

  // Friends who liked it (names only, never a count)
  const friendLikers = upvotes
    .filter((id) => friendIds.includes(id) && !authorIds.includes(id))
    .map((id) => usersById[id])
    .filter(Boolean);
  // Friends connected to this post: they liked it or wrote it
  const friendTargets = [
    ...new Map([...friendLikers, ...authors.filter(isFriend)].map((u) => [u.id, u])).values(),
  ];

  const postComments = comments
    .filter((c) => c.reviewId === review.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  const visibleComments = showComments ? postComments : postComments.slice(-2);

  const inviteUrl = (ids) =>
    `/invite/new?item=${review.itemId}${ids.length ? `&to=${ids.join(",")}` : ""}`;

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim() || busy) return;
    setBusy(true);
    try {
      await addComment({ reviewId: review.id, authorId: me.id, text: commentText });
      setCommentText("");
      setShowComments(true);
    } catch (err) {
      console.error(err);
    }
    setBusy(false);
  }

  // Tapping any name opens a small tab with invite / profile options
  function nameButton(user) {
    return (
      <button
        type="button"
        className={`name-button ${openFor === user.id ? "is-open" : ""}`}
        onClick={() => setOpenFor(openFor === user.id ? null : user.id)}
      >
        {user.id === me.id ? "You" : user.name}
      </button>
    );
  }

  const openUser = openFor ? usersById[openFor] : null;

  return (
    <article className="card post">
      <header className="post-head">
        <span className="avatar-stack">
          {authors.slice(0, 2).map((a) => (
            <Avatar key={a.id} user={a} size={32} />
          ))}
        </span>
        <div className="grow">
          <div className="post-names">
            {authors.map((a, i) => (
              <span key={a.id}>
                {i > 0 && (i === authors.length - 1 ? " and " : ", ")}
                {nameButton(a)}
              </span>
            ))}
          </div>
          {showDish && item && (
            <Link to={`/items/${item.id}`} className="muted small post-dish">
              {item.name} · {item.diningHall}
            </Link>
          )}
        </div>
        <span className="muted small">
          {review.demoActivity && <span className="chip demo-tag">Demo post</span>} {timeAgo(review.createdAt, now)}
        </span>
      </header>

      <Link to={`/items/${review.itemId}`} className="post-photo">
        {review.photo ? <img src={review.photo} alt={item?.name || "Meal photo"} /> : <DishThumb item={item} wide />}
      </Link>
      {!review.photo && item?.photoURL && item?.photoCredit && (
        <a className="photo-credit" href={item.sourceUrl || "https://tritontaste.com"} target="_blank" rel="noreferrer">
          Photo: {item.photoCredit}
        </a>
      )}

      <div className="post-actions">
        <button
          type="button"
          className={`icon-button like-button ${liked ? "is-liked" : ""}`}
          aria-label={liked ? "Unlike" : "Like"}
          aria-pressed={liked}
          onClick={() => {
            if (!liked) setPop((n) => n + 1);
            toggleUpvote(review.id, me.id, liked);
          }}
        >
          <span key={pop} className={pop ? "thumb pop" : "thumb"}>
            <ThumbIcon filled={liked} />
          </span>
          <span className="like-label">Like</span>
        </button>
        <button type="button" className="icon-button" aria-label="Comments" onClick={() => setShowComments((v) => !v)}>
          💬
        </button>
        <Link className="icon-button" aria-label="Share: invite someone to try this" to={inviteUrl([])}>
          ↗
        </Link>
        <span className="grow" />
        {friendTargets.length > 0 && (
          <Link className="btn btn-small btn-primary" to={inviteUrl(friendTargets.map((u) => u.id))}>
            Let's try this
          </Link>
        )}
      </div>

      {friendLikers.length > 0 && (
        <p className="small">
          Liked by{" "}
          {friendLikers.map((u, i) => (
            <span key={u.id}>
              {i > 0 && (i === friendLikers.length - 1 ? " and " : ", ")}
              {nameButton(u)}
            </span>
          ))}
        </p>
      )}

      {openUser && (
        <div className="name-pop">
          <div className="row">
            <Avatar user={openUser} size={36} now={now} />
            <span className="grow">
              <strong>{openUser.id === me.id ? "You" : openUser.name}</strong>
              {openUser.id !== me.id && sharedPrefs(me, openUser).length > 0 && (
                <span className="block muted small">You both like {joinNames(sharedPrefs(me, openUser))}</span>
              )}
            </span>
            <button type="button" className="btn btn-small" aria-label="Close" onClick={() => setOpenFor(null)}>
              ✕
            </button>
          </div>
          <div className="row wrap">
            {openUser.id !== me.id && isFriend(openUser) && (
              <Link className="btn btn-small btn-primary" to={inviteUrl([openUser.id])}>
                Invite {openUser.name} to try this
              </Link>
            )}
            <Link className="btn btn-small" to={`/profile/${openUser.id}`}>
              View profile
            </Link>
          </div>
        </div>
      )}

      <div className="post-captions">
        {authors.map((a) => (
          <p key={a.id}>
            {nameButton(a)} {review.parts?.[a.id]}
          </p>
        ))}
      </div>

      <div className="post-comments">
        {postComments.length > 2 && !showComments && (
          <button type="button" className="btn-link" onClick={() => setShowComments(true)}>
            View all {postComments.length} comments
          </button>
        )}
        {visibleComments.map((c) => {
          const author = usersById[c.authorId];
          return (
            <p key={c.id} className="small">
              {author ? nameButton(author) : <strong>Someone</strong>} {c.text}
              {c.authorId === me.id && (
                <button type="button" className="btn-link comment-delete" onClick={() => deleteComment(c.id)}>
                  delete
                </button>
              )}
            </p>
          );
        })}
        <form className="row comment-form" onSubmit={submitComment}>
          <input
            aria-label="Add a comment"
            placeholder="Add a comment…"
            maxLength={500}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button type="submit" className="btn btn-small" disabled={!commentText.trim() || busy}>
            Post
          </button>
        </form>
      </div>
    </article>
  );
}
