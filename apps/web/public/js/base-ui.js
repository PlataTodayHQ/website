// base-ui.js — Extracted from Base.astro inline scripts
// Handles: header scroll, overlays, theme toggle, breaking news, lang CTA,
//          newsletter forms, pull-to-refresh

// --- Smooth header shrink on scroll ---
(function() {
  var header = document.querySelector('.header');
  if (!header) return;
  var utilBar = header.querySelector('.utility-bar');
  var SCROLL_DISTANCE = 80;
  var ticking = false;
  var lastProgress = -1;
  var update = function() {
    var progress = Math.min(window.scrollY / SCROLL_DISTANCE, 1);
    // Snap to 0 or 1 when close to avoid sub-pixel jitter
    if (progress < 0.01) progress = 0;
    else if (progress > 0.99) progress = 1;
    else progress = Math.round(progress * 1000) / 1000;
    if (progress !== lastProgress) {
      header.style.setProperty('--scroll-progress', progress);
      if (utilBar) utilBar.style.pointerEvents = progress > 0.5 ? 'none' : '';
      lastProgress = progress;
    }
    ticking = false;
  };
  var onScroll = function() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

// --- Overlay system ---
(function() {
  var menuBtn = document.querySelector('.menu-btn');
  var langBtn = document.querySelector('[data-lang-trigger]');
  var menuOverlay = document.getElementById('mobile-menu');
  var menuBackdrop = document.getElementById('mobile-backdrop');
  var langOverlay = document.getElementById('mobile-langs');
  var searchOverlay = document.getElementById('search-overlay');
  var searchBtn = document.querySelector('[data-search-trigger]');
  var isMobile = function() { return window.matchMedia('(max-width: 768px)').matches; };
  var lastFocusedElement = null;

  // --- Drawer (mobile menu) ---
  function openDrawer() {
    if (!menuOverlay || !menuBackdrop) return;
    lastFocusedElement = document.activeElement;
    menuOverlay.hidden = false;
    menuBackdrop.hidden = false;
    // Force reflow for transition
    menuOverlay.offsetHeight;
    menuBackdrop.offsetHeight;
    menuOverlay.classList.add('open');
    menuBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    var closeBtn = menuOverlay.querySelector('.drawer-close');
    if (closeBtn) setTimeout(function() { closeBtn.focus(); }, 300);
    menuOverlay.addEventListener('keydown', trapFocus);
  }

  function closeDrawer() {
    if (!menuOverlay || menuOverlay.hidden) return;
    menuOverlay.classList.remove('open');
    if (menuBackdrop) menuBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    menuOverlay.removeEventListener('keydown', trapFocus);
    // Wait for transition to finish before hiding
    setTimeout(function() {
      menuOverlay.hidden = true;
      if (menuBackdrop) menuBackdrop.hidden = true;
      if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
      }
    }, 300);
  }

  // --- Fullscreen overlays (language, search) ---
  function openOverlay(el, trigger) {
    lastFocusedElement = trigger || document.activeElement;
    el.hidden = false;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (el === searchOverlay && searchBtn) searchBtn.setAttribute('aria-expanded', 'true');
    var closeBtn = el.querySelector('.overlay-close');
    if (closeBtn) closeBtn.focus();
    el.addEventListener('keydown', trapFocus);
  }

  function closeOverlay(el) {
    if (!el || el.hidden) return;
    el.classList.remove('open');
    el.hidden = true;
    document.body.style.overflow = '';
    if (el === searchOverlay && searchBtn) searchBtn.setAttribute('aria-expanded', 'false');
    el.removeEventListener('keydown', trapFocus);
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    var overlay = e.currentTarget;
    var focusable = overlay.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Menu button opens drawer
  if (menuBtn) menuBtn.addEventListener('click', function() { openDrawer(); });

  // Backdrop click closes drawer
  if (menuBackdrop) menuBackdrop.addEventListener('click', function() { closeDrawer(); });

  // Drawer close button
  var drawerCloseBtn = menuOverlay ? menuOverlay.querySelector('.drawer-close') : null;
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', function() { closeDrawer(); });

  // Drawer quick actions
  var drawerSearchBtn = menuOverlay ? menuOverlay.querySelector('[data-drawer-search]') : null;
  if (drawerSearchBtn && searchOverlay) {
    drawerSearchBtn.addEventListener('click', function() {
      closeDrawer();
      setTimeout(function() {
        openOverlay(searchOverlay, menuBtn);
        var input = searchOverlay.querySelector('.search-input');
        if (input) setTimeout(function() { input.focus(); }, 50);
      }, 320);
    });
  }

  var drawerLangBtn = menuOverlay ? menuOverlay.querySelector('[data-drawer-lang]') : null;
  if (drawerLangBtn && langOverlay) {
    drawerLangBtn.addEventListener('click', function() {
      closeDrawer();
      setTimeout(function() { openOverlay(langOverlay, menuBtn); }, 320);
    });
  }

  var drawerThemeBtn = menuOverlay ? menuOverlay.querySelector('[data-drawer-theme]') : null;
  if (drawerThemeBtn) {
    drawerThemeBtn.addEventListener('click', function() {
      var cur = localStorage.getItem('plata-theme') || 'system';
      var next = cur === 'system' ? 'light' : cur === 'light' ? 'dark' : 'system';
      if (next === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', next);
      }
      localStorage.setItem('plata-theme', next);
      // Update header theme toggle label too
      var headerThemeBtn = document.querySelector('[data-theme-toggle]');
      if (headerThemeBtn) {
        var labels = { system: headerThemeBtn.dataset.labelLight, light: headerThemeBtn.dataset.labelDark, dark: headerThemeBtn.dataset.labelSystem };
        headerThemeBtn.setAttribute('aria-label', labels[next] || labels.system);
      }
    });
  }

  // Swipe-to-close for drawer
  if (menuOverlay) {
    var startX = 0, currentX = 0, swiping = false;
    menuOverlay.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      swiping = true;
      currentX = 0;
      menuOverlay.style.transition = 'none';
    }, { passive: true });
    menuOverlay.addEventListener('touchmove', function(e) {
      if (!swiping) return;
      currentX = e.touches[0].clientX - startX;
      if (currentX < 0) {
        menuOverlay.style.transform = 'translateX(' + currentX + 'px)';
        if (menuBackdrop) menuBackdrop.style.opacity = Math.max(0, 1 + currentX / 300);
      }
    }, { passive: true });
    menuOverlay.addEventListener('touchend', function() {
      if (!swiping) return;
      swiping = false;
      menuOverlay.style.transition = '';
      menuOverlay.style.transform = '';
      if (menuBackdrop) menuBackdrop.style.opacity = '';
      if (currentX < -80) closeDrawer();
      currentX = 0;
    }, { passive: true });
  }

  if (langBtn) {
    langBtn.addEventListener('click', function(e) {
      if (isMobile()) { e.stopPropagation(); openOverlay(langOverlay, langBtn); }
    });
  }

  // Search overlay (header button)
  if (searchBtn && searchOverlay) {
    searchBtn.addEventListener('click', function() {
      openOverlay(searchOverlay, searchBtn);
      var input = searchOverlay.querySelector('.search-input');
      if (input) setTimeout(function() { input.focus(); }, 50);
    });
  }

  // Close buttons in fullscreen overlays
  document.querySelectorAll('.overlay-close').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var overlay = btn.closest('.mobile-overlay');
      if (overlay) closeOverlay(overlay);
    });
  });

  // Escape closes any open overlay or drawer
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (menuOverlay && !menuOverlay.hidden) closeDrawer();
      [langOverlay, searchOverlay].forEach(function(ov) {
        if (ov && !ov.hidden) closeOverlay(ov);
      });
    }
  });
})();

