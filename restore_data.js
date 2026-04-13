const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const p = new PrismaClient();

(async () => {
  // 1. Recreate admin user
  const adminPw = await bcrypt.hash('admin123', 10);
  const admin = await p.user.create({
    data: {
      username: 'admin',
      password: adminPw,
      plainPassword: 'admin123',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });
  console.log('✅ Admin created:', admin.id);

  // 2. Recreate testuser (wjsdudtns)
  const testPw = await bcrypt.hash('wjsdudtns', 10);
  const testUser = await p.user.create({
    data: {
      username: 'wjsdudtns',
      password: testPw,
      plainPassword: 'wjsdudtns',
      role: 'USER',
      status: 'ACTIVE'
    }
  });
  console.log('✅ testuser created:', testUser.id);

  // 3. Recreate rooms (under testuser)
  const roomsData = [
    { name: '201호', floor: 2, area: 15, status: 'OCCUPIED', monthlyRent: 666666, deposit: 10000000, userId: testUser.id },
    { name: '202호', floor: 2, area: 15, status: 'OCCUPIED', monthlyRent: 666666, deposit: 10000000, userId: testUser.id },
    { name: '301호', floor: 3, area: 18, status: 'OCCUPIED', monthlyRent: 750000, deposit: 10000000, userId: testUser.id },
    { name: '302호', floor: 3, area: 15, status: 'OCCUPIED', monthlyRent: 666666, deposit: 10000000, userId: testUser.id },
  ];
  
  const rooms = {};
  for (const rd of roomsData) {
    const room = await p.room.create({ data: rd });
    rooms[room.name] = room;
    console.log('✅ Room:', room.name, room.id);
  }

  // 4. Recreate tenants
  const tenantsData = [
    { name: '전영순', phone: '010-3009-7281', roomId: null, moveInDate: new Date('2022-09-01'), moveOutDate: new Date('2028-12-31'), deposit: 5000000, rentType: 'MONTHLY', rentAmount: null, notes: '자가입', userId: testUser.id },
    { name: '박성재(201)', phone: '01049357684', roomId: rooms['201호'].id, moveInDate: new Date('2025-02-20'), deposit: 3000000, rentType: 'MONTHLY', rentAmount: 666666, userId: testUser.id },
    { name: '김선영', phone: '01024234284', roomId: rooms['202호'].id, moveInDate: new Date('2024-12-20'), deposit: 3000000, rentType: 'MONTHLY', rentAmount: 666666, userId: testUser.id },
    { name: '남궁준', phone: '01051064071', roomId: rooms['301호'].id, moveInDate: new Date('2025-03-30'), deposit: 3000000, rentType: 'MONTHLY', rentAmount: 750000, userId: testUser.id },
    { name: '302', phone: '01066655137', roomId: rooms['302호'].id, moveInDate: new Date('2024-12-24'), deposit: 3000000, rentType: 'MONTHLY', rentAmount: 666666, userId: testUser.id },
  ];

  for (const td of tenantsData) {
    const tenant = await p.tenant.create({ data: td });
    console.log('✅ Tenant:', tenant.name);
  }

  // 5. Recreate key transactions (from earlier session data)
  const txsData = [
    { type: 'EXPENSE', category: 'MAINTENANCE', amount: 20000, date: new Date('2026-01-10'), description: '수리비', userId: testUser.id, roomId: rooms['201호'].id },
    { type: 'EXPENSE', category: 'MAINTENANCE', amount: 300000, date: new Date('2026-03-15'), description: '유지보수', userId: testUser.id, roomId: rooms['201호'].id },
    { type: 'EXPENSE', category: 'UTILITY', amount: 700000, date: new Date('2026-04-01'), description: '공과금', userId: testUser.id },
    { type: 'INCOME', category: 'RENT', amount: 666666, date: new Date('2026-04-05'), description: '박성재 월세 수납', userId: testUser.id, roomId: rooms['201호'].id },
    { type: 'INCOME', category: 'RENT', amount: 666666, date: new Date('2026-04-05'), description: '김선영 월세 수납', userId: testUser.id, roomId: rooms['202호'].id },
    { type: 'INCOME', category: 'RENT', amount: 750000, date: new Date('2026-04-05'), description: '남궁준 월세 수납', userId: testUser.id, roomId: rooms['301호'].id },
    { type: 'INCOME', category: 'RENT', amount: 666666, date: new Date('2026-04-05'), description: '302 월세 수납', userId: testUser.id, roomId: rooms['302호'].id },
    { type: 'INCOME', category: 'DEPOSIT', amount: 750000, date: new Date('2026-04-07'), description: '보증금 수령', userId: testUser.id, roomId: rooms['301호'].id },
  ];

  for (const tx of txsData) {
    await p.transaction.create({ data: tx });
  }
  console.log('✅ Transactions created:', txsData.length);

  console.log('\n=== 데이터 복구 완료! ===');
  await p.$disconnect();
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
