const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let isProcessing = false;

    // Fast Beep function
    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            osc.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        } catch(e) {}
    };

    // Torch Toggle Function (Isse scanner slow nahi hoga)
    window.toggleFlash = async (btnId) => {
        try {
            const video = document.querySelector('video');
            if (!video) return;
            const track = video.srcObject.getVideoTracks()[0];
            const settings = track.getSettings();
            await track.applyConstraints({ advanced: [{ torch: !settings.torch }] });
            document.getElementById(btnId).style.color = !settings.torch ? "#FFD700" : "#fff";
        } catch (e) { console.log("Torch Error", e); }
    };

    // Tab Logic
    document.querySelectorAll(".tabBtn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            document.getElementById(btn.dataset.tab).style.display = "block";
            btn.classList.add("activeTab");
            if (barcodeScanner) barcodeScanner.stop();
            if (qrScanner) qrScanner.stop();
        };
    });

    // --- BARCODE START ---
    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        
        barcodeScanner.start(
            { facingMode: "environment" }, 
            { fps: 20, qrbox: { width: 250, height: 150 } }, // Fast detection area
            (code) => {
                if (isProcessing) return;
                isProcessing = true;
                playBeep();
                barcodeScanner.stop().then(() => {
                    document.getElementById("torchBtn").style.display = "none";
                    document.getElementById("reader").style.display = "none";
                    document.getElementById("entryFields").style.display = "block";
                    document.getElementById("barcode").value = code;
                    document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                    document.getElementById("photo").focus();
                    isProcessing = false;
                });
            }
        ).then(() => {
            document.getElementById("torchBtn").style.display = "flex";
        }).catch(err => alert("Camera error: " + err));
    };

    document.getElementById("stopScan").onclick = () => {
        if (barcodeScanner) barcodeScanner.stop().then(() => {
            document.getElementById("reader").style.display = "none";
            document.getElementById("torchBtn").style.display = "none";
        });
    };

    // --- QR START ---
    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        
        qrScanner.start(
            { facingMode: "environment" }, 
            { fps: 20, qrbox: 250 }, 
            (code) => {
                playBeep();
                document.getElementById("qrField").value = code;
                qrScanner.stop().then(() => {
                    document.getElementById("qr-reader").style.display = "none";
                    document.getElementById("torchBtnQR").style.display = "none";
                });
            }
        ).then(() => {
            document.getElementById("torchBtnQR").style.display = "flex";
        });
    };

    // --- Submit & Sync (Baki sab same rakha hai) ---
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
        
        const ok = await sendToSheet([entry]);
        if (ok) {
            barcodeData[barcodeData.length-1].synced = true;
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }
    };

    async function sendToSheet(items) {
        try {
            const payload = { entries: items.map(i => ({ module: i.module, image: i.image, remark: i.remark, date: i.datetime.split(',')[0], datetime: i.datetime })) };
            await fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
            return true;
        } catch (e) { return false; }
    }

    document.getElementById("syncBtn").onclick = async () => {
        const pending = barcodeData.filter(d => !d.synced);
        if (pending.length === 0) return alert("All synced!");
        if (await sendToSheet(pending)) {
            barcodeData.forEach(d => d.synced = true);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
            alert("Sync Success!");
        }
    };

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Status</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td style="color:${e.synced?'green':'red'}">${e.synced?'Synced':'Pending'}</td><td><button onclick="deleteRow(${i})" style="background:red;color:white;">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => { if(confirm("Delete?")) { barcodeData.splice(i,1); updateTable(); } };
    updateTable();
});
