"use client";
import ScrollObserver from "./ScrollObserver";

function ScanLineIcon({ size = 18 }) {
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

function EyeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function KeyboardIconComponent({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <path d="M6 10h.01" />
      <path d="M10 10h.01" />
      <path d="M14 10h.01" />
      <path d="M18 10h.01" />
      <path d="M6 14h12" />
    </svg>
  );
}

function Volume2Icon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

/** Bento step items for "How it works" section */
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Automatic Scanning",
    meta: "No hands needed",
    description:
      "The orange scan ring moves sequentially across every choice at a steady, predictable rhythm you can rely on.",
    icon: <ScanLineIcon size={18} />,
    iconColor: "#cf5700", /* var(--orange) */
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    step: "02",
    title: "Long Blink Selection",
    meta: "Hands-free",
    description:
      "Hold a relaxed long blink to lock in the highlighted option. No clicks, no taps, no hands required.",
    icon: <EyeIcon size={18} />,
    iconColor: "#497ea0", /* var(--blue-deep) */
    colSpan: 1,
  },
  {
    step: "03",
    title: "Build Your Message",
    meta: "Word by word",
    description:
      "Choose quick phrases from categories or spell any word letter-by-letter on the full keyboard.",
    icon: <KeyboardIconComponent size={18} />,
    iconColor: "#51865e", /* var(--sage-deep) */
    colSpan: 1,
  },
  {
    step: "04",
    title: "It Speaks For You",
    meta: "Instant output",
    description:
      "Your composed message is spoken aloud immediately through the browser — clear, natural, no delay.",
    icon: <Volume2Icon size={18} />,
    iconColor: "#9b7100", /* var(--gold-deep) */
    colSpan: 2,
  },
];

function BentoCard({ step, title, meta, description, icon, iconColor, colSpan, hasPersistentHover, index }) {
  return (
    <div
      className={`bento-card${colSpan === 2 ? " bento-card--wide" : ""}${hasPersistentHover ? " bento-card--active" : ""}`}
      style={{ "--bento-icon-color": iconColor, "--stagger": index }}
    >
      {/* Dot-matrix texture overlay */}
      <div className={`bento-texture${hasPersistentHover ? " bento-texture--on" : ""}`} aria-hidden="true" />

      <div className="bento-inner">
        {/* Top row: icon + meta badge */}
        <div className="bento-top">
          <div className="bento-icon-wrap">
            {icon}
          </div>
          <span className="bento-meta">{meta}</span>
        </div>

        {/* Content */}
        <div className="bento-content">
          <h3 className="bento-title">
            {title}
            <span className="bento-step">{step}</span>
          </h3>
          <p className="bento-desc">{description}</p>
        </div>

        {/* Bottom row: affordance */}
        <div className="bento-footer">
          <span className="bento-explore">Learn more →</span>
        </div>
      </div>

      {/* Gradient border ring (visible on hover / persistent) */}
      <div className={`bento-ring${hasPersistentHover ? " bento-ring--on" : ""}`} aria-hidden="true" />
    </div>
  );
}

export default function BentoGrid() {
  return (
    <ScrollObserver>
      <section id="how-it-works" className="landing-section">
        <div className="section-header">
          <span className="landing-eyebrow">HOW IT WORKS</span>
          <h2 className="landing-title">Communication in four simple steps</h2>
          <p className="landing-subtitle">
            Designed from the ground up for people who navigate the world with their eyes alone.
          </p>
        </div>

        <div className="bento-grid">
          {HOW_IT_WORKS.map((item, i) => (
            <BentoCard key={i} {...item} index={i} />
          ))}
        </div>
      </section>
    </ScrollObserver>
  );
}
