"use client";

import { useEffect, useRef } from "react";
import {
  createWarpFieldRenderer,
  WARP_FIELD_DEFAULTS,
} from "./warpFieldRenderer";

export function WarpFieldBackground({ className = "", ...props }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const optionsRef = useRef({ ...WARP_FIELD_DEFAULTS, ...props });
  optionsRef.current = { ...WARP_FIELD_DEFAULTS, ...props };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;

    let renderer;
    try {
      renderer = createWarpFieldRenderer(canvas, () => optionsRef.current);
    } catch (err) {
      console.error("[WarpField] Failed to create renderer:", err);
      return undefined;
    }

    let frameId = 0;
    let running = true;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const width = bounds.width > 0 ? bounds.width : window.innerWidth;
      const height = bounds.height > 0 ? bounds.height : window.innerHeight;
      renderer.resize(width, height);
    };

    // Schedule rAF BEFORE rendering so an error in render() can't break the
    // chain. The running flag ensures cleanup still stops the loop cleanly.
    const tick = () => {
      if (!running) return;
      frameId = requestAnimationFrame(tick);

      const opts = optionsRef.current;
      if (canvasRef.current) {
        canvasRef.current.style.filter = `hue-rotate(${opts.hue || 0}deg) saturate(${opts.saturation ?? 1}) brightness(${opts.brightness ?? 1})`;
      }

      try {
        renderer.render();
      } catch (err) {
        console.error("[WarpField] render error:", err);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    window.addEventListener("resize", resize);

    resize();
    // Kick off the loop
    frameId = requestAnimationFrame(tick);

    return () => {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`threeui-background warp-field${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
