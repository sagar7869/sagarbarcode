const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    
    let isFlashOn = false;
    let activeScanner = null;

    // --- Tab Switching ---
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");
    
    tabs.forEach(tab => {
        tab.onclick = async () => {
            const target = tab.getAttribute("data-tab");
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));
            document.getElementById(target).style.display = "block";
            tab.classList.add("activeTab");
            
            await stopAllScanners();
        };
    });

    function playBeep() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } catch (e) { console.log(e); }
    }

    // ==========================================
    // UI OVERLAY CONTROLS (Flash, Zoom, Close)
    // ==========================================
    const scannerOverlay = document.getElementById("scannerOverlay");

    function openOverlay(scannerInstance) {
        activeScanner = scannerInstance;
        scannerOverlay.classList.remove("hidden");
        document.getElementById("zoomSlider").value = 1;
        isFlashOn = false;
        updateFlashUI();
    }

    async function closeOverlay() {
        scannerOverlay.classList.add("hidden");
        await stopAllScanners();
    }

    async function stopAllScanners() {
        try {
            if (barcodeScanner && barcodeScanner.isScanning) await barcodeScanner.stop();
            if (qrScanner && qrScanner.isScanning) await qrScanner.stop();
        } catch (e) { console.log(e); }
        activeScanner = null;
    }

    function updateFlashUI() {
        const flashBtn = document.getElementById("flashToggleBtn");
        const flashText = document.getElementById("flashText");
        if (isFlashOn) {
            flashBtn.classList.add("active-flash");
            flashText.innerText = "Flash ON";
        } else {
            flashBtn.classList.remove("active-flash");
            flashText.innerText = "Flashlight";
        }
    }

    // Back button on overlay
    document.getElementById("closeScannerBtn").onclick = async () => {
        await closeOverlay();
    };

    // Zoom Slider functionality
    document.getElementById("zoomSlider").addEventListener("input", async (e) => {
        let zoomVal = parseFloat(e.target.value);
        if (activeScanner && activeScanner.isScanning) {
            try {
                await activeScanner.applyVideoConstraints({ advanced: [{ zoom: zoomVal }] });
            } catch (err) { console.log("Zoom not supported", err); }
        }
    });

    // Flashlight Toggle functionality
    document.getElementById("flashToggleBtn").onclick = async () => {
        if (!activeScanner || !activeScanner.isScanning) return;
        isFlashOn = !isFlashOn;
        try {
            await activeScanner.applyVideoConstraints({ advanced: [{ torch: isFlashOn }] });
            updateFlashUI();
        } catch (e) {
            isFlashOn = false;
            updateFlashUI();
            alert("Flashlight not supported on this device.");
        }
    };


    // ==========================================
    // 1. BARCODE SCANNER LOGIC
    // ==========================================
    const entryFields = document.getElementById("entryFields");

    document.getElementById("startScan").onclick = async () => {
        if (!barcodeScanner) {
            barcodeScanner = new Html5Qrcode("reader");
        }

        openOverlay(barcodeScanner);

        try {
            await barcodeScanner.start(
                { facingMode: "environment" },
                { fps: 20, qrbox: null },
                async (decodedText) => {
                    if (!decodedText || decodedText.trim() === "") return;
                    playBeep();
                    
                    await closeOverlay();
                    
                    entryFields.style.display = "block";
                    document.getElementById("barcode").value = decodedText;
                    document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                },
                (errorMessage) => {}
            );
        } catch (err) {
            alert("Barcode Camera Error: " + err);
            await closeOverlay();
        }
    };


    // ==========================================
    // 2. QR CODE SCANNER LOGIC
    // ==========================================
    document.getElementById("startQR").onclick = async () => {
        if (!qrScanner) {
            qrScanner = new Html5Qrcode("qr-reader");
        }

        openOverlay(qrScanner);

        try {
            await qrScanner.start(
                { facingMode: "environment" },
                { fps: 20, qrbox: null },
                async (decodedText) => {
                    if (!decodedText || decodedText.trim() === "") return;
                    playBeep();
                    
                    await closeOverlay();
                    
                    document.getElementById("qrField").value = decodedText;
                    qrDataList.push({ data: decodedText, time: new Date().toLocaleString('en-GB') });
                    localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
                    alert("QR Scanned Successfully!");
                },
                (errorMessage) => {}
            );
        } catch (err) {
            alert("QR Camera Error: " + err);
            await closeOverlay();
        }
    };


    // ==========================================
    // 3. TABLE UPDATE & SUBMIT LOGIC
    // ==========================================
    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td style="color:${e.synced ? 'green' : 'red'}; font-weight:bold;">${e.synced ? 'Synced' : 'Pending'}</td><td><button onclick="deleteRow(${i})" style="background:red; color:white; width:auto; padding:2px 8px;">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    document.getElementById("submitBtn").onclick = () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: document.getElementById("datetime").value,
            synced: false
        };
        if (!entry.module) return alert("Pehle Scan karein!");
        
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
        
        document.getElementById("barcode").value = "";
        document.getElementById("photo").value = "";
        document.getElementById("remark").value = "";
        entryFields.style.display = "none";
    };

    window.deleteRow = (i) => {
        if (confirm("Delete this entry?")) {
            barcodeData.splice(i, 1);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }
    };

    updateTable();


    // ==========================================
    // 4. COPY & EXPORT CSV (Barcode)
    // ==========================================
    document.getElementById("copyBtn").onclick = () => {
        if (barcodeData.length === 0) return alert("No data to copy!");
        let text = "Serial\tPhoto\tRemark\tDate & Time\tStatus\n";
        barcodeData.forEach(e => {
            text += `${e.module}\t${e.image}\t${e.remark}\t${e.datetime}\t${e.synced ? "Synced" : "Pending"}\n`;
        });
        navigator.clipboard.writeText(text)
            .then(() => alert("Barcode Data Copied to Clipboard!"))
            .catch(err => alert("Copy failed: " + err));
    };

    document.getElementById("exportBtn").onclick = () => {
        if (barcodeData.length === 0) return alert("No data to export!");
        let csv = "Serial,Photo,Remark,Date & Time,Status\n";
        barcodeData.forEach(e => {
            csv += `"${e.module}","${e.image}","${e.remark}","${e.datetime}","${e.synced ? 'Synced' : 'Pending'}"\n`;
        });
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "SagarBarcode_Data.csv";
        a.click();
        URL.revokeObjectURL(url);
    };


    // ==========================================
    // 5. GOOGLE SHEET SYNC LOGIC
    // ==========================================
    document.getElementById("syncBtn").onclick = async () => {
        const unsyncedData = barcodeData.filter(e => !e.synced);
        
        if (unsyncedData.length === 0) {
            return alert("Saara data pehle se hi synced hai!");
        }

        const btn = document.getElementById("syncBtn");
        btn.innerText = "Syncing... Please wait";
        btn.style.background = "#546e7a";
        btn.disabled = true;

        try {
            const response = await fetch(WEBAPP_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(unsyncedData)
            });

            barcodeData.forEach(e => e.synced = true);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
            
            alert("Data Google Sheet mein update ho gaya!");
        } catch (error) {
            alert("Sync Error: " + error.message);
        } finally {
            btn.innerText = "Update Google Sheet";
            btn.style.background = "#ff9800";
            btn.disabled = false;
        }
    };


    // ==========================================
    // 6. COPY & EXPORT CSV (QR)
    // ==========================================
    document.getElementById("copyQR").onclick = () => {
        if (qrDataList.length === 0) return alert("No QR data to copy!");
        let text = "QR Data\tDate & Time\n";
        qrDataList.forEach(e => {
            text += `${e.data}\t${e.time}\n`;
        });
        navigator.clipboard.writeText(text)
            .then(() => alert("QR Data Copied!"))
            .catch(err => alert("Copy failed: " + err));
    };

    document.getElementById("exportQR").onclick = () => {
        if (qrDataList.length === 0) return alert("No QR data to export!");
        let csv = "QR Data,Date & Time\n";
        qrDataList.forEach(e => {
            csv += `"${e.data}","${e.time}"\n`;
        });
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "SagarQR_Data.csv";
        a.click();
        URL.revokeObjectURL(url);
    };
});
