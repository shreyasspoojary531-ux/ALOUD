"use client";
import "../styles/globals.css";
import "../styles/overrides.css";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="app">
        <section className="not-found-container center" aria-label="Global Error">
          <div className="not-found-card error-card">
            <p className="eyebrow alert-eyebrow">SYSTEM ERROR</p>

            <div className="error-icon-wrap" aria-hidden="true">
              ⚠
            </div>

            <h1 className="not-found-title">Application Error</h1>

            <p className="not-found-desc">
              A critical error occurred while initializing the app. Please reload the page to restore Aloud.
            </p>

            {error?.message && (
              <details className="error-details">
                <summary className="error-summary">Technical details</summary>
                <pre className="error-code-block">{error.message}</pre>
              </details>
            )}

            <div className="not-found-actions">
              <button
                type="button"
                className="button primary not-found-btn"
                onClick={() => reset?.() || window.location.reload()}
              >
                Reload Aloud
              </button>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
