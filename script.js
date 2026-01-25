// Podcast RSS'ten kartları dinamik oluşturma

// Podcast kartlarının içeriğini RSS ile güncelle (tasarım bozulmaz)
async function loadPodcastCards() {
  const rssUrl = 'https://anchor.fm/s/101fc0074/podcast/rss';
  const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(rssUrl);

  try {
    const res = await fetch(proxyUrl);
    const data = await res.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, 'text/xml');
    const items = xml.querySelectorAll('item');
    const cards = document.querySelectorAll('.podcast-card');

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
        imgEl.src = imgUrl;
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
        if (appleA) appleA.href = item.querySelector('link')?.textContent || '#';
        // Spotify
        const spotifyA = linksEl.querySelector('a[title="Spotify"]');
        if (spotifyA) spotifyA.href = audioUrl || '#';
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
        statusEl.textContent = 'Mesajınız alındı. Teşekkürler.';
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
        statusEl.textContent = 'Mesajınız alındı. Teşekkürler.';
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
  const modalTitle = modal.querySelector('.podcast-modal-title');

  if (!modal || !modalBody) return;

  modalTitle.textContent = `${platform} - Podcast`;

  // Create iframe based on platform
  let iframeHTML = '';

  if (platform.includes('Spotify')) {
    iframeHTML = `<iframe src="https://open.spotify.com/embed/show/your-show-id" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
  } else if (platform.includes('Apple')) {
    iframeHTML = `<iframe src="${url}" height="450" frameborder="0" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" allow="autoplay *; encrypted-media *;"></iframe>`;
  } else if (platform.includes('YouTube')) {
    iframeHTML = `<iframe src="https://www.youtube.com/embed/videoseries?list=your-playlist-id" height="450" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  } else {
    // Default: open in new tab
    window.open(url, '_blank');
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
