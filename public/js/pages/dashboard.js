// ─── DASHBOARD ──────────────────────────────────────────────────────
async function loadAllData() {
  // Execute independently, do not fail all if one fails
  await Promise.all([
    loadRooms().catch(e => console.error('Rooms:', e)),
    loadTenants().catch(e => console.error('Tenants:', e)),
    loadTransactions().catch(e => console.error('Txs:', e)),
    loadLogs().catch(e => console.error('Logs:', e))
  ]);
  // Then execute summary which relies on globals (rooms)
  await loadSummary().catch(e => console.error('Summary:', e));
}

async function loadSummary() {
  // 전역 상태 변수를 단일 진실의 원천(Single Source of Truth)으로 사용
  const roomsList = Array.isArray(rooms) ? rooms : [];
  const tenantsList = Array.isArray(tenants) ? tenants : [];
  const txList = Array.isArray(txsList) ? txsList : [];

  const totalIncome = txList.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = txList.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const occupiedRooms = roomsList.filter(r => r.status === 'OCCUPIED').length;
  const totalRooms = roomsList.length;

  const data = { totalIncome, totalExpense, netProfit, occupiedRooms, totalRooms };

  const incomeEl = document.getElementById('total-income');
  if (incomeEl) incomeEl.textContent = fmt(data.totalIncome || 0);

  const expenseEl = document.getElementById('total-expense');
  if (expenseEl) expenseEl.textContent = fmt(data.totalExpense || 0);

  const netEl = document.getElementById('net-profit');
  if (netEl) {
    netEl.textContent = fmt(data.netProfit || 0);
    netEl.style.color = (data.netProfit || 0) >= 0 ? 'var(--income)' : 'var(--expense)';
  }

  const statEl = document.getElementById('room-status');
  if (statEl) statEl.textContent = `${data.occupiedRooms || 0}/${data.totalRooms || 0}`;

  // Recent transactions (최근 10건)
  const tbody = document.getElementById('recent-transactions');
  if (tbody) {
    tbody.innerHTML = txList.slice(0, 10).map(t => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td><span class="badge badge-${t.type.toLowerCase()}">${t.type === 'INCOME' ? '수입' : '지출'}</span></td>
        <td>${categoryLabel(t.category)}</td>
        <td style="color:var(--text-muted)">${t.description || '-'}</td>
        <td style="font-weight:600;color:${t.type==='INCOME'?'var(--income)':'var(--expense)'}">${fmt(t.amount)}</td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">거래 내역이 없습니다</td></tr>';
  }

  // Charts 렌더링
  await renderCharts();
}

let incomeChart = null;
let monthlyChart = null;

async function renderCharts() {
  const roomsList = Array.isArray(rooms) ? rooms : [];
  const tenantsList = Array.isArray(tenants) ? tenants : [];
  const txList = Array.isArray(txsList) ? txsList : [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const remainingMonths = 12 - currentMonth;

  const roomAnnual = roomsList.reduce((sum, r) => sum + Number(r.monthlyRent || 0), 0) * 12;
  
  let tenantExpected = 0;
  tenantsList.forEach(t => {
    const rentAmount = Number(t.rentAmount || 0);
    if (!rentAmount) return;
    if (t.rentType === 'YEARLY' && t.moveInDate) {
      if (new Date(t.moveInDate).getMonth() >= currentMonth) tenantExpected += rentAmount;
    } else if (t.rentType === 'CUSTOM' && t.customRentStartDate) {
      const d = new Date(t.customRentStartDate);
      if (d.getFullYear() === currentYear && d.getMonth() >= currentMonth) tenantExpected += rentAmount;
    } else if (t.rentType === 'MONTHLY' || !t.rentType) {
      tenantExpected += rentAmount * remainingMonths;
    }
  });

  const actualIncome = txList
    .filter(t => t.type === 'INCOME' && new Date(t.date).getFullYear() === currentYear)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const ctx1 = document.getElementById('income-compare-chart');
  if (ctx1) {
    if (incomeChart) incomeChart.destroy();
    incomeChart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['방 기준\n(만실 시)', '세입자 기준\n(남은 기간)', '실제 수입\n(올해 누적)'],
        datasets: [{
          data: [roomAnnual, tenantExpected, actualIncome],
          backgroundColor: ['rgba(59,130,246,0.2)', 'rgba(59,130,246,0.5)', 'rgba(16,185,129,0.7)'],
          borderColor: ['#3b82f6', '#3b82f6', '#10b981'],
          borderWidth: 2,
          borderRadius: 8,
          barPercentage: 0.6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => '₩' + ctx.raw.toLocaleString('ko-KR') } } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => v >= 10000 ? (v / 10000) + '만' : v.toLocaleString(), font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
          x: { ticks: { font: { size: 11 } }, grid: { display: false } }
        }
      }
    });

    const legendEl = document.getElementById('chart-legend');
    if (legendEl) {
      legendEl.innerHTML = `
        <div class="legend-item"><span class="legend-dot" style="background:rgba(59,130,246,0.2); border:1px solid #3b82f6"></span> 방 기준 (만실): <span class="legend-value">${fmt(roomAnnual)}</span></div>
        <div class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span> 세입자 기준: <span class="legend-value">${fmt(tenantExpected)}</span></div>
        <div class="legend-item"><span class="legend-dot" style="background:#10b981"></span> 실제 누적: <span class="legend-value">${fmt(actualIncome)}</span></div>
      `;
    }
  }

  const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const monthlyIncome = new Array(12).fill(0);
  const monthlyExpense = new Array(12).fill(0);
  txList.forEach(t => {
    const d = new Date(t.date);
    if (d.getFullYear() === currentYear) {
      const m = d.getMonth();
      if (t.type === 'INCOME') monthlyIncome[m] += Number(t.amount || 0);
      else monthlyExpense[m] += Number(t.amount || 0);
    }
  });
  for (let m = currentMonth; m < 12; m++) {
    if (monthlyIncome[m] === 0) {
      let expectedForMonth = 0;
      tenantsList.forEach(t => {
        const rentAmount = Number(t.rentAmount || 0);
        if (!rentAmount) return;
        if (t.rentType === 'YEARLY' && t.moveInDate) {
          if (new Date(t.moveInDate).getMonth() === m) expectedForMonth += rentAmount;
        } else if (t.rentType === 'CUSTOM' && t.customRentStartDate) {
          const d = new Date(t.customRentStartDate);
          if (d.getFullYear() === currentYear && d.getMonth() === m) expectedForMonth += rentAmount;
        } else if (t.rentType === 'MONTHLY' || !t.rentType) {
          expectedForMonth += rentAmount;
        }
      });
      monthlyIncome[m] = expectedForMonth;
    }
  }

  const ctx2 = document.getElementById('monthly-chart');
  if (ctx2) {
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: '수입', data: monthlyIncome, backgroundColor: 'rgba(16,185,129,0.6)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 },
          { label: '지출', data: monthlyExpense, backgroundColor: 'rgba(244,63,94,0.6)', borderColor: '#f43f5e', borderWidth: 1, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12, padding: 12 } }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ₩' + ctx.raw.toLocaleString('ko-KR') } } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => v >= 10000 ? (v / 10000) + '만' : v.toLocaleString(), font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
          x: { ticks: { font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  }

  // Chart 3: Per-Room (진실의 원천 txList 기반으로 렌더링)
  const roomBarCtx = document.getElementById('room-bar-chart');
  if (roomBarCtx) {
    const yearEl = document.getElementById('room-chart-year');
    if (yearEl) yearEl.textContent = currentYear;
    
    // 데이터가 아예 없을 경우 빈 렌더링을 방지하거나 빈 배열을 전달
    const roomNames = roomsList.map(r => r.user ? `${r.name} (${r.user.username})` : r.name) || [];
    const roomIncome = roomsList.map(r =>
      txList.filter(t => t.roomId === r.id && t.type === 'INCOME' && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    ) || [];
    const roomExpense = roomsList.map(r =>
      txList.filter(t => t.roomId === r.id && t.type === 'EXPENSE' && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    ) || [];
    
    if (window.roomBarChart) window.roomBarChart.destroy();
    window.roomBarChart = new Chart(roomBarCtx, {
      type: 'bar',
      data: {
        labels: roomNames,
        datasets: [
          { label: '수입', data: roomIncome, backgroundColor: 'rgba(16,185,129,0.65)', borderColor: '#10b981', borderWidth: 1, borderRadius: 5 },
          { label: '지출', data: roomExpense, backgroundColor: 'rgba(244,63,94,0.6)', borderColor: '#f43f5e', borderWidth: 1, borderRadius: 5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ₩' + ctx.raw.toLocaleString('ko-KR') } } },
        scales: {
          y: { beginAtZero: true, ticks: { callback: v => v >= 10000 ? (v/10000) + '만' : v, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
          x: { ticks: { font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  }
}


async function loadLogs() {
  const result = await api('/api/logs');
  const logs = Array.isArray(result) ? result : [];
  const tbody = document.getElementById('logs-body');
  if (tbody) {
    tbody.innerHTML = logs.map(l => {
      const useCaseStr = { RENT_DUE:'월세납부', OVERDUE_PAYMENT:'월세미납', CONTRACT_ENDING:'계약만료', MAINTENANCE_REQUEST_RECEIVED:'보수접수', MAINTENANCE_COMPLETED:'보수완료' }[l.useCase] || l.useCase;
      const ch = l.channel.includes('KAKAO') ? 'KAKAO' : 'SMS';
      return `<tr>
        <td>${useCaseStr}</td>
        <td><span class="badge badge-${l.status}">${l.status}</span></td>
        <td><span class="badge badge-${ch}">${ch === 'KAKAO' ? '카카오' : 'SMS'}</span></td>
        <td style="color:var(--text-muted)">${l.sentAt ? fmtDate(l.sentAt) : '-'}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">발송 내역이 없습니다</td></tr>';
  }
}
