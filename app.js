const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let scanner = null;
    let qrScanner = null;
    let audioCtx = null;

    // --- TAB SWITCHING ---
    document.querySelectorAll(".tabBtn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            document.getElementById(btn.dataset.tab).style.display = "block";
            btn.classList.add("activeTab");
            if(scanner) scanner.stop(); if(qrScanner) qrScanner.stop();
        };
    });

    function playBeep() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 2400;
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    }

    // --- ZOOM & TORCH OVERLAY LOGIC ---
    function initOverlay(inst, prefix = "") {
        try {
            const track = inst.getRunningTrack();
            const caps = track.getCapabilities();

            // Torch Logic
            const tBtn = document.getElementById("torchBtn" + prefix);
            if (caps.torch) {
                tBtn.onclick = () => {
                    const isOn = track.getSettings().torch;
                    track.applyConstraints({ advanced: [{ torch: !isOn }] });
                    tBtn.style.background = !isOn ? "rgba(255, 193, 7, 0.8)" : "rgba(0, 0, 0, 0.5)";
                };
            } else { tBtn.style.display = "none"; }

            // Zoom Logic (Only for Barcode reader)
            const zR = document.getElementById("zoomRange");
            if (caps.zoom && prefix === "") {
                zR.min = caps.zoom.min; zR.max = caps.zoom.max; zR.step = caps.zoom.step;
                zR.oninput = (e) => track.applyConstraints({ advanced: [{ zoom: e.target.value }] });
            }
        } catch (e) { console.error("Overlay Features not supported", e); }
    }

    // --- START SCAN ---
    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if(!scanner) scanner = new Html5Qrcode("reader");
        scanner.start({facingMode:"environment"}, {fps:15, qrbox:280}, (code) => {
            playBeep();
            scanner.stop();
            document.getElementById("reader").style.display = "none";
            document.getElementById("entryFields").style.display = "block";
            document.getElementById("barcode").value = code;
            document.getElementById("datetime").value = new Date().toLocaleString();
        }).then(() => initOverlay(scanner));
    };

    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        if(!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({facingMode:"environment"}, {fps:15, qrbox:280}, (code) => {
            playBeep();
            document.getElementById("qrField").value = code;
        }).then(() => initOverlay(qrScanner, "QR"));
    };

    // --- OTHER ACTIONS ---
    document.getElementById("submitBtn").onclick = () => {
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
    };

    document.getElementById("retryBtn").onclick = () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("startScan").click();
    };

    function updateTable() {
        const body = document.getElementById("tableBody");
        body.innerHTML = "";
        barcodeData.forEach((e, i) => {
            let row = `<tr><td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.datetime}</td>
            <td><button onclick="window.del(${i})" style="background:red;color:white;width:auto;padding:5px">X</button></td></tr>`;
            body.innerHTML += row;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.del = (i) => { barcodeData.splice(i, 1); localStorage.setItem("barcodeData", JSON.stringify(barcodeData)); updateTable(); };
    
    document.getElementById("syncBtn").onclick = () => {
        fetch(WEBAPP_URL, {method: "POST", mode: "no-cors", body: JSON.stringify(barcodeData)});
        alert("Sync triggered!");
    };

    updateTable();
});
