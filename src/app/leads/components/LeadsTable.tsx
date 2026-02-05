'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, Trash2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  LEAD_STATUS_LABELS,
  PRIORITY_LABELS,
  LEAD_STATUS_COLORS,
  PRIORITY_COLORS,
  CALL_OUTCOME_LABELS,
} from '@/types'
import type { Lead, LeadStatus, Priority, CallOutcome } from '@/types'

interface LeadsTableProps {
  leads: Lead[]
  isAdmin: boolean
  canEdit: boolean
  onEdit: (lead: Lead) => void
  onDelete: (id: string) => void
  onQuickUpdate: (id: string, updates: Partial<Lead>) => void
  statusFilter: LeadStatus | 'ALL'
  priorityFilter: Priority | 'ALL'
  callOutcomeFilter: CallOutcome | 'ALL'
  searchQuery: string
  followUpFrom: string
  followUpTo: string
  onStatusFilterChange: (status: LeadStatus | 'ALL') => void
  onPriorityFilterChange: (priority: Priority | 'ALL') => void
  onCallOutcomeFilterChange: (outcome: CallOutcome | 'ALL') => void
  onSearchChange: (search: string) => void
  onFollowUpFromChange: (date: string) => void
  onFollowUpToChange: (date: string) => void
  onResetFilters: () => void
}

export function LeadsTable({
  leads,
  isAdmin,
  canEdit,
  onEdit,
  onDelete,
  onQuickUpdate,
  statusFilter,
  priorityFilter,
  callOutcomeFilter,
  searchQuery,
  followUpFrom,
  followUpTo,
  onStatusFilterChange,
  onPriorityFilterChange,
  onCallOutcomeFilterChange,
  onSearchChange,
  onFollowUpFromChange,
  onFollowUpToChange,
  onResetFilters,
}: LeadsTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    setUpdatingId(leadId)
    await onQuickUpdate(leadId, { status: newStatus })
    setUpdatingId(null)
  }

  const handleQuickPriorityChange = async (leadId: string, newPriority: Priority) => {
    setUpdatingId(leadId)
    await onQuickUpdate(leadId, { priority: newPriority })
    setUpdatingId(null)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return <span className="text-red-600 font-semibold">Overdue!</span>
    } else if (diffDays === 0) {
      return <span className="text-orange-600 font-semibold">Today</span>
    } else if (diffDays === 1) {
      return <span className="text-yellow-600">Tomorrow</span>
    } else if (diffDays <= 7) {
      return <span className="text-blue-600">In {diffDays} days</span>
    }
    return date.toLocaleDateString()
  }

  const getTimeSinceLastCall = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    callOutcomeFilter !== 'ALL' ||
    searchQuery !== '' ||
    followUpFrom !== '' ||
    followUpTo !== ''

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        {/* Search Row */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, phone, or company..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold">{leads.length}</span> leads
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm font-medium block mb-1">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                onStatusFilterChange(value as LeadStatus | 'ALL')
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Priority</label>
            <Select
              value={priorityFilter}
              onValueChange={(value) =>
                onPriorityFilterChange(value as Priority | 'ALL')
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Call Outcome</label>
            <Select
              value={callOutcomeFilter}
              onValueChange={(value) =>
                onCallOutcomeFilterChange(value as CallOutcome | 'ALL')
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Outcomes</SelectItem>
                {Object.entries(CALL_OUTCOME_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Follow-up From</label>
            <Input
              type="date"
              value={followUpFrom}
              onChange={(e) => onFollowUpFromChange(e.target.value)}
              className="w-[150px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Follow-up To</label>
            <Input
              type="date"
              value={followUpTo}
              onChange={(e) => onFollowUpToChange(e.target.value)}
              className="w-[150px]"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Last Call</TableHead>
              <TableHead>Next Follow-Up</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No leads found. Click "Add Lead" to create one!
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell className="text-gray-600">
                    {lead.company || '-'}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={lead.status}
                        onValueChange={(value) =>
                          handleQuickStatusChange(lead.id, value as LeadStatus)
                        }
                        disabled={updatingId === lead.id}
                      >
                        <SelectTrigger
                          className={`w-[150px] ${LEAD_STATUS_COLORS[lead.status]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm ${
                          LEAD_STATUS_COLORS[lead.status]
                        }`}
                      >
                        {LEAD_STATUS_LABELS[lead.status]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={lead.priority}
                        onValueChange={(value) =>
                          handleQuickPriorityChange(lead.id, value as Priority)
                        }
                        disabled={updatingId === lead.id}
                      >
                        <SelectTrigger
                          className={`w-[120px] ${PRIORITY_COLORS[lead.priority]}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm ${
                          PRIORITY_COLORS[lead.priority]
                        }`}
                      >
                        {PRIORITY_LABELS[lead.priority]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {getTimeSinceLastCall(lead.lastCallDate)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(lead.nextFollowUpDate)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[200px] truncate">
                    {lead.quickNote || lead.additionalNotes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(lead)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(lead.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
