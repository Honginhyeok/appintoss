import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'wjsdudtns' }
  });
  if (user) {
    console.log('Password (plainPassword):', user.plainPassword);
  } else {
    console.log('User not found.');
  }
  await prisma.$disconnect();
}

main();
