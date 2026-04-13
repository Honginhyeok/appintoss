// ─── TENANTS ───────────────────────────────────────────────────────
async function loadTenants() {
  const result = await api('/api/tenants');
  tenants = Array.isArray(result) ? result : [];
  const tbody = document.getElementById('tenants-body');
  if (tbody) {
    tbody.innerHTML = tenants.map(t => {
      const rentBadge = t.rentType === 'YEARLY' ? '<span class="badge badge-success" style="font-size:10px;margin-right:3px">년세</span>'
        : t.rentType === 'CUSTOM' ? '<span class="badge badge-warning" style="font-size:10px;margin-right:3px">일정기간</span>'
        : '<span class="badge badge-info" style="font-size:10px;margin-right:3px">월세</span>';
      const payDayStr = t.rentPaymentDay ? ` <span style="font-size:11px;color:var(--primary);font-weight:600">(매월 ${t.rentPaymentDay}일)</span>` : '';
      const rentCell = t.rentAmount ? (rentBadge + fmt(t.rentAmount) + payDayStr) : '-';
      const actionBtns = '<button class="btn-icon" onclick="receiveRent(\'' + t.id + '\')" title="월세 수납">💰</button>'
        + '<button class="btn-icon" onclick="editTenant(\'' + t.id + '\')" title="수정">✏️</button>'
        + '<button class="btn-icon danger" onclick="deleteTenant(\'' + t.id + '\', \'' + t.name.replace(/'/g, "\\'") + '\')" title="삭제">🗑️</button>';
      return '<tr>'
        + '<td style="font-weight:600">' + t.name + '</td>'
        + '<td>' + t.phone + '</td>'
        + '<td>' + (t.room ? t.room.name : '<span style="color:var(--text-muted)">미배정</span>') + '</td>'
        + '<td>' + rentCell + '</td>'
        + '<td>' + (t.moveInDate ? fmtDate(t.moveInDate) : '-') + '</td>'
        + '<td>' + actionBtns + '</td>'
        + '</tr>';
    }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">등록된 세입자가 없습니다</td></tr>';
  }
}

function editTenant(id) {
  const t = tenants.find(t => t.id === id);
  if (!t) return;
  const titleEl = document.getElementById('tenant-modal-title');
  if (titleEl) titleEl.textContent = '세입자 정보 수정';

  const safeSetValue = (eid, val) => { 
    const el = document.getElementById(eid); 
    if (el) el.value = val; 
  };

  safeSetValue('tenant-edit-id', t.id);
  safeSetValue('t-name', t.name || '');
  safeSetValue('t-phone', t.phone || '');
  safeSetValue('t-room', t.roomId || '');
  safeSetValue('t-start', t.moveInDate ? t.moveInDate.split('T')[0] : '');
  safeSetValue('t-end', t.moveOutDate ? t.moveOutDate.split('T')[0] : '');
  safeSetValue('t-pay-day', t.rentPaymentDay || '');
  safeSetValue('t-rent-type', t.rentType || 'MONTHLY');
  safeSetValue('t-rent-amount', t.rentAmount || '');
  
  if (typeof toggleTenantPaymentDay === 'function') toggleTenantPaymentDay();

  // 레거시 필드 안전 매핑 (없는 DOM 접근 시 null 에러 방지)
  safeSetValue('tenant-name-input', t.name || '');
  safeSetValue('tenant-phone', t.phone || '');
  safeSetValue('tenant-room', t.roomId || '');
  safeSetValue('tenant-movein', t.moveInDate ? t.moveInDate.split('T')[0] : '');
  safeSetValue('tenant-moveout', t.moveOutDate ? t.moveOutDate.split('T')[0] : '');
  safeSetValue('tenant-rent-amount', t.rentAmount || '');
  safeSetValue('tenant-custom-start', t.customRentStartDate ? t.customRentStartDate.split('T')[0] : '');
  safeSetValue('tenant-custom-end', t.customRentEndDate ? t.customRentEndDate.split('T')[0] : '');
  safeSetValue('tenant-deposit-input', t.deposit || '');
  safeSetValue('tenant-notes', t.notes || '');

  const typeSelect = document.getElementById('tenant-rent-type');
  if (typeSelect) {
    typeSelect.value = t.rentType || 'MONTHLY';
    typeSelect.dispatchEvent(new Event('change'));
  }
  
  openModal('tenant-modal');
}

async function deleteTenant(id, name) {
  if (!confirm('"' + name + '" 세입자를 삭제하시겠습니까?')) return;
  await api('/api/tenants/' + id, 'DELETE');
  showToast('"' + name + '" 세입자가 삭제되었습니다.');
  await loadTenants();
  if (typeof loadRooms === 'function') await loadRooms();
}

async function receiveRent(id) {
  const t = tenants.find(t => t.id === id);
  if (!t) return;
  if (!t.rentAmount) {
    alert('임대료가 설정되지 않은 세입자입니다.');
    return;
  }

  const typeStr = t.rentType === 'YEARLY' ? '년세' : (t.rentType === 'CUSTOM' ? '일정기간 임대료' : '월세');
  if (!confirm('"' + t.name + '" 님의 ' + typeStr + '(' + fmt(t.rentAmount) + ')를 수납 완료 처리하시겠습니까?\n(수입 내역에 자동 등록됩니다)')) return;

  const data = {
    type: 'INCOME',
    category: 'RENT',
    roomId: t.roomId || null,
    amount: t.rentAmount,
    date: new Date().toISOString().split('T')[0],
    description: t.name + ' ' + typeStr + ' 수납',
  };

  await api('/api/transactions', 'POST', data);
  showToast(t.name + '님의 월세 수납 완료! 💰');
  if (typeof loadTransactions === 'function') await loadTransactions();
  if (typeof loadSummary === 'function') await loadSummary();
}

window.openTenantRegistrationModal = function() {
  const select = document.getElementById('t-room');
  if (select) {
    // 로컬 스토리지 또는 window.rooms 강제 조회
    const storedRooms = window.rooms || JSON.parse(localStorage.getItem('rooms') || '[]');
    // 현재 로그인한 임대인의 방 중 공실(VACANT)이거나 상태가 없는 방(안전처리)만 필터링
    const vacantRooms = storedRooms.filter(r => r.userId === currentUser.id && (!r.status || r.status === 'VACANT'));
    
    if (vacantRooms.length > 0) {
      select.innerHTML = vacantRooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    } else {
      select.innerHTML = '<option value="">배정 가능한 빈 방이 없습니다</option>';
    }
  }

  // 폼 초기화
  const els = ['tenant-edit-id', 't-name', 't-phone', 't-start', 't-end', 't-pay-day', 't-rent-amount'];
  els.forEach(f => {
    const el = document.getElementById(f);
    if(el) el.value = '';
  });
  const tType = document.getElementById('t-rent-type');
  if (tType) tType.value = 'MONTHLY';
  
  if (typeof toggleTenantPaymentDay === 'function') toggleTenantPaymentDay();

  const titleEl = document.getElementById('tenant-modal-title');
  if (titleEl) titleEl.textContent = '세입자 등록';

  openModal('tenant-modal');
};
