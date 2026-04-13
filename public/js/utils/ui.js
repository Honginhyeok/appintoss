// ─── TABS ─────────────────────────────────────────────────────────
function showTab(tab) {
  document.querySelectorAll('.nav-item, .tab-btn').forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`[data-tab="${tab}"]`).forEach(el => el.classList.add('active'));
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  const tabEl = document.getElementById(`tab-${tab}`);
  if (tabEl) tabEl.classList.add('active');
  
  if (typeof refreshTab === 'function') refreshTab(tab);
}

function initTabs() {
  // Navigation elements are inline onclick now.
}

// ─── MODAL ────────────────────────────────────────────────────────
function openModal(id) {
  if (id === 'room-modal') {
    if (!document.getElementById('room-id').value) {
      document.getElementById('room-modal-title').textContent = '방 추가';
      document.getElementById('room-form').reset();
    }
  }
  if (id === 'tenant-modal' && !document.getElementById('tenant-edit-id').value) {
    document.getElementById('tenant-modal-title').textContent = '세입자 등록';
    document.getElementById('tenant-form').reset();
  }

  // ── 프로필 모달: 역할별 동적 렌더링 ──
  if (id === 'profile-modal' && currentUser) {
    renderProfileModal();
  }

  document.getElementById(id).classList.remove('hidden');
}

