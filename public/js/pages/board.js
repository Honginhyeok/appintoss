// ─── BOARD: Announcements & Maintenance ──────────────────────────────────

async function loadAnnouncements() {
  const list = document.getElementById('announcements-list');
  if (!list) return;

  const data = await api('/api/board/announcements');
  if (!data || data.error) return;

  const isLandlord = currentUser.role !== 'TENANT';

  list.innerHTML = data.map(a => `
    <div class="card" style="padding:20px; border-left:4px solid var(--primary)">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <h3 style="margin:0; font-size:18px;">${a.title}</h3>
        <div style="display:flex; gap:12px; align-items:center;">
          <span style="font-size:13px; color:var(--text-muted)">${fmtDate(a.createdAt)}</span>
          ${isLandlord ? `<button class="btn btn-sm btn-ghost" onclick="deleteAnnouncement('${a.id}')">삭제</button>` : ''}
        </div>
      </div>
      <p style="margin:0; font-size:14px; white-space:pre-wrap; line-height:1.5;">${a.content}</p>
    </div>
  `).join('') || '<div class="card" style="padding:40px; text-align:center; color:var(--text-muted);">등록된 공지사항이 없습니다.</div>';
}

// 공지사항 수신 대상 토글 기능 (localStorage 직독직해 방식)
window.toggleAnnouncementTarget = function() {
  const typeRadios = document.getElementsByName('a-target-type');
  let selectedType = 'ALL';
  for (const r of typeRadios) {
    if (r.checked) selectedType = r.value;
  }

  const roomsArea = document.getElementById('a-target-rooms-area');
  if (!roomsArea) return;

  if (selectedType === 'SPECIFIC') {
    roomsArea.classList.remove('hidden');

    // ── 1. localStorage에서 직접 데이터 호출 (핵심) ──
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');

    // 강제 디버깅 추적 로그 (무조건 출력)
    console.log("공지사항 모달 방 데이터:", rooms, "필터링된 방:", "아래 참조", "currentUser:", currentUser);

    // currentUser가 없으면 로직 중단 + 콘솔 에러
    if (!currentUser || !currentUser.id) {
      console.error("[공지사항 모달] currentUser가 localStorage에 없습니다. 로그인 상태를 확인하세요.");
      roomsArea.innerHTML = '<div style="color:var(--text-muted); font-size:12px; grid-column:1/-1;">로그인 정보를 확인할 수 없습니다.</div>';
      return;
    }

    // ── 2. 방 필터링: 소유자가 현재 유저인 방만 추출 ──
    const landlordRooms = rooms.filter(function(room) {
      // DB schema 기준 userId 필드로 소유자 판별, landlordId도 대응
      const ownerId = room.userId || room.landlordId;
      if (!ownerId) return true; // 소유자 필드가 없으면 백엔드가 이미 필터링한 것으로 간주
      return String(ownerId) === String(currentUser.id);
    });

    // 필터링 결과 디버깅 로그
    console.log("공지사항 모달 방 데이터:", rooms, "필터링된 방:", landlordRooms);

    // ── 3. 체크박스 DOM 생성 ──
    if (landlordRooms.length > 0) {
      roomsArea.innerHTML = landlordRooms.map(function(room) {
        return '<label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">'
          + '<input type="checkbox" name="a-target-room-id" value="' + room.id + '">'
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

const announcementForm = document.getElementById('announcement-form');
if (announcementForm) {
  announcementForm.addEventListener('submit', async e => {
    e.preventDefault();
    const title = document.getElementById('a-title').value;
    const content = document.getElementById('a-content').value;
    
    // 수신 대상 추출
    const typeRadios = document.getElementsByName('a-target-type');
    let targetType = 'ALL';
    for (const r of typeRadios) {
      if (r.checked) targetType = r.value;
    }
    
    let targetRooms = [];
    if (targetType === 'SPECIFIC') {
      const checkedBoxes = document.querySelectorAll('input[name="a-target-room-id"]:checked');
      checkedBoxes.forEach(cb => targetRooms.push(cb.value));
      if (targetRooms.length === 0) {
        return alert('특정 방을 최소 1개 이상 선택해주세요.');
      }
    }
    
    // 조건부 페이로드 구성
    const payload = { title, content, targetType, targetRooms };
    
    const res = await api('/api/board/announcements', 'POST', payload);
    if (res.error) return alert(res.error);
    
    // 알림 생성 로직 추가
    let targetTenants = window.tenants || [];
    if (targetType === 'SPECIFIC') {
      targetTenants = targetTenants.filter(t => targetRooms.includes(t.roomId));
    }
    
    if (!window.notifications) window.notifications = [];
    
    targetTenants.forEach(t => {
      if (t.userId) {
        window.notifications.unshift({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          targetUserId: t.userId,
          type: 'NOTICE',
          message: `새로운 공지사항이 등록되었습니다: [${title}]`,
          actionTab: 'announcements',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    });

    if (typeof renderNotifications === 'function') renderNotifications();
    
    closeModal('announcement-modal');
    announcementForm.reset();
    
    // 기본값 상태로 리셋
    const allRadio = document.querySelector('input[name="a-target-type"][value="ALL"]');
    if (allRadio) {
      allRadio.checked = true;
      toggleAnnouncementTarget();
    }
    
    showToast('공지가 등록되었습니다.');
    loadAnnouncements();
  });
}

async function deleteAnnouncement(id) {
  if (!confirm('공지사항을 삭제하시겠습니까?')) return;
  const res = await api(`/api/board/announcements/${id}`, 'DELETE');
  if (res.error) return alert(res.error);
  loadAnnouncements();
}

async function loadMaintenanceRequests() {
  const tbody = document.getElementById('maintenance-body');
  if (!tbody) return;

  const data = await api('/api/board/maintenance');
  if (!data || data.error) return;

  const isLandlord = currentUser.role !== 'TENANT';

  tbody.innerHTML = data.map(m => {
    const statusMap = {
      'PENDING': '<span class="badge badge-expense">대기중</span>',
      'IN_PROGRESS': '<span class="badge badge-maintenance">처리중</span>',
      'RESOLVED': '<span class="badge badge-income">완료됨</span>'
    };
    const statusSelect = isLandlord ? `
      <select onchange="updateMaintenanceStatus('${m.id}', this.value)" style="padding:4px; font-size:12px; border-radius:4px; border:1px solid var(--border)">
        <option value="PENDING" ${m.status==='PENDING'?'selected':''}>대기중</option>
        <option value="IN_PROGRESS" ${m.status==='IN_PROGRESS'?'selected':''}>처리중</option>
        <option value="RESOLVED" ${m.status==='RESOLVED'?'selected':''}>완료됨</option>
      </select>
    ` : '';
    
    return `
      <tr>
        <td>${statusMap[m.status]}</td>
        <td>
          <div style="font-weight:600">${m.title}</div>
          <div style="font-size:13px; color:var(--text-muted); margin-top:4px; white-space:pre-wrap; max-width:300px;">${m.content}</div>
        </td>
        ${isLandlord ? `<td><div style="font-weight:600">${m.tenant?.assignedRoom?.name ? m.tenant.assignedRoom.name + (m.tenant.assignedRoom.name.endsWith('호') ? '' : '호') : '알 수 없음'} / ${m.tenant?.name || m.tenant?.username || '알 수 없음'}</div></td>` : ''}
        <td>${fmtDate(m.createdAt)}</td>
        ${isLandlord ? `<td>${statusSelect}</td>` : ''}
      </tr>
    `
  }).join('') || `<tr><td colspan="${isLandlord ? 5 : 3}" style="text-align:center;color:var(--text-muted);padding:20px">접수된 문의가 없습니다</td></tr>`;
}

const maintenanceForm = document.getElementById('maintenance-form');
if (maintenanceForm) {
  maintenanceForm.addEventListener('submit', async e => {
    e.preventDefault();
    const title = document.getElementById('m-title').value;
    const content = document.getElementById('m-content').value;
    
    // Temporarily disable button
    const btn = maintenanceForm.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    const res = await api('/api/board/maintenance', 'POST', { title, content });
    
    if (btn) btn.disabled = false;

    if (res.error) return alert(res.error);
    
    // 알림은 백엔드에서 임대인에게 직접 DB Insert 처리
    
    closeModal('maintenance-modal');
    maintenanceForm.reset();
    showToast('수리/문의가 접수되었습니다.');
    loadMaintenanceRequests();
  });
}

async function updateMaintenanceStatus(id, status) {
  const res = await api(`/api/board/maintenance/${id}/status`, 'PUT', { status });
  if (res.error) return alert(res.error);
  showToast('상태가 변경되었습니다.');
  // 알림은 백엔드에서 세입자(작성자)에게 직접 DB Insert 처리
  loadMaintenanceRequests();
}
