"use client";

export default function Button({
  children,
  onSelect,
  className = "",
  ariaLabel,
}) {
  const handleClick = (e) => {
    onSelect?.(e);
  };

  return (
    <button
      type="button"
      className={`button ${className}`}
      onClick={handleClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
