import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import {
  LeadStatus,
  InquiryType,
  CallOutcome,
  NextActionType,
  VisitStatus,
  VisitOutcome,
  DeadLeadReason,
} from '@prisma/client'

export const dynamic = 'force-dynamic'

// Validation schema for updating lead
const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  whatsappNumber: z.string().optional().nullable(),
  countryCode: z.string().optional(),
  company: z.string().optional().nullable(),
  inquiryType: z.nativeEnum(InquiryType).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  callOutcome: z.nativeEnum(CallOutcome).optional().nullable(),
  nextActionType: z.nativeEnum(NextActionType).optional().nullable(),
  nextActionDate: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
  visitDate: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
  visitStatus: z.nativeEnum(VisitStatus).optional().nullable(),
  visitOutcome: z.nativeEnum(VisitOutcome).optional().nullable(),
  visitNotes: z.string().optional().nullable(),
  deadReason: z.nativeEnum(DeadLeadReason).optional().nullable(),
  notes: z.string().optional().nullable(),
})

// PUT - Update lead
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - ADMIN and EXPENSE_INVENTORY can edit
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateLeadSchema.parse(body)

    // Check if lead exists
    const existing = await prisma.lead.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Lead not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { ...validatedData }

    // Auto-set lastCallDate if status changed to CALLED
    if (validatedData.status === 'CALLED' && existing.status !== 'CALLED') {
      updateData.lastCallDate = new Date()
    }

    // If marking as DEAD and no deadReason provided, set a default
    if (validatedData.status === 'DEAD' && !validatedData.deadReason && !existing.deadReason) {
      updateData.deadReason = 'NOT_INTERESTED'
    }

    // Update the lead
    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      lead,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Leads PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

// DELETE - Delete lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - ADMIN and EXPENSE_INVENTORY can delete
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id },
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, message: 'Lead not found' },
        { status: 404 }
      )
    }

    // Delete lead
    await prisma.lead.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Lead deleted',
    })
  } catch (error) {
    console.error('Leads DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
