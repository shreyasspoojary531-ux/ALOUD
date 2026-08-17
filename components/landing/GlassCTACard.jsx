"use client";
import { ScanLine, Eye, Volume2 } from "lucide-react";

const ACTIONS = [
  { Icon: ScanLine, label: "Scan" },
  { Icon: Eye,      label: "Blink" },
  { Icon: Volume2,  label: "Speak" },
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