// --- Theme toggle ---
(function() {
  var btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  function getTheme() { return localStorage.getItem('plata-theme') || 'system'; }
  function updateLabel() {
    var th = getTheme();
    var labels = { system: btn.dataset.labelLight, light: btn.dataset.labelDark, dark: btn.dataset.labelSystem };
    btn.setAttribute('aria-label', labels[th] || labels.system);
  }
  updateLabel();
  btn.addEventListener('click', function() {
    var cur = getTheme();
    var next = cur === 'system' ? 'light' : cur === 'light' ? 'dark' : 'system';
    if (next === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', next);
    }
    localStorage.setItem('plata-theme', next);
    updateLabel();
  });
})();

// --- Breaking news dismiss ---
(function() {
  var bar = document.getElementById('breaking-news');
  if (!bar) return;
  if (sessionStorage.getItem('breaking-dismissed')) { bar.hidden = true; return; }
  var dismiss = bar.querySelector('[data-dismiss-breaking]');
  if (dismiss) dismiss.addEventListener('click', function() {
    bar.hidden = true;
    sessionStorage.setItem('breaking-dismissed', '1');
  });
})();

// --- Language suggestion CTA (mobile) ---
(function() {
  var cta = document.getElementById('lang-cta');
  if (!cta || sessionStorage.getItem('lang-cta-dismissed')) return;
  if (window.matchMedia('(min-width: 769px)').matches) return;
  var pageLang = document.documentElement.lang;
  var browserLang = (navigator.language || '').split('-')[0].toLowerCase();
  if (browserLang === pageLang) return;
  try {
    var map = JSON.parse(document.documentElement.dataset.langMap || '{}');
    var match = map[browserLang];
    if (!match) return;
    var link = document.getElementById('lang-cta-link');
    if (link) { link.textContent = match.label; link.href = '/' + browserLang + '/'; }
    cta.hidden = false;
  } catch(e) {}
  var dismissBtn = cta.querySelector('[data-dismiss-lang-cta]');
  if (dismissBtn) dismissBtn.addEventListener('click', function() {
    cta.hidden = true;
    sessionStorage.setItem('lang-cta-dismissed', '1');
  });
})();

