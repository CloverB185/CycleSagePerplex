import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-helpers'
import { assertSiteAccess } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'

export const POST = apiHandler(async (req, context: unknown) => {
  const { id: snagId } = (context as { params: { id: string } }).params
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin')
  const body = await req.json()

  const snag = await prisma.snag.findUnique({ where: { id: snagId } })
  if (!snag) {
    return NextResponse.json({ error: 'Snag not found' }, { status: 404 })
  }

  await assertSiteAccess(user, snag.siteId)

  // Foremen can only comment on snags they created or own
  if (user.role === 'foreman' && snag.createdById !== user.id && snag.ownerId !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { content } = body
  if (!content) {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }

  const comment = await prisma.snagComment.create({
    data: {
      snagId,
      createdById: user.id,
      content,
    },
    include: {
      createdBy: { select: { id: true, displayName: true, role: true } },
    },
  })

  await logAudit({
    entityType: 'SnagComment',
    entityId: comment.id,
    action: 'create',
    performedById: user.id,
    changesAfter: { snagId, content },
  })

  return NextResponse.json({ comment }, { status: 201 })
})
