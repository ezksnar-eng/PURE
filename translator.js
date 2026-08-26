import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// قائمة البروكسيات المتعددة لتفادي خطأ تحميل الفهرس
const PROXIES = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
];

window.fetchWithFallback = async function(targetUrl) {
    for (let proxyFn of PROXIES) {
        try {
            const proxyUrl = proxyFn(targetUrl);
            const res = await fetch(proxyUrl);
            if (!res.ok) continue;

            let htmlText = "";
            if (proxyUrl.includes("allorigins")) {
                const data = await res.json();
                htmlText = data.contents;
            } else {
                htmlText = await res.text();
            }

            if (htmlText) return htmlText;
        } catch (e) {
            console.warn("جاري تجربة بروكسي بديل...");
        }
    }
    throw new Error("جميع البروكسيات متوقفة حالياً");
};

// دالة جلب الفهرس وعرض الصور تلقائياً
window.loadManhuaChapters = async function() {
    const statusBox = document.querySelector(".translator-status") || document.body;
    const targetUrl = "http://m.yueman1.cc/manhua/o/m_waplistindex.html";

    try {
        const html = await window.fetchWithFallback(targetUrl);
        const parser = new DOMParser();
        const docHtml = parser.parseFromString(html, "text/html");

        const images = [];
        docHtml.querySelectorAll("img").forEach(img => {
            let src = img.getAttribute("src") || img.getAttribute("data-original");
            if (src && !src.startsWith("data:")) {
                if (!src.startsWith("http")) src = "http://m.yueman1.cc" + (src.startsWith("/") ? "" : "/") + src;
                images.push(src);
            }
        });

        console.log("تم تحميل الفهرس بنجاح، عدد الصور:", images.length);
        
        // إذا كان يمتلك عناصر القائمة يملأها تلقائياً
        const selectEl = document.querySelector("select");
        if (selectEl && images.length > 0) {
            selectEl.innerHTML = images.map((_, i) => `<option value="${i}">صفحة ${i + 1}</option>`).join("");
        }

    } catch (err) {
        console.error("خطأ الفهرس:", err);
    }
};

// تشغيل تلقائي
document.addEventListener("DOMContentLoaded", () => {
    window.loadManhuaChapters();
});
