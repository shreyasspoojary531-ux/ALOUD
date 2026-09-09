/**
 * Experimental, fully isolated adaptive lighting compensation for eye blink detection.
 *
 * TOGGLE: Set ENABLE_LIGHTING_COMPENSATION to false to completely disable all
 * adaptive lighting adjustments with zero code-path difference.
 */
export const ENABLE_LIGHTING_COMPENSATION = true;

// Offscreen 32x24 canvas for low-frequency video frame luminance sampling
let sampleCanvas = null;
let sampleCtx = null;

/**
 * Low-frequency video feed luminance sampler.
 * Downscales video frame to 32x24 and computes average relative luminance (0..255).
 */
export function sampleVideoLuminance(video) {
  if (!video || video.readyState < 2 || video.videoWidth === 0) return 128; // Default normal luminance

  try {
    if (typeof window === "undefined" || typeof document === "undefined") return 128;

    if (!sampleCanvas) {
      sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = 32;
      sampleCanvas.height = 24;
      sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    }

    if (!sampleCtx) return 128;

    sampleCtx.drawImage(video, 0, 0, 32, 24);
    const imgData = sampleCtx.getImageData(0, 0, 32, 24).data;

    let totalLuminance = 0;
    const pixelCount = imgData.length / 4;

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i];
      const g = imgData[i + 1];
      const b = imgData[i + 2];
      // ITU-R BT.709 relative luminance formula
      totalLuminance += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    return Math.round(totalLuminance / pixelCount);
  } catch (err) {
    return 128; // Fallback to normal lighting on canvas read error (e.g. CORS/Tainted)
  }
}

/**
 * Computes compensated thresholds based on scene luminance.
 * Returns baseThresholds 100% untouched if ENABLE_LIGHTING_COMPENSATION is false or luminance is normal (60..195).
 */
export function getLightingCompensatedThresholds(baseThresholds, luminance) {
  if (!ENABLE_LIGHTING_COMPENSATION || !baseThresholds) {
    return baseThresholds;
  }

  // Normal lighting range (60..195): return base thresholds unmodified
  if (luminance >= 60 && luminance <= 195) {
    return baseThresholds;
  }

  const closeBase = baseThresholds.close ?? 0.55;
  const openBase = baseThresholds.open ?? 0.35;

  if (luminance < 60) {
    // Low-light / underexposed condition:
    // Blendshape closed-eye scores tend to peak lower due to reduced facial contrast.
    // Lower close threshold slightly (e.g., -0.08) to ensure genuine blinks trigger reliably.
    return {
      ...baseThresholds,
      close: Math.max(0.42, Number((closeBase - 0.08).toFixed(2))),
      open: Math.max(0.20, Number((openBase - 0.05).toFixed(2))),
    };
  } else {
    // Overexposed / high-light condition (>195 luminance):
    // Bright glare washes out eye region detail. Lower close threshold slightly (-0.06).
    return {
      ...baseThresholds,
      close: Math.max(0.44, Number((closeBase - 0.06).toFixed(2))),
      open: Math.max(0.22, Number((openBase - 0.04).toFixed(2))),
    };
  }
}
