const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- TAB SWITCH ---------------- */
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");

  sections.forEach(s => s.style.display = "none");

  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(t => t.classList.remove("activeTab"));
      sections.forEach(s => s.style.display = "none");

      document.getElementById(btn.dataset.tab).style.display = "block";
      btn.classList.add("activeTab");
    };
  });

  tabs[0].click(); // default tab

  /* ---------------- COMMON ---------------- */
  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

  /* =====================================================
     BARCODE SECTION
  ===================================================== */
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let syncedBarcodes = JSON.parse(localStorage.getItem("syncedBarcodes") || "[]");

  let barcodeScanner = null;

  const readerDiv = document.getElementById("reader");
  const entryFields = document.getElementById("entryFields");

  readerDiv.style.display = "none";
  entryFields.style.display = "none";

  updateBarcodeTable();

  /* -------- START BARCODE SCAN -------- */
  document.getElementById("startScan").onclick = () => {

    readerDiv.style.display = "block";
    entryFields.style.display = "none";

    barcodeScanner = new Html5Qrcode("reader");

    barcodeScanner.start(
      { facingMode: "environment" },
      {
        fps: 15,
        qrbox: { width: 250, height: 120 }, // barcode friendly
        aspectRatio: 1.777
      },
      decodedText => {
        // 🔥 SINGLE SCAN ONLY
        stopBarcodeCamera();
        beep.play();
        showBarcodeFields(decodedText);
      },
      error => {
        // silent scan errors
      }
    ).catch(err => {
      alert("Camera error: " + err);
    });
  };

  /* -------- STOP BARCODE SCAN -------- */
  document.getElementById("stopScan").onclick = () => {
    stopBarcodeCamera();
  };

  function stopBarcodeCamera() {
    if (barcodeScanner) {
      barcodeScanner.stop().then(() => {
        barcodeScanner.clear();
        barcodeScanner = null;
        readerDiv.style.display = "none";
      });
    }
  }

  function showBarcodeFields(code) {
    entryFields.style.display = "block";
    barcode.value = code;
    photo.value = "";
    remark.value = "";
    datetime.value = new Date().toLocaleString("en-GB");
  }

  document.getElementById("retryBtn").onclick = () => {
    entryFields.style.display = "none";
  };

  /* -------- SUBMIT BARCODE -------- */
  document.getElementById("submitBtn").onclick = () => {

    const entry = {
      barcode: barcode.value.trim(),
      photo: photo.value.trim(),
      remark: remark.value.trim(),
      datetime: datetime.value
    };

    if (!entry.barcode) {
      alert("Scan barcode first");
      return;
    }

    barcodeData.push(entry);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateBarcodeTable();

    sendBarcodeToSheet(entry, true);
    entryFields.style.display = "none";
  };

  /* -------- GOOGLE SHEET SYNC (FIXED) -------- */
  function sendBarcodeToSheet(entry, realtime = false) {

    const payload = {
      module: entry.barcode,
      image: entry.photo || "",
      remark: entry.remark || "",
      datetime: entry.datetime || "",
      date: entry.datetime ? entry.datetime.split(",")[0] : ""
    };

    fetch(WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === "success") {
          syncedBarcodes.push(entry.barcode);
          localStorage.setItem("syncedBarcodes", JSON.stringify(syncedBarcodes));
          if (realtime) alert("✅ Google Sheet updated");
        }
        else if (res.status === "duplicate") {
          if (realtime) alert("⚠️ Already exists in Sheet");
        }
        else {
          alert("❌ Sheet error");
        }
      })
      .catch(() => {
        alert("❌ Network / Script error");
      });
  }

  /* -------- BARCODE TABLE -------- */
  function updateBarcodeTable() {
    const t = document.getElementById("table");
    t.innerHTML =
      "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";

    barcodeData.forEach((e, i) => {
      const r = t.insertRow(-1);
      r.insertCell(0).innerText = e.barcode;
      r.insertCell(1).innerText = e.photo;
      r.insertCell(2).innerText = e.remark;
      r.insertCell(3).innerText = e.datetime;

      const d = r.insertCell(4);
      const b = document.createElement("button");
      b.innerText = "Delete";
      b.onclick = () => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
      };
      d.appendChild(b);
    });

    totalCount.innerText = barcodeData.length;
  }

  /* =====================================================
     QR SECTION
  ===================================================== */
  let qrData = JSON.parse(localStorage.getItem("qrData") || "[]");
  let qrScanner = null;

  const qrReader = document.getElementById("qr-reader");
  qrReader.style.display = "none";

  updateQRCount();

  document.getElementById("startQR").onclick = () => {

    qrReader.style.display = "block";

    qrScanner = new Html5Qrcode("qr-reader");

    qrScanner.start(
      { facingMode: "environment" },
      { fps: 15, qrbox: 250 },
      code => {
        stopQR();
        beep.play();
        qrField.value = code;
        qrData.push(code);
        localStorage.setItem("qrData", JSON.stringify(qrData));
        updateQRCount();
      }
    ).catch(err => alert("QR Camera error: " + err));
  };

  document.getElementById("stopQR").onclick = () => {
    stopQR();
  };

  function stopQR() {
    if (qrScanner) {
      qrScanner.stop().then(() => {
        qrScanner.clear();
        qrScanner = null;
        qrReader.style.display = "none";
      });
    }
  }

  function updateQRCount() {
    totalQRCount.innerText = qrData.length;
  }

});
