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
          duration_days: Number(q('[name$="[schedule][duration]"]')?.value || 0),
          days: JSON.parse(q('[name$="[schedule][days]"]')?.value || "[]"),
          time: q('[name$="[schedule][time]"]')?.value || null,
          quantity_per_dose: Number(q('[name$="[schedule][quantity_per_dose]"]')?.value || 1),
          reminder_enabled: q('[name$="[schedule][reminder]"]')?.checked ?? true,
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
      body: JSON.stringify({ medicines })
    });

    console.log("💾 Draft saved:", medicines);
  }

  // ----------------------------
  // Add new medicine card
  // ----------------------------
  addBtn.addEventListener("click", () => {
    // Collapse all existing cards
    document.querySelectorAll(".medicine-card").forEach(card => {
      card.classList.add("collapsed");
      const body = card.querySelector(".card-body");
      if (body) body.style.display = "none";
    });

    const index = document.querySelectorAll(".medicine-card").length;
    const template = document.querySelector(".medicine-card");
    const clone = template.cloneNode(true);

    clone.dataset.index = index;
    
    const titleEl = clone.querySelector("h3");
    if (titleEl) titleEl.innerText = `Medicine ${index + 1}`;
    
    clone.classList.remove("collapsed");
    const cloneBody = clone.querySelector(".card-body");
    if (cloneBody) cloneBody.style.display = "block";

    // Update all input names and reset values
    clone.querySelectorAll("input, textarea").forEach(el => {
      // Update name attribute
      el.name = el.name.replace(/\[(\d+)\]/, `[${index}]`);
      
      // Update id attribute if exists
      if (el.id) {
        el.id = el.id.replace(/-(\d+)-/, `-${index}-`);
      }
      
      // Reset values
      if (el.type === "checkbox") {
        el.checked = el.name.includes("[reminder]"); // Only reminder should be checked by default
      } else if (el.type === "radio") {
        el.checked = false;
      } else if (el.type === "number") {
        // Keep default values for quantity_per_dose
        if (!el.name.includes("quantity_per_dose")) {
          el.value = "";
        }
      } else {
        el.value = "";
      }
    });

    // Update radio button labels to match new inputs
    clone.querySelectorAll("label[for]").forEach(label => {
      const forAttr = label.getAttribute("for");
      if (forAttr) {
        label.setAttribute("for", forAttr.replace(/-(\d+)-/, `-${index}-`));
      }
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
    if (cards.length === 1) {
      alert("At least one medicine required");
      return;
    }

    btn.closest(".medicine-card").remove();
  });

  // ----------------------------
  // Toggle card collapse/expand
  // ----------------------------
  container.addEventListener("click", e => {
    const toggle = e.target.closest(".action-box--toggle");
    if (!toggle) return;

    const card = toggle.closest(".medicine-card");
    const body = card.querySelector(".card-body");

    if (!body) return;

    const isOpen = body.style.display !== "none";
    body.style.display = isOpen ? "none" : "block";
    card.classList.toggle("collapsed", isOpen);
    
    // Update aria-expanded attribute
    toggle.setAttribute("aria-expanded", !isOpen);
  });

  // ----------------------------
  // Day selection handler
  // ----------------------------
  container.addEventListener("click", e => {
    if (!e.target.classList.contains("day")) return;

    const card = e.target.closest(".medicine-card");
    e.target.classList.toggle("selected");

    const days = Array.from(card.querySelectorAll(".day.selected")).map(d => d.dataset.day);

    const daysInput = card.querySelector('input[name*="[schedule][days]"]');
    if (daysInput) {
      daysInput.value = JSON.stringify(days);
    }
  });

  // ----------------------------
  // NEXT → Schedule
  // ----------------------------
  nextBtn?.addEventListener("click", async () => {
    await saveDraft();
    window.location.href = "/confirmation";
  });
});