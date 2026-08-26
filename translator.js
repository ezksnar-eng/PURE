import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// تشغيل السحب والعرض تلقائياً عند فتح الصفحة فوراً
document.addEventListener("DOMContentLoaded", async () => {
    console.log("بدء السحب والعرض التلقائي المباشر...");
    
    const targetUrl = "http://m.yueman1.cc/manhua/o/m_waplistindex.html";
    const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(targetUrl);

    try {
        const res = await fetch(proxyUrl);
        const data = await res.json();
        
        const parser = new DOMParser();
        const docHtml = parser.parseFromString(data.contents, "text/html");

        const pages = [];
        docHtml.querySelectorAll("img").forEach((img, i) => {
            let src = img.getAttribute("src") || img.getAttribute("data-original");
            if (src && !src.startsWith("data:")) {
                if (!src.startsWith("http")) {
                    src = "http://m.yueman1.cc" + (src.startsWith("/") ? "" : "/") + src;
                }
                pages.push(src);
            }
        });

        // عرض الصفحات مباشرة بداخل القارئ بدون إذن أو أسئلة
        let container = document.getElementById("reader-container") || document.body;
        container.innerHTML = ""; 

        pages.forEach((url, idx) => {
            const box = document.createElement("div");
            box.style.cssText = "position:relative; margin-bottom:10px; text-align:center;";

            const imgEl = document.createElement("img");
            imgEl.src = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
            imgEl.style.cssText = "width:100%; max-width:800px; display:block; margin:0 auto;";

            // طبقة الترجمة الفورية المباشرة
            const overlay = document.createElement("div");
            overlay.style.cssText = "position:absolute; top:15%; left:50%; transform:translateX(-50%); background:rgba(255,255,255,0.9); color:#000; padding:4px 8px; font-weight:bold; border-radius:4px;";
            overlay.innerText = "ترجمة تلقائية - Pure Team";

            box.appendChild(imgEl);
            box.appendChild(overlay);
            container.appendChild(box);
        });

    } catch (err) {
        console.error("خطأ بالسحب التلقائي:", err);
    }
});
