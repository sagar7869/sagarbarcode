const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbynvx2DNtRsFsFZ3divqxflxKLWITsbqYfCwV2NSFOpSnuZBRy2ettWFjux4OLSdQFv/exec";

let barcodeScanner = null;
let qrScanner = null;
let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
let qrData = JSON.parse(localStorage.getItem("qrData") || "[]");

const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");
beep.volume = 1;

document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- TAB FIX ---------------- */
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");

  sections.forEach(s => s.style.display = "none");

  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(b => b.classList.remove("activeTab"));
      sections.forEach(s => s.style.display = "none");

      btn.classList.add("activeTab");
      document.getElementById(btn.dataset.tab).style.display = "block";
    };
  });

  tabs[0].click();

  /* ---------------- CAMERA POSITION FIX ---------------- */
  moveCameraTop("reader");
  moveCameraTop("qr-reader");

  /* ---------------- BARCODE SCAN ---------------- */
  document.getElementById("startScan").onclick = () => {
    stopAll();

    barcodeScanner = new Html5Qrcode("reader");
    barcodeScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      text => {
        barcodeScanner.stop();
        beep.play();

        document.getElementById("entryFields").style.display = "block";
        document.getElementById("barcode").value = text;
        document.getElementById("barcode").style.border = "2px solid green";
        document.getElementById("datetime").value = new Date().toLocaleString("en-GB");
      }
    );
  };

  document.getElementById("stopScan").onclick = stopAll;

  document.getElementById("retryBtn").onclick = () => {
    document.getElementById("entryFields").style.display = "none";
  };

  document.getElementById("submitBtn").onclick = () => {
    const entry = {
      barcode: barcode.value,
      photo: photo.value,
      remark: remark.value,
      datetime: datetime.value,
      sent: false
    };

    barcodeData.push(entry);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateTable();
    sendSingle(entry);
  };

  /* ---------------- BARCODE TABLE ---------------- */
  function updateTable() {
    const t = document.getElementById("table");
    t.innerHTML =
      "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Del</th></tr>";

    barcodeData.forEach((e, i) => {
      const r = t.insertRow();
      r.insertCell(0).innerText = e.barcode;
      r.insertCell(1).innerText = e.photo;
      r.insertCell(2).innerText = e.remark;
      r.insertCell(3).innerText = e.datetime;
      const d = r.insertCell(4);
      d.innerHTML = "<button>❌</button>";
      d.onclick = () => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
      };
    });

    totalCount.innerText = barcodeData.length;
  }

  updateTable();

  /* ---------------- BARCODE ACTIONS ---------------- */
  copyBtn.onclick = () => copyCSV(barcodeData);
  saveLocalBtn.onclick = () => alert("Already auto-saved locally");
  exportBtn.onclick = () => exportCSV(barcodeData, "Barcode_Data.csv");

  /* ---------------- GOOGLE SHEET SYNC ---------------- */
  function sendSingle(entry) {
    fetch(WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify(entry)
    }).then(() => {
      entry.sent = true;
      localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
      alert("Google Sheet updated ✅");
    }).catch(() => alert("Sheet error ❌"));
  }

  window.syncAll = () => {
    const unsent = barcodeData.filter(e => !e.sent);
    if (!unsent.length) return alert("Nothing to sync");

    fetch(WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify({ entries: unsent })
    }).then(() => {
      unsent.forEach(e => e.sent = true);
      localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
      alert("All pending synced ✅");
    });
  };

  injectSyncButton();

  /* ---------------- QR SCAN FIX ---------------- */
  startQR.onclick = () => {
    stopAll();

    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      text => {
        qrScanner.stop();
        beep.play();
        qrField.value = text;
        qrData.push({ text, time: new Date().toLocaleString() });
        localStorage.setItem("qrData", JSON.stringify(qrData));
        totalQRCount.innerText = qrData.length;
      }
    );
  };

  stopQR.onclick = stopAll;

  copyQR.onclick = () => navigator.clipboard.writeText(qrField.value);
  saveQR.onclick = () => alert("Auto saved");
  exportQR.onclick = () => exportCSV(qrData, "QR_Data.csv");

  totalQRCount.innerText = qrData.length;

  /* ---------------- OCR (NO HTML CHANGE) ---------------- */
  injectOCR();

});

/* ================= HELPERS ================= */

function stopAll() {
  if (barcodeScanner) barcodeScanner.stop().catch(()=>{});
  if (qrScanner) qrScanner.stop().catch(()=>{});
}

function copyCSV(arr) {
  let csv = Object.keys(arr[0] || {}).join(",") + "\n";
  arr.forEach(o => csv += Object.values(o).join(",") + "\n");
  navigator.clipboard.writeText(csv);
}

function exportCSV(arr, name) {
  let csv = Object.keys(arr[0] || {}).join(",") + "\n";
  arr.forEach(o => csv += Object.values(o).join(",") + "\n");
  const b = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
}

function injectSyncButton() {
  const div = document.querySelector(".actions");
  const b = document.createElement("button");
  b.innerText = "Update Google Sheet";
  b.onclick = () => syncAll();
  div.appendChild(b);
}

function moveCameraTop(id) {
  const el = document.getElementById(id);
  if (el) document.body.prepend(el);
}

function injectOCR() {
  const s = document.createElement("script");
  s.src = "https://unpkg.com/tesseract.js@4.0.2/dist/tesseract.min.js";
  document.head.appendChild(s);

  const f = document.getElementById("entryFields");
  const b = document.createElement("button");
  b.innerText = "Use OCR (Damaged Barcode)";
  b.onclick = () => alert("OCR placeholder – logic attached");
  f.prepend(b);
}
