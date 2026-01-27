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

  // Data Arrays
  let barcodeData=[], qrData=[];
  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

  // ----------------- Barcode Scan -----------------
  let scanner, ocrScanner;

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

  // OCR Buttons
  document.getElementById("startOCR").addEventListener("click", ()=>{
    ocrScanner = new Html5Qrcode("reader");
    ocrScanner.start({facingMode:"environment"},{fps:10, qrbox:250}, code=>{
      ocrScanner.stop();
      beep.play();
      document.getElementById("barcode").value = code;
      document.getElementById("barcode").style.border="2px solid green";
    }).catch(err=>alert("OCR Camera error: "+err));
  });
  document.getElementById("stopOCR").addEventListener("click", ()=>{ if(ocrScanner) ocrScanner.stop(); });

  // Submit Barcode Entry
  document.getElementById("submitBtn").addEventListener("click", ()=>{
    const barcode=document.getElementById("barcode").value;
    const photo=document.getElementById("photo").value;
    const remark=document.getElementById("remark").value;
    const datetime=document.getElementById("datetime").value;
    if(!barcode) return alert("Scan first!");
    const entry={barcode,photo,remark,datetime};
    barcodeData.push(entry);
    updateBarcodeTable();
  });

  function updateBarcodeTable(){
    const t=document.getElementById("table");
    t.innerHTML="<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";
    barcodeData.forEach((e,i)=>{
      const r=t.insertRow(-1);
      r.insertCell(0).innerText=e.barcode;
      r.insertCell(1).innerText=e.photo;
      r.insertCell(2).innerText=e.remark;
      r.insertCell(3).innerText=e.datetime;
      const delCell=r.insertCell(4);
      const btn=document.createElement("button");
      btn.innerText="Delete";
      btn.onclick=()=>{ barcodeData.splice(i,1); updateBarcodeTable(); };
      delCell.appendChild(btn);
    });
    document.getElementById("totalCount").innerText = barcodeData.length;
  }

  // Barcode Actions
  document.getElementById("copyBtn").addEventListener("click", ()=>{
    let str="Serial,Photo,Remark,Date & Time\n";
    barcodeData.forEach(e=>{ str+=`${e.barcode},${e.photo},${e.remark},${e.datetime}\n`; });
    navigator.clipboard.writeText(str).then(()=>alert("Copied!"));
  });

  document.getElementById("saveLocalBtn").addEventListener("click", ()=>{ localStorage.setItem("barcodeData",JSON.stringify(barcodeData)); alert("Saved locally!"); });

  document.getElementById("exportBtn").addEventListener("click", ()=>{
    let csv="Serial,Photo,Remark,Date & Time\n";
    barcodeData.forEach(e=>{ csv+=`${e.barcode},${e.photo},${e.remark},${e.datetime}\n`; });
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="Barcode_Data
