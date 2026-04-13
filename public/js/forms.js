// ─── TAB REFRESH ──────────────────────────────────────────────────
async function refreshTab(tab) {
  switch (tab) {
    case 'summary': await loadSummary(); break;
    case 'rooms': await loadRooms(); break;
    case 'tenants': await loadRooms(); await loadTenants(); break;
    case 'transactions': await loadRooms(); await loadTransactions(); break;
    case 'notifications': await loadLogs(); break;
    case 'users': await loadUsers(); break;
    case 'invitations': if (typeof loadInvitations === 'function') await loadInvitations(); break;
    case 'announcements': if (typeof loadAnnouncements === 'function') await loadAnnouncements(); break;
    case 'maintenance': if (typeof loadMaintenanceRequests === 'function') await loadMaintenanceRequests(); break;
    case 'payments': if (typeof loadPayments === 'function') await loadPayments(); break;
  }
}

// ─── SAFE FORM BINDER ─────────────────────────────────────────────
// 각 폼을 안전하게 바인딩. 하나가 실패해도 나머지가 등록되도록 방어.
function safeBindForm(formId, handler) {
  try {
    const form = document.getElementById(formId);
    if (form) {
      form.addEventListener('submit', handler);
    } else {
      console.warn(`[forms] Form not found: #${formId}`);
    }
  } catch (err) {
    console.error(`[forms] Error binding form #${formId}:`, err);
  }
}

