import { prisma } from './prisma'

export type SiteMode = 'test' | 'live'

export class SiteModeError extends Error {
  status: number
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'SiteModeError'
    this.status = 403
    this.code = code
  }
}

/**
 * Validates that a site exists and matches the expected mode.
 * Called by all write operations before execution.
 */
export async function validateSiteMode(siteId: string, expectedMode: SiteMode) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, isTestSite: true, isActive: true, name: true },
  })

  if (!site) {
    throw new SiteModeError('Site not found', 'SITE_NOT_FOUND')
  }

  if (!site.isActive) {
    throw new SiteModeError('Site is not active', 'SITE_INACTIVE')
  }

  const actualMode: SiteMode = site.isTestSite ? 'test' : 'live'

  if (actualMode !== expectedMode) {
    throw new SiteModeError(
      `Site mode mismatch: site "${site.name}" is ${actualMode}, expected ${expectedMode}`,
      'SITE_MODE_MISMATCH'
    )
  }

  return site
}

/**
 * Check if a site's isTestSite flag can be changed.
 * Only allowed if the site has zero operational data.
 */
export async function canChangeSiteMode(siteId: string): Promise<boolean> {
  const [reports, snags, evidence, checklists, plans] = await Promise.all([
    prisma.dailyReport.count({ where: { siteId } }),
    prisma.snag.count({ where: { siteId } }),
    prisma.evidence.count({ where: { siteId } }),
    prisma.checklistSubmission.count({ where: { siteId } }),
    prisma.tomorrowPlan.count({ where: { siteId } }),
  ])

  return reports + snags + evidence + checklists + plans === 0
}

/**
 * Verify a user is assigned to a site (for foremen).
 */
export async function verifySiteAssignment(userId: string, siteId: string): Promise<boolean> {
  const assignment = await prisma.siteAssignment.findUnique({
    where: { siteId_userId: { siteId, userId } },
    select: { isActive: true },
  })
  return assignment?.isActive ?? false
}
