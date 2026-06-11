import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('https://oauth2.cert.toss.im/user-info', {
      headers: { Authorization: 'Bearer random_token' }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response?.status, err.response?.data || err.message);
  }
}

test();
