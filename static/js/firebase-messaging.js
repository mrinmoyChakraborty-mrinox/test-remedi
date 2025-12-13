import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

async function fetchFirebaseConfig() {
  const response = await fetch('/api/get_firebase_config');
  return await response.json();
}
firebaseConfig = await fetchFirebaseConfig();
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

document.getElementById("enableNotif").onclick = async (e) => {
  e.preventDefault();
  const permission = await requestPermission();

  if (permission !== "granted") {
    alert("Notifications blocked");
    return;
  }

  const token = await getToken(messaging, {
    vapidKey: firebaseConfig.vapidKey
  });

  console.log("FCM Token:", token);

  // Send token to backend
  await fetch("/save-fcm-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });

  alert("Notifications enabled!");
};