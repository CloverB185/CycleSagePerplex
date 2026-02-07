import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-helpers'
import { assertSiteAccess } from '@/lib/permissions'
import { logAudit } from '@/lib/audit'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// GET: List evidence for a context
export const GET = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin')
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const contextType = searchParams.get('contextType')
  const contextId = searchParams.get('contextId')

  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 })
  }

  await assertSiteAccess(user, siteId)

  const where: Record<string, unknown> = { siteId, isArchived: false }
  if (contextType) where.contextType = contextType
  if (contextId) where.contextId = contextId
  if (user.role === 'foreman') where.createdById = user.id

  const evidence = await prisma.evidence.findMany({
    where,
    include: {
      createdBy: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ evidence })
})

// POST: Upload evidence (photo/note/attachment)
export const POST = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'foreman')

  const formData = await req.formData()
  const siteId = formData.get('siteId') as string
  const evidenceType = formData.get('evidenceType') as string
  const contextType = formData.get('contextType') as string | null
  const contextId = formData.get('contextId') as string | null
  const description = formData.get('description') as string | null
  const deviceTimestamp = formData.get('deviceTimestamp') as string
  const syncActionId = formData.get('syncActionId') as string | null
  const file = formData.get('file') as File | null

  if (!siteId || !evidenceType || !deviceTimestamp) {
    return NextResponse.json(
      { error: 'siteId, evidenceType, and deviceTimestamp are required' },
      { status: 400 }
    )
  }

  // Idempotency check
  if (syncActionId) {
    const existing = await prisma.evidence.findUnique({ where: { syncActionId } })
    if (existing) {
      return NextResponse.json({ evidence: existing, deduplicated: true })
    }
  }

  await assertSiteAccess(user, siteId)

  let fileUrl: string | null = null
  let fileName: string | null = null
  let fileSizeBytes: number | null = null
  let mimeType: string | null = null
  let fileHash: string | null = null

  // Handle file upload
  if (file && evidenceType !== 'note') {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate SHA-256 hash
    fileHash = crypto.createHash('sha256').update(buffer).digest('hex')

    // Save to uploads directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const ext = path.extname(file.name) || '.jpg'
    const savedName = `${crypto.randomUUID()}${ext}`
    await writeFile(path.join(uploadDir, savedName), buffer)

    fileUrl = `/uploads/${savedName}`
    fileName = file.name
    fileSizeBytes = buffer.length
    mimeType = file.type
  }

  const evidence = await prisma.evidence.create({
    data: {
      siteId,
      createdById: user.id,
      evidenceType,
      contextType: contextType || null,
      contextId: contextId || null,
      fileUrl,
      fileName,
      fileSizeBytes,
      mimeType,
      fileHash,
      description: description || null,
      deviceTimestamp: new Date(deviceTimestamp),
      syncActionId: syncActionId || null,
    },
  })

  await logAudit({
    entityType: 'Evidence',
    entityId: evidence.id,
    action: 'create',
    performedById: user.id,
    changesAfter: { siteId, evidenceType, contextType, contextId, fileName, fileHash },
  })

  return NextResponse.json({ evidence }, { status: 201 })
})
