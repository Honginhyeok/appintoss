// ─── BACKUP & RESTORE ─────────────────────────────────────────────
function _downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadBackup() {
  showToast('📦 백업 중...');
  const backup = await api('/api/admin/backup');
  if (!backup || backup.error) {
    showToast('❌ 백업 실패: ' + (backup?.error || '알 수 없는 오류'));
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const jsonFilename = 'hostel-backup-' + date + '.json';

  _downloadFile(JSON.stringify(backup, null, 2), jsonFilename, 'application/json');

  setTimeout(() => {
    _downloadFile(_generateRestoreScript(jsonFilename), 'restore.js', 'text/javascript');
    showToast('✅ 백업 완료! ' + jsonFilename + ' + restore.js 다운로드됨');
  }, 500);
}

function _generateRestoreScript(backupFilename) {
  const lines = [
    '#!/usr/bin/env node',
    '/**',
    ' * ╔══════════════════════════════════════════════════════════════╗',
    ' * ║         호스텔 관리 시스템 — 데이터 복원 스크립트              ║',
    ' * ╚══════════════════════════════════════════════════════════════╝',
    ' *',
    ' * 백업 파일: ' + backupFilename,
    ' * 생성일시: ' + new Date().toISOString(),
    ' *',
    ' * ── 사용법 ──────────────────────────────────────────────────────',
    ' * 1. 이 파일과 백업 JSON을 같은 폴더에 놓기',
    ' * 2. DATABASE_URL 설정 (아래 또는 환경변수)',
    ' * 3. npm install @prisma/client 실행',
    ' * 4. node restore.js',
    " *    또는: node restore.js 다른-백업파일.json",
    ' * ────────────────────────────────────────────────────────────────',
    ' */',
    '',
    "const path = require('path');",
    "const fs   = require('fs');",
    '',
    '// ── 설정 (필요 시 직접 수정) ──────────────────────────────────────',
    "const DATABASE_URL = process.env.DATABASE_URL || 'YOUR_DATABASE_URL_HERE';",
    "const BACKUP_FILE  = process.argv[2] || '" + backupFilename + "';",
    '// ────────────────────────────────────────────────────────────────',
    '',
    'async function restore() {',
    "  const { PrismaClient } = require('@prisma/client');",
    '',
    '  const filePath = path.resolve(BACKUP_FILE);',
    '  if (!fs.existsSync(filePath)) {',
    "    console.error('❌ 백업 파일을 찾을 수 없습니다:', filePath);",
    '    process.exit(1);',
    '  }',
    '',
    "  console.log('\\n📂 백업 파일 로드 중:', filePath);",
    "  const backup = JSON.parse(fs.readFileSync(filePath, 'utf-8'));",
    '  const { users = [], rooms = [], tenants = [], transactions = [] } = backup.data;',
    '',
    "  console.log('📅 백업 생성일 :', backup.exportedAt);",
    "  console.log('👥 사용자     :', users.length, '명');",
    "  console.log('🚪 방         :', rooms.length, '개');",
    "  console.log('👤 세입자     :', tenants.length, '명');",
    "  console.log('💰 거래내역   :', transactions.length, '건');",
    "  console.log('');",
    '',
    '  const prisma = new PrismaClient({',
    '    datasources: { db: { url: DATABASE_URL } }',
    '  });',
    '',
    '  try {',
    '    await prisma.$connect();',
    "    console.log('✅ DB 연결 성공\\n');",
    '',
    '    // 1. 사용자 복원',
    "    console.log('👥 사용자 복원 중...');",
    '    for (const u of users) {',
    '      await prisma.user.upsert({',
    '        where:  { id: u.id },',
    '        update: { username: u.username, role: u.role, plainPassword: u.plainPassword },',
    '        create: {',
    '          id: u.id, username: u.username, role: u.role,',
    '          plainPassword: u.plainPassword,',
    "          password: u.password || '$2b$10$placeholder_reset_required______________________'",
    '        }',
    '      });',
    '    }',
    "    console.log('   ✅', users.length, '명 완료');",
    '',
    '    // 2. 방 복원',
    "    console.log('🚪 방 복원 중...');",
    '    for (const r of rooms) {',
    '      const { user, tenants: _t, transactions: _tx, ...data } = r;',
    '      await prisma.room.upsert({ where: { id: r.id }, update: data, create: data });',
    '    }',
    "    console.log('   ✅', rooms.length, '개 완료');",
    '',
    '    // 3. 세입자 복원',
    "    console.log('👤 세입자 복원 중...');",
    '    for (const t of tenants) {',
    '      const { user, room, ...data } = t;',
    '      await prisma.tenant.upsert({ where: { id: t.id }, update: data, create: data });',
    '    }',
    "    console.log('   ✅', tenants.length, '명 완료');",
    '',
    '    // 4. 거래내역 복원',
    "    console.log('💰 거래내역 복원 중...');",
    '    for (const tx of transactions) {',
    '      const { user, room, ...data } = tx;',
    '      await prisma.transaction.upsert({ where: { id: tx.id }, update: data, create: data });',
    '    }',
    "    console.log('   ✅', transactions.length, '건 완료');",
    '',
    "    console.log('\\n🎉 복원 완료!');",
    "    console.log('   ⚠️  비밀번호는 bcrypt 해시로 저장됩니다.');",
    "    console.log('   ⚠️  복원 후 관리자 비밀번호를 재설정하세요.');",
    '',
    '  } catch(e) {',
    "    console.error('\\n❌ 오류 발생:', e.message);",
    '    process.exit(1);',
    '  } finally {',
    '    await prisma.$disconnect();',
    '  }',
    '}',
    '',
    'restore();'
  ];
  return lines.join('\n');
}
