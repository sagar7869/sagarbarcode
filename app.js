const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
  let barcodeScanner = null;
  let qrScanner = null;

  // High Pitch Double Beep Function
  function playHighBeep() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, start) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    };
    playTone(1200, audioCtx.currentTime); // First Beep
    playTone(1200, audioCtx.currentTime + 0.12); // Second Beep
  }

  /* --- FAST SCAN CONFIG --- */
  const scanConfig = { 
    fps: 30, // Super fast detection
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    videoOptimizer: true 
  };

  /* --- SCAN SUCCESS HANDLER --- */
  function onScanSuccess(code, readerId, isQR = false) {
    const reader = document.getElementById(readerId);
    reader.classList.add("scan-success");
    playHighBeep();
    
    // Flash Effect
    const flash = document.createElement("div");
    flash.className = "flash-effect";
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);

    setTimeout(() => {
      if(isQR) {
        stopQRCamera();
        document.getElementById("qrField").value = code;
        qrDataList.push({data: code, time: new Date().toLocaleString()});
        localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
      } else {
        stopBarcodeCamera();
        document.getElementById("entryFields").style.display = "block";
        document.getElementById("barcode").value = code;
        document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
      }
      reader.classList.remove("scan-success");
    }, 250);
  }

  /* --- START BARCODE --- */
  document.getElementById("startScan").onclick = () => {
    const reader = document.getElementById("reader");
    reader.style.display = "block";
    if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");
    barcodeScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "reader", false));
  };

  /* --- START QR --- */
  document.getElementById("startQR").onclick = () => {
    const qrReader = document.getElementById("qr-reader");
    qrReader.style.display = "block";
    if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start({ facingMode: "environment" }, scanConfig, c => onScanSuccess(c, "qr-reader", true));
  };

  /* --- STOP FUNCTIONS --- */
  function stopBarcodeCamera() {
    if (barcodeScanner && barcodeScanner.isScanning) {
      barcodeScanner.stop().then(() => { barcodeScanner.clear(); document.getElementById("reader").style.display = "none"; });
    } else { document.getElementById("reader").style.display = "none"; }
  }

  function stopQRCamera() {
    if (qrScanner && qrScanner.isScanning) {
      qrScanner.stop().then(() => { qrScanner.clear(); document.getElementById("qr-reader").style.display = "none"; });
    } else { document.getElementById("qr-reader").style.display = "none"; }
  }

  document.getElementById("stopScan").onclick = stopBarcodeCamera;
  document.getElementById("stopQR").onclick = stopQRCamera;

  // ... (Baki purana Submit, Copy, Export, UpdateTable functions yahan rahege)
});
