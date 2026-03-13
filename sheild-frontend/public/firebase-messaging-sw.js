importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDVycmqQCpLQYH22e5hi5hcUFxe3obEDS4",
  authDomain: "sheild-app-prod-1234.firebaseapp.com",
  projectId: "sheild-app-prod-1234",
  storageBucket: "sheild-app-prod-1234.firebasestorage.app",
  messagingSenderId: "296306996390",
  appId: "1:296306996390:web:ca1b7c1141a1cd0f447067"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Emergency Update';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
