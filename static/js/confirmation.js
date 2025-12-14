document.addEventListener('DOMContentLoaded', () => {
    let medicines = [];
    let schedule = {};
    let chartInstance = null;

    const medicineListEl = document.getElementById('medicine-list');

    // ---------------- FETCH DATA (SINGLE SOURCE OF TRUTH) ----------------
    async function getConfirmationData() {
        const res = await fetch('/api/draft/load');
        const data = await res.json();

        if (!data.draft) {
            medicineListEl.innerHTML = '<p>No draft found. Please go back.</p>';
            return;
        }

        medicines = data.draft.medicines || [];
        schedule = data.draft.schedule || {};
    }

    // ---------------- RENDER ----------------
    function render() {
            medicineListEl.innerHTML = "";

            medicines.forEach(med => {
                const item = document.createElement("div");
                item.className = "medicine-item";

                item.innerHTML = `
                <button class="medicine-header">
                    <div>
                    <div class="title">${med.medicine.name}</div>
                    <div class="subtitle">${med.medicine.dosage || ""}</div>
                    </div>
                    <div class="caret">▼</div>
                </button>

                <div class="medicine-details">
                    <div><b>Start:</b> ${med.schedule.start_date}</div>
                    <div><b>Duration:</b> ${med.schedule.duration_days} days</div>
                    <div><b>Days:</b> ${med.schedule.days.join(", ")}</div>
                    <div><b>Time:</b> ${med.schedule.time}</div>
                    <div><b>Quantity:</b> ${med.schedule.total_quantity}</div>
                </div>
                `;

                const header = item.querySelector(".medicine-header");
                const details = item.querySelector(".medicine-details");

                header.addEventListener("click", () => {
                details.classList.toggle("open");
                });

                medicineListEl.appendChild(item);
            });

  renderDonutChart();
    }
    

    // ---------------- CHART (UNCHANGED) ----------------
    function renderDonutChart() {
        const ctx = document.getElementById('medicine-donut-chart')?.getContext('2d');
        if (!ctx) return;

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: medicines.map(m => m.medicine.name),
                datasets: [{
                    data: medicines.map(() => 1),
                }]
            }
        });
    }

    // ---------------- ACTIONS ----------------
    async function activateSchedule() {
        const res = await fetch('/api/activate', { method: 'POST' });

        if (!res.ok) {
            alert('Failed to activate schedule');
            return;
        }

        window.location.href = '/dashboard';
    }
    async function saveDraftOnly() {
        await fetch("/api/draft/save", { method: "POST" });
        alert("Draft saved");
    }
    function goBack() {
        window.location.href = '/schedule';
    }

    // ---------------- INIT ----------------
    async function init() {
        await getConfirmationData();
        render();
        document.getElementById("save-draft-btn")?.addEventListener("click", saveDraftOnly);
        document.getElementById('back-btn')?.addEventListener('click', goBack);
        document.getElementById('activate-btn')?.addEventListener('click', activateSchedule);
    }
    

    init();
});
