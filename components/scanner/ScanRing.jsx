"use client";

export default function ScanRing({ active, selected, duration = 1800 }) {
  if (!active && !selected) return null;

  return (
    <span
      className={`scan-ring ${active ? "scan-ring--active" : ""} ${selected ? "scan-ring--selected" : ""}`}
      style={{ "--scan-duration": `${duration}ms` }}
      aria-hidden="true"
    >
      <svg className="scan-ring-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect
          x="2"
          y="2"
          width="96"
          height="96"
          rx="16"
          className="scan-ring-rect"
        />
      </svg>
    </span>
  );
}
