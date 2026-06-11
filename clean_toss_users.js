const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanTossUsers() {
  try {
    console.log('Fetching test users...');
    const targetUsers = await prisma.user.findMany({
      where: {
        username: { startsWith: 'toss_' },
        NOT: [
          { username: 'toss_wjsdudtns' },
          { username: 'wjsdudtns' },
          { username: 'admin' },
          { roles: { has: 'ADMIN' } }
        ]
      },
      select: { id: true }
    });

    const userIds = targetUsers.map(u => u.id);
    if (userIds.length === 0) {
      console.log('No Toss test users to delete.');
      return;
    }

    console.log(`Deleting ${userIds.length} test users...`);

    await prisma.pushSubscription.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.comment.deleteMany({ where: { authorId: { in: userIds } } });
    await prisma.post.deleteMany({ where: { authorId: { in: userIds } } });
    await prisma.maintenanceRequest.deleteMany({
      where: { OR: [{ tenantId: { in: userIds } }, { landlordId: { in: userIds } }] }
    });
    await prisma.announcement.deleteMany({ where: { landlordId: { in: userIds } } });
    await prisma.invitation.deleteMany({
      where: { OR: [{ landlordId: { in: userIds } }, { usedBy: { in: userIds } }] }
    });
    await prisma.transaction.deleteMany({ where: { userId: { in: userIds } } });
    
    await prisma.tenant.updateMany({
      where: { loginUserId: { in: userIds } },
      data: { loginUserId: null }
    });
    await prisma.tenant.deleteMany({ where: { userId: { in: userIds } } });

    await prisma.room.updateMany({
      where: { userId: { in: userIds } },
      data: { userId: null }
    });
    await prisma.room.deleteMany({ where: { userId: { in: userIds } } });

    const result = await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    console.log(`Successfully deleted ${result.count} Toss test users.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTossUsers();
