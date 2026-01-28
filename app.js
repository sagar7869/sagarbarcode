const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
  let barcodeScanner = null;
  let qrScanner = null;

  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav"); // High scan beep

  /* --- TAB SYSTEM --- */
  document.querySelectorAll(".tabBtn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
      document.querySelectorAll(".tabSection").forEach(s => s.style.display = "none");
      btn.classList.add("activeTab");
      document.getElementById(btn.dataset.tab).style.display = "block";
      stopBarcodeCamera();
      stopQRCamera();
    };
  });

  /* --- COMMON CAMERA CONFIG --- */
  const scanConfig = { 
    fps: 20, 
    qrbox: { width: 250, height: 150 },
    aspectRatio: 1.0
  };

  /* --- BARCODE LOGIC --- */
  document.getElementById("startScan").onclick = () => {
    const reader = document.getElementById("reader");
    reader.style.display = "block";
    reader.style.border = "2px solid transparent"; // Reset border

    if (!barcodeScanner) barcodeScanner = new Html5Qrcode("reader");

    barcodeScanner.start(
      { facingMode: "environment" }, 
      scanConfig, 
      code => {
        // Success: Green Flash Effect
        reader.style.border = "5px solid #4CAF50"; 
        beep.play();
        applyCaptureEffect(); // Screen flash effect

        setTimeout(() => {
          stopBarcodeCamera();
          document.getElementById("entryFields").style.display = "block";
          document.getElementById("barcode").value = code;
          document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
        }, 300);
      }
    ).then(() => {
      // Zoom & Focus capability check (Some browsers/phones support this)
      const track = barcodeScanner.getRunningTrack();
      const capabilities = track.getCapabilities();
      if (capabilities.zoom) {
        console.log("Zoom supported: ", capabilities.zoom);
        // Aap yahan zoom slider add kar sakte hain agar browser allow kare
      }
    }).catch(err => console.error(err));
  };

  /* --- QR LOGIC --- */
  document.getElementById("startQR").onclick = () => {
    const qrReader = document.getElementById("qr-reader");
    qrReader.style.display = "block";
    qrReader.style.border = "2px solid transparent";

    if (!qrScanner) qrScanner = new Html5Qrcode("qr-reader");

    qrScanner.start(
      { facingMode: "environment" }, 
      scanConfig, 
      code => {
        qrReader.style.border = "5px solid #4CAF50"; // Green Box Detection
        beep.play();
        applyCaptureEffect();

        setTimeout(() => {
          stopQRCamera();
          document.getElementById("qrField").value = code;
          qrDataList.push({data: code, time: new Date().toLocaleString()});
          localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
        }, 300);
      }
    ).catch(err => console.error(err));
  };

  /* --- STOP FUNCTIONS (FAST STOP) --- */
  function stopBarcodeCamera() {
    if (barcodeScanner && barcodeScanner.isScanning) {
      barcodeScanner.stop().then(() => {
        barcodeScanner.clear();
        document.getElementById("reader").style.display = "none";
      });
    } else {
      document.getElementById("reader").style.display = "none";
    }
  }

  function stopQRCamera() {
    if (qrScanner && qrScanner.isScanning) {
      qrScanner.stop().then(() => {
        qrScanner.clear();
        document.getElementById("qr-reader").style.display = "none";
      });
    } else {
      document.getElementById("qr-reader").style.display = "none";
    }
  }

  document.getElementById("stopScan").onclick = stopBarcodeCamera;
  document.getElementById("stopQR").onclick = stopQRCamera;

  /* --- EFFECTS --- */
  function applyCaptureEffect() {
    const flash = document.createElement("div");
    flash.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; opacity:0.8; z-index:9999;";
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 100);
  }

  /* --- DATA HANDLING (Submit/Table) --- */
  document.getElementById("submitBtn").onclick = () => {
    const now = new Date();
    const entry = {
      module: document.getElementById("barcode").value,
      image: document.getElementById("photo").value,
      remark: document.getElementById("remark").value,
      date: now.toLocaleDateString('en-GB'),
      datetime: now.toLocaleString('en-GB')
    };
    barcodeData.push(entry);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateBarcodeTable();
    fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(entry) });
    document.getElementById("entryFields").style.display = "none";
  };

  function updateBarcodeTable() {
    const table = document.getElementById("table");
    table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date Time</th><th>Del</th></tr>";
    barcodeData.forEach((e, i) => {
      const row = table.insertRow(-1);
      row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.datetime}</td>
      <td><button onclick="deleteRow(${i})" style="background:red; color:white;">X</button></td>`;
    });
    document.getElementById("totalCount").innerText = barcodeData.length;
  }

  window.deleteRow = (i) => {
    barcodeData.splice(i, 1);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateBarcodeTable();
  };

  updateBarcodeTable();
});
