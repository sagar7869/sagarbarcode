const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    
    let isFlashOn = false;
    let currentZoom = 1;

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
            
            if (barcodeScanner && barcodeScanner.isScanning) await barcodeScanner.stop();
            if (qrScanner && qrScanner.isScanning) await qrScanner.stop();
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
    // 1. BARCODE SECTION (Dedicated Independent Logic)
    // ==========================================
    const readerElem = document.getElementById("reader");
    const stopScanBtn = document.getElementById("stopScan");
    const entryFields = document.getElementById("entryFields");

    document.getElementById("startScan").onclick = async () => {
        readerElem.style.display = "block";
        readerElem.classList.add("full-view");
        stopScanBtn.classList.add("floating-btn");
        document.body.style.overflow = "hidden";

        if (!barcodeScanner) {
            barcodeScanner = new Html5Qrcode("reader");
        }

        try {
            await barcodeScanner.start(
                { facingMode: "environment" },
                { fps: 20, qrbox: null },
                (decodedText) => {
                    if (!decodedText || decodedText.trim() === "") return;
                    
                    playBeep();
                    
                    // Stop scanner immediately after successful scan
                    barcodeScanner.stop().then(() => {
                        readerElem.classList.remove("full-view");
                        stopScanBtn.classList.remove("floating-btn");
                        readerElem.style.display = "none";
                        document.body.style.overflow = "auto";
                        
                        // Open Entry Fields & Fill Data
                        entryFields.style.display = "block";
                        document.getElementById("barcode").value = decodedText;
                        document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                    }).catch(err => console.log(err));
                },
                (errorMessage) => {
                    // Scanning errors/frame misses ignore honge taaki camera band na ho
                }
            );
        } catch (err) {
            alert("Barcode Camera Error: " + err);
        }
    };

    stopScanBtn.onclick = async () => {
        if (barcodeScanner && barcodeScanner.isScanning) {
            await barcodeScanner.stop();
        }
        readerElem.classList.remove("full-view");
        stopScanBtn.classList.remove("floating-btn");
        readerElem.style.display = "none";
        document.body.style.overflow = "auto";
        
        isFlashOn = false;
        currentZoom = 1;
        document.getElementById("torchBtn").innerText = "Flash Off";
        document.getElementById("zoomBtn").innerText = "Zoom 1x";
    };

    // Barcode Flash Control
    document.getElementById("torchBtn").onclick = async (e) => {
        e.stopPropagation();
        if (!barcodeScanner || !barcodeScanner.isScanning) return;
        isFlashOn = !isFlashOn;
        try {
            await barcodeScanner.applyVideoConstraints({ advanced: [{ torch: isFlashOn }] });
            document.getElementById("torchBtn").innerText = isFlashOn ? "Flash ON" : "Flash Off";
        } catch (e) { alert("Flash not supported"); }
    };

    // Barcode Zoom Control
    document.getElementById("zoomBtn").onclick = async (e) => {
        e.stopPropagation();
        if (!barcodeScanner || !barcodeScanner.isScanning) return;
        currentZoom = (currentZoom === 1) ? 2 : 1;
        try {
            await barcodeScanner.applyVideoConstraints({ advanced: [{ zoom: currentZoom }] });
            document.getElementById("zoomBtn").innerText = "Zoom " + currentZoom + "x";
        } catch (e) { alert("Zoom not supported"); }
    };


    // ==========================================
    // 2. QR CODE SECTION (Dedicated Independent Logic)
    // ==========================================
    const qrElem = document.getElementById("qr-reader");
    const stopQRBtn = document.getElementById("stopQR");

    document.getElementById("startQR").onclick = async () => {
        qrElem.style.display = "block";
        qrElem.classList.add("full-view");
        stopQRBtn.classList.add("floating-btn");

        if (!qrScanner) {
            qrScanner = new Html5Qrcode("qr-reader");
        }

        try {
            await qrScanner.start(
                { facingMode: "environment" },
                { fps: 20, qrbox: null },
                (decodedText) => {
                    if (!decodedText || decodedText.trim() === "") return;
                    
                    playBeep();
                    
                    qrScanner.stop().then(() => {
                        qrElem.classList.remove("full-view");
                        stopQRBtn.classList.remove("floating-btn");
                        qrElem.style.display = "none";
                        
                        document.getElementById("qrField").value = decodedText;
                        qrDataList.push({ data: decodedText, time: new Date().toLocaleString('en-GB') });
                        localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
                        alert("QR Scanned Successfully!");
                    }).catch(err => console.log(err));
                },
                (errorMessage) => {}
            );
        } catch (err) {
            alert("QR Camera Error: " + err);
        }
    };

    stopQRBtn.onclick = async () => {
        if (qrScanner && qrScanner.isScanning) {
            await qrScanner.stop();
        }
        qrElem.classList.remove("full-view");
        stopQRBtn.classList.remove("floating-btn");
        qrElem.style.display = "none";
    };

    // QR Flash/Zoom Control
    document.getElementById("torchBtnQR").onclick = async (e) => {
        e.stopPropagation();
        if (!qrScanner || !qrScanner.isScanning) return;
        isFlashOn = !isFlashOn;
        try {
            await qrScanner.applyVideoConstraints({ advanced: [{ torch: isFlashOn }] });
            document.getElementById("torchBtnQR").innerText = isFlashOn ? "Flash ON" : "Flash Off";
        } catch (e) { alert("Flash not supported"); }
    };

    document.getElementById("zoomBtnQR").onclick = async (e) => {
        e.stopPropagation();
        if (!qrScanner || !qrScanner.isScanning) return;
        currentZoom = (currentZoom === 1) ? 2 : 1;
        try {
            await qrScanner.applyVideoConstraints({ advanced: [{ zoom: currentZoom }] });
            document.getElementById("zoomBtnQR").innerText = "Zoom " + currentZoom + "x";
        } catch (e) { alert("Zoom not supported"); }
    };


    // ==========================================
    // 3. TABLE UPDATE & SUBMIT LOGIC (Barcode Workflow)
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
        
        // Clear input fields and hide entry section
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
    // 4. COPY & EXPORT CSV (Barcode Section)
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
    // 6. COPY & EXPORT CSV (QR Section)
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
