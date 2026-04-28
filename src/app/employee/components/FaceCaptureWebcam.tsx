'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2 } from 'lucide-react'
import {
  detectSingleFaceDescriptor,
  loadFaceModels,
  descriptorToArray,
} from '@/lib/face-recognition'

const FRAMES_TO_CAPTURE = 3

type Phase = 'idle' | 'loading-models' | 'streaming' | 'capturing' | 'done' | 'error'

type Props = {
  // Called when capture finishes successfully with FRAMES_TO_CAPTURE descriptors.
  onCaptured: (descriptors: number[][]) => void
  buttonLabel?: string
}

// Webcam capture widget — captures 3 face descriptors in a row, then hands them off
// to the parent. No persistence here; parent decides what to do with the array.
export function FaceCaptureWebcam({ onCaptured, buttonLabel = 'Capture face' }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => stopCamera()
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
      setError(e instanceof Error ? e.message : 'Camera failed')
      setPhase('error')
    }
  }

  async function capture() {
    if (!videoRef.current) return
    setError('')
    setPhase('capturing')
    setProgress(0)

    const captured: number[][] = []
    let attempts = 0
    const maxAttempts = FRAMES_TO_CAPTURE * 4

    while (captured.length < FRAMES_TO_CAPTURE && attempts < maxAttempts) {
      attempts++
      const desc = await detectSingleFaceDescriptor(videoRef.current)
      if (desc) {
        captured.push(descriptorToArray(desc))
        setProgress(captured.length)
      }
      await new Promise((r) => setTimeout(r, 350))
    }

    if (captured.length < FRAMES_TO_CAPTURE) {
      setError(
        `Only got ${captured.length}/${FRAMES_TO_CAPTURE} clear frames. Better lighting / face the camera straight.`
      )
      setPhase('streaming')
      return
    }

    setPhase('done')
    onCaptured(captured)
    setTimeout(() => setPhase('streaming'), 1500)
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        {phase === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button type="button" onClick={startCamera}>
              <Camera className="h-4 w-4 mr-2" /> Start Camera
            </Button>
          </div>
        )}
        {phase === 'loading-models' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading face models…
          </div>
        )}
        {phase === 'capturing' && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs px-3 py-2 rounded">
            Capturing {progress}/{FRAMES_TO_CAPTURE} — hold still
          </div>
        )}
        {phase === 'done' && (
          <div className="absolute bottom-2 left-2 right-2 bg-green-600/90 text-white text-xs px-3 py-2 rounded">
            ✓ Captured {FRAMES_TO_CAPTURE} descriptors
          </div>
        )}
      </div>

      {phase === 'streaming' || phase === 'done' || phase === 'capturing' ? (
        <Button type="button" onClick={capture} disabled={phase !== 'streaming'}>
          <Camera className="h-4 w-4 mr-2" /> {buttonLabel}
        </Button>
      ) : null}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
