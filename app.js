const WEBAPP_URL =
"https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- TAB SWITCH ---------------- */
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("activeTab"));
      sections.forEach(s => s.style.display = "none");

      btn.classList.add("activeTab");
      document.getElementById(btn.dataset.tab).style.display = "block";
    });
  });

  /* ---------------- DATA ---------------- */
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData")) || [];
  let sentSerials = JSON.parse(localStorage.getItem("sentSerials")) || [];

  updateTable();

  /* ---------------- BARCODE SCAN ---------------- */
  let scanner;
  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

  document.getElementById("startScan").onclick = () => {
    scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
      code => {
        scanner.stop();
        beep.play();
        showFields(code);
      }
    );
  };

  document.getElementById("stopScan").onclick = () => {
    if (scanner) scanner.stop();
  };

  function showFields(serial) {
    document.getElementById("entryFields").style.display = "block";
    document.getElementById("barcode").value = serial;
    document.getElementById("datetime").value =
      new Date().toLocaleString("en-GB");
  }

  document.getElementById("retryBtn").onclick = () => {
    document.getElementById("entryFields").style.display = "none";
  };

  /* ---------------- SUBMIT ---------------- */
  document.getElementById("submitBtn").onclick = () => {
    const entry = {
      barcode: barcode.value.trim(),
      photo: photo.value.trim(),
      remark: remark.value.trim(),
      datetime: datetime.value
    };

    if (!entry.barcode) return alert("Scan first");

    barcodeData.push(entry);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateTable();

    sendToSheet(entry);
  };

  /* ---------------- GOOGLE SHEET PUSH ---------------- */
  function sendToSheet(entry) {
    if (sentSerials.includes(entry.barcode)) return;

    fetch(WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify(entry)
    })
      .then(r => r.json())
      .then(() => {
        sentSerials.push(entry.barcode);
        localStorage.setItem("sentSerials", JSON.stringify(sentSerials));
        alert("✅ Google Sheet updated");
      })
      .catch(() => alert("❌ Sheet error"));
  }

  /* ---------------- SYNC BUTTON ---------------- */
  document.getElementById("syncSheetBtn").onclick = () => {
    let pending = barcodeData.filter(
      e => !sentSerials.includes(e.barcode)
    );

    if (pending.length === 0)
      return alert("All data already synced");

    pending.forEach(sendToSheet);
  };

  /* ---------------- TABLE ---------------- */
  function updateTable() {
    const t = document.getElementById("table");
    t.innerHTML =
      "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";

    barcodeData.forEach((e, i) => {
      let r = t.insertRow();
      r.insertCell(0).innerText = e.barcode;
      r.insertCell(1).innerText = e.photo;
      r.insertCell(2).innerText = e.remark;
      r.insertCell(3).innerText = e.datetime;

      let d = document.createElement("button");
      d.innerText = "Delete";
      d.onclick = () => {
        barcodeData.splice(i, 1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateTable();
      };
      r.insertCell(4).appendChild(d);
    });

    document.getElementById("totalCount").innerText = barcodeData.length;
  }

});