// Newsletter forms
document.querySelectorAll('[data-newsletter-form]').forEach(function(form) {
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var success = form.querySelector('[class*="success"]');
    if (input) input.hidden = true;
    if (btn) btn.hidden = true;
    if (success) success.hidden = false;
    // Hide any hint/label siblings
    var hint = form.querySelector('[class*="hint"]');
    if (hint) hint.hidden = true;
    var label = form.querySelector('label');
    if (label) label.hidden = true;
  });
});

// --- Pull to refresh ---
(function() {
  var ptr = document.getElementById('ptr');
  if (!ptr || !('ontouchstart' in window)) return;

  var startY = 0;
  var pulling = false;
  var threshold = 80;
  var maxPull = 120;
  var currentPull = 0;

  function isAtTop() {
    return window.scrollY <= 0;
  }

  function hasOpenOverlay() {
    var overlays = document.querySelectorAll('.mobile-overlay');
    for (var i = 0; i < overlays.length; i++) {
      if (!overlays[i].hidden) return true;
    }
    return false;
  }

  document.addEventListener('touchstart', function(e) {
    if (isAtTop() && !hasOpenOverlay()) {
      startY = e.touches[0].clientY;
      pulling = true;
      currentPull = 0;
    }
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (!pulling) return;
    var dy = e.touches[0].clientY - startY;
    if (dy < 0) { pulling = false; return; }
    currentPull = Math.min(dy * 0.5, maxPull);
    if (currentPull > 10) {
      ptr.classList.add('ptr--visible');
      ptr.style.transform = 'translateY(' + (currentPull - 50) + 'px)';
      var rotation = (currentPull / threshold) * 360;
      var icon = ptr.querySelector('.ptr-icon');
      if (icon) icon.style.transform = 'rotate(' + rotation + 'deg)';
      if (currentPull >= threshold) {
        ptr.classList.add('ptr--ready');
      } else {
        ptr.classList.remove('ptr--ready');
      }
    }
  }, { passive: true });

  document.addEventListener('touchend', function() {
    if (!pulling) return;
    if (currentPull >= threshold) {
      ptr.classList.add('ptr--loading');
      ptr.classList.remove('ptr--ready');
      ptr.style.transform = 'translateY(10px)';
      setTimeout(function() { location.reload(); }, 200);
    } else {
      ptr.classList.remove('ptr--visible', 'ptr--ready');
      ptr.style.transform = '';
    }
    pulling = false;
    currentPull = 0;
    startY = 0;
  }, { passive: true });
})();
