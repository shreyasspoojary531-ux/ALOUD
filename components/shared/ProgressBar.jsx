export default function ProgressBar({ value, indeterminate }) {
  if (indeterminate) {
    return (
      <div className="progress indeterminate" aria-label="Starting camera…">
        <span />
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, Math.round(value ?? 0)));

  return (
    <div className="progress" aria-label={`${pct}% complete`}>
      <span style={{ width: `${pct}%`, transition: "width 0.05s linear" }} />
    </div>
  );
}
