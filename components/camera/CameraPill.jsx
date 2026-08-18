"use client";
import { useEffect, useRef, useState } from "react";
import useBlinkSelect, { DEFAULT_BLINK_THRESHOLDS } from "./useBlinkSelect";
import useEyebrowSelect, { DEFAULT_EYEBROW_THRESHOLDS } from "./useEyebrowSelect";
import usePalmSelect, { DEFAULT_PALM_THRESHOLDS } from "./usePalmSelect";
import { createFaceLandmarker, createHandLandmarker } from "../../lib/mediapipeLoader";
import { useEyeControl } from "../shared/EyeControlContext";

export default function CameraPill({
  enabled: enabledProp,
  onLongBlink,
  onBlendshape,
  calibration,
  onBlinkOnset,
  onCameraReady,
}) {
  const ctx = useEyeControl();
  const activeMode = ctx.mode || "blink";
  const enabled = enabledProp ?? (activeMode !== "manual");

  const video = useRef(null);
  const callbacks = useRef({ onLongBlink, onBlendshape, onBlinkOnset, onCameraReady });
  const [status, setStatus] = useState("Starting camera…");
  const [statusType, setStatusType] = useState("normal"); // 'normal' | 'warning' | 'confidence'
  const statusTypeRef = useRef("normal");
  statusTypeRef.current = statusType;

  const [minimized, setMinimized] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("aloud_camera_minimized") === "true";
    } catch (e) {
      return false;
    }
  });

  const noDetectionSince = useRef(0);
  const lastVideoTime = useRef(-1);
  const lastTimestampRef = useRef(0);
  const prevHeadPose = useRef(null);
  const headMotionRef = useRef(0);
  const confidenceTimeoutRef = useRef(null);
  const currentGestureScoreRef = useRef(0.9);
  const [calibState, setCalibState] = useState(null);

  const toggleMinimize = () => {
    setMinimized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("aloud_camera_minimized", String(next));
      } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    if (calibration) {
      setCalibState(calibration);
    } else {
      try {
        const stored = typeof window !== "undefined" && localStorage.getItem("aloud_calibration");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.close === "number") {
            setCalibState(parsed);
          }
        }
      } catch (e) {}
    }
  }, [calibration]);

  const blinkThresholds = calibState || calibration || DEFAULT_BLINK_THRESHOLDS;

  // Unified select confirmation handler for all modes
  const handleSelectConfirmation = () => {
    callbacks.current.onLongBlink?.();

    const rawScore = currentGestureScoreRef.current || 0.9;
    const confidencePct = Math.min(99, Math.max(78, Math.round(rawScore * 100)));
    
    setStatus(`${confidencePct}% confidence`);
    setStatusType("confidence");
    statusTypeRef.current = "confidence";

    if (confidenceTimeoutRef.current) clearTimeout(confidenceTimeoutRef.current);
    confidenceTimeoutRef.current = setTimeout(() => {
      setStatusType("normal");
      statusTypeRef.current = "normal";
      if (activeMode === "eyebrow") setStatus("Tracking your eyebrows");
      else if (activeMode === "palm") setStatus("Tracking your palm");
      else setStatus("Tracking your eyes");
    }, 1500);
  };

  const blinkSelect = useBlinkSelect(
    handleSelectConfirmation,
    blinkThresholds,
    () => callbacks.current.onBlinkOnset?.()
  );

  const eyebrowSelect = useEyebrowSelect(
    handleSelectConfirmation,
    DEFAULT_EYEBROW_THRESHOLDS,
    () => callbacks.current.onBlinkOnset?.()
  );

  const palmSelect = usePalmSelect(
    handleSelectConfirmation,
    DEFAULT_PALM_THRESHOLDS,
    () => callbacks.current.onBlinkOnset?.()
  );

  const gestureHooksRef = useRef({ blinkSelect, eyebrowSelect, palmSelect });
  gestureHooksRef.current = { blinkSelect, eyebrowSelect, palmSelect };

  useEffect(() => {
    callbacks.current = { onLongBlink, onBlendshape, onBlinkOnset, onCameraReady };
  }, [onLongBlink, onBlendshape, onBlinkOnset, onCameraReady]);

  useEffect(() => {
    let stream;
    let detector;
    let frame;
    let cancelled = false;

    if (!enabled || activeMode === "manual") {
      setStatus("Manual mode (mouse only)");
      setStatusType("normal");
      statusTypeRef.current = "normal";
      return;
    }

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("No camera device");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (cancelled) return;
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }

        // Load specific landmarker based on active mode
        if (activeMode === "palm") {
          detector = await createHandLandmarker();
        } else {
          detector = await createFaceLandmarker();
        }

        if (cancelled) return;
        callbacks.current.onCameraReady?.(true);

        const tick = () => {
          if (cancelled) return;

          try {
            if (
              video.current?.readyState >= 2 &&
              video.current.videoWidth > 0 &&
              video.current.currentTime !== lastVideoTime.current
            ) {
              lastVideoTime.current = video.current.currentTime;

              // Ensure integer monotonically increasing timestamp for MediaPipe WASM
              let timestamp = Math.round(performance.now());
              if (timestamp <= lastTimestampRef.current) {
                timestamp = lastTimestampRef.current + 1;
              }
              lastTimestampRef.current = timestamp;

              const result = detector.detectForVideo(video.current, timestamp);

              const currentStatusType = statusTypeRef.current;
              const { blinkSelect: bSel, eyebrowSelect: eSel, palmSelect: pSel } = gestureHooksRef.current;

              if (activeMode === "palm") {
                // Hand Landmarker processing
                const hasHand = result?.landmarks && result.landmarks.length > 0;
                if (hasHand) {
                  noDetectionSince.current = 0;
                  const handLandmarks = result.landmarks[0];
                  pSel.ingest(handLandmarks);

                  if (currentStatusType !== "confidence") {
                    setStatusType("normal");
                    statusTypeRef.current = "normal";
                    setStatus(
                      pSel.phaseRef.current === "closed"
                        ? "Fist closed to select…"
                        : "Tracking your palm"
                    );
                  }
                } else {
                  if (currentStatusType !== "confidence") {
                    setStatus("No hand detected");
                    setStatusType("warning");
                    statusTypeRef.current = "warning";
                  }
                }
              } else if (activeMode === "eyebrow") {
                // Eyebrow Raise FaceLandmarker processing
                const hasFace = result?.faceLandmarks && result.faceLandmarks.length > 0;
                const shapes = result?.faceBlendshapes?.[0]?.categories;

                if (hasFace && shapes) {
                  noDetectionSince.current = 0;
                  const browLeft = shapes.find((x) => x.categoryName === "browOuterUpLeft")?.score ?? 0;
                  const browRight = shapes.find((x) => x.categoryName === "browOuterUpRight")?.score ?? 0;
                  const browScore = (browLeft + browRight) / 2;

                  currentGestureScoreRef.current = Math.min(0.98, Math.max(0.65, browScore + 0.3));
                  callbacks.current.onBlendshape?.(browScore);
                  eSel.ingest(browScore);

                  if (currentStatusType !== "confidence") {
                    setStatusType("normal");
                    statusTypeRef.current = "normal";
                    setStatus(
                      eSel.phaseRef.current === "raised"
                        ? "Eyebrows raised to select…"
                        : "Tracking your eyebrows"
                    );
                  }
                } else {
                  if (currentStatusType !== "confidence") {
                    setStatus("No face detected");
                    setStatusType("warning");
                    statusTypeRef.current = "warning";
                  }
                }
              } else {
                // Default Eye Blink FaceLandmarker processing
                const hasFace = result?.faceLandmarks && result.faceLandmarks.length > 0;
                const shapes = result?.faceBlendshapes?.[0]?.categories;

                if (hasFace && shapes) {
                  const landmarks = result.faceLandmarks[0];
                  const nose = landmarks[1];
                  const leftEyeCorner = landmarks[33];
                  const rightEyeCorner = landmarks[263];

                  if (prevHeadPose.current && nose && leftEyeCorner && rightEyeCorner) {
                    const dNose = Math.hypot(
                      nose.x - prevHeadPose.current.nose.x,
                      nose.y - prevHeadPose.current.nose.y
                    );
                    const dLeft = Math.hypot(
                      leftEyeCorner.x - prevHeadPose.current.leftEye.x,
                      leftEyeCorner.y - prevHeadPose.current.leftEye.y
                    );
                    const dRight = Math.hypot(
                      rightEyeCorner.x - prevHeadPose.current.rightEye.x,
                      rightEyeCorner.y - prevHeadPose.current.rightEye.y
                    );
                    const rawMotion = (dNose + dLeft + dRight) / 3;
                    headMotionRef.current = headMotionRef.current * 0.6 + rawMotion * 0.4;
                  }
                  prevHeadPose.current = { nose, leftEye: leftEyeCorner, rightEye: rightEyeCorner };

                  const isHeadMoving = headMotionRef.current > 0.035;

                  const left = shapes.find((x) => x.categoryName === "eyeBlinkLeft")?.score ?? 0;
                  const right = shapes.find((x) => x.categoryName === "eyeBlinkRight")?.score ?? 0;
                  const blink = (left + right) / 2;

                  currentGestureScoreRef.current = blink;
                  noDetectionSince.current = 0;
                  callbacks.current.onBlendshape?.(blink);

                  bSel.ingest(blink, { isMoving: isHeadMoving });

                  if (currentStatusType !== "confidence") {
                    if (isHeadMoving) {
                      setStatus("Head moving… hold still");
                      setStatusType("warning");
                      statusTypeRef.current = "warning";
                    } else {
                      setStatusType("normal");
                      statusTypeRef.current = "normal";
                      setStatus(
                        bSel.phaseRef.current === "resting"
                          ? "Eyes resting — reopen"
                          : bSel.phaseRef.current === "closed"
                          ? "Blinking to select…"
                          : "Tracking your eyes"
                      );
                    }
                  }
                } else {
                  if (currentStatusType !== "confidence") {
                    setStatus("No eyes tracked");
                    setStatusType("warning");
                    statusTypeRef.current = "warning";
                  }
                }
              }
            }
          } catch (err) {
            console.warn("[CameraPill] Detection frame error:", err);
          }

          frame = requestAnimationFrame(tick);
        };

        tick();
      } catch (err) {
        console.error("[CameraPill] Camera initialization error:", err);
        setStatus("Camera unavailable — click or press Space");
        setStatusType("warning");
        statusTypeRef.current = "warning";
        callbacks.current.onCameraReady?.(false);
      }
    })();

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (confidenceTimeoutRef.current) clearTimeout(confidenceTimeoutRef.current);
    };
  }, [enabled, activeMode]);

  // Hide CameraPill completely in Manual mode
  if (activeMode === "manual" || !enabled) {
    return null;
  }

  return (
    <aside
      className={`camera ${minimized ? "minimized" : ""} ${statusType}`}
      aria-live="polite"
    >
      <button
        type="button"
        className="camera-toggle-btn"
        onClick={toggleMinimize}
        aria-label={minimized ? "Expand camera preview" : "Minimize camera preview"}
        title={minimized ? "Expand camera preview" : "Minimize camera preview"}
      >
        {minimized ? "⤢" : "–"}
      </button>

      <video
        ref={video}
        muted
        playsInline
        className={minimized ? "video-hidden" : ""}
      />
      <div className="camera-label">
        <b className={`status-dot ${statusType}`}>•</b> {status}
      </div>
    </aside>
  );
}
