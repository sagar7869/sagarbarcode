
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- TAB SWITCHING LOGIC ---
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

    // --- AUDIO FEEDBACK ---
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
        } catch (e) { console.error(e); }
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
            document.getElementById("photo").focus();
        }
        isProcessing = false;
    }

    // --- CAMERA CONTROLS ---
    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "reader", false));
    };

    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "qr-reader", true));
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

    // --- SUBMIT LOGIC ---
    document.getElementById("submitBtn").onclick = () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: document.getElementById("datetime").value
        };
        
        if (!entry.module) return alert("Barcode missing!");
        
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
        
        // Form reset karein
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("barcode").value = "";
        document.getElementById("photo").value = "";
        document.getElementById("remark").value = "";
    };

    // --- RETRY BUTTON ---
    document.getElementById("retryBtn").onclick = async () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        await barcodeScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "reader", false));
    };

    // --- TABLE UPDATE ---
    function updateBarcodeTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `
                <td>${e.module}</td>
                <td>${e.image}</td>
                <td>${e.remark}</td>
                <td>${e.datetime}</td>
                <td><button onclick="deleteRow(${i})" style="background:red;color:white;width:auto;padding:5px 10px;">X</button></td>
            `;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
    };

    // --- SYNC TO GOOGLE SHEET (WITHOUT REPEATING DATA) ---
    document.getElementById("syncBtn").onclick = async () => {
        if (barcodeData.length === 0) return alert("Sync karne ke liye koi data nahi hai!");
        
        const btn = document.getElementById("syncBtn");
        btn.innerText = "Syncing...";
        btn.disabled = true;

        try {
            // mode: "no-cors" aapki original script ke liye
            await fetch(WEBAPP_URL, { 
                method: "POST", 
                mode: "no-cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(barcodeData) 
            });
            
            alert("Data successfully bhej diya gaya hai!");

            // REPEAT ROKNE KE LIYE DATA CLEAR KAREIN
            barcodeData = []; 
            localStorage.setItem("barcodeData", JSON.stringify([]));
            updateBarcodeTable();

        } catch (e) {
            console.error(e);
            alert("Sync Failed! Internet check karein.");
        } finally {
            btn.innerText = "Update Google Sheet";
            btn.disabled = false;
        }
    };

    // --- EXPORT & COPY ---
    document.getElementById("copyBtn").onclick = () => {
        let text = "Serial\tPhoto\tRemark\tDateTime\n";
        barcodeData.forEach(e => text += `${e.module}\t${e.image}\t${e.remark}\t${e.datetime}\n`);
        navigator.clipboard.writeText(text).then(() => alert("Table copied!"));
    };

    document.getElementById("exportBtn").onclick = () => {
        let csv = "Serial,Photo,Remark,DateTime\n";
        barcodeData.forEach(e => csv += `"${e.module}","${e.image}","${e.remark}","${e.datetime}"\n`);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "Barcode_Data.csv";
        a.click();
    };

    // Initial table load
    updateBarcodeTable();
});
                          
