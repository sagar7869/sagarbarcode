const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
    let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
    let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
    let barcodeScanner = null;
    let qrScanner = null;
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
            // Switch karte waqt purane scanner band karein
            if (barcodeScanner?.isScanning) barcodeScanner.stop();
            if (qrScanner?.isScanning) qrScanner.stop();
        });
    });

    // --- Audio Feedback ---
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

    const scanConfig = { fps: 20, qrbox: { width: 250, height: 250 } };

    // --- QR SCANNER LOGIC ---
    document.getElementById("startQR").onclick = () => {
        document.getElementById("qr-reader").style.display = "block";
        if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start({ facingMode: "environment" }, scanConfig, (code) => {
            playBeep();
            document.getElementById("qrField").value = code;
            
            // QR Data ko list mein save karein
            qrDataList.push({ data: code, time: new Date().toLocaleString() });
            localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
            
            if (navigator.vibrate) navigator.vibrate(100);
        });
    };

    document.getElementById("stopQR").onclick = async () => {
        if (qrScanner?.isScanning) {
            await qrScanner.stop();
            document.getElementById("qr-reader").style.display = "none";
        }
    };

    // --- QR COPY & EXPORT (Naye Buttons) ---
    // Agar aapne HTML mein IDs 'copyQR' aur 'exportQR' di hain:
    const cpQR = document.getElementById("copyQR");
    if(cpQR) {
        cpQR.onclick = () => {
            if (qrDataList.length === 0) return alert("QR data nahi hai!");
            let text = "QR Data\tTime\n";
            qrDataList.forEach(e => text += `${e.data}\t${e.time}\n`);
            
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            alert("QR Table copied!");
        };
    }

    const exQR = document.getElementById("exportQR");
    if(exQR) {
        exQR.onclick = () => {
            if (qrDataList.length === 0) return alert("Export ke liye QR data nahi hai!");
            let csv = "QR Data,Time\n";
            qrDataList.forEach(e => csv += `"${e.data}","${e.time}"\n`);
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "QR_Data_Export.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
    }

    // --- BARCODE SCANNER LOGIC (Pehle wala) ---
    document.getElementById("startScan").onclick = () => {
        document.getElementById("reader").style.display = "block";
        if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
        barcodeScanner.start({ facingMode: "environment" }, scanConfig, (code) => {
            if (isProcessing) return;
            isProcessing = true;
            playBeep();
            barcodeScanner.stop().then(() => {
                document.getElementById("reader").style.display = "none";
                document.getElementById("entryFields").style.display = "block";
                document.getElementById("barcode").value = code;
                document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
                isProcessing = false;
            });
        });
    };

    // Baaki Submit, Sync, Table update functions pehle jaise hi raheinge...
    // (Upar diye gaye function names use karein)
});
