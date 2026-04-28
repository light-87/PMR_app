'use client'

import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { ApiKeySetup } from './components/ApiKeySetup'
import { ExperimentCard } from './components/ExperimentCard'
import { Mic, MessageSquare, Sun, Factory, FlaskConical, UserCheck } from 'lucide-react'

const experiments = [
  {
    name: 'Voice Data Entry',
    description: 'Speak in Marathi to add inventory, expenses, or stock entries. AI transcribes and parses your voice into structured data.',
    icon: Mic,
    href: '/ai-lab/voice-entry',
    category: 'Quick Action',
    status: 'Experimental',
  },
  {
    name: 'Ask PMR',
    description: 'Ask business questions in Marathi or English. Get instant answers from your inventory, expenses, stock, and leads data.',
    icon: MessageSquare,
    href: '/ai-lab/chat',
    category: 'Quick Action',
    status: 'Experimental',
  },
  {
    name: 'Smart Daily Briefing',
    description: 'AI-generated morning summary in Marathi — financials, inventory highlights, production status, and action items for today.',
    icon: Sun,
    href: '/ai-lab/briefing',
    category: 'Insights',
    status: 'Experimental',
  },
  {
    name: 'Production Advisor',
    description: 'AI analyzes your stock levels, sales velocity, and urea supply to recommend batch scheduling and production priorities.',
    icon: Factory,
    href: '/ai-lab/production-advisor',
    category: 'Planning',
    status: 'Experimental',
  },
  {
    name: 'Payroll Lab',
    description: 'Phase 0 sandbox for the upcoming Employee module — face recognition (face-api.js) and Web Push prototypes. Validate before Phase 1.',
    icon: UserCheck,
    href: '/ai-lab/payroll-lab',
    category: 'Prototype',
    status: 'Phase 0',
  },
]

export default function AILabPage() {
  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Lab</h1>
            <p className="text-sm text-muted-foreground">
              Experimental AI features powered by Sarvam AI — Marathi language support
            </p>
          </div>
        </div>

        <div className="mb-6">
          <ApiKeySetup />
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-6">
          <p className="text-xs text-amber-800">
            <strong>Experimental:</strong> These features are for testing. Voice entries require explicit confirmation
            before saving to the database. Chat, Briefing, and Advisor are read-only.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {experiments.map((exp) => (
            <ExperimentCard key={exp.name} {...exp} />
          ))}
        </div>
      </div>
    </ProtectedLayout>
  )
}
