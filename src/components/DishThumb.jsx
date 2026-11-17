export default function DishThumb({ item, size = 56, wide = false }) {
  const style = wide
    ? { width: "100%", height: 120, fontSize: 56 }
    : { width: size, height: size, fontSize: Math.round(size * 0.55) };
  return (
    <span className="dish-thumb" style={style}>
      {item?.photoURL ? <img src={item.photoURL} alt="" /> : item?.emoji || "🍽️"}
    </span>
  );
}
