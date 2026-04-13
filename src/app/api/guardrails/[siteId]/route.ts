import { NextResponse } from 'next/server'
import { getSession, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-helpers'
import { assertSiteAccess } from '@/lib/permissions'

// GET: Get guardrails config for a site
export const GET = apiHandler(async (_req, context: unknown) => {
  const { siteId } = (context as { params: { siteId: string } }).params
  const user = requireRole(await getSession(), 'foreman', 'pm', 'admin', 'owner')
  await assertSiteAccess(user, siteId)

  let config = await prisma.guardrailsConfig.findUnique({ where: { siteId } })

  // Return defaults if no config exists
  if (!config) {
    config = {
      id: '',
      siteId,
      requireEvidenceOnReportSubmit: false,
      requireEvidenceOnSnagClose: true,
      allowOverrideOnEvidenceGate: true,
      maxDraftAgeDays: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  return NextResponse.json({ config })
})
