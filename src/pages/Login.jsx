import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useData } from "../context/DataContext";
import { seedDemoData } from "../lib/seed";
import { arr, handleOf } from "../lib/helpers";
import Avatar from "../components/Avatar";

export default function Login() {
  const { users, ready } = useData();
  const { login } = useUser();
  const navigate = useNavigate();
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState("");

  // New users with no friends land on Explore. Returning users land on Home.
  function pick(user) {
    login(user.id);
    navigate(arr(user.friends).length > 0 ? "/" : "/explore");
  }

  async function seed() {
    setSeeding(true);
    setMessage("");
    try {
      await seedDemoData();
      setMessage("Demo data added.");
    } catch (err) {
      console.error(err);
      setMessage("Seeding failed. Check the console.");
    }
    setSeeding(false);
  }

  const sorted = [...users].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="app-shell">
      <main className="page stack">
        <div className="hero">
          <h1>Cravd</h1>
          <p className="muted">Shared taste, shared meals.</p>
        </div>

        <strong>Who are you?</strong>
        {!ready && <p className="muted">Loading…</p>}
        {ready && sorted.length === 0 && <p className="muted">No users yet. Seed the demo data below.</p>}

        <div className="stack">
          {sorted.map((u) => (
            <button key={u.id} className="pick" onClick={() => pick(u)}>
              <Avatar user={u} size={36} />
              <span className="grow">
                <span className="block">{u.name}</span>
                <span className="block muted small">@{handleOf(u)}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="card stack">
          <strong>Demo data</strong>
          <p className="muted small">
            Adds dishes, six demo students, reviews, past meals, an open table and a live invite. Your
            existing users become friends with Cris and Miguel. Running it again resets the demo
            accounts and refreshes the invites.
          </p>
          <div>
            <button className="btn" disabled={seeding} onClick={seed}>
              {seeding ? "Seeding…" : "Seed demo data"}
            </button>
          </div>
          {message && <p className="small">{message}</p>}
        </div>
      </main>
    </div>
  );
}
