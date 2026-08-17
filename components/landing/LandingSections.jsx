"use client";
import ScrollObserver from "./ScrollObserver";
import BentoGrid from "./BentoGrid";
import GlassCTACard from "./GlassCTACard";
import { StaggeredHeading, BlurHighlightText } from "./TextEffects";

const MISSION_P1 = [
  { text: "Aloud was built to answer one question: " },
  { text: "how do we give back a clear, independent voice", highlight: true },
  { text: " to someone who can only communicate with their eyes?" },
];

const MISSION_P2 = [
  { text: "Traditional AAC systems are " },
  { text: "expensive, slow to set up, and hard to learn.", highlight: true },
  { text: " Aloud removes every barrier between your thoughts and spoken words — " },
  { text: "fast, calm, and built around you.", highlight: true },
];

export default function LandingSections({ onSelectCTA }) {
  return (
    <div className="landing-container">

      {/* SECTION 1: How It Works — Bento Grid */}
      <BentoGrid />

      {/* SECTION 2: Why This Exists / Mission */}
      <ScrollObserver>
        <section id="why-this-exists" className="landing-section">
          <div className="mission-card">
            <div className="mission-orbit" aria-hidden="true" />

            <div className="mission-header">
              <span className="landing-eyebrow">OUR PURPOSE</span>
              <span className="placeholder-tag">[PLACEHOLDER COPY — Replace with final story text]</span>
            </div>

            <StaggeredHeading
              text="Giving a voice when words are hard to reach"
              className="landing-title mission-stagger-title"
            />

            <div className="mission-body">
              <BlurHighlightText segments={MISSION_P1} />
              <BlurHighlightText segments={MISSION_P2} />
            </div>
          </div>
        </section>
      </ScrollObserver>

      {/* SECTION 3: Closing CTA — Glass Card */}
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
