import { useEffect } from "react";
import { Link, Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useData } from "../context/DataContext";
import NavBar from "./NavBar";
import LiveAlerts from "./LiveAlerts";
import { logEvent } from "../lib/actions";
import MessagesIcon from "./MessagesIcon";

export default function AppLayout() {
  const { currentUserId, logout } = useUser();
  const { me, ready } = useData();
  const missing = ready && currentUserId && !me;

  // Log one "app opened" per browser session, for the "time from opening the app to
  // sending an invite" measure on the results page
  useEffect(() => {
    if (!me?.id) return;
    const key = `cravdOpened:${me.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore storage errors
    }
    logEvent("app_open", { userId: me.id });
  }, [me?.id]);

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
      <header className="top-actions">
        <Link to="/" className="wordmark" aria-label="Cravd home">
          cravd<span>.</span>
        </Link>
        <MessagesIcon />
      </header>
      <LiveAlerts />
      <main className="page">
        <Outlet />
      </main>
      <NavBar />
    </div>
  );
}
