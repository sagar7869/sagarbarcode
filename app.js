const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- Tab Switching ---
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.getAttribute("data-tab");
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));
            document.getElementById(target).style.display = "block";
            tab.classList.add("activeTab");
            if (barcodeScanner?.isScanning) barcodeScanner.stop();
        });
    });

    // --- Audio ---
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

    // --- Core Sync Function ---
    async function sendToGoogleSheet(itemsArray) {
        if (itemsArray.length === 0) return false;
        const payload = { 
            entries: itemsArray.map(item => ({
                module: item.module,
                image: item.image,
                remark: item.remark,
                date: item.datetime.split(',')[0],
                datetime: item.datetime
            }))
        };
        try {
            await fetch(WEBAPP_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify(payload)
            });
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    // --- Barcode Scanner Logic ---
    const scanConfig = { fps: 20, qrbox: { width: 250, height: 250 } };

    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig, (code) => {
            if (isProcessing) return;
            isProcessing = true;
            playBeep();
            if (navigator.vibrate) navigator.vibrate(100);
            
            barcodeScanner.stop().then(() => {
                document.getElementById("reader").style.display = "none";
                document.getElementById("entryFields").style.display = "block";
                document.getElementById("barcode").value = code;
                document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                document.getElementById("photo").focus();
                isProcessing = false;
            });
        });
    };

    // --- Submit: Instant Upload ---
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
        const ok = await sendToGoogleSheet([entry]);
        if (ok) entry.synced = true;
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("barcode").value = "";
        document.getElementById("photo").value = "";
        document.getElementById("remark").value = "";
    };

    // --- Update Button ---
    document.getElementById("syncBtn").onclick = async () => {
        const unsynced = barcodeData.filter(d => !d.synced);
        if (unsynced.length === 0) return alert("Saara data pehle se update hai!");
        const btn = document.getElementById("syncBtn");
        btn.innerText = "Updating...";
        btn.disabled = true;
        const ok = await sendToGoogleSheet(unsynced);
        if (ok) {
            barcodeData.forEach(d => { if (!d.synced) d.synced = true; });
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
            alert("Sheet updated successfully!");
        } else {
            alert("Sync failed! Check internet.");
        }
        btn.innerText = "Update Google Sheet";
        btn.disabled = false;
    };

    // --- FIX: Copy Table ---
    document.getElementById("copyBtn").onclick = () => {
        const table = document.getElementById("table");
        const range = document.createRange();
        range.selectNode(table);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand("copy");
        window.getSelection().removeAllRanges();
        alert("Table copied to clipboard!");
    };

    // --- FIX: Export CSV ---
    document.getElementById("exportBtn").onclick = () => {
        if (barcodeData.length === 0) return alert("Data nahi hai!");
        let csv = "Serial,Photo,Remark,DateTime\n";
        barcodeData.forEach(e => {
            csv += `${e.module},${e.image},${e.remark},${e.datetime}\n`;
        });
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "SagarBarcode_Data.csv";
        a.click();
    };

    // --- Table Display ---
    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `
                <td>${e.module}</td>
                <td>${e.image}</td>
                <td>${e.remark}</td>
                <td style="color:${e.synced ? 'green' : 'red'}; font-weight:bold;">${e.synced ? 'Synced' : 'Pending'}</td>
                <td><button onclick="deleteRow(${i})" style="background:red; color:white; border-radius:5px; width:auto; padding:5px 10px;">X</button></td>
            `;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        if (confirm("Delete karein?")) {
            barcodeData.splice(i, 1);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }
    };

    updateTable();
});
