import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('https://oauth2.cert.toss.im/token', new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'dy93zgk83vqxl4cas2vqql7xx6q6f9zb'
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}

test();
