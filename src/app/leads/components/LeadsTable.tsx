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
import { Pencil, Trash2, Search, X, MessageCircle, Phone, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  INQUIRY_TYPE_LABELS,
  INQUIRY_TYPE_COLORS,
  CALL_OUTCOME_LABELS,
  NEXT_ACTION_LABELS,
  VISIT_STATUS_LABELS,
  DEAD_REASON_LABELS,
} from '@/types'
import type {
  Lead,
  LeadStatus,
  InquiryType,
  CallOutcome,
} from '@/types'

type TabType = 'active' | 'dead' | 'visits' | 'all'

interface LeadsTableProps {
  leads: Lead[]
  isAdmin: boolean
  canEdit: boolean
  onEdit: (lead: Lead) => void
  onDelete: (id: string) => void
  onQuickUpdate: (id: string, updates: Partial<Lead>) => void
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  counts: {
    active: number
    dead: number
    visits: number
  }
  statusFilter: LeadStatus | 'ALL'
  inquiryTypeFilter: InquiryType | 'ALL'
  callOutcomeFilter: CallOutcome | 'ALL'
  searchQuery: string
  onStatusFilterChange: (status: LeadStatus | 'ALL') => void
  onInquiryTypeFilterChange: (type: InquiryType | 'ALL') => void
  onCallOutcomeFilterChange: (outcome: CallOutcome | 'ALL') => void
  onSearchChange: (search: string) => void
  onResetFilters: () => void
}

export function LeadsTable({
  leads,
  isAdmin,
  canEdit,
  onEdit,
  onDelete,
  onQuickUpdate,
  activeTab,
  onTabChange,
  counts,
  statusFilter,
  inquiryTypeFilter,
  callOutcomeFilter,
  searchQuery,
  onStatusFilterChange,
  onInquiryTypeFilterChange,
  onCallOutcomeFilterChange,
  onSearchChange,
  onResetFilters,
}: LeadsTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const handleQuickStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    setUpdatingId(leadId)
    await onQuickUpdate(leadId, { status: newStatus })
    setUpdatingId(null)
  }

  const openWhatsApp = (lead: Lead) => {
    const number = lead.whatsappNumber || lead.phone
    // Remove any non-digit characters except +
    const cleanNumber = number.replace(/[^\d]/g, '')
    const fullNumber = lead.countryCode + cleanNumber
    window.open(`https://wa.me/${fullNumber}`, '_blank')
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)
    const diffTime = dateOnly.getTime() - now.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return <span className="text-red-600 font-semibold">Overdue ({Math.abs(diffDays)}d)</span>
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
    if (diffDays <= 7) return `${diffDays}d ago`
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString()
  }

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    inquiryTypeFilter !== 'ALL' ||
    callOutcomeFilter !== 'ALL' ||
    searchQuery !== ''

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'active', label: 'Active Leads', count: counts.active },
    { id: 'visits', label: 'Visits Scheduled', count: counts.visits },
    { id: 'dead', label: 'Dead Leads', count: counts.dead },
    { id: 'all', label: 'All', count: counts.active + counts.dead },
  ]

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

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
            Showing: <span className="font-bold">{leads.length}</span> leads
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
              <SelectTrigger className="w-[180px]">
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
            <label className="text-sm font-medium block mb-1">Inquiry Type</label>
            <Select
              value={inquiryTypeFilter}
              onValueChange={(value) =>
                onInquiryTypeFilterChange(value as InquiryType | 'ALL')
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {Object.entries(INQUIRY_TYPE_LABELS).map(([value, label]) => (
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
              <TableHead>Contact</TableHead>
              <TableHead>Inquiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Call</TableHead>
              <TableHead>Next Action</TableHead>
              {activeTab === 'visits' && <TableHead>Visit</TableHead>}
              {activeTab === 'dead' && <TableHead>Reason</TableHead>}
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'visits' || activeTab === 'dead' ? 9 : 8} className="text-center py-8 text-gray-500">
                  {activeTab === 'dead'
                    ? 'No dead leads found.'
                    : activeTab === 'visits'
                    ? 'No visits scheduled.'
                    : 'No leads found. Click "Add Lead" to create one!'}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} className={lead.status === 'DEAD' ? 'bg-gray-50' : ''}>
                  {/* Contact Info */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        +{lead.countryCode} {lead.phone}
                      </div>
                      {lead.company && (
                        <div className="text-xs text-gray-500">{lead.company}</div>
                      )}
                    </div>
                  </TableCell>

                  {/* Inquiry Type */}
                  <TableCell>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        INQUIRY_TYPE_COLORS[lead.inquiryType]
                      }`}
                    >
                      {INQUIRY_TYPE_LABELS[lead.inquiryType]}
                    </span>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {canEdit && lead.status !== 'DEAD' ? (
                      <Select
                        value={lead.status}
                        onValueChange={(value) =>
                          handleQuickStatusChange(lead.id, value as LeadStatus)
                        }
                        disabled={updatingId === lead.id}
                      >
                        <SelectTrigger
                          className={`w-[160px] text-xs ${LEAD_STATUS_COLORS[lead.status]}`}
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
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          LEAD_STATUS_COLORS[lead.status]
                        }`}
                      >
                        {LEAD_STATUS_LABELS[lead.status]}
                      </span>
                    )}
                    {lead.callOutcome && (
                      <div className="text-xs text-gray-500 mt-1">
                        {CALL_OUTCOME_LABELS[lead.callOutcome]}
                      </div>
                    )}
                  </TableCell>

                  {/* Last Call */}
                  <TableCell className="text-sm text-gray-600">
                    {getTimeSinceLastCall(lead.lastCallDate)}
                  </TableCell>

                  {/* Next Action */}
                  <TableCell>
                    {lead.nextActionType && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-gray-700">
                          {NEXT_ACTION_LABELS[lead.nextActionType]}
                        </div>
                        <div className="text-sm">
                          {formatDate(lead.nextActionDate)}
                        </div>
                      </div>
                    )}
                    {!lead.nextActionType && '-'}
                  </TableCell>

                  {/* Visit Info (only in visits tab) */}
                  {activeTab === 'visits' && (
                    <TableCell>
                      {lead.visitDate && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {new Date(lead.visitDate).toLocaleDateString()}
                          </div>
                          {lead.visitStatus && (
                            <div className="text-xs text-gray-500">
                              {VISIT_STATUS_LABELS[lead.visitStatus]}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  )}

                  {/* Dead Reason (only in dead tab) */}
                  {activeTab === 'dead' && (
                    <TableCell>
                      {lead.deadReason && (
                        <span className="text-xs text-gray-600">
                          {DEAD_REASON_LABELS[lead.deadReason]}
                        </span>
                      )}
                    </TableCell>
                  )}

                  {/* Notes */}
                  <TableCell className="text-sm text-gray-600 max-w-[150px]">
                    <div className="truncate" title={lead.notes || ''}>
                      {lead.notes || '-'}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* WhatsApp Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openWhatsApp(lead)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Open WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>

                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(lead)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(lead.id)}
                          title="Delete"
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
