const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;

    // Tabs logic
    document.querySelectorAll(".tabBtn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            document.getElementById(btn.dataset.tab).style.display = "block";
            btn.classList.add("activeTab");
            stopBarcodeCamera(); stopQRCamera();
        };
    });

    const scanConfig = { fps: 15, qrbox: { width: 280, height: 280 } };

    function playBeep() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 2500;
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    }

    // Advanced Camera Features (Zoom & Torch)
    function applyAdvancedFeatures(scanner) {
        try {
            const track = scanner.getRunningTrack();
            const caps = track.getCapabilities();
            
            // Zoom
            const zRange = document.getElementById("zoomRange");
            if (caps.zoom) {
                zRange.min = caps.zoom.min; zRange.max = caps.zoom.max; zRange.step = caps.zoom.step;
                zRange.oninput = (e) => track.applyConstraints({advanced: [{zoom: e.target.value}]});
            }
            // Torch
            const tBtn = document.getElementById("torchBtn");
            if (caps.torch) {
                let on = false;
                tBtn.onclick = () => {
                    on = !on;
                    track.applyConstraints({advanced: [{torch: on}]});
                    tBtn.innerText = on ? "Flashlight OFF" : "Flashlight ON";
                };
            } else { tBtn.style.display = "none"; }
        } catch (e) { console.log("Advanced features not supported"); }
    }

    async function onScanSuccess(code, id, isQR) {
        if (isProcessing) return;
        isProcessing = true; playBeep();
        if (isQR) {
            await stopQRCamera();
            document.getElementById("qrField").value = code;
            qrDataList.push({data: code, time: new Date().toLocaleString()});
            localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
        } else {
            await stopBarcodeCamera();
            document.getElementById("entryFields").style.display = "block";
            document.getElementById("barcode").value = code;
            document.getElementById("datetime").value = new Date().toLocaleString();
        }
        isProcessing = false;
    }

    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({facingMode: "environment"}, scanConfig, c => onScanSuccess(c, "reader", false))
        .then(() => applyAdvancedFeatures(barcodeScanner));
    };

    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({facingMode: "environment"}, scanConfig, c => onScanSuccess(c, "qr-reader", true))
        .then(() => applyAdvancedFeatures(qrScanner));
    };

    async function stopBarcodeCamera() { if(barcodeScanner?.isScanning) await barcodeScanner.stop(); document.getElementById("reader").style.display="none"; }
    async function stopQRCamera() { if(qrScanner?.isScanning) await qrScanner.stop(); document.getElementById("qr-reader").style.display="none"; }
    
    document.getElementById("stopScan").onclick = stopBarcodeCamera;
    document.getElementById("stopQR").onclick = stopQRCamera;

    // Retry Button
    document.getElementById("retryBtn").onclick = () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("startScan").click();
    };

    document.getElementById("submitBtn").onclick = () => {
        barcodeData.push({
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: document.getElementById("datetime").value
        });
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
        document.getElementById("entryFields").style.display = "none";
    };

    function updateTable() {
        const t = document.getElementById("table");
        t.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Time</th><th>Del</th></tr>";
        barcodeData.forEach((e, i) => {
            let r = t.insertRow(-1);
            r.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.datetime}</td><td><button onclick="del(${i})" style="width:auto;background:red;color:white">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.del = (i) => { barcodeData.splice(i,1); localStorage.setItem("barcodeData", JSON.stringify(barcodeData)); updateTable(); };

    document.getElementById("copyBtn").onclick = () => {
        let txt = "Serial,Photo,Remark,Time\n" + barcodeData.map(e => `${e.module},${e.image},${e.remark},${e.datetime}`).join("\n");
        navigator.clipboard.writeText(txt).then(() => alert("Copied!"));
    };

    document.getElementById("exportBtn").onclick = () => {
        let csv = "Serial,Photo,Remark,Time\n" + barcodeData.map(e => `"${e.module}","${e.image}","${e.remark}","${e.datetime}"`).join("\n");
        const blob = new Blob([csv], {type: 'text/csv'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download="data.csv"; a.click();
    };

    document.getElementById("syncBtn").onclick = () => {
        fetch(WEBAPP_URL, {method: "POST", mode: "no-cors", body: JSON.stringify(barcodeData)});
        alert("Syncing with Google Sheets...");
    };

    updateTable();
});
