'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Play, Square } from 'lucide-react'
import {
  detectAllFacesWithDescriptors,
  findBestMatch,
  loadFaceModels,
  MATCH_THRESHOLD,
  type LabeledDescriptor,
} from '@/lib/face-recognition'
import { loadEnrolled } from '../lib/storage'

type Phase = 'idle' | 'loading-models' | 'running' | 'error'

type Detected = { label: string | null; distance: number; box: { x: number; y: number; w: number; h: number } }

export function FaceRecognitionCard() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const enrolledRef = useRef<LabeledDescriptor[]>([])
  const runningRef = useRef(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [detections, setDetections] = useState<Detected[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    return () => stop()
  }, [])

  function stop() {
    runningRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setPhase('idle')
    setDetections([])
  }

  async function start() {
    setError('')
    setPhase('loading-models')
    enrolledRef.current = loadEnrolled()
    if (enrolledRef.current.length === 0) {
      setError('Enrol at least one face first.')
      setPhase('idle')
      return
    }
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
      runningRef.current = true
      setPhase('running')
      void loop()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Camera failed'
      setError(msg)
      setPhase('error')
    }
  }

  async function loop() {
    while (runningRef.current && videoRef.current) {
      const tStart = Date.now()
      try {
        const faces = await detectAllFacesWithDescriptors(videoRef.current)
        const next: Detected[] = faces.map((f) => {
          const match = findBestMatch(f.descriptor, enrolledRef.current)
          const b = f.detection.box
          return {
            label: match?.label ?? null,
            distance: match?.distance ?? -1,
            box: { x: b.x, y: b.y, w: b.width, h: b.height },
          }
        })
        setDetections(next)
        drawOverlay(next)
      } catch (e) {
        // swallow per-frame errors
      }
      const elapsed = Date.now() - tStart
      const wait = Math.max(0, 1000 - elapsed)
      await new Promise((r) => setTimeout(r, wait))
    }
  }

  function drawOverlay(items: Detected[]) {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 3
    ctx.font = '16px sans-serif'

    for (const item of items) {
      const matched = item.label !== null
      ctx.strokeStyle = matched ? '#16a34a' : '#dc2626'
      ctx.fillStyle = matched ? '#16a34a' : '#dc2626'
      ctx.strokeRect(item.box.x, item.box.y, item.box.w, item.box.h)

      const text = matched
        ? `${item.label} (${item.distance.toFixed(2)})`
        : `Unknown${item.distance >= 0 ? ` (${item.distance.toFixed(2)})` : ''}`
      const textWidth = ctx.measureText(text).width
      ctx.fillRect(item.box.x, item.box.y - 22, textWidth + 10, 22)
      ctx.fillStyle = '#fff'
      ctx.fillText(text, item.box.x + 5, item.box.y - 6)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Live Recognition</CardTitle>
        <CardDescription>
          Match threshold: {MATCH_THRESHOLD}. Green box = matched, red = unknown. Runs ~1× per second.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          {phase === 'loading-models' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading models…
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {phase !== 'running' ? (
            <Button onClick={start}>
              <Play className="h-4 w-4 mr-2" /> Start
            </Button>
          ) : (
            <Button variant="destructive" onClick={stop}>
              <Square className="h-4 w-4 mr-2" /> Stop
            </Button>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {phase === 'running' && (
          <div className="text-xs text-muted-foreground">
            Detecting {detections.length} face(s).{' '}
            {detections.map((d, i) => (
              <span key={i} className="ml-1">
                [{d.label ?? 'Unknown'}: {d.distance >= 0 ? d.distance.toFixed(2) : '-'}]
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
