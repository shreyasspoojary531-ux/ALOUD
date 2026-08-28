"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { WarpFieldBackground } from "./warp-field/WarpFieldBackground";

// Render warp field background on splash and setup pages.
const ALLOWED_PATHS = ["/", "/setup"];

export default function AppBackground() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isAllowed = ALLOWED_PATHS.includes(pathname);
  if (!isAllowed) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <WarpFieldBackground
        speed={10}
        streakOpacity={0.20}
        tileOpacity={0.05}
        fov={50}
        cameraZ={0}
        centerX={0}
        centerY={0}
        hue={-140}
        saturation={1.0}
        brightness={1.0}
      />
    </div>
  );
}

