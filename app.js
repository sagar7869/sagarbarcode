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

    // --- AUDIO ---
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

    async function stopBarcodeCamera() {
        if (barcodeScanner?.isScanning) await barcodeScanner.stop();
        document.getElementById("reader").style.display = "none";
    }

    async function stopQRCamera() {
        if (qrScanner?.isScanning) await qrScanner.stop();
        document.getElementById("qr-reader").style.display = "none";
    }

    // --- SYNC FUNCTION (Used by Submit and Update Button) ---
    async function syncToSheet(dataArray) {
        if (dataArray.length === 0) return false;
        try {
            await fetch(WEBAPP_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(dataArray)
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    // --- SUBMIT: Instant Sync ---
    document.getElementById("submitBtn").onclick = async () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: document.getElementById("datetime").value,
            synced: false // Default false
        };

        if (!entry.module) return alert("Serial Number missing!");

        // Turant sync karne ki koshish
        const success = await syncToSheet([entry]);
        if (success) {
            entry.synced = true;
        }

        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
        
        document.getElementById("entryFields").style.display = "none";
        // Reset inputs
        document.getElementById("barcode").value = "";
        document.getElementById("photo").value = "";
        document.getElementById("remark").value = "";
    };

    // --- UPDATE BUTTON: Only Sync Unsynced Data ---
    document.getElementById("syncBtn").onclick = async () => {
        const unsynced = barcodeData.filter(d => !d.synced);
        
        if (unsynced.length === 0) {
            return alert("Saara data pehle se hi synced hai!");
        }

        const btn = document.getElementById("syncBtn");
        btn.innerText = "Syncing...";
        btn.disabled = true;

        const success = await syncToSheet(unsynced);
        
        if (success) {
            // Update local status
            barcodeData.forEach(d => { if (!d.synced) d.synced = true; });
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateBarcodeTable();
            alert("Bacha hua data sync ho gaya!");
        } else {
            alert("Sync fail hua. Connection check karein.");
        }
        
        btn.innerText = "Update Google Sheet";
        btn.disabled = false;
    };

    // --- TABLE LOGIC ---
    function updateBarcodeTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            const statusColor = e.synced ? "green" : "red";
            const statusText = e.synced ? "Synced" : "Pending";
            
            row.innerHTML = `
                <td>${e.module}</td>
                <td>${e.image}</td>
                <td>${e.remark}</td>
                <td style="color:${statusColor}; font-weight:bold;">${statusText}</td>
                <td><button onclick="deleteRow(${i})" style="background:red;color:white;width:auto;padding:2px 8px;">X</button></td>
            `;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        if(confirm("Kya aap ise delete karna chahte hain?")) {
            barcodeData.splice(i, 1);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateBarcodeTable();
        }
    };

    // --- OTHER BUTTONS ---
    document.getElementById("retryBtn").onclick = async () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("startScan").click();
    };

    updateBarcodeTable();
});
