import "../styles/friendsExplore.css";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { arr, canSeeInvite, isLive, joinNames, sharedTags, useNow } from "../lib/helpers";
import DishThumb from "../components/DishThumb";
import InviteCard from "../components/InviteCard";
import ReviewCard from "../components/ReviewCard";
import SendToFriendSheet from "../components/SendToFriendSheet";

const SORT_OPTIONS = [
  ["forYou", "Suggested for you"],
  ["popular", "Most activity"],
  ["recent", "Recently reviewed"],
  ["alphabetical", "Name A–Z"],
];

// Browsing is item-first. Users can discover every campus dish without selecting a dining hall.
export default function Explore() {
  const { me, items, itemsById, reviews, invites, usersById } = useData();
  const now = useNow();
  const [view, setView] = useState("feed");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [hall, setHall] = useState("All");
  const [flavor, setFlavor] = useState("All");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [myTaste, setMyTaste] = useState(false);
  const [reviewedOnly, setReviewedOnly] = useState(false);
  const [sort, setSort] = useState("forYou");

  const friendIds = arr(me.friends);
  // Following is distinct from friendship, but both can inform the activity feed.
  const circleIds = [...new Set([...friendIds, ...arr(me.following)])].filter((id) => id !== me.id);
  const categories = ["All", ...new Set(items.map((i) => i.category).filter(Boolean))];
  const halls = ["All", ...new Set(items.map((i) => i.diningHall).filter(Boolean))];
  const flavors = ["All", ...new Set(items.flatMap((i) => arr(i.tags)))].sort((a, b) =>
    a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)
  );

  const itemReviews = reviews.reduce((out, review) => {
    (out[review.itemId] ||= []).push(review);
    return out;
  }, {});
  const friendFans = (item) =>
    friendIds.map((id) => usersById[id]).filter((u) => u && arr(u.favorites).includes(item.id));
  const circleTouched = (review) =>
    arr(review.authorIds).some((id) => circleIds.includes(id)) ||
    arr(review.upvotes).some((id) => circleIds.includes(id));
  const reviewedByCircle = (item) => arr(itemReviews[item.id]).some(circleTouched);
  const friendSignal = (item) => friendFans(item).length + (reviewedByCircle(item) ? 1 : 0);
  const newestReview = (item) => Math.max(0, ...arr(itemReviews[item.id]).map((r) => r.createdAt || 0));
  const score = (item) => friendFans(item).length * 3 + sharedTags(item, me).length * 2;

  function matchesItem(item) {
    const q = query.trim().toLowerCase();
    const haystack = [item.name, item.category, item.diningHall, item.description, ...arr(item.tags)]
      .filter(Boolean).join(" ").toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (category !== "All" && item.category !== category) return false;
    if (hall !== "All" && item.diningHall !== hall) return false;
    if (flavor !== "All" && !arr(item.tags).includes(flavor)) return false;
    if (myTaste && !sharedTags(item, me).length) return false;
    if (friendsOnly && !friendSignal(item)) return false;
    if (reviewedOnly && !arr(itemReviews[item.id]).length) return false;
    return true;
  }

  const shownItems = items.filter(matchesItem).sort((a, b) => {
    if (sort === "alphabetical") return (a.name || "").localeCompare(b.name || "");
    if (sort === "popular") return arr(itemReviews[b.id]).length - arr(itemReviews[a.id]).length ||
      (a.name || "").localeCompare(b.name || "");
    if (sort === "recent") return newestReview(b) - newestReview(a) ||
      (a.name || "").localeCompare(b.name || "");
    return score(b) - score(a) || (a.name || "").localeCompare(b.name || "");
  });

  const shownReviews = reviews
    .filter((r) => itemsById[r.itemId] && matchesItem(itemsById[r.itemId]) &&
      (!friendsOnly || circleTouched(r)))
    .sort((a, b) => {
      if (sort === "popular") return arr(b.upvotes).length - arr(a.upvotes).length ||
        (b.createdAt || 0) - (a.createdAt || 0);
      if (sort === "alphabetical") return (itemsById[a.itemId]?.name || "").localeCompare(itemsById[b.itemId]?.name || "") ||
        (b.createdAt || 0) - (a.createdAt || 0);
      if (sort === "forYou") return Number(circleTouched(b)) - Number(circleTouched(a)) ||
        (b.createdAt || 0) - (a.createdAt || 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  const openTables = invites.filter(
    (inv) =>
      isLive(inv, now) &&
      inv.visibility !== "friends" &&
      inv.fromId !== me.id &&
      !arr(inv.toIds).includes(me.id) &&
      canSeeInvite(inv, me)
  );
  const suggestions = items
    .filter((item) => !arr(me.favorites).includes(item.id))
    .map((item) => ({ item, fans: friendFans(item), matches: sharedTags(item, me) }))
    .sort((a, b) =>
      (b.fans.length * 3 + b.matches.length * 2) - (a.fans.length * 3 + a.matches.length * 2) ||
      arr(itemReviews[b.item.id]).length - arr(itemReviews[a.item.id]).length ||
      (a.item.name || "").localeCompare(b.item.name || "")
    )
    .slice(0, 5);
  const personalizedSuggestions = suggestions.some(({ fans, matches }) => fans.length || matches.length);

  const hasFilters = Boolean(query.trim()) || category !== "All" || hall !== "All" ||
    flavor !== "All" || friendsOnly || myTaste || reviewedOnly;

  function clearFilters() {
    setQuery("");
    setCategory("All");
    setHall("All");
    setFlavor("All");
    setFriendsOnly(false);
    setMyTaste(false);
    setReviewedOnly(false);
  }

  return (
    <div className="stack">
      <h1>Explore</h1>
      <input
        type="search"
        aria-label="Search campus food and drinks"
        placeholder="Search tacos, cake, drinks, spicy…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chips scroll" aria-label="Browse by food category">
        {categories.map((c) => (
          <button type="button" key={c} className={`chip ${category === c ? "chip-on" : ""}`}
            aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      <details className="card explore-filters">
        <summary>More filters {hasFilters ? "• Active" : ""}</summary>
        <div className="stack explore-filter-body">
          <div className="explore-filter-selects">
            <label className="small">Dining location
              <select value={hall} onChange={(e) => setHall(e.target.value)}>
                {halls.map((h) => <option key={h} value={h}>{h === "All" ? "All campus locations" : h}</option>)}
              </select>
            </label>
            <label className="small">Taste or dietary tag
              <select value={flavor} onChange={(e) => setFlavor(e.target.value)}>
                {flavors.map((f) => <option key={f} value={f}>{f === "All" ? "Any preference" : f}</option>)}
              </select>
            </label>
          </div>
          <label className="check"><input type="checkbox" checked={friendsOnly}
            onChange={(e) => setFriendsOnly(e.target.checked)} /> Friends &amp; following activity</label>
          <label className="check"><input type="checkbox" checked={myTaste}
            onChange={(e) => setMyTaste(e.target.checked)} /> Matches my taste</label>
          <label className="check"><input type="checkbox" checked={reviewedOnly}
            onChange={(e) => setReviewedOnly(e.target.checked)} /> Has student reviews</label>
          {hasFilters && <button className="btn btn-small" onClick={clearFilters}>Clear all filters</button>}
        </div>
      </details>

      {!hasFilters && openTables.length > 0 && (
        <section className="stack">
          <h2>Open tables</h2>
          {openTables.map((inv) => (
            <InviteCard key={inv.id} invite={inv} now={now} mode="open" />
          ))}
        </section>
      )}

      {!hasFilters && suggestions.length > 0 && (
        <section className="stack">
          <div className="row between">
            <h2>Suggested meals</h2>
            <span className="muted small">{personalizedSuggestions ? "Based on friends + taste" : "Explore popular campus dishes"}</span>
          </div>
          <div className="explore-reel" aria-label="Suggested meals, scroll horizontally">
            {suggestions.map(({ item, fans, matches }) => (
              <DishCard key={item.id} item={item} fans={fans} matches={matches}
                reviewCount={arr(itemReviews[item.id]).length} compact />
            ))}
          </div>
        </section>
      )}

      <div className="row between wrap explore-results-heading">
        <div className="tabs" role="tablist" aria-label="Explore results type">
          <button role="tab" aria-selected={view === "dishes"}
            className={`chip ${view === "dishes" ? "chip-on" : ""}`} onClick={() => setView("dishes")}>
            All food ({shownItems.length})
          </button>
          <button role="tab" aria-selected={view === "feed"}
            className={`chip ${view === "feed" ? "chip-on" : ""}`} onClick={() => setView("feed")}>
            Reviews ({shownReviews.length})
          </button>
        </div>
        <select className="inline" aria-label="Sort results" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {view === "dishes" && (
        shownItems.length ? (
          <div className="dish-grid" role="tabpanel">
            {shownItems.map((item) => (
              <DishCard key={item.id} item={item} fans={friendFans(item)} matches={sharedTags(item, me)}
                reviewCount={arr(itemReviews[item.id]).length} />
            ))}
          </div>
        ) : (
          <div className="card stack empty"><p>No food matches those filters.</p>
            <button className="btn" onClick={clearFilters}>Show all food</button></div>
        )
      )}

      {view === "feed" && (
        shownReviews.length ? <div className="stack" role="tabpanel">{shownReviews.map((r) =>
          <ReviewCard key={r.id} review={r} now={now} />)}</div> :
          <div className="card stack empty"><p>No student reviews match those filters yet.</p>
            <button className="btn" onClick={clearFilters}>Clear filters</button></div>
      )}
    </div>
  );
}

function DishCard({ item, fans, matches, reviewCount, compact = false }) {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <div className={`card dish-card ${compact ? "dish-reel-card" : ""}`}>
      <Link to={`/items/${item.id}`} className="dish-card-link">
        <DishThumb item={item} wide />
        <strong>{item.name}</strong>
        <span className="muted small">{item.diningHall}</span>
        <span className="muted small">{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
        {fans.length > 0 && <span className="signal">♥ {joinNames(fans.map((f) => f.name))} saved this</span>}
        {matches.length > 0 && <span className="muted small">Your taste: {matches.join(", ")}</span>}
      </Link>
      <button className="btn btn-small" onClick={() => setShareOpen(true)}>Send to a friend</button>
      {shareOpen && <SendToFriendSheet item={item} onClose={() => setShareOpen(false)} onSent={(threadId) => { navigate(`/messages/${threadId}`); }} />}
    </div>
  );
}
