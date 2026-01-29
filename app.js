const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // --- Tab Switching (Original) ---
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
            if (qrScanner?.isScanning) qrScanner.stop();
        });
    });

    // --- Flashlight Handle Function ---
    async function setupTorch(scanner, btnId) {
        try {
            const track = scanner.getState().videoTrack;
            if (track && track.getCapabilities().torch) {
                const btn = document.getElementById(btnId);
                btn.style.display = "block"; // Camera chalu hone par button dikhao
                btn.onclick = async () => {
                    const settings = track.getSettings();
                    await track.applyConstraints({ advanced: [{ torch: !settings.torch }] });
                    btn.classList.toggle('active');
                };
            }
        } catch (e) { console.log("Flash support nahi hai"); }
    }

    function playBeep() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } catch (e) { }
    }

    // --- Barcode Scanner (Same as original) ---
    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (code) => {
            if (isProcessing) return;
            isProcessing = true;
            playBeep();
            barcodeScanner.stop().then(() => {
                document.getElementById("torchBtn").style.display = "none";
                document.getElementById("reader").style.display = "none";
                document.getElementById("entryFields").style.display = "block";
                document.getElementById("barcode").value = code;
                document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                isProcessing = false;
            });
        }).then(() => setupTorch(barcodeScanner, "torchBtn")); // Torch activate
    };

    document.getElementById("stopScan").onclick = () => {
        if (barcodeScanner?.isScanning) {
            barcodeScanner.stop().then(() => {
                document.getElementById("reader").style.display = "none";
                document.getElementById("torchBtn").style.display = "none";
            });
        }
    };

    // --- QR Scanner (Same as original) ---
    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 220 }, (code) => {
            playBeep();
            document.getElementById("qrField").value = code;
            qrDataList.push({ data: code, time: new Date().toLocaleString('en-GB') });
            localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
            qrScanner.stop().then(() => {
                document.getElementById("torchBtnQR").style.display = "none";
                document.getElementById("qr-reader").style.display = "none";
                alert("QR Scanned!");
            });
        }).then(() => setupTorch(qrScanner, "torchBtnQR")); // Torch activate
    };

    document.getElementById("stopQR").onclick = () => {
        if (qrScanner?.isScanning) {
            qrScanner.stop().then(() => {
                document.getElementById("qr-reader").style.display = "none";
                document.getElementById("torchBtnQR").style.display = "none";
            });
        }
    };

    // --- Baaki Saare Purane Functions (Copy, Export, Sync, Table) ---
    // (Inme koi change nahi hai, wahi use karein jo pehle kaam kar rahe the)
    
    document.getElementById("submitBtn").onclick = async () => {
        const entry = { module: document.getElementById("barcode").value, image: document.getElementById("photo").value, remark: document.getElementById("remark").value, datetime: document.getElementById("datetime").value, synced: false };
        if (!entry.module) return alert("Pehle Scan karein!");
        barcodeData.push(entry);
        const ok = await sendToGoogleSheet([entry]);
        if (ok) entry.synced = true;
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
        document.getElementById("entryFields").style.display = "none";
    };

    async function sendToGoogleSheet(itemsArray) {
        try {
            const payload = { entries: itemsArray.map(item => ({ module: item.module, image: item.image, remark: item.remark, date: item.datetime.split(',')[0], datetime: item.datetime })) };
            await fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
            return true;
        } catch (e) { return false; }
    }

    document.getElementById("syncBtn").onclick = async () => {
        const unsynced = barcodeData.filter(d => !d.synced);
        if (unsynced.length === 0) return alert("All synced!");
        const ok = await sendToGoogleSheet(unsynced);
        if (ok) { barcodeData.forEach(d => d.synced = true); updateTable(); alert("Sync Success!"); }
    };

    document.getElementById("copyBtn").onclick = () => {
        const range = document.createRange();
        range.selectNode(document.getElementById("table"));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand("copy");
        alert("Table Copied!");
    };

    document.getElementById("exportBtn").onclick = () => {
        let csv = "Serial,Photo,Remark,Time\n" + barcodeData.map(e => `${e.module},${e.image},${e.remark},${e.datetime}`).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = "Barcode_Data.csv";
        a.click();
    };

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td style="color:${e.synced ? 'green' : 'red'}">${e.synced ? 'Synced' : 'Pending'}</td><td><button onclick="deleteRow(${i})" style="background:red; color:white; width:auto;">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        if (confirm("Delete?")) { barcodeData.splice(i, 1); updateTable(); }
    };

    updateTable();
});
