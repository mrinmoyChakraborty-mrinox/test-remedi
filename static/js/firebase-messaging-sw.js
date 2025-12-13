
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

async function fetchFirebaseConfig() {
  const response = await fetch('/api/get_firebase_config');
  return await response.json();
}
const firebaseConfig = fetchFirebaseConfig();
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 1. DISPLAY THE NOTIFICATION (When app is closed)
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/static/images/titleicon.png',
    
    // Pass the hidden data to the notification object
    data: payload.data,
    
    // DEFINE THE SMALL BUTTONS
    actions: [
        { action: 'mark_taken', title: '✅ Take Now' },
        { action: 'open_page', title: '👀 View Details' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 2. HANDLE CLICKS
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Always close the notification first

  const scheduleId = event.notification.data.schedule_id;
  const userId = event.notification.data.user_id;
  const medName = event.notification.data.med_name;

  // --- SCENARIO A: User clicked the small "Take Now" button ---
  if (event.action === 'mark_taken') {
      const handleQuickTake = async () => {
          try {
              // Send request to Python to mark as taken
              await fetch('/api/mark_taken', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ schedule_id: scheduleId, user_id: userId })
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
      const actionUrl = `/notification-action?schedule_id=${scheduleId}&user_id=${userId}&med_name=${medName}`;
      
      // Open the browser window
      event.waitUntil(
          clients.openWindow(actionUrl)
      );
  }
});