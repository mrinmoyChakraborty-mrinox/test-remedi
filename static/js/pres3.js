function togglePrescription(num) {
    const content = document.getElementById(`content${num}`);
    const arrow = document.getElementById(`arrow${num}`);

    content.style.display =
        content.style.display === "block" ? "none" : "block";

    arrow.textContent =
        arrow.textContent === "▼" ? "▲" : "▼";

    loadPrescription(num);
}

function loadPrescription(num) {
    const imgData = localStorage.getItem(`prescription${num}`);
    const img = document.getElementById(`img${num}`);
    const text = document.getElementById(`text${num}`);

    if (imgData) {
        img.src = imgData;
        img.style.display = "block";
        text.style.display = "none";
    } else {
        img.style.display = "none";
        text.style.display = "block";
    }
}

function deletePrescription(num) {
    localStorage.removeItem(`prescription${num}`);
    loadPrescription(num);
    alert(`Prescription ${num} deleted`);
}

function createSchedule(num) {
    const imgData = localStorage.getItem(`prescription${num}`);
    if (!imgData) {
        alert("No prescription found");
        return;
    }
    alert(`Schedule created using Prescription ${num}`);
}
