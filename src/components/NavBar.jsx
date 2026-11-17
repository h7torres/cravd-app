import { NavLink } from "react-router-dom";
import { useData } from "../context/DataContext";
import { arr, isLive, useNow } from "../lib/helpers";

export default function NavBar() {
  const { me, invites, friendRequests } = useData();
  const now = useNow();

  const unanswered = invites.filter(
    (inv) => isLive(inv, now) && arr(inv.toIds).includes(me.id) && !inv.responses?.[me.id]
  ).length;
  const requests = friendRequests.filter((r) => r.toId === me.id).length;

  return (
    <nav className="nav">
      <NavLink to="/" end>
        Home
        {unanswered > 0 && <span className="badge">{unanswered}</span>}
      </NavLink>
      <NavLink to="/explore">Explore</NavLink>
      <NavLink to="/invite/new" className={({ isActive }) => `nav-invite${isActive ? " active" : ""}`}>
        + Invite
      </NavLink>
      <NavLink to="/friends">
        Friends
        {requests > 0 && <span className="badge">{requests}</span>}
      </NavLink>
      <NavLink to={`/profile/${me.id}`}>Profile</NavLink>
    </nav>
  );
}
