import { Link, useSearchParams } from "react-router-dom";
import { useData } from "../context/DataContext";
import { allergyConflicts, arr, sharedTags } from "../lib/helpers";
import Avatar from "../components/Avatar";
import DishThumb from "../components/DishThumb";

// Combines two people's favorites and food preferences into a shared pick.
function blend(a, b, items) {
  const favA = new Set(arr(a.favorites));
  const favB = new Set(arr(b.favorites));

  return items
    .map((item) => {
      const aLoves = favA.has(item.id);
      const bLoves = favB.has(item.id);
      const tagsA = sharedTags(item, a);
      const tagsB = sharedTags(item, b);
      const works = (aLoves || tagsA.length > 0) && (bLoves || tagsB.length > 0);

      const score = (aLoves ? 3 : 0) + (bLoves ? 3 : 0) + (aLoves && bLoves ? 3 : 0) + tagsA.length + tagsB.length;

      let reason;
      if (aLoves && bLoves) reason = "You both have this as a favorite";
      else if (aLoves) reason = `Your favorite, and it's ${tagsB.join(" + ")}, which ${b.name} likes`;
      else if (bLoves) reason = `${b.name}'s favorite, and it's ${tagsA.join(" + ")}, which you like`;
      else reason = `Fits both your tastes: ${[...new Set([...tagsA, ...tagsB])].join(", ")}`;

      return { item, score, reason, works };
    })
    .filter((r) => r.works && !allergyConflicts(r.item, a).length && !allergyConflicts(r.item, b).length)
    .sort((x, y) => y.score - x.score)
    .slice(0, 6);
}

export default function Blend() {
  const { me, usersById, items } = useData();
  const [params, setParams] = useSearchParams();

  const friends = arr(me.friends).map((id) => usersById[id]).filter(Boolean);
  const friend = friends.find((f) => f.id === params.get("with"));
  const results = friend ? blend(me, friend, items) : [];
  const [top, ...rest] = results;

  return (
    <div className="stack">
      <h1>Blend</h1>
      <p className="muted">Pick a friend and Cravd finds the dish you'd both be happy with.</p>

      {friends.length === 0 ? (
        <p className="muted">
          Add friends first on the <Link to="/friends">Friends</Link> page.
        </p>
      ) : (
        <div className="chips">
          {friends.map((f) => (
            <button
              key={f.id}
              className={`chip row ${friend?.id === f.id ? "chip-on" : ""}`}
              onClick={() => setParams({ with: f.id })}
            >
              <Avatar user={f} size={20} />
              {f.name}
            </button>
          ))}
        </div>
      )}

      {friend && results.length === 0 && (
        <p className="muted card">Not much overlap yet. Favorite a few dishes and add food preferences to your profiles.</p>
      )}

      {top && (
        <div className="card top-pick stack">
          <span className="muted small">Your blend with {friend.name}</span>
          <div className="row">
            <DishThumb item={top.item} size={64} />
            <div className="grow">
              <strong style={{ fontSize: 18 }}>{top.item.name}</strong>
              <div className="muted small">{top.item.diningHall}</div>
            </div>
          </div>
          <p className="small">{top.reason}</p>
          <Link className="btn btn-primary btn-block" to={`/invite/new?item=${top.item.id}&to=${friend.id}&src=blend`}>
            Invite {friend.name} to this
          </Link>
        </div>
      )}

      {rest.length > 0 && (
        <section className="stack">
          <h2>Also good for you both</h2>
          {rest.map(({ item, reason }) => (
            <Link key={item.id} to={`/items/${item.id}`} className="card row plan-card">
              <DishThumb item={item} size={44} />
              <span className="grow">
                <strong>{item.name}</strong>
                <span className="block muted small">{reason}</span>
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
