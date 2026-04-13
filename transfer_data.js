const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });
  const targetUser = await prisma.user.findUnique({ where: { username: 'wjsdudtns' } });

  if (!adminUser || !targetUser) {
    console.log('User(s) not found');
    return;
  }

  const adminId = adminUser.id;
  const targetId = targetUser.id;

  // 1. 방 이전
  const updateRooms = await prisma.room.updateMany({
    where: { userId: adminId },
    data: { userId: targetId }
  });
  console.log(`Transferred ${updateRooms.count} rooms.`);

  // 2. 세입자 이전
  const updateTenants = await prisma.tenant.updateMany({
    where: { userId: adminId },
    data: { userId: targetId }
  });
  console.log(`Transferred ${updateTenants.count} tenants.`);

  // 3. 거래 내역 이전
  const updateTxs = await prisma.transaction.updateMany({
    where: { userId: adminId },
    data: { userId: targetId }
  });
  console.log(`Transferred ${updateTxs.count} transactions.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
