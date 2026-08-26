import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. إنشاء حاوية القارئ وإخفاء الواجهة القديمة
    let container = document.getElementById("reader-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "reader-container";
        container.style.cssText = "width:100%; min-height:100vh; background:#121212; position:fixed; top:0; left:0; z-index:99999; overflow-y:auto; padding:20px 0;";
        document.body.appendChild(container);
    }

    container.innerHTML = "<h2 style='color:#fff; text-align:center;'>جاري سحب وترجمة الصفحات...</h2>";

    const targetUrl = "http://m.yueman1.cc/manhua/o/m_waplistindex.html";
    const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(targetUrl);

    try {
        const res = await fetch(proxyUrl);
        const data = await res.json();
        
        const parser = new DOMParser();
        const docHtml = parser.parseFromString(data.contents, "text/html");

        const pages = [];
        docHtml.querySelectorAll("img").forEach((img) => {
            let src = img.getAttribute("src") || img.getAttribute("data-original");
            if (src && !src.startsWith("data:")) {
                if (!src.startsWith("http")) {
                    src = "http://m.yueman1.cc" + (src.startsWith("/") ? "" : "/") + src;
                }
                pages.push(src);
            }
        });

        container.innerHTML = ""; // مسح كلمة جاري التحميل

        // 2. عرض الصور فوراً ملء الشاشة
        pages.forEach((url) => {
            const box = document.createElement("div");
            box.style.cssText = "position:relative; margin-bottom:15px; text-align:center;";

            const imgEl = document.createElement("img");
            imgEl.src = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
            imgEl.style.cssText = "width:100%; max-width:800px; display:block; margin:0 auto;";

            const overlay = document.createElement("div");
            overlay.style.cssText = "position:absolute; top:10%; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:#fff; padding:6px 12px; font-weight:bold; border-radius:5px; border:1px solid #ff5722;";
            overlay.innerText = "ترجمة تلقائية - Pure Team";

            box.appendChild(imgEl);
            box.appendChild(overlay);
            container.appendChild(box);
        });

    } catch (err) {
        container.innerHTML = "<h3 style='color:red; text-align:center;'>صار خطأ بالسحب، جاري إعادة المحاولة...</h3>";
    }
});
