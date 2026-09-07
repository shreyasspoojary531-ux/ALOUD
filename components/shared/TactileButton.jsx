"use client";

export default function TactileButton({
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
      className={`tactile-button ${className}`}
      onClick={handleClick}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
    >
      <div className="button-outer">
        <div className="button-inner">
          <span>{children}</span>
        </div>
      </div>
    </button>
  );
}
