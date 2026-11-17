import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { arr, canSeeInvite, isLive, joinNames, sharedTags, useNow } from "../lib/helpers";
import DishThumb from "../components/DishThumb";
import InviteCard from "../components/InviteCard";
import ReviewCard from "../components/ReviewCard";

// The slow lane: public reviews with friend signals, dishes, search, filters, open tables.
export default function Explore() {
  const { me, items, itemsById, reviews, invites, usersById } = useData();
  const now = useNow();
  const [view, setView] = useState("feed");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [hall, setHall] = useState("All");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [myTaste, setMyTaste] = useState(false);

  const friendIds = arr(me.friends);
  const categories = ["All", ...new Set(items.map((i) => i.category).filter(Boolean))];
  const halls = ["All", ...new Set(items.map((i) => i.diningHall).filter(Boolean))];

  const friendFans = (item) =>
    friendIds.map((id) => usersById[id]).filter((u) => u && arr(u.favorites).includes(item.id));

  function matchesItem(item) {
    const q = query.trim().toLowerCase();
    const haystack = [item.name, item.category, item.diningHall, ...arr(item.tags)].join(" ").toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (category !== "All" && item.category !== category) return false;
    if (hall !== "All" && item.diningHall !== hall) return false;
    if (myTaste && sharedTags(item, me).length === 0) return false;
    return true;
  }

  const friendTouched = (r) =>
    arr(r.authorIds).some((id) => friendIds.includes(id)) ||
    arr(r.upvotes).some((id) => friendIds.includes(id));

  const shownReviews = reviews
    .filter((r) => {
      const item = itemsById[r.itemId];
      return item && matchesItem(item) && (!friendsOnly || friendTouched(r));
    })
    .sort((a, b) => Number(friendTouched(b)) - Number(friendTouched(a)) || b.createdAt - a.createdAt);

  const shownItems = items
    .filter((i) => matchesItem(i) && (!friendsOnly || friendFans(i).length > 0))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const openTables = invites.filter(
    (inv) =>
      isLive(inv, now) &&
      inv.visibility !== "friends" &&
      inv.fromId !== me.id &&
      !arr(inv.toIds).includes(me.id) &&
      canSeeInvite(inv, me)
  );

  const suggestions = items
    .filter((i) => !arr(me.favorites).includes(i.id))
    .map((i) => ({ i, score: sharedTags(i, me).length * 2 + friendFans(i).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const browsing = !query && category === "All" && hall === "All";

  return (
    <div className="stack">
      <h1>Explore</h1>

      <input
        type="search"
        placeholder="Search dishes, halls, or tags like spicy"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="chips scroll">
        {categories.map((c) => (
          <button key={c} className={`chip ${category === c ? "chip-on" : ""}`} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="row wrap">
        <select className="inline" value={hall} onChange={(e) => setHall(e.target.value)}>
          {halls.map((h) => (
            <option key={h} value={h}>
              {h === "All" ? "All dining halls" : h}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={friendsOnly} onChange={(e) => setFriendsOnly(e.target.checked)} />
          Friends
        </label>
        <label className="check">
          <input type="checkbox" checked={myTaste} onChange={(e) => setMyTaste(e.target.checked)} />
          My taste
        </label>
      </div>

      {openTables.length > 0 && browsing && (
        <section className="stack">
          <h2>Open tables</h2>
          {openTables.map((inv) => (
            <InviteCard key={inv.id} invite={inv} now={now} mode="open" />
          ))}
        </section>
      )}

      {browsing && view === "feed" && (
        <section className="stack">
          <h2>Suggested for you</h2>
          {suggestions.length > 0 ? (
            <div className="dish-grid">
              {suggestions.map(({ i }) => (
                <DishCard key={i.id} item={i} fans={friendFans(i)} me={me} />
              ))}
            </div>
          ) : (
            <p className="muted small">
              Add food preferences on <Link to={`/profile/${me.id}`}>your profile</Link> to get suggestions.
            </p>
          )}
        </section>
      )}

      <div className="tabs">
        <button className={`chip ${view === "feed" ? "chip-on" : ""}`} onClick={() => setView("feed")}>
          Reviews
        </button>
        <button className={`chip ${view === "dishes" ? "chip-on" : ""}`} onClick={() => setView("dishes")}>
          Dishes
        </button>
      </div>

      {view === "feed" &&
        (shownReviews.length > 0 ? (
          shownReviews.map((r) => <ReviewCard key={r.id} review={r} now={now} />)
        ) : (
          <p className="muted empty">No reviews match yet.</p>
        ))}

      {view === "dishes" &&
        (shownItems.length > 0 ? (
          <div className="dish-grid">
            {shownItems.map((i) => (
              <DishCard key={i.id} item={i} fans={friendFans(i)} me={me} />
            ))}
          </div>
        ) : (
          <p className="muted empty">No dishes match.</p>
        ))}
    </div>
  );
}

function DishCard({ item, fans, me }) {
  const matches = sharedTags(item, me);
  return (
    <Link to={`/items/${item.id}`} className="card dish-card">
      <DishThumb item={item} wide />
      <strong>{item.name}</strong>
      <span className="muted small">{item.diningHall}</span>
      {fans.length > 0 && <span className="signal">♥ {joinNames(fans.map((f) => f.name))}</span>}
      {matches.length > 0 && <span className="muted small">Your taste: {matches.join(", ")}</span>}
    </Link>
  );
}
