const https = require('https');
const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });

const req = https.request({
  hostname: 'notification-dashboard-1042551861454.asia-northeast3.run.app',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
}, res => {
  let cookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0] : '';
  const makeReq = (path) => new Promise(resolve => {
    https.request({ hostname: 'notification-dashboard-1042551861454.asia-northeast3.run.app', port: 443, path, method: 'GET', headers: { 'Cookie': cookie } }, r => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => { console.log(path, r.statusCode, data.substring(0, 150)); resolve(); });
    }).end();
  });
  
  (async () => {
    await makeReq('/api/admin/rooms');
    await makeReq('/api/admin/tenants');
    await makeReq('/api/admin/transactions');
  })();
});
req.write(loginData);
req.end();
