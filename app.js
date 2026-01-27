const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzT7ezPZ79p5AO88LAiLiZVHW6VmMaaBCXp8y4T5MELFqUY50i7C_41iOEt7L01MZGR/exec";

let barcodeData = JSON.parse(localStorage.getItem("barcodeData")) || [];

// Tabs
document.getElementById("barcodeTab").onclick = ()=>{
  document.getElementById("barcodeSection").classList.add("active");
  document.getElementById("qrSection").classList.remove("active");
  document.getElementById("barcodeTab").classList.add("active");
  document.getElementById("qrTab").classList.remove("active");
};
document.getElementById("qrTab").onclick = ()=>{
  document.getElementById("qrSection").classList.add("active");
  document.getElementById("barcodeSection").classList.remove("active");
  document.getElementById("qrTab").classList.add("active");
  document.getElementById("barcodeTab").classList.remove("active");
};

// Barcode scan
const html5QrCode = new Html5Qrcode("reader-barcode");
html5QrCode.start({ facingMode:"environment" }, { fps:10 }, code=>{
  document.getElementById("barcode").value = code;
  document.getElementById("entryFields").style.display="block";
  document.getElementById("datetime").value = new Date().toLocaleString();
});

// QR scan
const html5QrCodeQR = new Html5Qrcode("reader-qr");
html5QrCodeQR.start({ facingMode:"environment" }, { fps:10 }, code=>{
  document.getElementById("qrField").value = code;
});

// Update table & scan count
function updateTable(){
  const table = document.getElementById("barcodeTable");
  table.innerHTML = "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date/Time</th></tr>";
  barcodeData.forEach(d=>{
    const r = table.insertRow();
    [d.barcode,d.photo,d.remark,d.datetime].forEach(txt=> r.insertCell().innerText=txt);
  });
  document.getElementById("scanCount").innerText = "Total Scans: "+barcodeData.length;
}

// Submit
document.getElementById("submitBtn").onclick = ()=>{
  const entry={
    barcode: document.getElementById("barcode").value,
    photo: document.getElementById("photo").value,
    remark: document.getElementById("remark").value,
    datetime: document.getElementById("datetime").value,
    sent:false
  };
  barcodeData.push(entry);
  localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
  updateTable();
  document.getElementById("entryFields").style.display="none";

  // Push to Google Sheet
  fetch(WEBAPP_URL,{method:"POST", body:JSON.stringify(entry)})
  .then(res=>res.json())
  .then(r=>{
    if(r.status==="success"){
      entry.sent=true;
      localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
      alert("✅ Data sent to Google Sheet!");
    }else alert("⚠ Failed to push!");
  })
  .catch(e=>alert("❌ Network issue! Data saved locally."));
};

// Push Unsent
document.getElementById("pushToSheetBtn").onclick = ()=>{
  const unsent = barcodeData.filter(d=>!d.sent);
  if(unsent.length===0) return alert("No unsent entries!");
  fetch(WEBAPP_URL,{method:"POST", body:JSON.stringify({entries:unsent})})
  .then(res=>res.json())
  .then(r=>{
    if(r.status==="success"){
      unsent.forEach(d=>d.sent=true);
      localStorage.setItem("barcodeData", JSON.stringify(barcodeData));
      alert("✅ All unsent entries updated!");
    }
  })
  .catch(e=>alert("❌ Failed to push unsent entries!"));
};

// QR Copy & Export
document.getElementById("copyQrBtn").onclick=()=>{
  navigator.clipboard.writeText(document.getElementById("qrField").value)
    .then(()=>alert("Copied!"));
};
document.getElementById("exportQrBtn").onclick=()=>{
  const csv = `"QR Data"\n"${document.getElementById("qrField").value}"`;
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download="qr_export.csv";
  a.click();
};

window.onload = updateTable;
