'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Loader2, Trash2, UserPlus } from 'lucide-react'
import { detectSingleFaceDescriptor, loadFaceModels, type LabeledDescriptor } from '@/lib/face-recognition'
import { addEnrollment, loadEnrolled, removeEnrollment } from '../lib/storage'

const FRAMES_TO_CAPTURE = 3

type Phase = 'idle' | 'loading-models' | 'streaming' | 'capturing' | 'done' | 'error'

export function FaceCaptureCard() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [label, setLabel] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [enrolled, setEnrolled] = useState<LabeledDescriptor[]>([])

  useEffect(() => {
    setEnrolled(loadEnrolled())
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  async function startCamera() {
    setError('')
    setPhase('loading-models')
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
      setPhase('streaming')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Camera failed'
      setError(msg)
      setPhase('error')
    }
  }

  async function captureDescriptors() {
    if (!videoRef.current) return
    if (!label.trim()) {
      setError('Enter a label first')
      return
    }
    setError('')
    setPhase('capturing')
    setProgress(0)

    const captured: Float32Array[] = []
    let attempts = 0
    const maxAttempts = FRAMES_TO_CAPTURE * 4

    while (captured.length < FRAMES_TO_CAPTURE && attempts < maxAttempts) {
      attempts++
      const desc = await detectSingleFaceDescriptor(videoRef.current)
      if (desc) {
        captured.push(desc)
        setProgress(captured.length)
      }
      await new Promise((r) => setTimeout(r, 350))
    }

    if (captured.length < FRAMES_TO_CAPTURE) {
      setError(`Only got ${captured.length}/${FRAMES_TO_CAPTURE} clear frames. Try again with better lighting.`)
      setPhase('streaming')
      return
    }

    const updated = addEnrollment(label.trim(), captured)
    setEnrolled(updated)
    setLabel('')
    setPhase('done')
    setTimeout(() => setPhase('streaming'), 1500)
  }

  function handleRemove(targetLabel: string) {
    const updated = removeEnrollment(targetLabel)
    setEnrolled(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4" /> Face Capture
        </CardTitle>
        <CardDescription>
          Enrol a face by capturing 3 descriptors. Good lighting, look straight at the camera.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {phase === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button onClick={startCamera}>
                <Camera className="h-4 w-4 mr-2" /> Start Camera
              </Button>
            </div>
          )}
          {phase === 'loading-models' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading face models (~6 MB)…
            </div>
          )}
          {phase === 'capturing' && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs px-3 py-2 rounded">
              Capturing {progress}/{FRAMES_TO_CAPTURE} — hold still
            </div>
          )}
          {phase === 'done' && (
            <div className="absolute bottom-2 left-2 right-2 bg-green-600/90 text-white text-xs px-3 py-2 rounded">
              ✓ Saved {FRAMES_TO_CAPTURE} descriptors
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="face-label">Label (e.g. your name)</Label>
          <div className="flex gap-2">
            <Input
              id="face-label"
              value={label}
              placeholder="Vaibhav"
              onChange={(e) => setLabel(e.target.value)}
              disabled={phase !== 'streaming' && phase !== 'done'}
            />
            <Button
              onClick={captureDescriptors}
              disabled={phase !== 'streaming' || !label.trim()}
            >
              <UserPlus className="h-4 w-4 mr-2" /> Enrol
            </Button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        {enrolled.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Enrolled ({enrolled.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {enrolled.map((e) => (
                <span
                  key={e.label}
                  className="inline-flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-md"
                >
                  {e.label}
                  <span className="text-muted-foreground">({e.descriptors.length})</span>
                  <button
                    onClick={() => handleRemove(e.label)}
                    className="text-red-600 hover:text-red-700"
                    aria-label={`Remove ${e.label}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
