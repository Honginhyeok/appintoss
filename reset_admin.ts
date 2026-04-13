import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  await prisma.user.update({
    where: { username: 'admin' },
    data: { isSubscribed: false, subscriptionTier: 'FREE' }
  });
  
  const admin = await prisma.user.findUnique({where: {username:'admin'}});
  if(!admin) return;
  
  await prisma.room.deleteMany({where: {userId: admin.id}});
  
  for(let i=1; i<=3; i++) {
    await prisma.room.create({data: {name: `기존방 ${i}`, rentType: '월세', deposit: 1000000, notes: '...', user: {connect: {id: admin.id}}}});
  }
  console.log('초기화 완료!');
}
run().catch(console.error).finally(()=>prisma.$disconnect());
