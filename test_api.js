const http = require('http');

const loginData = JSON.stringify({ username: 'admin', password: 'admin123' });

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData)
  }
}, res => {
  let cookie = res.headers['set-cookie'];
  if (cookie) cookie = cookie[0];

  const req2 = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/tenants',
    method: 'GET',
    headers: { 'Cookie': cookie }
  }, res2 => {
    let rawData = '';
    res2.on('data', chunk => rawData += chunk);
    res2.on('end', () => console.log('Tenants Status:', res2.statusCode, '\nResponse:', rawData.substring(0, 500)));
  });
  req2.end();

  const req3 = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/transactions',
    method: 'GET',
    headers: { 'Cookie': cookie }
  }, res3 => {
    let rawData = '';
    res3.on('data', chunk => rawData += chunk);
    res3.on('end', () => console.log('Txs Status:', res3.statusCode, '\nResponse:', rawData.substring(0, 500)));
  });
  req3.end();

});

req.on('error', e => console.error(`problem with request: ${e.message}`));
req.write(loginData);
req.end();
