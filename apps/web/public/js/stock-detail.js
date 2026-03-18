(function() {
  var C = window.PlataCharts;
  var page = document.querySelector('[data-stock-page]');
  var lang = page.getAttribute('data-lang') || 'en';
  var i18n = {};
  try { i18n = JSON.parse(page.getAttribute('data-i18n') || '{}'); } catch(e) {}

  // ─── Watchlist ───
  var WL_KEY = 'plata-watchlist';
  function getWatchlist() {
    try { return JSON.parse(localStorage.getItem(WL_KEY) || '[]'); } catch(e) { return []; }
  }
  function saveWatchlist(list) {
    try { localStorage.setItem(WL_KEY, JSON.stringify(list)); } catch(e) {}
  }
  var wlToastTimer;
  function showWlToast(msg) {
    var el = document.querySelector('[data-wl-toast]');
    if (!el) return;
    clearTimeout(wlToastTimer);
    el.textContent = msg;
    el.classList.add('wl-toast--visible');
    wlToastTimer = setTimeout(function() { el.classList.remove('wl-toast--visible'); }, 2000);
  }

  // Init detail star
  var detailStar = document.querySelector('[data-wl-detail-star]');
  if (detailStar) {
    var rawSym = new URLSearchParams(window.location.search).get('s') || '';
    var starSym = rawSym.replace(/\.BA$/i, '');
    var addedMsg = detailStar.getAttribute('data-i18n-added-to-watchlist') || 'Added to watchlist';
    var removedMsg = detailStar.getAttribute('data-i18n-removed-from-watchlist') || 'Removed from watchlist';
    function updateDetailStar() {
      var inWl = getWatchlist().indexOf(starSym) !== -1;
      detailStar.classList.toggle('wl-detail-star--active', inWl);
      detailStar.innerHTML = inWl ? '\u2605' : '\u2606';
    }
    if (starSym) {
      updateDetailStar();
      detailStar.addEventListener('click', function() {
        var list = getWatchlist();
        var idx = list.indexOf(starSym);
        var added;
        if (idx !== -1) { list.splice(idx, 1); added = false; }
        else { list.push(starSym); added = true; }
        saveWatchlist(list);
        updateDetailStar();
        showWlToast(added ? addedMsg : removedMsg);
      });
    }
  }

  function setEl(sel, text) {
    var el = document.querySelector(sel);
    if (el) el.textContent = text;
  }

  function showEl(sel) {
    var el = document.querySelector(sel);
    if (el) el.style.display = '';
  }

  // Format large numbers (1.2B, 345M, etc.)
  function fmtBig(n) {
    if (n == null) return '—';
    if (Math.abs(n) >= 1e12) return (n / 1e12).toLocaleString(lang, { maximumFractionDigits: 2 }) + 'T';
    if (Math.abs(n) >= 1e9) return (n / 1e9).toLocaleString(lang, { maximumFractionDigits: 2 }) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toLocaleString(lang, { maximumFractionDigits: 2 }) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toLocaleString(lang, { maximumFractionDigits: 1 }) + 'K';
    return n.toLocaleString(lang);
  }

  function fmtPct(n) {
    if (n == null) return '—';
    return (n * 100).toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  function fmtNum(n, dec) {
    if (n == null) return '—';
    var d = dec != null ? dec : 2;
    return n.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  // Read symbol from data attribute (path-based routing) or query string (legacy)
  var symbol = (page.getAttribute('data-symbol') || '').trim().toUpperCase().replace(/\.BA$/, '');
  if (!symbol) {
    var params = new URLSearchParams(window.location.search);
    symbol = (params.get('s') || '').trim().toUpperCase().replace(/\.BA$/, '');
  }

  if (!symbol) {
    var emptyEl = document.querySelector('[data-stock-empty]');
    emptyEl.style.display = 'block';
    // Show recently viewed stocks
    try {
      var recentList = JSON.parse(localStorage.getItem('plata_recent_stocks') || '[]');
      if (recentList.length > 0) {
        var recentHtml = '<div class="recent-stocks"><h3 class="recent-title">' + (i18n.recentlyViewed || 'Recently viewed') + '</h3><div class="recent-chips">';
        for (var ri = 0; ri < recentList.length; ri++) {
          recentHtml += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(recentList[ri]) + '" class="recent-chip">' + recentList[ri] + '</a>';
        }
        recentHtml += '</div></div>';
        emptyEl.insertAdjacentHTML('beforeend', recentHtml);
      }
    } catch(e) {}
    return;
  }

  document.querySelector('[data-stock-content]').style.display = 'block';

  // Determine asset type from symbol
  var isCrypto = symbol.indexOf('-USD') !== -1;
  var isCommodity = symbol.indexOf('=') !== -1;
  var displaySymbol = isCrypto ? symbol.replace('-USD', '') : symbol;

  setEl('[data-stock-symbol]', displaySymbol);

  // Share button
  var shareBtn = document.querySelector('[data-share-btn]');
  if (shareBtn) {
    shareBtn.style.display = '';
    shareBtn.addEventListener('click', function() {
      var url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: displaySymbol + ' — Plata', url: url }).catch(function() {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function() {
          shareBtn.classList.add('share-btn--copied');
          setTimeout(function() { shareBtn.classList.remove('share-btn--copied'); }, 1500);
        });
      }
    });
  }

  // Update badge
  var badgeEl = document.querySelector('.rc-badge--merval');
  if (badgeEl) {
    if (isCrypto) { badgeEl.textContent = i18n.cryptoTag || 'CRYPTO'; badgeEl.className = 'rc-badge rc-badge--crypto'; }
    else if (isCommodity) { badgeEl.textContent = 'CME'; badgeEl.className = 'rc-badge rc-badge--commodity'; }
  }

  // Update back link for non-BYMA assets
  var backLink = document.querySelector('.back-link');
  if (backLink && (isCrypto || isCommodity)) {
    backLink.href = '/' + lang + '/markets';
    backLink.innerHTML = '&larr; ' + (i18n.marketsLabel || 'Markets');
  }

  // Update breadcrumb
  var breadcrumbs = document.querySelectorAll('.breadcrumb-link, [data-breadcrumbs] a');
  var lastCrumb = breadcrumbs[breadcrumbs.length - 1];
  if (lastCrumb) lastCrumb.textContent = symbol;

  document.title = displaySymbol + ' — ' + (i18n.pageTitle || 'Argentine Markets') + ' | Plata';

  // ── Save to recently viewed (localStorage) ──
  try {
    var RECENT_KEY = 'plata_recent_stocks';
    var MAX_RECENT = 8;
    var recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    recent = recent.filter(function(s) { return s !== symbol; });
    recent.unshift(symbol);
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    // Render recently viewed section (excluding current stock)
    var others = recent.filter(function(s) { return s !== symbol; });
    if (others.length > 0) {
      var rvSection = document.querySelector('[data-recent-viewed]');
      if (rvSection) {
        var html = '<h3 class="recent-title">' + (i18n.recentlyViewed || 'Recently viewed') + '</h3><div class="recent-chips">';
        for (var ri = 0; ri < others.length; ri++) {
          html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(others[ri]) + '" class="recent-chip">' + others[ri] + '</a>';
        }
        html += '</div>';
        rvSection.innerHTML = html;
        rvSection.style.display = '';
      }
    }
  } catch(e) {}

  var currentChart = null;

  function drawVolumeBars(timestamps, volumes, closes) {
    var canvas = document.querySelector('[data-vol-chart]');
    if (!canvas || !timestamps || !volumes || volumes.length < 2) return;
    var wrap = canvas.parentElement;
    var wrapStyle = getComputedStyle(wrap);
    var wrapPadX = parseFloat(wrapStyle.paddingLeft) + parseFloat(wrapStyle.paddingRight);
    var w = Math.round(wrap.getBoundingClientRect().width - wrapPadX) || 900;
    var h = 60;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var padL = 65, padR = 20, padT = 4, padB = 16;
    var cW = w - padL - padR;
    var cH = h - padT - padB;
    var n = timestamps.length;

    var maxVol = 0;
    for (var i = 0; i < volumes.length; i++) {
      if (volumes[i] > maxVol) maxVol = volumes[i];
    }
    if (maxVol === 0) return;

    var barW = Math.max(1, (cW / n) - 1);

    for (var j = 0; j < n; j++) {
      var vol = volumes[j] || 0;
      var barH = (vol / maxVol) * cH;
      var x = padL + (j / (n - 1)) * cW - barW / 2;
      var y = padT + cH - barH;
      var isUp = closes && j > 0 && closes[j] >= closes[j - 1];
      ctx.fillStyle = isUp ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)';
      ctx.fillRect(x, y, barW, barH);
    }

    // Volume label
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text-meta').trim() || '#6e6e6e';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(fmtBig(maxVol), padL - 10, padT + 10);
  }

  // ── Load price & chart data ──
  function loadStock(range, interval) {
    var url = '/api/stock/' + encodeURIComponent(symbol) + '?range=' + range + '&interval=' + interval;

    fetch(url).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) {
        var errEl = document.querySelector('[data-stock-name]');
        if (errEl) errEl.textContent = data.error;
        // Show error card in chart area
        var chartArea = document.querySelector('[data-price-card]');
        if (chartArea) chartArea.innerHTML = MktStates.buildErrorCard({ message: data.error, hint: i18n.checkConn || 'Check your connection and try again', retryLabel: i18n.retry || 'Retry' });
        return;
      }

      var stkUpdEl = document.querySelector('[data-mkts-updated]');
      if (stkUpdEl) stkUpdEl.innerHTML = '<span class="live-dot"></span>' + (i18n.updated || 'Updated') + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
      setEl('[data-stock-name]', data.name || symbol);
      if (data.currency) setEl('[data-stock-currency]', data.currency);

      if (data.price) {
        storedPrice = data.price;
        setEl('[data-stock-price]', C.fmt(data.price));
        var pc = document.querySelector('[data-price-card]');
        if (pc) pc.classList.remove('price-card--loading');
        var pct = data.variation != null ? data.variation * 100 : null;
        var chEl = document.querySelector('[data-stock-change]');
        if (chEl && pct != null) {
          chEl.textContent = C.pctText(pct);
          chEl.className = 'pc-change ' + (pct >= 0 ? 'rc-up' : 'rc-down');
        }
      }

      // Click-to-copy price
      var priceEl = document.querySelector('[data-stock-price]');
      if (priceEl && !priceEl._copyBound) {
        priceEl._copyBound = true;
        priceEl.style.cursor = 'pointer';
        priceEl.title = i18n.clickToCopy || 'Click to copy price';
        priceEl.addEventListener('click', function() {
          if (navigator.clipboard && storedPrice) {
            navigator.clipboard.writeText(storedPrice.toString()).then(function() {
              priceEl.classList.add('pc-price--copied');
              setTimeout(function() { priceEl.classList.remove('pc-price--copied'); }, 1200);
            });
          }
        });
      }

      if (data.previousClose) setEl('[data-stock-prev]', C.fmt(data.previousClose));

      if (data.opens && data.opens.length > 0) {
        var last = data.opens.length - 1;
        if (data.opens[last] != null) setEl('[data-stock-open]', C.fmt(data.opens[last]));
        if (data.highs && data.highs[last] != null) setEl('[data-stock-high]', C.fmt(data.highs[last]));
        if (data.lows && data.lows[last] != null) setEl('[data-stock-low]', C.fmt(data.lows[last]));

        // Volume
        if (data.volumes && data.volumes[last] != null) {
          setEl('[data-stock-volume]', fmtBig(data.volumes[last]));
        }

        // Today's Range bar
        var dayLow = data.lows ? data.lows[last] : null;
        var dayHigh = data.highs ? data.highs[last] : null;
        if (dayLow != null && dayHigh != null && data.price) {
          var rangeEl = document.querySelector('[data-pc-range]');
          if (rangeEl) {
            rangeEl.style.display = '';
            setEl('[data-pc-range-lo]', C.fmt(dayLow));
            setEl('[data-pc-range-hi]', C.fmt(dayHigh));
            var dayRange = dayHigh - dayLow;
            var dayPct = dayRange > 0 ? Math.max(0, Math.min(100, ((data.price - dayLow) / dayRange) * 100)) : 50;
            var fillEl = document.querySelector('[data-pc-range-fill]');
            var dotEl = document.querySelector('[data-pc-range-dot]');
            if (fillEl) fillEl.style.width = dayPct + '%';
            if (dotEl) dotEl.style.insetInlineStart = dayPct + '%';
          }
        }
      }

      if (data.timestamps && data.closes) {
        currentChart = data;
        var points = C.yahooToPoints(data.timestamps, data.closes);
        C.drawChart(document.querySelector('[data-stock-chart]'), [
          { points: points, lineColor: '#75AADB', fillColor: 'rgba(117,170,219,0.12)' }
        ], { volumes: data.volumes || [] });
        drawVolumeBars(data.timestamps, data.volumes, data.closes);
      }
    }).catch(function() {
      var nameEl = document.querySelector('[data-stock-name]');
      if (nameEl) nameEl.textContent = i18n.failedLoad || 'Failed to load data';
      var pc = document.querySelector('[data-price-card]');
      if (pc) {
        pc.classList.remove('price-card--loading');
        pc.innerHTML = MktStates.buildErrorCard({ message: i18n.failedLoad || 'Failed to load data', hint: i18n.checkConn || 'Check your connection and try again', retryLabel: i18n.retry || 'Retry' });
      }
    });
  }

  // Store current price for cross-section use
  var storedPrice = null;

  // ── Load company profile data ──
  function loadProfile() {
    fetch('/api/stock-profile/' + encodeURIComponent(symbol))
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.error) return;

        var s = d.stats || {};
        var det = d.detail || {};
        var fin = d.financials || {};
        var co = d.company || {};
        var curPrice = fin.currentPrice || storedPrice;

        // Sector & industry translation helpers
        var secMap = i18n.secMap || {};
        var indMap = i18n.indMap || {};
        function tSec(s) { return secMap[s] || s; }
        function tInd(s) { return indMap[s] || s; }

        // ── Company Overview Hero ──
        var hasCo = co.sector || co.industry || co.description || co.website;
        if (hasCo) {
          showEl('[data-company-hero]');

          // Company name + enhanced page title
          if (co.name) {
            setEl('[data-ch-name]', co.name);
            setEl('[data-stock-name]', co.name);
            document.title = displaySymbol + ' (' + co.name + ') — ' + (i18n.pageTitle || 'Argentine Markets') + ' | Plata';
            // Update meta description with company info for SEO
            var metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
              var seoDesc = co.name + ' (' + displaySymbol + ')';
              if (co.sector) seoDesc += ' — ' + tSec(co.sector);
              if (co.industry) seoDesc += ', ' + tInd(co.industry);
              seoDesc += '. ' + (i18n.pageTitle || 'Argentine Markets') + ' | Plata';
              metaDesc.setAttribute('content', seoDesc);
            }
          }

          // Logo from Clearbit
          if (co.website) {
            var domain = co.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            var logoImg = document.querySelector('[data-ch-logo-img]');
            var logoFb = document.querySelector('[data-ch-logo-fb]');
            if (logoImg && logoFb) {
              logoImg.src = 'https://logo.clearbit.com/' + domain;
              logoImg.alt = (co.name || symbol) + ' logo';
              logoImg.style.display = 'block';
              logoFb.style.display = 'none';
              logoImg.onerror = function() {
                logoImg.style.display = 'none';
                logoFb.style.display = 'flex';
                logoFb.textContent = (co.name || symbol).charAt(0).toUpperCase();
                // Deterministic color from symbol
                var hash = 0;
                for (var i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
                var hue = Math.abs(hash) % 360;
                logoFb.style.backgroundColor = 'hsl(' + hue + ', 55%, 45%)';
              };
            }
          } else {
            var fb = document.querySelector('[data-ch-logo-fb]');
            if (fb) {
              fb.style.display = 'flex';
              fb.textContent = (co.name || symbol).charAt(0).toUpperCase();
              var h2 = 0;
              for (var j = 0; j < symbol.length; j++) h2 = symbol.charCodeAt(j) + ((h2 << 5) - h2);
              fb.style.backgroundColor = 'hsl(' + (Math.abs(h2) % 360) + ', 55%, 45%)';
            }
            var li = document.querySelector('[data-ch-logo-img]');
            if (li) li.style.display = 'none';
          }

          // Sector & industry tags (all tappable — link to screener)
          var tagsEl = document.querySelector('[data-ch-tags]');
          if (tagsEl) {
            var tagHtml = '';
            if (co.sector) tagHtml += '<a href="/' + lang + '/markets/screener?sector=' + encodeURIComponent(co.sector) + '" class="ch-tag ch-tag--sector">' + tSec(co.sector) + '</a>';
            if (co.industry) tagHtml += '<a href="/' + lang + '/markets/screener?q=' + encodeURIComponent(co.industry) + '" class="ch-tag ch-tag--industry">' + tInd(co.industry) + '</a>';
            if (co.country) tagHtml += '<a href="/' + lang + '/markets/screener?q=' + encodeURIComponent(co.country) + '" class="ch-tag ch-tag--location">' + co.country + '</a>';
            tagsEl.innerHTML = tagHtml;
          }

          // Pills (display: flex for proper alignment)
          function showPill(sel) { var el = document.querySelector(sel); if (el) el.style.display = 'flex'; }
          if (s.marketCap) {
            showPill('[data-ch-mcap-pill]');
            setEl('[data-ch-mcap-v]', fmtBig(s.marketCap));
          }
          if (co.fullTimeEmployees) {
            showPill('[data-ch-emp-pill]');
            setEl('[data-ch-emp-v]', co.fullTimeEmployees.toLocaleString(lang));
          }
          if (co.city || co.country) {
            showPill('[data-ch-loc-pill]');
            setEl('[data-ch-loc-v]', [co.city, co.country].filter(Boolean).join(', '));
          }
          if (co.website) {
            showPill('[data-ch-web-pill]');
            var wl = document.querySelector('[data-ch-web-v]');
            if (wl) {
              wl.href = co.website;
              wl.textContent = co.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            }
          }

          // Summary — first sentence of description
          if (co.description) {
            var firstSentence = co.description.match(/^[^.!?]+[.!?]/);
            setEl('[data-ch-summary]', firstSentence ? firstSentence[0] : co.description.substring(0, 200) + '…');
          }
        }

        // ── 52-Week Price Range Bar ──
        if (det.fiftyTwoWeekLow != null && det.fiftyTwoWeekHigh != null && curPrice) {
          showEl('[data-range52]');
          var low52 = det.fiftyTwoWeekLow;
          var high52 = det.fiftyTwoWeekHigh;
          var range = high52 - low52;
          var pct52 = range > 0 ? Math.max(0, Math.min(100, ((curPrice - low52) / range) * 100)) : 50;

          setEl('[data-range52-low]', C.fmt(low52));
          setEl('[data-range52-high]', C.fmt(high52));
          setEl('[data-range52-current]', C.fmt(curPrice));

          var fill52 = document.querySelector('[data-range52-fill]');
          if (fill52) fill52.style.width = pct52 + '%';
          var marker52 = document.querySelector('[data-range52-marker]');
          if (marker52) marker52.style.insetInlineStart = pct52 + '%';

          // Zone badge
          var badge52 = document.querySelector('[data-range52-badge]');
          if (badge52) {
            var zoneLabel, zoneCls;
            if (pct52 <= 20) { zoneLabel = i18n.nearLow || 'Near 52w Low'; zoneCls = 'range52-zone--low'; }
            else if (pct52 <= 70) { zoneLabel = i18n.midRange || 'Mid Range'; zoneCls = 'range52-zone--mid'; }
            else if (pct52 <= 92) { zoneLabel = i18n.nearHigh || 'Near 52w High'; zoneCls = 'range52-zone--high'; }
            else { zoneLabel = i18n.nearAth || 'Near ATH'; zoneCls = 'range52-zone--ath'; }
            badge52.textContent = zoneLabel;
            badge52.className = 'range52-zone-badge ' + zoneCls;
          }

          // From low / from high stats
          if (range > 0) {
            var fromLowPct = low52 > 0 ? ((curPrice - low52) / low52 * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) : '—';
            var fromHighPct = high52 > 0 ? ((curPrice - high52) / high52 * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) : '—';
            var flEl = document.querySelector('[data-range52-from-low]');
            var fhEl = document.querySelector('[data-range52-from-high]');
            if (flEl) flEl.innerHTML = '<span class="range52-stat-val range52-stat--up">+' + fromLowPct + '%</span> ' + (i18n.fromLow || 'from 52w Low');
            if (fhEl) fhEl.innerHTML = '<span class="range52-stat-val range52-stat--down">' + fromHighPct + '%</span> ' + (i18n.fromHigh || 'from 52w High');
          }
        }

        // ── Financial Health Dashboard ──
        var hasHealth = fin.profitMargins != null || fin.revenueGrowth != null || fin.debtToEquity != null || fin.currentRatio != null;
        if (hasHealth) {
          showEl('[data-health-section]');

          // Profitability
          if (fin.profitMargins != null) {
            showEl('[data-hc-profit]');
            var pm = fin.profitMargins * 100;
            setEl('[data-hc-profit-value]', pm.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%');
            var pmBar = document.querySelector('[data-hc-profit-bar]');
            if (pmBar) pmBar.style.width = Math.max(0, Math.min(100, (pm / 50) * 100)) + '%';
            var pmBadge = document.querySelector('[data-hc-profit-badge]');
            if (pmBadge) {
              if (pm > 15) { pmBadge.textContent = i18n.strong || 'Strong'; pmBadge.className = 'hc-badge hc-badge--green'; }
              else if (pm > 5) { pmBadge.textContent = i18n.moderate || 'Moderate'; pmBadge.className = 'hc-badge hc-badge--yellow'; }
              else { pmBadge.textContent = i18n.weak || 'Weak'; pmBadge.className = 'hc-badge hc-badge--red'; }
            }
            if (pmBar) pmBar.className = 'hc-bar-fill' + (pm > 15 ? ' hc-bar--green' : pm > 5 ? ' hc-bar--yellow' : ' hc-bar--red');
          }

          // Revenue Growth
          if (fin.revenueGrowth != null) {
            showEl('[data-hc-revgr]');
            var rg = fin.revenueGrowth * 100;
            var rgEl = document.querySelector('[data-hc-revgr-value]');
            if (rgEl) {
              rgEl.textContent = (rg >= 0 ? '▲ +' : '▼ ') + rg.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%';
              rgEl.classList.add(rg >= 0 ? 'hc-growth--up' : 'hc-growth--down');
            }
          }

          // Earnings Growth
          if (fin.earningsGrowth != null) {
            showEl('[data-hc-earngr]');
            var eg = fin.earningsGrowth * 100;
            var egEl = document.querySelector('[data-hc-earngr-value]');
            if (egEl) {
              egEl.textContent = (eg >= 0 ? '▲ +' : '▼ ') + eg.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%';
              egEl.classList.add(eg >= 0 ? 'hc-growth--up' : 'hc-growth--down');
            }
          }

          // Debt Level
          if (fin.debtToEquity != null) {
            showEl('[data-hc-debt]');
            var de = fin.debtToEquity;
            setEl('[data-hc-debt-value]', de.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}));
            var deBar = document.querySelector('[data-hc-debt-bar]');
            if (deBar) deBar.style.width = Math.max(0, Math.min(100, (de / 200) * 100)) + '%';
            var deBadge = document.querySelector('[data-hc-debt-badge]');
            if (deBadge) {
              if (de < 100) { deBadge.textContent = i18n.healthy || 'Healthy'; deBadge.className = 'hc-badge hc-badge--green'; }
              else if (de < 200) { deBadge.textContent = i18n.caution || 'Caution'; deBadge.className = 'hc-badge hc-badge--yellow'; }
              else { deBadge.textContent = i18n.concern || 'Concern'; deBadge.className = 'hc-badge hc-badge--red'; }
            }
            if (deBar) deBar.className = 'hc-bar-fill' + (de < 100 ? ' hc-bar--green' : de < 200 ? ' hc-bar--yellow' : ' hc-bar--red');
          }

          // Cash Position
          if (fin.totalCash != null) {
            showEl('[data-hc-cash]');
            setEl('[data-hc-cash-value]', fmtBig(fin.totalCash));
            if (fin.totalCashPerShare != null) {
              setEl('[data-hc-cash-sub]', fmtNum(fin.totalCashPerShare) + ' ' + (i18n.perShare || 'per share'));
            }
          }

          // Liquidity
          if (fin.currentRatio != null) {
            showEl('[data-hc-liq]');
            var cr = fin.currentRatio;
            setEl('[data-hc-liq-value]', cr.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}));
            var crBar = document.querySelector('[data-hc-liq-bar]');
            if (crBar) crBar.style.width = Math.max(0, Math.min(100, (cr / 3) * 100)) + '%';
            var crBadge = document.querySelector('[data-hc-liq-badge]');
            if (crBadge) {
              if (cr > 1.5) { crBadge.textContent = i18n.strong || 'Strong'; crBadge.className = 'hc-badge hc-badge--green'; }
              else if (cr >= 1) { crBadge.textContent = i18n.moderate || 'Moderate'; crBadge.className = 'hc-badge hc-badge--yellow'; }
              else { crBadge.textContent = i18n.weak || 'Weak'; crBadge.className = 'hc-badge hc-badge--red'; }
            }
            if (crBar) crBar.className = 'hc-bar-fill' + (cr > 1.5 ? ' hc-bar--green' : cr >= 1 ? ' hc-bar--yellow' : ' hc-bar--red');
          }

          // Composite Health Score (0-100)
          var scoreCount = 0, scoreSum = 0;
          if (fin.profitMargins != null) { scoreCount++; scoreSum += fin.profitMargins > 0.15 ? 100 : fin.profitMargins > 0.05 ? 65 : fin.profitMargins > 0 ? 35 : 10; }
          if (fin.revenueGrowth != null) { scoreCount++; scoreSum += fin.revenueGrowth > 0.15 ? 100 : fin.revenueGrowth > 0.05 ? 75 : fin.revenueGrowth > 0 ? 50 : 20; }
          if (fin.debtToEquity != null) { scoreCount++; scoreSum += fin.debtToEquity < 50 ? 100 : fin.debtToEquity < 100 ? 75 : fin.debtToEquity < 200 ? 40 : 10; }
          if (fin.currentRatio != null) { scoreCount++; scoreSum += fin.currentRatio > 2 ? 100 : fin.currentRatio > 1.5 ? 80 : fin.currentRatio >= 1 ? 50 : 15; }
          if (fin.operatingCashflow != null && fin.netIncomeToCommon != null && fin.netIncomeToCommon > 0) {
            scoreCount++; var ocfR = fin.operatingCashflow / fin.netIncomeToCommon;
            scoreSum += ocfR > 1.2 ? 100 : ocfR > 0.8 ? 70 : ocfR > 0 ? 35 : 10;
          }
          if (scoreCount >= 2) {
            var score = Math.round(scoreSum / scoreCount);
            var sColor = score >= 70 ? '#16a34a' : score >= 45 ? '#f59e0b' : '#dc2626';
            var sLabel = score >= 70 ? (i18n.healthStrong || 'Strong') : score >= 45 ? (i18n.healthFair || 'Fair') : (i18n.healthWeak || 'Weak');
            var hsEl = document.querySelector('[data-health-score]');
            if (hsEl) {
              var hs = '<div class="hs-wrap">';
              hs += '<div class="hs-gauge"><div class="hs-gauge-fill" style="width:' + score + '%;background:' + sColor + '"></div></div>';
              hs += '<div class="hs-info">';
              hs += '<span class="hs-score" style="color:' + sColor + '">' + score + '/100</span>';
              hs += '<span class="hs-label" style="color:' + sColor + '">' + sLabel + '</span>';
              hs += '<span class="hs-sub">' + (i18n.healthBased || 'Based on {val} factors').replace('{val}', scoreCount) + '</span>';
              hs += '</div></div>';
              hsEl.innerHTML = hs;
              hsEl.style.display = '';
            }
          }
        }

        // ── Quick Facts Strip ──
        var qfShown = false;
        function showQF(attr, val) {
          if (val == null) return;
          var item = document.querySelector('[' + attr + ']');
          if (item) { item.style.display = ''; qfShown = true; }
          var vEl = document.querySelector('[' + attr + '-v]');
          if (vEl) vEl.textContent = val;
        }
        showQF('data-qf-pe', s.trailingPE != null ? fmtNum(s.trailingPE) : null);
        showQF('data-qf-eps', s.eps != null ? fmtNum(s.eps) : null);
        showQF('data-qf-divy', det.dividendYield != null ? fmtPct(det.dividendYield) : null);
        showQF('data-qf-beta', s.beta != null ? fmtNum(s.beta) : null);
        showQF('data-qf-roe', fin.returnOnEquity != null ? fmtPct(fin.returnOnEquity) : null);
        if (qfShown) showEl('[data-qf-strip]');

        // ── Key Statistics ──
        var hasStats = s.marketCap || s.trailingPE || s.eps || s.beta;
        if (hasStats) {
          showEl('[data-profile-section]');
          setEl('[data-st-mcap]', fmtBig(s.marketCap));
          setEl('[data-st-ev]', fmtBig(s.enterpriseValue));
          setEl('[data-st-tpe]', fmtNum(s.trailingPE));
          setEl('[data-st-fpe]', fmtNum(s.forwardPE));
          setEl('[data-st-peg]', fmtNum(s.pegRatio));
          setEl('[data-st-pb]', fmtNum(s.priceToBook));
          setEl('[data-st-ps]', fmtNum(s.priceToSales));
          setEl('[data-st-evr]', fmtNum(s.enterpriseToRevenue));
          setEl('[data-st-eve]', fmtNum(s.enterpriseToEbitda));
          setEl('[data-st-eps]', fmtNum(s.eps));
          setEl('[data-st-feps]', fmtNum(s.forwardEps));
          setEl('[data-st-beta]', fmtNum(s.beta));
          setEl('[data-st-shares]', fmtBig(s.sharesOutstanding));
          setEl('[data-st-bv]', fmtNum(s.bookValue));

          if (det.fiftyTwoWeekLow != null && det.fiftyTwoWeekHigh != null) {
            setEl('[data-st-52w]', C.fmt(det.fiftyTwoWeekLow) + ' – ' + C.fmt(det.fiftyTwoWeekHigh));
          }
          setEl('[data-st-50d]', det.fiftyDayAverage != null ? C.fmt(det.fiftyDayAverage) : '—');
          setEl('[data-st-200d]', det.twoHundredDayAverage != null ? C.fmt(det.twoHundredDayAverage) : '—');
          setEl('[data-st-avgvol]', fmtBig(det.averageVolume));
        }

        // ── Valuation Snapshot ──
        var valMetrics = [];
        if (s.trailingPE != null) valMetrics.push({ label: 'P/E', val: s.trailingPE, low: 10, mid: 20, high: 35 });
        if (s.priceToBook != null) valMetrics.push({ label: 'P/B', val: s.priceToBook, low: 1, mid: 3, high: 5 });
        if (s.priceToSales != null) valMetrics.push({ label: 'P/S', val: s.priceToSales, low: 1, mid: 3, high: 8 });
        if (s.pegRatio != null) valMetrics.push({ label: 'PEG', val: s.pegRatio, low: 0.5, mid: 1.0, high: 2.0 });
        if (s.enterpriseToEbitda != null) valMetrics.push({ label: 'EV/EBITDA', val: s.enterpriseToEbitda, low: 8, mid: 15, high: 25 });
        if (valMetrics.length >= 2) {
          var vcEl = document.querySelector('[data-val-cards]');
          if (vcEl) {
            var vhtml = '';
            for (var vi = 0; vi < valMetrics.length; vi++) {
              var vm = valMetrics[vi];
              var assess, color;
              if (vm.val <= vm.low) { assess = i18n.valValue || 'Value'; color = '#16a34a'; }
              else if (vm.val <= vm.mid) { assess = i18n.valFair || 'Fair'; color = '#eab308'; }
              else if (vm.val <= vm.high) { assess = i18n.valRich || 'Rich'; color = '#f97316'; }
              else { assess = i18n.valExpensive || 'Expensive'; color = '#dc2626'; }
              var gaugePos = Math.min(vm.val / (vm.high * 1.2) * 100, 100).toFixed(1);
              vhtml += '<div class="vc-card">';
              vhtml += '<div class="vc-head"><span class="vc-label">' + vm.label + '</span><span class="vc-assess" style="color:' + color + '">' + assess + '</span></div>';
              vhtml += '<span class="vc-value">' + fmtNum(vm.val) + '</span>';
              vhtml += '<div class="vc-gauge"><div class="vc-gauge-fill" style="width:' + gaugePos + '%;background:' + color + '"></div></div>';
              vhtml += '<div class="vc-range"><span>' + vm.low + '</span><span>' + vm.mid + '</span><span>' + vm.high + '+</span></div>';
              vhtml += '</div>';
            }
            vcEl.innerHTML = vhtml;
            showEl('[data-val-snap]');
          }
        }

        // ── Moving Average Signal ──
        if (det.fiftyDayAverage && det.twoHundredDayAverage && fin.currentPrice) {
          var price = fin.currentPrice;
          var ma50 = det.fiftyDayAverage;
          var ma200 = det.twoHundredDayAverage;
          var maGrid = document.querySelector('[data-ma-grid]');
          if (maGrid) {
            var aboveMa50 = price > ma50;
            var aboveMa200 = price > ma200;
            var goldenCross = ma50 > ma200;
            var overallSignal = (aboveMa50 && aboveMa200 && goldenCross) ? 'bullish' : (!aboveMa50 && !aboveMa200 && !goldenCross) ? 'bearish' : 'neutral';
            var sigColor = overallSignal === 'bullish' ? '#16a34a' : overallSignal === 'bearish' ? '#dc2626' : '#eab308';
            var sigLabel = overallSignal === 'bullish' ? (i18n.bullish || 'Bullish') : overallSignal === 'bearish' ? (i18n.bearish || 'Bearish') : (i18n.neutral || 'Neutral');
            var aboveLabel = i18n.above || 'Above';
            var belowLabel = i18n.below || 'Below';
            var html = '<div class="ma-overall" style="border-color:' + sigColor + '">';
            html += '<span class="ma-overall-label">' + sigLabel + '</span>';
            html += '<span class="ma-overall-icon" style="color:' + sigColor + '">' + (overallSignal === 'bullish' ? '▲' : overallSignal === 'bearish' ? '▼' : '●') + '</span>';
            html += '</div>';
            html += '<div class="ma-cards">';
            // Price vs 50d
            var pct50 = ((price - ma50) / ma50 * 100).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2});
            var cls50 = aboveMa50 ? 'ma-card--up' : 'ma-card--down';
            html += '<div class="ma-card ' + cls50 + '">';
            html += '<span class="ma-card-title">' + (i18n.ma50Title || '50-Day MA') + '</span>';
            html += '<span class="ma-card-val">' + C.fmt(ma50) + '</span>';
            html += '<span class="ma-card-sig">' + (aboveMa50 ? aboveLabel : belowLabel) + ' (' + (pct50 > 0 ? '+' : '') + pct50 + '%)</span>';
            html += '</div>';
            // Price vs 200d
            var pct200 = ((price - ma200) / ma200 * 100).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2});
            var cls200 = aboveMa200 ? 'ma-card--up' : 'ma-card--down';
            html += '<div class="ma-card ' + cls200 + '">';
            html += '<span class="ma-card-title">' + (i18n.ma200Title || '200-Day MA') + '</span>';
            html += '<span class="ma-card-val">' + C.fmt(ma200) + '</span>';
            html += '<span class="ma-card-sig">' + (aboveMa200 ? aboveLabel : belowLabel) + ' (' + (pct200 > 0 ? '+' : '') + pct200 + '%)</span>';
            html += '</div>';
            // Golden/Death cross
            var crossLabel = goldenCross ? (i18n.goldenCross || 'Golden Cross') : (i18n.deathCross || 'Death Cross');
            var crossCls = goldenCross ? 'ma-card--up' : 'ma-card--down';
            html += '<div class="ma-card ' + crossCls + '">';
            html += '<span class="ma-card-title">' + (i18n.ma50vs200 || '50d vs 200d') + '</span>';
            html += '<span class="ma-card-val">' + crossLabel + '</span>';
            html += '<span class="ma-card-sig">' + (goldenCross ? '50d > 200d' : '50d < 200d') + '</span>';
            html += '</div>';
            html += '</div>';
            maGrid.innerHTML = html;
            showEl('[data-ma-signal]');
          }
        }

        // ── Dividends & Returns ──
        var hasDiv = det.dividendYield || fin.returnOnEquity || fin.earningsGrowth;
        if (hasDiv) {
          showEl('[data-dividends-section]');
          setEl('[data-st-divrate]', det.dividendRate != null ? fmtNum(det.dividendRate) : '—');
          setEl('[data-st-divyield]', fmtPct(det.dividendYield));
          setEl('[data-st-exdiv]', det.exDividendDate ? new Date(det.exDividendDate + 'T00:00:00').toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
          setEl('[data-st-payout]', fmtPct(det.payoutRatio));
          setEl('[data-st-roa]', fmtPct(fin.returnOnAssets));
          setEl('[data-st-roe]', fmtPct(fin.returnOnEquity));
          setEl('[data-st-earngr]', fmtPct(fin.earningsGrowth));
          setEl('[data-st-revgr]', fmtPct(fin.revenueGrowth));

          // Dividend Yield Gauge
          if (det.dividendYield != null && det.dividendYield > 0) {
            var dyPct = (det.dividendYield * 100).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2});
            var dyMax = 15; // gauge max at 15%
            var dyFill = Math.min(det.dividendYield * 100 / dyMax * 100, 100);
            var dyColor = det.dividendYield * 100 >= 5 ? '#16a34a' : det.dividendYield * 100 >= 2 ? '#eab308' : '#94a3b8';
            var gaugeEl = document.querySelector('[data-div-gauge]');
            if (gaugeEl) {
              gaugeEl.innerHTML = '<div class="dyg-wrap">' +
                '<span class="dyg-label">' + (i18n.divYieldLabel || 'Dividend Yield') + '</span>' +
                '<div class="dyg-track"><div class="dyg-fill" style="width:' + dyFill + '%;background:' + dyColor + '"></div></div>' +
                '<span class="dyg-val" style="color:' + dyColor + '">' + dyPct + '%</span>' +
                '</div>';
              gaugeEl.style.display = '';
            }
          }

          // Dividend Income Calculator
          if (det.dividendRate != null && det.dividendRate > 0 && curPrice > 0) {
            var incEl = document.querySelector('[data-div-income]');
            if (incEl) {
              var annualDiv = det.dividendRate;
              var yieldPct = det.dividendYield ? (det.dividendYield * 100) : (annualDiv / curPrice * 100);
              var payoutVal = det.payoutRatio ? (det.payoutRatio * 100) : null;
              // Dynamic investment amount — pick a round number that buys at least 10 shares
              var investAmt = 1000;
              if (curPrice > 100) investAmt = Math.ceil(curPrice * 10 / 1000) * 1000;
              if (curPrice > 10000) investAmt = Math.ceil(curPrice * 10 / 100000) * 100000;
              var sharesForInv = Math.floor(investAmt / curPrice);
              var incomeForInv = sharesForInv * annualDiv;

              var dih = '<div class="dii-grid">';
              dih += '<div class="dii-card"><span class="dii-label">' + (i18n.annualDiv || 'Annual Dividend') + '</span><span class="dii-val">' + fmtNum(annualDiv) + '</span><span class="dii-sub">' + (i18n.perShare || 'per share') + '</span></div>';
              dih += '<div class="dii-card"><span class="dii-label">' + (i18n.divYieldLabel || 'Dividend Yield') + '</span><span class="dii-val" style="color:' + (yieldPct >= 4 ? '#16a34a' : yieldPct >= 2 ? '#eab308' : 'var(--color-text)') + '">' + yieldPct.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span></div>';
              if (payoutVal != null) {
                var payColor = payoutVal <= 60 ? '#16a34a' : payoutVal <= 80 ? '#eab308' : '#dc2626';
                var payLabel = payoutVal <= 60 ? (i18n.sustainable || i18n.healthy || 'Sustainable') : payoutVal <= 80 ? (i18n.caution || 'High') : (i18n.concern || 'Caution');
                dih += '<div class="dii-card"><span class="dii-label">' + (i18n.payoutRatio || 'Payout Ratio') + '</span><span class="dii-val" style="color:' + payColor + '">' + payoutVal.toLocaleString(lang, {minimumFractionDigits:0,maximumFractionDigits:0}) + '%</span><span class="dii-sub">' + payLabel + '</span></div>';
              }
              dih += '<div class="dii-card dii-card--highlight"><span class="dii-label">' + C.fmt(investAmt) + ' ' + (i18n.investment || 'Investment') + '</span><span class="dii-val">' + fmtNum(incomeForInv) + '/' + (i18n.perYear || 'yr') + '</span><span class="dii-sub">' + sharesForInv + ' ' + (i18n.shares || 'shares') + ' × ' + fmtNum(annualDiv) + '</span></div>';
              dih += '</div>';
              incEl.innerHTML = dih;
              incEl.style.display = '';
            }
          }
        }

        // ── Financial Highlights ──
        var hasFin = fin.totalRevenue || fin.profitMargins || fin.ebitda;
        if (hasFin) {
          showEl('[data-financials-section]');
          setEl('[data-st-rev]', fmtBig(fin.totalRevenue));
          setEl('[data-st-revps]', fmtNum(fin.revenuePerShare));
          setEl('[data-st-gp]', fmtBig(fin.grossProfits));
          setEl('[data-st-ebitda]', fmtBig(fin.ebitda));
          setEl('[data-st-ni]', fmtBig(fin.netIncomeToCommon));
          setEl('[data-st-opcf]', fmtBig(fin.operatingCashflow));
          setEl('[data-st-fcf]', fmtBig(fin.freeCashflow));
          setEl('[data-st-pm]', fmtPct(fin.profitMargins));
          setEl('[data-st-om]', fmtPct(fin.operatingMargins));
          setEl('[data-st-gm]', fmtPct(fin.grossMargins));
          setEl('[data-st-em]', fmtPct(fin.ebitdaMargins));
          setEl('[data-st-cash]', fmtBig(fin.totalCash));
          setEl('[data-st-debt]', fmtBig(fin.totalDebt));
          setEl('[data-st-de]', fmtNum(fin.debtToEquity));
        }

        // ── Revenue Funnel ──
        var funnelSteps = [
          { label: i18n.funnelRevenue || 'Revenue', val: fin.totalRevenue, color: '#3b82f6' },
          { label: i18n.funnelGrossProfit || 'Gross Profit', val: fin.grossProfits, color: '#8b5cf6' },
          { label: 'EBITDA', val: fin.ebitda, color: '#f59e0b' },
          { label: i18n.funnelNetIncome || 'Net Income', val: fin.netIncomeToCommon, color: '#16a34a' },
        ].filter(function(s) { return s.val != null && s.val !== 0; });
        if (funnelSteps.length >= 2 && fin.totalRevenue > 0) {
          showEl('[data-rev-funnel]');
          var rf = document.querySelector('[data-rev-funnel]');
          if (rf) {
            var maxVal = funnelSteps[0].val;
            var fhtml = '';
            for (var fi = 0; fi < funnelSteps.length; fi++) {
              var fs = funnelSteps[fi];
              var pct = Math.max((Math.abs(fs.val) / maxVal) * 100, 4);
              var isNeg = fs.val < 0;
              var margin = isNeg ? ((fi / funnelSteps.length) * 100).toFixed(1) + '%' : 'auto';
              fhtml += '<div class="rf-step">';
              fhtml += '<span class="rf-label">' + fs.label + '</span>';
              fhtml += '<div class="rf-bar-wrap">';
              fhtml += '<div class="rf-bar' + (isNeg ? ' rf-bar--neg' : '') + '" style="width:' + pct.toFixed(1) + '%;background:' + fs.color + '"></div>';
              fhtml += '</div>';
              fhtml += '<span class="rf-val" style="color:' + (isNeg ? '#dc2626' : fs.color) + '">' + fmtBig(fs.val) + '</span>';
              fhtml += '</div>';
            }
            rf.innerHTML = fhtml;
          }
        }

        // ── Cash Flow Quality ──
        if (fin.operatingCashflow && fin.netIncomeToCommon && fin.netIncomeToCommon !== 0) {
          var cfRatio = fin.operatingCashflow / fin.netIncomeToCommon;
          var cfEl = document.querySelector('[data-cf-quality]');
          if (cfEl) {
            var cfLabel, cfColor, cfDesc;
            if (cfRatio >= 1.2) { cfLabel = i18n.cfStrong || 'Strong'; cfColor = '#16a34a'; cfDesc = i18n.cfExceeds || 'Cash flow exceeds reported earnings'; }
            else if (cfRatio >= 0.8) { cfLabel = i18n.cfHealthy || 'Healthy'; cfColor = '#f59e0b'; cfDesc = i18n.cfMatches || 'Cash flow roughly matches earnings'; }
            else if (cfRatio >= 0) { cfLabel = i18n.cfWeak || 'Weak'; cfColor = '#dc2626'; cfDesc = i18n.cfNotBacked || 'Earnings not fully backed by cash'; }
            else { cfLabel = i18n.cfNegative || 'Negative'; cfColor = '#dc2626'; cfDesc = i18n.cfNegativeFlow || 'Negative operating cash flow'; }

            var cfHtml = '<div class="cfq-row">';
            cfHtml += '<div class="cfq-metric"><span class="cfq-label">' + (i18n.cfQuality || 'Cash Flow Quality') + '</span><span class="cfq-assess" style="color:' + cfColor + '">' + cfLabel + '</span></div>';
            cfHtml += '<div class="cfq-details">';
            cfHtml += '<div class="cfq-bars">';
            var maxCf = Math.max(Math.abs(fin.operatingCashflow), Math.abs(fin.netIncomeToCommon));
            var opcfW = (Math.abs(fin.operatingCashflow) / maxCf * 100).toFixed(1);
            var niW = (Math.abs(fin.netIncomeToCommon) / maxCf * 100).toFixed(1);
            cfHtml += '<div class="cfq-bar-row"><span class="cfq-bar-label">' + (i18n.cfOpCashFlow || 'Op. Cash Flow') + '</span><div class="cfq-bar-wrap"><div class="cfq-bar" style="width:' + opcfW + '%;background:#3b82f6"></div></div><span class="cfq-bar-val">' + fmtBig(fin.operatingCashflow) + '</span></div>';
            cfHtml += '<div class="cfq-bar-row"><span class="cfq-bar-label">' + (i18n.cfNetIncome || 'Net Income') + '</span><div class="cfq-bar-wrap"><div class="cfq-bar" style="width:' + niW + '%;background:#16a34a"></div></div><span class="cfq-bar-val">' + fmtBig(fin.netIncomeToCommon) + '</span></div>';
            cfHtml += '</div>';
            cfHtml += '<span class="cfq-ratio">' + (i18n.cfRatio || 'OCF/NI Ratio') + ': ' + cfRatio.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + 'x</span>';
            cfHtml += '<span class="cfq-desc">' + cfDesc + '</span>';
            cfHtml += '</div></div>';
            cfEl.innerHTML = cfHtml;
            cfEl.style.display = '';
          }
        }

        // ── Margin Comparison Bars ──
        var marginItems = [
          { label: i18n.grossMargin, val: fin.grossMargins, color: '#3b82f6' },
          { label: i18n.ebitdaMargin, val: fin.ebitdaMargins, color: '#8b5cf6' },
          { label: i18n.opMargin, val: fin.operatingMargins, color: '#f59e0b' },
          { label: i18n.profitMargin, val: fin.profitMargins, color: '#16a34a' },
        ].filter(function(m) { return m.val != null; });
        if (marginItems.length >= 2) {
          showEl('[data-margins-section]');
          var mc = document.querySelector('[data-margins-chart]');
          if (mc) {
            var mhtml = '';
            for (var mi = 0; mi < marginItems.length; mi++) {
              var m = marginItems[mi];
              var pctVal = (m.val * 100);
              var barW = Math.max(Math.min(Math.abs(pctVal), 100), 2);
              var isNeg = pctVal < 0;
              mhtml += '<div class="mg-row">';
              mhtml += '<span class="mg-label">' + m.label + '</span>';
              mhtml += '<div class="mg-bar-wrap">';
              if (isNeg) {
                mhtml += '<div class="mg-bar mg-bar--neg" style="width:' + barW + '%;background:' + m.color + '"></div>';
              } else {
                mhtml += '<div class="mg-bar" style="width:' + barW + '%;background:' + m.color + '"></div>';
              }
              mhtml += '</div>';
              mhtml += '<span class="mg-val" style="color:' + (isNeg ? '#dc2626' : m.color) + '">' + (pctVal >= 0 ? '+' : '') + pctVal.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span>';
              mhtml += '</div>';
            }
            mc.innerHTML = mhtml;
          }
        }

        // ── Balance Sheet & Ownership ──
        var hasBal = fin.currentRatio || s.heldPercentInsiders || s.floatShares;
        if (hasBal) {
          showEl('[data-balance-section]');
          setEl('[data-st-cr]', fmtNum(fin.currentRatio));
          setEl('[data-st-qr]', fmtNum(fin.quickRatio));
          setEl('[data-st-cashps]', fmtNum(fin.totalCashPerShare));
          setEl('[data-st-insiders]', fmtPct(s.heldPercentInsiders));
          setEl('[data-st-inst]', fmtPct(s.heldPercentInstitutions));
          setEl('[data-st-float]', fmtBig(s.floatShares));

          // Ownership breakdown bar
          if (s.heldPercentInsiders != null || s.heldPercentInstitutions != null) {
            var insP = (s.heldPercentInsiders || 0) * 100;
            var instP = (s.heldPercentInstitutions || 0) * 100;
            var pubP = Math.max(100 - insP - instP, 0);
            var ownEl = document.querySelector('[data-own-bar]');
            if (ownEl) {
              var ohtml = '<div class="own-bar">';
              var fmtP = function(v) { return v.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}); };
              if (insP > 0) ohtml += '<div class="own-seg own-seg--ins" style="width:' + insP.toFixed(1) + '%">' + (insP >= 5 ? fmtP(insP) + '%' : '') + '</div>';
              if (instP > 0) ohtml += '<div class="own-seg own-seg--inst" style="width:' + instP.toFixed(1) + '%">' + (instP >= 5 ? fmtP(instP) + '%' : '') + '</div>';
              if (pubP > 0) ohtml += '<div class="own-seg own-seg--pub" style="width:' + pubP.toFixed(1) + '%">' + (pubP >= 5 ? fmtP(pubP) + '%' : '') + '</div>';
              ohtml += '</div>';
              ohtml += '<div class="own-legend">';
              ohtml += '<span class="own-leg"><span class="own-dot own-dot--ins"></span>' + (i18n.ownInsiders || 'Insiders') + ' ' + fmtP(insP) + '%</span>';
              ohtml += '<span class="own-leg"><span class="own-dot own-dot--inst"></span>' + (i18n.ownInstitutions || 'Institutions') + ' ' + fmtP(instP) + '%</span>';
              ohtml += '<span class="own-leg"><span class="own-dot own-dot--pub"></span>' + (i18n.ownPublic || 'Public') + ' ' + fmtP(pubP) + '%</span>';
              ohtml += '</div>';
              ownEl.innerHTML = ohtml;
              ownEl.style.display = '';
            }
          }
        }

        // ── Enhanced Analyst Recommendations ──
        if (fin.recommendationKey || fin.targetMeanPrice) {
          showEl('[data-analyst-section]');
          var rec = (fin.recommendationKey || '').replace(/_/g, ' ');
          if (rec) {
            setEl('[data-analyst-rec]', rec.charAt(0).toUpperCase() + rec.slice(1));
            var recEl = document.querySelector('[data-analyst-rec]');
            if (recEl) {
              var rk = (fin.recommendationKey || '').toLowerCase();
              if (rk === 'buy' || rk === 'strong_buy') recEl.classList.add('rec-buy');
              else if (rk === 'sell' || rk === 'strong_sell') recEl.classList.add('rec-sell');
              else recEl.classList.add('rec-hold');
            }
          }
          if (fin.numberOfAnalystOpinions) {
            var aWord = fin.numberOfAnalystOpinions !== 1 ? (i18n.analysts || 'analysts') : (i18n.analyst || 'analyst');
            setEl('[data-analyst-count]', fin.numberOfAnalystOpinions + ' ' + aWord);
          }

          // Consensus bar — position marker by recommendationMean (1=strong buy, 5=strong sell)
          if (fin.recommendationMean) {
            var cmPos = ((fin.recommendationMean - 1) / 4) * 100;
            var cmMarker = document.querySelector('[data-consensus-marker]');
            if (cmMarker) cmMarker.style.insetInlineStart = cmPos + '%';
          }

          // Rating distribution breakdown
          var rd = d.ratingDistribution;
          if (rd) {
            var rdTotal = (rd.strongBuy || 0) + (rd.buy || 0) + (rd.hold || 0) + (rd.sell || 0) + (rd.strongSell || 0);
            if (rdTotal > 0) {
              var rdEl = document.querySelector('[data-rating-dist]');
              if (rdEl) {
                var rdItems = [
                  { label: i18n.strongBuy || 'Strong Buy', count: rd.strongBuy || 0, cls: 'rd--sbuy' },
                  { label: i18n.buy || 'Buy', count: rd.buy || 0, cls: 'rd--buy' },
                  { label: i18n.holdRating || 'Hold', count: rd.hold || 0, cls: 'rd--hold' },
                  { label: i18n.sellRating || 'Sell', count: rd.sell || 0, cls: 'rd--sell' },
                  { label: i18n.strongSell || 'Strong Sell', count: rd.strongSell || 0, cls: 'rd--ssell' },
                ];
                var rdHtml = '<div class="rd-bar">';
                rdItems.forEach(function(r) {
                  if (r.count > 0) {
                    var pct = (r.count / rdTotal * 100).toFixed(1);
                    rdHtml += '<div class="rd-seg ' + r.cls + '" style="width:' + pct + '%">' + (parseFloat(pct) >= 8 ? r.count : '') + '</div>';
                  }
                });
                rdHtml += '</div><div class="rd-legend">';
                rdItems.forEach(function(r) {
                  if (r.count > 0) {
                    rdHtml += '<span class="rd-leg-item"><span class="rd-dot ' + r.cls + '"></span>' + r.label + ' <strong>' + r.count + '</strong></span>';
                  }
                });
                rdHtml += '</div>';
                rdEl.innerHTML = rdHtml;
                rdEl.style.display = '';
              }
            }
          }

          // Price target range bar
          if (fin.targetLowPrice != null && fin.targetHighPrice != null) {
            showEl('[data-target-section]');
            setEl('[data-target-low-label]', C.fmt(fin.targetLowPrice));
            setEl('[data-target-high-label]', C.fmt(fin.targetHighPrice));

            var tRange = fin.targetHighPrice - fin.targetLowPrice;
            if (tRange > 0) {
              // Mean target marker
              if (fin.targetMeanPrice != null) {
                var meanPct = ((fin.targetMeanPrice - fin.targetLowPrice) / tRange) * 100;
                var meanM = document.querySelector('[data-target-mean-marker]');
                if (meanM) meanM.style.insetInlineStart = Math.max(0, Math.min(100, meanPct)) + '%';
                setEl('[data-target-mean-label]', C.fmt(fin.targetMeanPrice));
              }
              // Current price marker
              if (curPrice) {
                var curPct = ((curPrice - fin.targetLowPrice) / tRange) * 100;
                var curM = document.querySelector('[data-target-current-marker]');
                if (curM) curM.style.insetInlineStart = Math.max(0, Math.min(100, curPct)) + '%';
                setEl('[data-target-current-label]', C.fmt(curPrice));
              }
            }
          }
        }

        // ── Quarterly Earnings Chart ──
        var eh = d.earningsHistory;
        if (eh && eh.length > 0) {
          showEl('[data-earnings-section]');
          var chartEl = document.querySelector('[data-earnings-chart]');
          if (chartEl) {
            // Find max absolute EPS for scaling
            var maxEps = 0;
            eh.forEach(function(q) {
              if (q.actual != null && Math.abs(q.actual) > maxEps) maxEps = Math.abs(q.actual);
              if (q.estimate != null && Math.abs(q.estimate) > maxEps) maxEps = Math.abs(q.estimate);
            });
            if (maxEps === 0) maxEps = 1;

            var html = '';
            eh.forEach(function(q) {
              var actH = q.actual != null ? Math.max(4, (Math.abs(q.actual) / maxEps) * 120) : 0;
              var estH = q.estimate != null ? Math.max(4, (Math.abs(q.estimate) / maxEps) * 120) : 0;
              var isBeat = q.actual != null && q.estimate != null && q.actual > q.estimate;
              var isMiss = q.actual != null && q.estimate != null && q.actual < q.estimate;
              var qLabel = '';
              if (q.date) {
                // Handle Yahoo format "4Q2024" or "1Q2025"
                var qMatch = String(q.date).match(/^(\d)Q(\d{4})$/);
                if (qMatch) {
                  qLabel = 'Q' + qMatch[1] + ' ' + qMatch[2].slice(-2);
                } else if (typeof q.date === 'string' && q.date.indexOf('-') !== -1) {
                  // Handle DB format "2025-01-15"
                  var parts = q.date.split('-');
                  var m = parseInt(parts[1]);
                  qLabel = 'Q' + (Math.floor((m - 1) / 3) + 1) + ' ' + parts[0].slice(-2);
                } else if (typeof q.date === 'number') {
                  var qDate = new Date(q.date * 1000);
                  qLabel = 'Q' + (Math.floor(qDate.getMonth() / 3) + 1) + ' ' + qDate.getFullYear().toString().slice(-2);
                }
              }

              html += '<div class="eq-group">';
              html += '<div class="eq-bars">';
              if (q.actual != null) html += '<div class="eq-bar eq-bar--actual" style="height:' + actH + 'px" title="' + (i18n.actual || 'Actual') + ': ' + q.actual.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '"></div>';
              if (q.estimate != null) html += '<div class="eq-bar eq-bar--estimate" style="height:' + estH + 'px" title="' + (i18n.estimateLabel || 'Estimate') + ': ' + q.estimate.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '"></div>';
              html += '</div>';
              if (isBeat) html += '<span class="eq-indicator eq-indicator--beat">' + (i18n.beat || 'Beat') + '</span>';
              else if (isMiss) html += '<span class="eq-indicator eq-indicator--miss">' + (i18n.miss || 'Miss') + '</span>';
              html += '<span class="eq-label">' + qLabel + '</span>';
              html += '<div class="eq-values">';
              if (q.actual != null) html += '<span class="eq-val">' + q.actual.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '</span>';
              html += '</div>';
              html += '</div>';
            });
            chartEl.innerHTML = html;
          }
          // Earnings summary stats
          var beats = 0, misses = 0, total = 0, avgSurprise = 0;
          eh.forEach(function(q) {
            if (q.actual != null && q.estimate != null) {
              total++;
              if (q.actual > q.estimate) beats++;
              else if (q.actual < q.estimate) misses++;
              avgSurprise += ((q.actual - q.estimate) / Math.abs(q.estimate || 1)) * 100;
            }
          });
          if (total > 0) {
            avgSurprise = avgSurprise / total;
            var sumEl = document.querySelector('[data-earnings-summary]');
            if (sumEl) {
              var shtml = '<div class="es-stats">';
              shtml += '<div class="es-stat"><span class="es-val es-val--beat">' + beats + '/' + total + '</span><span class="es-label">' + (i18n.beat || 'Beat') + '</span></div>';
              shtml += '<div class="es-stat"><span class="es-val es-val--miss">' + misses + '/' + total + '</span><span class="es-label">' + (i18n.miss || 'Miss') + '</span></div>';
              shtml += '<div class="es-stat"><span class="es-val" style="color:' + (avgSurprise >= 0 ? '#16a34a' : '#dc2626') + '">' + (avgSurprise >= 0 ? '+' : '') + avgSurprise.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span><span class="es-label">' + (i18n.avgSurprise || 'Avg Surprise') + '</span></div>';
              shtml += '</div>';
              sumEl.innerHTML = shtml;
              sumEl.style.display = '';
            }
          }
        }

        // ── Graham-Style Fundamental Analysis ──
        (function() {
          var criteria = [];
          var passCount = 0;
          var totalCount = 0;
          var gn = i18n;

          // 1. Adequate Size (market cap > $2B for defensive, > $100M for enterprising)
          if (s.marketCap != null) {
            totalCount++;
            var sizePass = s.marketCap >= 2e9;
            if (sizePass) passCount++;
            criteria.push({ label: gn.grahamAdequateSize || 'Adequate Size', pass: sizePass, val: fmtBig(s.marketCap), note: gn.grahamNoteSize || '> $2B' });
          }

          // 2. Strong Finances (current ratio > 2)
          if (fin.currentRatio != null) {
            totalCount++;
            var crPass = fin.currentRatio >= 2;
            if (crPass) passCount++;
            criteria.push({ label: gn.grahamStrongFinances || 'Strong Finances', pass: crPass, val: fmtNum(fin.currentRatio), note: gn.grahamNoteFinances || 'Current Ratio ≥ 2.0' });
          }

          // 3. Earnings Stability (positive earnings — EPS > 0)
          if (s.eps != null) {
            totalCount++;
            var epsPass = s.eps > 0;
            if (epsPass) passCount++;
            criteria.push({ label: gn.grahamEarningsStability || 'Earnings Stability', pass: epsPass, val: fmtNum(s.eps), note: gn.grahamNoteEps || 'EPS > 0' });
          }

          // 4. Dividend Record
          if (det.dividendYield != null) {
            totalCount++;
            var divPass = det.dividendYield > 0;
            if (divPass) passCount++;
            criteria.push({ label: gn.grahamDividendRecord || 'Dividend Record', pass: divPass, val: fmtPct(det.dividendYield), note: gn.grahamNoteDividend || 'Pays dividends' });
          }

          // 5. Moderate Growth (earnings growth > 0)
          if (fin.earningsGrowth != null) {
            totalCount++;
            var growPass = fin.earningsGrowth > 0;
            if (growPass) passCount++;
            criteria.push({ label: gn.grahamModerateGrowth || 'Earnings Growth', pass: growPass, val: fmtPct(fin.earningsGrowth), note: gn.grahamNoteGrowth || '> 0%' });
          }

          // 6. Moderate P/E Ratio (< 15)
          if (s.trailingPE != null && s.trailingPE > 0) {
            totalCount++;
            var pePass = s.trailingPE <= 15;
            if (pePass) passCount++;
            criteria.push({ label: gn.grahamModeratePE || 'Moderate P/E', pass: pePass, val: fmtNum(s.trailingPE), note: gn.grahamNotePE || '≤ 15' });
          }

          // 7. Moderate P/B Ratio (< 1.5)
          if (s.priceToBook != null && s.priceToBook > 0) {
            totalCount++;
            var pbPass = s.priceToBook <= 1.5;
            if (pbPass) passCount++;
            criteria.push({ label: gn.grahamModeratePB || 'Moderate P/B', pass: pbPass, val: fmtNum(s.priceToBook), note: gn.grahamNotePB || '≤ 1.5' });
          }

          // Graham Number = sqrt(22.5 * EPS * Book Value)
          var grahamNum = null;
          if (s.eps != null && s.eps > 0 && s.bookValue != null && s.bookValue > 0) {
            grahamNum = Math.sqrt(22.5 * s.eps * s.bookValue);
          }

          if (totalCount >= 3) {
            var gc = document.querySelector('[data-graham-card]');
            if (gc) {
              var score = Math.round((passCount / totalCount) * 100);
              var sColor = score >= 70 ? '#16a34a' : score >= 45 ? '#eab308' : '#dc2626';
              var verdict = score >= 70 ? (gn.undervalued || 'Potentially Undervalued') : score >= 45 ? (gn.fairlyValued || 'Fairly Valued') : (gn.overvalued || 'Possibly Overvalued');

              var gh = '<div class="grm-header">';
              gh += '<div class="grm-score-wrap">';
              gh += '<div class="grm-gauge"><div class="grm-gauge-fill" style="width:' + score + '%;background:' + sColor + '"></div></div>';
              gh += '<span class="grm-score" style="color:' + sColor + '">' + passCount + '/' + totalCount + '</span>';
              gh += '</div>';
              gh += '<div class="grm-verdict" style="color:' + sColor + '">' + verdict + '</div>';
              gh += '</div>';

              // Graham Number
              if (grahamNum != null && curPrice) {
                var margin = ((grahamNum - curPrice) / curPrice * 100);
                var mColor = margin > 0 ? '#16a34a' : '#dc2626';
                var mLabel = margin > 0 ? (gn.grahamMarginSafety || 'Margin of Safety') : (gn.overvalued || 'Overvalued');
                gh += '<div class="grm-number">';
                gh += '<div class="grm-num-row">';
                gh += '<span class="grm-num-label">' + (gn.grahamNumber || 'Graham Number') + '</span>';
                gh += '<span class="grm-num-val">' + C.fmt(Math.round(grahamNum)) + '</span>';
                gh += '</div>';
                gh += '<div class="grm-num-row">';
                gh += '<span class="grm-num-label">' + (i18n.currentPrice || 'Current Price') + '</span>';
                gh += '<span class="grm-num-val">' + C.fmt(Math.round(curPrice)) + '</span>';
                gh += '</div>';
                gh += '<div class="grm-margin" style="color:' + mColor + '">' + mLabel + ': ' + (margin >= 0 ? '+' : '') + margin.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</div>';
                gh += '</div>';
              }

              // Criteria list
              gh += '<div class="grm-criteria">';
              for (var gi = 0; gi < criteria.length; gi++) {
                var cr = criteria[gi];
                var icon = cr.pass ? '✓' : '✗';
                var iCls = cr.pass ? 'grm-pass' : 'grm-fail';
                gh += '<div class="grm-row ' + iCls + '">';
                gh += '<span class="grm-icon">' + icon + '</span>';
                gh += '<span class="grm-label">' + cr.label + '</span>';
                gh += '<span class="grm-val">' + cr.val + '</span>';
                gh += '<span class="grm-note">' + cr.note + '</span>';
                gh += '</div>';
              }
              gh += '</div>';

              gc.innerHTML = gh;
              showEl('[data-graham-section]');
            }
          }
        })();

        // ── Key Insights ──
        function insightTpl(key, val) { return (i18n[key] || key).replace('{val}', val); }
        var insights = [];
        if (det.fiftyDayAverage && det.twoHundredDayAverage && fin.currentPrice) {
          if (fin.currentPrice > det.fiftyDayAverage && fin.currentPrice > det.twoHundredDayAverage) {
            insights.push(i18n.insightBullish || 'Trading above both 50-day and 200-day moving averages — bullish momentum');
          } else if (fin.currentPrice < det.fiftyDayAverage && fin.currentPrice < det.twoHundredDayAverage) {
            insights.push(i18n.insightBearish || 'Trading below both 50-day and 200-day moving averages — bearish pressure');
          }
        }
        if (s.trailingPE != null && s.trailingPE > 0 && s.trailingPE < 10) {
          insights.push(insightTpl('insightLowPE', fmtNum(s.trailingPE)));
        } else if (s.trailingPE != null && s.trailingPE > 30) {
          insights.push(insightTpl('insightHighPE', fmtNum(s.trailingPE)));
        }
        if (fin.profitMargins != null && fin.profitMargins > 0.2) {
          insights.push(insightTpl('insightStrongMargins', (fin.profitMargins * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1})));
        } else if (fin.profitMargins != null && fin.profitMargins < 0) {
          insights.push(insightTpl('insightUnprofitable', (fin.profitMargins * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1})));
        }
        if (fin.revenueGrowth != null && fin.revenueGrowth > 0.2) {
          insights.push(insightTpl('insightRevenueGrowth', (fin.revenueGrowth * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1})));
        }
        if (det.dividendYield != null && det.dividendYield > 0.04) {
          insights.push(insightTpl('insightHighDivYield', (det.dividendYield * 100).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2})));
        }
        if (s.beta != null) {
          if (s.beta < 0.5) insights.push(insightTpl('insightLowBeta', fmtNum(s.beta)));
          else if (s.beta > 1.5) insights.push(insightTpl('insightHighBeta', fmtNum(s.beta)));
        }
        if (s.heldPercentInsiders != null && s.heldPercentInsiders > 0.3) {
          insights.push(insightTpl('insightInsiderOwn', (s.heldPercentInsiders * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1})));
        }
        if (fin.debtToEquity != null && fin.debtToEquity > 200) {
          insights.push(insightTpl('insightHighDebt', fmtNum(fin.debtToEquity)));
        }
        if (insights.length > 0) {
          var iEl = document.querySelector('[data-insights-list]');
          if (iEl) {
            iEl.innerHTML = insights.map(function(t) { return '<li class="ki-item">' + t + '</li>'; }).join('');
            showEl('[data-insights]');
          }
        }

        // ── About the Company (expanded) ──
        if (hasCo) {
          showEl('[data-about-section]');

          // Description with read-more
          if (co.description) {
            var descEl = document.querySelector('[data-about-desc]');
            if (descEl) {
              descEl.textContent = co.description;
              // Show toggle only if text is long
              var toggleEl = document.querySelector('[data-about-toggle]');
              if (toggleEl) {
                if (co.description.length > 300) {
                  descEl.classList.add('about-desc--clamped');
                  toggleEl.style.display = 'inline-block';
                  toggleEl.addEventListener('click', function() {
                    var clamped = descEl.classList.toggle('about-desc--clamped');
                    toggleEl.textContent = clamped ? (i18n.readMore || 'Read more') : (i18n.readLess || 'Read less');
                    toggleEl.setAttribute('aria-expanded', clamped ? 'false' : 'true');
                  });
                } else {
                  toggleEl.style.display = 'none';
                }
              }
            }
          }

          // Header badges
          var badgesEl = document.querySelector('[data-stock-badges]');
          if (badgesEl && (co.sector || co.industry)) {
            var bHtml = '';
            if (co.sector) bHtml += '<a href="/' + lang + '/markets/screener?sector=' + encodeURIComponent(co.sector) + '" class="stk-badge stk-badge--sector">' + tSec(co.sector) + '</a>';
            if (co.industry) bHtml += '<a href="/' + lang + '/markets/screener?q=' + encodeURIComponent(co.industry) + '" class="stk-badge stk-badge--industry">' + tInd(co.industry) + '</a>';
            if (co.country) bHtml += '<a href="/' + lang + '/markets/screener?q=' + encodeURIComponent(co.country) + '" class="stk-badge stk-badge--location">' + co.country + '</a>';
            badgesEl.innerHTML = bHtml;
            badgesEl.style.display = '';
          }

          // Details grid (sector/industry are tappable links to screener)
          if (co.sector) { showEl('[data-ad-sector]'); var sv = document.querySelector('[data-ad-sector-v]'); if (sv) sv.innerHTML = '<a href="/' + lang + '/markets/screener?sector=' + encodeURIComponent(co.sector) + '" class="ad-link">' + tSec(co.sector) + '</a>'; }
          if (co.industry) { showEl('[data-ad-industry]'); var iv = document.querySelector('[data-ad-industry-v]'); if (iv) iv.innerHTML = '<a href="/' + lang + '/markets/screener?q=' + encodeURIComponent(co.industry) + '" class="ad-link">' + tInd(co.industry) + '</a>'; }
          if (co.fullTimeEmployees) { showEl('[data-ad-employees]'); setEl('[data-ad-employees-v]', co.fullTimeEmployees.toLocaleString(lang)); }
          if (co.city || co.country) { showEl('[data-ad-location]'); setEl('[data-ad-location-v]', [co.city, co.country].filter(Boolean).join(', ')); }
          if (co.website) {
            showEl('[data-ad-website]');
            var adw = document.querySelector('[data-ad-website-v]');
            if (adw) { adw.href = co.website; adw.textContent = co.website.replace(/^https?:\/\//, '').replace(/\/$/, ''); }
          }
          if (co.phone) { showEl('[data-ad-phone]'); setEl('[data-ad-phone-v]', co.phone); }

          // ── Key Products & Services ──
          var PRODUCTS = {
            'YPF': { icon: '⛽', items: ['Oil & Gas E&P', 'Vaca Muerta shale', 'Refining (La Plata, Luján de Cuyo)', 'YPF Gas stations', 'YPF Luz (renewables)', 'Petrochemicals'] },
            'GGAL': { icon: '🏦', items: ['Banco Galicia', 'Naranja X (fintech)', 'Galicia Seguros', 'Fondos Fima (asset mgmt)', 'Galicia Administradora de Fondos'] },
            'BMA': { icon: '🏦', items: ['Banco Macro (retail banking)', 'Corporate & SME banking', 'Macro Securities', 'Macro Fondos SGF'] },
            'BBAR': { icon: '🏦', items: ['BBVA Argentina (retail banking)', 'BBVA Asset Management', 'BBVA Seguros', 'Consolidar AFJP', 'Digital banking (app)'] },
            'SUPV': { icon: '🏦', items: ['Banco Supervielle', 'Cordial Compañía Financiera', 'Supervielle Seguros', 'Supervielle Asset Management', 'Mila (digital wallet)'] },
            'PAM': { icon: '⚡', items: ['Power generation (thermal + hydro)', 'Edenor (electricity distribution)', 'TGS (gas transport)', 'Pampa Comercializadora', 'Wind & solar farms'] },
            'CEPU': { icon: '⚡', items: ['Thermal power (Costanera, Piedra Buena)', 'Hydroelectric (Piedra del Águila)', 'Wind power (La Castellana, Achiras)', 'FORE.AR (energy trading)'] },
            'EDN': { icon: '💡', items: ['Electricity distribution (Buenos Aires metro)', '3.2M customers', 'Smart metering infrastructure', 'Energy efficiency programs'] },
            'TRAN': { icon: '🔌', items: ['High-voltage transmission (5,600 km)', '500 kV grid operation', 'Grid maintenance & expansion', 'CAMMESA system operator'] },
            'TGSU2': { icon: '🔵', items: ['Natural gas transport (9,000+ km)', 'Gas processing (Cerri complex)', 'NGL production & midstream', 'Telcosur (fiber optic)'] },
            'TGNO4': { icon: '🔵', items: ['Natural gas transport (north region)', '6,000+ km pipeline network', 'Gas compression services'] },
            'TXAR': { icon: '🏗️', items: ['Flat steel products', 'Long steel products', 'Industrial solutions', 'Ternium brand (LatAm)'] },
            'ALUA': { icon: '🏭', items: ['Primary aluminum smelting', 'Aluminum extrusion profiles', 'Flat rolled aluminum', 'Alumina refining'] },
            'LOMA': { icon: '🏗️', items: ['Portland cement', 'Concrete & aggregates', 'Ferrocement railroad ties', 'L\'Amalí brand'] },
            'CRES': { icon: '🌾', items: ['Farmland (700k+ hectares)', 'Cattle ranching', 'Crop production (soy, corn, wheat)', 'IRSA (real estate, 52% stake)'] },
            'IRSA': { icon: '🏢', items: ['Shopping malls (Alto Palermo, Abasto, DOT)', 'Office buildings', 'Hotels (Libertador chain)', 'Residential development', 'IDB (Israel operations)'] },
            'MIRG': { icon: '📱', items: ['Electronics manufacturing', 'Samsung local assembly', 'Automotive (Toyota Hilux components)', 'Agricultural equipment', 'Tierra del Fuego factory'] },
            'BYMA': { icon: '📈', items: ['Stock exchange operations', 'Securities clearing & settlement', 'Market data & indices', 'Caja de Valores (depository)'] },
            'VALO': { icon: '💼', items: ['Brokerage services', 'Asset management', 'Investment banking', 'Financial advisory'] },
            'COME': { icon: '🏢', items: ['Diversified investments', 'Petrolera del Conosur', 'Agribusiness', 'Industrial holdings'] },
            'HARG': { icon: '💼', items: ['Grupo Financiero Valores', 'Brokerage & trading', 'Mutual funds', 'Investment banking'] },
            'YPFD': { icon: '⛽', items: ['Oil & Gas E&P', 'Vaca Muerta shale', 'Refining', 'YPF Gas stations', 'YPF Luz'] },
          };
          var products = PRODUCTS[symbol] || PRODUCTS[symbol.replace('.BA', '')];
          if (products) {
            var kpGrid = document.querySelector('[data-kp-grid]');
            if (kpGrid) {
              var kpHtml = '';
              for (var pi = 0; pi < products.items.length; pi++) {
                kpHtml += '<span class="kp-chip">' + products.items[pi] + '</span>';
              }
              kpGrid.innerHTML = kpHtml;
              showEl('[data-kp-section]');
            }
          }
        }

        // ── Dividend History ──
        if (det.dividendRate != null && det.dividendRate > 0) {
          fetch('/api/stock/' + encodeURIComponent(symbol) + '?range=5y&events=div')
            .then(function(r) { return r.json(); })
            .then(function(chartData) {
              if (!chartData.dividends || chartData.dividends.length === 0) return;
              var divs = chartData.dividends;
              var dhSection = document.querySelector('[data-divhist-section]');
              var dhTitle = document.querySelector('[data-divhist-title]');
              var dhTable = document.querySelector('[data-divhist-table]');
              if (!dhSection || !dhTable || !dhTitle) return;
              dhTitle.textContent = i18n.dividendHistory || 'Dividend History';
              var cur = chartData.currency || 'ARS';
              var html = '<table class="stats-table divhist-table">';
              html += '<thead><tr><th>' + (i18n.exDate || 'Ex-Date') + '</th><th style="text-align:end">' + (i18n.amount || 'Amount') + '</th></tr></thead>';
              html += '<tbody>';
              for (var di = 0; di < Math.min(divs.length, 20); di++) {
                var dv = divs[di];
                var dvDate = new Date(dv.date * 1000);
                var dvDateStr = dvDate.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });
                html += '<tr><td>' + dvDateStr + '</td><td style="text-align:end;font-weight:700;font-variant-numeric:tabular-nums">' + cur + ' ' + dv.amount.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + '</td></tr>';
              }
              html += '</tbody></table>';
              dhTable.innerHTML = html;
              dhSection.style.display = '';
            })
            .catch(function() {});
        }

        // ── Load Peer Stocks ──
        if (co.sector) {
          loadPeers(co.sector, symbol);
        }

        // ── Section Navigation ──
        setTimeout(function() {
          var navEl = document.querySelector('[data-section-nav]');
          if (!navEl) return;
          var sections = [
            { sel: '[data-health-section]', label: i18n.navHealth || 'Health' },
            { sel: '[data-val-snap]', label: i18n.navValuation || 'Valuation' },
            { sel: '[data-ma-signal]', label: i18n.navMaSignal || 'MA Signal' },
            { sel: '[data-financials-section]', label: i18n.navFinancials || 'Financials' },
            { sel: '[data-balance-section]', label: i18n.navBalance || 'Balance Sheet' },
            { sel: '[data-analyst-section]', label: i18n.navAnalyst || 'Analyst' },
            { sel: '[data-earnings-section]', label: i18n.navEarnings || 'Earnings' },
            { sel: '[data-divhist-section]', label: i18n.dividendHistory || 'Div History' },
            { sel: '[data-graham-section]', label: i18n.navGraham || 'Graham' },
            { sel: '[data-about-section]', label: i18n.navAbout || 'About' },
            { sel: '[data-peers-section]', label: i18n.navPeers || 'Peers' },
          ];
          var navHtml = '';
          for (var ni = 0; ni < sections.length; ni++) {
            var sec = document.querySelector(sections[ni].sel);
            if (sec && sec.style.display !== 'none') {
              navHtml += '<a class="sn-link" href="#" data-sn-target="' + sections[ni].sel + '">' + sections[ni].label + '</a>';
            }
          }
          if (navHtml) {
            navEl.innerHTML = navHtml;
            navEl.style.display = '';
            var allLinks = navEl.querySelectorAll('.sn-link');
            allLinks.forEach(function(link) {
              link.addEventListener('click', function(e) {
                e.preventDefault();
                var target = document.querySelector(link.getAttribute('data-sn-target'));
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
              });
            });
            // Scroll-based active highlighting
            if (typeof IntersectionObserver !== 'undefined') {
              var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                  if (entry.isIntersecting) {
                    allLinks.forEach(function(l) { l.classList.remove('sn-link--active'); });
                    for (var ai = 0; ai < allLinks.length; ai++) {
                      if (entry.target.matches(allLinks[ai].getAttribute('data-sn-target'))) {
                        allLinks[ai].classList.add('sn-link--active');
                        // Scroll nav container to keep active link visible
                        var linkEl = allLinks[ai];
                        var navBox = navEl.getBoundingClientRect();
                        var linkBox = linkEl.getBoundingClientRect();
                        if (linkBox.left < navBox.left || linkBox.right > navBox.right) {
                          navEl.scrollLeft += linkBox.left - navBox.left - navBox.width / 2 + linkBox.width / 2;
                        }
                        break;
                      }
                    }
                  }
                });
              }, { rootMargin: '-20% 0px -60% 0px' });
              allLinks.forEach(function(link) {
                var t = document.querySelector(link.getAttribute('data-sn-target'));
                if (t) observer.observe(t);
              });
            }
          }
        }, 500);
      })
      .catch(function() {
        // Silently fail — profile is supplementary
      });
  }

  function loadPeers(sector, currentSymbol) {
    // Try screener API first (has sector data), fallback to BYMA direct
    fetch('/api/screener')
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(data) {
        if (!Array.isArray(data) || data.length === 0) throw new Error('bad');
        // Filter by sector if available
        var peers = data.filter(function(s) {
          return s.sector === sector && s.symbol !== currentSymbol;
        });
        // Fallback: if no sector matches, just show top stocks excluding current
        if (peers.length === 0) {
          peers = data.filter(function(s) { return s.symbol !== currentSymbol; });
        }
        return peers.slice(0, 6).map(function(s) {
          return { symbol: s.symbol, name: s.name, price: s.price, change: s.change, marketCap: s.market_cap, pe: s.pe || null, volume: s.volume || null };
        });
      })
      .catch(function() {
        // Fallback to BYMA direct
        return fetch('https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/leading-equity', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        }).then(function(r) { return r.json(); }).then(function(d) {
          var arr = (d && d.data) || d || [];
          if (!Array.isArray(arr)) return [];
          var NAMES = {
            YPFD:'YPF', GGAL:'Grupo Fin. Galicia', BMA:'Banco Macro', BBAR:'BBVA Argentina',
            PAMP:'Pampa Energía', TECO2:'Telecom Argentina', CEPU:'Central Puerto',
            TXAR:'Ternium Argentina', TGSU2:'Transp. Gas del Sur', LOMA:'Loma Negra',
            SUPV:'Grupo Supervielle', ALUA:'Aluar Aluminio', TRAN:'Transener', EDN:'Edenor'
          };
          var seen = {};
          return arr.filter(function(s) {
            var sym = (s.symbol || '').replace('.BA', '');
            if (!sym || sym === currentSymbol || !(s.trade || s.closingPrice) || seen[sym]) return false;
            seen[sym] = true;
            return true;
          }).slice(0, 6).map(function(s) {
            var sym = (s.symbol || '').replace('.BA', '');
            return {
              symbol: sym, name: NAMES[sym] || s.securityDesc || sym,
              price: s.trade || s.closingPrice,
              change: s.imbalance != null ? s.imbalance : (s.variation != null ? s.variation / 100 : null),
              marketCap: null
            };
          });
        }).catch(function() { return []; });
      })
      .then(function(peers) {
        if (!peers || peers.length === 0) return;
        renderPeers(peers);
      });
  }

  function renderPeers(peers) {
    showEl('[data-peers-section]');
    var grid = document.querySelector('[data-peers-grid]');
    if (!grid) return;

    var html = '';
    for (var i = 0; i < peers.length; i++) {
      var p = peers[i];
      var pct = p.change != null ? p.change * 100 : null;
      var cls = pct != null ? (pct >= 0 ? 'rc-up' : 'rc-down') : '';
      var arrow = pct != null ? (pct >= 0 ? '▲' : '▼') : '';
      var link = '/' + lang + '/markets/stock/' + encodeURIComponent(p.symbol);
      html += '<a href="' + link + '" class="peer-card" aria-label="' + (p.name || p.symbol) + '">';
      html += '<div class="peer-top">';
      html += '<span class="peer-symbol">' + p.symbol + '</span>';
      html += '<span class="peer-pct ' + cls + '">' + arrow + ' ' + (pct != null ? Math.abs(pct).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%' : '—') + '</span>';
      html += '</div>';
      html += '<span class="peer-name">' + (p.name || p.symbol) + '</span>';
      html += '<span class="peer-price">' + (p.currency || 'ARS') + ' ' + (p.price ? C.fmt(p.price) : '—') + '</span>';
      html += '<div class="peer-meta">';
      if (p.marketCap) html += '<span class="peer-cap">' + (i18n.marketCap || 'Cap') + ' $' + fmtBig(p.marketCap) + '</span>';
      if (p.pe != null) html += '<span class="peer-pe">P/E ' + p.pe.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '</span>';
      html += '</div>';
      html += '</a>';
    }
    grid.innerHTML = html;
  }

  // ── Crypto-specific profile (CoinGecko) ──
  function loadCryptoProfile() {
    var coinSym = symbol.replace('-USD', '').toLowerCase();
    // Map common symbols to CoinGecko IDs
    var COIN_IDS = { btc:'bitcoin', eth:'ethereum', xrp:'ripple', bnb:'binancecoin', sol:'solana', ada:'cardano', doge:'dogecoin', trx:'tron', avax:'avalanche-2', link:'chainlink', dot:'polkadot', matic:'matic-network', shib:'shiba-inu', ltc:'litecoin', atom:'cosmos', uni:'uniswap', xlm:'stellar', near:'near', icp:'internet-computer', apt:'aptos' };
    var coinId = COIN_IDS[coinSym] || coinSym;

    fetch('https://api.coingecko.com/api/v3/coins/' + coinId + '?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true')
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        if (!d) return;

        // Company hero for crypto
        showEl('[data-company-hero]');
        var nameEl = document.querySelector('[data-ch-name]');
        if (nameEl) nameEl.textContent = d.name || displaySymbol;

        // Update page title and meta for crypto
        if (d.name) {
          document.title = displaySymbol + ' (' + d.name + ') — ' + (i18n.pageTitle || 'Argentine Markets') + ' | Plata';
          var metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) metaDesc.setAttribute('content', d.name + ' (' + displaySymbol + ') — ' + (i18n.cryptoTag || 'Cryptocurrency') + ' | Plata');
          setEl('[data-stock-name]', d.name);
        }

        // Logo
        if (d.image && d.image.small) {
          var li = document.querySelector('[data-ch-logo-img]');
          if (li) { li.src = d.image.small; li.alt = d.name; li.style.display = ''; }
          var fb = document.querySelector('[data-ch-logo-fb]');
          if (fb) fb.style.display = 'none';
        }

        // Tags
        var tagsEl = document.querySelector('[data-ch-tags]');
        if (tagsEl) {
          var tagHtml = '<span class="ch-tag ch-tag--sector">' + (i18n.cryptoTag || 'Cryptocurrency') + '</span>';
          if (d.categories && d.categories[0]) tagHtml += '<span class="ch-tag ch-tag--industry">' + d.categories[0] + '</span>';
          tagsEl.innerHTML = tagHtml;
        }

        // Summary
        var sumEl = document.querySelector('[data-ch-summary]');
        if (sumEl && d.description && d.description.en) {
          var desc = d.description.en.replace(/<[^>]+>/g, '').substring(0, 400);
          sumEl.textContent = desc + (d.description.en.length > 400 ? '…' : '');
        }

        // Pills
        var md = d.market_data;
        if (md) {
          if (md.market_cap && md.market_cap.usd) {
            var mcPill = document.querySelector('[data-ch-mcap-pill]');
            if (mcPill) { mcPill.style.display = 'flex'; setEl('[data-ch-mcap-v]', '$' + fmtBig(md.market_cap.usd)); }
          }

          // Crypto-specific Quick Facts
          var qfEl = document.querySelector('[data-qf-strip]');
          if (qfEl) {
            var qfHtml = '';
            if (md.market_cap_rank) qfHtml += '<div class="qf-item" style="display:flex"><span class="qf-label">' + (i18n.cryptoRank || 'Rank') + '</span><span class="qf-val">#' + md.market_cap_rank + '</span></div>';
            if (md.total_volume && md.total_volume.usd) qfHtml += '<div class="qf-item" style="display:flex"><span class="qf-label">' + (i18n.crypto24hVol || '24h Volume') + '</span><span class="qf-val">$' + fmtBig(md.total_volume.usd) + '</span></div>';
            if (md.circulating_supply) qfHtml += '<div class="qf-item" style="display:flex"><span class="qf-label">' + (i18n.cryptoCirculating || 'Circulating') + '</span><span class="qf-val">' + fmtBig(md.circulating_supply) + '</span></div>';
            if (md.max_supply) qfHtml += '<div class="qf-item" style="display:flex"><span class="qf-label">' + (i18n.cryptoMaxSupply || 'Max Supply') + '</span><span class="qf-val">' + fmtBig(md.max_supply) + '</span></div>';
            if (md.ath && md.ath.usd) qfHtml += '<div class="qf-item" style="display:flex"><span class="qf-label">' + (i18n.cryptoAth || 'ATH') + '</span><span class="qf-val">$' + C.fmt(md.ath.usd) + '</span></div>';
            if (md.ath_change_percentage && md.ath_change_percentage.usd) {
              var athPct = md.ath_change_percentage.usd;
              qfHtml += '<div class="qf-item" style="display:flex"><span class="qf-label">' + (i18n.cryptoFromAth || 'From ATH') + '</span><span class="qf-val" style="color:' + (athPct >= 0 ? '#16a34a' : '#dc2626') + '">' + athPct.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span></div>';
            }
            qfEl.innerHTML = qfHtml;
            qfEl.style.display = '';
          }

          // 52-week range from crypto data
          if (md.high_24h && md.high_24h.usd && md.low_24h && md.low_24h.usd) {
            var rangeEl = document.querySelector('[data-pc-range]');
            if (rangeEl && md.current_price && md.current_price.usd) {
              rangeEl.style.display = '';
              setEl('[data-pc-range-lo]', '$' + C.fmt(md.low_24h.usd));
              setEl('[data-pc-range-hi]', '$' + C.fmt(md.high_24h.usd));
              var dayR = md.high_24h.usd - md.low_24h.usd;
              var dayP = dayR > 0 ? Math.max(0, Math.min(100, ((md.current_price.usd - md.low_24h.usd) / dayR) * 100)) : 50;
              var fillE = document.querySelector('[data-pc-range-fill]');
              var dotE = document.querySelector('[data-pc-range-dot]');
              if (fillE) fillE.style.width = dayP + '%';
              if (dotE) dotE.style.insetInlineStart = dayP + '%';
            }
          }

          // Website
          if (d.links && d.links.homepage && d.links.homepage[0]) {
            var webPill = document.querySelector('[data-ch-web-pill]');
            var webLink = document.querySelector('[data-ch-web-v]');
            if (webPill && webLink) {
              webPill.style.display = 'flex';
              webLink.href = d.links.homepage[0];
              webLink.textContent = d.links.homepage[0].replace(/^https?:\/\//, '').replace(/\/$/, '');
            }
          }

          // Crypto Market Data table (Key Statistics equivalent)
          if (md) {
            showEl('[data-profile-section]');
            var cp = md.current_price ? md.current_price.usd : null;
            var tbl = document.querySelectorAll('[data-profile-section] .stats-table');
            // Use first stats column for crypto-specific stats
            var statsCol1 = tbl[0];
            if (statsCol1) {
              var shtml = '';
              if (md.market_cap && md.market_cap.usd) shtml += '<tr><td class="st-k">' + (i18n.marketCap || 'Market Cap') + '</td><td class="st-v">$' + fmtBig(md.market_cap.usd) + '</td></tr>';
              if (md.total_volume && md.total_volume.usd) shtml += '<tr><td class="st-k">' + (i18n.crypto24hVol || '24h Volume') + '</td><td class="st-v">$' + fmtBig(md.total_volume.usd) + '</td></tr>';
              if (md.circulating_supply) shtml += '<tr><td class="st-k">' + (i18n.cryptoCirculating || 'Circulating Supply') + '</td><td class="st-v">' + fmtBig(md.circulating_supply) + '</td></tr>';
              if (md.total_supply) shtml += '<tr><td class="st-k">' + (i18n.cryptoTotalSupply || 'Total Supply') + '</td><td class="st-v">' + fmtBig(md.total_supply) + '</td></tr>';
              if (md.max_supply) shtml += '<tr><td class="st-k">' + (i18n.cryptoMaxSupply || 'Max Supply') + '</td><td class="st-v">' + fmtBig(md.max_supply) + '</td></tr>';
              if (md.fully_diluted_valuation && md.fully_diluted_valuation.usd) shtml += '<tr><td class="st-k">' + (i18n.cryptoFDV || 'Fully Diluted Val.') + '</td><td class="st-v">$' + fmtBig(md.fully_diluted_valuation.usd) + '</td></tr>';
              if (shtml) { statsCol1.querySelector('tbody').innerHTML = shtml; }
            }
            // Use second column for price stats
            var statsCol2 = tbl[1];
            if (statsCol2) {
              var shtml2 = '';
              if (md.ath && md.ath.usd) shtml2 += '<tr><td class="st-k">' + (i18n.cryptoAth || 'All-Time High') + '</td><td class="st-v">$' + C.fmt(md.ath.usd) + '</td></tr>';
              if (md.ath_change_percentage && md.ath_change_percentage.usd != null) shtml2 += '<tr><td class="st-k">' + (i18n.cryptoFromAth || 'From ATH') + '</td><td class="st-v" style="color:' + (md.ath_change_percentage.usd >= 0 ? '#16a34a' : '#dc2626') + '">' + md.ath_change_percentage.usd.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</td></tr>';
              if (md.atl && md.atl.usd) shtml2 += '<tr><td class="st-k">' + (i18n.cryptoAtl || 'All-Time Low') + '</td><td class="st-v">$' + C.fmt(md.atl.usd) + '</td></tr>';
              if (md.price_change_percentage_24h != null) shtml2 += '<tr><td class="st-k">' + (i18n.crypto24hChange || '24h Change') + '</td><td class="st-v" style="color:' + (md.price_change_percentage_24h >= 0 ? '#16a34a' : '#dc2626') + '">' + (md.price_change_percentage_24h >= 0 ? '+' : '') + md.price_change_percentage_24h.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</td></tr>';
              if (md.price_change_percentage_7d != null) shtml2 += '<tr><td class="st-k">' + (i18n.crypto7dChange || '7d Change') + '</td><td class="st-v" style="color:' + (md.price_change_percentage_7d >= 0 ? '#16a34a' : '#dc2626') + '">' + (md.price_change_percentage_7d >= 0 ? '+' : '') + md.price_change_percentage_7d.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</td></tr>';
              if (md.price_change_percentage_30d != null) shtml2 += '<tr><td class="st-k">' + (i18n.crypto30dChange || '30d Change') + '</td><td class="st-v" style="color:' + (md.price_change_percentage_30d >= 0 ? '#16a34a' : '#dc2626') + '">' + (md.price_change_percentage_30d >= 0 ? '+' : '') + md.price_change_percentage_30d.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</td></tr>';
              if (md.market_cap_rank) shtml2 += '<tr><td class="st-k">' + (i18n.cryptoRank || 'Market Cap Rank') + '</td><td class="st-v">#' + md.market_cap_rank + '</td></tr>';
              if (shtml2) { statsCol2.querySelector('tbody').innerHTML = shtml2; }
            }
          }
        }

        // Also fetch stock-profile for 52-week range
        fetch('/api/stock-profile/' + encodeURIComponent(symbol))
          .then(function(r) { return r.ok ? r.json() : null; })
          .then(function(p) {
            if (!p) return;
            var det = p.detail || {};
            var curPrice = md && md.current_price ? md.current_price.usd : null;
            // 52-week range
            if (det.fiftyTwoWeekLow != null && det.fiftyTwoWeekHigh != null && curPrice) {
              showEl('[data-range52]');
              var low52 = det.fiftyTwoWeekLow;
              var high52 = det.fiftyTwoWeekHigh;
              var range = high52 - low52;
              var pct52 = range > 0 ? Math.max(0, Math.min(100, ((curPrice - low52) / range) * 100)) : 50;
              setEl('[data-range52-low]', '$' + C.fmt(low52));
              setEl('[data-range52-high]', '$' + C.fmt(high52));
              setEl('[data-range52-current]', '$' + C.fmt(curPrice));
              var fill52 = document.querySelector('[data-range52-fill]');
              if (fill52) fill52.style.width = pct52 + '%';
              var marker52 = document.querySelector('[data-range52-marker]');
              if (marker52) marker52.style.insetInlineStart = pct52 + '%';
              var badge52 = document.querySelector('[data-range52-badge]');
              if (badge52) {
                var zoneLabel, zoneCls;
                if (pct52 <= 20) { zoneLabel = i18n.nearLow || 'Near 52w Low'; zoneCls = 'range52-zone--low'; }
                else if (pct52 <= 70) { zoneLabel = i18n.midRange || 'Mid Range'; zoneCls = 'range52-zone--mid'; }
                else if (pct52 <= 92) { zoneLabel = i18n.nearHigh || 'Near 52w High'; zoneCls = 'range52-zone--high'; }
                else { zoneLabel = i18n.nearAth || 'Near ATH'; zoneCls = 'range52-zone--ath'; }
                badge52.textContent = zoneLabel;
                badge52.className = 'range52-zone-badge ' + zoneCls;
              }
              if (range > 0) {
                var fromLowPct = low52 > 0 ? ((curPrice - low52) / low52 * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) : '—';
                var fromHighPct = high52 > 0 ? ((curPrice - high52) / high52 * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) : '—';
                var flEl = document.querySelector('[data-range52-from-low]');
                var fhEl = document.querySelector('[data-range52-from-high]');
                if (flEl) flEl.innerHTML = '<span class="range52-stat-val range52-stat--up">+' + fromLowPct + '%</span> ' + (i18n.fromLow || 'from 52w Low');
                if (fhEl) fhEl.innerHTML = '<span class="range52-stat-val range52-stat--down">' + fromHighPct + '%</span> ' + (i18n.fromHigh || 'from 52w High');
              }
            }
            // 50/200 day averages for MA signal
            if (det.fiftyDayAverage != null && det.twoHundredDayAverage != null && curPrice) {
              showEl('[data-ma-signal]');
              var ma50 = det.fiftyDayAverage;
              var ma200 = det.twoHundredDayAverage;
              var maGrid = document.querySelector('[data-ma-grid]');
              if (maGrid) {
                var above50 = curPrice > ma50;
                var above200 = curPrice > ma200;
                var golden = ma50 > ma200;
                var overallBull = above50 && above200;
                var overallBear = !above50 && !above200;
                var overallLabel = overallBull ? (i18n.bullish || 'Bullish') : overallBear ? (i18n.bearish || 'Bearish') : (i18n.neutral || 'Neutral');
                var overallColor = overallBull ? '#16a34a' : overallBear ? '#dc2626' : '#f59e0b';
                var html = '<div class="ma-overall" style="border-color:' + overallColor + '"><span class="ma-overall-icon">' + (overallBull ? '▲' : overallBear ? '▼' : '◆') + '</span><span class="ma-overall-label" style="color:' + overallColor + '">' + (i18n.maSignal || 'MA Signal') + ': ' + overallLabel + '</span></div>';
                html += '<div class="ma-cards">';
                html += '<div class="ma-card ' + (above50 ? 'ma-card--up' : 'ma-card--down') + '"><span class="ma-card-title">' + (i18n.ma50Title || '50-Day MA') + '</span><span class="ma-card-val">$' + C.fmt(ma50) + '</span><span class="ma-card-sig" style="color:' + (above50 ? '#16a34a' : '#dc2626') + '">' + (above50 ? '▲ ' + (i18n.above || 'Above') : '▼ ' + (i18n.below || 'Below')) + '</span></div>';
                html += '<div class="ma-card ' + (above200 ? 'ma-card--up' : 'ma-card--down') + '"><span class="ma-card-title">' + (i18n.ma200Title || '200-Day MA') + '</span><span class="ma-card-val">$' + C.fmt(ma200) + '</span><span class="ma-card-sig" style="color:' + (above200 ? '#16a34a' : '#dc2626') + '">' + (above200 ? '▲ ' + (i18n.above || 'Above') : '▼ ' + (i18n.below || 'Below')) + '</span></div>';
                html += '<div class="ma-card ' + (golden ? 'ma-card--up' : 'ma-card--down') + '"><span class="ma-card-title">' + (golden ? (i18n.goldenCross || 'Golden Cross') : (i18n.deathCross || 'Death Cross')) + '</span><span class="ma-card-val">' + (i18n.ma50vs200 || '50d vs 200d') + '</span><span class="ma-card-sig" style="color:' + (golden ? '#16a34a' : '#dc2626') + '">' + (golden ? '▲ ' + (i18n.bullish || 'Bullish') : '▼ ' + (i18n.bearish || 'Bearish')) + '</span></div>';
                html += '</div>';
                maGrid.innerHTML = html;
              }
            }
            // Rebuild section nav
            rebuildCryptoNav();
          }).catch(function() { rebuildCryptoNav(); });

        function rebuildCryptoNav() {
          setTimeout(function() {
            var navEl = document.querySelector('[data-section-nav]');
            if (!navEl) return;
            var sections = [
              { sel: '[data-company-hero]', label: i18n.navAbout || 'About' },
              { sel: '[data-range52]', label: i18n.priceRange52w || '52W Range' },
              { sel: '[data-profile-section]', label: i18n.keyStats || 'Key Statistics' },
              { sel: '[data-ma-signal]', label: i18n.navMaSignal || 'MA Signal' },
            ];
            var links = [];
            for (var k = 0; k < sections.length; k++) {
              var el = document.querySelector(sections[k].sel);
              if (el && el.style.display !== 'none' && el.offsetParent !== null) {
                links.push({ el: el, label: sections[k].label });
              }
            }
            if (links.length > 1) {
              var navHtml = '';
              for (var m = 0; m < links.length; m++) {
                navHtml += '<a class="sn-link" data-sn-target="' + m + '">' + links[m].label + '</a>';
              }
              navEl.innerHTML = navHtml;
              navEl.style.display = '';
              navEl.querySelectorAll('[data-sn-target]').forEach(function(a, idx) {
                a.addEventListener('click', function() { links[idx].el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
              });
            }
          }, 300);
        }
      }).catch(function() {});
  }

  // Initial load — chart + profile in parallel
  loadStock('1mo', '1d');
  if (isCrypto) {
    loadCryptoProfile();
  } else {
    loadProfile();
  }

  // Range selector
  document.querySelectorAll('[data-range-buttons] button').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-range-buttons] button').forEach(function(b) { b.classList.remove('active'); b.removeAttribute('aria-pressed'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      loadStock(btn.getAttribute('data-range'), btn.getAttribute('data-interval'));
    });
  });

  // Resize — use ResizeObserver when available, fall back to window resize
  function redrawCharts() {
    if (!currentChart) return;
    var points = C.yahooToPoints(currentChart.timestamps, currentChart.closes);
    C.drawChart(document.querySelector('[data-stock-chart]'), [
      { points: points, lineColor: '#75AADB', fillColor: 'rgba(117,170,219,0.12)' }
    ], { volumes: currentChart.volumes || [] });
    drawVolumeBars(currentChart.timestamps, currentChart.volumes, currentChart.closes);
  }
  var rTimer;
  if (typeof ResizeObserver !== 'undefined') {
    var chartWrap = document.querySelector('.chart-wrap');
    if (chartWrap) {
      new ResizeObserver(function() {
        clearTimeout(rTimer);
        rTimer = setTimeout(redrawCharts, 150);
      }).observe(chartWrap);
    }
  } else {
    window.addEventListener('resize', function() {
      clearTimeout(rTimer);
      rTimer = setTimeout(redrawCharts, 200);
    });
  }

  // Tooltip toggle for mobile + keyboard
  document.addEventListener('click', function(e) {
    var info = e.target.closest('.st-info');
    document.querySelectorAll('.st-info--active').forEach(function(el) { if (el !== info) el.classList.remove('st-info--active'); });
    if (info) info.classList.toggle('st-info--active');
  });
  document.addEventListener('keydown', function(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('st-info')) {
      e.preventDefault();
      e.target.classList.toggle('st-info--active');
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.st-info--active').forEach(function(el) { el.classList.remove('st-info--active'); });
    }
  });

  // ─── Scroll to top button ───
  var scrollBtn = document.querySelector('[data-scroll-top]');
  if (scrollBtn) {
    var scrollVisible = false;
    window.addEventListener('scroll', function() {
      var show = window.scrollY > 600;
      if (show !== scrollVisible) {
        scrollVisible = show;
        scrollBtn.classList.toggle('scroll-top-btn--visible', show);
      }
    }, { passive: true });
    scrollBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
