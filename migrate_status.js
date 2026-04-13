const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.user.updateMany({ data: { status: 'ACTIVE' } });
  console.log('Updated', r.count, 'users to ACTIVE');
  await p.$disconnect();
})();
