const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let barcodeScanner, qrScanner, audioCtx, isProcessing = false;

    // --- High Pitch Sharp Beep ---
    function playHighBeep() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(2200, audioCtx.currentTime); // Sharp Tone
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    }

    const scanConfig = { fps: 30, qrbox: 250, videoConstraints: { focusMode: "continuous" } };

    async function onScanSuccess(code, readerId, isQR) {
        if (isProcessing) return;
        isProcessing = true;
        playHighBeep();
        
        const reader = document.getElementById(readerId);
        reader.classList.add("scan-success");
        
        const flash = document.createElement("div");
        flash.className = "flash-effect"; document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 100);

        if (isQR) {
            await stopQRCamera();
            document.getElementById("qrField").value = code;
        } else {
            await stopBarcodeCamera();
            document.getElementById("entryFields").style.display = "block";
            document.getElementById("barcode").value = code;
            document.getElementById("datetime").value = new Date().toLocaleString();
        }
        reader.classList.remove("scan-success");
        isProcessing = false;
    }

    // --- Barcode Start ---
    document.getElementById("startScan").onclick = () => {
        if (audioCtx) audioCtx.resume();
        const reader = document.getElementById("reader");
        reader.style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "reader", false))
        .then(() => setupZoom(barcodeScanner, "barcode-zoom"));
    };

    // --- QR Start ---
    document.getElementById("startQR").onclick = () => {
        if (audioCtx) audioCtx.resume();
        const qrReader = document.getElementById("qr-reader");
        qrReader.style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "qr-reader", true))
        .then(() => setupZoom(qrScanner, "qr-zoom"));
    };

    function setupZoom(scanner, sliderId) {
        const track = scanner.getRunningTrack();
        const slider = document.getElementById(sliderId);
        const caps = track.getCapabilities();
        if (caps.zoom) {
            slider.min = caps.zoom.min; slider.max = caps.zoom.max; slider.step = caps.zoom.step;
            slider.oninput = () => track.applyConstraints({ advanced: [{ zoom: slider.value }] });
        }
    }

    async function stopBarcodeCamera() { if (barcodeScanner?.isScanning) { await barcodeScanner.stop(); barcodeScanner.clear(); } document.getElementById("reader").style.display = "none"; }
    async function stopQRCamera() { if (qrScanner?.isScanning) { await qrScanner.stop(); qrScanner.clear(); } document.getElementById("qr-reader").style.display = "none"; }

    document.getElementById("stopScan").onclick = stopBarcodeCamera;
    document.getElementById("stopQR").onclick = stopQRCamera;

    // --- Data Handling ---
    document.getElementById("submitBtn").onclick = () => {
        const entry = { module: document.getElementById("barcode").value, image: document.getElementById("photo").value, remark: document.getElementById("remark").value, datetime: new Date().toLocaleString() };
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
        fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(entry) });
        document.getElementById("entryFields").style.display = "none";
    };

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Module</th><th>Image</th><th>Remark</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td><button onclick="deleteRow(${i})" style="background:red; width:auto; padding:2px 8px;">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => { barcodeData.splice(i, 1); localStorage.setItem("barcodeData", JSON.stringify(barcodeData)); updateTable(); };

    document.querySelectorAll(".tabBtn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            btn.classList.add("activeTab");
            document.getElementById(btn.dataset.tab).style.display = "block";
            stopBarcodeCamera(); stopQRCamera();
        };
    });

    updateTable();
});
                          
