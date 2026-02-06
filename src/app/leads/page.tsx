'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { AddLeadForm } from './components/AddLeadForm'
import { LeadsTable } from './components/LeadsTable'
import { useAuthStore } from '@/store/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Plus, Calendar } from 'lucide-react'
import type { Lead, LeadStatus, InquiryType, CallOutcome } from '@/types'

type TabType = 'active' | 'dead' | 'visits' | 'all'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('active')

  // Counts for tabs
  const [counts, setCounts] = useState({ active: 0, dead: 0, visits: 0 })

  // Filters
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL')
  const [inquiryTypeFilter, setInquiryTypeFilter] = useState<InquiryType | 'ALL'>('ALL')
  const [callOutcomeFilter, setCallOutcomeFilter] = useState<CallOutcome | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const { role } = useAuthStore()

  const isAdmin = role === 'ADMIN'
  const canEdit = role === 'ADMIN' || role === 'EXPENSE_INVENTORY'

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.append('tab', activeTab)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (inquiryTypeFilter !== 'ALL') params.append('inquiryType', inquiryTypeFilter)
      if (callOutcomeFilter !== 'ALL') params.append('callOutcome', callOutcomeFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())

      const response = await fetch(`/api/leads?${params}`)
      const data = await response.json()

      if (data.success) {
        setLeads(data.leads)
        setCounts(data.counts)
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, statusFilter, inquiryTypeFilter, callOutcomeFilter, searchQuery])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return
    }

    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchLeads()
      }
    } catch (error) {
      console.error('Failed to delete lead:', error)
    }
  }

  const handleQuickUpdate = async (id: string, updates: Partial<Lead>) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        fetchLeads()
      }
    } catch (error) {
      console.error('Failed to update lead:', error)
    }
  }

  const handleResetFilters = () => {
    setStatusFilter('ALL')
    setInquiryTypeFilter('ALL')
    setCallOutcomeFilter('ALL')
    setSearchQuery('')
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    // Reset filters when changing tabs
    handleResetFilters()
  }

  // Get today's scheduled visits for the priority section
  const todayVisits = leads.filter((lead) => {
    if (!lead.visitDate) return false
    const visitDate = new Date(lead.visitDate)
    const today = new Date()
    return (
      visitDate.getFullYear() === today.getFullYear() &&
      visitDate.getMonth() === today.getMonth() &&
      visitDate.getDate() === today.getDate() &&
      (lead.visitStatus === 'SCHEDULED' || lead.visitStatus === 'RESCHEDULED')
    )
  })


  if (loading) {
    return (
      <ProtectedLayout>
        <PageLoader />
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leads Management</h1>
            <p className="text-gray-600 mt-1">Track and manage your sales leads</p>
          </div>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* Today's Visits Section */}
        {activeTab === 'active' && todayVisits.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-bold text-orange-900">
                Factory Visits Today ({todayVisits.length})
              </h2>
            </div>
            <div className="grid gap-2">
              {todayVisits.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg p-3 shadow-sm border border-orange-200 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold">{lead.name}</span>
                    <span className="text-gray-600 ml-2">+{lead.countryCode} {lead.phone}</span>
                    {lead.company && (
                      <span className="text-sm text-gray-500 ml-2">({lead.company})</span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(lead)}>
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Leads Table */}
        <LeadsTable
          leads={leads}
          isAdmin={isAdmin}
          canEdit={canEdit}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onQuickUpdate={handleQuickUpdate}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          counts={counts}
          statusFilter={statusFilter}
          inquiryTypeFilter={inquiryTypeFilter}
          callOutcomeFilter={callOutcomeFilter}
          searchQuery={searchQuery}
          onStatusFilterChange={setStatusFilter}
          onInquiryTypeFilterChange={setInquiryTypeFilter}
          onCallOutcomeFilterChange={setCallOutcomeFilter}
          onSearchChange={setSearchQuery}
          onResetFilters={handleResetFilters}
        />

        {/* Add/Edit Form */}
        <AddLeadForm
          open={showAddForm}
          onClose={() => {
            setShowAddForm(false)
            setEditingLead(null)
          }}
          onSuccess={() => fetchLeads()}
          editLead={editingLead}
        />
      </div>
    </ProtectedLayout>
  )
}
