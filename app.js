const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

let barcodeData = JSON.parse(localStorage.getItem("barcodeData") || "[]");
let syncedSerials = new Set();

document.addEventListener("DOMContentLoaded", () => {

  // TAB
  document.querySelectorAll(".tabBtn").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".tabBtn").forEach(b=>b.classList.remove("activeTab"));
      document.querySelectorAll(".tabSection").forEach(s=>s.style.display="none");
      btn.classList.add("activeTab");
      document.getElementById(btn.dataset.tab).style.display="block";
    }
  });
  document.querySelector(".tabBtn").click();

  updateTable();

  // BARCODE SCAN
  let scanner;
  document.getElementById("startScan").onclick=()=>{
    scanner=new Html5Qrcode("reader");
    scanner.start({facingMode:"environment"},{fps:10,qrbox:250},code=>{
      scanner.stop();
      document.getElementById("entryFields").style.display="block";
      document.getElementById("barcode").value=code;
      document.getElementById("datetime").value=new Date().toLocaleString("en-GB");
    });
  };

  document.getElementById("submitBtn").onclick=()=>{
    const entry={
      barcode:barcode.value,
      photo:photo.value,
      remark:remark.value,
      datetime:datetime.value
    };
    barcodeData.push(entry);
    localStorage.setItem("barcodeData",JSON.stringify(barcodeData));
    updateTable();
    sendToSheet(entry);
    entryFields.style.display="none";
  };

  function sendToSheet(entry){
    fetch(WEBAPP_URL,{
      method:"POST",
      body:JSON.stringify(entry)
    }).then(r=>r.json()).then(()=>{
      syncedSerials.add(entry.barcode);
    });
  }

  document.getElementById("syncBtn").onclick=()=>{
    barcodeData.forEach(e=>{
      if(!syncedSerials.has(e.barcode)){
        sendToSheet(e);
      }
    });
    alert("Sync complete");
  };

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
      const b=document.createElement("button");
      b.innerText="X";
      b.onclick=()=>{
        barcodeData.splice(i,1);
        localStorage.setItem("barcodeData",JSON.stringify(barcodeData));
        updateTable();
      };
      d.appendChild(b);
    });
    totalCount.innerText=barcodeData.length;
  }

});
