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

// Validation schema for creating lead
const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  whatsappNumber: z.string().optional().nullable(),
  countryCode: z.string().default('91'),
  company: z.string().optional().nullable(),
  inquiryType: z.nativeEnum(InquiryType).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  callOutcome: z.nativeEnum(CallOutcome).optional().nullable(),
  nextActionType: z.nativeEnum(NextActionType).optional().nullable(),
  nextActionDate: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  visitDate: z.string().transform(str => str ? new Date(str) : undefined).optional(),
  visitStatus: z.nativeEnum(VisitStatus).optional().nullable(),
  visitOutcome: z.nativeEnum(VisitOutcome).optional().nullable(),
  visitNotes: z.string().optional().nullable(),
  deadReason: z.nativeEnum(DeadLeadReason).optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET - Fetch all leads with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - only ADMIN and EXPENSE_INVENTORY can view leads
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as LeadStatus | null
    const inquiryType = searchParams.get('inquiryType') as InquiryType | null
    const callOutcome = searchParams.get('callOutcome') as CallOutcome | null
    const search = searchParams.get('search')
    const tab = searchParams.get('tab') // 'active', 'dead', 'visits', 'all'
    const visitDateFrom = searchParams.get('visitDateFrom')
    const visitDateTo = searchParams.get('visitDateTo')
    const actionDateFrom = searchParams.get('actionDateFrom')
    const actionDateTo = searchParams.get('actionDateTo')

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}

    // Tab-based filtering
    if (tab === 'active') {
      where.status = { not: 'DEAD' }
    } else if (tab === 'dead') {
      where.status = 'DEAD'
    } else if (tab === 'visits') {
      where.visitDate = { not: null }
      where.visitStatus = { in: ['SCHEDULED', 'RESCHEDULED'] }
    }

    if (status) where.status = status
    if (inquiryType) where.inquiryType = inquiryType
    if (callOutcome) where.callOutcome = callOutcome

    // Search across name, phone, company
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Date range filter for visitDate
    if (visitDateFrom || visitDateTo) {
      where.visitDate = {}
      if (visitDateFrom) {
        where.visitDate.gte = new Date(visitDateFrom)
      }
      if (visitDateTo) {
        const toDate = new Date(visitDateTo)
        toDate.setHours(23, 59, 59, 999)
        where.visitDate.lte = toDate
      }
    }

    // Date range filter for nextActionDate
    if (actionDateFrom || actionDateTo) {
      where.nextActionDate = {}
      if (actionDateFrom) {
        where.nextActionDate.gte = new Date(actionDateFrom)
      }
      if (actionDateTo) {
        const toDate = new Date(actionDateTo)
        toDate.setHours(23, 59, 59, 999)
        where.nextActionDate.lte = toDate
      }
    }

    // Fetch all leads
    const leads = await prisma.lead.findMany({
      where,
      orderBy: [
        { nextActionDate: 'asc' }, // Soonest actions first
        { createdAt: 'desc' }, // Newest first
      ],
    })

    const total = await prisma.lead.count({ where })

    // Get counts for tabs
    const activeCount = await prisma.lead.count({
      where: { status: { not: 'DEAD' } },
    })
    const deadCount = await prisma.lead.count({
      where: { status: 'DEAD' },
    })
    const visitsCount = await prisma.lead.count({
      where: {
        visitDate: { not: null },
        visitStatus: { in: ['SCHEDULED', 'RESCHEDULED'] },
      },
    })

    return NextResponse.json({
      success: true,
      leads,
      total,
      counts: {
        active: activeCount,
        dead: deadCount,
        visits: visitsCount,
      },
    })
  } catch (error) {
    console.error('Leads GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

// POST - Create new lead
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createLeadSchema.parse(body)

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        whatsappNumber: validatedData.whatsappNumber,
        countryCode: validatedData.countryCode || '91',
        company: validatedData.company,
        inquiryType: validatedData.inquiryType || 'PRODUCT_DETAILS',
        status: validatedData.status || 'NEW',
        callOutcome: validatedData.callOutcome,
        nextActionType: validatedData.nextActionType,
        nextActionDate: validatedData.nextActionDate,
        visitDate: validatedData.visitDate,
        visitStatus: validatedData.visitStatus,
        visitOutcome: validatedData.visitOutcome,
        visitNotes: validatedData.visitNotes,
        deadReason: validatedData.deadReason,
        notes: validatedData.notes,
      },
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
    console.error('Leads POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
