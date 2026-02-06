'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LEAD_STATUS_LABELS,
  INQUIRY_TYPE_LABELS,
  CALL_OUTCOME_LABELS,
  NEXT_ACTION_LABELS,
  VISIT_STATUS_LABELS,
  VISIT_OUTCOME_LABELS,
  DEAD_REASON_LABELS,
  COUNTRY_CODES,
} from '@/types'
import type {
  Lead,
  LeadStatus,
  InquiryType,
  CallOutcome,
  NextActionType,
  VisitStatus,
  VisitOutcome,
  DeadLeadReason,
} from '@/types'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  whatsappNumber: z.string().optional(),
  countryCode: z.string().default('91'),
  company: z.string().optional(),
  inquiryType: z.enum(['PRODUCT_DETAILS', 'FACTORY_SETUP', 'GENERAL_CALL']).optional(),
  status: z.enum([
    'NEW',
    'CONTACTED',
    'INTERESTED',
    'VISIT_SCHEDULED',
    'CONVERTED',
    'DEAD',
  ]).optional(),
  callOutcome: z.enum([
    'INTERESTED',
    'NEEDS_MORE_INFO',
    'CALL_BACK_LATER',
    'TALK_TO_BOSS',
    'NOT_GENUINE',
    'WRONG_NUMBER',
    'NO_ANSWER',
    'BUSY',
  ]).optional().nullable(),
  nextActionType: z.enum([
    'CALL',
    'SEND_DETAILS',
    'SCHEDULE_OWNER_CALL',
    'SCHEDULE_VISIT',
    'FOLLOW_UP_CALL',
    'SEND_QUOTE',
  ]).optional().nullable(),
  nextActionDate: z.string().optional(),
  visitDate: z.string().optional(),
  visitStatus: z.enum([
    'SCHEDULED',
    'RESCHEDULED',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED',
  ]).optional().nullable(),
  visitOutcome: z.enum([
    'VERY_INTERESTED',
    'INTERESTED',
    'NEEDS_TIME',
    'NOT_INTERESTED',
  ]).optional().nullable(),
  visitNotes: z.string().optional(),
  deadReason: z.enum([
    'NOT_INTERESTED',
    'WRONG_NUMBER',
    'SPAM',
    'CLICKED_BY_MISTAKE',
    'COMPETITOR',
    'ALREADY_HAS_SUPPLIER',
  ]).optional().nullable(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface AddLeadFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editLead?: Lead | null
}

