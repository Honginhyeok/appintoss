const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRentData() {
  // Get all tenants with their room data
  const tenants = await prisma.tenant.findMany({
    include: { room: true }
  });

  console.log(`Found ${tenants.length} tenants to check...\n`);

  let updated = 0;
  for (const t of tenants) {
    if (t.rentAmount === null && t.room && t.room.monthlyRent) {
      console.log(`✅ ${t.name}: room "${t.room.name}" monthlyRent=${t.room.monthlyRent} → rentAmount=${t.room.monthlyRent}`);
      await prisma.tenant.update({
        where: { id: t.id },
        data: {
          rentAmount: t.room.monthlyRent,
          rentType: 'MONTHLY'
        }
      });
      updated++;
    } else if (t.rentAmount !== null) {
      console.log(`⏭️ ${t.name}: already has rentAmount=${t.rentAmount}, skipping`);
    } else {
      console.log(`⚠️ ${t.name}: no room or room has no monthlyRent, skipping`);
    }
  }

  console.log(`\n=== Done! Updated ${updated}/${tenants.length} tenants ===`);
  await prisma.$disconnect();
}

migrateRentData().catch(e => { console.error(e); process.exit(1); });
