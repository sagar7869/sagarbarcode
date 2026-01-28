const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbybuMNHEyOEtOzLICttGMC_aVj6gO3pfeCQ4Tj9KJF1TFfmp71TqzJXgGcsG5wS2w48/exec";

document.addEventListener("DOMContentLoaded", () => {
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let barcodeScanner = null;

  const readerDiv = document.getElementById("reader");
  const entryFields = document.getElementById("entryFields");
  const barcodeInput = document.getElementById("barcode");
  const photoInput = document.getElementById("photo");
  const remarkInput = document.getElementById("remark");
  const dateTimeInput = document.getElementById("datetime");
  const table = document.getElementById("table");

  /* --- TABS --- */
  document.querySelectorAll(".tabBtn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tabBtn").forEach(t => t.classList.remove("activeTab"));
      btn.classList.add("activeTab");
    };
  });

  /* --- SCANNER --- */
  document.getElementById("startScan").onclick = () => {
    readerDiv.style.display = "block";
    barcodeScanner = new Html5Qrcode("reader");
    barcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
      code => {
        barcodeScanner.stop().then(() => {
          readerDiv.style.display = "none";
          new Audio("https://www.soundjay.com/button/beep-07.wav").play();
          showEntryForm(code);
        });
      }
    );
  };

  function showEntryForm(code) {
    entryFields.style.display = "block";
    barcodeInput.value = code;
    dateTimeInput.value = new Date().toLocaleString('en-GB');
  }

  /* --- SUBMIT SINGLE --- */
  document.getElementById("submitBtn").onclick = () => {
    const now = new Date();
    const entry = {
      module: barcodeInput.value,
      image: photoInput.value,
      remark: remarkInput.value,
      date: now.toLocaleDateString('en-GB'),
      datetime: now.toLocaleString('en-GB')
    };

    barcodeData.push(entry);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateTable();

    // Direct Sync to Sheet
    fetch(WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    }).then(() => alert("Data sent to Sheet!"));

    entryFields.style.display = "none";
  };

  /* --- BATCH SYNC --- */
  document.getElementById("syncBtn").onclick = () => {
    if (barcodeData.length === 0) return alert("No data to sync");
    fetch(WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: barcodeData })
    }).then(() => alert("All Data Synced Successfully!"));
  };

  function updateTable() {
    table.innerHTML = "<tr><th>Module</th><th>Image</th><th>Remark</th><th>Date/Time</th><th>Del</th></tr>";
    barcodeData.forEach((e, i) => {
      const row = table.insertRow(-1);
      row.innerHTML = `<td>${e.module}</td><td>${e.image}</td><td>${e.remark}</td><td>${e.datetime}</td>
      <td><button onclick="deleteRow(${i})" style="background:red; width:auto;">X</button></td>`;
    });
    document.getElementById("totalCount").innerText = barcodeData.length;
  }

  window.deleteRow = (i) => {
    barcodeData.splice(i, 1);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateTable();
  };

  updateTable();
});
