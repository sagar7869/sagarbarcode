const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;

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
            
            // Tab switch hote hi dono scanners ko band karo
            await stopAllScanners();
        });
    });

    async function stopAllScanners() {
        if (barcodeScanner && barcodeScanner.getState() > 1) {
            await barcodeScanner.stop().catch(err => console.log("Barcode Stop Error", err));
        }
        if (qrScanner && qrScanner.getState() > 1) {
            await qrScanner.stop().catch(err => console.log("QR Stop Error", err));
        }
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
        } catch (e) { console.log(e); }
    }

    // --- BARCODE SCANNER (Advanced Tech) ---
    document.getElementById("startScan").onclick = () => {
        const readerDiv = document.getElementById("reader");
        readerDiv.style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");

        const config = { 
            fps: 20, 
            qrbox: { width: 300, height: 150 }, 
            formatsToSupport: [ Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.QR_CODE ] 
        };

        barcodeScanner.start({ facingMode: "environment" }, config, (code) => {
            playBeep();
            barcodeScanner.stop().then(() => {
                readerDiv.style.display = "none";
                document.getElementById("entryFields").style.display = "block";
                document.getElementById("barcode").value = code;
                document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
            });
        }).catch(err => alert("Camera Error: " + err));
    };

    document.getElementById("stopScan").onclick = async () => {
        await stopAllScanners();
    };

    // --- QR SCANNER (Fast Tech) ---
    document.getElementById("startQR").onclick = () => {
        const qrDiv = document.getElementById("qr-reader");
        qrDiv.style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");

        qrScanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (code) => {
            playBeep();
            document.getElementById("qrField").value = code;
            qrDataList.push({ data: code, time: new Date().toLocaleString('en-GB') });
            localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
            qrScanner.stop().then(() => { qrDiv.style.display = "none"; });
        }).catch(err => alert("QR Error: " + err));
    };

    document.getElementById("stopQR").onclick = async () => {
        await stopAllScanners();
    };

    // --- COPY & EXPORT (Barcode Section) ---
    document.getElementById("copyBtn").onclick = () => {
        const table = document.getElementById("table");
        const range = document.createRange();
        range.selectNode(table);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand("copy");
        alert("Barcode Table Copied!");
    };

    document.getElementById("exportBtn").onclick = () => {
        if (barcodeData.length === 0) return alert("No Data!");
        let csv = "Serial,Photo,Remark,DateTime\n";
        barcodeData.forEach(e => { csv += `"${e.module}","${e.image}","${e.remark}","${e.datetime}"\n`; });
        downloadCSV(csv, "Barcode_Data.csv");
    };

    // --- COPY & EXPORT (QR Section) --- FIXED
    document.getElementById("copyQR").onclick = () => {
        if (qrDataList.length === 0) return alert("QR Data is empty!");
        let text = "QR Data | Time\n";
        qrDataList.forEach(e => { text += `${e.data} | ${e.time}\n`; });
        navigator.clipboard.writeText(text).then(() => alert("QR Data Copied!"));
    };

    document.getElementById("exportQR").onclick = () => {
        if (qrDataList.length === 0) return alert("QR Data is empty!");
        let csv = "QR_Data,DateTime\n";
        qrDataList.forEach(e => { csv += `"${e.data}","${e.time}"\n`; });
        downloadCSV(csv, "QR_Data.csv");
    };

    function downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
    }

    // --- Submit & Table Sync ---
    document.getElementById("submitBtn").onclick = async () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: document.getElementById("datetime").value
        };
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
        document.getElementById("entryFields").style.display = "none";
        
        // Background Sync
        fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({entries: [entry]}) });
    };

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.datetime}</td><td><button onclick="deleteRow(${i})">X</button></td>`;
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
