// translator.js
(function() {
  // ========== الإعدادات ==========
  const MANHUA_INDEX_URL = 'http://m.yueman1.cc/manhua/o/m_waplistindex.html';
  const CORS_PROXY = 'https://api.allorigins.win/raw?url='; // يمكنك تغييره إلى https://corsproxy.io/?
  const TRANSLATE_API = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=';

  // ========== دوال مساعدة ==========

  // جلب محتوى عبر CORS Proxy
  async function fetchWithCors(url) {
    try {
      const response = await fetch(CORS_PROXY + encodeURIComponent(url));
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.text();
    } catch (error) {
      console.error('فشل الجلب:', error);
      return null;
    }
  }

  // استخراج روابط الفصول من صفحة الفهرس
  function extractChapterLinks(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    const chapterLinks = [];

    // البحث عن روابط تحتوي على كلمات دالة على فصول
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

    // إذا لم يتم العثور على روابط، خذ جميع الروابط النصية
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

    // إزالة التكرارات
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

    // تصفية الصور غير المرغوبة (شعارات، أيقونات)
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
    // حاوية رئيسية
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
    `;

    // عنوان
    const header = document.createElement('div');
    header.innerHTML = '<h2 style="margin:0 0 10px; color:#333;">المانهاوا المترجمة تلقائياً</h2>';
    container.appendChild(header);

    // قائمة اختيار الفصل
    const chapterSelect = document.createElement('select');
    chapterSelect.id = 'chapter-select';
    chapterSelect.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 10px; border-radius: 4px; border:1px solid #ccc;';
    container.appendChild(chapterSelect);

    // منطقة عرض الصور
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

    // أزرار تحكم
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

    // إدراج الحاوية في بداية body
    document.body.insertBefore(container, document.body.firstChild);

    return { container, chapterSelect, imagesDiv };
  }

  // عرض صور الفصل المحدد
  async function loadChapterImages(chapterUrl, imagesDiv) {
    imagesDiv.innerHTML = '<p style="color:#666;">جاري تحميل الصور...</p>';
    const html = await fetchWithCors(chapterUrl);
    if (!html) {
      imagesDiv.innerHTML = '<p style="color:red;">فشل تحميل الفصل. تأكد من اتصالك أو جرب بروكسي آخر.</p>';
      return;
    }
    const imageUrls = extractImageUrls(html);
    if (imageUrls.length === 0) {
      imagesDiv.innerHTML = '<p>لا توجد صور في هذا الفصل.</p>';
      return;
    }
    imagesDiv.innerHTML = '';
    imageUrls.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.style.cssText = 'max-width: 100%; height: auto; display: block; margin: 5px 0; border-radius:4px;';
      img.onerror = () => { img.style.display = 'none'; };
      imagesDiv.appendChild(img);
    });
  }

  // ترجمة النصوص الظاهرة داخل الحاوية
  async function translateVisibleTexts() {
    const container = document.getElementById('translator-manhua-container');
    if (!container) return;
    const elements = container.querySelectorAll('h2, select option, p, button, span, div');
    for (let el of elements) {
      // تجاهل العناصر التي تحتوي على صور أو عناصر فرعية كثيرة
      if (el.querySelector('img')) continue;
      if (el.children.length > 0 && !el.matches('option, button, h2')) continue;

      const originalText = el.textContent.trim();
      if (originalText && originalText.length > 1) {
        // حفظ النص الأصلي إن لم يكن محفوظاً
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
    const { chapterSelect, imagesDiv } = ui;

    // جلب صفحة الفهرس
    const indexHtml = await fetchWithCors(MANHUA_INDEX_URL);
    if (!indexHtml) {
      imagesDiv.innerHTML = '<p style="color:red;">فشل تحميل الفهرس. تحقق من الرابط أو البروكسي.</p>';
      return;
    }

    const chapters = extractChapterLinks(indexHtml);
    if (chapters.length === 0) {
      imagesDiv.innerHTML = '<p>لم يتم العثور على فصول. قد تحتاج لتعديل دالة الاستخراج.</p>';
      return;
    }

    // ملء قائمة الفصول
    chapters.forEach((chapter, index) => {
      const option = document.createElement('option');
      option.value = chapter.url;
      option.textContent = chapter.title || `الفصل ${index + 1}`;
      chapterSelect.appendChild(option);
    });

    // عند تغيير الفصل
    chapterSelect.addEventListener('change', () => {
      loadChapterImages(chapterSelect.value, imagesDiv);
    });

    // تحميل أول فصل تلقائياً
    await loadChapterImages(chapters[0].url, imagesDiv);
  }

  // بدء التحميل عند اكتمال DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();