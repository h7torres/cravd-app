import { useState } from "react";

export default function DishThumb({ item, size = 56, wide = false }) {
  // If a photo fails to load, fall back to the dish emoji instead of a broken image
  const [failed, setFailed] = useState(false);
  const style = wide
    ? { width: "100%", height: 120, fontSize: 56 }
    : { width: size, height: size, fontSize: Math.round(size * 0.55) };
  const showPhoto = item?.photoURL && !failed;
  return (
    <span className="dish-thumb" style={style}>
      {showPhoto ? <img src={item.photoURL} alt="" onError={() => setFailed(true)} /> : item?.emoji || "🍽️"}
    </span>
  );
}
