"use client";
import { useState } from "react";

export default function Button({
  children,
  onSelect,
  className = "",
  ariaLabel,
}) {
  const [pressed, setPressed] = useState(false);

  const handleClick = (e) => {
    setPressed(true);
    setTimeout(() => setPressed(false), 250);
    onSelect?.(e);
  };

  return (
    <button
      type="button"
      className={`button ${className} ${pressed ? "is-pressed" : ""}`}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
