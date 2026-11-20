import { NavLink } from "react-router-dom";
import { useData } from "../context/DataContext";
import { arr, isLive, useNow } from "../lib/helpers";

function Icon({ d, size = 22, strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

const ICONS = {
  home: ["M3 10.5 12 3l9 7.5", "M5 9.5V20h5v-6h4v6h5V9.5"],
  explore: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "m15.5 8.5-2 5-5 2 2-5z"],
  plus: ["M12 5v14", "M5 12h14"],
  friends: [
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    "M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5",
    "M16 4.3a3.5 3.5 0 0 1 0 6.4",
    "M18.5 14.8c1.7.7 2.8 2.4 3 5.2",
  ],
  profile: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5"],
};

export default function NavBar() {
  const { me, invites, friendRequests } = useData();
  const now = useNow();

  const unanswered = invites.filter(
    (inv) => isLive(inv, now) && arr(inv.toIds).includes(me.id) && !inv.responses?.[me.id]
  ).length;
  const requests = friendRequests.filter((r) => r.toId === me.id).length;

  return (
    <nav className="nav" aria-label="Main">
      <NavLink to="/" end>
        <Icon d={ICONS.home} />
        Home
        {unanswered > 0 && <span className="badge">{unanswered}</span>}
      </NavLink>
      <NavLink to="/explore">
        <Icon d={ICONS.explore} />
        Explore
      </NavLink>
      <NavLink
        to="/invite/new"
        aria-label="New invite"
        className={({ isActive }) => `nav-invite${isActive ? " active" : ""}`}
      >
        <Icon d={ICONS.plus} size={26} strokeWidth={2.8} />
      </NavLink>
      <NavLink to="/friends">
        <Icon d={ICONS.friends} />
        Friends
        {requests > 0 && <span className="badge">{requests}</span>}
      </NavLink>
      <NavLink to={`/profile/${me.id}`}>
        <Icon d={ICONS.profile} />
        Profile
      </NavLink>
    </nav>
  );
}
