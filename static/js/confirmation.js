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

        medicines = data.draft.medicine ? [data.draft.medicine] : [];
        schedule = data.draft.schedule || {};
    }

    // ---------------- RENDER ----------------
    function render() {
        if (medicines.length === 0) {
            medicineListEl.innerHTML = '<p>No medicines yet.</p>';
            return;
        }

        medicineListEl.innerHTML = '';
        medicines.forEach((med, index) => {
            const item = document.createElement('div');
            item.className = 'medicine-item';

            item.innerHTML = `
                <button class="medicine-header">
                    <div>
                        <div class="title">${med.name}</div>
                        <div class="subtitle">${med.dosage || ''} • ${med.medium || ''}</div>
                    </div>
                    <div class="caret">▼</div>
                </button>

                <div class="medicine-details">
                    <div class="detail-grid">
                        <div><strong>Start Date</strong> ${schedule.start_date || 'Not set'}</div>
                        <div><strong>Duration</strong> ${schedule.custom_days || schedule.preset_days || 'Not set'} days</div>
                        <div><strong>Repeat</strong> ${(schedule.days || []).join(', ') || 'Daily'}</div>
                        <div><strong>Time</strong> ${schedule.time || 'Not set'}</div>
                        <div><strong>Reminders</strong> ${schedule.reminder_enabled ? 'On' : 'Off'}</div>
                        <div><strong>Snooze</strong> ${schedule.snooze_minutes || 10} min</div>
                    </div>
                </div>
            `;

            const header = item.querySelector('.medicine-header');
            const details = item.querySelector('.medicine-details');

            header.addEventListener('click', () => {
                details.classList.toggle('open');
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
                labels: medicines.map(m => m.name),
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
