const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxOBuakN8-ajoK30iTxTlkvIzgWCOuSLl6Xu4RaiGsiXFFF1xPHgMs_ENIKmjaRrc6f/exec";

// ---------- TAB SWITCH ----------
const tabs = document.querySelectorAll(".tabBtn");
const sections = document.querySelectorAll(".tabSection");
tabs.forEach(btn=>{
    btn.addEventListener("click", ()=>{
        sections.forEach(s=>s.style.display="none");
        document.getElementById(btn.dataset.tab).style.display="block";
    });
});

// ---------- BARCODE SCANNER ----------
let localData = [];
let qrScanner, beep=new Audio("https://www.soundjay.com/button/beep-07.wav");
document.getElementById("startScan").addEventListener("click", ()=>{
    qrScanner = new Html5Qrcode("reader");
    qrScanner.start(
        {facingMode:"environment"},
        {fps:10, qrbox:250},
        code=>{
            qrScanner.stop().then(()=>{ beep.play(); showBarcodeFields(code); });
        }
    ).catch(err=>alert("Camera error: "+err));
});
document.getElementById("stopScan").addEventListener("click", ()=>{ if(qrScanner) qrScanner.stop(); });

// Show fields after scan
function showBarcodeFields(serial){
    document.getElementById("entryFields").style.display="block";
    document.getElementById("barcode").value = serial;
    document.getElementById("barcode").style.border="2px solid green";
    document.getElementById("photo").value="";
    document.getElementById("remark").value="";
    document.getElementById("datetime").value = new Date().toLocaleString("en-GB");
}

// Retry
document.getElementById("retryBtn").addEventListener("click", ()=>{
    document.getElementById("entryFields").style.display="none";
});

// Submit
document.getElementById("submitBtn").addEventListener("click", ()=>{
    const barcode=document.getElementById("barcode").value;
    const photo=document.getElementById("photo").value;
    const remark=document.getElementById("remark").value;
    const datetime=document.getElementById("datetime").value;
    if(!barcode) return alert("Scan first!");
    const entry={barcode,photo,remark,datetime};
    localData.push(entry);
    updateTable();
    // Google Sheet save
    fetch(WEBAPP_URL,{method:"POST",body:JSON.stringify(entry)})
    .then(res=>res.json()).then(r=>alert("Data saved to Google Sheet ✅")).catch(e=>alert("Google Sheet error"));
});

// Update table
function updateTable(){
    const t=document.getElementById("table");
    t.innerHTML="<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";
    localData.forEach((e,i)=>{
        const r=t.insertRow(-1);
        r.insertCell(0).innerText=e.barcode;
        r.insertCell(1).innerText=e.photo;
        r.insertCell(2).innerText=e.remark;
        r.insertCell(3).innerText=e.datetime;
        const delCell=r.insertCell(4);
        const btn=document.createElement("button");
        btn.innerText="Delete";
        btn.onclick=()=>{ localData.splice(i,1); updateTable(); };
        delCell.appendChild(btn);
    });
    document.getElementById("totalCount").innerText = localData.length;
}

// Barcode actions: Copy, Save local, Export
document.getElementById("copyBtn").addEventListener("click", ()=>{
    let str="Serial,Photo,Remark,Date & Time\n";
    localData.forEach(e=>{ str+=`${e.barcode},${e.photo},${e.remark},${e.datetime}\n`; });
    navigator.clipboard.writeText(str).then(()=>alert("Copied!"));
});
document.getElementById("saveLocalBtn").addEventListener("click", ()=>{ localStorage.setItem("barcodeData",JSON.stringify(localData)); alert("Saved locally!"); });
document.getElementById("exportBtn").addEventListener("click", ()=>{
    let csv="Serial,Photo,Remark,Date & Time\n";
    localData.forEach(e=>{ csv+=`${e.barcode},${e.photo},${e.remark},${e.datetime}\n`; });
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="Barcode_Data.csv"; a.click();
});

// ---------- QR SCANNER ----------
let qrLocal = [];
let qrScanner2;
document.getElementById("startQR").addEventListener("click", ()=>{
    qrScanner2 = new Html5Qrcode("qr-reader");
    qrScanner2.start({facingMode:"environment"},{fps:10,qrbox:250}, code=>{
        document.getElementById("qrField").value = code;
        qrScanner2.stop();
        updateQRCount();
    }).catch(err=>alert("QR camera error"));
});
document.getElementById("stopQR").addEventListener("click", ()=>{ if(qrScanner2) qrScanner2.stop(); });
document.getElementById("copyQR").addEventListener("click", ()=>{ const val=document.getElementById("qrField").value; navigator.clipboard.writeText(val); alert("Copied!"); });
document.getElementById("saveQR").addEventListener("click", ()=>{ const val=document.getElementById("qrField").value; if(val) qrLocal.push(val); updateQRCount(); alert("Saved locally!"); });
document.getElementById("exportQR").addEventListener("click", ()=>{
    let csv="QR Code\n"+qrLocal.join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="QR_Data.csv";
    a.click();
});
function updateQRCount(){ document.getElementById("totalQRCount").innerText = qrLocal.length; }
