import { useState } from "react";
import { setStatus } from "../lib/actions";
import { clockTime, isFree, ZONES } from "../lib/helpers";

export default function StatusPanel({ me, now }) {
  const [zone, setZone] = useState(me.status?.zone || ZONES[0]);
  const [minutes, setMinutes] = useState(60);

  if (isFree(me, now)) {
    return (
      <div className="card status-panel status-on">
        <div>
          <strong>You're free</strong> near {me.status.zone} until {clockTime(me.status.until)}
        </div>
        <p className="muted small">Your friends can see this. It turns off by itself.</p>
        <div>
          <button className="btn btn-small" onClick={() => setStatus(me.id, { free: false })}>
            I'm not free anymore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card status-panel">
      <strong>Down to eat?</strong>
      <p className="muted small">Let your friends know you're around. It turns off by itself.</p>
      <div className="row wrap">
        <select className="inline" value={zone} onChange={(e) => setZone(e.target.value)}>
          {ZONES.map((z) => (
            <option key={z} value={z}>
              near {z}
            </option>
          ))}
        </select>
        <select className="inline" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          <option value={30}>for 30 min</option>
          <option value={60}>for 1 hr</option>
          <option value={120}>for 2 hrs</option>
        </select>
        <button className="btn btn-primary" onClick={() => setStatus(me.id, { free: true, zone, minutes })}>
          I'm free
        </button>
      </div>
    </div>
  );
}
