"use client";
import { useEyeControl } from "./EyeControlContext";

export default function Button({
  children,
  onSelect,
  className = "",
  ariaLabel,
}) {
  const { eyeOn } = useEyeControl();

  const handleClick = (e) => {
    if (eyeOn) {
      e.preventDefault();
      return;
    }
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

