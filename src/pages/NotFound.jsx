import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="app-shell">
      <main className="page">
        <h1>Page not found</h1>
        <Link to="/">Go home</Link>
      </main>
    </div>
  );
}