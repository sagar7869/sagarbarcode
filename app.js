const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;
    
    let isFlashOn = false;
    let currentZoom = 1;

    // --- Tab Switching Fix ---
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");
    
    tabs.forEach(tab => {
        tab.onclick = async () => {
            const target = tab.getAttribute("data-tab");
            
            // Sab section hide karo
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));
            
            // Target section dikhao
            document.getElementById(target).style.display = "block";
            tab.classList.add("activeTab");
            
            // Scanner band karo agar chal raha ho
            if (barcodeScanner && barcodeScanner.isScanning) await stopBarcodeScanner();
            if (qrScanner && qrScanner.isScanning) await stopQRScanner();
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

    // --- Start Scan Logic (Fix) ---
    document.getElementById("startScan").onclick = () => {
        const readerElem = document.getElementById("reader");
        const stopBtn = document.getElementById("stopScan");
        
        readerElem.style.display = "block";
        readerElem.classList.add("full-view");
        stopBtn.classList.add("floating-btn");
        document.body.style.overflow = "hidden";

        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        
        barcodeScanner.start(
            { facingMode: "environment" }, 
            { fps: 30, qrbox: null }, 
            (code) => {
                if (isProcessing) return;
                isProcessing = true;
                playBeep();
                stopBarcodeScanner(code);
            }
        ).catch(err => alert("Camera error: " + err));
    };

    async function stopBarcodeScanner(code = null) {
        if (barcodeScanner && barcodeScanner.isScanning) {
            await barcodeScanner.stop();
        }
        const readerElem = document.getElementById("reader");
        readerElem.classList.remove("full-view");
        document.getElementById("stopScan").classList.remove("floating-btn");
        readerElem.style.display = "none";
        document.body.style.overflow = "auto";
        
        isFlashOn = false;
        currentZoom = 1;
        if(document.getElementById("torchBtn")) document.getElementById("torchBtn").innerText = "Flash Off";
        if(document.getElementById("zoomBtn")) document.getElementById("zoomBtn").innerText = "Zoom 1x";

        if (code) {
            document.getElementById("entryFields").style.display = "block";
            document.getElementById("barcode").value = code;
            document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
        }
        isProcessing = false;
    }

    document.getElementById("stopScan").onclick = () => stopBarcodeScanner();

    // --- QR Section Fix ---
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
            alert("QR Scanned!");
        });
    };

    async function stopQRScanner() {
        if (qrScanner && qrScanner.isScanning) await qrScanner.stop();
        const qrElem = document.getElementById("qr-reader");
        qrElem.classList.remove("full-view");
        document.getElementById("stopQR").classList.remove("floating-btn");
        qrElem.style.display = "none";
    }

    document.getElementById("stopQR").onclick = () => stopQRScanner();

    // --- Flash & Zoom Logic ---
    document.getElementById("torchBtn").onclick = async (e) => {
        e.stopPropagation();
        if (!barcodeScanner || !barcodeScanner.isScanning) return;
        isFlashOn = !isFlashOn;
        try {
            await barcodeScanner.applyVideoConstraints({ advanced: [{ torch: isFlashOn }] });
            document.getElementById("torchBtn").innerText = isFlashOn ? "Flash ON" : "Flash Off";
        } catch (e) { alert("Flash not supported"); }
    };

    document.getElementById("zoomBtn").onclick = async (e) => {
        e.stopPropagation();
        if (!barcodeScanner || !barcodeScanner.isScanning) return;
        currentZoom = (currentZoom === 1) ? 2 : 1;
        try {
            await barcodeScanner.applyVideoConstraints({ advanced: [{ zoom: currentZoom }] });
            document.getElementById("zoomBtn").innerText = "Zoom " + currentZoom + "x";
        } catch (e) { alert("Zoom not supported"); }
    };

    // --- Table & Submit Logic (Restore) ---
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
        document.getElementById("entryFields").style.display = "none";
    };

    window.deleteRow = (i) => {
        if (confirm("Delete?")) {
            barcodeData.splice(i, 1);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }
    };

    updateTable();
});
