import * as faceapi from "face-api.js";

const MODEL_URL = "/models";
export const FACE_MATCH_THRESHOLD = 0.6; // face-api.js recommended cutoff

let modelsPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return modelsPromise;
}

// Returns null unless exactly one face is found — guards against empty frames and group photos.
export async function getFaceDescriptor(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  const detections = await faceapi
    .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();
  if (detections.length !== 1) return null;
  return detections[0].descriptor;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function faceDistance(a: Float32Array, b: Float32Array): number {
  return faceapi.euclideanDistance(a, b);
}
