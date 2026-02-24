const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;
    
    // Flash aur Zoom states
    let isFlashOn = false;
    let currentZoom = 1;

    // --- Tab Switching ---
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");
    tabs.forEach(tab => {
        tab.addEventListener("click", async () => {
            const target = tab.getAttribute("data-tab");
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));
            document.getElementById(target).style.display = "block";
            tab.classList.add("activeTab");
            
            if (barcodeScanner && barcodeScanner.isScanning) await stopBarcodeScanner();
            if (qrScanner && qrScanner.isScanning) await stopQRScanner();
        });
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

    // --- FLASH & ZOOM LOGIC (Common Function) ---
    async function toggleFlash(scanner, btnId) {
        if (!scanner || !scanner.isScanning) return;
        isFlashOn = !isFlashOn;
        try {
            await scanner.applyVideoConstraints({ advanced: [{ torch: isFlashOn }] });
            document.getElementById(btnId).innerText = isFlashOn ? "Flash ON" : "Flash Off";
        } catch (e) { alert("Flash not supported on this device"); }
    }

    async function toggleZoom(scanner, btnId) {
        if (!scanner || !scanner.isScanning) return;
        currentZoom = (currentZoom === 1) ? 2 : 1;
        try {
            await scanner.applyVideoConstraints({ advanced: [{ zoom: currentZoom }] });
            document.getElementById(btnId).innerText = "Zoom " + currentZoom + "x";
        } catch (e) { alert("Zoom not supported"); }
    }

    // --- BARCODE SECTION ---
    document.getElementById("startScan").onclick = () => {
        const readerElem = document.getElementById("reader");
        const stopBtn = document.getElementById("stopScan");
        
        readerElem.style.display = "block";
        readerElem.classList.add("full-view");
        stopBtn.classList.add("floating-btn");
        document.body.style.overflow = "hidden";

        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        
        barcodeScanner.start({ facingMode: "environment" }, { fps: 30, qrbox: null }, (code) => {
            if (isProcessing) return;
            isProcessing = true;
            playBeep();
            stopBarcodeScanner(code);
        });
    };

    async function stopBarcodeScanner(code = null) {
        if (barcodeScanner && barcodeScanner.isScanning) {
            await barcodeScanner.stop();
            const readerElem = document.getElementById("reader");
            readerElem.classList.remove("full-view");
            document.getElementById("stopScan").classList.remove("floating-btn");
            readerElem.style.display = "none";
            document.body.style.overflow = "auto";
            
            // Flash/Zoom UI reset
            isFlashOn = false;
            currentZoom = 1;
            document.getElementById("torchBtn").innerText = "Flash Off";
            document.getElementById("zoomBtn").innerText = "Zoom 1x";

            if (code) {
                document.getElementById("entryFields").style.display = "block";
                document.getElementById("barcode").value = code;
                document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
            }
            isProcessing = false;
        }
    }

    document.getElementById("stopScan").onclick = () => stopBarcodeScanner();
    document.getElementById("torchBtn").onclick = (e) => { e.stopPropagation(); toggleFlash(barcodeScanner, "torchBtn"); };
    document.getElementById("zoomBtn").onclick = (e) => { e.stopPropagation(); toggleZoom(barcodeScanner, "zoomBtn"); };

    // --- QR SECTION ---
    document.getElementById("startQR").onclick = () => {
        const qrElem = document.getElementById("qr-reader");
        const stopBtnQR = document.getElementById("stopQR");

        qrElem.style.display = "block";
        qrElem.classList.add("full-view");
        stopBtnQR.classList.add("floating-btn");

        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        
        qrScanner.start({ facingMode: "environment" }, { fps: 25, qrbox: null }, (code) => {
            playBeep();
            document.getElementById("qrField").value = code;
            qrDataList.push({ data: code, time: new Date().toLocaleString('en-GB') });
            localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
            stopQRScanner();
            alert("QR Scanned Successfully!");
        });
    };

    async function stopQRScanner() {
        if (qrScanner && qrScanner.isScanning) {
            await qrScanner.stop();
            const qrElem = document.getElementById("qr-reader");
            qrElem.classList.remove("full-view");
            document.getElementById("stopQR").classList.remove("floating-btn");
            qrElem.style.display = "none";
            
            // Reset Flash/Zoom for QR
            isFlashOn = false;
            currentZoom = 1;
            document.getElementById("torchBtnQR").innerText = "Flash Off";
            document.getElementById("zoomBtnQR").innerText = "Zoom 1x";
        }
    }

    document.getElementById("stopQR").onclick = () => stopQRScanner();
    document.getElementById("torchBtnQR").onclick = (e) => { e.stopPropagation(); toggleFlash(qrScanner, "torchBtnQR"); };
    document.getElementById("zoomBtnQR").onclick = (e) => { e.stopPropagation(); toggleZoom(qrScanner, "zoomBtnQR"); };

    // --- Baki ki Logic (Submit, Sync, Table) ---
    document.getElementById("submitBtn").onclick = async () => {
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

        const ok = await sendToGoogleSheet([entry]);
        if (ok) {
            barcodeData[barcodeData.length - 1].synced = true;
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }

        document.getElementById("entryFields").style.display = "none";
        document.getElementById("barcode").value = "";
        document.getElementById("photo").value = "";
        document.getElementById("remark").value = "";
    };

    async function send
