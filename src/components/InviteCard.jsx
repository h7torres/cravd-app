import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { cancelInvite, joinOpenTable, respondToInvite } from "../lib/actions";
import { arr, downIds, isFree, joinNames, timeLeft, whenLabel } from "../lib/helpers";
import Avatar from "./Avatar";
import DishThumb from "./DishThumb";

const RESPONSES = [
  ["down", "I'm down"],
  ["maybe", "Maybe"],
  ["cant", "Can't"],
];
const LABEL = { down: "is down", maybe: "maybe", cant: "can't" };
const VISIBILITY = { friends: "", followers: "Followers can join", anyone: "Open table" };

// mode: "incoming" | "outgoing" | "open"
export default function InviteCard({ invite, now, mode }) {
  const { me, usersById, itemsById } = useData();
  const from = usersById[invite.fromId];
  const item = invite.itemId ? itemsById[invite.itemId] : null;
  const responses = invite.responses || {};
  const mine = responses[me.id];
  const isMine = invite.fromId === me.id;

  const toNames = arr(invite.toIds)
    .map((id) => (id === me.id ? "you" : usersById[id]?.name))
    .filter(Boolean);
  const answered = Object.entries(responses).map(
    ([id, r]) => `${id === me.id ? "You" : usersById[id]?.name || "Someone"} ${LABEL[r]}`
  );

  const details = [
    toNames.length ? `To ${joinNames(toNames)}` : "Open to anyone",
    VISIBILITY[invite.visibility],
    !isMine && isFree(from, now) && from.status.zone ? `near ${from.status.zone}` : "",
  ].filter(Boolean);

  return (
    <article className={`card invite stack urgency-${invite.urgency}`}>
      <div className="row">
        <Avatar user={from} size={36} now={now} />
        <div className="grow">
          <strong>{isMine ? "You" : from?.name || "Someone"}</strong> · {whenLabel(invite, now)}
          <div className="muted small">{details.join(" · ")}</div>
        </div>
        <span className="muted small">{timeLeft(invite.expiresAt, now)}</span>
      </div>

      {item && (
        <Link to={`/items/${item.id}`} className="review-dish">
          <DishThumb item={item} size={36} />
          <span>
            {item.name} <span className="muted small">· {item.diningHall}</span>
          </span>
        </Link>
      )}

      {invite.note && <p>“{invite.note}”</p>}
      {answered.length > 0 && <p className="muted small">{answered.join(" · ")}</p>}

      {mode === "incoming" && (
        <div className="row">
          {RESPONSES.map(([key, label]) => (
            <button
              key={key}
              className={`btn btn-small ${mine === key ? "btn-on" : ""}`}
              onClick={() => respondToInvite(invite.id, me.id, key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "outgoing" && (
        <div className="row">
          <button className="btn btn-small" onClick={() => cancelInvite(invite.id)}>
            Cancel invite
          </button>
          {downIds(invite).length > 0 && (
            <Link className="btn btn-small btn-primary" to={`/meal/${invite.id}`}>
              Open plan
            </Link>
          )}
        </div>
      )}

      {mode === "open" &&
        (mine === "down" ? (
          <div>
            <Link className="btn btn-small btn-primary" to={`/meal/${invite.id}`}>
              You're in · open plan
            </Link>
          </div>
        ) : (
          <div>
            <button className="btn btn-small btn-primary" onClick={() => joinOpenTable(invite.id, me.id)}>
              Join this table
            </button>
          </div>
        ))}
    </article>
  );
}
