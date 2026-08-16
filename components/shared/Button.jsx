"use client";
export default function Button({
  children,
  onSelect,
  className = "",
  ariaLabel,
}) {
  return (
    <button
      type="button"
      className={`button ${className}`}
      onClick={onSelect}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
