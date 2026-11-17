import { colorFor, initials, isFree } from "../lib/helpers";

// Pass `now` to show the green "free" dot
export default function Avatar({ user, size = 40, now }) {
  const free = now !== undefined && isFree(user, now);
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        background: user?.photoURL ? "#eee" : colorFor(user?.id || ""),
      }}
    >
      {user?.photoURL ? <img src={user.photoURL} alt="" /> : initials(user?.name)}
      {free && <span className="free-dot" />}
    </span>
  );
}
