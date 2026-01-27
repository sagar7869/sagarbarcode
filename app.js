// ---------------- CONFIG ----------------
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxOBuakN8-ajoK30iTxTlkvIzgWCOuSLl6Xu4RaiGsiXFFF1xPHgMs_ENIKmjaRrc6f/exec";
let localData = [];
let qrLocal = [];

// ---------------- BARCODE SCANNER ----------------
const qrScanner = new Html5Qrcode("reader");
const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

document.getElementById("startScan").addEventListener("click", ()=>{
    qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        code=>{
            qrScanner.stop().then(()=>{
                beep.play();
                showScanFields(code);
            });
        }
    ).catch(err=>{
        alert("Camera error: "+err);
    });
});

// Show fields after capture
function showScanFields(serial){
    const entryDiv = document.getElementById("entryFields");
    entryDiv.style.display = "block";

    document.getElementById("barcode").value = serial; // editable
    document.getElementById("barcode").style.border="2px solid green";

    document.getElementById("photo").value="";
    document.getElementById("remark").value="";

    const now = new Date();
    document.getElementById("datetime").value = now.toLocaleString("en-GB");
}

// Retry scan
document.getElementById("retryBtn").addEventListener("click", ()=>{
    document.getElementById("barcode").value="";
    document.getElementById("photo").value="";
    document.getElementById("remark").value="";
    document.getElementById("datetime").value="";
    document.getElementById("entryFields").style.display="none";
});

// Submit scan
document.getElementById("submitBtn").addEventListener("click", ()=>{
    const barcode = document.getElementById("barcode").value;
    const photo = document.getElementById("photo").value;
    const remark = document.getElementById("remark").value;
    const datetime = document.getElementById("datetime").value;

    if(!barcode) return alert("Scan first!");

    const entry = {barcode, photo, remark, datetime};
    localData.push(entry);
    updateTable();

    // Google Sheet POST
    fetch(WEBAPP_URL,{
        method:"POST",
        body: JSON.stringify(entry)
    }).then(res=>res.json())
    .then(r=>console.log("WebApp response:", r))
    .catch(e=>console.log("WebApp error:", e));

    document.getElementById("entryFields").style.display="none";
});

// Update table
function updateTable(){
    const t = document.getElementById("table");
    t.innerHTML="<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";
    localData.forEach((e,i)=>{
        const r = t.insertRow(-1);
        r.insertCell(0).innerText=e.barcode;
        r.insertCell(1).innerText=e.photo;
        r.insertCell(2).innerText=e.remark;
        r.insertCell(3).innerText=e.datetime;
        const delCell = r.insertCell(4);
        const btn = document.createElement("button");
        btn.innerText="Delete";
        btn.onclick = ()=>{
            localData.splice(i,1);
            updateTable();
        }
        delCell.appendChild(btn);
    });
    document.getElementById("totalCount").innerText = localData.length;
}

// ---------------- QR SCANNER ----------------
let qrScanner2;
document.getElementById("startQR").addEventListener("click", ()=>{
    qrScanner2 = new Html5Qrcode("qr-reader");
    qrScanner2.start(
        {facingMode:"environment"},
        {fps:10, qrbox:250},
        code=>{
            document.getElementById("qrField").value = code;
            qrScanner2.stop();
        }
    ).catch(err=>alert("QR camera error: "+err));
});

// QR copy
document.getElementById("copyQR").addEventListener("click", ()=>{
    const qrField = document.getElementById("qrField");
    qrField.select();
    document.execCommand("copy");
    alert("Copied!");
});

// QR save local
document.getElementById("saveQR").addEventListener("click", ()=>{
    const val = document.getElementById("qrField").value;
    if(val) qrLocal.push(val);
    alert("Saved locally!");
});

// QR export CSV
document.getElementById("exportQR").addEventListener("click", ()=>{
    let csv="QR Code\n"+qrLocal.join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="QR_Data.csv";
    a.click();
});
