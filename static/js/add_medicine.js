/* ===============================
   Helpers
================================ */
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ===============================
   Build medicine model (ONLY medicine)
================================ */
function buildMedicineDraft() {
  const medicines = [];

  qsa(".medicine-card").forEach((card, idx) => {
    const medium = card.querySelector('[name*="[medium]"]:checked')?.value || "";
    const food = card.querySelector('[name*="[food]"]:checked')?.value || "";

    const tod = [];
    const tod_times = {};

    qsa('[name*="[tod][]"]', card).forEach(cb => {
      if (cb.checked) {
        tod.push(cb.value);
        const timeInput = cb.closest(".tod-item")
          ?.querySelector(".dynamic-time-input");
        if (timeInput?.value) {
          tod_times[cb.value] = timeInput.value;
        }
      }
    });

    medicines.push({
      name: qs(`[name="med[${idx}][name]"]`, card)?.value || "",
      dosage: qs(`[name="med[${idx}][dosage]"]`, card)?.value || "",
      quantity: parseInt(
        qs(`[name="med[${idx}][quantity]"]`, card)?.value || "1",
        10
      ),
      medium,
      food,
      notes: qs(`[name="med[${idx}][notes]"]`, card)?.value || "",
      tod,
      tod_times
    });
  });

  return { medicines };
}

/* ===============================
   Draft API
================================ */
async function saveMedicineDraft() {
  const payload = {
    medicine: buildMedicineDraft()
  };

  await fetch("/api/draft/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

const saveDebounced = debounce(saveMedicineDraft, 700);

async function loadMedicineDraft() {
  const res = await fetch("/api/draft/load");
  const data = await res.json();

  if (!data.draft || !data.draft.medicine) return;

  applyMedicineDraft(data.draft.medicine);
}

/* ===============================
   Restore into UI
================================ */
function applyMedicineDraft(medicineDraft) {
  if (!Array.isArray(medicineDraft.medicines)) return;

  while (qsa(".medicine-card").length < medicineDraft.medicines.length) {
    addMedicineForm();
  }

  medicineDraft.medicines.forEach((med, idx) => {
    const card = qsa(".medicine-card")[idx];
    if (!card) return;

    qs(`[name="med[${idx}][name]"]`, card).value = med.name || "";
    qs(`[name="med[${idx}][dosage]"]`, card).value = med.dosage || "";
    qs(`[name="med[${idx}][quantity]"]`, card).value = med.quantity || 1;
    qs(`[name="med[${idx}][notes]"]`, card).value = med.notes || "";

    qsa(`[name="med[${idx}][medium]"]`, card).forEach(r => {
      r.checked = r.value === med.medium;
      r.closest(".medium-option")?.classList.toggle("selected", r.checked);
    });

    qsa(`[name="med[${idx}][food]"]`, card).forEach(r => {
      r.checked = r.value === med.food;
    });

    qsa(`[name="med[${idx}][tod][]"]`, card).forEach(cb => {
      cb.checked = med.tod?.includes(cb.value);
      cb.dispatchEvent(new Event("change"));
      const t = cb.closest(".tod-item")
        ?.querySelector(".dynamic-time-input");
      if (t && med.tod_times?.[cb.value]) {
        t.value = med.tod_times[cb.value];
      }
    });
  });
}

/* ===============================
   Event wiring
================================ */
document.addEventListener("input", () => {
  if (qs("#autoSaveToggle")?.checked) {
    saveDebounced();
  }
});

document.addEventListener("click", e => {
  if (e.target.closest(".manual-save-btn")) {
    saveMedicineDraft();
  }

  if (e.target.closest(".action-box--remove")) {
    e.target.closest(".medicine-card")?.remove();
    saveDebounced();
  }
});

/* ===============================
   Init
================================ */
document.addEventListener("DOMContentLoaded", async () => {
  await loadMedicineDraft();
});
// ---------- NEXT BUTTON (Add Medicine → Schedule) ----------
document.addEventListener("DOMContentLoaded", () => {
  const nextBtn = document.getElementById("nextBtn");
  if (!nextBtn) return;

  nextBtn.addEventListener("click", async () => {
    // ensure latest draft is saved
    await saveMedicineDraft();

    // move to schedule page
    window.location.href = "/schedule";
  });
});
