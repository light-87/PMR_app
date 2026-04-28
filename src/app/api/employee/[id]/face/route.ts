import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// face-api.js descriptors are 128-float vectors.
const schema = z.object({
  descriptors: z.array(z.array(z.number()).length(128)).min(1),
  replace: z.boolean().optional(), // true → overwrite all; false (default) → append
})

type Ctx = { params: Promise<{ id: string }> }

// POST /api/employee/[id]/face — append (or replace) face descriptors for the employee.
export async function POST(request: NextRequest, context: Ctx) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await context.params
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { faceDescriptors: true },
    })
    if (!employee) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const existing = parsed.data.replace
      ? []
      : Array.isArray(employee.faceDescriptors)
        ? (employee.faceDescriptors as number[][])
        : []
    const merged = [...existing, ...parsed.data.descriptors]

    await prisma.employee.update({
      where: { id },
      data: { faceDescriptors: merged },
    })

    return NextResponse.json({ success: true, data: { count: merged.length } })
  } catch (error) {
    console.error('POST /api/employee/[id]/face error', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