// ── 프로필 모달 동적 렌더링 ──
async function renderProfileModal() {
  const container = document.getElementById('profile-modal-content');
  if (!container || !currentUser) return;

  const profileRes = await api('/api/auth/me', 'GET');
  if (profileRes && profileRes.user) {
    Object.assign(currentUser, profileRes.user);
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
  }

  if (currentUser.role === 'TENANT') {
    // ── 임차인: 읽기 전용 정보 + 로그아웃 ──
    const phone = currentUser.phone || '-';
    const formattedPhone = phone.length === 11
      ? phone.slice(0,3) + '-' + phone.slice(3,7) + '-' + phone.slice(7)
      : phone;

    container.innerHTML = `
      <div style="text-align:center; margin-bottom:20px;">
        <div style="width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, #10b981, #059669); display:flex; align-items:center; justify-content:center; margin:0 auto 12px; font-size:28px; color:white;">👤</div>
        <h3 style="margin:0; font-size:18px; font-weight:700;">${currentUser.name || currentUser.username}</h3>
        <span style="display:inline-block; margin-top:6px; padding:3px 10px; border-radius:20px; background:#ecfdf5; color:#059669; font-size:12px; font-weight:600;">임차인</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--bg-light); border-radius:10px; border:1px solid var(--border);">
          <span style="font-size:20px;">👤</span>
          <div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">이름</div>
            <div style="font-size:15px; font-weight:600; margin-top:2px;">${currentUser.name || '-'}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--bg-light); border-radius:10px; border:1px solid var(--border);">
          <span style="font-size:20px;">🚪</span>
          <div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">배정된 방</div>
            <div style="font-size:15px; font-weight:600; margin-top:2px;">${currentUser.roomName || '미배정'}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:12px; padding:14px 16px; background:var(--bg-light); border-radius:10px; border:1px solid var(--border);">
          <span style="font-size:20px;">📱</span>
          <div>
            <div style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">휴대폰 번호</div>
            <div style="font-size:15px; font-weight:600; margin-top:2px;">${formattedPhone}</div>
          </div>
        </div>
      </div>

      <button onclick="logout(); closeModal('profile-modal');" class="btn" style="width:100%; padding:14px; font-size:15px; font-weight:700; border-radius:12px; background:linear-gradient(135deg, #ef4444, #dc2626); color:white; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
        🚪 로그아웃
      </button>
    `;
  } else {
    // ── 임대인/관리자: 기본 정보 + 비밀번호 변경 폼 ──
    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid var(--border);">
        <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, var(--primary), #2563eb); display:flex; align-items:center; justify-content:center; font-size:22px; color:white;">🏢</div>
        <div>
          <div style="font-size:16px; font-weight:700;">${currentUser.name || currentUser.username}</div>
          <div style="font-size:13px; color:var(--text-muted);">${currentUser.email || ''} ${currentUser.phone ? '· ' + currentUser.phone : ''}</div>
        </div>
      </div>

      <h4 style="margin:0 0 12px;font-size:14px;color:var(--text-muted)">🔒 비밀번호 변경</h4>
      <form id="change-password-form">
        <div class="form-group">
          <label>현재 비밀번호</label>
          <input type="password" id="cur-password" required>
        </div>
        <div class="form-group">
          <label>새 비밀번호 (4자 이상)</label>
          <input type="password" id="new-password" required minlength="4">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">비밀번호 변경</button>
      </form>

      <hr style="border:0; border-bottom:1px solid var(--border); margin:24px 0;">

      <h4 style="margin:0 0 12px;font-size:14px;color:var(--text-muted)">💰 정산 계좌 관리</h4>
      <form id="settlement-form">
        <div class="form-group">
          <label>은행명</label>
          <select id="s-bank" required style="width:100%; padding:10px; border:1px solid var(--border); border-radius:var(--radius);">
            <option value="">선택하세요</option>
            <option value="KB국민" ${currentUser.settlementBank==='KB국민'?'selected':''}>KB국민은행</option>
            <option value="신한" ${currentUser.settlementBank==='신한'?'selected':''}>신한은행</option>
            <option value="우리" ${currentUser.settlementBank==='우리'?'selected':''}>우리은행</option>
            <option value="하나" ${currentUser.settlementBank==='하나'?'selected':''}>하나은행</option>
            <option value="카카오뱅크" ${currentUser.settlementBank==='카카오뱅크'?'selected':''}>카카오뱅크</option>
            <option value="토스뱅크" ${currentUser.settlementBank==='토스뱅크'?'selected':''}>토스뱅크</option>
            <option value="NH농협" ${currentUser.settlementBank==='NH농협'?'selected':''}>NH농협은행</option>
            <option value="IBK기업" ${currentUser.settlementBank==='IBK기업'?'selected':''}>IBK기업은행</option>
          </select>
        </div>
        <div class="form-group">
          <label>계좌번호 (숫자만)</label>
          <input type="text" id="s-account" required value="${currentUser.settlementAccount || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, '');" placeholder="- 없이 숫자만 입력">
        </div>
        <div class="form-group">
          <label>예금주명</label>
          <input type="text" id="s-name" required value="${currentUser.settlementName || ''}" placeholder="홍길동">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%">계좌 저장하기</button>
      </form>
    `;

    // 비밀번호 변경 폼 이벤트 바인딩
    const pwForm = document.getElementById('change-password-form');
    if (pwForm) {
      pwForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('cur-password').value;
        const newPassword = document.getElementById('new-password').value;
        if (newPassword.length < 4) return alert('비밀번호는 4자 이상이어야 합니다.');

        const result = await api('/api/auth/password', 'PUT', { currentPassword, newPassword });
        if (result.error) return alert(result.error);
        showToast('비밀번호가 변경되었습니다!');
        closeModal('profile-modal');
      });
    }

    // 정산 계좌 폼 이벤트 바인딩
    const setForm = document.getElementById('settlement-form');
    if (setForm) {
      setForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;

        const settlementBank = document.getElementById('s-bank').value;
        const settlementAccount = document.getElementById('s-account').value;
        const settlementName = document.getElementById('s-name').value;
        
        const result = await api('/api/auth/settlement', 'PUT', { settlementBank, settlementAccount, settlementName });
        if (btn) btn.disabled = false;
        
        if (result.error) return alert(result.error);
        
        currentUser.settlementBank = settlementBank;
        currentUser.settlementAccount = settlementAccount;
        currentUser.settlementName = settlementName;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showToast('정산 계좌가 저장되었습니다.');
      });
    }
  }
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.getElementById('room-id') && (document.getElementById('room-id').value = '');
  document.getElementById('tenant-edit-id') && (document.getElementById('tenant-edit-id').value = '');
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }

  // 알림 드롭다운 외부 클릭 시 닫기
  const notifWrapper = document.getElementById('notification-wrapper');
  const notifDropdown = document.getElementById('notification-dropdown');
  if (notifDropdown && notifWrapper) {
    if (!notifWrapper.contains(e.target)) {
      notifDropdown.classList.add('hidden');
    }
  }
});

// ─── 상대적 시간 표시 함수 ───────────────────────────────────────
function relativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  return `${diffDay}일 전`;
}

// ─── DB 기반 벨 알림 로드 ─────────────────────────────────────────
window.loadBellNotifications = async function() {
  if (!currentUser) return;
  try {
    const data = await api('/api/bell-notifications');
    if (!data || data.error) return;
    notifications = data; // 전역 상태 교체
    renderNotifications();
  } catch (e) {
    console.error('Bell notification load error:', e);
  }
};

// 알림 드롭다운 토글 기능
window.toggleNotificationDropdown = function(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('notification-dropdown');
  if (dropdown) {
    const wasHidden = dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden');
    // 열릴 때 최신 데이터 로드
    if (wasHidden) loadBellNotifications();
  }
};

// 클라이언트 사이드 즉시 추가 (낙관적 UI용, DB에 별도 저장)
window.addNotification = function(type, message, targetRole, actionTab) {
  // 프론트엔드에서 즉시 반영 (DB에는 백엔드가 이미 저장함)
  const newNotif = {
    id: 'temp_' + Date.now(),
    type,
    message,
    isRead: false,
    createdAt: new Date().toISOString(),
    actionTab
  };
  if (typeof notifications === 'undefined') window.notifications = [];
  notifications.unshift(newNotif);
  renderNotifications();
};

window.renderNotifications = function() {
  if (!currentUser) return;

  const myNotifications = notifications || [];
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  // 뱃지 업데이트
  const bellBtn = document.getElementById('notification-bell-btn');
  if (bellBtn) {
    const badge = bellBtn.querySelector('span:nth-child(2)');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
        badge.style.width = '16px';
        badge.style.height = '16px';
        badge.style.top = '-2px';
        badge.style.right = '-2px';
        badge.style.fontSize = '10px';
        badge.style.color = 'white';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.background = '#ef4444';
        badge.style.borderRadius = '50%';
        badge.style.position = 'absolute';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // 드롭다운 업데이트
  const dropdown = document.getElementById('notification-dropdown');
  if (dropdown) {
    if (myNotifications.length === 0) {
      dropdown.innerHTML = `
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">🔔 알림</div>
        <div style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 24px 0;">
          <div style="font-size:28px; margin-bottom:8px;">📭</div>
          새로운 알림이 없습니다.
        </div>
      `;
    } else {
      dropdown.innerHTML = `
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <span>🔔 알림 <span style="font-size:12px; color:var(--primary); font-weight:700;">${unreadCount > 0 ? unreadCount : ''}</span></span>
          ${unreadCount > 0 ? '<span style="font-size:11px; color:var(--text-muted); cursor:pointer; font-weight:normal;" onclick="markAllNotificationsRead(event)">모두 읽음</span>' : ''}
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; max-height:320px; overflow-y:auto;">
          ${myNotifications.map(n => `
            <div style="padding:10px 12px; border-radius:8px; background:${n.isRead ? 'transparent' : 'var(--bg-light)'}; border-left: 3px solid ${n.isRead ? 'var(--border)' : 'var(--primary)'}; transition: all 0.2s; position:relative; display:flex; align-items:flex-start; gap:8px;">
              <div style="flex:1; cursor:pointer;" onclick="clickNotification('${n.id}', '${n.actionTab || ''}')">
                <div style="font-size:13px; color:var(--text-dark); line-height:1.4;">${n.message}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${relativeTime(n.createdAt)}</div>
              </div>
              <button onclick="deleteBellNotification(event, '${n.id}')" title="삭제"
                style="flex-shrink:0; width:22px; height:22px; border:none; background:transparent; color:var(--text-muted); font-size:14px; cursor:pointer; border-radius:4px; display:flex; align-items:center; justify-content:center; transition:all 0.15s;"
                onmouseover="this.style.background='#fee2e2';this.style.color='#ef4444';"
                onmouseout="this.style.background='transparent';this.style.color='var(--text-muted)';">✕</button>
            </div>
          `).join('')}
        </div>
      `;
    }
  }
};

window.clickNotification = async function(id, actionTab) {
  // 읽음 처리 (DB)
  if (id && !id.startsWith('temp_')) {
    try { await api('/api/bell-notifications/' + id + '/read', 'PUT'); } catch(e) {}
  }
  const notif = (notifications || []).find(n => n.id === id);
  if (notif) notif.isRead = true;
  renderNotifications();
  toggleNotificationDropdown();
  if (actionTab && actionTab !== 'undefined') showTab(actionTab);
};

window.deleteBellNotification = async function(e, id) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  if (id && !id.startsWith('temp_')) {
    try { await api('/api/bell-notifications/' + id, 'DELETE'); } catch(err) {}
  }
  notifications = (notifications || []).filter(n => n.id !== id);
  renderNotifications();
};

window.markAllNotificationsRead = async function(e) {
  if (e) e.stopPropagation();
  try { await api('/api/bell-notifications/read-all/batch', 'PUT'); } catch(err) {}
  (notifications || []).forEach(n => n.isRead = true);
  renderNotifications();
};
