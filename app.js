const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- TAB SWITCHING ---
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");
    tabs.forEach(tab => {
        tab.onclick = () => {
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));
            document.getElementById(tab.getAttribute("data-tab")).style.display = "block";
            tab.classList.add("activeTab");
            stopBarcodeCamera(); stopQRCamera();
        };
    });

    // --- SCAN CONFIG (Accuracy fix karne ke liye FPS 15 kiya hai) ---
    const scanConfig = { 
        fps: 15, 
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        disableFlip: false // Standard reading ke liye
    };

    function playHighBeep() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 2500;
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    }

    async function onScanSuccess(code, readerId, isQR = false) {
        if (isProcessing) return;
        isProcessing = true;
        
        playHighBeep();
        if (navigator.vibrate) navigator.vibrate(100);

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
        isProcessing = false;
    }

    // --- CAMERA CONTROLS ---
    document.getElementById("startScan").onclick = () => {
        isProcessing = false;
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "reader", false))
        .catch(err => alert("Camera error: " + err));
    };

    document.getElementById("startQR").onclick = () => {
        isProcessing = false;
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "qr-reader", true))
        .catch(err => alert("Camera error: " + err));
    };

    // --- RETRY BUTTON LOGIC (Fixed) ---
    document.getElementById("retryBtn").onclick = () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("barcode").value = "";
        document.getElementById("startScan").click(); // Dobara camera start karega
    };

    async function stopBarcodeCamera() { if (barcodeScanner?.isScanning) await barcodeScanner.stop(); document.getElementById("reader").style.display = "none"; }
    async function stopQRCamera() { if (qrScanner?.isScanning) await qrScanner.stop(); document.getElementById("qr-reader").style.display = "none"; }

    document.getElementById("stopScan").onclick = stopBarcodeCamera;
    document.getElementById("stopQR").onclick = stopQRCamera;

    // --- SUBMIT & TABLE ---
    document.getElementById("submitBtn").onclick = () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: document.getElementById("datetime").value
        };
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
        document.getElementById("entryFields").style.display = "none";
        // Reset fields
        document.getElementById("photo").value = "";
        document.getElementById("remark").value = "";
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

    window.deleteRow = (i) => { barcodeData.splice(i, 1); localStorage.setItem("barcodeData", JSON.stringify(barcodeData)); updateBarcodeTable(); };

    // Copy & Export
    document.getElementById("copyBtn").onclick = () => {
        let text = "Serial\tPhoto\tRemark\tDateTime\n" + barcodeData.map(e => `${e.module}\t${e.image}\t${e.remark}\t${e.datetime}`).join("\n");
        navigator.clipboard.writeText(text).then(() => alert("Copied!"));
    };

    document.getElementById("exportBtn").onclick = () => {
        let csv = "Serial,Photo,Remark,DateTime\n" + barcodeData.map(e => `"${e.module}","${e.image}","${e.remark}","${e.datetime}"`).join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "Barcode_Data.csv";
        a.click();
    };

    document.getElementById("syncBtn").onclick = async () => {
        if (barcodeData.length === 0) return alert("No data to sync!");
        try {
            await fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(barcodeData) });
            alert("Sync Successful!");
        } catch (e) { alert("Sync Failed"); }
    };

    updateBarcodeTable();
});
