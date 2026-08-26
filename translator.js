// translator.js - نسخة متصلة بقاعدة البيانات ومحسنة
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ========== إعدادات قاعدة البيانات (Firebase) ==========
// ضيف بيانات مشروعك هنا حتى تكتمل عملية الحفظ بالقاعدة
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// تهيئة الفايربيس والستور
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// دالة حماية لخزن البيانات بالقاعدة تلقائياً
async function saveToDatabase(collectionName, data) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp()
    });
    console.log(`✅ تم حفظ البيانات بنجاح في Firestore! ID: ${docRef.id}`);
  } catch (e) {
    console.error("❌ خطأ أثناء الحفظ في قاعدة البيانات:", e);
  }
}

(function() {
  // ========== الإعدادات ==========
  const MANHUA_INDEX_URL = 'http://m.yueman1.cc/manhua/o/m_waplistindex.html';

  // قائمة البروكسيات المتاحة
  const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors-anywhere.herokuapp.com/',
    'https://proxy.cors.sh/'
  ];

  const TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=';
  const REQUEST_TIMEOUT = 15000;

  // ========== دوال مساعدة ==========

  // جلب محتوى عبر CORS Proxy مع التبديل التلقائي عند الفشل
  async function fetchWithCors(url, proxyIndex = 0, retryCount = 0) {
    if (proxyIndex >= CORS_PROXIES.length) {
      console.error('جميع البروكسيات فشلت في جلب الرابط:', url);
      return null;
    }

    const proxy = CORS_PROXIES[proxyIndex];
    const fullUrl = proxy + encodeURIComponent(url);

    try {
      console.log(`محاولة الجلب عبر: ${proxy} (محاولة ${retryCount + 1})`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(fullUrl, {
        signal: controller.signal,
        headers: {
          'Origin': window.location.origin,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const text = await response.text();

      if (text.includes('Access Denied') || text.includes('403 Forbidden') || text.length < 100) {
        throw new Error('Response seems blocked or empty');
      }

      console.log('نجح الجلب!');
      return text;

    } catch (error) {
      console.warn(`فشل البروكسي ${proxy}:`, error.message);

      if (retryCount < 2) {
        console.log(`إعادة المحاولة على نفس البروكسي (${retryCount + 2})...`);
        return fetchWithCors(url, proxyIndex, retryCount + 1);
      }

      console.log('الانتقال للبروكسي التالي...');
      return fetchWithCors(url, proxyIndex + 1, 0);
    }
  }

  // استخراج روابط الفصول من صفحة الفهرس
  function extractChapterLinks(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    const chapterLinks = [];

    links.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      if (href && (
        text.toLowerCase().includes('chapter') ||
        text.toLowerCase().includes('第') ||
        text.toLowerCase().includes('话') ||
        text.toLowerCase().includes('回') ||
        href.toLowerCase().includes('chapter') ||
        href.toLowerCase().includes('m_waplist')
      )) {
        const fullUrl = new URL(href, 'http://m.yueman1.cc').href;
        chapterLinks.push({ url: fullUrl, title: text || 'فصل ' + (chapterLinks.length + 1) });
      }
    });

    if (chapterLinks.length === 0) {
      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = link.textContent.trim();
        if (href && text) {
          const fullUrl = new URL(href, 'http://m.yueman1.cc').href;
          chapterLinks.push({ url: fullUrl, title: text });
        }
      });
    }

    const unique = chapterLinks.filter((v, i, a) => a.findIndex(t => t.url === v.url) === i);
    return unique;
  }

  // استخراج روابط الصور من صفحة الفصل
  function extractImageUrls(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));
    const urls = images
      .map(img => img.getAttribute('src'))
      .filter(src => src && (src.startsWith('http') || src.startsWith('//')))
      .map(src => src.startsWith('//') ? 'http:' + src : src);

    return urls.filter(url =>
      !url.includes('logo') &&
      !url.includes('icon') &&
      !url.includes('avatar') &&
      !url.includes('banner')
    );
  }

  // الترجمة عبر Google Translate غير الرسمي
  async function translateText(text, targetLang = 'ar') {
    if (!text || text.trim() === '') return text;
    try {
      const url = `${TRANSLATE_API}${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Translation failed');
      const data = await response.json();
      let translated = '';
      if (data && data[0]) {
        data[0].forEach(part => {
          translated += part[0];
        });
      }
      return translated || text;
    } catch (error) {
      console.error('فشل الترجمة:', error);
      return text;
    }
  }

  // ========== بناء الواجهة ==========
  function createUI() {
    const container = document.createElement('div');
    container.id = 'translator-manhua-container';
    container.style.cssText = `
      position: relative;
      z-index: 9999;
      background: #fff;
      padding: 15px;
      margin: 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 2px 15px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif;
      direction: rtl;
    `;

    const header = document.createElement('div');
    header.innerHTML = '<h2 style="margin:0 0 10px; color:#333;">المانهاوا المترجمة تلقائياً</h2>';
    container.appendChild(header);

    const statusDiv = document.createElement('div');
    statusDiv.id = 'fetch-status';
    statusDiv.style.cssText = 'font-size: 12px; color: #666; margin-bottom: 5px;';
    statusDiv.textContent = 'جاهز';
    container.appendChild(statusDiv);

    const chapterSelect = document.createElement('select');
    chapterSelect.id = 'chapter-select';
    chapterSelect.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 10px; border-radius: 4px; border:1px solid #ccc;';
    container.appendChild(chapterSelect);

    const imagesDiv = document.createElement('div');
    imagesDiv.id = 'manhua-images';
    imagesDiv.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      max-height: 600px;
      overflow-y: auto;
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
    `;
    container.appendChild(imagesDiv);

    const controls = document.createElement('div');
    controls.style.cssText = 'margin-top: 10px; display: flex; gap: 10px;';

    const translateBtn = document.createElement('button');
    translateBtn.textContent = 'ترجمة النصوص';
    translateBtn.style.cssText = 'padding: 8px 12px; cursor:pointer;';
    translateBtn.onclick = translateVisibleTexts;
    controls.appendChild(translateBtn);

    const revertBtn = document.createElement('button');
    revertBtn.textContent = 'إعادة النص الأصلي';
    revertBtn.style.cssText = 'padding: 8px 12px; cursor:pointer;';
    revertBtn.onclick = revertTranslations;
    controls.appendChild(revertBtn);

    container.appendChild(controls);

    document.body.insertBefore(container, document.body.firstChild);

    return { container, chapterSelect, imagesDiv, statusDiv };
  }

  // عرض صور الفصل المحدد وترحيل البيانات للقاعدة
  async function loadChapterImages(chapterUrl, imagesDiv, statusDiv) {
    imagesDiv.innerHTML = '<p style="color:#666;">جاري تحميل الصور...</p>';
    statusDiv.textContent = 'جاري جلب صفحة الفصل...';

    const html = await fetchWithCors(chapterUrl);
    if (!html) {
      imagesDiv.innerHTML = '<p style="color:red;">فشل تحميل الفصل بعد تجربة جميع البروكسيات.</p>';
      statusDiv.textContent = 'فشل التحميل';
      return;
    }

    statusDiv.textContent = 'تم جلب الصفحة، استخراج الصور...';
    const imageUrls = extractImageUrls(html);
    if (imageUrls.length === 0) {
      imagesDiv.innerHTML = '<p>لا توجد صور في هذا الفصل.</p>';
      statusDiv.textContent = 'لا توجد صور';
      return;
    }

    // 🔥 رفع بيانات الفصل والصور المستخرجة مباشرة لقاعدة البيانات
    saveToDatabase("manhua_chapters", {
      chapterUrl: chapterUrl,
      totalImages: imageUrls.length,
      images: imageUrls
    });

    statusDiv.textContent = `تم العثور على ${imageUrls.length} صورة. جاري التحميل والحفظ بالقاعدة...`;
    imagesDiv.innerHTML = '';

    for (let i = 0; i < imageUrls.length; i++) {
      const src = imageUrls[i];
      const img = document.createElement('img');
      img.src = src;
      img.style.cssText = 'max-width: 100%; height: auto; display: block; margin: 5px 0; border-radius:4px;';
      img.onerror = () => { img.style.display = 'none'; };
      imagesDiv.appendChild(img);
      
      statusDiv.textContent = `تحميل الصور: ${i + 1} من ${imageUrls.length}`;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    statusDiv.textContent = 'اكتمل التحميل والحفظ بنجاح';
  }

  // ترجمة النصوص الظاهرة داخل الحاوية
  async function translateVisibleTexts() {
    const container = document.getElementById('translator-manhua-container');
    if (!container) return;
    const elements = container.querySelectorAll('h2, select option, p, button, span, div');
    for (let el of elements) {
      if (el.querySelector('img')) continue;
      if (el.children.length > 0 && !el.matches('option, button, h2')) continue;

      const originalText = el.textContent.trim();
      if (originalText && originalText.length > 1) {
        if (!el.dataset.originalText) {
          el.dataset.originalText = originalText;
        }
        const translated = await translateText(originalText, 'ar');
        el.textContent = translated;
      }
    }
  }

  // إعادة النصوص الأصلية
  function revertTranslations() {
    const container = document.getElementById('translator-manhua-container');
    if (!container) return;
    const elements = container.querySelectorAll('[data-original-text]');
    elements.forEach(el => {
      el.textContent = el.dataset.originalText;
    });
  }

  // ========== الدالة الرئيسية ==========
  async function init() {
    const ui = createUI();
    const { chapterSelect, imagesDiv, statusDiv } = ui;

    statusDiv.textContent = 'جاري جلب الفهرس...';

    const indexHtml = await fetchWithCors(MANHUA_INDEX_URL);
    if (!indexHtml) {
      imagesDiv.innerHTML = '<p style="color:red;">فشل تحميل الفهرس بعد تجربة جميع البروكسيات.</p>';
      statusDiv.textContent = 'فشل التحميل';
      return;
    }

    statusDiv.textContent = 'تم جلب الفهرس، استخراج الفصول...';
    const chapters = extractChapterLinks(indexHtml);
    if (chapters.length === 0) {
      imagesDiv.innerHTML = '<p>لم يتم العثور على فصول. قد تحتاج لتعديل دالة الاستخراج.</p>';
      statusDiv.textContent = 'لا توجد فصول';
      return;
    }

    // 🔥 حفظ الفهرس الكامل بالفصول في قاعدة البيانات
    saveToDatabase("manhua_index", {
      sourceUrl: MANHUA_INDEX_URL,
      totalChapters: chapters.length,
      chaptersList: chapters
    });

    chapters.forEach((chapter, index) => {
      const option = document.createElement('option');
      option.value = chapter.url;
      option.textContent = chapter.title || `الفصل ${index + 1}`;
      chapterSelect.appendChild(option);
    });

    chapterSelect.addEventListener('change', () => {
      loadChapterImages(chapterSelect.value, imagesDiv, statusDiv);
    });

    await loadChapterImages(chapters[0].url, imagesDiv, statusDiv);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
