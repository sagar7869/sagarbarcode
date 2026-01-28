const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let scanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let zoomLevel = 1;

    // Sharp Beep Sound
    function playBeep() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine"; osc.frequency.value = 2200;
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    }

    const config = { 
        fps: 25, 
        qrbox: { width: 250, height: 250 }, 
        videoConstraints: { focusMode: "continuous" } 
    };

    // --- Barcode Scanner Logic ---
    document.getElementById("startScan").onclick = () => {
        if (audioCtx) audioCtx.resume();
        document.getElementById("zoom-overlay").style.display = "flex";
        document.getElementById("startScan").style.display = "none";
        document.getElementById("stopScan").style.display = "block";

        scanner = new Html5Qrcode("reader");
        scanner.start({ facingMode: "environment" }, config, (code) => {
            playBeep();
            scanner.stop().then(() => {
                document.getElementById("entryFields").style.display = "block";
                document.getElementById("barcode").value = code;
                document.getElementById("zoom-overlay").style.display = "none";
                document.getElementById("stopScan").style.display = "none";
                document.getElementById("startScan").style.display = "block";
            });
        }).then(() => {
            const track = scanner.getRunningTrack();
            const caps = track.getCapabilities();
            if (caps.zoom) {
                document.getElementById("btn-zoom-in").onclick = () => {
                    if (zoomLevel < caps.zoom.max) zoomLevel += 0.5;
                    track.applyConstraints({ advanced: [{ zoom: zoomLevel }] });
                };
                document.getElementById("btn-zoom-out").onclick = () => {
                    zoomLevel = 1;
                    track.applyConstraints({ advanced: [{ zoom: zoomLevel }] });
                };
            }
        });
    };

    document.getElementById("stopScan").onclick = () => {
        if (scanner) {
            scanner.stop().then(() => {
                document.getElementById("zoom-overlay").style.display = "none";
                document.getElementById("stopScan").style.display = "none";
                document.getElementById("startScan").style.display = "block";
            });
        }
    };

    // --- Submit Logic ---
    document.getElementById("submitBtn").onclick = () => {
        const entry = {
            module: document.getElementById("barcode").value,
            image: document.getElementById("photo").value,
            remark: document.getElementById("remark").value,
            datetime: new Date().toLocaleString()
        };
        barcodeData.push(entry);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
        fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(entry) });
        document.getElementById("entryFields").style.display = "none";
    };

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Serial</th><th>Image</th><th>Remark</th><th>X</th></tr>";
        barcodeData.slice().reverse().forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td>
            <td><button onclick="deleteRow(${barcodeData.length - 1 - i})" style="background:red;color:white;border:none;padding:5px;">X</button></td>`;
        });
        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    window.deleteRow = (i) => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
    };

    // --- Tab Switching ---
    document.querySelectorAll(".tabBtn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            btn.classList.add("activeTab");
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            document.getElementById(btn.dataset.tab).style.display = "block";
        };
    });

    updateTable();
});
