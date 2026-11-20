import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useData } from "../context/DataContext";
import { createProfile } from "../lib/actions";
import { clearFriendActivity, seedDemoData, seedFriendActivity } from "../lib/seed";
import { ALLERGENS, handleOf, MAX_PREFS, PREFS } from "../lib/helpers";
import Avatar from "../components/Avatar";

// Onboarding for the class prototype: name + food profile, no sign-in.
export default function Login() {
  const { users, ready } = useData();
  const { login } = useUser();
  const navigate = useNavigate();

  const [mode, setMode] = useState("create");
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [shareAllergens, setShareAllergens] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seedMsg, setSeedMsg] = useState("");

  // Sample reviewers from the seed data aren't classmates, so they're hidden here
  const classmates = users
    .filter((u) => !u.demo)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const sameName = classmates.find(
    (u) => (u.name || "").trim().toLowerCase() === name.trim().toLowerCase()
  );

  function toggle(setList, value, max = Infinity) {
    setList((list) =>
      list.includes(value) ? list.filter((x) => x !== value) : list.length < max ? [...list, value] : list
    );
  }

  function enter(user) {
    login(user.id);
    navigate("/");
  }

  async function create() {
    setError("");
    if (!name.trim()) return setError("Add your name so your classmates know it's you.");
    if (prefs.length < 2) return setError("Pick at least 2 flavors you like.");
    setBusy(true);
    try {
      const id = await createProfile({
        name,
        prefs,
        allergens,
        shareAllergens,
        classmateIds: classmates.map((u) => u.id),
      });
      login(id);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Couldn't create your profile. Try again.");
      setBusy(false);
    }
  }

  async function addActivity() {
    setSeedMsg("Adding friend activity…");
    try {
      const { classmates: count, posts } = await seedFriendActivity();
      setSeedMsg(`Done: ${count} classmates liked sample posts, and ${posts} placeholder posts were added.`);
    } catch (err) {
      console.error(err);
      setSeedMsg(err.message || "Couldn't add friend activity.");
    }
  }

  async function removeActivity() {
    setSeedMsg("Removing friend activity…");
    try {
      const removed = await clearFriendActivity();
      setSeedMsg(`Removed ${removed} placeholder posts and reset the sample likes.`);
    } catch (err) {
      console.error(err);
      setSeedMsg("Couldn't remove friend activity.");
    }
  }

  async function seed() {
    setSeedMsg("Adding…");
    try {
      await seedDemoData();
      setSeedMsg("Sample dishes and reviews added.");
    } catch (err) {
      console.error(err);
      setSeedMsg("Seeding failed. Check the console.");
    }
  }

  return (
    <div className="app-shell">
      <main className="page stack">
        <div className="hero">
          <h1>Cravd</h1>
          <p className="muted">Shared taste, shared meals.</p>
        </div>

        <div className="tabs">
          <button className={`chip ${mode === "create" ? "chip-on" : ""}`} onClick={() => setMode("create")}>
            I'm new
          </button>
          <button className={`chip ${mode === "existing" ? "chip-on" : ""}`} onClick={() => setMode("existing")}>
            I already have a profile
          </button>
        </div>

        {mode === "create" && (
          <div className="stack">
            <section className="stack">
              <h2>What's your name?</h2>
              <input
                placeholder="First name"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
              />
              {sameName && (
                <p className="small">
                  There's already a {sameName.name} on Cravd.{" "}
                  <button className="btn-link" onClick={() => enter(sameName)}>
                    That's me
                  </button>
                </p>
              )}
            </section>

            <section className="stack">
              <h2>What kind of food do you like?</h2>
              <p className="muted small">
                Pick 2 to {MAX_PREFS}. Just a general lead: your classmates will see these, and we'll use them to match tastes.
              </p>
              <div className="chips">
                {PREFS.map((p) => (
                  <button
                    key={p}
                    className={`chip ${prefs.includes(p) ? "chip-on" : ""}`}
                    disabled={!prefs.includes(p) && prefs.length >= MAX_PREFS}
                    onClick={() => toggle(setPrefs, p, MAX_PREFS)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </section>

            <section className="stack">
              <h2>Any allergies?</h2>
              <p className="muted small">Optional. We'll warn you about dishes that contain these and leave them out of suggestions.</p>
              <div className="chips">
                {ALLERGENS.map((a) => (
                  <button key={a} className={`chip ${allergens.includes(a) ? "chip-warn-on" : ""}`} onClick={() => toggle(setAllergens, a)}>
                    {a}
                  </button>
                ))}
              </div>
              {allergens.length > 0 && (
                <label className="check small">
                  <input type="checkbox" checked={shareAllergens} onChange={(e) => setShareAllergens(e.target.checked)} />
                  Let my friends see these (otherwise only you see them)
                </label>
              )}
            </section>

            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary btn-block" disabled={busy || !ready} onClick={create}>
              {busy ? "Creating…" : "Create my food profile"}
            </button>
            {classmates.length > 0 && (
              <p className="muted small" style={{ textAlign: "center" }}>
                You'll be connected with the {classmates.length} classmate{classmates.length === 1 ? "" : "s"} already here.
              </p>
            )}
          </div>
        )}

        {mode === "existing" && (
          <div className="stack">
            {!ready && <p className="muted">Loading…</p>}
            {ready && classmates.length === 0 && <p className="muted">No profiles yet. Tap "I'm new" to make the first one.</p>}
            {classmates.map((u) => (
              <button key={u.id} className="pick" onClick={() => enter(u)}>
                <Avatar user={u} size={36} />
                <span className="grow">
                  <span className="block">{u.name}</span>
                  <span className="block muted small">@{handleOf(u)}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <details className="card small">
          <summary className="muted">Set up demo data</summary>
          <div className="stack" style={{ paddingTop: 10 }}>
            <p className="muted small">
              Adds sample dishes and reviews from sample accounts so Explore isn't empty, and connects every classmate as
              friends. Safe to run more than once.
            </p>
            <div>
              <button className="btn btn-small" onClick={seed}>
                Add sample dishes and reviews
              </button>
            </div>
            <p className="muted small">
              Once classmates have joined: each classmate likes a couple of sample posts that fit their taste, and pairs
              of classmates get a placeholder post labeled "Demo post", so everyone's friend feed has something in it.
            </p>
            <div className="row wrap">
              <button className="btn btn-small" onClick={addActivity}>
                Add friend activity
              </button>
              <button className="btn btn-small" onClick={removeActivity}>
                Remove friend activity
              </button>
            </div>
            {seedMsg && <p className="small">{seedMsg}</p>}
          </div>
        </details>
      </main>
    </div>
  );
}
