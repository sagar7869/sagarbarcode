const WEBAPP_URL = "YOUR_SCRIPT_URL_HERE";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let scanner = null, qrScanner = null;

    // Tabs
    document.querySelectorAll(".tabBtn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            document.getElementById(btn.dataset.tab).style.display = "block";
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            btn.classList.add("activeTab");
            if(scanner) scanner.stop(); if(qrScanner) qrScanner.stop();
            document.getElementById("controlsOverlay").style.display = "none";
        };
    });

    function setupCamFeatures(inst, overlayId, tBtnId) {
        try {
            const track = inst.getRunningTrack();
            const caps = track.getCapabilities();
            document.getElementById(overlayId).style.display = "block";

            // Torch
            const tBtn = document.getElementById(tBtnId);
            if (caps.torch) {
                tBtn.onclick = () => {
                    const status = track.getSettings().torch;
                    track.applyConstraints({ advanced: [{ torch: !status }] });
                };
            } else { tBtn.style.display = "none"; }

            // Zoom
            const zR = document.getElementById("zoomRange");
            if (caps.zoom && overlayId === "controlsOverlay") {
                zR.min = caps.zoom.min; zR.max = caps.zoom.max;
                zR.oninput = (e) => track.applyConstraints({ advanced: [{ zoom: e.target.value }] });
            }
        } catch (e) { console.log("Features Error", e); }
    }

    document.getElementById("startScan").onclick = () => {
        if(!scanner) scanner = new Html5Qrcode("reader");
        scanner.start({facingMode:"environment"}, {fps:15, qrbox:280}, (code) => {
            scanner.stop();
            document.getElementById("controlsOverlay").style.display = "none";
            document.getElementById("entryFields").style.display = "block";
            document.getElementById("barcode").value = code;
            document.getElementById("datetime").value = new Date().toLocaleString();
        }).then(() => setupCamFeatures(scanner, "controlsOverlay", "torchBtn"));
    };

    document.getElementById("startQR").onclick = () => {
        if(!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({facingMode:"environment"}, {fps:15, qrbox:250}, (code) => {
            document.getElementById("qrField").value = code;
        }).then(() => setupCamFeatures(qrScanner, "qrOverlay", "torchBtnQR"));
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

    document.getElementById("retryBtn").onclick = () => {
        document.getElementById("entryFields").style.display = "none";
        document.getElementById("startScan").click();
    };

    function updateTable() {
        const body = document.getElementById("tableBody");
        body.innerHTML = barcodeData.map((e, i) => `
            <tr><td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.datetime}</td>
            <td><button onclick="window.del(${i})" style="background:red;color:white;padding:5px">X</button></td></tr>
        `).join("");
    }
    window.del = (i) => { barcodeData.splice(i, 1); localStorage.setItem("barcodeData", JSON.stringify(barcodeData)); updateTable(); };

    updateTable();
});
