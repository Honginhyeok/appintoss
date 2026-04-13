const fs = require('fs');

const currentUser = { role: 'ADMIN', username: 'admin' };
const rooms = [{"id":"b9e889a4-316f-418a-b878-410bba57a15f","name":"201호","floor":2,"area":15,"status":"OCCUPIED","monthlyRent":null,"deposit":10000000,"notes":null,"createdAt":"2026-04-05T14:18:05.597Z","userId":"3d664c8a-48fa-4a97-9538-6c08eff98df4","user":{"username":"testuser"}}];

function statusLabel(st) { return { VACANT: '공실', OCCUPIED: '입주중', MAINTENANCE: '점검중' }[st] || st; }
function fmt(num) { return num ? num.toString() : '0'; }

const isAdmin = true;
try {
  const html = rooms.map(r => `
      <div class="room-card ${r.status}" onclick="openRoomDetail('${r.id}')" style="cursor:pointer">
        ${isAdmin && r.user ? `<div style="font-size:11px;color:#6366f1;font-weight:600;margin-bottom:4px">👤 ${r.user.username}</div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div class="room-name">${r.name}</div>
            <div class="room-meta">${r.floor ? r.floor + '층' : ''} ${r.area ? r.area + '평' : ''}</div>
            <span class="room-badge badge-${r.status}">${statusLabel(r.status)}</span>
          </div>
        </div>
        <div class="room-rent">${r.monthlyRent ? fmt(r.monthlyRent) + '/월' : '-'}</div>
        <div class="room-meta" style="margin-top:4px">보증금 ${r.deposit ? fmt(r.deposit) : '-'}</div>
        <div class="room-actions" onclick="event.stopPropagation()">
          ${!isAdmin || !r.user || r.user.username === currentUser.username ? `
            <button class="btn-icon" onclick="editRoom('${r.id}')">✏️</button>
            <button class="btn-icon danger" onclick="deleteRoom('${r.id}', '${r.name}')">🗑️</button>
          ` : '<span style="font-size:11px;color:var(--text-muted)">열람 전용</span>'}
        </div>
      </div>`).join('');
  console.log("Render Success", html.substring(0, 50));
} catch(e) {
  console.error("Render Error:", e);
}

const txs = [{"id":"bde2e426-df7e-4beb-99a5-d8b6a38be10e","type":"EXPENSE","category":"MAINTENANCE","amount":20000,"date":"2026-04-0514:18.000Z"}];
function categoryLabel(c) { return c; }
function fmtDate(d) { return d; }

try {
  const tHtml = txs.map(t => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td><span class="badge badge-${t.type.toLowerCase()}">${t.type === 'INCOME' ? '수입' : '지출'}</span></td>
        <td>${categoryLabel(t.category)}</td>
        <td style="color:var(--text-muted)">${t.room ? t.room.name : '공통'}</td>
        <td style="color:var(--text-muted)">${isAdmin && t.user ? '<span style="font-size:11px;background:#e0e7ff;color:#4338ca;padding:1px 6px;border-radius:10px;margin-right:4px">' + t.user.username + '</span>' : ''}${t.description || '-'}</td>
        <td style="font-weight:600;color:${t.type==='INCOME'?'var(--income)':'var(--expense)'}">${fmt(t.amount)}</td>
      </tr>`).join('');
  console.log("T render Success", tHtml.substring(0, 50));
} catch(e) {
  console.error("T Error:", e);
}
