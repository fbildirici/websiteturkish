document.documentElement.classList.add('js');

// Animated counter for hero proof items
document.addEventListener('DOMContentLoaded', function () {
  const proofItems = document.querySelectorAll('[data-count-target]');
  if (!proofItems.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.countTarget, 10);
      const suffix = el.dataset.countSuffix || '';
      const numberEl = el.querySelector('.hero-proof-number');
      if (!numberEl) return;

      const duration = 1400;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        numberEl.textContent = current.toLocaleString('tr-TR') + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.6 });

  proofItems.forEach(item => observer.observe(item));
});

// Dynamic copyright year
document.addEventListener('DOMContentLoaded', function () {
  const year = new Date().getFullYear();
  document.querySelectorAll('.copyright').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/\d{4}/, year);
  });
});

function ensureSafeExternalLinks() {
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    const relValues = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    relValues.add('noopener');
    relValues.add('noreferrer');
    link.setAttribute('rel', Array.from(relValues).join(' '));
  });
}

function initMobileNavigation() {
  document.querySelectorAll('.header-inner').forEach(header => {
    const nav = header.querySelector('.nav');
    if (!nav || header.querySelector('.nav-toggle')) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Menüyü aç');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<span></span><span></span><span></span>';

    header.insertBefore(toggle, nav);

    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Menüyü kapat' : 'Menüyü aç');
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Menüyü aç');
      });
    });
  });
}

function setStoredText(el, key, value) {
  if (!el.dataset[key]) {
    el.dataset[key] = value;
  }
}

function applyLanguage(lang) {
  const isEnglish = lang === 'en';
  document.documentElement.setAttribute('lang', isEnglish ? 'en' : 'tr');

  document.querySelectorAll('[data-i18n-en]').forEach(el => {
    setStoredText(el, 'i18nTr', el.innerHTML);
    el.innerHTML = isEnglish ? el.dataset.i18nEn : el.dataset.i18nTr;
  });

  document.querySelectorAll('[data-i18n-placeholder-en]').forEach(el => {
    setStoredText(el, 'i18nPlaceholderTr', el.getAttribute('placeholder') || '');
    el.setAttribute('placeholder', isEnglish ? el.dataset.i18nPlaceholderEn : el.dataset.i18nPlaceholderTr);
  });

  document.querySelectorAll('[data-lang-toggle]').forEach(button => {
    const nextLanguageLabel = isEnglish ? 'Türkçeye geç' : 'Switch to English';
    button.innerHTML = `
      <span class="lang-toggle-flag" aria-hidden="true">${isEnglish ? '🇹🇷' : '🇬🇧'}</span>
      <span class="sr-only">${nextLanguageLabel}</span>
    `;
    button.setAttribute('aria-label', nextLanguageLabel);
  });

  document.dispatchEvent(new CustomEvent('site-language-change', { detail: { lang: isEnglish ? 'en' : 'tr' } }));
}

function initLanguageToggle() {
  document.querySelectorAll('.header-inner').forEach(header => {
    if (header.querySelector('[data-lang-toggle]')) return;

    const subscribeLink = header.querySelector(':scope > .btn-primary');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'lang-toggle';
    button.dataset.langToggle = '';
    header.insertBefore(button, subscribeLink || null);
  });

  const savedLanguage = localStorage.getItem('site-language') === 'en' ? 'en' : 'tr';
  applyLanguage(savedLanguage);

  document.querySelectorAll('[data-lang-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const nextLanguage = document.documentElement.getAttribute('lang') === 'en' ? 'tr' : 'en';
      localStorage.setItem('site-language', nextLanguage);
      applyLanguage(nextLanguage);
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  ensureSafeExternalLinks();
  initMobileNavigation();
  initLanguageToggle();
});

// Podcast RSS'ten kartları dinamik oluşturma

