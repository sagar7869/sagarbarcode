const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;

    // --- Tab Switching Logic (Fix Point 2) ---
    document.querySelectorAll(".tabBtn").forEach(tab => {
        tab.addEventListener("click", async () => {
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            document.getElementById(tab.getAttribute("data-tab")).style.display = "block";
            tab.classList.add("activeTab");
            await stopAllScanners();
        });
    });

    async function stopAllScanners() {
        if (barcodeScanner && barcodeScanner.isScanning) await barcodeScanner.stop();
        if (qrScanner && qrScanner.isScanning) await qrScanner.stop();
        document.getElementById("reader").style.display = "none";
        document.getElementById("qr-reader").style.display = "none";
    }

    function playBeep() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } catch (e) {}
    }

    // --- BEST BARCODE TECHNOLOGY (1D Specialized) ---
    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        
        // Specifying only Barcode formats for faster 1D detection
        if (!barcodeScanner) {
            barcodeScanner = new Html5Qrcode("reader", { 
                formatsToSupport: [ 
                    Html5QrcodeSupportedFormats.CODE_128, 
                    Html5QrcodeSupportedFormats.EAN_13, 
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_39 
                ]
            });
        }

        const config = { 
            fps: 25, // High frame rate for moving objects
            qrbox: { width: 300, height: 120 }, // Optimized for long barcodes
            aspectRatio: 1.777778, // 16:9 for wider view
            videoConstraints: {
                facingMode: "environment",
                focusMode: "continuous"
            }
        };

        barcodeScanner.start({ facingMode: "environment" }, config, (code) => {
            playBeep();
            barcodeScanner.stop().then(() => {
                document.getElementById("reader").style.display = "none";
                document.getElementById("entryFields").style.display = "block";
                document.getElementById("barcode").value = code;
                document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                document.getElementById("photo").focus();
            });
        }).catch(err => console.error(err));
    };

    // --- BEST QR TECHNOLOGY (2D Specialized) ---
    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        
        if (!qrScanner) {
            qrScanner = new Html5Qrcode("qr-reader", {
                formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
            });
        }

        qrScanner.start(
            { facingMode: "environment" }, 
            { fps: 20, qrbox: 250 }, // Square box for QR
            (code) => {
                playBeep();
                document.getElementById("qrField").value = code;
                qrDataList.push({ data: code, time: new Date().toLocaleString('en-GB') });
                localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
                qrScanner.stop().then(() => {
                    document.getElementById("qr-reader").style.display = "none";
                    alert("QR Code Saved Successfully!");
                });
            }
        ).catch(err => console.error(err));
    };

    // --- Data Safety (Fix Point 3 & 4) ---
    document.getElementById("exportBtn").onclick = () => {
        if (barcodeData.length === 0) return alert("Data empty!");
        let csv = "Serial,Photo,Remark,DateTime\n";
        barcodeData.forEach(e => { 
            // Sanitize with quotes to handle commas in remarks
            csv += `"${e.module}","${e.image}","${e.remark}","${e.datetime}"\n`;
        });
        downloadFile(csv, "SagarBarcode.csv");
    };

    function downloadFile(content, fileName) {
        const blob = new Blob([content], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
    }

    document.getElementById("submitBtn").onclick = async () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: document.getElementById("datetime").value,
            synced: false
        };
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
        document.getElementById("entryFields").style.display = "none";
        
        // Sync to Google
        fetch(WEBAPP_URL, { 
            method: "POST", 
            mode: "no-cors", 
            body: JSON.stringify({entries: [entry]}) 
        });
    };

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td style="color:green">Saved</td><td><button onclick="deleteRow(${i})">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        if(confirm("Delete?")) {
            barcodeData.splice(i, 1);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }
    };

    updateTable();
});
