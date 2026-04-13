import { useState } from 'react';
import { Button } from '../components/tds';

export function Settings() {
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [name, setName] = useState('');

  const handleSave = () => {
    alert('계좌가 성공적으로 등록/수정되었습니다. (Mock)');
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>정산 계좌 관리</h2>
      <p style={{ color: '#4e5968', fontSize: '14px', marginBottom: '32px' }}>임차인의 토스 송금을 받을 계좌입니다.</p>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>은행명</label>
        <select 
           value={bank} 
           onChange={(e) => setBank(e.target.value)}
           style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e5e8eb', fontSize: '16px' }}>
          <option value="">은행 선택</option>
          <option value="국민">KB국민은행</option>
          <option value="신한">신한은행</option>
          <option value="토스">토스뱅크</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>계좌번호</label>
        <input 
           type="text" 
           value={account} 
           onChange={(e) => setAccount(e.target.value.replace(/[^0-9]/g, ''))}
           placeholder="숫자만 입력"
           style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e5e8eb', fontSize: '16px' }} />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>예금주</label>
        <input 
           type="text" 
           value={name} 
           onChange={(e) => setName(e.target.value)}
           placeholder="홍길동"
           style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #e5e8eb', fontSize: '16px' }} />
      </div>

      <Button variant="primary" onClick={handleSave}>
        계좌 저장하기
      </Button>
    </div>
  );
}
