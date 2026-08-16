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
  const video = useRef(null);
  const callbacks = useRef({ onLongBlink, onBlendshape });
  const [status, setStatus] = useState(
    enabled ? "Starting camera…" : "Eye control is off"
  );
  const [score, setScore] = useState(null);
  const noFaceSince = useRef(0);
  const lastVideoTime = useRef(-1);
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

  const thresholds = calibState || calibration || DEFAULT_BLINK_THRESHOLDS;
  const { ingest, phaseRef } = useBlinkSelect(
    () => callbacks.current.onLongBlink?.(),
    thresholds
  );

  useEffect(() => {
    callbacks.current = { onLongBlink, onBlendshape };
  }, [onLongBlink, onBlendshape]);

  useEffect(() => {
    let stream;
    let landmarker;
    let frame;
    let cancelled = false;

    if (!enabled) {
      setStatus("Eye control is off");
      return;
    }

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("No camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (cancelled) return;
        if (video.current) {
          video.current.srcObject = stream;
          await video.current.play();
        }

        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM);

        if (cancelled) return;
        landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { delegate: "CPU", modelAssetPath: MODEL },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });

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
                const left = shapes.find((x) => x.categoryName === "eyeBlinkLeft")?.score ?? 0;
                const right = shapes.find((x) => x.categoryName === "eyeBlinkRight")?.score ?? 0;
                const blink = (left + right) / 2;

                noFaceSince.current = 0;
                setScore(blink);
                callbacks.current.onBlendshape?.(blink);
                ingest(blink);

                if (typeof window !== "undefined" && (window.DEBUG_BLINK || process.env.NODE_ENV === "development")) {
                  if (Math.random() < 0.05) {
                    console.log(`[BlinkScore] ${blink.toFixed(3)} | Phase: ${phaseRef.current}`);
                  }
                }

                setStatus(
                  phaseRef.current === "resting"
                    ? "Eyes resting — reopen to arm"
                    : phaseRef.current === "closed"
                    ? "Long blink to select…"
                    : "Tracking your eyes"
                );
              } else {
                if (!noFaceSince.current) noFaceSince.current = performance.now();
                if (performance.now() - noFaceSince.current > 2500) {
                  setStatus("Can’t see your eyes clearly — click or press Space");
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
      }
    })();

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      try {
        landmarker?.close?.();
      } catch (e) {}
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
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
