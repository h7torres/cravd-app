import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useData } from "../context/DataContext";
import NavBar from "./NavBar";

export default function AppLayout() {
  const { currentUserId, logout } = useUser();
  const { me, ready } = useData();
  const missing = ready && currentUserId && !me;

  // If the saved user was deleted from Firestore, send them back to login
  useEffect(() => {
    if (missing) logout();
  }, [missing, logout]);

  if (!currentUserId) return <Navigate to="/login" replace />;

  if (!ready || !me) {
    return (
      <div className="app-shell">
        <main className="page">
          <p className="muted">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="page">
        <Outlet />
      </main>
      <NavBar />
    </div>
  );
}
