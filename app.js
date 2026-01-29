const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    /* ---------- TAB LOGIC (UNCHANGED) ---------- */
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-tab");
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));
            document.getElementById(target).style.display = "block";
            tab.classList.add("activeTab");
            stopBarcodeCamera();
            stopQRCamera();
        });
    });

    /* ---------- BEEP (UNCHANGED) ---------- */
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
        } catch (e) {}
    }

    const scanConfig = { fps: 25, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };

    async function onScanSuccess(code, readerId, isQR = false) {
        if (isProcessing) return;
        isProcessing = true;
        playHighBeep();
        if (navigator.vibrate) navigator.vibrate(100);

        if (isQR) {
            await stopQRCamera();
            document.getElementById("qrField").value = code;
            qrDataList.push({ data: code, time: new Date().toLocaleString() });
            localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
        } else {
            await stopBarcodeCamera();
            document.getElementById("entryFields").style.display = "block";
            document.getElementById("barcode").value = code;
            document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
        }
        isProcessing = false;
    }

    /* ---------- CAMERA BUTTONS (UNCHANGED) ---------- */
    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig,
            c => onScanSuccess(c, "reader", false));
    };

    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, scanConfig,
            c => onScanSuccess(c, "qr-reader", true));
    };

    async function stopBarcodeCamera() {
        if (barcodeScanner?.isScanning) await barcodeScanner.stop();
        document.getElementById("reader").style.display = "none";
    }
    async function stopQRCamera() {
        if (qrScanner?.isScanning) await qrScanner.stop();
        document.getElementById("qr-reader").style.display = "none";
    }

    document.getElementById("stopScan").onclick = stopBarcodeCamera;
    document.getElementById("stopQR").onclick = stopQRCamera;

    /* ---------- SUBMIT (UNCHANGED) ---------- */
    document.getElementById("submitBtn").onclick = () => {
        barcodeData.push({
            module: barcode.value,
            image: photo.value,
            remark: remark.value,
            datetime: datetime.value
        });
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
        entryFields.style.display = "none";
    };

    /* ---------- ✅ RETRY BUTTON (NEW, SAFE) ---------- */
    document.getElementById("retryBtn").onclick = () => {
        entryFields.style.display = "none";
        barcode.value = "";
        photo.value = "";
        remark.value = "";
        document.getElementById("startScan").click();
    };

    function updateBarcodeTable() {
        const table = document.getElementById("table");
        table.innerHTML =
            "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>DateTime</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            table.insertRow().innerHTML =
                `<td>${e.module}</td>
                 <td>${e.image}</td>
                 <td>${e.remark}</td>
                 <td>${e.datetime}</td>
                 <td><button onclick="deleteRow(${i})">X</button></td>`;
        });
        totalCount.innerText = barcodeData.length;
    }

    window.deleteRow = i => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
    };

    updateBarcodeTable();
});