// Podcast kartlarının içeriğini RSS ile güncelle (tasarım bozulmaz)
async function loadPodcastCards() {
  const cards = document.querySelectorAll('.podcast-card:not(.is-loading)');
  if (!cards.length || document.getElementById('podcast-grid')) return;

  const rssUrl = 'https://anchor.fm/s/101fc0074/podcast/rss';
  const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(rssUrl);

  function getSafeUrl(value, fallback = '#') {
    try {
      const url = new URL(value, window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
    } catch (e) {
      return fallback;
    }
  }

  try {
    const res = await fetch(proxyUrl);
    const data = await res.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, 'text/xml');
    const items = xml.querySelectorAll('item');

    cards.forEach((card, i) => {
      const item = items[i];
      if (!item) return;

      // RSS verisinden içerik çek
      const title = item.querySelector('title')?.textContent || '';
      const desc = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const enclosure = item.querySelector('enclosure');
      const audioUrl = enclosure ? enclosure.getAttribute('url') : '';
      const img = item.querySelector('itunes\\:image, image');
      const imgUrl = img ? img.getAttribute('href') || img.textContent : 'https://i.scdn.co/image/ab6765630000ba8a823948dccf73c9013bbf7ed6';

      // Görseli güncelle
      const imgEl = card.querySelector('.podcast-card-image img');
      if (imgEl) {
        imgEl.src = getSafeUrl(imgUrl, imgEl.src);
        imgEl.alt = title;
      }

      // Başlığı güncelle
      const titleEl = card.querySelector('.podcast-card-title');
      if (titleEl) titleEl.textContent = title;

      // Açıklamayı güncelle
      const descEl = card.querySelector('.podcast-card-desc');
      if (descEl) descEl.textContent = desc;

      // Tarihi güncelle
      const dateEl = card.querySelector('.podcast-card-date');
      if (dateEl) dateEl.textContent = new Date(pubDate).toLocaleDateString('tr-TR');

      // Linkleri güncelle
      const linksEl = card.querySelector('.podcast-card-links');
      if (linksEl) {
        // Apple Podcasts
        const appleA = linksEl.querySelector('a[title="Apple Podcasts"]');
        if (appleA) appleA.href = getSafeUrl(item.querySelector('link')?.textContent || '#');
        // Spotify
        const spotifyA = linksEl.querySelector('a[title="Spotify"]');
        if (spotifyA) spotifyA.href = getSafeUrl(audioUrl || '#');
        // YouTube
        const youtubeA = linksEl.querySelector('a[title="YouTube"]');
        if (youtubeA) youtubeA.href = 'https://www.youtube.com/@otostopcununyzrehberipodcast';
      }
    });
  } catch (e) {
    console.error('Podcast yüklenemedi:', e);
    // Hata durumunda kartlar olduğu gibi kalır
  }
}

window.addEventListener('DOMContentLoaded', loadPodcastCards);

