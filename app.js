const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let audioCtx = null;
    
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

    const scannerOverlay = document.getElementById("scannerOverlay");

    function openOverlay(camElementId) {
        const camElem = document.getElementById(camElementId);
        camElem.style.display = "block";
        camElem.classList.add("full-view");
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

    const closeBtn = document.getElementById("closeScannerBtn");
    if (closeBtn) {
        closeBtn.onclick = async () => {
            await closeOverlay();
        };
    }

    const zoomSlider = document.getElementById("zoomSlider");
    if (zoomSlider) {
        zoomSlider.addEventListener("input", async (e) => {
            let zoomVal = parseFloat(e.target.value);
            if (videoTrack) {
                try {
                    await videoTrack.applyConstraints({ advanced: [{ zoom: zoomVal }] });
                } catch (err) { console.log("Zoom not supported", err); }
            }
        });
    }

    const flashToggleBtn = document.getElementById("flashToggleBtn");
    if (flashToggleBtn) {
        flashToggleBtn.onclick = async () => {
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
    }

    // ==========================================
    // 1. BARCODE SCANNER LOGIC (Safe & Working)
    // ==========================================
    const entryFields = document.getElementById("entryFields");
    const startScanBtn = document.getElementById("startScan");

    if (startScanBtn) {
        startScanBtn.onclick = async () => {
            const videoElem = openOverlay("reader");

            try {
                nativeVideoStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: "environment", 
                        width: { ideal: 1920 }, 
                        height: { ideal: 1080 } 
                    }
                });
                videoElem.srcObject = nativeVideoStream;
                videoTrack = nativeVideoStream.getVideoTracks()[0];

                let barcodeDetector = null;
                if ('BarcodeDetector' in window) {
                    try {
                        barcodeDetector = new BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13'] });
                    } catch (e) { barcodeDetector = null; }
                }

                detectionInterval = setInterval(async () => {
                    if (!videoElem || videoElem.readyState < 2) return;

                    let scannedVal = "";
                    if (barcodeDetector) {
                        try {
                            const barcodes = await barcodeDetector.detect(videoElem);
                            if (barcodes.length > 0 && barcodes[0].rawValue) {
                                scannedVal = barcodes[0].rawValue.trim();
                            }
                        } catch (err) {}
                    }

                    if (scannedVal !== "") {
                        // DUPLICATE CHECK
                        let isAlreadyExist = barcodeData.some(item => item.module.trim() === scannedVal);
                        
                        playBeep();
                        await closeOverlay();

                        if (isAlreadyExist) {
                            alert(`⚠️ Duplicate Warning! Barcode "${scannedVal}" pehle se table mein maujood hai.`);
                            return;
                        }
                        
                        entryFields.style.display = "block";
                        document.getElementById("barcode").value = scannedVal;
                        document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                    }
                }, 200);

            } catch (err) {
                alert("Barcode Camera Error: " + err.message);
                await closeOverlay();
            }
        };
    }

    // ==========================================
    // 2. QR CODE SCANNER LOGIC 
    // ==========================================
    const startQRBtn = document.getElementById("startQR");
    if (startQRBtn) {
        startQRBtn.onclick = async () => {
            const videoElem = openOverlay("qr-reader");

            try {
                nativeVideoStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
                });
                videoElem.srcObject = nativeVideoStream;
                videoTrack = nativeVideoStream.getVideoTracks()[0];

                let barcodeDetector = null;
                if ('BarcodeDetector' in window) {
                    try {
                        barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
                    } catch (e) { barcodeDetector = null; }
                }

                detectionInterval = setInterval(async () => {
                    if (!videoElem || videoElem.readyState < 2) return;
                    let code = "";

                    if (barcodeDetector) {
                        try {
                            const barcodes = await barcodeDetector.detect(videoElem);
                            if (barcodes.length > 0 && barcodes[0].rawValue) {
                                code = barcodes[0].rawValue.trim();
                            }
                        } catch (err) {}
                    }

                    if (code !== "") {
                        playBeep();
                        await closeOverlay();
                        
                        document.getElementById("qrField").value = code;
                        qrDataList = [];
                        qrDataList.push({ data: code, time: new Date().toLocaleString('en-GB') });
                        localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
                        alert("QR Scanned Successfully!");
                    }
                }, 200);

            } catch (err) {
                alert("QR Camera Error: " + err.message);
                await closeOverlay();
            }
        };
    }

    // ==========================================
    // 3. TABLE UPDATE & SUBMIT LOGIC 
    // ==========================================
    function updateTable() {
        const table = document.getElementById("table");
        if (!table) return;
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Delete</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td style="color:${e.synced ? 'green' : 'red'}; font-weight:bold;">${e.synced ? 'Synced' : 'Pending'}</td><td><button onclick="deleteRow(${i})" style="background:red; color:white; width:auto; padding:2px 8px;">X</button></td>`;
        });
        const totalCountElem = document.getElementById("totalCount");
        if (totalCountElem) totalCountElem.innerText = barcodeData.length;
    }

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
        submitBtn.onclick = () => {
            const moduleVal = document.getElementById("barcode").value.trim();
            if (!moduleVal) return alert("Pehle Scan karein!");

            if (barcodeData.some(item => item.module.trim() === moduleVal)) {
                alert("⚠️ Yeh Barcode pehle se table mein available hai!");
                return;
            }

            const entry = {
                module: moduleVal,
                image: document.getElementById("photo").value,
                remark: document.getElementById("remark").value,
                datetime: document.getElementById("datetime").value,
                synced: false
            };
            
            barcodeData.push(entry);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
            
            document.getElementById("barcode").value = "";
            document.getElementById("photo").value = "";
            document.getElementById("remark").value = "";
            entryFields.style.display = "none";
        };
    }

    window.deleteRow = (i) => {
        if (confirm("Delete this entry?")) {
            barcodeData.splice(i, 1);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }
    };

    updateTable();

    // ==========================================
    // 3.1 CLEAR ALL BUTTONS
    // ==========================================
    const clearAllBtn = document.getElementById("clearAllBtn");
    if (clearAllBtn) {
        clearAllBtn.onclick = () => {
            if (barcodeData.length === 0) return alert("Pehle se hi table empty hai!");
            if (confirm("Kya aap poora Barcode Table aur Local Storage clear karna chahte hain?")) {
                barcodeData = [];
                localStorage.removeItem("barcodeData");
                updateTable();
                alert("Barcode data successfully clear ho gaya!");
            }
        };
    }

    const clearQRBtn = document.getElementById("clearQRBtn");
    if (clearQRBtn) {
        clearQRBtn.onclick = () => {
            if (qrDataList.length === 0 && !document.getElementById("qrField").value) {
                return alert("Pehle se hi QR data empty hai!");
            }
            if (confirm("Kya aap QR Code Data aur Local Storage clear karna chahte hain?")) {
                qrDataList = [];
                localStorage.removeItem("qrDataList");
                const qrField = document.getElementById("qrField");
                if (qrField) qrField.value = "";
                alert("QR data successfully clear ho gaya!");
            }
        };
    }

    // ==========================================
    // 4. COPY & EXPORT CSV (Barcode) 
    // ==========================================
    const copyBtn = document.getElementById("copyBtn");
    if (copyBtn) {
        copyBtn.onclick = () => {
            if (barcodeData.length === 0) return alert("No data to copy!");
            let text = "Serial\tPhoto\tRemark\tDate & Time\tStatus\n";
            barcodeData.forEach(e => {
                text += `${e.module}\t${e.image}\t${e.remark}\t${e.datetime}\t${e.synced ? "Synced" : "Pending"}\n`;
            });
            navigator.clipboard.writeText(text).then(() => alert("Copied!")).catch(err => alert("Failed: " + err));
        };
    }

    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
        exportBtn.onclick = () => {
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
    }

    // ==========================================
    // 5. GOOGLE SHEET SYNC LOGIC 
    // ==========================================
    const syncBtn = document.getElementById("syncBtn");
    if (syncBtn) {
        syncBtn.onclick = async () => {
            const unsyncedData = barcodeData.filter(e => !e.synced);
            if (unsyncedData.length === 0) return alert("Saara data pehle se hi synced hai!");

            syncBtn.innerText = "Syncing...";
            syncBtn.disabled = true;

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
                syncBtn.innerText = "Update Google Sheet";
                syncBtn.disabled = false;
            }
        };
    }

    // ==========================================
    // 6. COPY & EXPORT CSV (QR) 
    // ==========================================
    const copyQR = document.getElementById("copyQR");
    if (copyQR) {
        copyQR.onclick = () => {
            if (qrDataList.length === 0) return alert("No QR data to copy!");
            let text = "QR Data\tDate & Time\n";
            qrDataList.forEach(e => text += `${e.data}\t${e.time}\n`);
            navigator.clipboard.writeText(text).then(() => alert("Copied!")).catch(err => alert("Failed: " + err));
        };
    }
    
    const exportQR = document.getElementById("exportQR");
    if (exportQR) {
        exportQR.onclick = () => {
            if (qrDataList.length === 0) return alert("No QR data to export!");
            let csv = "QR Data,Date & Time\n";
            qrDataList.forEach(e => csv += `"${e.data}","${e.time}"\n`);
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
            a.download = "SagarQR_Data.csv";
            a.click();
        };
    }

    // ==========================================
    // 7. WHATSAPP SHARE LOGIC
    // ==========================================
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
                    await navigator.share({ files: [file], title: 'SagarBarcode Data', text: 'Scanned Barcode Data file.' });
                } catch (err) {}
            } else {
                let textData = "Scanned Barcodes:\n\n";
                barcodeData.forEach(e => textData += `${e.module}\n`);
                window.open(`https://wa.me/?text=${encodeURIComponent(textData)}`, '_blank');
            }
        };
    }

    const shareWaQRBtn = document.getElementById("shareWaQRBtn");
    if(shareWaQRBtn) {
        shareWaQRBtn.onclick = async () => {
            if (qrDataList.length === 0) return alert("Share karne ke liye koi QR data nahi hai!");
            let csv = "QR Data,Date & Time\n";
            qrDataList.forEach(e => csv += `"${e.data}","${e.time}"\n`);
            const file = new File([csv], "SagarQR_Data.csv", { type: "text/csv" });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: 'Sagar QR Data', text: 'Scanned QR Data file.' });
                } catch (err) {}
            } else {
                let textData = "Scanned QR Codes:\n\n";
                qrDataList.forEach(e => textData += `${e.data}\n`);
                window.open(`https://wa.me/?text=${encodeURIComponent(textData)}`, '_blank');
            }
        };
    }
});
