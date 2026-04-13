// ─── AUTHENTICATION ───────────────────────────────────────────────
function showLoginOverlay() {
  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.classList.add('active');
}

function hideLoginOverlay() {
  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.classList.remove('active');
}

function toggleAuthPanel(panel) {
  document.getElementById('login-panel').style.display = panel === 'login' ? '' : 'none';
  document.getElementById('register-panel').style.display = panel === 'register' ? '' : 'none';
  const tenantRegisterPanel = document.getElementById('tenant-register-panel');
  if (tenantRegisterPanel) tenantRegisterPanel.style.display = panel === 'tenant-register' ? '' : 'none';
}

async function checkAuth() {
  const result = await api('/api/auth/me');

  if (result && result.user) {
    currentUser = result.user;
    hideLoginOverlay();

    // Show admin-only nav elements
    if (currentUser.role === 'ADMIN') {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = '';
        el.classList.remove('hidden');
      });
    }

    // Role-based UI masking
    if (currentUser.role === 'TENANT') {
      document.querySelectorAll('.landlord-only').forEach(el => { el.style.display = 'none'; el.classList.add('hidden'); });
      document.querySelectorAll('.tenant-only').forEach(el => { el.style.display = ''; el.classList.remove('hidden'); });
      showTab('announcements'); // Default tab for tenant
    } else {
      document.querySelectorAll('.tenant-only').forEach(el => { el.style.display = 'none'; el.classList.add('hidden'); });
      document.querySelectorAll('.landlord-only').forEach(el => { el.style.display = ''; el.classList.remove('hidden'); });
      showTab('summary'); // Default tab for landlord/admin
    }

    // Show profile btn with username
    const profileBtn = document.getElementById('profile-btn');
    const mobileProfileBtn = document.getElementById('mobile-profile-btn');
    if (profileBtn) {
      profileBtn.style.display = 'block';
      document.getElementById('profile-username').textContent = currentUser.username;
    }
    if (mobileProfileBtn) {
      mobileProfileBtn.style.display = 'flex';
      document.getElementById('mobile-profile-username').textContent = currentUser.username;
    }

    const logoutBtn = document.getElementById('logout-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (logoutBtn) {
      logoutBtn.style.display = 'flex';
      logoutBtn.onclick = logout;
    }
    if (mobileLogoutBtn) {
      mobileLogoutBtn.style.display = 'flex';
    }

    toggleAuthPanel('login');
    document.getElementById('login-overlay').classList.add('hidden');

    // WebPush Subscription for Landlords
    if (currentUser.role !== 'TENANT') {
      if (typeof subscribeToPush === 'function') {
        subscribeToPush();
      }
    }

    if (typeof loadAllData === 'function') loadAllData();
  } else {
    showLoginOverlay();
  }
}

async function logout() {
  await api('/api/auth/logout', 'POST');
  currentUser = null;
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.style.display = 'none';
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'none';
  
  const profileBtn = document.getElementById('profile-btn');
  if (profileBtn) profileBtn.style.display = 'none';
  const mobileProfileBtn = document.getElementById('mobile-profile-btn');
  if (mobileProfileBtn) mobileProfileBtn.style.display = 'none';
  
  showLoginOverlay();
}
