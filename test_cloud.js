const https = require('https');

const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });

const req = https.request({
  hostname: 'notification-dashboard-1042551861454.asia-northeast3.run.app',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
}, res => {
  let cookie = res.headers['set-cookie'];
  if (cookie) cookie = cookie[0];
  console.log('Login Status:', res.statusCode);

  const req2 = https.request({
    hostname: 'notification-dashboard-1042551861454.asia-northeast3.run.app',
    port: 443,
    path: '/api/admin/tenants',
    method: 'GET',
    headers: { 'Cookie': cookie }
  }, res2 => {
    let rawData = '';
    res2.on('data', chunk => rawData += chunk);
    res2.on('end', () => console.log('Tenants Status:', res2.statusCode, '\nRes:', rawData.substring(0, 100)));
  });
  req2.end();

  const req3 = https.request({
    hostname: 'notification-dashboard-1042551861454.asia-northeast3.run.app',
    port: 443,
    path: '/api/admin/transactions',
    method: 'GET',
    headers: { 'Cookie': cookie }
  }, res3 => {
    let rawData = '';
    res3.on('data', chunk => rawData += chunk);
    res3.on('end', () => console.log('Txs Status:', res3.statusCode, '\nRes:', rawData.substring(0, 100)));
  });
  req3.end();

});

req.on('error', e => console.error(`problem: ${e.message}`));
req.write(loginData);
req.end();
