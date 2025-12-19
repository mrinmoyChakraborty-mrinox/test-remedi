let selectedFile = null;

function openFilePicker() {
    document.getElementById("fileInput").click();
}

document.getElementById("fileInput").addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

    if (!allowedTypes.includes(file.type)) {
        alert("Invalid file type. Please upload jpg, png, or pdf.");
        this.value = "";
        return;
    }

    selectedFile = file;
    document.getElementById("fileName").textContent =
        "Selected file: " + file.name;
});

function confirmUpload() {
    if (!selectedFile) {
        alert("Please upload a prescription first.");
        return;
    }

    alert("Prescription uploaded successfully!");
}
