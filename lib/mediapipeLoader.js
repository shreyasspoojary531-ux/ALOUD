"use client";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

let visionPromise = null;
let filesetPromise = null;
let landmarkerPromise = null;
let handLandmarkerPromise = null;

/**
 * Dynamically imports @mediapipe/tasks-vision and resolves vision tasks fileset.
 * Cached as a singleton promise so it runs once.
 */
export async function getVision() {
  if (!visionPromise) {
    visionPromise = import("@mediapipe/tasks-vision");
  }
  const vision = await visionPromise;

  if (!filesetPromise) {
    filesetPromise = vision.FilesetResolver.forVisionTasks(WASM_URL);
  }
  const fileset = await filesetPromise;

  return { vision, fileset };
}

/**
 * Prefetches WASM and FaceLandmarker task files in background without blocking UI or requesting camera.
 */
export function prefetchMediaPipe() {
  if (typeof window === "undefined") return;
  createFaceLandmarker().catch((err) => {
    console.warn("[MediaPipeLoader] Background prefetch warning:", err);
  });
}

/**
 * Returns a ready FaceLandmarker instance (creates or returns pre-warmed singleton).
 */
export async function createFaceLandmarker() {
  const { vision, fileset } = await getVision();
  if (!landmarkerPromise) {
    landmarkerPromise = vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { delegate: "CPU", modelAssetPath: MODEL_URL },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: true,
    }).catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

/**
 * Returns a ready HandLandmarker instance with tuned confidence thresholds.
 */
export async function createHandLandmarker() {
  const { vision, fileset } = await getVision();
  if (!handLandmarkerPromise) {
    handLandmarkerPromise = vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { delegate: "CPU", modelAssetPath: HAND_MODEL_URL },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.35,
      minHandPresenceConfidence: 0.35,
      minTrackingConfidence: 0.35,
    }).catch((err) => {
      handLandmarkerPromise = null;
      throw err;
    });
  }
  return handLandmarkerPromise;
}
