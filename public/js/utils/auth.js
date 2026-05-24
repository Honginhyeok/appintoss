// ─── AUTHENTICATION ───────────────────────────────────────────────
// 진입점: 역할 선택 화면이 가장 먼저 표시됨.
// 인증 성공 시 .authenticated 클래스로 오버레이 숨김.

// 현재 선택된 역할 임시 저장
let selectedRole = null;

// ① 역할 선택 → 로그인 폼으로 이동
function selectRole(role) {
  selectedRole = role;
  const rolePanel = document.getElementById('role-select-panel');
  const authBox = document.getElementById('auth-box');
  const title = document.getElementById('auth-box-title');

  if (rolePanel) rolePanel.style.display = 'none';
  if (authBox) authBox.style.display = '';

  // 타이틀 동적 변경
  if (title) {
    title.textContent = role === 'landlord' ? '임대인 로그인' : '임차인 로그인';
  }

  // 임차인으로 선택 시 임차인 가입 패널로 바로 (아니면 로그인 폼으로)
  if (role === 'tenant') {
    toggleAuthPanel('tenant-login');
  } else {
    toggleAuthPanel('landlord-login');
  }
}

// ② 뒤로 가기 → 역할 선택 화면으로
function goBackToRoleSelect() {
  selectedRole = null;
  const rolePanel = document.getElementById('role-select-panel');
  const authBox = document.getElementById('auth-box');

  if (authBox) authBox.style.display = 'none';
  if (rolePanel) rolePanel.style.display = '';

  // 폼 초기화
  const landlordForm = document.getElementById('landlord-login-form');
  if (landlordForm) landlordForm.reset();
  const tenantForm = document.getElementById('tenant-login-form');
  if (tenantForm) tenantForm.reset();
}



// ─── Auth 로딩 중 스피너 방어 ──────────────────────────────────────
let isAuthLoading = true; // 초기 auth 체크가 끝날 때까지 true

function setAuthLoading(loading) {
  isAuthLoading = loading;
  const spinner = document.getElementById('auth-loading-spinner');
  const appContent = document.getElementById('app-content');
  if (spinner) spinner.style.display = loading ? 'flex' : 'none';
  if (appContent) appContent.style.visibility = loading ? 'hidden' : 'visible';
}

function showLoginOverlay() {
  setAuthLoading(false);
  document.body.classList.remove('logged-in');
  const overlay = document.getElementById('login-overlay');
  if (overlay) {
    overlay.classList.remove('authenticated');
    overlay.classList.add('active');
  }
  // 역할 선택 화면으로 초기화
  const rolePanel = document.getElementById('role-select-panel');
  const authBox = document.getElementById('auth-box');
  if (rolePanel) rolePanel.style.display = '';
  if (authBox) authBox.style.display = 'none';
}

function hideLoginOverlay() {
  setAuthLoading(false);
  document.body.classList.add('logged-in');
  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.classList.add('authenticated');
}

function toggleAuthPanel(panel) {
  // auth-box가 숨겨져 있으면 먼저 표시
  const authBox = document.getElementById('auth-box');
  const rolePanel = document.getElementById('role-select-panel');
  if (authBox && authBox.style.display === 'none') {
    authBox.style.display = '';
    if (rolePanel) rolePanel.style.display = 'none';
  }

  const panels = {
    'landlord-login': 'landlord-login-panel',
    'tenant-login': 'tenant-login-panel',
    'register': 'register-panel',
    'tenant-register': 'tenant-register-panel'
  };
  Object.entries(panels).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) {
      if (key === panel) {
        el.style.display = '';
        el.classList.remove('hidden');
      } else {
        el.style.display = 'none';
        el.classList.add('hidden');
      }
    }
  });
}

window.isSignupMode = false;
window.toggleSignupMode = function(mode) {
  window.isSignupMode = mode;
  toggleAuthPanel(mode ? 'register' : 'landlord-login');
};

// ─── 권한별 Protected Route ──────────────────────────────────────
function applyRoleRouting(role) {
  if (role === 'ADMIN') {
    // Admin: 모든 메뉴 표시
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = '';
      el.classList.remove('hidden');
    });
    document.querySelectorAll('.landlord-only').forEach(el => {
      el.style.display = '';
      el.classList.remove('hidden');
    });
    document.querySelectorAll('.tenant-only').forEach(el => {
      el.style.display = 'none';
      el.classList.add('hidden');
    });
    showTab('summary');
  } else if (role === 'TENANT') {
    // 임차인: 임차인 전용 메뉴만
    document.querySelectorAll('.landlord-only').forEach(el => {
      el.style.display = 'none';
      el.classList.add('hidden');
    });
    document.querySelectorAll('.tenant-only').forEach(el => {
      el.style.display = '';
      el.classList.remove('hidden');
    });
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
      el.classList.add('hidden');
    });
    showTab('announcements');
  } else {
    // 임대인(USER): 임대인 메뉴
    document.querySelectorAll('.tenant-only').forEach(el => {
      el.style.display = 'none';
      el.classList.add('hidden');
    });
    document.querySelectorAll('.landlord-only').forEach(el => {
      el.style.display = '';
      el.classList.remove('hidden');
    });
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
      el.classList.add('hidden');
    });
    showTab('summary');
  }
}

