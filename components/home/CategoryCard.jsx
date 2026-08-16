"use client";
export default function CategoryCard({ item, active, onSelect }) {
  return (
    <button
      className={`category-card ${item.wide ? "wide" : ""} ${active ? "active" : ""}`}
      style={{
        "--tint": `var(--${item.tint})`,
        "--tint-deep": `var(--${item.tint}-deep)`,
      }}
      onClick={onSelect}
      aria-label={item.label}
    >
      <span className="card-icon">{item.icon}</span>
      <strong>{item.label}</strong>
      {item.note && <small>{item.note}</small>}
    </button>
  );
}
