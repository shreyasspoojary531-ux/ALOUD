"use client";
import { ScanLine, Eye, KeyboardIcon, Volume2 } from "lucide-react";
import ScrollObserver from "./ScrollObserver";

/** Bento step items for "How it works" section */
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Automatic Scanning",
    meta: "No hands needed",
    description:
      "The orange scan ring moves sequentially across every choice at a steady, predictable rhythm you can rely on.",
    icon: <ScanLine size={18} />,
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
    icon: <Eye size={18} />,
    iconColor: "#497ea0", /* var(--blue-deep) */
    colSpan: 1,
  },
  {
    step: "03",
    title: "Build Your Message",
    meta: "Word by word",
    description:
      "Choose quick phrases from categories or spell any word letter-by-letter on the full keyboard.",
    icon: <KeyboardIcon size={18} />,
    iconColor: "#51865e", /* var(--sage-deep) */
    colSpan: 1,
  },
  {
    step: "04",
    title: "It Speaks For You",
    meta: "Instant output",
    description:
      "Your composed message is spoken aloud immediately through the browser — clear, natural, no delay.",
    icon: <Volume2 size={18} />,
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
