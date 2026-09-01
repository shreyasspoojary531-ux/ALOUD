"use client";
import { useEffect, useRef, useState } from "react";
import useBlinkSelect, { DEFAULT_BLINK_THRESHOLDS } from "./useBlinkSelect";
import useEyebrowSelect, { DEFAULT_EYEBROW_THRESHOLDS } from "./useEyebrowSelect";
import usePalmSelect, { DEFAULT_PALM_THRESHOLDS } from "./usePalmSelect";
import { createFaceLandmarker, createHandLandmarker } from "../../lib/mediapipeLoader";
import { useEyeControl } from "../shared/EyeControlContext";
import { useSettings } from "../shared/SettingsContext";

export default function CameraPill({
  enabled: enabledProp,
  onLongBlink,
  onBlendshape,
  calibration,
  onBlinkOnset,
  onCameraReady,
  onEyebrowShortcut,
  onStreamReady,
  onFaceLandmarks,
}) {
  const ctx = useEyeControl();
  const activeMode = ctx.mode || "blink";
  const { eyebrowShortcut } = useSettings();
  const enabled = enabledProp ?? (activeMode !== "manual");

  const video = useRef(null);
  const callbacks = useRef({
    onLongBlink,
    onBlendshape,
    onBlinkOnset,
    onCameraReady,
    onEyebrowShortcut,
    onStreamReady,
    onFaceLandmarks,
  });
  const activeModeRef = useRef(activeMode);
  activeModeRef.current = activeMode;

  // retryKey increments to force the camera useEffect to re-run cleanly
  const [retryKey, setRetryKey] = useState(0);
  const [status, setStatus] = useState("Starting camera…");
  const [statusType, setStatusType] = useState("normal");
  const statusTypeRef = useRef("normal");
  statusTypeRef.current = statusType;

  const [cameraError, setCameraError] = useState(null); // null | "notreadable" | "denied" | "generic"

  const [minimized, setMinimized] = useState(false);

  // Defer localStorage read & setup BroadcastChannel listener to release camera on request
  useEffect(() => {
    try {
      if (localStorage.getItem("aloud_camera_minimized") === "true") {
        setMinimized(true);
      }
    } catch (e) {}

    let bc = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("aloud_camera_channel");
        bc.onmessage = (e) => {
          if (e.data?.type === "RELEASE_CAMERA") {
            if (video.current?.srcObject) {
              video.current.srcObject.getTracks().forEach((t) => t.stop());
              video.current.srcObject = null;
            }
          }
        };
      }
    } catch (e) {}

    return () => {
      if (bc) bc.close();
    };
  }, []);

  const noDetectionSince = useRef(0);
  const lastVideoTime = useRef(-1);
  const lastTimestampRef = useRef(0);
  const prevHeadPose = useRef(null);
  const motionCooldownUntilRef = useRef(0);

  function computeEAR(landmarks) {
    if (!landmarks || landmarks.length < 468) return null;
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    // Left Eye Landmarks: 33 (outer), 133 (inner), 159/145 (vertical 1), 158/144 (vertical 2)
    const leftV1 = dist(landmarks[159], landmarks[145]);
    const leftV2 = dist(landmarks[158], landmarks[144]);
    const leftH  = dist(landmarks[33],  landmarks[133]);
    const leftEAR = leftH > 0 ? (leftV1 + leftV2) / (2 * leftH) : 0;

    // Right Eye Landmarks: 362 (outer), 263 (inner), 386/374 (vertical 1), 385/373 (vertical 2)
    const rightV1 = dist(landmarks[386], landmarks[374]);
    const rightV2 = dist(landmarks[385], landmarks[373]);
    const rightH  = dist(landmarks[362], landmarks[263]);
    const rightEAR = rightH > 0 ? (rightV1 + rightV2) / (2 * rightH) : 0;

    return (leftEAR + rightEAR) / 2;
  }

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

  const handleEyebrowSelect = () => {
    if (activeModeRef.current === "blink" && callbacks.current.onEyebrowShortcut) {
      callbacks.current.onEyebrowShortcut();
    } else {
      handleSelectConfirmation();
    }
  };

  const blinkSelect = useBlinkSelect(
    handleSelectConfirmation,
    blinkThresholds,
    () => callbacks.current.onBlinkOnset?.()
  );

  const eyebrowSelect = useEyebrowSelect(
    handleEyebrowSelect,
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
    callbacks.current = {
      onLongBlink,
      onBlendshape,
      onBlinkOnset,
      onCameraReady,
      onEyebrowShortcut,
      onStreamReady,
      onFaceLandmarks,
    };
  }, [onLongBlink, onBlendshape, onBlinkOnset, onCameraReady, onEyebrowShortcut, onStreamReady, onFaceLandmarks]);

  useEffect(() => {
    let stream;
    let detector;
    let frame;
    let cancelled = false;

    // Reset state on every attempt (mode change or retry)
    lastVideoTime.current = -1;
    lastTimestampRef.current = 0;
    setCameraError(null);
    setStatus("Starting camera…");
    setStatusType("normal");
    statusTypeRef.current = "normal";

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
        callbacks.current.onStreamReady?.(stream);

        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }

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
            if (ctx.isPaused) {
              if (statusTypeRef.current !== "confidence") {
                setStatus("Paused (Menu open)");
                setStatusType("normal");
                statusTypeRef.current = "normal";
              }
              frame = requestAnimationFrame(tick);
              return;
            }

            if (
              video.current?.readyState >= 2 &&
              video.current.videoWidth > 0 &&
              video.current.currentTime > 0 &&
              video.current.currentTime !== lastVideoTime.current
            ) {
              lastVideoTime.current = video.current.currentTime;

              let timestamp = Math.round(performance.now());
              if (timestamp <= lastTimestampRef.current) {
                timestamp = lastTimestampRef.current + 1;
              }
              lastTimestampRef.current = timestamp;

              let result = null;
              try {
                result = detector?.detectForVideo ? detector.detectForVideo(video.current, timestamp) : null;
              } catch (wasmErr) {
                console.warn("[CameraInit] detectForVideo exception:", wasmErr);
              }

              if (result) {
                detectCount++;
                if (detectCount === 1) {
                  console.log("[CameraInit] Step E: FIRST SUCCESSFUL DETECTION FRAME!", result);
                }
              }

              if (!result) {
                frame = requestAnimationFrame(tick);
                return;
              }

              const currentStatusType = statusTypeRef.current;
              const { blinkSelect: bSel, eyebrowSelect: eSel, palmSelect: pSel } = gestureHooksRef.current;

              if (activeMode === "palm") {
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
                const hasFace = result?.faceLandmarks && result.faceLandmarks.length > 0;
                const shapes = result?.faceBlendshapes?.[0]?.categories;

                if (hasFace && shapes) {
                  noDetectionSince.current = 0;
                  const browLeft = shapes.find((x) => x.categoryName === "browOuterUpLeft")?.score ?? 0;
                  const browRight = shapes.find((x) => x.categoryName === "browOuterUpRight")?.score ?? 0;
                  const browInner = shapes.find((x) => x.categoryName === "browInnerUp")?.score ?? 0;
                  // Use the stronger signal between outer-brow average and inner-brow score
                  const browScore = Math.max((browLeft + browRight) / 2, browInner);

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
                const hasFace = result?.faceLandmarks && result.faceLandmarks.length > 0;
                const shapes = result?.faceBlendshapes?.[0]?.categories;

                if (hasFace && shapes) {
                  const landmarks = result.faceLandmarks[0];
                  callbacks.current.onFaceLandmarks?.(landmarks);
                  const nose = landmarks[1];
                  const leftEyeCorner = landmarks[33];
                  const rightEyeCorner = landmarks[263];

                  let isRawMoving = false;
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
                    isRawMoving = rawMotion > 0.020 || headMotionRef.current > 0.025;
                  }
                  prevHeadPose.current = { nose, leftEye: leftEyeCorner, rightEye: rightEyeCorner };

                  const nowMs = performance.now();
                  if (isRawMoving) {
                    motionCooldownUntilRef.current = nowMs + 400; // 400ms cooldown after head motion
                  }
                  const isHeadMoving = isRawMoving || nowMs < motionCooldownUntilRef.current;

                  const ear = computeEAR(landmarks);

                  const left = shapes.find((x) => x.categoryName === "eyeBlinkLeft")?.score ?? 0;
                  const right = shapes.find((x) => x.categoryName === "eyeBlinkRight")?.score ?? 0;
                  const blink = (left + right) / 2;

                  currentGestureScoreRef.current = blink;
                  noDetectionSince.current = 0;
                  callbacks.current.onBlendshape?.(blink);

                  bSel.ingest(blink, { isMoving: isHeadMoving, ear });

                  // Opt-in eyebrow shortcut: monitor eyebrow raise concurrently when enabled on Spell screen
                  if (eyebrowShortcut && callbacks.current.onEyebrowShortcut) {
                    const browLeft = shapes.find((x) => x.categoryName === "browOuterUpLeft")?.score ?? 0;
                    const browRight = shapes.find((x) => x.categoryName === "browOuterUpRight")?.score ?? 0;
                    const browInner = shapes.find((x) => x.categoryName === "browInnerUp")?.score ?? 0;
                    const browScore = Math.max((browLeft + browRight) / 2, browInner);
                    eSel.ingest(browScore, { isMoving: isHeadMoving });
                  }

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
                  callbacks.current.onFaceLandmarks?.(null);
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
        if (cancelled) return;

        // Stop any partially-acquired stream tracks before surfacing the error,
        // so the OS releases the camera hardware and a retry can succeed.
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          stream = null;
        }

        const errorName = err.name || "";
        console.error("[CameraPill] Camera error:", errorName, err.message);

        if (errorName === "NotReadableError" || errorName === "OverconstrainedError") {
          // Camera hardware busy (another tab / OS app has it locked)
          setCameraError("notreadable");
          setStatus("Camera in use by another app");
        } else if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
          setCameraError("denied");
          setStatus("Camera permission denied");
        } else {
          setCameraError("generic");
          setStatus("Camera unavailable");
        }

        setStatusType("warning");
        statusTypeRef.current = "warning";
        callbacks.current.onCameraReady?.(false);
      }
    })();

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      if (stream) {
        // Fully stop all tracks so OS releases the camera before the next attempt
        stream.getTracks().forEach((t) => t.stop());
      }
      if (video.current) {
        video.current.srcObject = null;
      }
      if (confidenceTimeoutRef.current) clearTimeout(confidenceTimeoutRef.current);
    };
  }, [enabled, activeMode, retryKey]); // retryKey causes a clean re-run on Retry click

  // Retry: stop current stream, clear error state, force effect to re-run
  const handleRetry = () => {
    // Explicitly stop any lingering tracks before re-requesting
    if (video.current?.srcObject) {
      video.current.srcObject.getTracks().forEach((t) => t.stop());
      video.current.srcObject = null;
    }
    setRetryKey((k) => k + 1);
  };

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

      {/* Retry button — only shown when there's a camera error */}
      {cameraError && (
        <button
          type="button"
          className="camera-retry-btn"
          onClick={handleRetry}
          aria-label="Retry camera"
        >
          Retry camera
        </button>
      )}

      {/* Specific guidance text per error type */}
      {cameraError === "notreadable" && (
        <p className="camera-error-hint">
          Close other apps using your camera, then retry.
        </p>
      )}
      {cameraError === "denied" && (
        <p className="camera-error-hint">
          Allow camera access in your browser settings, then retry.
        </p>
      )}
    </aside>
  );
}
