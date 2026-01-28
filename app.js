const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

document.addEventListener("DOMContentLoaded", ()=>{

  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");
  sections.forEach(s => s.style.display="none");
  tabs.forEach(btn=>btn.addEventListener("click", ()=>{
    sections.forEach(s=>s.style.display="none");
    tabs.forEach(t=>t.classList.remove("activeTab"));
    document.getElementById(btn.dataset.tab).style.display="block";
    btn.classList.add("activeTab");
  }));

  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let syncedBarcodes = JSON.parse(localStorage.getItem("syncedBarcodes") || "[]");
  let scanner;
  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

  function showOverlay(card, show){
    const overlay = card.querySelector(".scan-overlay");
    if(overlay) overlay.style.display = show ? "block" : "none";
  }

  // ---------- BARCODE ----------
  const readerCard = document.getElementById("reader").parentElement;
  document.getElementById("startScan").onclick = ()=>{
    scanner = new Html5Qrcode("reader");
    showOverlay(readerCard,true);
    scanner.start({facingMode:"environment"},{fps:10, qrbox:250}, code=>{
      scanner.stop().then(()=>{
        beep.play();
        showOverlay(readerCard,false);
        showBarcodeFields(code);
      });
    });
  };
  document.getElementById("stopScan").onclick = ()=>{ if(scanner) {scanner.stop(); showOverlay(readerCard,false);} };

  function showBarcodeFields(code){
    document.getElementById("entryFields").style.display="block";
    document.getElementById("barcode").value = code;
    document.getElementById("photo").value = "";
    document.getElementById("remark").value = "";
    document.getElementById("datetime").value = new Date().toLocaleString("en-GB");
  }
  document.getElementById("retryBtn").onclick = ()=>document.getElementById("entryFields").style.display="none";

  // table, submit, sync etc same as your original JS (copy-paste your previous functions here)
  // Barcode table update
  function updateBarcodeTable(){
    const t = document.getElementById("table");
    t.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";
    barcodeData.forEach((e,i)=>{
      const r = t.insertRow(-1);
      r.insertCell(0).innerText=e.barcode;
      r.insertCell(1).innerText=e.photo;
      r.insertCell(2).innerText=e.remark;
      r.insertCell(3).innerText=e.datetime;
      const d = r.insertCell(4);
      const b = document.createElement("button");
      b.innerText="Delete";
      b.onclick=()=>{
        barcodeData.splice(i,1);
        localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
        updateBarcodeTable();
      };
      d.appendChild(b);
    });
    document.getElementById("totalCount").innerText = barcodeData.length;
  }
  updateBarcodeTable();

  // ---------- QR CODE ----------
  const qrCard = document.getElementById("qr-reader").parentElement;
  let qrData = JSON.parse(localStorage.getItem("qrData") || "[]");
  function updateQRCount(){ document.getElementById("totalQRCount").innerText = qrData.length; }
  updateQRCount();

  document.getElementById("startQR").onclick = ()=>{
    let qrScanner = new Html5Qrcode("qr-reader");
    showOverlay(qrCard,true);
    qrScanner.start({facingMode:"environment"},{fps:10, qrbox:250}, code=>{
      qrScanner.stop().then(()=>{
        beep.play();
        showOverlay(qrCard,false);
        document.getElementById("qrField").value = code;
        qrData.push(code);
        localStorage.setItem("qrData", JSON.stringify(qrData));
        updateQRCount();
      });
    });
  };
  document.getElementById("stopQR").onclick = ()=>{ showOverlay(qrCard,false); };

});
