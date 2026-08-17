"use client";
import Button from "../shared/Button";
import ScrollObserver from "./ScrollObserver";

export default function LandingSections({ onSelectCTA }) {
  return (
    <div className="landing-container">
      {/* SECTION 1: How It Works */}
      <ScrollObserver>
        <section id="how-it-works" className="landing-section">
          <div className="section-header">
            <span className="landing-eyebrow">HOW IT WORKS</span>
            <h2 className="landing-title">Communication in four simple steps</h2>
            <p className="landing-subtitle">
              Designed from the ground up for people who navigate the world with their eyes alone.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">01</div>
              <div className="step-icon-wrap">
                <svg viewBox="0 0 24 24" className="step-svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </div>
              <h3 className="step-title">Automatic Highlight Scanning</h3>
              <p className="step-desc">
                The orange scan ring moves sequentially across choices at a steady, predictable rhythm.
              </p>
            </div>

            <div className="step-card">
              <div className="step-num">02</div>
              <div className="step-icon-wrap">
                <svg viewBox="0 0 24 24" className="step-svg">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" stroke="currentColor" strokeWidth="2" fill="none" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <h3 className="step-title">Long Blink Selection</h3>
              <p className="step-desc">
                Hold a relaxed long blink to select the currently highlighted option. No hands or clicks needed.
              </p>
            </div>

            <div className="step-card">
              <div className="step-num">03</div>
              <div className="step-icon-wrap">
                <svg viewBox="0 0 24 24" className="step-svg">
                  <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M7 8h2M11 8h2M15 8h2M7 12h2M11 12h2M15 12h2M8 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="step-title">Build Your Message</h3>
              <p className="step-desc">
                Choose quick category phrases or use the spell-it-out keyboard to write custom words letter-by-letter.
              </p>
            </div>

            <div className="step-card">
              <div className="step-num">04</div>
              <div className="step-icon-wrap">
                <svg viewBox="0 0 24 24" className="step-svg">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" strokeWidth="2" fill="none" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
              </div>
              <h3 className="step-title">Instant Speech Output</h3>
              <p className="step-desc">
                Your composed message is spoken aloud immediately through your device browser speakers.
              </p>
            </div>
          </div>
        </section>
      </ScrollObserver>

      {/* SECTION 2: Key Capabilities */}
      <ScrollObserver>
        <section id="capabilities" className="landing-section">
          <div className="section-header">
            <span className="landing-eyebrow">KEY CAPABILITIES</span>
            <h2 className="landing-title">Built for speed, simplicity, and dignity</h2>
          </div>

          <div className="capabilities-grid">
            <div className="capability-card">
              <span className="placeholder-tag">[PLACEHOLDER COPY]</span>
              <h3 className="capability-title">Zero Calibration Required</h3>
              <p className="capability-desc">
                Start using Aloud immediately upon opening. Standard webcam eye tracking works right out of the box without tedious setup.
              </p>
            </div>

            <div className="capability-card">
              <span className="placeholder-tag">[PLACEHOLDER COPY]</span>
              <h3 className="capability-title">Optional Eye-Control Tuning</h3>
              <p className="capability-desc">
                A quick 10-second calibration routine lets anyone fine-tune blink sensitivity to match their personal eye movement and room lighting.
              </p>
            </div>

            <div className="capability-card">
              <span className="placeholder-tag">[PLACEHOLDER COPY]</span>
              <h3 className="capability-title">Instant Speech Synthesis</h3>
              <p className="capability-desc">
                Clean, reliable text-to-speech output runs entirely within your browser with zero latency or external software dependencies.
              </p>
            </div>
          </div>
        </section>
      </ScrollObserver>

      {/* SECTION 3: Why This Exists */}
      <ScrollObserver>
        <section id="why-this-exists" className="landing-section">
          <div className="mission-card">
            <div className="mission-header">
              <span className="landing-eyebrow">OUR PURPOSE</span>
              <span className="placeholder-tag">[PLACEHOLDER COPY — Replace with final story text]</span>
            </div>
            <h2 className="landing-title">Giving a voice when words are hard to reach</h2>
            <div className="mission-body">
              <p>
                Aloud was created to answer a single question: how can we give a clear, independent voice back to someone who can only communicate with their eyes?
              </p>
              <p>
                Traditional AAC systems can be expensive, complex, or slow to set up. Aloud removes every barrier between your thoughts and spoken words — offering a fast, calm, and accessible tool that respects your time and independence.
              </p>
            </div>
          </div>
        </section>
      </ScrollObserver>

      {/* SECTION 4: Closing Call-To-Action */}
      <ScrollObserver>
        <section id="get-started" className="landing-section cta-section">
          <div className="cta-box">
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
