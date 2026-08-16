"use client";
import { useState } from "react";
import Icon from "../shared/Icon";

export default function CategoryCard({ item, active, onSelect }) {
  const [selected, setSelected] = useState(false);

  const handleClick = (e) => {
    setSelected(true);
    setTimeout(() => setSelected(false), 300);
    onSelect?.(e);
  };

  return (
    <button
      className={`category-card ${item.wide ? "wide" : ""} ${active ? "active" : ""} ${selected ? "selected-pulse" : ""}`}
      style={{
        "--tint": `var(--${item.tint})`,
        "--tint-deep": `var(--${item.tint}-deep)`,
      }}
      onClick={handleClick}
      aria-label={item.label}
    >
      <span className="card-icon">
        <Icon name={item.icon} />
      </span>
      <strong>{item.label}</strong>
      {item.note && <small>{item.note}</small>}
    </button>
  );
}
