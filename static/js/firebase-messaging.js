import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

let messaging = null;

async function initFirebaseMessaging() {
  const res = await fetch("/api/get_firebase_config");
  const config = await res.json();

  const app = initializeApp(config);
  messaging = getMessaging(app);

  // 🔔 FOREGROUND HANDLER
  onMessage(messaging, async (payload) => {
    console.log("🔔 FOREGROUND MESSAGE:", payload);

    const reg = await navigator.serviceWorker.ready;

    await reg.showNotification("Medicine Reminder", {
      body: `Time to take ${payload.data.med_name} ${payload.data.food ? ' (' + payload.data.food + ')' : ''}`,
      icon: "/static/images/titleicon.png",
      data: payload.data,
      requireInteraction: true,
      actions: [
        { action: "mark_taken", title: "✅ Take Now" },
        { action: "open_page", title: "👀 View Details" }
      ]
    });
  });
}

initFirebaseMessaging();

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("enableNotif");

  if (!btn) {
    console.error("❌ enableNotif button not found");
    return;
  }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      const permission = await Notification.requestPermission();
      console.log("Permission:", permission);

      if (permission !== "granted") {
        alert("Notification permission denied. Please enable it in your browser settings.");
        return;
      }

      // Show loading state
      btn.disabled = true;
      btn.style.opacity = "0.6";

      // Fetch Firebase config
      const res = await fetch("/api/get_firebase_config");
      const firebaseConfig = await res.json();

      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Register service worker
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/static/firebase-messaging-sw.js");
      }

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: firebaseConfig.vapidKey
      });

      // Save token to backend
      const saveRes = await fetch("/save-fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (saveRes.ok) {
        console.log("✅ FCM Token saved:", token);
     
        alert("✅ Notifications enabled successfully!");
        window.location.reload();
      } else {
        throw new Error("Failed to save token");
      }

    } catch (error) {
      console.error("❌ Notification setup failed:", error);
      alert("Failed to enable notifications. Please try again.");
      window.location.reload();
    }
  });
});
