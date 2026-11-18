import { useState } from "react";
import DishThumb from "./DishThumb";

export default function DishPicker({ items, onPick, selectedId, label = "Search dishes" }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((i) =>
    [i.name, i.diningHall].join(" ").toLowerCase().includes(search.trim().toLowerCase())
  ).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return (
    <div className="stack">
      <label className="small" htmlFor="dish-search">{label}</label>
      <input id="dish-search" type="search" placeholder="Dish or dining hall" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="dish-picker-list stack">
        {filtered.length === 0 && <p className="muted small">No dishes found.</p>}
        {filtered.map((item) => (
          <button key={item.id} type="button" onClick={() => onPick(item)} className={`pick ${selectedId === item.id ? "pick-selected" : ""}`}>
            <DishThumb item={item} size={40} />
            <span className="grow"><strong>{item.name}</strong><span className="block muted small">{item.diningHall}</span></span>
            {selectedId === item.id && <span aria-label="Selected">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
