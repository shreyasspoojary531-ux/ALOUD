"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { WarpFieldBackground } from "./warp-field/WarpFieldBackground";

function Slider({ label, value, min, max, step, unit = "", onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
        <span>{label}:</span>
        <strong style={{ color: "#34d399" }}>
          {typeof value === "number" && !Number.isInteger(value)
            ? value.toFixed(2)
            : value}
          {unit}
        </strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) =>
          onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10))
        }
        style={{ width: "100%", accentColor: "#10b981", cursor: "pointer" }}
      />
    </div>
  );
}

export default function ShaderDebugBar() {
  const pathname = usePathname();

  // Defaults match the user's preferred configuration
  const [open, setOpen] = useState(true);
  const [zIndex, setZIndex] = useState(-1);
  const [layerOpacity, setLayerOpacity] = useState(0.20);
  const [speed, setSpeed] = useState(17);
  const [streakOpacity, setStreakOpacity] = useState(0.75);
  const [tileOpacity, setTileOpacity] = useState(0.20);
  const [fov, setFov] = useState(75);
  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);
  const [hue, setHue] = useState(-140);

  return (
    <>
      {/* Three.js Warp Field */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex,
          pointerEvents: "none",
          overflow: "hidden",
          opacity: layerOpacity,
          background: "transparent",
        }}
      >
        <WarpFieldBackground
          speed={speed}
          streakOpacity={streakOpacity}
          tileOpacity={tileOpacity}
          fov={fov}
          cameraZ={0}
          centerX={centerX}
          centerY={centerY}
          hue={hue}
          saturation={1.0}
          brightness={1.0}
        />
      </div>

      {/* Floating Control Bar */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          zIndex: 99999,
          background: "rgba(10, 16, 26, 0.94)",
          backdropFilter: "blur(14px)",
          color: "#fffaf1",
          borderRadius: "16px",
          padding: open ? "16px 20px" : "10px 16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          border: "1px solid rgba(52, 211, 153, 0.35)",
          fontFamily: "sans-serif",
          maxWidth: "350px",
          width: "calc(100vw - 40px)",
          transition: "padding 0.2s ease",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Header toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            userSelect: "none",
          }}
          onClick={() => setOpen(!open)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            <strong style={{ fontSize: "0.9rem", color: "#a7f3d0" }}>
              Warp Field Controls
            </strong>
          </div>
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "#a7f3d0",
              cursor: "pointer",
              fontSize: "0.85rem",
              opacity: 0.8,
            }}
          >
            {open ? "▼ Hide" : "▲ Adjust"}
          </button>
        </div>

        {open && (
          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Z-Index quick-pick */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                <span>Z-Index Layer:</span>
                <strong style={{ color: "#34d399" }}>{zIndex}</strong>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {[-1, 0, 1, 10, 100, 9990].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setZIndex(val)}
                    style={{
                      flex: 1,
                      padding: "4px 0",
                      borderRadius: "6px",
                      border: zIndex === val ? "2px solid #10b981" : "1px solid #334155",
                      background: zIndex === val ? "#059669" : "#1e293b",
                      color: "#fff",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <Slider label="Layer Opacity (overall)" value={layerOpacity} min={0} max={1.0} step={0.05} onChange={setLayerOpacity} />
            <Slider label="Zoom Level (FOV)" value={fov} min={40} max={130} step={2} unit="°" onChange={setFov} />
            <Slider label="Center X" value={centerX} min={-200} max={200} step={10} unit="px" onChange={setCenterX} />
            <Slider label="Center Y" value={centerY} min={-200} max={200} step={10} unit="px" onChange={setCenterY} />

            {/* Element Opacity */}
            <div style={{ borderTop: "1px solid rgba(52,211,153,0.2)", paddingTop: "10px" }}>
              <div style={{ fontSize: "0.7rem", color: "#6ee7b7", letterSpacing: "0.08em", marginBottom: "8px" }}>
                ELEMENT OPACITY
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Slider label="Streaks" value={streakOpacity} min={0} max={1.0} step={0.05} onChange={setStreakOpacity} />
                <Slider label="Tiles" value={tileOpacity} min={0} max={1.0} step={0.05} onChange={setTileOpacity} />
              </div>
            </div>

            {/* Motion & Color */}
            <div style={{ borderTop: "1px solid rgba(52,211,153,0.2)", paddingTop: "10px" }}>
              <div style={{ fontSize: "0.7rem", color: "#6ee7b7", letterSpacing: "0.08em", marginBottom: "8px" }}>
                MOTION & COLOR
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <Slider label="Warp Speed" value={speed} min={1} max={40} step={1} onChange={setSpeed} />
                <Slider label="Hue Shift" value={hue} min={-180} max={180} step={10} unit="°" onChange={setHue} />
              </div>
            </div>

            {/* Debug info */}
            <div style={{ borderTop: "1px solid rgba(52,211,153,0.2)", paddingTop: "8px", fontSize: "0.7rem", color: "#6ee7b7", opacity: 0.7 }}>
              Route: {pathname || "(null)"} · z: {zIndex} · opacity: {layerOpacity}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