// ─── TOSS OAUTH ─────────────────────────────────────────────────────
function startTossOAuthLogin() {
  const CLIENT_ID = 'dy93zgk83vqxl4cas2vqql7xx6q6f9zb';
  const REDIRECT_URI = 'https://checkin-host.com/api/toss/callback';
  const roleState = (selectedRole || 'tenant').toUpperCase();
  const tossAuthUrl = `https://oauth2.cert.toss.im/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${roleState}`;
  
  let modal = document.getElementById('toss-oauth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'toss-oauth-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    modal.style.zIndex = '999999';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    modal.innerHTML = `
      <div style="position:relative; width:100%; max-width:400px; height:600px; max-height:90vh; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
        <button onclick="document.getElementById('toss-oauth-modal').style.display='none'" style="position:absolute; top:12px; right:12px; width:30px; height:30px; border:none; background:#f1f5f9; border-radius:50%; font-size:16px; cursor:pointer; color:#334155; font-weight:bold; z-index:10;">✕</button>
        <iframe id="toss-oauth-iframe" src="" style="width:100%; height:100%; border:none; margin-top:0px;"></iframe>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  document.getElementById('toss-oauth-iframe').src = tossAuthUrl;
  modal.style.display = 'flex';

  window.addEventListener('message', function authListener(e) {
    if (e.data && e.data.type === 'TOSS_LOGIN_SUCCESS') {
      window.removeEventListener('message', authListener);
      document.getElementById('toss-oauth-modal').style.display = 'none';
      window.location.reload();
    } else if (e.data && e.data.type === 'TOSS_LOGIN_ERROR') {
      window.removeEventListener('message', authListener);
      document.getElementById('toss-oauth-modal').style.display = 'none';
      const errMsg = e.data.error;
      const modalMsgEl = document.getElementById('error-modal-message');
      if (modalMsgEl) modalMsgEl.textContent = errMsg;
      if (typeof openModal === 'function') openModal('error-modal');
    }
  });
}

// ─── 세션/토큰 체크 (방어 코드 포함) ─────────────────────────────
async function checkAuth() {
  try {
    // 토스 로그인 리다이렉트 처리
    if (window.location.hash.startsWith('#access_token=')) {
      const token = window.location.hash.replace('#access_token=', '');
      try { localStorage.setItem('token', token); } catch(e) {}
      window.location.hash = ''; // 해시 지우기
    }
    
    // URL에 에러가 있으면 모달 표시
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('error')) {
      const errMsg = urlParams.get('error');
      const displayMsg = errMsg === 'TossLoginFailed' ? '토스 로그인에 실패했습니다.' : errMsg;
      
      const modalMsgEl = document.getElementById('error-modal-message');
      if (modalMsgEl) modalMsgEl.textContent = displayMsg;
      if (typeof openModal === 'function') openModal('error-modal');
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const result = await api('/api/auth/me');

    // 에러 응답이거나 user가 없으면 → 로그인 화면
    if (!result || result.error || !result.user) {
      currentUser = null;
      try { localStorage.removeItem('currentUser'); } catch(e) {}
      try { localStorage.removeItem('token'); } catch(e) {}

      // 에러 메시지가 있다면 토스트로 표시
      if (result && result.error && typeof showToast === 'function') {
        showToast(result.error);
      }

      showLoginOverlay();
      return;
    }

    // ✅ 인증 성공
    currentUser = result.user;
    // localStorage에 유저 정보 캐시 저장 (공지사항 모달 등에서 직독직해 용도)
    try { localStorage.setItem('currentUser', JSON.stringify(currentUser)); } catch(e) {}
    hideLoginOverlay();

    // 권한별 Protected Route 적용
    applyRoleRouting(currentUser.role);

    // 사이드바 프로필 버튼에 유저명 표시
    const profileUsername = document.getElementById('profile-username');
    if (profileUsername) profileUsername.textContent = currentUser.name || currentUser.username;

    // 상단 헤더 프로필 버튼에 유저명 표시
    const mobileProfileUsername = document.getElementById('mobile-profile-username');
    if (mobileProfileUsername) mobileProfileUsername.textContent = currentUser.name || currentUser.username;

    // 사이드바 로그아웃 버튼에 onclick 바인딩
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = logout;

    // 로그인 패널 초기화 리셋
    goBackToRoleSelect();

    // WebPush 구독 (임대인만)
    if (currentUser.role !== 'TENANT') {
      if (typeof subscribeToPush === 'function') {
        subscribeToPush();
      }
    }

    // 임차인인데 매핑된 방이 없다면 (초대코드 미입력 상태)
    if (currentUser.role === 'TENANT' && !currentUser.roomName) {
      if (typeof openModal === 'function') {
        openModal('tenant-invite-modal');
      }
    } else {
      // 데이터 로드
      if (typeof loadAllData === 'function') loadAllData();
      if (typeof loadBellNotifications === 'function') loadBellNotifications();
    }

  } catch (err) {
    console.error('Auth check failed:', err);
    currentUser = null;
    try { localStorage.removeItem('currentUser'); } catch(e) {}
    showLoginOverlay();
  }
}

// ─── 로그아웃 ─────────────────────────────────────────────────────
async function logout() {
  try {
    await api('/api/auth/logout', 'POST');
  } catch (e) {
    console.error('Logout API error:', e);
  }
  currentUser = null;

  // 로컬 스토리지 완전 정리
  try { localStorage.removeItem('currentUser'); } catch(e) {}
  try { localStorage.removeItem('token'); } catch(e) {}
  try { localStorage.removeItem('rooms'); } catch(e) {}

  // UI 초기화
  document.body.classList.remove('logged-in');
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = 'none';
    el.classList.add('hidden');
  });

  showLoginOverlay();
  showToast('로그아웃 되었습니다.');
}
