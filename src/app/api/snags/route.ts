import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-helpers'
import { assertSiteAccess } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

// GET: List snags for a site
export const GET = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin')
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const status = searchParams.get('status')

  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 })
  }

  await assertSiteAccess(user, siteId)

  const where: Record<string, unknown> = { siteId }
  if (status) where.status = status

  // Foremen see snags they created or own
  if (user.role === 'foreman') {
    where.OR = [{ createdById: user.id }, { ownerId: user.id }]
  }

  const snags = await prisma.snag.findMany({
    where,
    include: {
      createdBy: { select: { id: true, displayName: true } },
      owner: { select: { id: true, displayName: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ snags })
})

// POST: Create a new snag
export const POST = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'foreman', 'pm')
  const body = await req.json()

  const { siteId, title, description, category, ownerId, syncActionId } = body

  if (!siteId || !title || !description || !category || !ownerId) {
    return NextResponse.json(
      { error: 'siteId, title, description, category, and ownerId are required' },
      { status: 400 }
    )
  }

  const validCategories = ['safety', 'quality', 'rework', 'other']
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: `category must be one of: ${validCategories.join(', ')}` }, { status: 400 })
  }

  // Idempotency check
  if (syncActionId) {
    const existing = await prisma.snag.findUnique({ where: { syncActionId } })
    if (existing) {
      return NextResponse.json({ snag: existing, deduplicated: true })
    }
  }

  await assertSiteAccess(user, siteId)

  const snag = await prisma.snag.create({
    data: {
      siteId,
      createdById: user.id,
      title,
      description,
      category,
      ownerId,
      syncActionId: syncActionId || null,
    },
    include: {
      createdBy: { select: { id: true, displayName: true } },
      owner: { select: { id: true, displayName: true } },
    },
  })

  await logAudit({
    entityType: 'Snag',
    entityId: snag.id,
    action: 'create',
    performedById: user.id,
    changesAfter: { siteId, title, description, category, ownerId },
  })

  return NextResponse.json({ snag }, { status: 201 })
})
