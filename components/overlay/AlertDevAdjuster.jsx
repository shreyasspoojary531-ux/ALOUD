"use client";

/**
 * TEMPORARY DEV TOOL: Live position and size adjuster for the Alert Screen.
 * Fixed to bottom-left corner. Mouse-only, completely excluded from eye-scanning.
 * Can be removed in one shot by deleting this file and its import in SpokenMessageOverlay.jsx.
 */
export default function AlertDevAdjuster({
  orbY,
  setOrbY,
  orbScale,
  setOrbScale,
  textY,
  setTextY,
}) {
  return (
    <div
      className="alert-dev-adjuster"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        zIndex: 999999,
        background: "rgba(18, 18, 20, 0.92)",
        color: "#ffffff",
        padding: "16px 20px",
        borderRadius: "14px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "12px",
        width: "280px",
        pointerEvents: "auto",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          paddingBottom: "8px",
        }}
      >
        <span style={{ fontWeight: 700, color: "#ff9d42", letterSpacing: "0.5px" }}>
          🛠️ ALERT LAYOUT DEV TOOL
        </span>
        <button
          onClick={() => {
            setOrbY(0);
            setOrbScale(1.0);
            setTextY(0);
          }}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "#fff",
            fontSize: "10px",
            padding: "2px 8px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>

      {/* Slider 1: Orb Y Position */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>1. Orb Position (Y):</span>
          <strong style={{ color: "#40c4ff" }}>{orbY}px</strong>
        </div>
        <input
          type="range"
          min="-300"
          max="300"
          step="1"
          value={orbY}
          onChange={(e) => setOrbY(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#40c4ff", cursor: "pointer" }}
        />
      </div>

      {/* Slider 2: Orb Size / Scale */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>2. Orb Scale (Size):</span>
          <strong style={{ color: "#69ff69" }}>{orbScale.toFixed(2)}x</strong>
        </div>
        <input
          type="range"
          min="0.2"
          max="3.0"
          step="0.05"
          value={orbScale}
          onChange={(e) => setOrbScale(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#69ff69", cursor: "pointer" }}
        />
      </div>

      {/* Slider 3: Text Block Y Position */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span>3. Text Block Position (Y):</span>
          <strong style={{ color: "#ff6b81" }}>{textY}px</strong>
        </div>
        <input
          type="range"
          min="-300"
          max="300"
          step="1"
          value={textY}
          onChange={(e) => setTextY(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#ff6b81", cursor: "pointer" }}
        />
      </div>
    </div>
  );
}