// ─── FORMS ────────────────────────────────────────────────────────
function initForms() {

  // ── Room Form ──
  safeBindForm('room-form', async e => {
    e.preventDefault();
    const id = document.getElementById('room-id').value;
    const data = {
      name: (document.getElementById('r-name') || {}).value || '',
      rentType: (document.getElementById('r-rent-type') || {}).value || 'MONTHLY',
      notes: (document.getElementById('r-desc') || {}).value || null,
      monthlyRent: parseFloat((document.getElementById('r-rent') || {}).value) || null,
      deposit: parseFloat((document.getElementById('r-deposit') || {}).value) || null,
    };
    if (!data.name) return alert('방 이름을 입력하세요');

    // ① 저장 직전 데이터 확인
    console.log('[방 저장] 생성 직전 데이터:', JSON.stringify(data), '| 수정 ID:', id || '(신규)');

    let result;
    if (id) {
      result = await api(`/api/rooms/${id}`, 'PUT', data);
      if (result && result.error) {
        console.error('[방 저장] 수정 실패:', result.error);
        return alert('방 수정 실패: ' + result.error);
      }
      showToast('방 정보가 수정되었습니다.');
    } else {
      result = await api('/api/rooms', 'POST', data);
      if (!result || result.error) {
        console.error('[방 저장] 추가 실패:', result?.error);
        return alert('방 추가 실패: ' + (result?.error || '서버 오류'));
      }
      showToast('새 방이 추가되었습니다! 🚪');
    }

    closeModal('room-modal');

    // ② 저장 후 전역 rooms 즉시 동기화 → 화면 렌더링
    await loadRooms();
    console.log('[방 저장] 저장 후 전체 방 배열 (rooms):', JSON.stringify(rooms.map(r => ({ id: r.id, name: r.name, userId: r.userId }))));

    // ③ 대시보드 요약/차트도 즉시 업데이트 (전역 rooms/txsList 기반)
    if (typeof loadSummary === 'function') await loadSummary();
  });


  // ── Tenant Form ──
  const rentTypeSelect = document.getElementById('tenant-rent-type');
  if (rentTypeSelect) {
    rentTypeSelect.addEventListener('change', (e) => {
      const datesGroup = document.getElementById('custom-rent-dates-group');
      if (datesGroup) {
        if (e.target.value === 'CUSTOM') {
          datesGroup.classList.remove('hidden');
        } else {
          datesGroup.classList.add('hidden');
        }
      }
    });
  }

  safeBindForm('tenant-form', async e => {
    e.preventDefault();
    const id = document.getElementById('tenant-edit-id').value;
    const data = {
      name: (document.getElementById('t-name') || document.getElementById('tenant-name-input') || {}).value || '',
      phone: ((document.getElementById('t-phone') || document.getElementById('tenant-phone') || {}).value || '').replace(/[^0-9]/g, ''),
      roomId: (document.getElementById('t-room') || document.getElementById('tenant-room') || {}).value || null,
      moveInDate: (document.getElementById('t-start') || document.getElementById('tenant-movein') || {}).value || null,
      moveOutDate: (document.getElementById('t-end') || document.getElementById('tenant-moveout') || {}).value || null,
      rentPaymentDay: (document.getElementById('t-pay-day') || {}).value || null,
      rentType: (document.getElementById('t-rent-type') || document.getElementById('tenant-rent-type') || {}).value || 'MONTHLY',
      rentAmount: parseFloat((document.getElementById('t-rent-amount') || document.getElementById('tenant-rent-amount') || {}).value) || null,
    };
    if (id) {
      await api(`/api/tenants/${id}`, 'PUT', data);
      showToast('세입자 정보가 수정되었습니다.');
    } else {
      await api('/api/tenants', 'POST', data);
      showToast('세입자가 등록되었습니다! 👤');
    }
    closeModal('tenant-modal');
    await loadTenants();
    await loadRooms();
  });

  // ── Transaction Form (HTML id="tx-form") ──
  safeBindForm('tx-form', async e => {
    e.preventDefault();
    const id = document.getElementById('tx-id').value;
    const category = document.getElementById('tx-category').value;
    const finalCategory = category === 'OTHER'
      ? (document.getElementById('tx-custom-category').value || 'OTHER')
      : category;
    const data = {
      type: document.getElementById('tx-type').value,
      category: finalCategory,
      roomId: document.getElementById('tx-room').value || null,
      amount: parseFloat(document.getElementById('tx-amount').value),
      date: document.getElementById('tx-date').value,
      description: document.getElementById('tx-description').value || null,
    };
    if (id) {
      await api(`/api/transactions/${id}`, 'PUT', data);
      showToast('거래 내역이 수정되었습니다.');
    } else {
      await api('/api/transactions', 'POST', data);
      showToast('거래 내역이 추가되었습니다! 💰');
    }
    closeModal('transaction-modal');
    const txForm = document.getElementById('tx-form');
    if (txForm) txForm.reset();
    const txIdField = document.getElementById('tx-id');
    if (txIdField) txIdField.value = '';
    const txDateField = document.getElementById('tx-date');
    if (txDateField) txDateField.value = new Date().toISOString().split('T')[0];
    const customCat = document.getElementById('custom-category-group');
    if (customCat) customCat.classList.add('hidden');
    await loadTransactions();
    await loadSummary();
  });

  // ── Notification Form (체크박스 기반 방 선택 발송) ──
  safeBindForm('notify-form', async e => {
    e.preventDefault();

    const typeRadios = document.getElementsByName('n-target-type');
    let targetType = 'ALL';
    for (const r of typeRadios) {
      if (r.checked) targetType = r.value;
    }

    let roomIds = [];
    if (targetType === 'SPECIFIC') {
      const checkedBoxes = document.querySelectorAll('input[name="n-target-room-id"]:checked');
      checkedBoxes.forEach(cb => roomIds.push(cb.value));
      if (roomIds.length === 0) {
        return alert('발송할 방을 최소 1개 이상 선택해주세요.');
      }
    }

    const template = document.getElementById('use-case').value;

    // 결제 관련 템플릿 검사 (정산 계좌 정보 필수 확인)
    const paymentTemplates = ['RENT_DUE', 'OVERDUE_PAYMENT'];
    if (paymentTemplates.includes(template)) {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (!u.settlementAccount || !u.settlementBank || !u.settlementName) {
        return alert('월세 청구 알림을 보내려면 먼저 우측 상단 설정(⚙️)에서 정산 계좌를 등록해 주세요.');
      }
    }

    const btnText = document.getElementById('btn-text');
    const loader = document.getElementById('btn-loader');
    if (btnText) btnText.classList.add('hidden');
    if (loader) loader.classList.remove('hidden');

    const result = await api('/api/notify', 'POST', { targetType, roomIds, template });

    if (btnText) btnText.classList.remove('hidden');
    if (loader) loader.classList.add('hidden');

    if (result.error) {
      return alert('발송 실패: ' + result.error);
    }

    const sentCount = result.sentCount || 0;
    showToast(`알림 발송 완료! 🔔 (${sentCount}건 발송)`);

    // 라디오 초기화
    const allRadio = document.querySelector('input[name="n-target-type"][value="ALL"]');
    if (allRadio) { allRadio.checked = true; toggleNotifyTarget(); }

    await loadLogs();
  });

  // ── Landlord Login Form ──
  safeBindForm('landlord-login-form', async e => {
    e.preventDefault();
    const username = document.getElementById('landlord-login-id').value;
    const password = document.getElementById('landlord-login-pw').value;
    const result = await api('/api/auth/login', 'POST', { username, password, loginType: 'landlord' });
    if (result.success) {
      showToast('로그인 성공!');
      await checkAuth();
    } else {
      alert(result.error || '로그인 실패');
    }
  });

  // ── Tenant Login Form (전화번호 단일 인증, No-Password) ──
  safeBindForm('tenant-login-form', async e => {
    e.preventDefault();
    const phoneRaw = document.getElementById('tenant-login-phone').value;
    const phone = phoneRaw.replace(/[^0-9]/g, ''); // 하이픈 제거, 순수 숫자열

    if (!phone || phone.length < 10) return alert('올바른 휴대폰 번호를 입력하세요');

    const result = await api('/api/auth/login', 'POST', { phone, role: 'TENANT' });

    if (result.success) {
      if (typeof showToast === 'function') showToast('로그인 성공!');
      await checkAuth();
    } else {
      alert(result.error || '로그인 실패');
    }
  });

window.checkUsernameDuplication = async function() {
  const input = document.getElementById('reg-id');
  const msg = document.getElementById('reg-id-msg');
  if (!input || !msg) return;

  const username = input.value.trim();
  if (username.length < 2) {
    msg.style.color = 'var(--text-muted)';
    msg.textContent = '아이디는 2자 이상 입력해주세요.';
    return;
  }

  const result = await api(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
  if (!result) return;
  
  if (result.available) {
    msg.style.color = '#10b981'; // Green
    msg.textContent = result.message || '사용 가능한 아이디입니다.';
    window.isUsernameChecked = true;
  } else {
    msg.style.color = 'var(--primary)'; // Red/Pink
    msg.textContent = result.message || '이미 존재하는 아이디입니다.';
    window.isUsernameChecked = false;
  }
};

  // ── Register Form (임대인 - 전화번호 필드 추가됨) ──
  safeBindForm('register-form', async e => {
    e.preventDefault();
    if (!window.isUsernameChecked) return alert('아이디 중복확인을 먼저 진행해주세요.');

    const name = document.getElementById('reg-name').value;
    const username = document.getElementById('reg-id').value;
    const phoneRaw = document.getElementById('reg-phone').value;
    const phone = phoneRaw.replace(/[^0-9]/g, ''); // 하이픈 제거
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pw').value;
    const password2 = document.getElementById('reg-pw2').value;

    if (!phone || phone.length < 10) return alert('올바른 휴대폰 번호를 입력하세요');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return alert('올바른 이메일 형식이 아닙니다.');

    if (password !== password2) return alert('비밀번호가 일치하지 않습니다.');
    if (password.length < 4) return alert('비밀번호는 4자 이상이어야 합니다.');

    const result = await api('/api/auth/register', 'POST', { username, name, phone, email, password, role: 'LANDLORD' });
    if (result.success) {
      if (typeof showToast === 'function') showToast('회원가입이 완료되었습니다. 로그인해 주세요.');
      else alert('회원가입이 완료되었습니다. 로그인해 주세요.');
      
      document.getElementById('register-form').reset();
      if (typeof toggleSignupMode === 'function') {
        toggleSignupMode(false);
      } else {
        toggleAuthPanel('landlord-login');
      }
    } else {
      alert(result.error || '가입 실패');
    }
  });

  // ── Tenant Register Form (No-Password: 성함/전화번호/방번호/초대코드) ──
  safeBindForm('tenant-register-form', async e => {
    e.preventDefault();
    const name = document.getElementById('treg-name').value;
    const phoneRaw = document.getElementById('treg-phone').value;
    const phone = phoneRaw.replace(/[^0-9]/g, ''); // 하이픈 제거
    const inviteCode = document.getElementById('treg-code').value;

    if (!name) return alert('성함을 입력하세요');
    if (!phone || phone.length < 10) return alert('올바른 휴대폰 번호를 입력하세요');
    if (!inviteCode) return alert('초대 코드를 입력하세요');

    const btn = e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');
    if (btn) { btn.textContent = "가입 중..."; btn.disabled = true; }

    const result = await api('/api/auth/register-tenant', 'POST', { name, phone, inviteCode });

    if (btn) { btn.textContent = "임차인 가입하기"; btn.disabled = false; }

    if (result.success) {
      alert(result.message || '가입 완료! 바로 로그인하실 수 있습니다.');
      document.getElementById('tenant-register-form').reset();
      toggleAuthPanel('tenant-login');
    } else {
      alert(result.error || '가입 실패');
    }
  });


  // ── Change Password Form is now dynamically bound in renderProfileModal() (ui.js) ──

  // ── User Add Form (Admin) ──
  safeBindForm('user-form', async e => {
    e.preventDefault();
    const data = {
      username: document.getElementById('u-username').value,
      password: document.getElementById('u-password').value,
      role: document.getElementById('u-role').value
    };
    const result = await api('/api/users', 'POST', data);
    if (result.error) return alert(result.error);
    showToast('사용자가 추가되었습니다.');
    closeModal('user-modal');
    document.getElementById('user-form').reset();
    await loadUsers();
  });

  // ── Password Reset Form (Admin) ──
  safeBindForm('password-reset-form', async e => {
    e.preventDefault();
    const id = document.getElementById('reset-u-id').value;
    const password = document.getElementById('reset-u-password').value;
    const result = await api('/api/users/' + id + '/password', 'PUT', { password });
    if (result.error) return alert(result.error);
    showToast('비밀번호가 변경되었습니다.');
    closeModal('password-reset-modal');
    document.getElementById('password-reset-form').reset();
    await loadUsers();
  });

  console.log('[forms] All forms initialized successfully');
}

// ─── 알림 발송: 수신 대상 라디오 토글 (공지사항과 동일 패턴) ───────
window.toggleNotifyTarget = function() {
  const typeRadios = document.getElementsByName('n-target-type');
  let selectedType = 'ALL';
  for (const r of typeRadios) {
    if (r.checked) selectedType = r.value;
  }

  const roomsArea = document.getElementById('n-target-rooms-area');
  if (!roomsArea) return;

  if (selectedType === 'SPECIFIC') {
    roomsArea.classList.remove('hidden');

    const cu = JSON.parse(localStorage.getItem('currentUser'));
    const allRooms = JSON.parse(localStorage.getItem('rooms') || '[]');

    if (!cu || !cu.id) {
      roomsArea.innerHTML = '<div style="color:var(--text-muted); font-size:12px; grid-column:1/-1;">로그인 정보를 확인할 수 없습니다.</div>';
      return;
    }

    // 소유자(임대인) 필터링
    const landlordRooms = allRooms.filter(function(room) {
      const ownerId = room.userId || room.landlordId;
      if (!ownerId) return true;
      return String(ownerId) === String(cu.id);
    });

    if (landlordRooms.length > 0) {
      roomsArea.innerHTML = landlordRooms.map(function(room) {
        return '<label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">'
          + '<input type="checkbox" name="n-target-room-id" value="' + room.id + '">'
          + room.name
          + '</label>';
      }).join('');
    } else {
      roomsArea.innerHTML = '<div style="color:var(--text-muted); font-size:12px; grid-column:1/-1;">등록된 방이 없습니다.</div>';
    }
  } else {
    roomsArea.classList.add('hidden');
    roomsArea.innerHTML = '';
  }
};

// Custom category toggle (used in transaction form)
function toggleCustomCategory() {
  const sel = document.getElementById('tx-category');
  const group = document.getElementById('custom-category-group');
  if (sel && group) {
    group.classList.toggle('hidden', sel.value !== 'OTHER');
  }
}

// ─── 공통 전화번호 스마트 포맷팅 (자동 하이픈 + +82 방어) ───────────
function formatPhoneNumber(value) {
  // 1차: 숫자가 아닌 문자 제거
  let digits = value.replace(/[^0-9]/g, '');
  // 2차: 국가번호 8210 → 010 자동 치환
  if (digits.startsWith('8210')) digits = '0' + digits.slice(3);
  else if (digits.startsWith('82')) digits = '0' + digits.slice(2);
  // 3차: 010-1234-5678 자동 하이픈 마스킹
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return digits.slice(0, 3) + '-' + digits.slice(3);
  return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7, 11);
}

function bindPhoneAutoFormat() {
  const phoneInputIds = ['tenant-login-phone', 'reg-phone', 'treg-phone'];
  phoneInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function() {
        const cursorPos = this.selectionStart;
        const oldLen = this.value.length;
        this.value = formatPhoneNumber(this.value);
        const newLen = this.value.length;
        // 커서 위치 보정 (하이픈이 추가되면 한 칸 뒤로)
        this.setSelectionRange(cursorPos + (newLen - oldLen), cursorPos + (newLen - oldLen));
      });
    }
  });
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  console.log('[init] DOMContentLoaded fired');
  try {
    initForms();
  } catch (err) {
    console.error('[init] initForms error:', err);
  }
  // 전화번호 자동 하이픈 마스킹 바인딩
  bindPhoneAutoFormat();
  checkAuth();
  const txDate = document.getElementById('tx-date');
  if (txDate) txDate.value = new Date().toISOString().split('T')[0];
});
