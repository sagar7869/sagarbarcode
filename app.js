const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxOBuakN8-ajoK30iTxTlkvIzgWCOuSLl6Xu4RaiGsiXFFF1xPHgMs_ENIKmjaRrc6f/exec";

document.addEventListener("DOMContentLoaded", ()=>{

    // TAB SWITCH
    const tabs = document.querySelectorAll(".tabBtn");
    const sections = document.querySelectorAll(".tabSection");
    sections.forEach(s => s.style.display="none"); 

    tabs.forEach(btn=>{
        btn.addEventListener("click", ()=>{
            sections.forEach(s=>s.style.display="none");
            tabs.forEach(t=>t.classList.remove("activeTab"));
            const section = document.getElementById(btn.dataset.tab);
            section.style.display="block";
            btn.classList.add("activeTab");
        });
    });

    let barcodeData=[], qrData=[], scanner;
    const beep = new Audio("https://www.soundjay.com/button/beep-07.wav");

    // ---------- BARCODE ----------
    document.getElementById("startScan").addEventListener("click", ()=>{
        scanner = new Html5Qrcode("reader");
        scanner.start(
          {facingMode:"environment"},
          {fps:10, qrbox:250},
          code=>{
            scanner.stop().then(()=>{
                beep.play();
                showBarcodeFields(code);
            });
          }
        ).catch(err=>alert("Camera error: "+err));
    });

    document.getElementById("stopScan").addEventListener("click", ()=>{
        if(scanner) scanner.stop();
    });

    function showBarcodeFields(serial){
        const f=document.getElementById("entryFields");
        f.style.display="block";
        document.getElementById("barcode").value = serial;
        document.getElementById("photo").value="";
        document.getElementById("remark").value="";
        document.getElementById("datetime").value =
          new Date().toLocaleString("en-GB");
    }

    document.getElementById("retryBtn").addEventListener("click", ()=>{
        document.getElementById("entryFields").style.display="none";
    });

    document.getElementById("submitBtn").addEventListener("click", ()=>{
        const barcode=document.getElementById("barcode").value;
        const photo=document.getElementById("photo").value;
        const remark=document.getElementById("remark").value;
        const datetime=document.getElementById("datetime").value;

        if(!barcode) return alert("Scan first!");

        const entry={barcode,photo,remark,datetime};
        barcodeData.push(entry);
        updateTable();

        fetch(WEBAPP_URL,{
            method:"POST",
            body:JSON.stringify(entry)
        })
        .then(res=>res.json())
        .then(()=>alert("Data updated on Google Sheet ✅"))
        .catch(()=>alert("Google Sheet error"));
    });

    function updateTable(){
        const t=document.getElementById("table");
        t.innerHTML =
          "<tr><th>Serial</th><th>Photo</th><th>Remark</th><th>Date & Time</th><th>Delete</th></tr>";

        barcodeData.forEach((e,i)=>{
            const r=t.insertRow(-1);
            r.insertCell(0).innerText=e.barcode;
            r.insertCell(1).innerText=e.photo;
            r.insertCell(2).innerText=e.remark;
            r.insertCell(3).innerText=e.datetime;

            const del=r.insertCell(4);
            const b=document.createElement("button");
            b.innerText="Delete";
            b.onclick=()=>{
                barcodeData.splice(i,1);
                updateTable();
            };
            del.appendChild(b);
        });

        document.getElementById("totalCount").innerText = barcodeData.length;
    }

    document.getElementById("copyBtn").addEventListener("click", ()=>{
        let str="Serial,Photo,Remark,Date & Time\n";
        barcodeData.forEach(e=>{
            str+=`${e.barcode},${e.photo},${e.remark},${e.datetime}\n`;
        });
        navigator.clipboard.writeText(str)
          .then(()=>alert("Copied!"));
    });

    document.getElementById("saveLocalBtn").addEventListener("click", ()=>{
        localStorage.setItem("barcodeData",JSON.stringify(barcodeData));
        alert("Saved locally!");
    });

    document.getElementById("exportBtn").addEventListener("click", ()=>{
        let csv="Serial,Photo,Remark,Date & Time\n";
        barcodeData.forEach(e=>{
            csv+=`${e.barcode},${e.photo},${e.remark},${e.datetime}\n`;
        });
        const blob=new Blob([csv],{type:"text/csv"});
        const a=document.createElement("a");
        a.href=URL.createObjectURL(blob);
        a.download="Barcode_Data.csv";
        a.click();
    });

    // ---------- QR ----------
    let qrScanner;

    document.getElementById("startQR").addEventListener("click", ()=>{
        qrScanner = new Html5Qrcode("qr-reader");
        qrScanner.start(
          {facingMode:"environment"},
          {fps:10, qrbox:250},
          code=>{
            document.getElementById("qrField").value = code;
            qrScanner.stop();
            updateQRCount();
          }
        ).catch(()=>alert("QR camera error"));
    });

    document.getElementById("stopQR").addEventListener("click", ()=>{
        if(qrScanner) qrScanner.stop();
    });

    document.getElementById("copyQR").addEventListener("click", ()=>{
        const val=document.getElementById("qrField").value;
        navigator.clipboard.writeText(val);
        alert("Copied!");
    });

    document.getElementById("saveQR").addEventListener("click", ()=>{
        const val=document.getElementById("qrField").value;
        if(val) qrData.push(val);
        updateQRCount();
        alert("Saved locally!");
    });

    document.getElementById("exportQR").addEventListener("click", ()=>{
        let csv="QR Code\n"+qrData.join("\n");
        const blob=new Blob([csv],{type:"text/csv"});
        const a=document.createElement("a");
        a.href=URL.createObjectURL(blob);
        a.download="QR_Data.csv";
        a.click();
    });

    function updateQRCount(){
        document.getElementById("totalQRCount").innerText = qrData.length;
    }

});
