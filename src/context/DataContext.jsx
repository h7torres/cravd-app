import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useUser } from "./UserContext";

const DataContext = createContext(null);
const COLLECTIONS = ["users", "items", "invites", "reviews", "friendRequests", "comments"];

// Subscribes to every collection in real time, so changes show up instantly on every screen.
export function DataProvider({ children }) {
  const { currentUserId } = useUser();
  const [data, setData] = useState({
    users: [],
    items: [],
    invites: [],
    reviews: [],
    friendRequests: [],
    comments: [],
  });
  const [loaded, setLoaded] = useState({});

  useEffect(() => {
    const unsubs = COLLECTIONS.map((name) =>
      onSnapshot(
        collection(db, name),
        (snap) => {
          setData((prev) => ({
            ...prev,
            [name]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          }));
          setLoaded((prev) => ({ ...prev, [name]: true }));
        },
        (err) => {
          console.error(`Error loading ${name}:`, err);
          setLoaded((prev) => ({ ...prev, [name]: true }));
        }
      )
    );
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const value = useMemo(() => {
    const usersById = Object.fromEntries(data.users.map((u) => [u.id, u]));
    const itemsById = Object.fromEntries(data.items.map((i) => [i.id, i]));
    return {
      ...data,
      usersById,
      itemsById,
      me: usersById[currentUserId] || null,
      ready: COLLECTIONS.every((c) => loaded[c]),
    };
  }, [data, loaded, currentUserId]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  return useContext(DataContext);
}
