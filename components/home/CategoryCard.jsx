"use client";
import { useState } from "react";
import Icon from "../shared/Icon";

export default function CategoryCard({ item, active, selected, onSelect }) {
  const [localSelected, setLocalSelected] = useState(false);

  const handleClick = (e) => {
    setLocalSelected(true);
    setTimeout(() => setLocalSelected(false), 380);
    onSelect?.(e);
  };

  const isSelected = selected || localSelected;

  return (
    <button
      className={`category-card ${item.wide ? "wide" : ""} ${active ? "active" : ""} ${isSelected ? "selected-lift" : ""}`}
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
