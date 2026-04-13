const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const user = await p.user.findUnique({ where: { username: 'wjsdudtns' } });
  console.log('\n=== wjsdudtns 계정 정보 ===');
  console.log(JSON.stringify(user, null, 2));

  if (user) {
    const rooms = await p.room.findMany({ where: { userId: user.id } });
    console.log(`\n=== 방 개수: ${rooms.length}개 ===`);
    rooms.forEach(r => console.log(` - ${r.name} (${r.status})`));
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e.message); p.$disconnect(); });
