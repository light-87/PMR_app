import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\d{7,15}$/).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
  monthlySalary: z.number().positive().optional(),
  active: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

// GET /api/employee/[id] — admin detail.
export async function GET(_request: NextRequest, context: Ctx) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await context.params

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        monthlySalary: true,
        joinedDate: true,
        active: true,
        faceDescriptors: true,
        pushSubscription: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...employee,
        faceDescriptorCount: Array.isArray(employee.faceDescriptors) ? employee.faceDescriptors.length : 0,
        hasPushSubscription: !!employee.pushSubscription,
        // Don't return raw face descriptors or push subscription in detail view.
        faceDescriptors: undefined,
        pushSubscription: undefined,
      },
    })
  } catch (error) {
    console.error('GET /api/employee/[id] error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

// PUT /api/employee/[id] — admin update (incl. toggling active=false to soft-revoke).
export async function PUT(request: NextRequest, context: Ctx) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    if (parsed.data.phone) {
      const dup = await prisma.employee.findFirst({
        where: { phone: parsed.data.phone, NOT: { id } },
        select: { id: true },
      })
      if (dup) {
        return NextResponse.json({ success: false, error: 'Phone in use' }, { status: 409 })
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, phone: true, monthlySalary: true, active: true },
    })
    return NextResponse.json({ success: true, data: employee })
  } catch (error) {
    console.error('PUT /api/employee/[id] error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

// DELETE /api/employee/[id] — soft delete (active=false). Hard delete left out by design.
export async function DELETE(_request: NextRequest, context: Ctx) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await context.params
    await prisma.employee.update({ where: { id }, data: { active: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/employee/[id] error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
