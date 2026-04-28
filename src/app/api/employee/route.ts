import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\d{7,15}$/, 'Digits only, 7-15 chars'),
  pin: z.string().regex(/^\d{4}$/, '4-digit PIN required'),
  monthlySalary: z.number().positive(),
  openingBalance: z.number().optional(), // can be negative (advance) or positive (already owed)
  faceDescriptors: z.array(z.array(z.number()).length(128)).optional(),
})

// GET /api/employee — admin list of all employees (active first).
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'

    const employees = await prisma.employee.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        phone: true,
        monthlySalary: true,
        openingBalance: true,
        joinedDate: true,
        active: true,
        faceDescriptors: true,
        createdAt: true,
      },
    })

    // Surface descriptor count rather than the raw vectors in the list view.
    const result = employees.map((e) => ({
      ...e,
      faceDescriptorCount: Array.isArray(e.faceDescriptors) ? e.faceDescriptors.length : 0,
      faceDescriptors: undefined,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('GET /api/employee error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

// POST /api/employee — create employee. Optionally seeds face descriptors.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }
    const { name, phone, pin, monthlySalary, openingBalance, faceDescriptors } = parsed.data

    const existing = await prisma.employee.findUnique({ where: { phone } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An employee with this phone already exists' },
        { status: 409 }
      )
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        phone,
        pin,
        monthlySalary,
        openingBalance: openingBalance ?? 0,
        faceDescriptors: faceDescriptors ?? [],
      },
      select: { id: true, name: true, phone: true, monthlySalary: true, openingBalance: true, active: true, joinedDate: true },
    })

    return NextResponse.json({ success: true, data: employee }, { status: 201 })
  } catch (error) {
    console.error('POST /api/employee error', error)
    return NextResponse.json({ success: false, error: 'Failed to create employee' }, { status: 500 })
  }
}
