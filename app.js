const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- Tab Switching Logic ---
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");
    tabs.forEach(tab => {
        tab.addEventListener("click", async () => {
            const target = tab.getAttribute("data-tab");
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));
            document.getElementById(target).style.display = "block";
            tab.classList.add("activeTab");
            
            // Sab band karo jab tab badle
            await forceStopAll();
        });
    });

    async function forceStopAll() {
        if (barcodeScanner && barcodeScanner.isScanning) {
            await barcodeScanner.stop().catch(e => console.log(e));
        }
        if (qrScanner && qrScanner.isScanning) {
            await qrScanner.stop().catch(e => console.log(e));
        }
        document.getElementById("reader").style.display = "none";
        document.getElementById("qr-reader").style.display = "none";
    }

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

    // --- BARCODE SECTION ---
    document.getElementById("startScan").onclick = async () => {
        const readerDiv = document.getElementById("reader");
        readerDiv.style.display = "block";
        
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");

        // Fixed Config: Scan area focus ko improve kiya
        const config = { 
            fps: 15, 
            qrbox: { width: 250, height: 150 }, // Barcode hamesha rectangular hota hai
            aspectRatio: 1.0 
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
                document.getElementById("photo").focus();
                isProcessing = false;
            }).catch(() => { isProcessing = false; });
        }).catch(err => {
            alert("Camera Permission Error: " + err);
            readerDiv.style.display = "none";
        });
    };

    document.getElementById("stopScan").onclick = async () => {
        if (barcodeScanner) {
            await barcodeScanner.stop().catch(e => console.log("Stop failed", e));
            document.getElementById("reader").style.display = "none";
        }
    };

    // --- QR SECTION ---
    document.getElementById("startQR").onclick = async () => {
        const qrReaderDiv = document.getElementById("qr-reader");
        qrReaderDiv.style.display = "block";
        
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");

        qrScanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (code) => {
            playBeep();
            document.getElementById("qrField").value = code;
            qrDataList.push({ data: code, time: new Date().toLocaleString('en-GB') });
            localStorage.setItem("qrDataList", JSON.stringify(qrDataList));

            qrScanner.stop().then(() => {
                qrReaderDiv.style.display = "none";
                alert("QR Saved!");
            });
        }).catch(err => alert("QR Error: " + err));
    };

    document.getElementById("stopQR").onclick = async () => {
        if (qrScanner) {
            await qrScanner.stop().catch(e => console.log(e));
            document.getElementById("qr-reader").style.display = "none";
        }
    };

    // --- Point 3: CSV Fix (Quotes for safety) ---
    document.getElementById("exportBtn").onclick = () => {
        if (barcodeData.length === 0) return alert("No Data!");
        let csv = "Serial,Photo,Remark,DateTime\n";
        barcodeData.forEach(e => { 
            csv += `"${e.module}","${e.image}","${e.remark}","${e.datetime}"\n`; 
        });
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "Sagar_Barcode.csv";
        a.click();
    };

    // --- Table & Sync Logic (As it is) ---
    document.getElementById("submitBtn").onclick = async () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: document.getElementById("datetime").value,
            synced: false
        };
        if (!entry.module) return alert("Nothing to submit!");
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
        
        // Auto-sync attempt
        const ok = await sendToGoogleSheet([entry]);
        if (ok) {
            entry.synced = true;
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }
        document.getElementById("entryFields").style.display = "none";
    };

    async function sendToGoogleSheet(itemsArray) {
        try {
            await fetch(WEBAPP_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify({ entries: itemsArray })
            });
            return true;
        } catch (e) { return false; }
    }

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td style="color:${e.synced ? 'green' : 'red'};">${e.synced ? 'OK' : '..'}</td><td><button onclick="deleteRow(${i})">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
    };

    updateTable();
});
