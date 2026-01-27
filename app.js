const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

document.addEventListener("DOMContentLoaded", ()=>{

  // ---------- TAB SWITCH ----------
  const tabs = document.querySelectorAll(".tabBtn");
  const sections = document.querySelectorAll(".tabSection");
  sections.forEach(s => s.style.display="none");

  tabs.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      sections.forEach(s=>s.style.display="none");
      tabs.forEach(t=>t.classList.remove("activeTab"));
      document.getElementById(btn.dataset.tab).style.display="block";
      btn.classList.add("activeTab");
    });
  });

  // ---------- BARCODE DATA ----------
  let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
  let syncedBarcodes = JSON.parse(localStorage.getItem("syncedBarcodes") || "[]");
  let scanner;
  const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

  updateBarcodeTable();

  // ---------- BARCODE SCAN ----------
  document.getElementById("startScan").onclick = ()=>{
    scanner = new Html5Qrcode("reader");
    scanner.start({facingMode:"environment"},{fps:10, qrbox:250}, code=>{
      scanner.stop().then(()=>{
        beep.play();
        showBarcodeFields(code);
      });
    });
  };

  document.getElementById("stopScan").onclick = ()=>{ if(scanner) scanner.stop(); };

  function showBarcodeFields(code){
    document.getElementById("entryFields").style.display="block";
    document.getElementById("barcode").value = code;
    document.getElementById("photo").value = "";
    document.getElementById("remark").value = "";
    document.getElementById("datetime").value = new Date().toLocaleString("en-GB");
  }

  document.getElementById("retryBtn").onclick = ()=>{
    document.getElementById("entryFields").style.display="none";
  };

  // ---------- SUBMIT ----------
  document.getElementById("submitBtn").onclick = ()=>{
    const entry = {
      barcode: barcode.value.trim(),
      photo: photo.value.trim(),
      remark: remark.value.trim(),
      datetime: datetime.value
    };
    if(!entry.barcode) return alert("Scan first");

    barcodeData.push(entry);
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
    updateBarcodeTable();

    sendBarcodeToSheet(entry, true);
  };

  function sendBarcodeToSheet(entry, realtime=false){
    if(syncedBarcodes.includes(entry.barcode)) return;

    fetch(WEBAPP_URL,{
      method:"POST",
      body: JSON.stringify(entry)
    })
    .then(r=>r.json())
    .then(()=>{
      syncedBarcodes.push(entry.barcode);
      localStorage.setItem("syncedBarcodes", JSON.stringify(syncedBarcodes));
      if(realtime) alert("Google Sheet updated ✅");
    })
    .catch(()=>{
      if(realtime) alert("Net issue – data saved locally");
    });
  }

  document.getElementById("syncBtn").onclick = ()=>{
    let count=0;
    barcodeData.forEach(e=>{
      if(!syncedBarcodes.includes(e.barcode)){
        sendBarcodeToSheet(e);
        count++;
      }
    });
    alert(count+" records synced to Google Sheet");
  };

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

  // ---------- COPY / SAVE / EXPORT BARCODE ----------
  copyBtn.onclick = ()=>{
    let str="Serial,Photo,Remark,DateTime\n";
    barcodeData.forEach(e=>str+=`${e.barcode},${e.photo},${e.remark},${e.datetime}\n`);
    navigator.clipboard.writeText(str); alert("Copied");
  };
  saveLocalBtn.onclick = ()=>{
    localStorage.setItem("barcodeData", JSON.stringify(barcodeData)); alert("Saved locally");
  };
  exportBtn.onclick = ()=>{
    let csv="Serial,Photo,Remark,DateTime\n";
    barcodeData.forEach(e=>csv+=`${e.barcode},${e.photo},${e.remark},${e.datetime}\n`);
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="Barcode_Data.csv"; a.click();
  };

  // ---------- QR DATA ----------
  let qrData = JSON.parse(localStorage.getItem("qrData") || "[]");
  let qrScanner;
  function updateQRCount(){ document.getElementById("totalQRCount").innerText = qrData.length; }
  updateQRCount();

  document.getElementById("startQR").onclick = ()=>{
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start({facingMode:"environment"},{fps:10, qrbox:250}, code=>{
      qrScanner.stop().then(()=>{
        beep.play();
        document.getElementById("qrField").value = code;
        qrData.push(code);
        localStorage.setItem("qrData", JSON.stringify(qrData));
        updateQRCount();
      });
    }).catch(err=>alert("QR Camera error: "+err));
  };

  document.getElementById("stopQR").onclick = ()=>{
    if(qrScanner) qrScanner.stop();
  };

  document.getElementById("copyQR").onclick = ()=>{
    navigator.clipboard.writeText(qrData.join("\n")); alert("Copied!");
  };
  document.getElementById("saveQR").onclick = ()=>{
    localStorage.setItem("qrData", JSON.stringify(qrData)); alert("Saved locally!");
  };
  document.getElementById("exportQR").onclick = ()=>{
    let csv="QR Code\n"+qrData.join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download="QR_Data.csv"; a.click();
  };

});
