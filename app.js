const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let qrDataList = JSON.parse(localStorage.getItem("qrDataList") || "[]");
  let barcodeScanner = null;
  let qrScanner = null;

  /* --- TAB SYSTEM --- */
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");

  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(t => t.classList.remove("activeTab"));
      sections.forEach(s => s.style.display = "none");
      btn.classList.add("activeTab");
      document.getElementById(btn.dataset.tab).style.display = "block";
      
      // Tab badalte waqt dono camera band karein
      stopBarcodeCamera();
      stopQRCamera();
    };
  });

  /* --- BARCODE LOGIC --- */
  document.getElementById("startScan").onclick = () => {
    const readerElement = document.getElementById("reader");
    readerElement.style.display = "block";
    
    if (!barcodeScanner) {
        barcodeScanner = new Html5Qrcode("reader");
    }

    barcodeScanner.start(
      { facingMode: "environment" }, 
      { fps: 10, qrbox: 250 }, 
      code => {
        stopBarcodeCamera(); // Scan hote hi camera band
        document.getElementById("entryFields").style.display = "block";
        document.getElementById("barcode").value = code;
        document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
        new Audio("https://www.soundjay.com/button/beep-07.wav").play();
      }
    ).catch(err => console.error("Start Error:", err));
  };

  // STOP BARCODE BUTTON
  document.getElementById("stopScan").onclick = () => {
    stopBarcodeCamera();
  };

  function stopBarcodeCamera() {
    const readerElement = document.getElementById("reader");
    if (barcodeScanner && barcodeScanner.getState() > 1) { // Check if scanning
      barcodeScanner.stop().then(() => {
        barcodeScanner.clear();
        readerElement.style.display = "none";
        console.log("Barcode Camera Stopped");
      }).catch(err => {
        console.warn("Stop failed, forcing hide:", err);
        readerElement.style.display = "none";
      });
    } else {
      readerElement.style.display = "none";
    }
  }

  /* --- QR LOGIC --- */
  document.getElementById("startQR").onclick = () => {
    const qrReaderElement = document.getElementById("qr-reader");
    qrReaderElement.style.display = "block";

    if (!qrScanner) {
        qrScanner = new Html5Qrcode("qr-reader");
    }

    qrScanner.start(
      { facingMode: "environment" }, 
      { fps: 10, qrbox: 250 }, 
      code => {
        stopQRCamera();
        document.getElementById("qrField").value = code;
        qrDataList.push({data: code, time: new Date().toLocaleString()});
        localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
        alert("QR Scanned & Saved!");
      }
    ).catch(err => console.error("QR Start Error:", err));
  };

  // STOP QR BUTTON
  document.getElementById("stopQR").onclick = () => {
    stopQRCamera();
  };

  function stopQRCamera() {
    const qrReaderElement = document.getElementById("qr-reader");
    if (qrScanner && qrScanner.getState() > 1) {
      qrScanner.stop().then(() => {
        qrScanner.clear();
        qrReaderElement.style.display = "none";
        console.log("QR Camera Stopped");
      }).catch(err => {
        console.warn("QR Stop failed, forcing hide:", err);
        qrReaderElement.style.display = "none";
      });
    } else {
      qrReaderElement.style.display = "none";
    }
  }

  /* --- BAAKI FUNCTIONS (Submit, Copy, Export) --- */
  // ... (Aapka purana Submit, Copy, Export aur Update Table ka code yahan rahega)
  // Bas dhyan dein ki updateBarcodeTable() function mein 'Module SR NO' column headers sheet ke mutabik ho.

  /* --- SUBMIT TO SHEET --- */
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
    table.innerHTML = "<tr><th>Module SR NO</th><th>Image NO</th><th>Remark</th><th>Date</th><th>Date Time</th><th>Del</th></tr>";
    barcodeData.forEach((e, i) => {
      const row = table.insertRow(-1);
      row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.date || ''}</td><td>${e.datetime}</td>
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
