const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTossUsers() {
  try {
    const result = await prisma.user.deleteMany({
      where: {
        username: {
          startsWith: 'toss_'
        }
      }
    });
    console.log(`Deleted ${result.count} Toss test users.`);
  } catch (e) {
    console.error('Error deleting Toss users:', e);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTossUsers();
