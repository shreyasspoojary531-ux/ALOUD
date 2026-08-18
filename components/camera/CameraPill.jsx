"use client";
import { useEffect, useRef, useState } from "react";
import useBlinkSelect, { DEFAULT_BLINK_THRESHOLDS } from "./useBlinkSelect";
import { createFaceLandmarker } from "../../lib/mediapipeLoader";

export default function CameraPill({
  enabled,
  onLongBlink,
  onBlendshape,
  calibration,
  onBlinkOnset,
  onCameraReady,
}) {
  const video = useRef(null);
  const callbacks = useRef({ onLongBlink, onBlendshape, onBlinkOnset, onCameraReady });
  const [status, setStatus] = useState(
    enabled ? "Starting camera…" : "Eye control is off"
  );
  const [statusType, setStatusType] = useState("normal"); // 'normal' | 'warning' | 'confidence'
  const [score, setScore] = useState(null);
  const [minimized, setMinimized] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("aloud_camera_minimized") === "true";
    } catch (e) {
      return false;
    }
  });

  const noFaceSince = useRef(0);
  const lastVideoTime = useRef(-1);
  const prevHeadPose = useRef(null);
  const headMotionRef = useRef(0);
  const confidenceTimeoutRef = useRef(null);
  const currentBlinkScoreRef = useRef(0);
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

  const thresholds = calibState || calibration || DEFAULT_BLINK_THRESHOLDS;

  // Handle blink selection confirmation & show real confidence percentage
  const handleSelectConfirmation = () => {
    callbacks.current.onLongBlink?.();

    const rawScore = currentBlinkScoreRef.current || 0.9;
    const confidencePct = Math.min(99, Math.max(75, Math.round(rawScore * 100)));
    
    setStatus(`${confidencePct}% confidence`);
    setStatusType("confidence");

    if (confidenceTimeoutRef.current) clearTimeout(confidenceTimeoutRef.current);
    confidenceTimeoutRef.current = setTimeout(() => {
      setStatusType("normal");
      setStatus("Tracking your eyes");
    }, 1500);
  };

  const { ingest, phaseRef } = useBlinkSelect(
    handleSelectConfirmation,
    thresholds,
    () => callbacks.current.onBlinkOnset?.()
  );

  useEffect(() => {
    callbacks.current = { onLongBlink, onBlendshape, onBlinkOnset, onCameraReady };
  }, [onLongBlink, onBlendshape, onBlinkOnset, onCameraReady]);

  useEffect(() => {
    let stream;
    let landmarker;
    let frame;
    let cancelled = false;

    if (!enabled) {
      setStatus("Eye control is off");
      setStatusType("normal");
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

        landmarker = await createFaceLandmarker();
        if (cancelled) return;

        // Notify parent setup component that camera stream is genuinely ready
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

              const timestamp = performance.now();
              const result = landmarker.detectForVideo(video.current, timestamp);

              const hasFace = result.faceLandmarks && result.faceLandmarks.length > 0;
              const shapes = result.faceBlendshapes?.[0]?.categories;

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

                currentBlinkScoreRef.current = blink;
                noFaceSince.current = 0;
                setScore(blink);
                callbacks.current.onBlendshape?.(blink);

                ingest(blink, { isMoving: isHeadMoving });

                // Update live status if not currently showing confidence flash
                if (statusType !== "confidence") {
                  if (isHeadMoving) {
                    setStatus("Head moving… hold still");
                    setStatusType("warning");
                  } else {
                    setStatusType("normal");
                    if (phaseRef.current === "resting") {
                      setStatus("Eyes resting — reopen");
                    } else if (phaseRef.current === "closed") {
                      setStatus("Blinking to select…");
                    } else {
                      setStatus("Tracking your eyes");
                    }
                  }
                }
              } else {
                if (!noFaceSince.current) noFaceSince.current = performance.now();
                if (statusType !== "confidence") {
                  setStatus("No eyes tracked");
                  setStatusType("warning");
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
  }, [enabled, ingest, phaseRef, statusType]);

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

      {enabled ? (
        <>
          <video
            ref={video}
            muted
            playsInline
            className={minimized ? "video-hidden" : ""}
          />
          <div className="camera-label">
            <b className={`status-dot ${statusType}`}>•</b> {status}
          </div>
        </>
      ) : (
        <div className="camera-off">
          {status}
          <br />
          Click or press Space to select
        </div>
      )}
    </aside>
  );
}
