const fetch = require('node-fetch');

async function testToggle() {
  console.log('1. Admin 로그인 중...');
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password123!' }) // 가정된 어드민 비번
  });
  
  if (!loginRes.ok) {
    console.log('Admin 로그인 실패. (비밀번호가 다를 수 있음)');
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Admin 로그인 성공! Token 발급됨.');

  console.log('2. 유저 목록 가져오기...');
  const usersRes = await fetch('http://localhost:3000/api/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const users = await usersRes.json();
  
  if (users.length === 0) {
    console.log('유저가 없습니다.');
    return;
  }
  
  const testUser = users.find(u => u.username !== 'admin');
  if (!testUser) {
    console.log('테스트할 일반 유저가 없습니다.');
    return;
  }

  console.log(`테스트 유저: ${testUser.username}, 현재 결제상태: ${testUser.isSubscribed}`);
  
  const newState = !testUser.isSubscribed;
  console.log(`3. 결제 상태를 ${newState}로 변경 테스트...`);
  
  const toggleRes = await fetch(`http://localhost:3000/api/users/${testUser.id}/subscription`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ isSubscribed: newState })
  });
  
  const toggleData = await toggleRes.json();
  if (toggleData.success) {
    console.log(`✅ 토글 성공! 유저의 결제상태가 ${newState}로 변경되었습니다.`);
  } else {
    console.log('❌ 토글 실패:', toggleData);
  }
}

testToggle().catch(console.error);
