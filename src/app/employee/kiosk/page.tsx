'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Play, Square, UserCheck, AlertTriangle } from 'lucide-react'
import {
  detectAllFacesWithDescriptors,
  loadFaceModels,
  descriptorToArray,
} from '@/lib/face-recognition'

type Status = 'idle' | 'loading' | 'running' | 'error'

type Toast =
  | { kind: 'matched'; name: string; distance: number; t: number }
  | { kind: 'missed'; descriptor: number[]; t: number }

type EmployeeOption = { id: string; name: string }

const COOLDOWN_MS = 30_000 // don't re-mark same employee within 30s

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const runningRef = useRef(false)
  const lastMarkedAtRef = useRef<Map<string, number>>(new Map())

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [assignTarget, setAssignTarget] = useState<string>('')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    void loadEmployees()
    return () => stop()
  }, [])

  async function loadEmployees() {
    try {
      const res = await fetch('/api/employee')
      const json = await res.json()
      if (json.success) {
        setEmployees(json.data.map((e: { id: string; name: string }) => ({ id: e.id, name: e.name })))
      }
    } catch {}
  }

  function stop() {
    runningRef.current = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('idle')
  }

  async function start() {
    setError('')
    setStatus('loading')
    try {
      await loadFaceModels()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      runningRef.current = true
      setStatus('running')
      void loop()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera failed')
      setStatus('error')
    }
  }

  async function loop() {
    while (runningRef.current && videoRef.current) {
      const t0 = Date.now()
      try {
        const faces = await detectAllFacesWithDescriptors(videoRef.current)
        drawOverlay(faces.map((f) => f.detection.box))

        // Pick the largest face (closest to camera) to scan against the API.
        if (faces.length > 0) {
          faces.sort((a, b) => b.detection.box.area - a.detection.box.area)
          const probe = descriptorToArray(faces[0].descriptor)
          await scanOnce(probe)
        }
      } catch (e) {
        // swallow per-frame errors
      }
      // ~1 scan/sec
      const elapsed = Date.now() - t0
      await new Promise((r) => setTimeout(r, Math.max(0, 1000 - elapsed)))
    }
  }

  async function scanOnce(descriptor: number[]) {
    try {
      const res = await fetch('/api/employee/attendance/face-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor }),
      })
      const json = await res.json()
      if (json.success && json.matched) {
        const empId = json.data.employee.id
        const now = Date.now()
        const last = lastMarkedAtRef.current.get(empId) ?? 0
        if (now - last < COOLDOWN_MS) return // suppress duplicate within cooldown
        lastMarkedAtRef.current.set(empId, now)
        setToast({
          kind: 'matched',
          name: json.data.employee.name,
          distance: json.data.distance,
          t: now,
        })
      } else if (res.status === 404) {
        setToast({ kind: 'missed', descriptor, t: Date.now() })
      }
    } catch {}
  }

  async function assign() {
    if (!toast || toast.kind !== 'missed' || !assignTarget) return
    setAssigning(true)
    try {
      const res = await fetch('/api/employee/attendance/face-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor: toast.descriptor, employeeId: assignTarget }),
      })
      const json = await res.json()
      if (!json.success) {
        alert(json.error || 'Assign failed')
        return
      }
      setToast({
        kind: 'matched',
        name: json.data.employee.name,
        distance: 0,
        t: Date.now(),
      })
      setAssignTarget('')
    } finally {
      setAssigning(false)
    }
  }

  function drawOverlay(boxes: { x: number; y: number; width: number; height: number }[]) {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 3
    ctx.strokeStyle = '#22c55e'
    for (const b of boxes) ctx.strokeRect(b.x, b.y, b.width, b.height)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Kiosk</h1>
        {status === 'running' ? (
          <Button onClick={stop} variant="destructive" size="sm">
            <Square className="h-4 w-4 mr-2" /> Stop
          </Button>
        ) : (
          <Button onClick={start} disabled={status === 'loading'} size="sm">
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start
          </Button>
        )}
      </div>

      <div className="rounded-lg overflow-hidden bg-black relative aspect-[3/4] sm:aspect-video min-h-[60vh] sm:min-h-[70vh]">
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading face models…
          </div>
        )}

        {toast?.kind === 'matched' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-green-600/95 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            <div>
              <div className="font-semibold">{toast.name} marked present</div>
              <div className="text-xs opacity-90">
                {new Date(toast.t).toLocaleTimeString('en-IN')}
                {toast.distance > 0 && ` · distance ${toast.distance.toFixed(2)}`}
              </div>
            </div>
          </div>
        )}
      </div>

      {toast?.kind === 'missed' && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">No matching face</div>
                <div className="text-xs text-muted-foreground">
                  Pick the correct employee — this captured face will be added to their samples
                  and they&apos;ll be marked present today. Future scans should auto-match.
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={assignTarget} onValueChange={setAssignTarget}>
                <SelectTrigger className="sm:max-w-sm">
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={assign} disabled={!assignTarget || assigning}>
                {assigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Assign &amp; mark
              </Button>
              <Button variant="outline" onClick={() => setToast(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
