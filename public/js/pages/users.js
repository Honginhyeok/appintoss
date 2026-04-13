// ─── USER MANAGEMENT (ADMIN ONLY) ──────────────────────────────────
let allUsersList = [];
window.usersFilterText = '';

window.handleUserSearch = function(e) {
  window.usersFilterText = e.target.value.toLowerCase();
  renderUsersTable();
};

async function loadUsers() {
  try {
    const result = await api('/api/users');
    if (!result || result.error) {
      console.warn('loadUsers failed:', result?.error);
      return;
    }
    allUsersList = Array.isArray(result) ? result : [];
    renderUsersTable();
  } catch (e) {
    console.error('loadUsers error:', e);
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('users-body');
  if (!tbody) return;

  const filtered = allUsersList.filter(u => {
    if (!window.usersFilterText) return true;
    const term = window.usersFilterText;
    const uname = (u.username || '').toLowerCase();
    const nameStr = (u.name || '').toLowerCase();
    return uname.includes(term) || nameStr.includes(term);
  });

  tbody.innerHTML = filtered.map(u => {
    const statusBadge = u.status === 'ACTIVE' ? '<span class="badge badge-income">활성</span>'
        : u.status === 'PENDING' ? '<span class="badge badge-warning" style="background:#fef3c7;color:#92400e">대기</span>'
        : '<span class="badge badge-expense">정지</span>';

      const statusBtn = u.username === 'admin' ? '' : (
        u.status === 'PENDING'
          ? '<button class="btn btn-primary" style="padding:2px 10px;font-size:11px" onclick="changeUserStatus(\'' + u.id + '\', \'ACTIVE\')">✅ 승인</button>'
          : u.status === 'ACTIVE'
            ? '<button class="btn btn-ghost" style="padding:2px 10px;font-size:11px;border:1px solid var(--border)" onclick="changeUserStatus(\'' + u.id + '\', \'SUSPENDED\')">⛔ 정지</button>'
            : '<button class="btn btn-primary" style="padding:2px 10px;font-size:11px" onclick="changeUserStatus(\'' + u.id + '\', \'ACTIVE\')">✅ 활성화</button>'
      );

      const roleSelect = u.username === 'admin' ? '<span class="badge badge-occupied">관리자</span>'
        : '<select onchange="changeUserRole(\'' + u.id + '\', this.value)" style="padding:2px 6px;border-radius:6px;border:1px solid var(--border);font-size:12px">'
          + '<option value="ADMIN"' + (u.role === 'ADMIN' ? ' selected' : '') + '>관리자</option>'
          + '<option value="USER"' + ((u.role === 'USER' || u.role === 'LANDLORD') ? ' selected' : '') + '>임대인</option>'
          + '<option value="TENANT"' + (u.role === 'TENANT' ? ' selected' : '') + '>임차인</option>'
          + '</select>';

      const passwordDisplay = u.role === 'TENANT' 
        ? '<span style="color:var(--text-muted);font-size:12px;">(초대코드 기반/비밀번호 없음)</span>' 
        : '<span style="font-family:monospace;background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:13px">' + (u.plainPassword || '—') + '</span>';

      const nameDisplay = u.name ? `<span style="font-weight:600">${u.name}</span>` : `<span style="color:var(--text-muted);font-size:13px">(이름 없음)</span>`;

      let assignDisplay = '<span style="color:var(--text-muted)">-</span>';
      if (u.role === 'TENANT') {
        if (u.landlord && u.assignedRoom) {
          assignDisplay = `<span style="font-size:13px; font-weight:600">${u.landlord.name} <span style="font-weight:400; color:var(--text-muted)">(${u.assignedRoom.name})</span></span>`;
        } else {
          assignDisplay = `<strong style="color:var(--expense); font-size:13px">미배정</strong>`;
        }
      }

      return '<tr>'
        + '<td>' + nameDisplay + '</td>'
        + '<td style="font-weight:600">' + u.username + '</td>'
        + '<td>' + assignDisplay + '</td>'
        + '<td>' + roleSelect + '</td>'
        + '<td>' + statusBadge + '</td>'
        + '<td>' + passwordDisplay + '</td>'
        + '<td>' + fmtDate(u.createdAt) + '</td>'
        + '<td><div style="display:flex;gap:6px;align-items:center">'
        + statusBtn
        + '<button class="btn btn-ghost" style="padding:2px 10px;font-size:11px;border:1px solid var(--border)" onclick="openPasswordResetModal(\'' + u.id + '\', \'' + u.username + '\')">🔑 재설정</button>'
        + (u.username !== 'admin' ? '<button class="btn-icon danger" onclick="deleteUser(\'' + u.id + '\', \'' + u.username + '\')" title="삭제">🗑️</button>' : '')
        + '</div></td></tr>';
    }).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:20px">사용자가 없습니다</td></tr>';
}

async function changeUserStatus(id, status) {
  const label = status === 'ACTIVE' ? '승인' : '정지';
  if (!confirm('이 사용자를 ' + label + '하시겠습니까?')) return;
  const result = await api('/api/users/' + id + '/status', 'PUT', { status });
  if (result.error) return alert(result.error);
  showToast('사용자 상태가 변경되었습니다.');
  await loadUsers();
}

async function changeUserRole(id, role) {
  if (role === 'TENANT') {
    // Save to the db first, then immediately open assign modal to force them to complete it
    const result = await api('/api/users/' + id + '/role', 'PUT', { role });
    if (result.error) return alert(result.error);
    await loadUsers(); // Refresh to ensure backend catches TENANT status
    window.openAssignModal(id);
    return;
  }

  const result = await api('/api/users/' + id + '/role', 'PUT', { role });
  if (result.error) return alert(result.error);
  showToast('사용자 역할이 변경되었습니다.');
  await loadUsers();
}

async function deleteUser(id, name) {
  if (!confirm('사용자 \'' + name + '\'을(를) 삭제하시겠습니까?')) return;
  const result = await api('/api/users/' + id, 'DELETE');
  if (result.error) return alert(result.error);
  showToast('사용자가 삭제되었습니다.');
  await loadUsers();
}

function openPasswordResetModal(id, name) {
  document.getElementById('reset-u-id').value = id;
  document.getElementById('reset-u-name').textContent = name;
  document.getElementById('reset-u-password').value = '';
  openModal('password-reset-modal');
}

window.openAssignModal = function(userId) {
  document.getElementById('assign-u-id').value = userId;
  
  // Fill landlords
  const landlordSelect = document.getElementById('assign-landlord');
  // Local list is cached inside allUsersList
  const landlords = allUsersList.filter(u => u.role === 'USER' || u.role === 'LANDLORD' || u.role === 'ADMIN');
  landlordSelect.innerHTML = '<option value="">-- 임대인 선택 --</option>' + landlords.map(l => `<option value="${l.id}">${l.name || l.username} (${l.role})</option>`).join('');
  
  document.getElementById('assign-room').innerHTML = '<option value="">-- (임대인을 먼저 선택하세요) --</option>';
  openModal('assign-modal');
};

window.loadAssignRooms = async function() {
  const landlordId = document.getElementById('assign-landlord').value;
  const roomSelect = document.getElementById('assign-room');
  if (!landlordId) {
    roomSelect.innerHTML = '<option value="">-- (임대인을 먼저 선택하세요) --</option>';
    return;
  }
  
  const rooms = await api('/api/admin/rooms/' + landlordId);
  if (!rooms || rooms.error) return;
  
  if (rooms.length === 0) {
    roomSelect.innerHTML = '<option value="">-- 등록된 방 없음 --</option>';
  } else {
    roomSelect.innerHTML = '<option value="">-- 방 선택 --</option>' + rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  }
};

const assignForm = document.getElementById('assign-form');
if (assignForm) {
  assignForm.addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('assign-u-id').value;
    const landlordId = document.getElementById('assign-landlord').value;
    const roomId = document.getElementById('assign-room').value;
    
    if (!landlordId || !roomId) return alert('임대인과 방을 올바르게 선택해주세요.');
    
    const result = await api('/api/users/' + id + '/assign', 'PUT', { landlordId, roomId });
    if (result.error) return alert(result.error);
    
    showToast('임차인 소속이 할당되었습니다.');
    closeModal('assign-modal');
    loadUsers();
  });
}
