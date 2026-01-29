const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- Tab Switching (Ab Camera turant band hoga) ---
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");
    tabs.forEach(tab => {
        tab.addEventListener("click", async () => {
            const target = tab.getAttribute("data-tab");
            sections.forEach(s => s.style.display = "none");
            tabs.forEach(t => t.classList.remove("activeTab"));
            document.getElementById(target).style.display = "block";
            tab.classList.add("activeTab");
            
            // Background camera cleanup
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
        } catch (e) { console.log(e); }
    }

    // --- BARCODE (Full Clear View Area) ---
    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        
        barcodeScanner.start(
            { facingMode: "environment" }, 
            { 
                fps: 25, 
                qrbox: { width: 320, height: 180 }, // Wide box for barcode
                aspectRatio: 1.0, // Isse black bars hat jayenge aur view clear/bada dikhega
                videoConstraints: { focusMode: "continuous" }
            }, 
            (code) => {
                if (isProcessing) return;
                isProcessing = true;
                playBeep();
                barcodeScanner.stop().then(() => {
                    document.getElementById("reader").style.display = "none";
                    document.getElementById("entryFields").style.display = "block";
                    document.getElementById("barcode").value = code;
                    document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                    document.getElementById("photo").focus();
                    isProcessing = false;
                });
            }
        ).catch(err => console.log(err));
    };

    document.getElementById("stopScan").onclick = async () => {
        if (barcodeScanner && barcodeScanner.isScanning) {
            await barcodeScanner.stop();
            document.getElementById("reader").style.display = "none";
        }
    };

    document.getElementById("retryBtn").onclick = () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("barcode").value = "";
        document.getElementById("photo").value = "";
        document.getElementById("remark").value = "";
        document.getElementById("startScan").click();
    };

    // --- QR (Full Clear View Area) ---
    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        
        qrScanner.start(
            { facingMode: "environment" }, 
            { 
                fps: 20, 
                qrbox: 250, 
                aspectRatio: 1.0 // Square clear view
            }, 
            (code) => {
                playBeep();
                document.getElementById("qrField").value = code;
                qrDataList.push({ data: code, time: new Date().toLocaleString('en-GB') });
                localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
                qrScanner.stop().then(() => {
                    document.getElementById("qr-reader").style.display = "none";
                    alert("QR Scanned Successfully!");
                });
            }
        ).catch(err => console.log(err));
    };

    document.getElementById("stopQR").onclick = async () => {
        if (qrScanner && qrScanner.isScanning) {
            await qrScanner.stop();
            document.getElementById("qr-reader").style.display = "none";
        }
    };

    // --- Copy/Export/Sync Logic (Aapka original waisa hi hai) ---
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

    async function sendToGoogleSheet(itemsArray) {
        if (itemsArray.length === 0) return false;
        const payload = { entries: itemsArray.map(item => ({
            module: item.module, image: item.image, remark: item.remark,
            date: item.datetime.split(',')[0], datetime: item.datetime
        }))};
        try {
            await fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
            return true;
        } catch (e) { return false; }
    }

    document.getElementById("syncBtn").onclick = async () => {
        const unsynced = barcodeData.filter(d => !d.synced);
        if (unsynced.length === 0) return alert("Saara data pehle se update hai!");
        const btn = document.getElementById("syncBtn");
        btn.innerText = "Updating..."; btn.disabled = true;
        const ok = await sendToGoogleSheet(unsynced);
        if (ok) {
            barcodeData.forEach(d => { if (!d.synced) d.synced = true; });
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
            alert("Sheet updated successfully!");
        } else { alert("Sync failed!"); }
        btn.innerText = "Update Google Sheet"; btn.disabled = false;
    };

    document.getElementById("copyBtn").onclick = () => {
        const table = document.getElementById("table");
        const range = document.createRange();
        range.selectNode(table);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand("copy");
        alert("Table copied!");
    };

    document.getElementById("exportBtn").onclick = () => {
        if (barcodeData.length === 0) return alert("Data nahi hai!");
        let csv = "Serial,Photo,Remark,DateTime\n";
        barcodeData.forEach(e => { csv += `"${e.module}","${e.image}","${e.remark}","${e.datetime}"\n`; });
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "SagarBarcode_Data.csv";
        a.click();
    };

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td style="color:${e.synced ? 'green' : 'red'}; font-weight:bold;">${e.synced ? 'Synced' : 'Pending'}</td><td><button onclick="deleteRow(${i})" style="background:red; color:white; width:auto; padding:5px 10px;">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        if (confirm("Delete?")) {
            barcodeData.splice(i, 1);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }
    };

    updateTable();
});
