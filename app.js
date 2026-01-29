const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- Tab Switching & Force Stop ---
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");
    tabs.forEach(tab => {
        tab.addEventListener("click", async () => {
            const target = tab.getAttribute("data-tab");
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));
            document.getElementById(target).style.display = "block";
            tab.classList.add("activeTab");
            
            // Tab badalte hi camera ko 100% release karna
            if (barcodeScanner && barcodeScanner.isScanning) {
                await barcodeScanner.stop().catch(() => {});
                document.getElementById("reader").style.display = "none";
            }
            if (qrScanner && qrScanner.isScanning) {
                await qrScanner.stop().catch(() => {});
                document.getElementById("qr-reader").style.display = "none";
            }
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

    // --- BARCODE (Full Screen Back Camera) ---
    document.getElementById("startScan").onclick = () => {
        const readerDiv = document.getElementById("reader");
        readerDiv.style.display = "block";
        
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");

        // Force Back Camera & High Resolution
        const config = { 
            fps: 25, 
            qrbox: { width: 320, height: 180 },
            // Video area ko fill karne ke liye ye settings zaruri hain
            videoConstraints: {
                facingMode: { exact: "environment" }, // 100% Back Camera Only
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        barcodeScanner.start({ facingMode: "environment" }, config, (code) => {
            if (isProcessing) return;
            isProcessing = true;
            playBeep();
            barcodeScanner.stop().then(() => {
                readerDiv.style.display = "none";
                document.getElementById("entryFields").style.display = "block";
                document.getElementById("barcode").value = code;
                document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                isProcessing = false;
            });
        }).catch(err => {
            // Agar 'exact' environment fail ho (kuch browsers mein), toh normal try karein
            barcodeScanner.start({ facingMode: "environment" }, config, (code) => { /* same logic */ });
        });
    };

    // --- QR (Full Screen Back Camera) ---
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

    // Stop Buttons
    document.getElementById("stopScan").onclick = async () => {
        if (barcodeScanner && barcodeScanner.isScanning) {
            await barcodeScanner.stop();
            document.getElementById("reader").style.display = "none";
        }
    };
    document.getElementById("stopQR").onclick = async () => {
        if (qrScanner && qrScanner.isScanning) {
            await qrScanner.stop();
            document.getElementById("qr-reader").style.display = "none";
        }
    };

    // Retry Button
    document.getElementById("retryBtn").onclick = () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("startScan").click();
    };

    // --- Data Handling (Sync, Table etc. as it is) ---
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
    }

    window.deleteRow = (i) => {
        if (confirm("Delete?")) { barcodeData.splice(i, 1); localStorage.setItem("barcodeData", JSON.stringify(barcodeData)); updateTable(); }
    };
    updateTable();
});
