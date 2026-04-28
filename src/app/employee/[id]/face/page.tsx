'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { FaceCaptureWebcam } from '../../components/FaceCaptureWebcam'

export default function FaceReEnrollPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [descriptors, setDescriptors] = useState<number[][]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [replace, setReplace] = useState(false)

  async function save() {
    if (descriptors.length === 0) {
      setError('Capture at least once before saving')
      return
    }
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/employee/${id}/face`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptors, replace }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || 'Failed')
        return
      }
      router.push(`/employee/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Link
        href={`/employee/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-xl font-bold">Re-enrol face</h1>
      <p className="text-sm text-muted-foreground">
        Captures 3 new descriptors. By default they&apos;re appended (improving accuracy across
        lighting/angles). Tick &quot;Replace&quot; to discard old samples and start fresh.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Capture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FaceCaptureWebcam onCaptured={(d) => setDescriptors((prev) => [...prev, ...d])} />
          {descriptors.length > 0 && (
            <p className="text-xs text-green-700">
              ✓ {descriptors.length} new descriptor(s) captured.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace existing descriptors (otherwise append)
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={save} disabled={busy || descriptors.length === 0}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save {descriptors.length} new sample(s)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
