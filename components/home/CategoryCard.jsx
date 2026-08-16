"use client";
import { useState } from "react";
import Icon from "../shared/Icon";
import ScanRing from "../scanner/ScanRing";
import { useEyeControl } from "../shared/EyeControlContext";

export default function CategoryCard({ item, active, selected, onSelect }) {
  const { eyeOn } = useEyeControl();
  const [localSelected, setLocalSelected] = useState(false);

  const handleClick = (e) => {
    if (eyeOn) {
      e.preventDefault();
      return;
    }
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
      <ScanRing active={active} selected={isSelected} />
      <span className="card-icon">
        <Icon name={item.icon} />
      </span>
      {item.wide ? (
        <div className="card-text-block">
          <strong>{item.label}</strong>
          {item.note && <small>{item.note}</small>}
        </div>
      ) : (
        <>
          <strong>{item.label}</strong>
          {item.note && <small>{item.note}</small>}
        </>
      )}
    </button>
  );
}

