import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler, ImmutabilityError } from '@/lib/api-helpers'
import { assertSiteAccess } from '@/lib/permissions'
import { validateSiteMode } from '@/lib/site-mode'
import { logAudit } from '@/lib/audit'

// GET: List daily reports for a site
export const GET = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin', 'owner')
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')

  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 })
  }

  await assertSiteAccess(user, siteId)

  const where: Record<string, unknown> = { siteId }
  // Foremen only see their own reports
  if (user.role === 'foreman') {
    where.createdById = user.id
  }

  const reports = await prisma.dailyReport.findMany({
    where,
    include: {
      createdBy: { select: { id: true, displayName: true } },
      evidence: { select: { id: true, evidenceType: true, fileName: true, fileUrl: true } },
      _count: { select: { annotations: true } },
    },
    orderBy: { reportDate: 'desc' },
  })

  return NextResponse.json({ reports })
})

// POST: Create a new daily report
export const POST = apiHandler(async (req) => {
  const user = requireRole(await getSession(), 'foreman')
  const body = await req.json()

  const {
    siteId,
    reportDate,
    workSummary,
    personnelOnSite,
    issuesOrBlockers,
    incidents,
    weatherConditions,
    qaSafetyConfirmed,
    syncActionId,
  } = body

  if (!siteId || !reportDate || !workSummary) {
    return NextResponse.json(
      { error: 'siteId, reportDate, and workSummary are required' },
      { status: 400 }
    )
  }

  // Idempotency check
  if (syncActionId) {
    const existing = await prisma.dailyReport.findUnique({ where: { syncActionId } })
    if (existing) {
      return NextResponse.json({ report: existing, deduplicated: true })
    }
  }

  // Backend enforcement
  await assertSiteAccess(user, siteId)
  const siteMode = await site_mode_for_site(siteId)
  await validateSiteMode(siteId, siteMode as 'test' | 'live')

  // Check for duplicate report (same site + user + date)
  const duplicate = await prisma.dailyReport.findUnique({
    where: { siteId_createdById_reportDate: { siteId, createdById: user.id, reportDate } },
  })
  if (duplicate) {
    return NextResponse.json(
      { error: 'A daily report already exists for this date', existingId: duplicate.id },
      { status: 409 }
    )
  }

  const report = await prisma.dailyReport.create({
    data: {
      siteId,
      createdById: user.id,
      reportDate,
      workSummary,
      personnelOnSite: personnelOnSite || null,
      issuesOrBlockers: issuesOrBlockers || null,
      incidents: incidents || null,
      weatherConditions: weatherConditions || null,
      qaSafetyConfirmed: qaSafetyConfirmed || false,
      syncActionId: syncActionId || null,
    },
  })

  await logAudit({
    entityType: 'DailyReport',
    entityId: report.id,
    action: 'create',
    performedById: user.id,
    changesAfter: { siteId, reportDate, workSummary },
  })

  return NextResponse.json({ report }, { status: 201 })
})

// Helper: determine site mode from the site record itself
async function site_mode_for_site(siteId: string): Promise<string> {
  const s = await prisma.site.findUnique({ where: { id: siteId }, select: { isTestSite: true } })
  return s?.isTestSite ? 'test' : 'live'
}
