/**
 * Termnix-IT Portfolio - Main JavaScript
 * ==========================================
 */

// ===== ナビバースクロールエフェクト =====
var _scrollTicking = false;
window.addEventListener('scroll', function () {
  if (_scrollTicking) return;
  _scrollTicking = true;
  requestAnimationFrame(function () {
    var nav = document.getElementById('mainNav');
    if (nav) {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
    _scrollTicking = false;
  });
});

// ===== スクロールアニメーション（IntersectionObserver）=====
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.addEventListener('DOMContentLoaded', function () {
  markActiveNavLink();

  // fade-up 要素を監視
  document.querySelectorAll('.fade-up').forEach(function (el) {
    observer.observe(el);
  });

  // Qiita 最新記事の取得
  loadQiitaArticles();

  // ライトボックス初期化
  initLightbox();
});

// ===== ライトボックス =====
function initLightbox() {
  var zoomables = document.querySelectorAll('.diagram-zoomable');
  if (!zoomables.length) return;

  // オーバーレイを生成
  var overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '画像拡大表示');

  var closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox-close';
  closeBtn.setAttribute('aria-label', '閉じる');
  closeBtn.innerHTML = '&times;';

  var img = document.createElement('img');
  img.alt = '';

  overlay.appendChild(closeBtn);
  overlay.appendChild(img);
  document.body.appendChild(overlay);

  function openLightbox(src, alt) {
    img.src = src;
    img.alt = alt || '';
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeLightbox() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    img.src = '';
  }

  zoomables.forEach(function (el) {
    el.addEventListener('click', function () {
      openLightbox(el.src, el.alt);
    });
  });

  closeBtn.addEventListener('click', closeLightbox);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });
}

// ===== Qiita 最新記事取得（Qiita API v2 直接呼び出し）=====
var QIITA_USER = 'Termnix-IT';
var QIITA_API_URL = 'https://qiita.com/api/v2/users/' + QIITA_USER + '/items?page=1&per_page=5';
var _qiitaCache = null;

function renderQiitaError(ul) {
  ul.innerHTML = '';
  var li = document.createElement('li');
  var span = document.createElement('span');
  span.style.color = 'var(--text-muted)';
  span.textContent = '記事が取得できませんでした';
  li.appendChild(span);
  ul.appendChild(li);
}

function loadQiitaArticles() {
  var ul = document.getElementById('qiita-articles');
  if (!ul) return;

  // キャッシュがあれば再利用
  if (_qiitaCache) {
    renderQiitaArticles(ul, _qiitaCache);
    return;
  }

  // タイムアウト（5秒）でローディング解除
  var timeoutId = setTimeout(function () {
    renderQiitaError(ul);
  }, 5000);

  fetch(QIITA_API_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('API error');
      return res.json();
    })
    .then(function (data) {
      clearTimeout(timeoutId);
      _qiitaCache = data;
      renderQiitaArticles(ul, data);
    })
    .catch(function () {
      clearTimeout(timeoutId);
      renderQiitaError(ul);
    });
}

function renderQiitaArticles(ul, data) {
  ul.innerHTML = '';
  if (data.length === 0) {
    renderQiitaError(ul);
    return;
  }
  data.forEach(function (article) {
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = article.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = article.title;
    li.appendChild(a);
    ul.appendChild(li);
  });
}

function markActiveNavLink() {
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbarNav .nav-link').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}
