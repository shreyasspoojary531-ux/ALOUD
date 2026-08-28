"use client";
import { DotMatrixBackground } from "./DotMatrixBackground";

/**
 * StructureFlowCollection component.
 * Variant: 'dot-matrix' — A cyan breathing dot matrix with radial depth fade and smoothed pointer drift.
 */
export function StructureFlowCollection({
  variant = "dot-matrix",
  speed = 1.0,
  gridScale = 60,
  mouseAmount = 0.04,
  pulseSpeed = 0.4,
  hue = -147,
  radius = 0.15,
  opacity = 0.35,
  className = "",
  ...rest
}) {
  if (variant === "dot-matrix") {
    return (
      <DotMatrixBackground
        speed={speed}
        gridScale={gridScale}
        mouseAmount={mouseAmount}
        pulseSpeed={pulseSpeed}
        hue={hue}
        radius={radius}
        opacity={opacity}
        className={className}
        {...rest}
      />
    );
  }

  return null;
}
