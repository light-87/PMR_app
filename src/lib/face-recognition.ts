// Browser-side face recognition helpers using face-api.js.
// Loads from CDN during Phase 0; flip to '/models' once self-hosted.
'use client'

import * as faceapi from 'face-api.js'

export const FACE_MODELS_URL =
  process.env.NEXT_PUBLIC_FACE_MODELS_URL || 'https://justadudewhohacks.github.io/face-api.js/models'

// Tuned during Phase 0 benchmark. Lower = stricter.
export const MATCH_THRESHOLD = 0.5

let modelsLoaded = false
let loadingPromise: Promise<void> | null = null

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODELS_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS_URL),
    ])
    modelsLoaded = true
  })()

  return loadingPromise
}

export type LabeledDescriptor = {
  label: string
  descriptors: Float32Array[] // multiple descriptors per label improves accuracy
}

export type DetectedFace = {
  detection: faceapi.FaceDetection
  descriptor: Float32Array
}

export async function detectAllFacesWithDescriptors(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<DetectedFace[]> {
  const results = await faceapi
    .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors()

  return results.map((r) => ({ detection: r.detection, descriptor: r.descriptor }))
}

export async function detectSingleFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  const result = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()

  return result?.descriptor ?? null
}

export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  return faceapi.euclideanDistance(a, b)
}

export type MatchResult = {
  label: string
  distance: number
} | null

// Compare a probe descriptor against a set of labelled enrolled descriptors.
// Returns the best label whose minimum distance is below threshold, else null.
export function findBestMatch(
  probe: Float32Array,
  enrolled: LabeledDescriptor[],
  threshold = MATCH_THRESHOLD
): MatchResult {
  let best: { label: string; distance: number } | null = null

  for (const entry of enrolled) {
    for (const desc of entry.descriptors) {
      const distance = euclideanDistance(probe, desc)
      if (!best || distance < best.distance) {
        best = { label: entry.label, distance }
      }
    }
  }

  if (!best || best.distance > threshold) return null
  return best
}

// Float32Array <-> plain array helpers for JSON storage / transport.
export function descriptorToArray(d: Float32Array): number[] {
  return Array.from(d)
}

export function descriptorFromArray(a: number[]): Float32Array {
  return new Float32Array(a)
}
