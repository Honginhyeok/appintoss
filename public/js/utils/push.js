// Convert base64 string to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push routing not supported');
    return;
  }

  try {
    // 1. Register service worker
    const register = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker Registered...');

    // 2. Ask for permission
    const permission = await window.Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permission denied');

    // 3. Get public key
    const res = await api('/api/webpush/vapidPublicKey');
    if (!res || !res.publicKey) return;

    // 4. Subscribe
    const existingSub = await register.pushManager.getSubscription();
    if (existingSub) {
      // already subbed, you might still want to resend to backend just in case
      await api('/api/webpush/subscribe', 'POST', existingSub);
      return;
    }

    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(res.publicKey)
    });

    console.log('Push Registered...', subscription);

    // 5. Send to backend
    await api('/api/webpush/subscribe', 'POST', subscription);

  } catch(e) {
    console.log('Push subscription failed: ', e);
  }
}
