const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let audioCtx = null;
    
    // Naye HD Camera ke variables
    let nativeVideoStream = null;
    let videoTrack = null;
    let detectionInterval = null;
    let isFlashOn = false;

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
    // UI OVERLAY & HD CAMERA DISPLAY CONTROLS
    // ==========================================
    const scannerOverlay = document.getElementById("scannerOverlay");

    function openOverlay(camElementId) {
        const camElem = document.getElementById(camElementId);
        camElem.style.display = "block";
        camElem.classList.add("full-view");
        
        // Asli video element inject karna
        camElem.innerHTML = '<video id="camVideo" autoplay playsinline></video>';

        scannerOverlay.classList.remove("hidden");
        document.getElementById("zoomSlider").value = 1;
        isFlashOn = false;
        updateFlashUI();
        
        return document.getElementById("camVideo");
    }

    async function closeOverlay() {
        scannerOverlay.classList.add("hidden");
        await stopAllScanners();
    }

    async function stopAllScanners() {
        if (detectionInterval) {
            clearInterval(detectionInterval);
            detectionInterval = null;
        }
        if (nativeVideoStream) {
            nativeVideoStream.getTracks().forEach(t => t.stop());
            nativeVideoStream = null;
            videoTrack = null;
        }
        
        const reader = document.getElementById("reader");
        const qrReader = document.getElementById("qr-reader");
        if(reader) { reader.style.display = "none"; reader.innerHTML = ""; reader.classList.remove("full-view"); }
        if(qrReader) { qrReader.style.display = "none"; qrReader.innerHTML = ""; qrReader.classList.remove("full-view"); }
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

    document.getElementById("closeScannerBtn").onclick = async () => {
        await closeOverlay();
    };

    // Naye Native Camera ka Zoom
    document.getElementById("zoomSlider").addEventListener("input", async (e) => {
        let zoomVal = parseFloat(e.target.value);
        if (videoTrack) {
            try {
                await videoTrack.applyConstraints({ advanced: [{ zoom: zoomVal }] });
            } catch (err) { console.log("Zoom not supported", err); }
        }
    });

    // Naye Native Camera ka Flash
    document.getElementById("flashToggleBtn").onclick = async () => {
        if (!videoTrack) return;
        isFlashOn = !isFlashOn;
        try {
            await videoTrack.applyConstraints({ advanced: [{ torch: isFlashOn }] });
            updateFlashUI();
        } catch (e) {
            isFlashOn = false;
            updateFlashUI();
            alert("Flashlight not supported on this device's camera.");
        }
    };


    // ==========================================
    // 1. BARCODE SCANNER LOGIC (Native HD API)
    // ==========================================
    const entryFields = document.getElementById("entryFields");

    document.getElementById("startScan").onclick = async () => {
        if (!('BarcodeDetector' in window)) {
            alert("Aapka browser Native HD Barcode API support nahi karta. Please update Chrome.");
            return;
        }

        const videoElem = openOverlay("reader");

        try {
            // Camera ko HD (1080p) aur Auto-Focus par force karna
            nativeVideoStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: "environment", 
                    width: { ideal: 1920 }, 
                    height: { ideal: 1080 }, 
                    advanced: [{ focusMode: "continuous" }] 
                }
            });
            videoElem.srcObject = nativeVideoStream;
            videoTrack = nativeVideoStream.getVideoTracks()[0];

            // Sirf in formats ko allow karna taaki galat guess na kare
            const barcodeDetector = new BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13'] });

            detectionInterval = setInterval(async () => {
                try {
                    const barcodes = await barcodeDetector.detect(videoElem);
                    if (barcodes.length > 0 && barcodes[0].rawValue.trim() !== "") {
                        playBeep();
                        await closeOverlay();
                        
                        entryFields.style.display = "block";
                        document.getElementById("barcode").value = barcodes[0].rawValue;
                        document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                    }
                } catch (e) {}
            }, 150);

        } catch (err) {
            alert("Barcode Camera Error: " + err);
            await closeOverlay();
        }
    };


    // ==========================================
    // 2. QR CODE SCANNER LOGIC (Native HD API)
    // ==========================================
    document.getElementById("startQR").onclick = async () => {
        if (!('BarcodeDetector' in window)) {
            alert("Aapka browser Native HD Barcode API support nahi karta. Please update Chrome.");
            return;
        }

        const videoElem = openOverlay("qr-reader");

        try {
            nativeVideoStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: "environment", 
                    width: { ideal: 1920 }, 
                    height: { ideal: 1080 }, 
                    advanced: [{ focusMode: "continuous" }] 
                }
            });
            videoElem.srcObject = nativeVideoStream;
            videoTrack = nativeVideoStream.getVideoTracks()[0];

            // Sirf QR code format allow karna
            const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });

            detectionInterval = setInterval(async () => {
                try {
                    const barcodes = await barcodeDetector.detect(videoElem);
                    if (barcodes.length > 0 && barcodes[0].rawValue.trim() !== "") {
                        playBeep();
                        await closeOverlay();
                        
                        let code = barcodes[0].rawValue;
                        document.getElementById("qrField").value = code;
                        qrDataList = [];
                        qrDataList.push({ data: code, time: new Date().toLocaleString('en-GB') });
                        localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
                        alert("QR Scanned Successfully!");
                    }
                } catch (e) {}
            }, 150);

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
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Delete</th></tr>";
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
        navigator.clipboard.writeText(text).then(() => alert("Copied!")).catch(err => alert("Failed: " + err));
    };

    document.getElementById("exportBtn").onclick = () => {
        if (barcodeData.length === 0) return alert("No data to export!");
        let csv = "Serial,Photo,Remark,Date & Time,Status\n";
        barcodeData.forEach(e => {
            csv += `"${e.module}","${e.image}","${e.remark}","${e.datetime}","${e.synced ? 'Synced' : 'Pending'}"\n`;
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = "SagarBarcode_Data.csv";
        a.click();
    };

    // ==========================================
    // 5. GOOGLE SHEET SYNC LOGIC 
    // ==========================================
    document.getElementById("syncBtn").onclick = async () => {
        const unsyncedData = barcodeData.filter(e => !e.synced);
        if (unsyncedData.length === 0) return alert("Saara data pehle se hi synced hai!");

        const btn = document.getElementById("syncBtn");
        btn.innerText = "Syncing...";
        btn.disabled = true;

        try {
            await fetch(WEBAPP_URL, {
                method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" },
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
            btn.disabled = false;
        }
    };

    // ==========================================
    // 6. COPY & EXPORT CSV (QR) 
    // ==========================================
        // ==========================================
    // 6. COPY & EXPORT CSV (QR) 
    // ==========================================
    document.getElementById("copyQR").onclick = () => {
        if (qrDataList.length === 0) return alert("No QR data to copy!");
        let text = "QR Data\tDate & Time\n";
        qrDataList.forEach(e => text += `${e.data}\t${e.time}\n`);
        
        navigator.clipboard.writeText(text)
            .then(() => alert("Copied!"))
            .catch(err => alert("Failed: " + err));
    };
    
    document.getElementById("exportQR").onclick = () => {
        if (qrDataList.length === 0) return alert("No QR data to export!");
        let csv = "QR Data,Date & Time\n";
        qrDataList.forEach(e => csv += `"${e.data}","${e.time}"\n`);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = "SagarQR_Data.csv";
        a.click();
    };

    // ==========================================
    // 7. WHATSAPP SHARE LOGIC
    // ==========================================
    
    // Barcode WhatsApp Share
    const shareWaBtn = document.getElementById("shareWaBtn");
    if(shareWaBtn) {
        shareWaBtn.onclick = async () => {
            if (barcodeData.length === 0) return alert("Bhai, share karne ke liye koi data nahi hai!");
            
            let csv = "Serial,Photo,Remark,Date & Time,Status\n";
            barcodeData.forEach(e => {
                csv += `"${e.module}","${e.image}","${e.remark}","${e.datetime}","${e.synced ? 'Synced' : 'Pending'}"\n`;
            });

            const file = new File([csv], "SagarBarcode_Data.csv", { type: "text/csv" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'SagarBarcode Data',
                        text: 'Scanned Barcode Data ki Excel (CSV) file.'
                    });
                } catch (err) {
                    console.log("Share cancel ho gaya:", err);
                }
            } else {
                let textData = "Scanned Barcodes:\n\n";
                barcodeData.forEach(e => textData += `${e.module} (Photo: ${e.image})\n`);
                let waUrl = `https://wa.me/?text=${encodeURIComponent(textData)}`;
                window.open(waUrl, '_blank');
            }
        };
    }

    // QR WhatsApp Share
    const shareWaQRBtn = document.getElementById("shareWaQRBtn");
    if(shareWaQRBtn) {
        shareWaQRBtn.onclick = async () => {
            if (qrDataList.length === 0) return alert("Share karne ke liye koi QR data nahi hai!");
            
            let csv = "QR Data,Date & Time\n";
            qrDataList.forEach(e => csv += `"${e.data}","${e.time}"\n`);

            const file = new File([csv], "SagarQR_Data.csv", { type: "text/csv" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Sagar QR Data',
                        text: 'Scanned QR Data ki file.'
                    });
                } catch (err) {
                    console.log("Share error:", err);
                }
            } else {
                let textData = "Scanned QR Codes:\n\n";
                qrDataList.forEach(e => textData += `${e.data}\n`);
                let waUrl = `https://wa.me/?text=${encodeURIComponent(textData)}`;
                window.open(waUrl, '_blank');
            }
        };
    }
});
