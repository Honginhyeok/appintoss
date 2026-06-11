const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubscriptions() {
  try {
    const subscribedUsers = await prisma.user.findMany({
      where: {
        isSubscribed: true
      },
      select: {
        id: true,
        username: true,
        name: true,
        roles: true,
        subscriptionTier: true
      }
    });
    
    console.log(`총 ${subscribedUsers.length}명의 사용자가 프리미엄 구독 중입니다.`);
    if (subscribedUsers.length > 0) {
      console.log(JSON.stringify(subscribedUsers, null, 2));
    }
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubscriptions();
