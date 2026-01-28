const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- 1. TAB SWITCHING LOGIC (Isi ki wajah se buttons kaam nahi kar rahe the) ---
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-tab");

            // Hide all sections & remove active class from buttons
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));

            // Show selected section & add active class
            document.getElementById(target).style.display = "block";
            tab.classList.add("activeTab");

            // Stop any active camera when switching tabs
            stopBarcodeCamera();
            stopQRCamera();
        });
    });

    // --- HIGH PITCH SHARP BEEP LOGIC ---
    function playHighBeep() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(2500, audioCtx.currentTime); 
            gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) { console.error("Audio error:", e); }
    }

    const scanConfig = { fps: 25, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

    // --- SCAN SUCCESS HANDLER ---
    async function onScanSuccess(code, readerId, isQR = false) {
        if (isProcessing) return;
        isProcessing = true; 

        playHighBeep();
        if (navigator.vibrate) navigator.vibrate(100);
        
        const reader = document.getElementById(readerId);
        reader.classList.add("scan-success");

        const flash = document.createElement("div");
        flash.className = "flash-effect";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 100);

        if (isQR) {
            await stopQRCamera();
            document.getElementById("qrField").value = code;
            qrDataList.push({data: code, time: new Date().toLocaleString()});
            localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
        } else {
            await stopBarcodeCamera();
            document.getElementById("entryFields").style.display = "block";
            document.getElementById("barcode").value = code;
            document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
        }
        
        reader.classList.remove("scan-success");
        isProcessing = false;
    }

    // --- CAMERA CONTROLS ---
    document.getElementById("startScan").onclick = () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        isProcessing = false;
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "reader", false));
    };

    document.getElementById("startQR").onclick = () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        isProcessing = false;
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "qr-reader", true));
    };

    async function stopBarcodeCamera() {
        if (barcodeScanner && barcodeScanner.isScanning) {
            await barcodeScanner.stop();
        }
        document.getElementById("reader").style.display = "none";
    }

    async function stopQRCamera() {
        if (qrScanner && qrScanner.isScanning) {
            await qrScanner.stop();
        }
        document.getElementById("qr-reader").style.display = "none";
    }

    document.getElementById("stopScan").onclick = stopBarcodeCamera;
    document.getElementById("stopQR").onclick = stopQRCamera;

    // --- DATA HANDLING ---
    document.getElementById("submitBtn").onclick = () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: new Date().toLocaleString('en-GB')
        };
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
        document.getElementById("entryFields").style.display = "none";
        
        // Clear inputs for next scan
        document.getElementById("photo").value = "";
        document.getElementById("remark").value = "";
    };

    // Retry button logic
    document.getElementById("retryBtn").onclick = () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("startScan").click();
    };

    function updateBarcodeTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>DateTime</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.datetime}</td>
            <td><button onclick="deleteRow(${i})" style="background:red; color:white; width:auto; padding:5px 10px;">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
    };

    // --- GOOGLE SHEETS SYNC ---
    document.getElementById("syncBtn").onclick = async () => {
        if (barcodeData.length === 0) return alert("No data to sync!");
        
        const btn = document.getElementById("syncBtn");
        btn.innerText = "Syncing...";
        btn.disabled = true;

        try {
            // Sending entire array to Google Sheet
            await fetch(WEBAPP_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify(barcodeData)
            });
            alert("Data sent to Google Sheet successfully!");
        } catch (err) {
            console.error(err);
            alert("Sync failed. Check connection.");
        } finally {
            btn.innerText = "Update Google Sheet";
            btn.disabled = false;
        }
    };

    updateBarcodeTable();
});
