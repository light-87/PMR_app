'use client'

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface ExperimentCardProps {
  name: string
  description: string
  icon: LucideIcon
  href: string
  category: string
  status: string
}

export function ExperimentCard({ name, description, icon: Icon, href, category, status }: ExperimentCardProps) {
  return (
    <Link href={href} className="block">
      <div className="rounded-lg border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex gap-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
              {status}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {category}
            </span>
          </div>
        </div>
        <h3 className="font-semibold text-sm mb-1">{name}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Link>
  )
}
