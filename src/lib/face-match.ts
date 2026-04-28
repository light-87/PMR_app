// Server-safe face descriptor match — pure math, no face-api.js (which needs DOM globals).

export const SERVER_MATCH_THRESHOLD = 0.5

export function euclidean(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

export type Candidate = {
  employeeId: string
  descriptors: number[][] // each is 128 floats
}

export type ServerMatch = {
  employeeId: string
  distance: number
}

// 1-to-N match: return best candidate whose minimum distance is below threshold.
export function findBestEmployeeMatch(
  probe: number[],
  candidates: Candidate[],
  threshold = SERVER_MATCH_THRESHOLD
): ServerMatch | null {
  let best: ServerMatch | null = null
  for (const c of candidates) {
    for (const desc of c.descriptors) {
      const d = euclidean(probe, desc)
      if (!best || d < best.distance) {
        best = { employeeId: c.employeeId, distance: d }
      }
    }
  }
  if (!best || best.distance > threshold) return null
  return best
}
