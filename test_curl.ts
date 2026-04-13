async function run() {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: 'admin', password: 'admin123', role: 'ADMIN' })
    });
    const { token } = await response.json();
    console.log("Token acquired.");
    
    const r2 = await fetch('http://localhost:3000/api/rooms', {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ name: "테스트" })
    });
    const d2 = await r2.text();
    console.log("Status:", r2.status);
    console.log("Response:", d2);
}
run();
