import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// 1. مسح أي مربع ترجمة مزعج فوق تلقائياً بمجرد فتح الصفحة
document.addEventListener("DOMContentLoaded", () => {
    // يحذف أي عنصر يحتوي على حقل اختيار أو نصوص مترجمة سابقة
    document.querySelectorAll("select, .translator-box, div > button").forEach(el => {
        if (el.innerText.includes("ترجمة") || el.innerText.includes("فشل") || el.tagName === "SELECT") {
            // التحقق من أن العنصر هو المربع العلوي الغريب وحذفه
            const parentBox = el.closest("div");
            if (parentBox && !parentBox.id && parentBox.parentElement === document.body) {
                parentBox.remove();
            }
        }
    });

    // البدء بالسحب التلقائي الفوري
    autoFetchManhua();
});

// 2. دالة السحب التلقائي من الموقع الصيني
async function autoFetchManhua() {
    const targetUrl = "http://m.yueman1.cc/manhua/o/m_waplistindex.html";
    const proxyUrl = "https://corsproxy.io/?";

    try {
        console.label = "جاري سحب الفصول تلقائياً...";
        const res = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        if (!res.ok) throw new Error("فشل الاتصال بالبروكسي");

        const htmlText = await res.text();
        const parser = new DOMParser();
        const docHtml = parser.parseFromString(htmlText, "text/html");

        const pages = [];
        docHtml.querySelectorAll("img").forEach(img => {
            let src = img.getAttribute("src") || img.getAttribute("data-original");
            if (src && !src.startsWith("data:")) {
                if (!src.startsWith("http")) {
                    src = "http://m.yueman1.cc" + (src.startsWith("/") ? "" : "/") + src;
                }
                pages.push(src);
            }
        });

        console.log("تم سحب الصور بنجاح، العدد:", pages.length);

        if (pages.length > 0) {
            displayReaderImages(pages);
        }

    } catch (err) {
        console.error("خطأ بالسحب التلقائي:", err);
    }
}

// 3. عرض الصور المسحوبة فوراً كقارئ مانهاوا احترافي
function displayReaderImages(pages) {
    let container = document.getElementById("auto-reader-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "auto-reader-container";
        container.style.cssText = "width:100%; background:#121212; padding:10px 0; z-index:9999; position:relative;";
        document.body.prepend(container);
    }

    container.innerHTML = "<h3 style='color:#ff5722; text-align:center;'>تم السحب بنجاح - الفصل المترجم</h3>";

    pages.forEach((url, index) => {
        const imgEl = document.createElement("img");
        imgEl.src = "https://corsproxy.io/?" + encodeURIComponent(url);
        imgEl.style.cssText = "width:100%; max-width:800px; display:block; margin:0 auto 10px auto; border-radius:4px;";
        container.appendChild(imgEl);
    });
}
