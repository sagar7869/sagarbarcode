const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- TAB ---------------- */
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");

  tabs.forEach(btn => {
    btn.onclick = () => {
      tabs.forEach(b => b.classList.remove("activeTab"));
      sections.forEach(s => s.style.display = "none");
      btn.classList.add("activeTab");
      document.getElementById(btn.dataset.tab).style.display = "block";
    };
  });

  tabs[0].click(); // default open

  /* ---------------- BARCODE ---------------- */
  let barcodeScanner = null;
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");

  document.getElementById("startScan").onclick = async () => {
    const reader = document.getElementById("reader");
    reader.style.display = "block";

    await new Promise(r => setTimeout(r, 300));

    if (barcodeScanner) {
      await barcodeScanner.clear().catch(()=>{});
    }

    barcodeScanner = new Html5Qrcode("reader");

    barcodeScanner.start(
      { facingMode: "environment" },
      { fps: 12, qrbox: { width: 300, height: 120 } },
      async (code) => {
        await barcodeScanner.stop();
        reader.style.display = "none";

        document.getElementById("entryFields").style.display = "block";
        barcode.value = code;
        photo.value = "";
        remark.value = "";
        datetime.value = new Date().toLocaleString("en-GB");
      }
    );
  };

  document.getElementById("stopScan").onclick = async () => {
    if (barcodeScanner) {
      await barcodeScanner.stop().catch(()=>{});
      document.getElementById("reader").style.display = "none";
    }
  };

  submitBtn.onclick = () => {
    if (!barcode.value) return alert("Scan first");

    barcodeData.push({
      barcode: barcode.value,
      photo: photo.value,
      remark: remark.value,
      datetime: datetime.value
    });

    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateTable();
    entryFields.style.display = "none";
  };

  function updateTable() {
    table.innerHTML =
      "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date</th></tr>";

    barcodeData.forEach(e => {
      const r = table.insertRow();
      r.insertCell(0).innerText = e.barcode;
      r.insertCell(1).innerText = e.photo;
      r.insertCell(2).innerText = e.remark;
      r.insertCell(3).innerText = e.datetime;
    });

    totalCount.innerText = barcodeData.length;
  }

  updateTable();

  /* ---------------- QR ---------------- */
  let qrScanner = null;
  let qrData = JSON.parse(localStorage.getItem("qrData") || "[]");

  document.getElementById("startQR").onclick = async () => {
    const qrReader = document.getElementById("qr-reader");
    qrReader.style.display = "block";

    await new Promise(r => setTimeout(r, 300));

    if (qrScanner) {
      await qrScanner.clear().catch(()=>{});
    }

    qrScanner = new Html5Qrcode("qr-reader");

    qrScanner.start(
      { facingMode: "environment" },
      { fps: 12, qrbox: 220 },
      async (code) => {
        await qrScanner.stop();
        qrReader.style.display = "none";
        qrField.value = code;

        qrData.push(code);
        localStorage.setItem("qrData", JSON.stringify(qrData));
        totalQRCount.innerText = qrData.length;
      }
    );
  };

  document.getElementById("stopQR").onclick = async () => {
    if (qrScanner) {
      await qrScanner.stop().catch(()=>{});
      document.getElementById("qr-reader").style.display = "none";
    }
  };

});
