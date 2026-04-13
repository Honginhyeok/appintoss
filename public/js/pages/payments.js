// ─── PAYMENTS REQUESTS ──────────────────────────────────

// 카테고리 한글 매핑
const PAYMENT_CATEGORIES = {
  RENT: '월세',
  MAINTENANCE_FEE: '관리비',
  REPAIR: '수리비용',
  DEPOSIT: '보증금',
  OTHER: '기타'
};

async function loadPayments() {
  const container = document.getElementById('payments-container');
  if (!container) return;

  const data = await api('/api/payments');
  if (!data || data.error) return;

  const isLandlord = currentUser.role !== 'TENANT';

  if (isLandlord) {
    // ── 임대인 뷰: 요청 목록 테이블 ──
    container.innerHTML = `
      <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>상태</th>
            <th>작성자(임차인)</th>
            <th>카테고리</th>
            <th>입금 요청액</th>
            <th>메모</th>
            <th>요청일시</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(p => {
            const roomTxt = p.user?.assignedRoom?.name ? p.user.assignedRoom.name + (p.user.assignedRoom.name.endsWith('호') ? '' : '호') : '알 수 없음';
            const nameTxt = p.user?.name || p.user?.username || '알 수 없음';
            return `
            <tr>
              <td>${p.status === 'PENDING' ? '<span class="badge badge-expense">대기중</span>' : p.status === 'APPROVED' ? '<span class="badge badge-income">승인완료</span>' : '<span class="badge" style="background:#555;color:#fff">거절됨</span>'}</td>
              <td><div style="font-weight:600">${roomTxt} / ${nameTxt}</div></td>
              <td>${PAYMENT_CATEGORIES[p.category] || p.category || '-'}</td>
              <td style="font-family:monospace; font-weight:bold">${Number(p.amount).toLocaleString()}원</td>
              <td style="font-size:13px; color:var(--text-muted); max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.memo || ''}">${p.memo || '-'}</td>
              <td style="font-size:13px; color:var(--text-muted)">${new Date(p.createdAt).toLocaleString()}</td>
              <td>
                ${p.status === 'PENDING' ? `
                  <button class="btn btn-sm" style="background:var(--secondary);color:#fff;border:none;" onclick="approvePayment('${p.id}')">승인 및 수납</button>
                  <button class="btn btn-sm btn-ghost" onclick="rejectPayment('${p.id}')">거절</button>
                ` : '-'}
              </td>
            </tr>
            `;
          }).join('') || `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px">요청 내역이 없습니다</td></tr>`}
        </tbody>
      </table>
      </div>
    `;
  } else {
    // ── 임차인 뷰: 입금 확인 요청 폼 + 내역 ──
    container.innerHTML = `
      <div class="card" style="max-width:520px; margin:0 auto 28px; border-radius:16px; border:1px solid var(--border); box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        <div class="card-header" style="padding:20px 24px 12px; border-bottom:none;">
          <h2 style="font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px;">💸 입금 확인 요청</h2>
          <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">입금 후 아래 양식을 작성하여 임대인에게 알려주세요.</p>
        </div>

        <!-- 토스 간편 송금 브릿지 -->
        <div style="padding: 0 24px 16px;">
          <button type="button" onclick="openTossDeepLink()" class="btn" style="width:100%; padding:14px; background:#0050FF; color:white; border-radius:12px; font-weight:700; font-size:15px; border:none; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 12px rgba(0,80,255,0.3);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 5C11 4.44772 11.4477 4 12 4C12.5523 4 13 4.44772 13 5V12.1578L16.2428 8.91501C16.6333 8.52448 17.2665 8.52448 17.657 8.91501C18.0475 9.30553 18.0475 9.9387 17.657 10.3292L12.7071 15.2792C12.3166 15.6697 11.6834 15.6697 11.2929 15.2792L6.34293 10.3292C5.9524 9.9387 5.9524 9.30553 6.34293 8.91501C6.73345 8.52448 7.36662 8.52448 7.75714 8.91501L11 12.1578V5Z" fill="currentColor"/><path d="M4 17C4 16.4477 4.44772 16 5 16H19C19.5523 16 20 16.4477 20 17C20 17.5523 19.5523 18 19 18H5C4.44772 18 4 17.5523 4 17Z" fill="currentColor"/></svg>
            토스로 1초 만에 송금하기
          </button>
        </div>

        <form id="payment-request-form" style="padding:4px 24px 24px;">
          <div class="form-group">
            <label style="font-weight:600; font-size:14px;">카테고리 *</label>
            <select id="pr-category" required style="width:100%; padding:12px 14px; border:1px solid var(--border); border-radius: var(--radius); font-size:14px; background:white; cursor:pointer;">
              <option value="">-- 선택하세요 --</option>
              <option value="RENT">월세</option>
              <option value="MAINTENANCE_FEE">관리비</option>
              <option value="REPAIR">수리비용</option>
              <option value="DEPOSIT">보증금</option>
              <option value="OTHER">기타</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight:600; font-size:14px;">입금 금액 (원) *</label>
            <div style="position:relative;">
              <input type="text" id="pr-amount" required inputmode="numeric" placeholder="예: 500,000" autocomplete="off"
                style="width:100%; padding:12px 14px; padding-right:32px; border:1px solid var(--border); border-radius:var(--radius); font-size:16px; font-family:monospace; font-weight:600;">
              <span style="position:absolute; right:14px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:14px;">원</span>
            </div>
          </div>
          <div class="form-group">
            <label style="font-weight:600; font-size:14px;">기타 사항 (메모)</label>
            <textarea id="pr-memo" rows="3" placeholder="추가 전달사항이 있으면 입력하세요."
              style="width:100%; padding:12px 14px; border:1px solid var(--border); border-radius:var(--radius); font-size:14px; resize:vertical;"></textarea>
          </div>
          <button type="submit" id="pr-submit-btn" class="btn btn-primary" style="width:100%; padding:14px; font-size:15px; font-weight:700; margin-top:8px; border-radius:12px; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>📨</span> <span>요청 보내기</span>
          </button>
        </form>
      </div>

      <h3 style="margin-bottom:12px; font-size:16px; font-weight:600;">📋 나의 요청 내역</h3>
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${data.map(p => `
          <div class="card" style="padding:16px 20px; border-left:4px solid ${p.status === 'APPROVED' ? 'var(--secondary)' : p.status === 'REJECTED' ? '#6b7280' : 'var(--primary)'}; border-radius:12px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">${PAYMENT_CATEGORIES[p.category] || p.category || '월세'}</div>
                <strong style="font-size:20px; font-family:monospace;">${Number(p.amount).toLocaleString()}원</strong>
                ${p.memo ? `<div style="font-size:13px; color:var(--text-muted); margin-top:6px; background:var(--bg-light); padding:6px 10px; border-radius:6px;">💬 ${p.memo}</div>` : ''}
                <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">${new Date(p.createdAt).toLocaleString()}</div>
              </div>
              <div>
                ${p.status === 'PENDING' ? '<span class="badge badge-expense">심사 대기중</span>' : p.status === 'APPROVED' ? '<span class="badge badge-income">확인 완료</span>' : '<span class="badge" style="background:#555;color:#fff">취소됨</span>'}
              </div>
            </div>
          </div>
        `).join('') || '<div class="card" style="text-align:center; padding:30px; color:var(--text-muted); border-radius:12px;">요청 내역이 없습니다.</div>'}
      </div>
    `;

    // ── 금액 입력 자동 콤마 포맷팅 ──
    const amountInput = document.getElementById('pr-amount');
    if (amountInput) {
      amountInput.addEventListener('input', function () {
        let raw = this.value.replace(/[^0-9]/g, '');
        if (raw) {
          this.value = Number(raw).toLocaleString();
        } else {
          this.value = '';
        }
      });
    }

    // ── 폼 제출 핸들러 ──
    const form = document.getElementById('payment-request-form');
    if (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const category = document.getElementById('pr-category').value;
        const amountRaw = document.getElementById('pr-amount').value;
        const memo = document.getElementById('pr-memo').value;

        if (!category) return alert('카테고리를 선택하세요.');
        if (!amountRaw) return alert('입금 금액을 입력하세요.');

        const amount = parseFloat(amountRaw.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) return alert('유효한 금액을 입력하세요.');

        const btn = document.getElementById('pr-submit-btn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="loader"></span> 전송 중...'; }

        const res = await api('/api/payments', 'POST', { category, amount, memo });

        if (btn) { btn.disabled = false; btn.innerHTML = '<span>📨</span> <span>요청 보내기</span>'; }

        if (res.error) return alert(res.error);

        // 알림은 백엔드에서 임대인에게 직접 DB Insert 처리

        showToast('성공적으로 요청되었습니다! 🎉');
        loadPayments();
      });
    }
  }
}

async function approvePayment(id) {
  if (!confirm('입금을 확인하셨습니까?\n승인 시 자동으로 해당 수입이 장부에 기록됩니다.')) return;
  const res = await api(`/api/payments/${id}/approve`, 'POST');
  if (res.error) return alert(res.error);
  showToast('승인 완료! 수입이 장부에 기록되었습니다. ✅');
  loadPayments();
}

async function rejectPayment(id) {
  if (!confirm('요청을 거절하시겠습니까?')) return;
  const res = await api(`/api/payments/${id}/reject`, 'POST');
  if (res.error) return alert(res.error);
  showToast('거절 처리되었습니다.');
  loadPayments();
}

// ─── TOSS DEEPLINK BRIDGE ──────────────────────────────────
function getTossBankCode(bankName) {
  if (!bankName) return '';
  const b = bankName.toLowerCase();
  if (b.includes('국민')) return '국민';
  if (b.includes('신한')) return '신한';
  if (b.includes('우리')) return '우리';
  if (b.includes('하나')) return '하나';
  if (b.includes('카카오')) return '카카오';
  if (b.includes('토스')) return '토스';
  if (b.includes('농협')) return '농협';
  if (b.includes('기업')) return '기업';
  return bankName;
}

window.openTossDeepLink = function() {
  const bank = currentUser.landlordSettlementBank;
  const account = currentUser.landlordSettlementAccount;
  const amount = currentUser.rentAmount || '';

  if (!bank || !account) {
    return alert('임대인의 정산 계좌가 아직 등록되지 않았습니다.');
  }

  const bankCode = getTossBankCode(bank);
  const tossUrl = `supertoss://send?bank=${encodeURIComponent(bankCode)}&account=${encodeURIComponent(account)}` + (amount ? `&amount=${amount}` : '');
  
  window.location.href = tossUrl;
};
