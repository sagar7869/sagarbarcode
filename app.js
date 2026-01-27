const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbynvx2DNtRsFsFZ3divqxflxKLWITsbqYfCwV2NSFOpSnuZBRy2ettWFjux4OLSdQFv/exec";

document.addEventListener("DOMContentLoaded", ()=>{
  // Tab Switch
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");
  sections.forEach(s=>s.style.display="none");

  tabs.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      sections.forEach(s=>s.style.display="none");
      tabs.forEach(t=>t.classList.remove("activeTab"));
      document.getElementById(btn.dataset.tab).style.display="block";
      btn.classList.add("activeTab");
    });
  });

  let barcodeData=[], qrData=[];
  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");
  let scanner, ocrScanner, qrScanner;

  // ---------- Barcode ----------
  document.getElementById("startScan").addEventListener("click", ()=>{
    scanner = new Html5Qrcode("reader");
    scanner.start({facingMode:"environment"},{fps:10, qrbox:250}, code=>{
      scanner.stop().then(()=>{
        beep.play();
        showBarcodeFields(code);
      });
    }).catch(err=>alert("Camera error: "+err));
  });
  document.getElementById("stopScan").addEventListener("click", ()=>{ if(scanner) scanner.stop(); });

  function showBarcodeFields(serial){
    const f=document.getElementById("entryFields");
    f.style.display="block";
    document.getElementById("barcode").value = serial;
    document.getElementById("barcode").style.border="2px solid green";
    document.getElementById("photo").value="";
    document.getElementById("remark").value="";
    document.getElementById("datetime").value = new Date().toLocaleString("en-GB");
  }

  document.getElementById("retryBtn").addEventListener("click", ()=>{ document.getElementById("entryFields").style.display="none"; });

  document.getElementById("startOCR").addEventListener("click", ()=>{
    ocrScanner = new Html5Qrcode("reader");
    ocrScanner.start({facingMode:"environment"},{fps:10, qrbox:250}, code=>{
      ocrScanner.stop();
      beep.play();
      document.getElementById("barcode").value = code;
      document.getElementById("barcode").style.border="2px solid green";
    }).catch(err=>alert("OCR Camera error"));
  });
  document.getElementById("stopOCR").addEventListener("click", ()=>{ if(ocrScanner) ocrScanner.stop(); });

  document.getElementById("submitBtn").addEventListener("click", ()=>{
    const barcode=document.getElementById("barcode").value;
    const photo=document.getElementById("photo").
