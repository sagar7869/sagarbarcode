const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- HIGH PITCH SHARP BEEP LOGIC ---
    function playHighBeep() {
        try {
            // Audio Context initialize/resume
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(2500, audioCtx.currentTime); // Bahut sharp sound (2500Hz)
            
            gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
            console.error("Audio error:", e);
        }
    }

    const scanConfig = { 
        fps: 25, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };

    // --- SCAN SUCCESS HANDLER ---
    async function onScanSuccess(code, readerId, isQR = false) {
        if (isProcessing) return;
        isProcessing = true; 

        playHighBeep(); // Yahan beep bajega
        if (navigator.vibrate) navigator.vibrate(100); // Halki vibration feedback
        
        const reader = document.getElementById(readerId);
        reader.classList.add("scan-success");

        // Visual Flash
        const flash = document.createElement("div");
        flash.className = "flash-effect";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 100);

        // Scanner Stop logic
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

    /* --- START BUTTONS MEIN AUDIO RESUME DALA HAI --- */
    document.getElementById("startScan").onclick = () => {
        // Audio permission ke liye zaroori hai
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        isProcessing = false;
        const reader = document.getElementById("reader");
        reader.style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "reader", false));
    };

    document.getElementById("startQR").onclick = () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        isProcessing = false;
        const qrReader = document.getElementById("qr-reader");
        qrReader.style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "qr-reader", true));
    };

    async function stopBarcodeCamera() {
        if (barcodeScanner && barcodeScanner.isScanning) {
            await barcodeScanner.stop();
            barcodeScanner.clear();
        }
        document.getElementById("reader").style.display = "none";
    }

    async function stopQRCamera() {
        if (qrScanner && qrScanner.isScanning) {
            await qrScanner.stop();
            qrScanner.clear();
        }
        document.getElementById("qr-reader").style.display = "none";
    }

    document.getElementById("stopScan").onclick = stopBarcodeCamera;
    document.getElementById("stopQR").onclick = stopQRCamera;

    // ... (Baaki submit aur update table functions wahi rahenge)
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
        fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(entry) });
        document.getElementById("entryFields").style.display = "none";
    };

    function updateBarcodeTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>DateTime</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.datetime}</td>
            <td><button onclick="deleteRow(${i})" style="background:red; color:white; width:auto;">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
    };

    updateBarcodeTable();
});
