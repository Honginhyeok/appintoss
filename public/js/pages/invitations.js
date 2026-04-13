// ─── INVITATIONS (Landlord Only) ──────────────────────────────────
async function loadInvitations() {
  const tbody = document.getElementById('invitations-body');
  if (!tbody) return;

  const invitations = await api('/api/invitations');
  if (!invitations || invitations.error) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">오류가 발생했습니다.</td></tr>';
    return;
  }

  // Populate tenant select dropdown if tenants data is available
  const select = document.getElementById('invite-tenant-select');
  if (select && typeof tenants !== 'undefined') {
    select.innerHTML = '<option value="">세입자 지정 안함</option>' + tenants.map(t => `<option value="${t.id}">${t.name} (방: ${t.room?.name || '미정'})</option>`).join('');
  }

  tbody.innerHTML = invitations.map(inv => {
    const isExpired = new Date(inv.expiresAt) < new Date();
    const statusLabel = inv.isUsed ? '<span class="badge badge-maintenance">사용됨</span>' : 
                        isExpired ? '<span class="badge badge-expense">만료됨</span>' : 
                        '<span class="badge badge-income">대기중</span>';
    
    // Find assigned tenant name
    const assignedTenant = inv.tenantId && typeof tenants !== 'undefined' ? tenants.find(t => t.id === inv.tenantId) : null;
    const targetName = assignedTenant ? `<span style="font-weight:600">${assignedTenant.name}</span> <span style="font-size:12px;color:var(--text-muted)">(${assignedTenant.room?.name || '방 미정'})</span>` : '<span style="color:var(--text-muted); font-size:13px;">지정 안됨</span>';

    return `
      <tr>
        <td style="font-family:monospace;font-weight:700;font-size:16px;">${inv.code}</td>
        <td>${targetName}</td>
        <td>${fmtDate(inv.expiresAt)}</td>
        <td>${statusLabel}</td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="deleteInvitation('${inv.id}')">삭제</button>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">생성된 초대 코드가 없습니다</td></tr>';
}

async function generateInviteCode() {
  const select = document.getElementById('invite-tenant-select');
  const tenantId = select ? select.value : null;

  const result = await api('/api/invitations', 'POST', { tenantId });
  if (result.error) return alert(result.error);
  showToast('새 초대 코드가 발급되었습니다.');
  loadInvitations();
}

async function deleteInvitation(id) {
  if (!confirm('정말 이 초대 코드를 삭제하시겠습니까?')) return;
  const res = await api(`/api/invitations/${id}`, 'DELETE');
  if (res.error) return alert(res.error);
  loadInvitations();
}
