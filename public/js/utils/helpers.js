// ─── HELPERS ──────────────────────────────────────────────────────
const fmt = (num) => new Intl.NumberFormat('ko-KR').format(num) + '원';
const fmtDate = (d) => new Date(d).toLocaleDateString('ko-KR', { year:'numeric', month:'short', day:'numeric' });

// ─── 전화번호 자동 하이픈 포맷팅 (010-1234-5678) ────────────────
window.autoHyphenPhone = function(input) {
  const raw = input.value.replace(/[^0-9]/g, '').slice(0, 11);
  let formatted = raw;
  if (raw.length > 3 && raw.length <= 7) {
    formatted = raw.slice(0, 3) + '-' + raw.slice(3);
  } else if (raw.length > 7) {
    formatted = raw.slice(0, 3) + '-' + raw.slice(3, 7) + '-' + raw.slice(7);
  }
  input.value = formatted;
};

// ─── 납부일(일) 입력 방어 로직 (1~31 고정) ────────────────────────
window.enforcePayDayLimit = function(input) {
  let value = parseInt(input.value, 10);
  if (isNaN(value)) {
    input.value = '';
    return;
  }
  if (value > 31) {
    input.value = '31';
  } else if (value < 1) {
    input.value = '1';
  }
};

const categoryLabel = (c) => ({ RENT:'월세', DEPOSIT:'보증금', MAINTENANCE:'관리비', UTILITY:'공과금', TAX:'세금', CLEANING:'청소비', OTHER:'기타' }[c] || c);
const statusLabel = (s) => ({ VACANT:'공실', OCCUPIED:'입주중', MAINTENANCE:'수리중' }[s] || s);

function showToast(msg) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = msg;
  container.appendChild(toast);
  
  // trigger reflow for animation
  void toast.offsetWidth;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
