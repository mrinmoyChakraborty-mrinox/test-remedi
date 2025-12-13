import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("enableNotif");

  if (!btn) {
    console.error("❌ enableNotif not found");
    return;
  }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    const permission = await Notification.requestPermission();
    console.log("Permission:", permission);

    if (permission !== "granted") return;

    // Everything AFTER permission is safe
    const res = await fetch("/api/get_firebase_config");
    const firebaseConfig = await res.json();

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/static/firebase-messaging-sw.js");
    }

    const token = await getToken(messaging, {
      vapidKey: firebaseConfig.vapidKey
    });

    await fetch("/save-fcm-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    alert("Notifications enabled ✅");
  });
});
