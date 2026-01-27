const WEBAPP_URL =
"https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

let barcodeData = JSON.parse(localStorage.getItem("barcodeData")||"[]");
let qrData = [];
let scanner, qrScanner;

const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

// TAB SWITCH
document.querySelectorAll(".tabBtn").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".tabBtn").forEach(b=>b.classList.remove("activeTab"));
    document.querySelectorAll(".tabSection").forEach(s=>s.style.display="none");
    btn.classList.add("activeTab");
    document.getElementById(btn.dataset.tab).style.display="block";
  }
});

// BARCODE SCAN
startScan.onclick=()=>{
  scanner=new Html5Qrcode("reader");
  scanner.start({facingMode:"environment"},{fps:15,qrbox:250},code=>{
    scanner.stop();
    beep.play();
    entryFields.style.display="block";
    barcode.value=code;
    datetime.value=new Date().toLocaleString("en-GB");
  });
};
stopScan.onclick=()=>scanner && scanner.stop();

retryBtn.onclick=()=>entryFields.style.display="none";

submitBtn.onclick=()=>{
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
};

function sendToSheet(entry){
  fetch(WEBAPP_URL,{
    method:"POST",
    body:JSON.stringify(entry)
  })
  .then(r=>r.json())
  .then(()=>alert("Google Sheet Updated ✅"))
  .catch(()=>alert("Sheet Error ❌"));
}

// SYNC BUTTON (local → sheet, no duplicate)
syncBtn.onclick=()=>{
  barcodeData.forEach(e=>sendToSheet(e));
  alert("Sync Started");
};

function updateTable(){
  table.innerHTML=`<tr>
  <th>Serial</th><th>Photo</th><th>Remark</th>
  <th>Date & Time</th><th>Delete</th></tr>`;
  barcodeData.forEach((e,i)=>{
    let r=table.insertRow();
    r.insertCell(0).innerText=e.barcode;
    r.insertCell(1).innerText=e.photo;
    r.insertCell(2).innerText=e.remark;
    r.insertCell(3).innerText=e.datetime;
    let d=r.insertCell(4);
    let b=document.createElement("button");
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
updateTable();

// COPY / EXPORT
copyBtn.onclick=()=>navigator.clipboard.writeText(JSON.stringify(barcodeData));
exportBtn.onclick=()=>{
  let csv="Serial,Photo,Remark,DateTime\n";
  barcodeData.forEach(e=>{
    csv+=`${e.barcode},${e.photo},${e.remark},${e.datetime}\n`;
  });
  let a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  a.download="barcode.csv"; a.click();
};

// QR
startQR.onclick=()=>{
  qrScanner=new Html5Qrcode("qr-reader");
  qrScanner.start({facingMode:"environment"},{fps:10,qrbox:250},code=>{
    qrField.value=code;
    qrData.push(code);
    totalQRCount.innerText=qrData.length;
    qrScanner.stop();
  });
};
stopQR.onclick=()=>qrScanner && qrScanner.stop();
copyQR.onclick=()=>navigator.clipboard.writeText(qrField.value);
saveQR.onclick=()=>alert("Saved");
exportQR.onclick=()=>{
  let a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([qrData.join("\n")]));
  a.download="qr.csv"; a.click();
};
