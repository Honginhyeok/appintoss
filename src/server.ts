import app from './app';
import { PORT } from './config/env';
import { prisma } from './config/db';
import bcrypt from 'bcrypt';

app.listen(PORT, async () => {
  // DB 초기화 스크립트: 기본 관리자 및 사용자 생성
  try {
    // 1. admin 계정 확인/생성
    const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!adminExists) {
      console.log('Creating default admin account...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: { username: 'admin', password: hashedPassword, role: 'ADMIN' }
      });
    }

    // 2. wjsdudtns 계정 확인/생성
    const userExists = await prisma.user.findUnique({ where: { username: 'wjsdudtns' } });
    if (!userExists) {
      console.log('Creating primary operator account (wjsdudtns)...');
      const hashedPassword = await bcrypt.hash('wjsdudtns1', 10);
      await prisma.user.create({
        data: { username: 'wjsdudtns', password: hashedPassword, role: 'USER' }
      });
    }
  } catch(e) {
    console.error('Error in user initialization:', e);
  }
  console.log(`🚀 Hostel Management Server running on http://localhost:${PORT}`);
});
