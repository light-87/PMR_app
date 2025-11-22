import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for creating/updating bucket type
const bucketTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  capacityLiters: z.number().int().min(0, 'Capacity must be 0 or greater'),
})

const updateBucketTypeSchema = bucketTypeSchema.extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

// Helper function to generate code from name
function generateCodeFromName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// GET - Fetch all bucket types
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('activeOnly') === 'true'

    // Build filter
    const where: Record<string, unknown> = {}
    if (activeOnly) {
      where.isActive = true
    }

    // Fetch bucket types
    const bucketTypes = await prisma.bucketTypeConfig.findMany({
      where,
      orderBy: [
        { isSystem: 'desc' }, // System types first (FREE_DEF)
        { createdAt: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      bucketTypes,
    })
  } catch (error) {
    console.error('Bucket types GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch bucket types' },
      { status: 500 }
    )
  }
}

// POST - Create new bucket type
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can create bucket types
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Only admins can create bucket types.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = bucketTypeSchema.parse(body)

    // Generate code from name
    const code = generateCodeFromName(validatedData.name)

    // Check if code already exists
    const existing = await prisma.bucketTypeConfig.findUnique({
      where: { code },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: `A bucket type with similar name already exists: ${existing.name}` },
        { status: 400 }
      )
    }

    // Create bucket type
    const bucketType = await prisma.bucketTypeConfig.create({
      data: {
        code,
        name: validatedData.name,
        capacityLiters: validatedData.capacityLiters,
        isActive: true,
        isSystem: false,
      },
    })

    return NextResponse.json({
      success: true,
      bucketType,
      message: `Bucket type "${validatedData.name}" created successfully`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Bucket type POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create bucket type' },
      { status: 500 }
    )
  }
}

// PUT - Update bucket type
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can update bucket types
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Only admins can update bucket types.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateBucketTypeSchema.parse(body)

    // Check if bucket type exists
    const existing = await prisma.bucketTypeConfig.findUnique({
      where: { id: validatedData.id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Bucket type not found' },
        { status: 404 }
      )
    }

    // Prevent editing system types (FREE_DEF)
    if (existing.isSystem) {
      return NextResponse.json(
        { success: false, message: 'Cannot edit system bucket types' },
        { status: 400 }
      )
    }

    // Update bucket type
    const bucketType = await prisma.bucketTypeConfig.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        capacityLiters: validatedData.capacityLiters,
        isActive: validatedData.isActive,
      },
    })

    return NextResponse.json({
      success: true,
      bucketType,
      message: `Bucket type "${validatedData.name}" updated successfully`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Invalid data', errors: error.errors },
        { status: 400 }
      )
    }
    console.error('Bucket type PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update bucket type' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete bucket type
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can delete bucket types
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Only admins can delete bucket types.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Bucket type ID is required' },
        { status: 400 }
      )
    }

    // Check if bucket type exists
    const existing = await prisma.bucketTypeConfig.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Bucket type not found' },
        { status: 404 }
      )
    }

    // Prevent deleting system types (FREE_DEF)
    if (existing.isSystem) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete system bucket types' },
        { status: 400 }
      )
    }

    // Soft delete (set isActive to false)
    const bucketType = await prisma.bucketTypeConfig.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      bucketType,
      message: `Bucket type "${existing.name}" deleted successfully`,
    })
  } catch (error) {
    console.error('Bucket type DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete bucket type' },
      { status: 500 }
    )
  }
}
