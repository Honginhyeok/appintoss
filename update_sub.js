const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  const user = await prisma.user.findFirst({
    where: { username: 'toss_kUqd0R1RiunOpsHoSC4t8XfCrQLE48Q=' }
  });
  
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isSubscribed: true }
    });
    console.log('User subscription activated:', user.username);
  } else {
    console.log('User not found.');
  }
}

update().catch(console.error).finally(() => prisma.$disconnect());
