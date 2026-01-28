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
    };
  });

  /* --- BARCODE LOGIC --- */
  document.getElementById("startScan").onclick = () => {
    document.getElementById("reader").style.display = "block";
    barcodeScanner = new Html5Qrcode("reader");
    barcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
      code => {
        barcodeScanner.stop().then(() => {
          document.getElementById("reader").style.display = "none";
          document.getElementById("entryFields").style.display = "block";
          document.getElementById("barcode").value = code;
          document.getElementById("datetime").value = new Date().toLocaleString('en-GB');
          new Audio("https://www.soundjay.com/button/beep-07.wav").play();
        });
      }
    );
  };

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
    
    // Direct send to sheet
    fetch(WEBAPP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(entry) });
    document.getElementById("entryFields").style.display = "none";
  };

  /* --- QR LOGIC --- */
  document.getElementById("startQR").onclick = () => {
    document.getElementById("qr-reader").style.display = "block";
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
      code => {
        qrScanner.stop().then(() => {
          document.getElementById("qr-reader").style.display = "none";
          document.getElementById("qrField").value = code;
          qrDataList.push({data: code, time: new Date().toLocaleString()});
          localStorage.setItem("qrDataList", JSON.stringify(qrDataList));
          alert("QR Saved: " + code);
        });
      }
    );
  };

  /* --- COPY & EXPORT FUNCTIONS (FIXED) --- */
  // Barcode Copy
  document.getElementById("copyBtn").onclick = () => {
    let text = "Serial\tPhoto\tRemark\tDate&Time\n";
    text += barcodeData.map(e => `${e.module}\t${e.image}\t${e.remark}\t${e.datetime}`).join("\n");
    navigator.clipboard.writeText(text).then(() => alert("Barcode Table Copied!"));
  };

  // Barcode Export
  document.getElementById("exportBtn").onclick = () => {
    let csv = "Serial,Photo,Remark,Date,DateTime\n";
    csv += barcodeData.map(e => `${e.module},${e.image},${e.remark},${e.date},${e.datetime}`).join("\n");
    downloadCSV(csv, "Barcode_Data.csv");
  };

  // QR Copy
  document.getElementById("copyQR").onclick = () => {
    let text = qrDataList.map(e => e.data).join("\n");
    navigator.clipboard.writeText(text).then(() => alert("QR Data Copied!"));
  };

  // QR Export
  document.getElementById("exportQR").onclick = () => {
    let csv = "QR Data,Time\n" + qrDataList.map(e => `${e.data},${e.time}`).join("\n");
    downloadCSV(csv, "QR_Data.csv");
  };

  function downloadCSV(csv, filename) {
    let blob = new Blob([csv], { type: "text/csv" });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  function updateBarcodeTable() {
    const table = document.getElementById("table");
    table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";
    barcodeData.forEach((e, i) => {
      const row = table.insertRow(-1);
      row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.datetime}</td>
      <td><button onclick="deleteRow(${i})" style="background:red; color:white; border:none; border-radius:3px;">X</button></td>`;
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
