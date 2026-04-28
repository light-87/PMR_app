'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type StatusFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERPAID'
export type SortKey = 'AMOUNT_DESC' | 'NAME_ASC' | 'DAYS_DESC'

interface FilterBarProps {
  query: string
  onQueryChange: (q: string) => void
  status: StatusFilter
  onStatusChange: (s: StatusFilter) => void
  sort: SortKey
  onSortChange: (s: SortKey) => void
}

export function FilterBar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search employee…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-8 h-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
            <SelectTrigger className="h-10 flex-1 sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="OVERPAID">Overpaid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
            <SelectTrigger className="h-10 flex-1 sm:w-[160px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AMOUNT_DESC">Amount due ↓</SelectItem>
              <SelectItem value="NAME_ASC">Name A→Z</SelectItem>
              <SelectItem value="DAYS_DESC">Days attended ↓</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
