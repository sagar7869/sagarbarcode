// -------- CONFIG --------
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxOBuakN8-ajoK30iTxTlkvIzgWCOuSLl6Xu4RaiGsiXFFF1xPHgMs_ENIKmjaRrc6f/exec"; // ✅ Already set
let localData = [];

// -------- SCANNER SETUP --------
const qrScanner = new Html5Qrcode("reader");
document.getElementById("startScan").addEventListener("click", () => {
    qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      code => {
        document.getElementById("barcode").value = code;
        document.getElementById("entryFields").style.display = "block";
      }
    );
});

document.getElementById("retryBtn").addEventListener("click", () => {
    document.getElementById("barcode").value="";
    document.getElementById("module").value="";
    document.getElementById("photo").value="";
    document.getElementById("remark").value="";
});

// -------- SUBMIT ENTRY --------
document.getElementById("submitBtn").addEventListener("click", () => {
    const barcode = document.getElementById("barcode").value;
    const module = document.getElementById("module").value;
    const photo = document.getElementById("photo").value;
    const remark = document.getElementById("remark").value;
    if(!barcode) return alert("Scan a barcode first!");
    
    const now = new Date();
    const date = now.toLocaleDateString("en-GB");
    const datetime = now.toLocaleString("en-GB");

    const entry = {barcode,module,photo,remark,date,datetime};
    localData.push(entry);
    updateTable();

    // Google Sheet POST
    fetch(WEBAPP_URL, {
        method:"POST",
        body: JSON.stringify(entry)
    }).then(res=>res.json())
    .then(r=>console.log("WebApp response:", r))
    .catch(e=>console.log("WebApp error:", e));

    document.getElementById("entryFields").style.display="none";
    document.getElementById("barcode").value="";
    document.getElementById("module").value="";
    document.getElementById("photo").value="";
    document.getElementById("remark").value="";
});

// -------- UPDATE TABLE --------
function updateTable(){
    const t = document.getElementById("table");
    t.innerHTML="<tr><th>Code</th><th>Module</th><th>Photo</th><th>Remark</th><th>Delete</th></tr>";
    localData.forEach((e,i)=>{
        const r = t.insertRow(-1);
        r.insertCell(0).innerText=e.barcode;
        r.insertCell(1).innerText=e.module;
        r.insertCell(2).innerText=e.photo;
        r.insertCell(3).innerText=e.remark;
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

// -------- QR SECTION --------
const qrField = document.getElementById("qrField");
document.getElementById("copyQR").addEventListener("click", ()=> {
    qrField.select();
    document.execCommand("copy");
    alert("Copied!");
});

let qrLocal = [];
document.getElementById("saveQR").addEventListener("click", ()=>{
    if(qrField.value) qrLocal.push(qrField.value);
    alert("Saved locally!");
});

document.getElementById("exportQR").addEventListener("click", ()=>{
    let csv = "QR Code\n"+qrLocal.join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="QR_Data.csv";
    a.click();
});
