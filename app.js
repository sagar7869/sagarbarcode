const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbynvx2DNtRsFsFZ3divqxflxKLWITsbqYfCwV2NSFOpSnuZBRy2ettWFjux4OLSdQFv/exec";

let barcodeScanner = null;
let qrScanner = null;
let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
let qrData = JSON.parse(localStorage.getItem("qrData") || "[]");

const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");
beep.volume = 1;

document.addEventListener("DOMContentLoaded", () => {

  // Tabs
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");
  sections.forEach(s => s.style.display="none");
  tabs.forEach(btn => btn.onclick = () => {
    tabs.forEach(t=>t.classList.remove("activeTab"));
    sections.forEach(s=>s.style.display="none");
    btn.classList.add("activeTab");
    document.getElementById(btn.dataset.tab).style.display="block";
  });
  tabs[0].click();

  // Camera top placeholder
  const readerParent = document.getElementById("reader");
  document.getElementById("cameraTop").appendChild(readerParent);

  // OCR Button inject
  const ocrBtn = document.createElement("button");
  ocrBtn.innerText = "Use OCR (Damaged Barcode)";
  document.getElementById("ocrSlot").appendChild(ocrBtn);
  ocrBtn.onclick = startOCR;

  // Barcode scan
  document.getElementById("startScan").onclick = () => {
    stopAll();
    barcodeScanner = new Html5Qrcode("reader");
    barcodeScanner.start({facingMode:"environment"},{fps:10, qrbox:250}, code=>{
      barcodeScanner.stop();
      beep.play();
      showBarcodeFields(code);
    });
  };

  document.getElementById("stopScan").onclick = stopAll;

  document.getElementById("retryBtn").onclick = ()=>document.getElementById("entryFields").style.display="none";

  document.getElementById("submitBtn").onclick = ()=>{
    const entry = {
      barcode: barcode.value,
      photo: photo.value,
      remark: remark.value,
      datetime: datetime.value,
      sent:false
    };
    barcodeData.push(entry);
    localStorage.setItem("barcodeData",JSON.stringify(barcodeData));
    updateTable();
    sendSingle(entry);
  };

  // Table update
  function updateTable(){
    const t=document.getElementById("table");
    t.innerHTML="<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";
    barcodeData.forEach((e,i)=>{
      const r=t.insertRow();
      r.insertCell(0).innerText=e.barcode;
      r.insertCell(1).innerText=e.photo;
      r.insertCell(2).innerText=e.remark;
      r.insertCell(3).innerText=e.datetime;
      const d=r.insertCell(4);
      const btn=document.createElement("button");
      btn.innerText="❌";
      btn.onclick=()=>{ barcodeData.splice(i,1); localStorage.setItem("barcodeData",JSON.stringify(barcodeData)); updateTable(); };
      d.appendChild(btn);
    });
    totalCount.innerText = barcodeData.length;
  }
  updateTable();

  // Actions
  copyBtn.onclick = ()=>copyCSV(barcodeData);
  saveLocalBtn.onclick = ()=>alert("Already saved locally");
  exportBtn.onclick = ()=>exportCSV(barcodeData,"Barcode_Data.csv");
  syncSheetBtn.onclick = ()=>syncAll();

  // QR Scan
  startQR.onclick = ()=>{
    stopAll();
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start({facingMode:"environment"},{fps:10,qrbox:250}, code=>{
      qrScanner.stop();
      beep.play();
      qrField.value = code;
      qrData.push({text:code,time:new Date().toLocaleString()});
      localStorage.setItem("qrData",JSON.stringify(qrData));
      totalQRCount.innerText = qrData.length;
    });
  };
  stopQR.onclick = stopAll;
  copyQR.onclick = ()=>navigator.clipboard.writeText(qrField.value);
  saveQR.onclick = ()=>alert("Auto saved");
  exportQR.onclick = ()=>exportCSV(qrData,"QR_Data.csv");

});

/* ================= HELPERS ================= */
function stopAll(){ if(barcodeScanner)barcodeScanner.stop().catch(()=>{}); if(qrScanner)qrScanner.stop().catch(()=>{}); }
function copyCSV(arr){ if(!arr.length)return; let csv=Object.keys(arr[0]).join(",")+"\n"; arr.forEach(o=>csv+=Object.values(o).join(",")+"\n"); navigator.clipboard.writeText(csv); }
function exportCSV(arr,name){ if(!arr.length)return; let csv=Object.keys(arr[0]).join(",")+"\n"; arr.forEach(o=>csv+=Object.values(o).join(",")+"\n"); const b=new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=name; a.click(); }

function sendSingle(entry){ fetch(WEBAPP_URL,{method:"POST",body:JSON.stringify(entry)}).then(()=>{ entry.sent=true; localStorage.setItem("barcodeData",JSON.stringify(barcodeData)); alert("Google Sheet updated ✅"); }).catch(()=>alert("Sheet error ❌")); }
function syncAll(){ const unsent=barcodeData.filter(e=>!e.sent); if(!unsent.length)return alert("Nothing to sync"); fetch(WEBAPP_URL,{method:"POST",body:JSON.stringify({entries:unsent})}).then(()=>{ unsent.forEach(e=>e.sent=true); localStorage.setItem("barcodeData",JSON.stringify(barcodeData)); alert("All pending synced ✅"); }); }

/* ================= OCR ================= */
function startOCR(){
  if(!window.Tesseract){ alert("OCR library loading..."); return; }
  const reader = document.getElementById("reader");
  const video = reader.querySelector("
