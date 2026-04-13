// ─── TRANSACTIONS ──────────────────────────────────────────────────
let txsList = [];

async function loadTransactions() {
  const result = await api('/api/transactions');
  const txs = Array.isArray(result) ? result : [];
  txsList = txs;

  const tbody = document.getElementById('transactions-body');
  if (tbody) {
    tbody.innerHTML = txs.map(t => {
      return '<tr>'
        + '<td>' + fmtDate(t.date) + '</td>'
        + '<td><span class="badge badge-' + t.type.toLowerCase() + '">' + (t.type === 'INCOME' ? '수입' : '지출') + '</span></td>'
        + '<td>' + categoryLabel(t.category) + '</td>'
        + '<td style="color:var(--text-muted)">' + (t.room ? t.room.name : '공통') + '</td>'
        + '<td style="color:var(--text-muted)">' + (t.description || '-') + '</td>'
        + '<td style="font-weight:600;color:' + (t.type === 'INCOME' ? 'var(--income)' : 'var(--expense)') + '">' + fmt(t.amount) + '</td>'
        + '<td>'
        + '<button class="btn-icon" onclick="editTx(\'' + t.id + '\')" title="수정">✏️</button>'
        + '<button class="btn-icon danger" onclick="deleteTx(\'' + t.id + '\')" title="삭제">🗑️</button>'
        + '</td></tr>';
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:20px">거래 내역이 없습니다</td></tr>';
  }
}

async function editTx(id) {
  const t = txsList.find(tx => tx.id === id);
  if (!t) return;

  document.getElementById('tx-id').value = t.id;
  document.getElementById('tx-type').value = t.type;
  document.getElementById('tx-date').value = t.date.split('T')[0];

  const stdCategories = ['RENT', 'DEPOSIT', 'MAINTENANCE', 'UTILITY', 'TAX', 'CLEANING'];
  if (stdCategories.includes(t.category)) {
    document.getElementById('tx-category').value = t.category;
    document.getElementById('custom-category-group').classList.add('hidden');
  } else {
    document.getElementById('tx-category').value = 'OTHER';
    document.getElementById('tx-custom-category').value = t.category;
    document.getElementById('custom-category-group').classList.remove('hidden');
  }

  document.getElementById('tx-room').value = t.roomId || '';
  document.getElementById('tx-amount').value = t.amount;
  document.getElementById('tx-description').value = t.description || '';

  document.getElementById('tx-modal-title').textContent = '거래 내역 수정';
  openModal('transaction-modal');
}

async function deleteTx(id) {
  if (!confirm('이 거래 내역을 삭제하시겠습니까?')) return;
  await api('/api/transactions/' + id, 'DELETE');
  showToast('거래 내역이 삭제되었습니다.');
  await loadTransactions();
  if (typeof loadSummary === 'function') await loadSummary();
}

function toggleCustomCategory() {
  const cat = document.getElementById('tx-category').value;
  document.getElementById('custom-category-group').classList.toggle('hidden', cat !== 'OTHER');
}
