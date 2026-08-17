"use client";
import Button from "../shared/Button";
import ScrollObserver from "./ScrollObserver";
import BentoGrid from "./BentoGrid";
import { Zap, Sliders, Mic2 } from "lucide-react";

const CAPABILITIES = [
  {
    icon: <Zap size={22} />,
    iconBg: "var(--orange-pale)",
    iconColor: "var(--orange-dark)",
    title: "Zero Calibration Required",
    desc: "Start using Aloud immediately upon opening. Standard webcam eye tracking works right out of the box without tedious setup.",
    tag: "[PLACEHOLDER COPY]",
  },
  {
    icon: <Sliders size={22} />,
    iconBg: "var(--sage)",
    iconColor: "var(--sage-deep)",
    title: "Optional Eye-Control Tuning",
    desc: "A quick 10-second calibration routine lets anyone fine-tune blink sensitivity to match their personal eye movement and room lighting.",
    tag: "[PLACEHOLDER COPY]",
  },
  {
    icon: <Mic2 size={22} />,
    iconBg: "var(--blue)",
    iconColor: "var(--blue-deep)",
    title: "Instant Speech Synthesis",
    desc: "Clean, reliable text-to-speech output runs entirely within your browser with zero latency or external software dependencies.",
    tag: "[PLACEHOLDER COPY]",
  },
];

export default function LandingSections({ onSelectCTA }) {
  return (
    <div className="landing-container">

      {/* SECTION 1: How It Works — Bento Grid */}
      <BentoGrid />

      {/* SECTION 2: Key Capabilities */}
      <ScrollObserver>
        <section id="capabilities" className="landing-section">
          <div className="section-header">
            <span className="landing-eyebrow">KEY CAPABILITIES</span>
            <h2 className="landing-title">Built for speed, simplicity, and dignity</h2>
          </div>

          <div className="capabilities-grid">
            {CAPABILITIES.map(({ icon, iconBg, iconColor, title, desc, tag }, i) => (
              <div className="capability-card" key={i} style={{ "--stagger": i }}>
                <div className="capability-icon-wrap" style={{ background: iconBg, color: iconColor }}>
                  {icon}
                </div>
                <span className="placeholder-tag">{tag}</span>
                <h3 className="capability-title">{title}</h3>
                <p className="capability-desc">{desc}</p>
                <div className="capability-shine" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>
      </ScrollObserver>

      {/* SECTION 3: Why This Exists */}
      <ScrollObserver>
        <section id="why-this-exists" className="landing-section">
          <div className="mission-card">
            <div className="mission-orbit" aria-hidden="true" />
            <div className="mission-header">
              <span className="landing-eyebrow">OUR PURPOSE</span>
              <span className="placeholder-tag">[PLACEHOLDER COPY — Replace with final story text]</span>
            </div>
            <h2 className="landing-title">Giving a voice when words are hard to reach</h2>
            <div className="mission-body">
              <p>
                Aloud was created to answer a single question: how can we give a clear, independent voice back
                to someone who can only communicate with their eyes?
              </p>
              <p>
                Traditional AAC systems can be expensive, complex, or slow to set up. Aloud removes every
                barrier between your thoughts and spoken words — offering a fast, calm, and accessible tool
                that respects your time and independence.
              </p>
            </div>
          </div>
        </section>
      </ScrollObserver>

      {/* SECTION 4: Closing CTA */}
      <ScrollObserver>
        <section id="get-started" className="landing-section cta-section">
          <div className="cta-box">
            <div className="cta-glow" aria-hidden="true" />
            <span className="landing-eyebrow">GET STARTED NOW</span>
            <h2 className="cta-title">Ready to start speaking?</h2>
            <p className="cta-subtitle">
              No accounts, no downloads, and no complex hardware required.
            </p>
            <div className="cta-btn-wrap">
              <Button className="primary splash-btn" onSelect={() => onSelectCTA()}>
                Begin with eye control
              </Button>
            </div>
          </div>
        </section>
      </ScrollObserver>

    </div>
  );
}
