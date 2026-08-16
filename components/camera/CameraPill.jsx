"use client";
import { useEffect, useRef, useState } from "react";
import useBlinkSelect, { DEFAULT_BLINK_THRESHOLDS } from "./useBlinkSelect";
const MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
export default function CameraPill({
  enabled,
  onLongBlink,
  onBlendshape,
  calibration,
}) {
  const video = useRef(null),
    callbacks = useRef({ onLongBlink, onBlendshape }),
    [status, setStatus] = useState(
      enabled ? "Starting camera…" : "Eye control is off",
    ),
    [score, setScore] = useState(null),
    noFaceSince = useRef(0);
  const [calibState, setCalibState] = useState(null);

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

  const thresholds = calibState || calibration || DEFAULT_BLINK_THRESHOLDS,
    { ingest, phaseRef } = useBlinkSelect(
      () => callbacks.current.onLongBlink?.(),
      thresholds,
    );
  useEffect(() => {
    callbacks.current = { onLongBlink, onBlendshape };
  }, [onLongBlink, onBlendshape]);
  useEffect(() => {
    let stream,
      landmarker,
      frame,
      cancelled = false;
    if (!enabled) {
      setStatus("Eye control is off");
      return;
    }
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Error("No camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (cancelled) return;
        video.current.srcObject = stream;
        await video.current.play();
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
        landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { delegate: "CPU", modelAssetPath: MODEL },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
        const tick = () => {
          if (cancelled) return;
          if (video.current?.readyState >= 2 && video.current.videoWidth) {
            const result = landmarker.detectForVideo(
                video.current,
                performance.now(),
              ),
              shapes = result.faceBlendshapes?.[0]?.categories;
            if (shapes) {
              const left =
                  shapes.find((x) => x.categoryName === "eyeBlinkLeft")
                    ?.score ?? 0,
                right =
                  shapes.find((x) => x.categoryName === "eyeBlinkRight")
                    ?.score ?? 0,
                blink = (left + right) / 2;
              noFaceSince.current = 0;
              setScore(blink);
              callbacks.current.onBlendshape?.(blink);
              ingest(blink);
              if (typeof window !== "undefined" && (window.DEBUG_BLINK || process.env.NODE_ENV === "development")) {
                if (Math.random() < 0.05) { // log periodically to prevent spamming
                  console.log(`[BlinkScore] ${blink.toFixed(3)} | Phase: ${phaseRef.current}`);
                }
              }
              setStatus(
                phaseRef.current === "resting"
                  ? "Eyes resting — reopen to arm"
                  : phaseRef.current === "closed"
                    ? "Long blink to select…"
                    : "Tracking your eyes",
              );
            } else {
              noFaceSince.current ||= performance.now();
              if (performance.now() - noFaceSince.current > 3000)
                setStatus("Face not detected — click or press Space");
            }
          }
          frame = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setStatus("Camera unavailable — click or press Space");
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      landmarker?.close?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, ingest, phaseRef]);
  return (
    <aside className="camera" aria-live="polite">
      {enabled ? (
        <>
          <video ref={video} muted playsInline />
          <div className="camera-label">
            <b>•</b> {status}
            {score !== null && process.env.NODE_ENV === "development"
              ? ` (${score.toFixed(2)})`
              : ""}
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
