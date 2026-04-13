import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create organization
  const org = await prisma.organization.create({
    data: {
      id: 'org-001',
      name: 'BuildRight Construction',
    },
  })

  // Create users (password: "password123" for all)
  const hash = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: {
      id: 'user-admin-001',
      organizationId: org.id,
      email: 'admin@buildright.co.za',
      displayName: 'Sarah Admin',
      passwordHash: hash,
      role: 'admin',
    },
  })

  const pm = await prisma.user.create({
    data: {
      id: 'user-pm-001',
      organizationId: org.id,
      email: 'pm@buildright.co.za',
      displayName: 'James PM',
      passwordHash: hash,
      role: 'pm',
    },
  })

  const foreman1 = await prisma.user.create({
    data: {
      id: 'user-foreman-001',
      organizationId: org.id,
      email: 'thabo@buildright.co.za',
      displayName: 'Thabo Foreman',
      passwordHash: hash,
      role: 'foreman',
    },
  })

  const owner = await prisma.user.create({
    data: {
      id: 'user-owner-001',
      organizationId: org.id,
      email: 'owner@buildright.co.za',
      displayName: 'David Owner',
      passwordHash: hash,
      role: 'owner',
    },
  })

  const foreman2 = await prisma.user.create({
    data: {
      id: 'user-foreman-002',
      organizationId: org.id,
      email: 'sipho@buildright.co.za',
      displayName: 'Sipho Foreman',
      passwordHash: hash,
      role: 'foreman',
    },
  })

  // Create sites
  const liveSite = await prisma.site.create({
    data: {
      id: 'site-live-001',
      organizationId: org.id,
      name: 'Sandton Office Park - Block A',
      address: '123 Rivonia Road, Sandton, Johannesburg',
      isTestSite: false,
      createdById: admin.id,
    },
  })

  const testSite = await prisma.site.create({
    data: {
      id: 'site-test-001',
      organizationId: org.id,
      name: '[TEST] Training Site',
      address: 'Test Address, Johannesburg',
      isTestSite: true,
      createdById: admin.id,
    },
  })

  // Assign users to sites
  await prisma.siteAssignment.createMany({
    data: [
      { siteId: liveSite.id, userId: foreman1.id, assignedById: admin.id },
      { siteId: liveSite.id, userId: foreman2.id, assignedById: admin.id },
      { siteId: testSite.id, userId: foreman1.id, assignedById: admin.id },
    ],
  })

  // Create default guardrails configs for sites
  await prisma.guardrailsConfig.createMany({
    data: [
      {
        siteId: liveSite.id,
        requireEvidenceOnReportSubmit: false,
        requireEvidenceOnSnagClose: true,
        allowOverrideOnEvidenceGate: true,
      },
      {
        siteId: testSite.id,
        requireEvidenceOnReportSubmit: false,
        requireEvidenceOnSnagClose: false,
        allowOverrideOnEvidenceGate: true,
      },
    ],
  })

  // Create a sample checklist template
  await prisma.checklistTemplate.create({
    data: {
      id: 'checklist-tpl-001',
      organizationId: org.id,
      name: 'Daily Safety Check',
      category: 'safety',
      isBlocking: true,
      items: JSON.stringify([
        { id: 'item-1', label: 'PPE worn by all workers', isRequired: true, requiresEvidence: false },
        { id: 'item-2', label: 'Fall protection in place', isRequired: true, requiresEvidence: true },
        { id: 'item-3', label: 'Scaffolding inspected', isRequired: true, requiresEvidence: true },
        { id: 'item-4', label: 'Fire extinguishers accessible', isRequired: true, requiresEvidence: false },
        { id: 'item-5', label: 'First aid kit stocked', isRequired: false, requiresEvidence: false },
      ]),
      createdById: pm.id,
    },
  })

  console.log('Seed complete!')
  console.log('')
  console.log('Test accounts (password: password123):')
  console.log('  Owner:   owner@buildright.co.za')
  console.log('  Admin:   admin@buildright.co.za')
  console.log('  PM:      pm@buildright.co.za')
  console.log('  Foreman: thabo@buildright.co.za')
  console.log('  Foreman: sipho@buildright.co.za')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
