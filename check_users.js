const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, phone: true, roles: true, createdAt: true }
  });
  console.log(users);
}
check().catch(console.error).finally(() => prisma.$disconnect());