// Modal functionality for podcast platform icons
document.addEventListener('DOMContentLoaded', function() {
  // Create modal HTML
  const modalHTML = `
    <div class="podcast-modal" id="podcastModal">
      <div class="podcast-modal-content">
        <div class="podcast-modal-header">
          <h3 class="podcast-modal-title">Podcast Dinle</h3>
          <button class="podcast-modal-close" onclick="closePodcastModal()">&times;</button>
        </div>
        <div class="podcast-modal-body" id="podcastModalBody">
          <!-- iframe will be inserted here -->
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add click handlers to platform icons
  const podcastIcons = document.querySelectorAll('.vc-podcast-icons a');

  podcastIcons.forEach(icon => {
    icon.addEventListener('click', function(e) {
      e.preventDefault();
      const platform = this.getAttribute('aria-label');
      const href = this.getAttribute('href');

      openPodcastModal(platform, href);
    });
  });

  // Close modal when clicking outside
  document.getElementById('podcastModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
      closePodcastModal();
    }
  });

  // Close modal with ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closePodcastModal();
    }
  });
});

// Contact form submission via Google Apps Script
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const statusEl = document.getElementById('contactStatus');
  const submitButton = form.querySelector('.btn-submit-contact');
  const scriptUrl = form.dataset.scriptUrl || form.action;
  const iframe = document.getElementById('contactFrame');

  if (!scriptUrl || scriptUrl.includes('REPLACE_WITH_SCRIPT_ID')) {
    if (statusEl) {
      statusEl.textContent = 'Form endpointi ayarlanmadı.';
      statusEl.classList.add('is-error');
    }
    return;
  }

  if (form.getAttribute('target') === 'contactFrame' && iframe) {
    let submitted = false;

    form.addEventListener('submit', function() {
      submitted = true;
      if (statusEl) {
        statusEl.textContent = 'Gönderiliyor...';
        statusEl.className = 'contact-status';
      }
      if (submitButton) submitButton.disabled = true;
    });

    iframe.addEventListener('load', function() {
      if (!submitted) return;

      if (statusEl) {
        statusEl.textContent = 'Mesaj gönderimi tamamlandı. Yanıt alamazsanız lütfen e-posta ile ulaşın.';
        statusEl.classList.add('is-success');
      }

      form.reset();
      if (submitButton) submitButton.disabled = false;
      submitted = false;
    });

    return;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (statusEl) {
      statusEl.textContent = 'Gönderiliyor...';
      statusEl.className = 'contact-status';
    }

    if (submitButton) submitButton.disabled = true;

    try {
      const formData = new FormData(form);
      await fetch(scriptUrl, {
        method: 'POST',
        body: formData,
        mode: 'no-cors'
      });

      if (statusEl) {
        statusEl.textContent = 'Mesaj gönderimi tamamlandı. Yanıt alamazsanız lütfen e-posta ile ulaşın.';
        statusEl.classList.add('is-success');
      }

      form.reset();
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = 'Gönderim başarısız oldu. Lütfen tekrar deneyin.';
        statusEl.classList.add('is-error');
      }
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
});

function openPodcastModal(platform, url) {
  const modal = document.getElementById('podcastModal');
  const modalBody = document.getElementById('podcastModalBody');

  if (!modal || !modalBody) return;

  const modalTitle = modal.querySelector('.podcast-modal-title');
  if (!modalTitle) return;

  modalTitle.textContent = `${platform} - Podcast`;

  // Create iframe based on platform
  let iframeHTML = '';
  let safeUrl = '#';

  try {
    const parsedUrl = new URL(url, window.location.href);
    safeUrl = ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.href : '#';
  } catch (e) {
    safeUrl = '#';
  }

  if (platform.includes('Spotify')) {
    iframeHTML = `<iframe src="https://open.spotify.com/embed/show/1rCeqPdviUG61ucnpFDl6n" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
  } else if (platform.includes('Apple')) {
    iframeHTML = `<iframe src="${safeUrl}" height="450" frameborder="0" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" allow="autoplay *; encrypted-media *;"></iframe>`;
  } else if (platform.includes('YouTube')) {
    iframeHTML = `<iframe src="https://www.youtube.com/embed/videoseries?list=PLjX32lVkbYlFv2dBFkg-Eqclad9ga5E0T" height="450" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  } else {
    // Default: open in new tab
    window.open(safeUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  modalBody.innerHTML = iframeHTML;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePodcastModal() {
  const modal = document.getElementById('podcastModal');
  const modalBody = document.getElementById('podcastModalBody');

  if (!modal) return;

  modal.classList.remove('active');
  document.body.style.overflow = '';

  // Clear iframe after animation
  setTimeout(() => {
    if (modalBody) modalBody.innerHTML = '';
  }, 300);
}

function shareArticle(platform) {
  const titleEl = document.querySelector('.article-title');
  const title = titleEl ? titleEl.innerText : document.title;
  const url = window.location.href;
  const text = encodeURIComponent(title + ' - ' + url);

  if (platform === 'whatsapp') {
    window.open('https://wa.me/?text=' + text, '_blank', 'noopener,noreferrer');
  } else if (platform === 'facebook') {
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer');
  } else if (platform === 'linkedin') {
    window.open('https://www.linkedin.com/shareArticle?mini=true&url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title), '_blank', 'noopener,noreferrer');
  } else if (platform === 'x') {
    window.open('https://x.com/intent/tweet?text=' + text, '_blank', 'noopener,noreferrer');
  }
}

// Smooth scroll for academic page navigation
document.addEventListener('DOMContentLoaded', function() {
  const aboutNavLinks = document.querySelectorAll('.about-nav-link');
  
  aboutNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all links
      aboutNavLinks.forEach(l => l.classList.remove('active'));
      
      // Add active class to clicked link
      this.classList.add('active');
      
      // Get target section
      const targetId = this.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      if (targetSection) {
        // Smooth scroll to section
        const headerOffset = 100;
        const elementPosition = targetSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Update active link on scroll
  const sections = document.querySelectorAll('.about-section');
  
  window.addEventListener('scroll', function() {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.pageYOffset >= (sectionTop - 150)) {
        current = section.getAttribute('id');
      }
    });
    
    aboutNavLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  });
});
