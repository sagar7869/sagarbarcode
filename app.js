const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- TAB SWITCH ---------------- */
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");

  sections.forEach(s => s.style.display = "none");
  document.getElementById("barcodeTab").style.display = "block";

  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(b => b.classList.remove("activeTab"));
      sections.forEach(s => s.style.display = "none");
      btn.classList.add("activeTab");
      document.getElementById(btn.dataset.tab).style.display = "block";
    };
  });

  /* ---------------- COMMON ---------------- */
  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

  /* ================= BARCODE ================= */
  let scanner = null;
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let syncedBarcodes = JSON.parse(localStorage.getItem("syncedBarcodes") || "[]");

  updateBarcodeTable();

  document.getElementById("startScan").onclick = () => {
    document.getElementById("reader").style.display = "block";

    scanner = new Html5Qrcode("reader");
    scanner.start(
      { facingMode: "environment" },
      { fps: 15, qrbox: { width: 280, height: 120 } },
      code => {
        scanner.stop().then(() => {
          beep.play();
          document.getElementById("reader").style.display = "none";
          showBarcodeFields(code);
        });
      }
    ).catch(err => alert("Camera error: " + err));
  };

  document.getElementById("stopScan").onclick = () => {
    if (scanner) {
      scanner.stop();
      document.getElementById("reader").style.display = "none";
    }
  };

  function showBarcodeFields(code) {
    entryFields.style.display = "block";
    barcode.value = code;
    photo.value = "";
    remark.value = "";
    datetime.value = new Date().toLocaleString("en-GB");
  }

  retryBtn.onclick = () => {
    entryFields.style.display = "none";
  };

  submitBtn.onclick = () => {
    const entry = {
      module: barcode.value.trim(),
      image: photo.value.trim(),
      remark: remark.value.trim(),
      datetime: datetime.value
    };

    if (!entry.module) {
      alert("Scan barcode first");
      return;
    }

    barcodeData.push(entry);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateBarcodeTable();

    sendSingleToSheet(entry);
  };

  function sendSingleToSheet(entry) {
    if (syncedBarcodes.includes(entry.module)) return;

    fetch(WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify(entry)
    })
    .then(r => r.json())
    .then(res => {
      if (res.status === "success") {
        syncedBarcodes.push(entry.module);
        localStorage.setItem("syncedBarcodes", JSON.stringify(syncedBarcodes));
        alert("Google Sheet updated ✅");
      } else if (res.status === "duplicate") {
        alert("Already exists in Sheet");
      } else {
        alert("Sheet error");
      }
    })
    .catch(() => alert("Network / Script error"));
  }

  syncBtn.onclick = () => {
    const unsynced = barcodeData.filter(
      e => !syncedBarcodes.includes(e.module)
    );

    if (unsynced.length === 0) {
      alert("No new data to sync");
      return;
    }

    fetch(WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify({ entries: unsynced })
    })
    .then(r => r.json())
    .then(res => {
      if (res.status === "success") {
        unsynced.forEach(e => syncedBarcodes.push(e.module));
        localStorage.setItem("syncedBarcodes", JSON.stringify(syncedBarcodes));
        alert(res.inserted + " records synced ✅");
      } else {
        alert("Sheet error");
      }
    })
    .catch(() => alert("Network / Script error"));
  };

  function updateBarcodeTable() {
    table.innerHTML =
      "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";

    barcodeData.forEach((e, i) => {
      const r = table.insertRow();
      r.insertCell(0).innerText = e.module;
      r.insertCell(1).innerText = e.image;
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

  /* ================= QR ================= */
  let qrScanner = null;
  let qrData = JSON.parse(localStorage.getItem("qrData") || "[]");

  totalQRCount.innerText = qrData.length;

  startQR.onclick = () => {
    document.getElementById("qr-reader").style.display = "block";

    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
      { facingMode: "environment" },
      { fps: 15, qrbox: 250 },
      code => {
        qrScanner.stop().then(() => {
          beep.play();
          qrField.value = code;
          qrData.push(code);
          localStorage.setItem("qrData", JSON.stringify(qrData));
          totalQRCount.innerText = qrData.length;
          document.getElementById("qr-reader").style.display = "none";
        });
      }
    );
  };

  stopQR.onclick = () => {
    if (qrScanner) {
      qrScanner.stop();
      document.getElementById("qr-reader").style.display = "none";
    }
  };

});
