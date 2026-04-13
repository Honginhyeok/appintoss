import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ select: { username: true, plainPassword: true, role: true } });
  console.log(users.slice(0, 5));
}
run();
