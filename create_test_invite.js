const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  let landlord = await prisma.user.findFirst({where: {role: {in: ['LANDLORD', 'ADMIN']}}});
  if (!landlord) {
    console.log("No valid user found");
    return;
  }
  
  let room = await prisma.room.findFirst({where: {userId: landlord.id, name: '201호'}});
  if (!room) {
    room = await prisma.room.create({data: {name: '201호', status: 'AVAILABLE', userId: landlord.id}});
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Tenant', 
      phone: '01011112222', 
      moveInDate: new Date(), 
      moveOutDate: new Date(Date.now() + 86400000*30), 
      deposit: 10000, 
      rentAmount: 1000, 
      roomId: room.id, 
      rentType: 'MONTHLY', 
      rentPaymentDay: 1
    }
  });

  const invite = await prisma.invitation.create({
    data: {
      code: Math.random().toString(36).substring(2, 10).toUpperCase(), 
      landlordId: landlord.id, 
      tenantId: tenant.id, 
      expiresAt: new Date(Date.now() + 86400000)
    }
  });

  console.log('--- TEST DATA ---');
  console.log('Landlord Username:', landlord.username);
  console.log('Landlord Password:', landlord.plainPassword);
  console.log('Room Name:', room.name);
  console.log('Invite Code:', invite.code);
}
main().finally(() => prisma.$disconnect());
