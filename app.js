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
  tabs[0].click();

  /* ---------------- COMMON ---------------- */
  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

  /* =====================================================
     BARCODE DATA
  ===================================================== */
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let syncedBarcodes = JSON.parse(localStorage.getItem("syncedBarcodes") || "[]");

  let barcodeScanner = null;
  const readerDiv = document.getElementById("reader");
  const entryFields = document.getElementById("entryFields");

  readerDiv.style.display = "none";
  entryFields.style.display = "none";

  updateBarcodeTable();

  /* ---------------- START SCAN ---------------- */
  startScan.onclick = () => {
    readerDiv.style.display = "block";
    entryFields.style.display = "none";

    barcodeScanner = new Html5Qrcode("reader");
    barcodeScanner.start(
      { facingMode: "environment" },
      { fps: 15, qrbox: { width: 250, height: 120 } },
      code => {
        stopCamera();
        beep.play();
        showFields(code);
      }
    );
  };

  stopScan.onclick = () => stopCamera();

  function stopCamera() {
    if (barcodeScanner) {
      barcodeScanner.stop().then(() => {
        barcodeScanner.clear();
        barcodeScanner = null;
        readerDiv.style.display = "none";
      });
    }
  }

  function showFields(code) {
    entryFields.style.display = "block";
    barcode.value = code;
    photo.value = "";
    remark.value = "";
    datetime.value = new Date().toLocaleString("en-GB");
  }

  retryBtn.onclick = () => entryFields.style.display = "none";

  /* ---------------- SUBMIT (SINGLE ENTRY) ---------------- */
  submitBtn.onclick = () => {
    const entry = {
      barcode: barcode.value.trim(),
      photo: photo.value.trim(),
      remark: remark.value.trim(),
      datetime: datetime.value
    };

    if (!entry.barcode) return alert("Scan first");

    barcodeData.push(entry);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateBarcodeTable();

    sendSingleToSheet(entry);
    entryFields.style.display = "none";
  };

  function sendSingleToSheet(entry) {
    fetch(WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: entry.barcode,
        image: entry.photo,
        remark: entry.remark,
        datetime: entry.datetime,
        date: entry.datetime.split(",")[0]
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === "success") {
          syncedBarcodes.push(entry.barcode);
          localStorage.setItem("syncedBarcodes", JSON.stringify(syncedBarcodes));
          alert("✅ Google Sheet updated");
        }
        else if (res.status === "duplicate") {
          alert("⚠️ Duplicate entry");
        }
      })
      .catch(() => alert("❌ Network / Script error"));
  }

  /* =====================================================
     🔥 UPDATE GOOGLE SHEET (BATCH FIX)
  ===================================================== */
  syncBtn.onclick = () => {

    const pending = barcodeData.filter(
      e => !syncedBarcodes.includes(e.barcode)
    );

    if (pending.length === 0) {
      alert("✔️ All data already synced");
      return;
    }

    const payload = {
      entries: pending.map(e => ({
        module: e.barcode,
        image: e.photo,
        remark: e.remark,
        datetime: e.datetime,
        date: e.datetime.split(",")[0]
      }))
    };

    fetch(WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === "success") {
          pending.forEach(p => syncedBarcodes.push(p.barcode));
          localStorage.setItem("syncedBarcodes", JSON.stringify(syncedBarcodes));
          alert(`✅ ${res.inserted} record Google Sheet me update hue`);
        } else {
          alert("❌ Sheet error");
        }
      })
      .catch(() => alert("❌ Network / Script error"));
  };

  /* ---------------- TABLE ---------------- */
  function updateBarcodeTable() {
    table.innerHTML =
      "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";

    barcodeData.forEach((e, i) => {
      const r = table.insertRow(-1);
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

});