export function AddLeadForm({ open, onClose, onSuccess, editLead }: AddLeadFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditMode = !!editLead

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      whatsappNumber: '',
      countryCode: '91',
      company: '',
      inquiryType: 'PRODUCT_DETAILS',
      status: 'NEW',
      callOutcome: null,
      nextActionType: null,
      nextActionDate: '',
      visitDate: '',
      visitStatus: null,
      visitOutcome: null,
      visitNotes: '',
      deadReason: null,
      notes: '',
    },
  })

  const selectedStatus = watch('status')
  const selectedInquiryType = watch('inquiryType')
  const selectedCallOutcome = watch('callOutcome')
  const selectedNextActionType = watch('nextActionType')
  const selectedVisitStatus = watch('visitStatus')
  const selectedVisitOutcome = watch('visitOutcome')
  const selectedDeadReason = watch('deadReason')
  const selectedCountryCode = watch('countryCode')

  // Show visit fields when status is VISIT_SCHEDULED or inquiry is FACTORY_SETUP
  const showVisitFields = selectedStatus === 'VISIT_SCHEDULED' || selectedInquiryType === 'FACTORY_SETUP'

  // Show dead reason when status is DEAD
  const showDeadReason = selectedStatus === 'DEAD'

  // Populate form when editing
  useEffect(() => {
    if (editLead) {
      setValue('name', editLead.name)
      setValue('phone', editLead.phone)
      setValue('whatsappNumber', editLead.whatsappNumber || '')
      setValue('countryCode', editLead.countryCode || '91')
      setValue('company', editLead.company || '')
      setValue('inquiryType', editLead.inquiryType)
      setValue('status', editLead.status)
      setValue('callOutcome', editLead.callOutcome || null)
      setValue('nextActionType', editLead.nextActionType || null)
      setValue(
        'nextActionDate',
        editLead.nextActionDate ? editLead.nextActionDate.split('T')[0] : ''
      )
      setValue(
        'visitDate',
        editLead.visitDate ? editLead.visitDate.split('T')[0] : ''
      )
      setValue('visitStatus', editLead.visitStatus || null)
      setValue('visitOutcome', editLead.visitOutcome || null)
      setValue('visitNotes', editLead.visitNotes || '')
      setValue('deadReason', editLead.deadReason || null)
      setValue('notes', editLead.notes || '')
    } else {
      reset()
    }
  }, [editLead, setValue, reset])

  const onSubmit = async (data: FormData) => {
    setError('')
    setLoading(true)

    try {
      const url = isEditMode ? `/api/leads/${editLead.id}` : '/api/leads'

      // Clean up null/undefined values
      const cleanData = {
        ...data,
        callOutcome: data.callOutcome || null,
        nextActionType: data.nextActionType || null,
        visitStatus: data.visitStatus || null,
        visitOutcome: data.visitOutcome || null,
        deadReason: data.deadReason || null,
      }

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      })

      const result = await response.json()

      if (result.success) {
        reset()
        onSuccess()
        onClose()
      } else {
        setError(result.message || `Failed to ${isEditMode ? 'update' : 'add'} lead`)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Contact Information */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Contact Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter name"
                  autoComplete="off"
                />
                {errors.name && (
                  <p className="text-destructive text-sm">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  {...register('company')}
                  placeholder="Enter company name"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Country Code</Label>
                <Select
                  value={selectedCountryCode}
                  onValueChange={(value) => setValue('countryCode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((cc) => (
                      <SelectItem key={cc.code} value={cc.code}>
                        {cc.flag} +{cc.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="Phone number"
                  autoComplete="off"
                />
                {errors.phone && (
                  <p className="text-destructive text-sm">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp (if different)</Label>
                <Input
                  id="whatsappNumber"
                  {...register('whatsappNumber')}
                  placeholder="WhatsApp number"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Lead Classification */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-sm text-blue-700">Lead Classification</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inquiry Type</Label>
                <Select
                  value={selectedInquiryType}
                  onValueChange={(value) => setValue('inquiryType', value as InquiryType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select inquiry type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INQUIRY_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  What did they inquire about?
                </p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => setValue('status', value as LeadStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Call Information */}
          <div className="bg-green-50 p-4 rounded-lg space-y-4">
            <h3 className="font-semibold text-sm text-green-700">Call Information</h3>

            <div className="space-y-2">
              <Label>Call Outcome</Label>
              <Select
                value={selectedCallOutcome || 'NONE'}
                onValueChange={(value) =>
                  setValue('callOutcome', value !== 'NONE' ? (value as CallOutcome) : null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not called yet</SelectItem>
                  {Object.entries(CALL_OUTCOME_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Next Action</Label>
                <Select
                  value={selectedNextActionType || 'NONE'}
                  onValueChange={(value) =>
                    setValue('nextActionType', value !== 'NONE' ? (value as NextActionType) : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select next action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No action scheduled</SelectItem>
                    {Object.entries(NEXT_ACTION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextActionDate">Next Action Date</Label>
                <Input
                  id="nextActionDate"
                  type="date"
                  {...register('nextActionDate')}
                />
              </div>
            </div>
          </div>

          {/* Visit Information - Only show for factory inquiries or visit scheduled */}
          {showVisitFields && (
            <div className="bg-orange-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-sm text-orange-700">Factory Visit</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visitDate">Visit Date</Label>
                  <Input
                    id="visitDate"
                    type="date"
                    {...register('visitDate')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Visit Status</Label>
                  <Select
                    value={selectedVisitStatus || 'NONE'}
                    onValueChange={(value) =>
                      setValue('visitStatus', value !== 'NONE' ? (value as VisitStatus) : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not scheduled</SelectItem>
                      {Object.entries(VISIT_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Visit Outcome</Label>
                  <Select
                    value={selectedVisitOutcome || 'NONE'}
                    onValueChange={(value) =>
                      setValue('visitOutcome', value !== 'NONE' ? (value as VisitOutcome) : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Not completed yet</SelectItem>
                      {Object.entries(VISIT_OUTCOME_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visitNotes">Visit Notes</Label>
                  <Input
                    id="visitNotes"
                    {...register('visitNotes')}
                    placeholder="Notes about the visit"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dead Lead Reason - Only show when status is DEAD */}
          {showDeadReason && (
            <div className="bg-gray-100 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-sm text-gray-700">Dead Lead</h3>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Select
                  value={selectedDeadReason || 'NONE'}
                  onValueChange={(value) =>
                    setValue('deadReason', value !== 'NONE' ? (value as DeadLeadReason) : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No reason specified</SelectItem>
                    {Object.entries(DEAD_REASON_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes about this lead..."
              rows={3}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEditMode
                  ? 'Updating...'
                  : 'Adding...'
                : isEditMode
                ? 'Update Lead'
                : 'Add Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
