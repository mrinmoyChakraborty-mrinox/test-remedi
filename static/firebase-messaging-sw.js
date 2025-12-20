
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');
importScripts("/firebase-config.js");

firebase.initializeApp(self.FIREBASE_CONFIG);
const messaging = firebase.messaging();

// 1. DISPLAY THE NOTIFICATION (When app is closed)
messaging.onBackgroundMessage((payload) => {
  console.log("BG payload:", payload);

  const type = payload.data.notification_type || "reminder";

  let title = "Reminder";
  let body = "";
  let actions = [];

  if (type === "refill") {
    title = "Refill Alert";
    body = `You are running low on ${payload.data.med_name}`;
    actions = [
      { action: "open_refill", title: "🧾 Refill Now" }
    ];
  } else {
    title = "Medicine Reminder";
    body = `Time to take ${payload.data.med_name} ${payload.data.food || ""}`;
    actions = [
      { action: "mark_taken", title: "✅ Take Now" },
      { action: "open_page", title: "👀 View Details" }
    ];
  }

  self.registration.showNotification(title, {
    body,
    icon: "/static/images/titleicon.png",
    data: payload.data,
    actions
  });
});


// 2. HANDLE CLICKS

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const type = data.notification_type || "reminder";
    // 🔁 REFILL NOTIFICATION
  if (type === "refill") {
    const refillUrl =
      `/refill-alert?medicine_id=${data.medicine_id}` +
      `&med_name=${data.med_name}` +
      `&remaining=${data.quantity || "0"}`;

    event.waitUntil(
      clients.openWindow(refillUrl)
    );
    return; // ⛔ stop further processing
  }


  const scheduleId = event.notification.data.schedule_id;
  const userId = event.notification.data.user_id;
  const medName = event.notification.data.med_name;
  const medId= event.notification.data.med_id;

  // --- SCENARIO A: User clicked the small "Take Now" button ---
  if (event.action === 'mark_taken') {
      const handleQuickTake = async () => {
          try {
              // Send request to Python to mark as taken
              await fetch('/api/mark_taken', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ schedule_id: scheduleId, user_id: userId, med_id: medId })
              });
              // Show a quick confirmation notification
              self.registration.showNotification("Done!", { 
                  body: `${medName} marked as taken.`, 
                  icon: '/static/images/tick.png' 
              });
          } catch (e) { console.error(e); }
      };
      event.waitUntil(handleQuickTake());
  } 
  
  // --- SCENARIO B: User clicked the Body (or "View Details") ---
  else {
      // Construct the URL to your special "Notification Action" page
      // We pass the IDs in the URL so the page knows what to show
      const actionUrl = `/notification-action?schedule_id=${scheduleId}&user_id=${userId}&med_name=${medName}&food=${event.notification.data.food}`;
      
      // Open the browser window
      event.waitUntil(
          clients.openWindow(actionUrl)
      );
  }
});