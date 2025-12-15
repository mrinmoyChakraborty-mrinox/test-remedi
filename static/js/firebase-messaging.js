import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

let messaging = null;

async function initFirebaseMessaging() {
  const res = await fetch("/api/get_firebase_config");
  const config = await res.json();

  const app = initializeApp(config);
  messaging = getMessaging(app);

  // 🔔 FOREGROUND HANDLER
  onMessage(messaging, (payload) => {
  console.log("🔔 FOREGROUND MESSAGE:", payload);

    showToast(
      `💊 Time to take ${payload.data.med_name}`,
      payload.data
    );
  });

}


initFirebaseMessaging();
function showToast(message, payload) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");

  // ✅ Redirect to your existing page
  toast.onclick = () => {
    const params = new URLSearchParams({
      schedule_id: payload.schedule_id,
      user_id: payload.user_id,
      med_name: payload.med_name,
      food: payload.food || ""
    });

    window.location.href = `/notification-action?${params.toString()}`;
  };

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hidden");
    toast.onclick = null;
  }, 4000);
}


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
