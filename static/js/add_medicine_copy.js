document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ add_medicine.js loaded");

  // ---------- SAVE MEDICINE DRAFT ----------
  async function saveDraft() {
    const nameEl = document.querySelector('[name="med[0][name]"]');
    if (!nameEl) return;

    const payload = {
      medicine: {
        name: nameEl.value || "",
        dosage: document.querySelector('[name="med[0][dosage]"]')?.value || "",
        quantity: document.querySelector('[name="med[0][quantity]"]')?.value || "",
        food: document.querySelector('[name="med[0][food]"]:checked')?.value || "",
        notes: document.querySelector('[name="med[0][notes]"]')?.value || ""
      }
    };

    await fetch("/api/draft/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("💾 Medicine draft saved");
  }

  // ---------- NEXT BUTTON ----------
  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", async () => {
      console.log("➡️ Next clicked");
      await saveDraft();
      window.location.href = "/schedule";
    });
  }

  // ---------- ADD ANOTHER ----------
  const addAnotherBtn = document.getElementById("addAnotherBtn");
  if (addAnotherBtn) {
    addAnotherBtn.addEventListener("click", () => {
      console.log("➕ Add another clicked");
      alert("Add another clicked (logic not implemented yet)");
    });
  }
});
