document.addEventListener("DOMContentLoaded", async () => {
    const scheduleId = document.getElementById("scheduleId").value;

    const res = await fetch(`/api/schedules/get/${scheduleId}`);
    const data = await res.json();

    document.querySelector("#quantity_per_dose").value = data.quantity_per_dose;
    document.querySelector("#food").value = data.food;
    // fill rest similarly
});

async function saveSchedule() {
    const scheduleId = document.getElementById("scheduleId").value;

    const payload = {
        quantity_per_dose: document.querySelector("#quantity_per_dose").value,
        food: document.querySelector("#food").value
    };

    const res = await fetch(`/api/schedules/update/${scheduleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("Schedule updated");
        window.location.href = "/view-schedules";
    } else {
        alert("Failed to update");
    }
}
