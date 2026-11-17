import { useData } from "../context/DataContext";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  sendFriendRequest,
  toggleFollow,
} from "../lib/actions";
import { arr } from "../lib/helpers";

export function FriendButton({ me, user }) {
  const { friendRequests } = useData();
  const isFriend = arr(me.friends).includes(user.id);
  const sent = friendRequests.find((r) => r.fromId === me.id && r.toId === user.id);
  const received = friendRequests.find((r) => r.fromId === user.id && r.toId === me.id);

  if (isFriend) return <span className="chip chip-on">Friends ✓</span>;
  if (received) {
    return (
      <button className="btn btn-small btn-primary" onClick={() => acceptFriendRequest(received)}>
        Accept request
      </button>
    );
  }
  if (sent) {
    return (
      <button className="btn btn-small" onClick={() => cancelFriendRequest(sent.id)}>
        Requested
      </button>
    );
  }
  return (
    <button className="btn btn-small btn-primary" onClick={() => sendFriendRequest(me.id, user.id)}>
      Add friend
    </button>
  );
}

export function FollowButton({ me, user }) {
  const following = arr(me.following).includes(user.id);
  return (
    <button
      className={`btn btn-small ${following ? "btn-on" : ""}`}
      onClick={() => toggleFollow(me.id, user.id, following)}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
