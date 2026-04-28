'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { ArrowLeft, BarChart3, Bell, Camera, FlaskConical, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FaceCaptureCard } from './components/FaceCaptureCard'
import { FaceRecognitionCard } from './components/FaceRecognitionCard'
import { PushTestCard } from './components/PushTestCard'
import { BenchmarkCard } from './components/BenchmarkCard'
import { FlowTestCard } from './components/FlowTestCard'

type Tab = 'face' | 'recognise' | 'push' | 'benchmark' | 'flow'

const TABS: { id: Tab; label: string; icon: typeof Camera }[] = [
  { id: 'face', label: 'Face Capture', icon: Camera },
  { id: 'recognise', label: 'Live Recognition', icon: FlaskConical },
  { id: 'push', label: 'Web Push', icon: Bell },
  { id: 'benchmark', label: 'Benchmark', icon: BarChart3 },
  { id: 'flow', label: 'Flow Test', icon: Workflow },
]

export default function PayrollLabPage() {
  const [tab, setTab] = useState<Tab>('face')

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Link
          href="/ai-lab"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to AI Lab
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Payroll Lab</h1>
            <p className="text-sm text-muted-foreground">
              Phase 0 sandbox — face recognition + Web Push prototypes for the upcoming
              Employee/Attendance/Payroll module.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4">
          <p className="text-xs text-amber-800">
            <strong>Sign-off checklist before Phase 1:</strong> (1) Face capture works on your
            laptop AND one Android phone. (2) Live recognition correctly distinguishes 3 different
            faces. (3) Web Push arrives on installed PWA on Android. (4) Push still works after
            phone restart / next-day. Tune the threshold via Benchmark before going live.
          </p>
        </div>

        <div className="rounded-lg border bg-blue-50 border-blue-200 p-3 mb-6">
          <p className="text-xs text-blue-900">
            Models load from a public CDN during Phase 0
            (<code className="bg-blue-100 px-1 rounded">justadudewhohacks.github.io/face-api.js/models</code>).
            They&apos;ll be self-hosted in <code>/public/models</code> before going live.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b mb-4">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        <div>
          {tab === 'face' && <FaceCaptureCard />}
          {tab === 'recognise' && <FaceRecognitionCard />}
          {tab === 'push' && <PushTestCard />}
          {tab === 'benchmark' && <BenchmarkCard />}
          {tab === 'flow' && <FlowTestCard />}
        </div>
      </div>
    </ProtectedLayout>
  )
}
