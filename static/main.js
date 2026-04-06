/**
 * Termnix-IT Portfolio - Main JavaScript
 * ==========================================
 */

// ===== ナビバースクロールエフェクト =====
window.addEventListener('scroll', function () {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
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
});

// ===== Qiita 最新記事取得（Qiita API v2 直接呼び出し）=====
var QIITA_USER = 'Termnix-IT';
var QIITA_API_URL = 'https://qiita.com/api/v2/users/' + QIITA_USER + '/items?page=1&per_page=5';

function loadQiitaArticles() {
  var ul = document.getElementById('qiita-articles');
  if (!ul) return;

  fetch(QIITA_API_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('API error');
      return res.json();
    })
    .then(function (data) {
      ul.innerHTML = '';
      if (data.length === 0) {
        ul.innerHTML =
          '<li><span style="color: var(--text-muted);">記事が取得できませんでした</span></li>';
      } else {
        data.forEach(function (article) {
          var li = document.createElement('li');
          li.innerHTML =
            '<a href="' + article.url + '" target="_blank">' + article.title + '</a>';
          ul.appendChild(li);
        });
      }
    })
    .catch(function () {
      ul.innerHTML =
        '<li><span style="color: var(--text-muted);">記事が取得できませんでした</span></li>';
    });
}

function markActiveNavLink() {
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#navbarNav .nav-link').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    }
  });
}
