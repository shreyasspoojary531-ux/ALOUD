"use client";

function ScanLineIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function EyeIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Volume2Icon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

const ACTIONS = [
  { Icon: ScanLineIcon, label: "Scan" },
  { Icon: EyeIcon,      label: "Blink" },
  { Icon: Volume2Icon,  label: "Speak" },
];

export default function GlassCTACard({ onSelect }) {
  return (
    <div className="glass-card-scene" aria-hidden="false">
      <div className="glass-card">
        {/* Inner glass inset panel */}
        <div className="glass-inset" aria-hidden="true" />

        {/* Concentric ambient circles top-right */}
        <div className="glass-circles" aria-hidden="true">
          {[170, 140, 110, 80].map((size, i) => (
            <div
              key={i}
              className="glass-circle"
              style={{
                width: size,
                height: size,
                "--circle-z": `${(i + 1) * 20}px`,
                "--circle-delay": `${i * 0.4}s`,
              }}
            />
          ))}
          {/* Orange dot mark (Aloud brand) */}
          <div className="glass-mark" aria-hidden="true">
            <span />
          </div>
        </div>

        {/* Card content layer */}
        <div className="glass-body">
          <span className="glass-eyebrow">GET STARTED</span>
          <h3 className="glass-title">Ready to speak?</h3>
          <p className="glass-desc">
            Eye control. One long blink. Your voice.
          </p>
        </div>

        {/* Bottom row: step icons + CTA */}
        <div className="glass-footer">
          <div className="glass-actions">
            {ACTIONS.map(({ Icon, label }, i) => (
              <button
                key={i}
                className="glass-action-btn"
                style={{ "--btn-delay": `${400 + i * 200}ms` }}
                aria-label={label}
                tabIndex={-1}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          <button
            className="glass-start-btn"
            onClick={onSelect}
            aria-label="Begin with eye control"
          >
            Begin now&nbsp;→
          </button>
        </div>
      </div>
    </div>
  );
}
