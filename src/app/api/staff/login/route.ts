import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createEmployeeSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const schema = z.object({
  phone: z.string().min(7).max(15),
  pin: z.string().regex(/^\d{4}$/, '4-digit PIN required'),
})

// POST /api/staff/login — phone + 4-digit PIN. Mints 1y employee session cookie.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid phone or PIN' }, { status: 400 })
    }

    const { phone, pin } = parsed.data
    const employee = await prisma.employee.findUnique({ where: { phone } })
    if (!employee || !employee.active) {
      return NextResponse.json({ success: false, error: 'Invalid login' }, { status: 401 })
    }
    if (employee.pin !== pin) {
      return NextResponse.json({ success: false, error: 'Invalid login' }, { status: 401 })
    }

    await createEmployeeSession(employee.id)
    return NextResponse.json({
      success: true,
      data: { id: employee.id, name: employee.name },
    })
  } catch (error) {
    console.error('staff login error', error)
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 })
  }
}
