const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- Tab Switching & Cleanup ---
    document.querySelectorAll(".tabBtn").forEach(tab => {
        tab.addEventListener("click", async () => {
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            document.getElementById(tab.getAttribute("data-tab")).style.display = "block";
            tab.classList.add("activeTab");
            
            // Tab switch par camera release karna
            if (barcodeScanner && barcodeScanner.isScanning) await barcodeScanner.stop();
            if (qrScanner && qrScanner.isScanning) await qrScanner.stop();
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
        } catch (e) {}
    }

    // --- BARCODE SECTION (Full Box View) ---
    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        
        // Config se aspectRatio hata diya taaki CSS fill kaam kar sake
        const barcodeConfig = { 
            fps: 25, 
            qrbox: { width: 300, height: 160 } 
        };

        barcodeScanner.start(
            { facingMode: "environment" }, // Back Camera
            barcodeConfig, 
            (code) => {
                if (isProcessing) return;
                isProcessing = true;
                playBeep();
                barcodeScanner.stop().then(() => {
                    document.getElementById("reader").style.display = "none";
                    document.getElementById("entryFields").style.display = "block";
                    document.getElementById("barcode").value = code;
                    document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                    isProcessing = false;
                });
            }
        ).catch(err => alert("Camera error: " + err));
    };

    // Retry Button Fix
    document.getElementById("retryBtn").onclick = () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("startScan").click();
    };

    document.getElementById("stopScan").onclick = async () => {
        if (barcodeScanner && barcodeScanner.isScanning) {
            await barcodeScanner.stop();
            document.getElementById("reader").style.display = "none";
        }
    };

    // --- QR SECTION (Full Box View) ---
    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        
        qrScanner.start(
            { facingMode: "environment" }, 
            { fps: 20, qrbox: 250 }, 
            (code) => {
                playBeep();
                document.getElementById("qrField").value = code;
                qrDataList.push({ data: code, time: new Date().toLocaleString('en-GB') });
                localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
                qrScanner.stop().then(() => {
                    document.getElementById("qr-reader").style.display = "none";
                });
            }
        );
    };

    document.getElementById("stopQR").onclick = async () => {
        if (qrScanner && qrScanner.isScanning) {
            await qrScanner.stop();
            document.getElementById("qr-reader").style.display = "none";
        }
    };

    // --- Data Management (Aapka logic same hai) ---
    document.getElementById("submitBtn").onclick = async () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: document.getElementById("datetime").value,
            synced: false
        };
        if (!entry.module) return alert("Scan karein!");
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
    };

    async function sendToGoogleSheet(itemsArray) {
        try {
            await fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({entries: itemsArray}) });
            return true;
        } catch (e) { return false; }
    }

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td style="color:${e.synced ? 'green' : 'red'};">${e.synced ? 'Synced' : 'Pending'}</td><td><button onclick="deleteRow(${i})">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        if (confirm("Delete?")) { barcodeData.splice(i, 1); localStorage.setItem("barcodeData", JSON.stringify(barcodeData)); updateTable(); }
    };
    updateTable();
});
