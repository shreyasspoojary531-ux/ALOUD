"use client";
import ScrollObserver from "./ScrollObserver";
import BentoGrid from "./BentoGrid";
import GlassCTACard from "./GlassCTACard";

export default function LandingSections({ onSelectCTA }) {
  return (
    <div className="landing-container">

      {/* SECTION 1: How It Works — Bento Grid */}
      <BentoGrid />

      {/* SECTION 2: Closing CTA — Glass Card */}
      <ScrollObserver>
        <section id="get-started" className="landing-section cta-section">
          <div className="cta-glass-layout">
            <div className="cta-glass-text">
              <span className="landing-eyebrow">GET STARTED NOW</span>
              <h2 className="cta-title">Ready to start speaking?</h2>
              <p className="cta-subtitle">
                No accounts, no downloads, and no complex hardware required.
                Open a browser and begin — right now.
              </p>
            </div>
            <div className="cta-glass-card-wrap">
              <GlassCTACard onSelect={onSelectCTA} />
            </div>
          </div>
        </section>
      </ScrollObserver>

    </div>
  );
}
