const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({ where: { username: 'wjsdudtns' } });
  try { 
    const r = await prisma.room.findMany({ 
      where: { userId: u.id }, 
      include: { tenants: true, transactions: true } 
    }); 
    console.log('success:', r.length); 
    console.log(JSON.stringify(r.map(x => x.name)));
  } catch (e) { 
    console.log('ERROR:', e.message); 
  } 
}
main().catch(e=>console.log(e)).finally(() => prisma.$disconnect());
