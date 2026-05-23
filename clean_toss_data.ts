import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tossUsers = await prisma.user.findMany({
    where: { username: { startsWith: 'toss_' } },
    select: { id: true }
  });

  const userIds = tossUsers.map(u => u.id);
  
  if (userIds.length === 0) {
    console.log("No Toss users found.");
    return;
  }

  console.log(`Found ${userIds.length} Toss users. Cleaning up related data...`);

  // Delete child records where toss users are the author or owner
  await prisma.comment.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.post.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.announcement.deleteMany({ where: { landlordId: { in: userIds } } });
  await prisma.maintenanceRequest.deleteMany({ 
    where: { OR: [{ tenantId: { in: userIds } }, { landlordId: { in: userIds } }] } 
  });
  await prisma.pushSubscription.deleteMany({ where: { userId: { in: userIds } } });
  
  // Invitations
  await prisma.invitation.deleteMany({ where: { landlordId: { in: userIds } } });

  // Payment Requests & Notifications
  await prisma.paymentRequest.deleteMany({ 
    where: { OR: [{ landlordId: { in: userIds } }, { tenantUserId: { in: userIds } }] } 
  });
  await prisma.bellNotification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  
  // Transactions
  await prisma.transaction.deleteMany({ where: { userId: { in: userIds } } });

  // Remove loginUserId from Physical Tenants if the tenant user is a toss user
  await prisma.tenant.updateMany({
    where: { loginUserId: { in: userIds } },
    data: { loginUserId: null }
  });

  // Tenants (Physical records created by landlord)
  await prisma.tenant.deleteMany({ where: { userId: { in: userIds } } });

  // Rooms
  await prisma.room.deleteMany({ where: { userId: { in: userIds } } });

  // Finally, delete the users
  const deleted = await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  console.log(`Successfully deleted ${deleted.count} Toss users and all their data.`);
}

main()
  .catch(console.error)
  .then(() => prisma.$disconnect());
