const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
    let audioCtx = null;
    let isProcessing = false;
    let currentZoom = 1;

    // --- 1. Professional High-Pitch Beep ---
    function playSharpBeep() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(2200, audioCtx.currentTime); // Sharp Industrial Tone
            gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } catch (e) { console.error("Audio Error"); }
    }

    // --- 2. Scanner Configuration (Focus Fix) ---
    const scanConfig = { 
        fps: 30, 
        qrbox: { width: 250, height: 250 },
        videoConstraints: {
            facingMode: "environment",
            focusMode: "continuous", // Hardware level focus
            whiteBalanceMode: "continuous"
        }
    };

    // --- 3. Zoom Logic (Floating Buttons) ---
    function setupZoom(scanner, inBtnId, outBtnId) {
        const track = scanner.getRunningTrack();
        const capabilities = track.getCapabilities();
        
        if (capabilities.zoom) {
            const zoomIn = document.getElementById(inBtnId);
            const zoomOut = document.getElementById(outBtnId);
            
            zoomIn.onclick = () => {
                if (currentZoom < capabilities.zoom.max) {
                    currentZoom += 0.5;
                    track.applyConstraints({ advanced: [{ zoom: currentZoom }] });
                }
            };
            zoomOut.onclick = () => {
                currentZoom = 1; // Reset to 1x
                track.applyConstraints({ advanced: [{ zoom: currentZoom }] });
            };
        }
    }

    // --- 4. Barcode Scan Success ---
    async function onBarcodeSuccess(code) {
        if (isProcessing) return;
        isProcessing = true;

        playSharpBeep();
        document.getElementById("reader").classList.add("scan-success");

        setTimeout(async () => {
            if (barcodeScanner) {
                await barcodeScanner.stop();
                barcodeScanner.clear();
            }
            document.getElementById("reader").style.display = "none";
            document.getElementById("zoom-controls").style.display = "none";
            document.getElementById("entryFields").style.display = "block";
            
            document.getElementById("barcode").value = code;
            document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
            
            document.getElementById("reader").classList.remove("scan-success");
            isProcessing = false;
        }, 300);
    }

    // --- 5. QR Scan Success ---
    async function onQRSuccess(code) {
        if (isProcessing) return;
        isProcessing = true;

        playSharpBeep();
        document.getElementById("qr-reader").classList.add("scan-success");

        setTimeout(async () => {
            if (qrScanner) {
                await qrScanner.stop();
                qrScanner.clear();
            }
            document.getElementById("qr-reader").style.display = "none";
            document.getElementById("qr-zoom-controls").style.display = "none";
            document.getElementById("qrField").value = code;
            
            document.getElementById("qr-reader").classList.remove("scan-success");
            isProcessing = false;
        }, 300);
    }

    // --- 6. Start Buttons ---
    document.getElementById("startScan").onclick = () => {
        isProcessing = false;
        currentZoom = 1;
        if (audioCtx) audioCtx.resume();
        
        document.getElementById("reader").style.display = "block";
        document.getElementById("zoom-controls").style.display = "flex";
        
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig, onBarcodeSuccess)
        .then(() => setupZoom(barcodeScanner, "z-in", "z-out"))
        .catch(err => alert("Camera Error: " + err));
    };

    document.getElementById("startQR").onclick = () => {
        isProcessing = false;
        currentZoom = 1;
        if (audioCtx) audioCtx.resume();

        document.getElementById("qr-reader").style.display = "block";
        document.getElementById("qr-zoom-controls").style.display = "flex";

        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, scanConfig, onQRSuccess)
        .then(() => setupZoom(qrScanner, "qr-z-in", "qr-z-out"))
        .catch(err => alert("Camera Error: " + err));
    };

    // --- 7. Data Handling (Submit) ---
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
        
        // Send to Google Sheet
        fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(entry) });
        
        document.getElementById("entryFields").style.display = "none";
        alert("Data Saved Successfully!");
    };

    function updateTable() {
        const table = document.getElementById("table");
        table.innerHTML = "<tr><th>Module</th><th>Image</th><th>Remark</th><th>Del</th></tr>";
        barcodeData.slice().reverse().forEach((e, i) => {
            const row = table.insertRow(-1);
            row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td>
            <td><button onclick="deleteRow(${barcodeData.length - 1 - i})" style="background:red; width:auto; padding:5px;">X</button></td>`;
        });
    }

    window.deleteRow = (i) => {
        if(confirm("Delete karein?")) {
            barcodeData.splice(i, 1);
            localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
            updateTable();
        }
    };

    // --- 8. Tab System ---
    document.querySelectorAll(".tabBtn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
            btn.classList.add("activeTab");
            document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
            document.getElementById(btn.dataset.tab).style.display = "block";
            // Stop scanners if switching
            if(barcodeScanner) barcodeScanner.stop();
            if(qrScanner) qrScanner.stop();
        };
    });

    updateTable();
});
