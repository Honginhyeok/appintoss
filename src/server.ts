import 'dotenv/config';

import app from './app';
import { PORT } from './config/env';
import { prisma } from './config/db';
import bcrypt from 'bcrypt';

app.listen(PORT, async () => {
  // DB 초기화 스크립트: 기본 관리자 및 사용자 생성
  try {
    // 1. admin 계정 확인/생성 (비밀번호: admin1)
    const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
    const adminPassword = await bcrypt.hash('admin1', 10);
    if (!adminExists) {
      console.log('Creating default admin account...');
      await prisma.user.create({
        data: { username: 'admin', password: adminPassword, roles: ['ADMIN'] }
      });
      console.log('✅ 초기 Admin 계정이 DB에 생성되었습니다.');
    } else {
      await prisma.user.update({
        where: { username: 'admin' },
        data: { password: adminPassword }
      });
      console.log('✅ 기존 Admin 계정의 비밀번호를 admin1으로 업데이트했습니다.');
    }

    // 2. wjsdudtns 계정 확인/생성
    const userExists = await prisma.user.findUnique({ where: { username: 'wjsdudtns' } });
    if (!userExists) {
      console.log('Creating primary operator account (wjsdudtns)...');
      const hashedPassword = await bcrypt.hash('wjsdudtns1', 10);
      await prisma.user.create({
        data: { username: 'wjsdudtns', password: hashedPassword, roles: ['LANDLORD'] }
      });
    }
  } catch(e) {
    console.error('Error in user initialization:', e);
  }
  console.log(`🚀 Hostel Management Server running on http://localhost:${PORT}`);
});
