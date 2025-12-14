document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ add_medicine.js loaded");

  const container = document.getElementById("medicineCards");
  const addBtn = document.getElementById("addAnotherBtn");
  const nextBtn = document.getElementById("nextBtn");

  // ----------------------------
  // Collect ALL medicines
  // ----------------------------
  function collectMedicines() {
      return Array.from(document.querySelectorAll(".medicine-card")).map(card => {
        const q = sel => card.querySelector(sel);

        return {
          medicine: {
            name: q('[name$="[name]"]')?.value || "",
            dosage: q('[name$="[dosage]"]')?.value || "",
            quantity: Number(q('[name$="[quantity]"]')?.value || 0),

            medium: q('[name$="[medium]"]:checked')?.value || "",
            food: q('[name$="[food]"]:checked')?.value || "",
            notes: q('[name$="[notes]"]')?.value || ""
          },

          schedule: {
            start_date: q('[name$="[schedule][start_date]"]')?.value || null,
            duration_days: Number(
              q('[name$="[schedule][duration]"]')?.value || 0
            ),

            days: JSON.parse(
              q('[name$="[schedule][days]"]')?.value || "[]"
            ),

            time: q('[name$="[schedule][time]"]')?.value || null,

            quantity_per_dose: Number(
              q('[name$="[schedule][quantity_per_dose]"]')?.value || 1
            ),

            reminder_enabled:
              q('[name$="[schedule][reminder]"]')?.checked ?? true,

            snooze_minutes: 10
          }
        };
      });
}


  // ----------------------------
  // Save draft to backend
  // ----------------------------
  async function saveDraft() {
    const medicines = collectMedicines();

    await fetch("/api/draft/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medicines
      })
    });

    console.log("💾 Draft saved:", medicines);
  }

  // ----------------------------
  // Add new medicine card
  // ----------------------------
  addBtn.addEventListener("click", () => {
      document.querySelectorAll(".medicine-card").forEach(card => {
        card.classList.add("collapsed");
        card.querySelector(".card-body").style.display = "none";
      });

      const index = document.querySelectorAll(".medicine-card").length;
      const template = document.querySelector(".medicine-card");
      const clone = template.cloneNode(true);

      clone.dataset.index = index;
      clone.querySelector("h3").innerText = `Medicine ${index + 1}`;
      clone.classList.remove("collapsed");
      clone.querySelector(".card-body").style.display = "block";

      clone.querySelectorAll("input, textarea").forEach(el => {
        el.value = "";
        el.name = el.name.replace(/\[\d+\]/, `[${index}]`);
        if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      });

      container.appendChild(clone);
    });

  // ----------------------------
  // Remove medicine card
  // ----------------------------
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".action-box--remove");
    if (!btn) return;

    const cards = document.querySelectorAll(".medicine-card");
    if (cards.length === 1) return alert("At least one medicine required");

    btn.closest(".medicine-card").remove();
  });

  // ----------------------------
  // NEXT → Schedule
  // ----------------------------
  nextBtn?.addEventListener("click", async () => {
    await saveDraft();
    window.location.href = "/confirmation";
  });
});
document.addEventListener("click", e => {
  if (!e.target.classList.contains("day")) return;

  const card = e.target.closest(".medicine-card");
  e.target.classList.toggle("selected");

  const days = Array.from(
    card.querySelectorAll(".day.selected")
  ).map(d => d.dataset.day);

  card.querySelector(
    'input[name*="[schedule][days]"]'
  ).value = JSON.stringify(days);
});

container.addEventListener("click", e => {
  const toggle = e.target.closest(".action-box--toggle");
  if (!toggle) return;

  const card = toggle.closest(".medicine-card");
  const body = card.querySelector(".card-body");

  const isOpen = body.style.display !== "none";
  body.style.display = isOpen ? "none" : "block";
  card.classList.toggle("collapsed", isOpen);
});
