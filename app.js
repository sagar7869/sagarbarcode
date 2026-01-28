const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;

    // --- HIGH PITCH BEEP LOGIC ---
    function playCaptureSound() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "sine"; 
        osc.frequency.setValueAtTime(2000, audioCtx.currentTime); // High pitch (2000Hz)
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    }

    /* --- FAST SCAN CONFIG --- */
    const scanConfig = { 
        fps: 30, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        videoOptimizer: true 
    };

    /* --- COMMON SCAN SUCCESS HANDLER --- */
    function onScanSuccess(code, readerId, isQR = false) {
        const reader = document.getElementById(readerId);
        
        // 1. Instant Effects
        reader.classList.add("scan-success");
        playCaptureSound(); // High Beep on capture
        
        // 2. Visual Flash
        const flash = document.createElement("div");
        flash.className = "flash-effect";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 150);

        // 3. Data Processing
        setTimeout(() => {
            if(isQR) {
                stopQRCamera();
                document.getElementById("qrField").value = code;
                qrDataList.push({data: code, time: new Date().toLocaleString()});
                localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
                alert("QR Captured!");
            } else {
                stopBarcodeCamera();
                document.getElementById("entryFields").style.display = "block";
                document.getElementById("barcode").value = code;
                document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
            }
            reader.classList.remove("scan-success");
        }, 200);
    }

    /* --- START BUTTONS --- */
    document.getElementById("startScan").onclick = () => {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        const reader = document.getElementById("reader");
        reader.style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "reader", false))
        .catch(err => alert("Camera Error: " + err));
    };

    document.getElementById("startQR").onclick = () => {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        const qrReader = document.getElementById("qr-reader");
        qrReader.style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "qr-reader", true))
        .catch(err => alert("Camera Error: " + err));
    };

    /* --- STOP FUNCTIONS (STRICT FIX) --- */
    function stopBarcodeCamera() {
        if (barcodeScanner && barcodeScanner.isScanning) {
            barcodeScanner.stop().then(() => {
                barcodeScanner.clear();
                document.getElementById("reader").style.display = "none";
            }).catch(() => {
                document.getElementById("reader").style.display = "none";
            });
        } else {
            document.getElementById("reader").style.display = "none";
        }
    }

    function stopQRCamera() {
        if (qrScanner && qrScanner.isScanning) {
            qrScanner.stop().then(() => {
                qrScanner.clear();
                document.getElementById("qr-reader").style.display = "none";
            }).catch(() => {
                document.getElementById("qr-reader").style.display = "none";
            });
        } else {
            document.getElementById("qr-reader").style.display = "none";
        }
    }

    document.getElementById("stopScan").onclick = stopBarcodeCamera;
    document.getElementById("stopQR").onclick = stopQRCamera;

    /* --- DATA HANDLING --- */
    document.getElementById("submitBtn").onclick = () => {
        const now = new Date();
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            date: now.toLocaleDateString('en-GB'),
            datetime: now.toLocaleString('en-GB')
        };
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
        fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(entry) });
        document.getElementById("entryFields").style.display = "none";
    };

    function updateBarcodeTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date Time</th><th>Del</th></tr>";
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

    /* --- TAB SYSTEM --- */
    document.querySelectorAll(".tabBtn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            btn.classList.add("activeTab");
            document.getElementById(btn.dataset.tab).style.display = "block";
            stopBarcodeCamera();
            stopQRCamera();
        };
    });

    updateBarcodeTable();
});
