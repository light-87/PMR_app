'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Camera, Loader2, Trash2 } from 'lucide-react'
import {
  detectSingleFaceDescriptor,
  euclideanDistance,
  loadFaceModels,
  MATCH_THRESHOLD,
} from '@/lib/face-recognition'

type Sample = { id: number; descriptor: Float32Array }

export function BenchmarkCard() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [streaming, setStreaming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [samples, setSamples] = useState<Sample[]>([])
  const [error, setError] = useState('')
  const idCounter = useRef(0)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function start() {
    setError('')
    setBusy(true)
    try {
      await loadFaceModels()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStreaming(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera failed')
    } finally {
      setBusy(false)
    }
  }

  async function capture() {
    if (!videoRef.current) return
    setBusy(true)
    setError('')
    try {
      const desc = await detectSingleFaceDescriptor(videoRef.current)
      if (!desc) {
        setError('No face detected. Try again.')
        return
      }
      idCounter.current++
      setSamples((s) => [...s, { id: idCounter.current, descriptor: desc }])
    } finally {
      setBusy(false)
    }
  }

  function clear() {
    setSamples([])
  }

  // Pairwise distances of same-person samples → low values (intra-class).
  const distances: number[] = []
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      distances.push(euclideanDistance(samples[i].descriptor, samples[j].descriptor))
    }
  }
  const min = distances.length ? Math.min(...distances) : null
  const max = distances.length ? Math.max(...distances) : null
  const avg = distances.length ? distances.reduce((a, b) => a + b, 0) / distances.length : null

  // Recommendation: threshold should be just above max intra-class distance, with a margin.
  const recommended = max !== null ? Math.min(0.6, +(max + 0.05).toFixed(2)) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" /> Threshold Benchmark
        </CardTitle>
        <CardDescription>
          Capture {`>=`} 5 samples of the SAME person at different angles/lighting. Lower distance =
          more similar. Set MATCH_THRESHOLD just above the max intra-person distance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          {!streaming && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button onClick={start} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                Start Camera
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={capture} disabled={!streaming || busy}>
            <Camera className="h-4 w-4 mr-2" /> Capture sample ({samples.length})
          </Button>
          <Button onClick={clear} disabled={samples.length === 0} variant="outline">
            <Trash2 className="h-4 w-4 mr-2" /> Clear
          </Button>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {samples.length >= 2 && (
          <div className="rounded-md border p-3 text-xs space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="min" value={min} />
              <Stat label="avg" value={avg} />
              <Stat label="max" value={max} />
            </div>
            <div className="text-muted-foreground">
              {distances.length} pairwise distances across {samples.length} samples.
            </div>
            <div className="pt-2 border-t">
              <div>Current MATCH_THRESHOLD: <strong>{MATCH_THRESHOLD}</strong></div>
              {recommended !== null && (
                <div>
                  Recommended for this lighting:{' '}
                  <strong className="text-green-700">{recommended.toFixed(2)}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded bg-muted/50 px-2 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono">{value === null ? '—' : value.toFixed(3)}</div>
    </div>
  )
}
