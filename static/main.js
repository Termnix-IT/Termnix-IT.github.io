/**
 * Termnix-IT Portfolio - Main JavaScript
 * 共通 UI の初期化と、軽量なページ補助処理をまとめる。
 */

const NAV_SCROLLED_THRESHOLD = 50;
const ANIMATION_SELECTOR = '.fade-up, .hero-headline-motion, .hero-proof-motion';
const QIITA_USER = 'Termnix-IT';
const QIITA_API_URL = `https://qiita.com/api/v2/users/${QIITA_USER}/items?page=1&per_page=5`;
const QIITA_REQUEST_TIMEOUT_MS = 5000;

let isScrollTicking = false;
let qiitaCache = null;

const animationObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      return;
    }

    entry.target.classList.add('animate-in');
    observer.unobserve(entry.target);
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px',
});

window.addEventListener('scroll', handleWindowScroll, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarState();
  markActiveNavLink();
  observeAnimatedElements();
  loadQiitaArticles();
  initLightbox();
});

function handleWindowScroll() {
  if (isScrollTicking) {
    return;
  }

  isScrollTicking = true;
  requestAnimationFrame(() => {
    updateNavbarState();
    isScrollTicking = false;
  });
}

function updateNavbarState() {
  const nav = document.getElementById('mainNav');
  if (!nav) {
    return;
  }

  nav.classList.toggle('scrolled', window.scrollY > NAV_SCROLLED_THRESHOLD);
}

function observeAnimatedElements() {
  document.querySelectorAll(ANIMATION_SELECTOR).forEach((element) => {
    animationObserver.observe(element);
  });
}

function initLightbox() {
  const zoomableImages = document.querySelectorAll('.diagram-zoomable');
  if (!zoomableImages.length) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '画像拡大表示');

  const closeButton = document.createElement('button');
  closeButton.className = 'lightbox-close';
  closeButton.setAttribute('aria-label', '閉じる');
  closeButton.innerHTML = '&times;';

  const lightboxImage = document.createElement('img');
  lightboxImage.alt = '';

  overlay.append(closeButton, lightboxImage);
  document.body.appendChild(overlay);

  const setLightboxState = (isOpen, src = '', alt = '') => {
    overlay.classList.toggle('is-open', isOpen);
    lightboxImage.src = src;
    lightboxImage.alt = alt;
    document.body.style.overflow = isOpen ? 'hidden' : '';

    if (isOpen) {
      closeButton.focus();
    }
  };

  zoomableImages.forEach((image) => {
    image.addEventListener('click', () => {
      setLightboxState(true, image.src, image.alt || '');
    });
  });

  closeButton.addEventListener('click', () => setLightboxState(false));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      setLightboxState(false);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
      setLightboxState(false);
    }
  });
}

async function loadQiitaArticles() {
  const list = document.getElementById('qiita-articles');
  if (!list) {
    return;
  }

  if (qiitaCache) {
    renderQiitaArticles(list, qiitaCache);
    return;
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let didTimeout = false;

  const timeoutId = window.setTimeout(() => {
    didTimeout = true;
    if (controller) {
      controller.abort();
    }
    renderQiitaMessage(list, '記事が取得できませんでした');
  }, QIITA_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(QIITA_API_URL, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) {
      throw new Error('Qiita API request failed');
    }

    const data = await response.json();
    if (didTimeout) {
      return;
    }

    qiitaCache = Array.isArray(data) ? data : [];
    renderQiitaArticles(list, qiitaCache);
  } catch (error) {
    if (!didTimeout) {
      renderQiitaMessage(list, '記事が取得できませんでした');
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function renderQiitaArticles(list, articles) {
  list.innerHTML = '';

  if (!articles.length) {
    renderQiitaMessage(list, '記事がまだありません');
    return;
  }

  articles.forEach((article) => {
    const listItem = document.createElement('li');
    const link = document.createElement('a');

    link.href = article.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = article.title;

    listItem.appendChild(link);
    list.appendChild(listItem);
  });
}

function renderQiitaMessage(list, message) {
  list.innerHTML = '';

  const listItem = document.createElement('li');
  listItem.className = 'qiita-status';
  listItem.textContent = message;

  list.appendChild(listItem);
}

function markActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('#navbarNav .nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href !== currentPath) {
      return;
    }

    link.classList.add('active');
    link.setAttribute('aria-current', 'page');
  });
}
