const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users:');
  users.forEach(u => console.log(u.username));
  
  const rooms = await prisma.room.findMany();
  console.log('\nTotal rooms globally:', rooms.length);
  if (rooms.length > 0) {
    console.log('Rooms mapped to:');
    rooms.forEach(r => {
      const owner = users.find(u => u.id === r.userId);
      console.log(' -', r.name, '->', owner ? owner.username : 'Unknown user (' + r.userId + ')');
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
