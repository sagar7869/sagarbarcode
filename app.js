const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- TABS ---------- */
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
  tabs[0].click();

  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

  /* ==================================================
     BARCODE
  ================================================== */
  let scanner = null;
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");

  updateBarcodeTable();

  startScan.onclick = async () => {
    reader.style.display = "block";

    await new Promise(r => setTimeout(r, 300));

    if (scanner) {
      await scanner.clear().catch(()=>{});
      scanner = null;
    }

    scanner = new Html5Qrcode("reader");

    scanner.start(
      { facingMode: "environment" },
      { fps: 12, qrbox: 220 },
      async (code) => {
        beep.play();
        await scanner.stop();
        await scanner.clear();
        scanner = null;

        reader.style.display = "none";
        showFields(code);
      }
    );
  };

  stopScan.onclick = async () => {
    if (scanner) {
      await scanner.stop().catch(()=>{});
      await scanner.clear().catch(()=>{});
      scanner = null;
      reader.style.display = "none";
    }
  };

  function showFields(code) {
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
    if (!barcode.value) return alert("Scan first");

    const e = {
      barcode: barcode.value,
      photo: photo.value,
      remark: remark.value,
      datetime: datetime.value
    };

    barcodeData.push(e);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateBarcodeTable();
  };

  function updateBarcodeTable() {
    table.innerHTML =
      "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date</th><th>Del</th></tr>";
    barcodeData.forEach((e, i) => {
      const r = table.insertRow();
      r.insertCell(0).innerText = e.barcode;
      r.insertCell(1).innerText = e.photo;
      r.insertCell(2).innerText = e.remark;
      r.insertCell(3).innerText = e.datetime;
      const d = r.insertCell(4);
      const b = document.createElement("button");
      b.innerText = "X";
      b.onclick = () => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
      };
      d.appendChild(b);
    });
    totalCount.innerText = barcodeData.length;
  }

  /* ==================================================
     QR CODE (FIXED RESTART ISSUE)
  ================================================== */
  let qrScanner = null;
  let qrData = JSON.parse(localStorage.getItem("qrData") || "[]");
  totalQRCount.innerText = qrData.length;

  startQR.onclick = async () => {
    qr-reader.style.display = "block";

    await new Promise(r => setTimeout(r, 300));

    if (qrScanner) {
      await qrScanner.clear().catch(()=>{});
      qrScanner = null;
    }

    qrScanner = new Html5Qrcode("qr-reader");

    qrScanner.start(
      { facingMode: "environment" },
      { fps: 12, qrbox: 220 },
      async (code) => {
        beep.play();
        await qrScanner.stop();
        await qrScanner.clear();
        qrScanner = null;

        qr-reader.style.display = "none";
        qrField.value = code;

        qrData.push(code);
        localStorage.setItem("qrData", JSON.stringify(qrData));
        totalQRCount.innerText = qrData.length;
      }
    );
  };

  stopQR.onclick = async () => {
    if (qrScanner) {
      await qrScanner.stop().catch(()=>{});
      await qrScanner.clear().catch(()=>{});
      qrScanner = null;
      qr-reader.style.display = "none";
    }
  };

});
