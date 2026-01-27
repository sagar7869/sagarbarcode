const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbynvx2DNtRsFsFZ3divqxflxKLWITsbqYfCwV2NSFOpSnuZBRy2ettWFjux4OLSdQFv/exec";

document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- TAB SWITCH ---------------- */
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");
  sections.forEach(s => s.style.display = "none");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      sections.forEach(s => s.style.display = "none");
      tabs.forEach(t => t.classList.remove("activeTab"));
      document.getElementById(btn.dataset.tab).style.display = "block";
      btn.classList.add("activeTab");
    });
  });

  /* ---------------- COMMON ---------------- */
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let qrData = JSON.parse(localStorage.getItem("qrData") || "[]");

  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");
  beep.volume = 1.0;

  /* ================= BARCODE ================= */
  let barcodeScanner;

  document.getElementById("startScan").onclick = () => {
    barcodeScanner = new Html5Qrcode("reader");
    barcodeScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      code => {
        barcodeScanner.stop();
        beep.play();
        showBarcodeFields(code);
      }
    );
  };

  document.getElementById("stopScan").onclick = () => {
    if (barcodeScanner) barcodeScanner.stop();
  };

  function showBarcodeFields(serial) {
    document.getElementById("entryFields").style.display = "block";
    document.getElementById("barcode").value = serial;
    document.getElementById("photo").value = "";
    document.getElementById("remark").value = "";
    document.getElementById("datetime").value =
      new Date().toLocaleString("en-GB");
  }

  document.getElementById("submitBtn").onclick = () => {
    const entry = {
      module: document.getElementById("barcode").value,
      image: document.getElementById("photo").value,
      remark: document.getElementById("remark").value,
      date: new Date().toLocaleDateString("en-GB"),
      datetime: document.getElementById("datetime").value,
      sent: false
    };

    if (!entry.module) return alert("Scan required");

    barcodeData.push(entry);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateBarcodeTable();
    syncSingle(entry);
  };

  function syncSingle(entry) {
    fetch(WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify(entry)
    })
      .then(r => r.json())
      .then(() => {
        entry.sent = true;
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        alert("Google Sheet updated ✅");
      })
      .catch(() => alert("Network issue – saved locally"));
  }

  document.getElementById("exportBtn").onclick = () => {
    let csv = "Module,Image,Remark,Date,DateTime\n";
    barcodeData.forEach(e => {
      csv += `${e.module},${e.image},${e.remark},${e.date},${e.datetime}\n`;
    });
    downloadCSV(csv, "Barcode_Data.csv");
  };

  document.getElementById("saveLocalBtn").onclick = () => {
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    alert("Saved locally");
  };

  document.getElementById("copyBtn").onclick = () => {
    let txt = barcodeData.map(e =>
      `${e.module}, ${e.image}, ${e.remark}, ${e.datetime}`
    ).join("\n");
    navigator.clipboard.writeText(txt);
    alert("Copied");
  };

  function updateBarcodeTable() {
    const t = document.getElementById("table");
    t.innerHTML =
      "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";
    barcodeData.forEach((e, i) => {
      const r = t.insertRow();
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
    document.getElementById("totalCount").innerText = barcodeData.length;
  }

  updateBarcodeTable();

  /* ================= QR ================= */
  let qrScanner;

  document.getElementById("startQR").onclick = () => {
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      code => {
        qrScanner.stop();
        beep.play();
        qrData.push({ code, sent: false });
        localStorage.setItem("qrData", JSON.stringify(qrData));
        document.getElementById("qrField").value = code;
        updateQRCount();
      }
    );
  };

  document.getElementById("stopQR").onclick = () => {
    if (qrScanner) qrScanner.stop();
  };

  document.getElementById("copyQR").onclick = () => {
    navigator.clipboard.writeText(document.getElementById("qrField").value);
    alert("Copied");
  };

  document.getElementById("saveQR").onclick = () => {
    localStorage.setItem("qrData", JSON.stringify(qrData));
    alert("Saved locally");
  };

  document.getElementById("exportQR").onclick = () => {
    let csv = "QR\n" + qrData.map(q => q.code).join("\n");
    downloadCSV(csv, "QR_Data.csv");
  };

  function updateQRCount() {
    document.getElementById("totalQRCount").innerText = qrData.length;
  }

  updateQRCount();

  /* ---------------- UTIL ---------------- */
  function downloadCSV(data, name) {
    const blob = new Blob([data], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }
});
