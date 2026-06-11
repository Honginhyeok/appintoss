import axios from 'axios';

async function test(url) {
  try {
    const res = await axios.get(url, { headers: { Authorization: 'Bearer test' }});
    console.log(url, res.status);
  } catch(e) {
    console.log(url, e.response?.status);
  }
}

test('https://oauth2.cert.toss.im/user');
test('https://oauth2.cert.toss.im/me');
test('https://oauth2.cert.toss.im/oauth2/user');
test('https://oauth2.cert.toss.im/oauth2/me');
test('https://oauth2.cert.toss.im/api/v1/user');
test('https://oauth2.cert.toss.im/api/v1/me');
