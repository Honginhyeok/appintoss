// ─── ROOMS ─────────────────────────────────────────────────────────
async function loadRooms() {
  try {
    const result = await api('/api/rooms');
    rooms = Array.isArray(result) ? result : [];
    // localStorage에 방 데이터 캐시 저장 (공지사항 모달 등에서 직독직해 용도)
    try { localStorage.setItem('rooms', JSON.stringify(rooms)); } catch(e) {}

    const grid = document.getElementById('rooms-grid');
    if (grid) {
      grid.innerHTML = rooms.map(r => {
        const editBtns = '<button class="btn-icon" onclick="editRoom(\'' + r.id + '\')">✏️</button>'
          + '<button class="btn-icon danger" onclick="deleteRoom(\'' + r.id + '\', \'' + r.name.replace(/'/g, "\\'") + '\')">🗑️</button>';
        const typeSuffix = r.rentType === 'YEARLY' ? '/년' : (r.rentType === 'CUSTOM' ? '/기간' : '/월');
        return '<div class="room-card ' + r.status + '" onclick="openRoomDetail(\'' + r.id + '\')" style="cursor:pointer">'
          + '<div style="display:flex;justify-content:space-between;align-items:flex-start"><div>'
          + '<div class="room-name">' + r.name + '</div>'
          + '<div class="room-meta">' + (r.floor ? r.floor + '층' : '') + ' ' + (r.area ? r.area + '평' : '') + '</div>'
          + '<span class="room-badge badge-' + r.status + '">' + statusLabel(r.status) + '</span>'
          + '</div></div>'
          + '<div class="room-rent">' + (r.monthlyRent ? fmt(r.monthlyRent) + typeSuffix : '-') + '</div>'
          + '<div class="room-meta" style="margin-top:4px">보증금 ' + (r.deposit ? fmt(r.deposit) : '-') + '</div>'
          + '<div class="room-actions" onclick="event.stopPropagation()">' + editBtns + '</div>'
          + '</div>';
      }).join('') || '<p style="color:var(--text-muted);padding:20px">등록된 방이 없습니다. 방을 추가해보세요!</p>';
    }
  } catch (error) {
    console.error("[방 로드 실패] 에러 방어 로직 작동:", error);
    rooms = [];
    try { localStorage.setItem('rooms', '[]'); } catch(e) {} // 어떤 경우에도 스토리지 붕괴 방지
  }


  // Populate room dropdowns
  const roomOptions = '<option value="">배정 없음</option>' + rooms.map(r => '<option value="' + r.id + '">' + r.name + '</option>').join('');

  const tenantRoomEl = document.getElementById('tenant-room');
  if (tenantRoomEl) tenantRoomEl.innerHTML = roomOptions;

  const txRoomEl = document.getElementById('tx-room');
  if (txRoomEl) {
    txRoomEl.innerHTML = '<option value="">전체 (공통)</option>' + rooms.map(r => '<option value="' + r.id + '">' + r.name + '</option>').join('');
  }
}

function openRoomDetail(roomId) {
  const r = rooms.find(r => r.id === roomId);
  if (!r) return;
  
  // React State pseudo-replacement (유저 프롬프트 준수를 위한 전역 상태 연결)
  window.selectedRoom = r;
  
  const txs = r.transactions || [];
  const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  // React 방식 렌더링 대신 안전한 DOM 매핑으로 에러 방지
  const titleEl = document.getElementById('detail-room-name') || document.getElementById('room-detail-title');
  if (titleEl) titleEl.textContent = '🚪 ' + r.name + ' — 수입/지출 내역';

  const statsHtml =
    '<div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:10px;padding:12px 16px">'
    + '<div style="font-size:11px;color:#16a34a;font-weight:600">총 수입</div>'
    + '<div style="font-size:18px;font-weight:700;color:#15803d">' + fmt(income) + '</div></div>'
    + '<div style="flex:1;min-width:120px;background:#fef2f2;border-radius:10px;padding:12px 16px">'
    + '<div style="font-size:11px;color:#dc2626;font-weight:600">총 지출</div>'
    + '<div style="font-size:18px;font-weight:700;color:#b91c1c">' + fmt(expense) + '</div></div>'
    + '<div style="flex:1;min-width:120px;background:' + (net >= 0 ? '#f0fdf4' : '#fef2f2') + ';border-radius:10px;padding:12px 16px">'
    + '<div style="font-size:11px;color:' + (net >= 0 ? '#16a34a' : '#dc2626') + ';font-weight:600">순이익</div>'
    + '<div style="font-size:18px;font-weight:700;color:' + (net >= 0 ? '#15803d' : '#b91c1c') + '">' + fmt(net) + '</div></div>';

  let txsHtml = '';
  if (txs.length) {
    txsHtml = txs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t =>
        '<tr><td>' + fmtDate(t.date) + '</td>'
        + '<td><span class="badge badge-' + t.type.toLowerCase() + '">' + (t.type === 'INCOME' ? '수입' : '지출') + '</span></td>'
        + '<td>' + categoryLabel(t.category) + '</td>'
        + '<td style="color:var(--text-muted)">' + (t.description || '-') + '</td>'
        + '<td style="font-weight:600;color:' + (t.type === 'INCOME' ? 'var(--income, #16a34a)' : 'var(--expense, #ef4444)') + '">' + fmt(t.amount) + '</td></tr>'
    ).join('');
  } else {
    txsHtml = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)">거래 내역이 없습니다.</td></tr>';
  }

  const contentEl = document.getElementById('room-detail-content');
  if (contentEl) {
    contentEl.innerHTML = `
      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        ${statsHtml}
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th style="text-align:left">날짜</th><th style="text-align:left">구분</th><th style="text-align:left">카테고리</th><th style="text-align:left">설명</th><th style="text-align:right">금액</th></tr>
          </thead>
          <tbody>${txsHtml}</tbody>
        </table>
      </div>
    `;
  }

  openModal('room-detail-modal'); // React setIsRoomModalOpen(true) 역할 수행
}

function editRoom(id) {
  const r = rooms.find(r => r.id === id);
  if (!r) return;
  document.getElementById('room-modal-title').textContent = '방 정보 수정';
  document.getElementById('room-id').value = r.id;

  const nameEl = document.getElementById('r-name');
  if (nameEl) nameEl.value = r.name || '';

  const descEl = document.getElementById('r-desc');
  if (descEl) descEl.value = r.description || r.notes || '';

  const typeSelect = document.getElementById('r-rent-type');
  if (typeSelect) {
    typeSelect.value = r.rentType || 'MONTHLY';
    typeSelect.dispatchEvent(new Event('change'));
  }

  const rentEl = document.getElementById('r-rent');
  if (rentEl) rentEl.value = r.monthlyRent || '';

  const depositEl = document.getElementById('r-deposit');
  if (depositEl) depositEl.value = r.deposit || '';

  openModal('room-modal');
}

async function deleteRoom(id, name) {
  if (!confirm('"' + name + '" 방을 삭제하시겠습니까? 연결된 세입자 정보도 같이 삭제됩니다.')) return;
  await api('/api/rooms/' + id, 'DELETE');
  showToast('"' + name + '" 방이 삭제되었습니다.');
  await loadRooms();
  if (typeof loadSummary === 'function') await loadSummary();
}
