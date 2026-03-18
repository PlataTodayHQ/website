// markets-hub.js — Combined inline scripts for markets hub page

// Collapsible sections on mobile with localStorage memory
(function() {
  var mq = window.matchMedia('(max-width: 768px)');
  var STORAGE_KEY = 'plata-mkt-collapsed';
  function getCollapsed() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { return {}; }
  }
  function setCollapsed(map) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch(e) {}
  }

  function initToggle() {
    var saved = getCollapsed();
    document.querySelectorAll('.mkt-sec-toggle').forEach(function(btn, idx) {
      if (btn._collapseBound) return;
      btn._collapseBound = true;
      var key = 'sec-' + idx;
      // Restore saved state on mobile
      if (mq.matches && saved[key]) {
        btn.setAttribute('aria-expanded', 'false');
        var body = btn.closest('.mkt-collapsible').querySelector('.mkt-sec-body');
        if (body) body.classList.add('mkt-sec-body--collapsed');
      }
      btn.addEventListener('click', function() {
        if (!mq.matches) return;
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        var body = btn.closest('.mkt-collapsible').querySelector('.mkt-sec-body');
        if (body) body.classList.toggle('mkt-sec-body--collapsed', expanded);
        var map = getCollapsed();
        if (expanded) map[key] = true; else delete map[key];
        setCollapsed(map);
      });
    });
  }
  initToggle();
})();

(function() {
  var C = window.PlataCharts || {};
  var fmt = C.fmt || function(n) { return Math.round(n).toLocaleString(lang); };
  var fmtM = C.fmtM || function(v) { return v >= 1e6 ? (v/1e6).toLocaleString(lang, {maximumFractionDigits:2})+'M' : Math.round(v).toLocaleString(lang); };
  var fmtVol = C.fmtVol || function(v) { return v >= 1e9 ? (v/1e9).toLocaleString(lang, {maximumFractionDigits:1})+'B' : v >= 1e6 ? (v/1e6).toLocaleString(lang, {maximumFractionDigits:1})+'M' : v >= 1e3 ? (v/1e3).toLocaleString(lang, {maximumFractionDigits:0})+'K' : Math.round(v).toLocaleString(lang); };

  var hub = document.querySelector('[data-markets-hub]');
  var sectorNames = {};
  try { sectorNames = JSON.parse(hub.getAttribute('data-i18n-sectors') || '{}'); } catch(e) {}
  var nStocksLabel = hub.getAttribute('data-i18n-nstocks') || '{n} stocks';
  var oneStockLabel = hub.getAttribute('data-i18n-onestock') || '1 stock';
  var i18nError = hub.getAttribute('data-i18n-error') || 'Failed to load data';
  var i18nRetry = hub.getAttribute('data-i18n-retry') || 'Retry';
  var i18nCheckConn = hub.getAttribute('data-i18n-check-conn') || 'Check your connection and try again';
  var lang = hub ? hub.getAttribute('data-lang') || 'en' : 'en';

  function flashEl(el, newVal, oldVal) {
    if (!el || newVal === oldVal) return;
    var cls = parseFloat(newVal) > parseFloat(oldVal) ? 'data-flash-up' : 'data-flash-down';
    el.classList.remove('data-flash-up', 'data-flash-down');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add(cls);
    setTimeout(function() { el.classList.remove(cls); }, 400);
  }

  function setEl(sel, text) {
    var el = document.querySelector(sel);
    if (!el) return;
    var old = el.textContent;
    el.textContent = text;
    flashEl(el, text, old);
  }

  // ─── Animated count-up ───
  function animateValue(el, end, duration, formatter) {
    if (!el) return;
    var start = 0;
    var startTime = null;
    duration = duration || 600;
    formatter = formatter || function(v) { return Math.round(v).toLocaleString(lang); };
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      var current = start + (end - start) * eased;
      el.textContent = formatter(current);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ─── Mini sparkline SVG generator ───
  function miniSparkSVG(values, up, w, h) {
    w = w || 48; h = h || 20;
    if (!values || values.length < 2) return '';
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;
    var pts = [];
    for (var i = 0; i < values.length; i++) {
      var x = (i / (values.length - 1)) * w;
      var y = h - ((values[i] - min) / range) * (h - 2) - 1;
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    var color = up ? '#16a34a' : '#dc2626';
    return '<svg class="mkt-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  // ─── Section reveal on scroll ───
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;
    var sections = document.querySelectorAll('.mkt-section');
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('mkt-section--visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });
    sections.forEach(function(s) { observer.observe(s); });
  }
  initReveal();

  // ─── Refresh progress bar ───
  var REFRESH_INTERVAL = 5 * 60; // 5 minutes
  var refreshStart = Date.now();
  var refreshFill = document.querySelector('[data-refresh-fill]');

  function updateRefreshBar() {
    if (!refreshFill) return;
    var elapsed = (Date.now() - refreshStart) / 1000;
    var pct = Math.min(elapsed / REFRESH_INTERVAL * 100, 100);
    refreshFill.style.width = pct + '%';
    if (elapsed >= REFRESH_INTERVAL) {
      window.location.reload();
      return;
    }
    requestAnimationFrame(updateRefreshBar);
  }
  requestAnimationFrame(updateRefreshBar);

  function formatUSD(val) {
    if (val >= 10000) return Math.round(val).toLocaleString(lang);
    if (val >= 1000) return val.toLocaleString(lang, { maximumFractionDigits: 0 });
    if (val >= 1) return val.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toLocaleString(lang, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }

  function calcSpread(rateSell, officialSell) {
    if (!officialSell || officialSell <= 0) return null;
    return ((rateSell - officialSell) / officialSell * 100);
  }

  // ─── Market Status ───
  function renderMarketStatus() {
    var bar = document.querySelector('[data-mkt-status]');
    if (!bar) return;
    var now = new Date();
    var utcH = now.getUTCHours();
    var utcM = now.getUTCMinutes();
    var utcMin = utcH * 60 + utcM;
    var day = now.getUTCDay(); // 0=Sun, 6=Sat

    var markets = [
      { name: 'BYMA', tz: -3, open: 11*60, close: 17*60, emoji: '🇦🇷' },
      { name: 'NYSE', tz: -4, open: 9*60+30, close: 16*60, emoji: '🇺🇸' },
      { name: 'LSE', tz: 1, open: 8*60, close: 16*60+30, emoji: '🇬🇧' },
      { name: 'Crypto', tz: 0, open: 0, close: 24*60, alwaysOpen: true, emoji: '₿' },
    ];

    var html = '';
    for (var i = 0; i < markets.length; i++) {
      var m = markets[i];
      var isOpen = false;
      var timeNote = '';
      if (m.alwaysOpen) {
        isOpen = true;
        timeNote = '24/7';
      } else if (day > 0 && day < 6) {
        var localMin = utcMin + m.tz * 60;
        if (localMin < 0) localMin += 1440;
        if (localMin >= 1440) localMin -= 1440;
        isOpen = localMin >= m.open && localMin < m.close;
        if (isOpen) {
          var minsLeft = m.close - localMin;
          var h = Math.floor(minsLeft / 60);
          var mins = minsLeft % 60;
          timeNote = h > 0 ? h + 'h ' + mins + 'm' : mins + 'm';
        } else {
          var minsToOpen = m.open - localMin;
          if (minsToOpen < 0) minsToOpen += 1440;
          if (minsToOpen <= 480) {
            var oh = Math.floor(minsToOpen / 60);
            var om = minsToOpen % 60;
            timeNote = oh > 0 ? oh + 'h ' + om + 'm' : om + 'm';
          }
        }
      } else {
        timeNote = '';
      }
      var cls = isOpen ? 'mkt-status-open' : 'mkt-status-closed';
      var dot = isOpen ? '<span class="mkt-status-dot mkt-status-dot--open"></span>' : '<span class="mkt-status-dot"></span>';
      html += '<span class="mkt-status-item ' + cls + '">' + dot + m.emoji + ' ' + m.name;
      if (timeNote) html += '<span class="mkt-status-time">' + timeNote + '</span>';
      html += '</span>';
    }
    bar.innerHTML = html;
  }
  renderMarketStatus();

  // ─── FX Rates ───
  var oficialSell = null;

  function fillFxCard(key, data, evo) {
    if (!data) return;
    setEl('[data-fx-price="' + key + '"]', 'ARS ' + fmt(data.value_sell));
    setEl('[data-fx-buy="' + key + '"]', fmt(data.value_buy));
    setEl('[data-fx-sell="' + key + '"]', fmt(data.value_sell));

    if (key === 'oficial') oficialSell = data.value_sell;

    // Spread vs oficial
    if (key !== 'oficial' && oficialSell) {
      var gap = calcSpread(data.value_sell, oficialSell);
      if (gap != null) {
        var gapEl = document.querySelector('[data-fx-gap="' + key + '"]');
        if (gapEl) {
          var oldGap = gapEl.textContent;
          var newGap = (gap >= 0 ? '+' : '') + gap.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%';
          gapEl.textContent = newGap;
          gapEl.className = 'mkt-fx-spread-val ' + (gap >= 0 ? 'rc-up' : 'rc-down');
          flashEl(gapEl, newGap, oldGap);
        }
      }
    }

    // Change % from evolution
    if (evo && evo[key]) {
      var chEl = document.querySelector('[data-fx-chg="' + key + '"]');
      if (chEl && evo[key].prev) {
        var oldChgFx = chEl.textContent;
        var pct = ((data.value_sell - evo[key].prev) / evo[key].prev * 100);
        var newChgFx = (pct >= 0 ? '+' : '') + pct.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
        chEl.textContent = newChgFx;
        chEl.className = 'mkt-fx-chg ' + (pct >= 0 ? 'rc-up' : 'rc-down');
        flashEl(chEl, newChgFx, oldChgFx);
      }
    }

    // Card accent + remove loading
    var card = document.querySelector('[data-mkt-fx="' + key + '"]');
    if (card) {
      card.classList.remove('mkt-fx-card--loading');
      if (evo && evo[key] && evo[key].prev) {
        var p = data.value_sell - evo[key].prev;
        card.classList.add(p >= 0 ? 'mkt-fx-card--positive' : 'mkt-fx-card--negative');
      }
    }
  }

  // ─── MERVAL ───
  // Smooth count-up for numeric elements
  function countUp(el, target, duration, formatter) {
    var start = parseFloat(el._countVal || '0') || 0;
    if (start === target) return;
    el._countVal = target;
    var diff = target - start;
    var startTime = null;
    var dur = Math.min(duration || 600, 800);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = formatter(target);
      return;
    }
    function step(ts) {
      if (!startTime) startTime = ts;
      var p = Math.min((ts - startTime) / dur, 1);
      var ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = formatter(start + diff * ease);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function fillMerval(data) {
    if (!data || !data.price) return;
    var idxCard = document.querySelector('.mkt-idx-card--loading');
    if (idxCard) idxCard.classList.remove('mkt-idx-card--loading');
    var priceEl = document.querySelector('[data-idx-price]');
    if (priceEl) countUp(priceEl, data.price, 600, fmtM);
    if (data.high) setEl('[data-idx-high]', fmtM(data.high));
    if (data.low) setEl('[data-idx-low]', fmtM(data.low));
    if (data.previousClose) setEl('[data-idx-prev]', fmtM(data.previousClose));
    if (data.volume) setEl('[data-idx-vol]', fmtVol(data.volume));

    var pct = data.variation != null ? data.variation * 100 : null;
    if (pct == null && data.previousClose > 0) {
      pct = ((data.price - data.previousClose) / data.previousClose) * 100;
    }
    var chEl = document.querySelector('[data-idx-chg]');
    if (chEl && pct != null) {
      var oldIdx = chEl.textContent;
      var newIdx = (pct >= 0 ? '+' : '') + pct.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
      chEl.textContent = newIdx;
      chEl.className = 'mkt-idx-chg ' + (pct >= 0 ? 'rc-up' : 'rc-down');
      flashEl(chEl, newIdx, oldIdx);
    }
  }

  // ─── CHART ───
  function fillChart(chartData) {
    if (!chartData) return;
    var points = C.yahooToPoints(chartData.timestamps, chartData.closes);
    if (points.length < 2) return;
    C.drawChart(document.querySelector('[data-idx-chart]'), [
      { points: points, lineColor: '#60a5fa', fillColor: 'rgba(96,165,250,0.12)' }
    ], { height: 120, padL: 50, padR: 12, padT: 12, padB: 28, xLabelCount: 5, yFormat: fmtM });
  }

  // ─── TOP MOVERS ───
  var STOCK_NAMES = {
    ALUA:'Aluar',BBAR:'BBVA Arg',BMA:'Banco Macro',BYMA:'BYMA',CEPU:'Central Puerto',
    COME:'Comercial',CRES:'Cresud',EDN:'Edenor',GGAL:'Galicia',HARG:'Holcim',
    LOMA:'Loma Negra',MIRG:'Mirgor',PAMP:'Pampa',SUPV:'Supervielle',TECO2:'Telecom',
    TGNO4:'TGN',TGSU2:'TGS',TRAN:'Transener',TXAR:'Ternium',VALO:'Valores',
    YPFD:'YPF',METR:'MetroGAS',IRSA:'IRSA',BHIP:'Hipotecario',BPAT:'Patagonia',
    CVH:'Cablevisión',GCLA:'Clarín',CAPX:'Capex',LEDE:'Ledesma',BOLT:'Boldt'
  };

  function fillMovers(stocks) {
    if (!stocks || stocks.length === 0) return;
    var sorted = stocks.slice().sort(function(a,b) { return (b.change||0) - (a.change||0); });
    var gainers = sorted.filter(function(s) { return s.change > 0; }).slice(0, 5);
    var losers = sorted.filter(function(s) { return s.change < 0; }).reverse().slice(0, 5);

    function renderList(container, items) {
      if (!container) return;
      if (items.length === 0) { container.innerHTML = '<div class="mkt-mover-empty">—</div>'; return; }
      var html = '';
      for (var i = 0; i < items.length; i++) {
        var s = items[i];
        var sym = (s.symbol || '').replace('.BA', '');
        var pct = (s.change || 0) * 100;
        var cls = pct >= 0 ? 'rc-up' : 'rc-down';
        var arrow = pct >= 0 ? '▲' : '▼';
        var pctFmt = Math.abs(pct).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2});
        html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(sym) + '" class="mkt-mover-row" aria-label="' + sym + ' ' + (pct >= 0 ? '+' : '\u2212') + pctFmt + '%">';
        html += '<span class="mkt-mover-sym">' + sym + '</span>';
        html += '<span class="mkt-mover-name">' + (STOCK_NAMES[sym] || s.name || sym) + '</span>';
        html += '<span class="mkt-mover-price">ARS ' + fmt(s.price || 0) + '</span>';
        html += '<span class="mkt-mover-chg ' + cls + '">' + arrow + ' ' + Math.abs(pct).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
        html += '</a>';
      }
      container.innerHTML = html;
    }

    renderList(document.querySelector('[data-movers-gainers]'), gainers);
    renderList(document.querySelector('[data-movers-losers]'), losers);
  }

  // ─── COMMODITIES ───
  var COMMODITY_ICONS = { 'GC=F': '🥇', 'SI=F': '🥈', 'CL=F': '🛢️', 'NG=F': '🔥', 'HG=F': '🔶' };
  var commodityI18n = {};
  try { commodityI18n = JSON.parse(hub.getAttribute('data-i18n-commodities') || '{}'); } catch(e) {}
  var COMMODITY_NAMES = { 'GC=F': commodityI18n['GC=F'] || 'Gold', 'SI=F': commodityI18n['SI=F'] || 'Silver', 'CL=F': commodityI18n['CL=F'] || 'Crude Oil', 'NG=F': commodityI18n['NG=F'] || 'Natural Gas', 'HG=F': commodityI18n['HG=F'] || 'Copper' };

  var _cmdData = null;
  var _cmdCurr = 'USD';
  var _blueRate = null;

  function fillCommodities(data) {
    _cmdData = data;
    renderCommodities();
  }

  function renderCommodities() {
    var data = _cmdData;
    var grid = document.querySelector('[data-commodities-grid]');
    if (!grid || !data || data.length === 0) return;
    var isARS = _cmdCurr === 'ARS' && _blueRate > 0;
    var html = '';
    for (var i = 0; i < data.length; i++) {
      var c = data[i];
      var chg = c.change || 0;
      var cls = chg >= 0 ? 'rc-up' : 'rc-down';
      var arrow = chg >= 0 ? '▲' : '▼';
      var icon = COMMODITY_ICONS[c.symbol] || '📦';
      var name = c.name || COMMODITY_NAMES[c.symbol] || c.symbol;
      var price = c.price;
      var prefix = '$';
      if (isARS) { price = price * _blueRate; prefix = 'ARS '; }
      var priceStr = isARS ? fmt(price) : formatUSD(price);
      html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(c.symbol) + '" class="mkt-asset-card">';
      html += '<div class="mkt-asset-icon">' + icon + '</div>';
      html += '<div class="mkt-asset-body">';
      html += '<span class="mkt-asset-name">' + name + '</span>';
      html += '<span class="mkt-asset-sym">' + c.symbol.replace('=F', '') + '</span>';
      html += '</div>';
      html += '<div class="mkt-asset-spark" data-cmd-spark="' + c.symbol + '"></div>';
      html += '<div class="mkt-asset-right">';
      html += '<span class="mkt-asset-price">' + prefix + priceStr + '</span>';
      html += '<span class="mkt-asset-chg ' + cls + '">' + arrow + ' ' + Math.abs(chg).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
      html += '</div>';
      html += '</a>';
    }
    grid.innerHTML = html;
    grid.closest('.mkt-section').classList.add('mkt-section-loaded');

    // Load sparklines for each commodity
    data.forEach(function(c) {
      fetchJson('/api/stock/' + c.symbol + '?range=5d&interval=1d').then(function(d) {
        if (!d) return;
        var cd = d.timestamps ? d : parseYahooChart(d);
        if (!cd || !cd.closes) return;
        var closes = cd.closes.filter(function(v) { return v != null; });
        if (closes.length < 2) return;
        var up = closes[closes.length - 1] >= closes[0];
        var el = document.querySelector('[data-cmd-spark="' + c.symbol + '"]');
        if (el) el.innerHTML = miniSpark(closes, up);
      }).catch(function() {});
    });
  }

  // ─── CRYPTO ───
  var CRYPTO_ICONS = { BTC:'₿', ETH:'Ξ', XRP:'✕', BNB:'◆', SOL:'◎', ADA:'₳', DOGE:'Ð', TRX:'◈', AVAX:'▲', LINK:'⬡' };

  function fillCrypto(data) {
    var grid = document.querySelector('[data-crypto-grid]');
    if (!grid || !data || data.length === 0) return;
    var html = '';
    var limit = Math.min(data.length, 10);
    for (var i = 0; i < limit; i++) {
      var c = data[i];
      var chg = c.change || 0;
      var cls = chg >= 0 ? 'rc-up' : 'rc-down';
      var arrow = chg >= 0 ? '▲' : '▼';
      var icon = CRYPTO_ICONS[c.symbol] || '●';
      var yahooSym = c.symbol + '-USD';
      var iconHtml = c.image
        ? '<img src="' + c.image + '" alt="' + c.symbol + '" width="24" height="24" style="border-radius:50%" loading="lazy" onerror="this.outerHTML=\'<span>' + icon + '</span>\'">'
        : '<span>' + icon + '</span>';
      html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(yahooSym) + '" class="mkt-asset-card mkt-asset-card--crypto">';
      html += '<div class="mkt-asset-icon mkt-asset-icon--crypto">' + iconHtml + '</div>';
      html += '<div class="mkt-asset-body">';
      html += '<span class="mkt-asset-name">' + c.symbol + '</span>';
      html += '<span class="mkt-asset-sym">' + (c.name || c.symbol) + '</span>';
      html += '</div>';
      var sparkHtml = c.sparkline ? miniSpark(c.sparkline, chg >= 0) : '';
      if (sparkHtml) html += '<div class="mkt-asset-spark">' + sparkHtml + '</div>';
      html += '<div class="mkt-asset-right">';
      html += '<span class="mkt-asset-price">$' + formatUSD(c.price) + '</span>';
      html += '<span class="mkt-asset-chg ' + cls + '">' + arrow + ' ' + Math.abs(chg).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
      html += '</div>';
      html += '</a>';
    }
    grid.innerHTML = html;
    grid.closest('.mkt-section').classList.add('mkt-section-loaded');
  }

  // ─── MARKET BREADTH ───
  function fillBreadth(stocks) {
    var up = 0, down = 0, unch = 0;
    for (var i = 0; i < stocks.length; i++) {
      var c = stocks[i].change || 0;
      if (c > 0) up++; else if (c < 0) down++; else unch++;
    }
    var total = up + down + unch;
    if (total === 0) return;
    setEl('[data-breadth-up]', '▲ ' + up);
    setEl('[data-breadth-down]', '▼ ' + down);
    var upPct = Math.round(up / total * 100);
    var downPct = Math.round(down / total * 100);
    setEl('[data-breadth-pct]', upPct + '% / ' + downPct + '%');
    var barUp = document.querySelector('[data-breadth-bar-up]');
    var barUnch = document.querySelector('[data-breadth-bar-unch]');
    var barDown = document.querySelector('[data-breadth-bar-down]');
    if (barUp) barUp.style.width = (up / total * 100).toFixed(1) + '%';
    if (barUnch) barUnch.style.width = (unch / total * 100).toFixed(1) + '%';
    if (barDown) barDown.style.width = (down / total * 100).toFixed(1) + '%';
    var el = document.querySelector('[data-mkt-breadth]');
    if (el) el.style.display = '';
  }

  // ─── SECTOR HEATMAP ───
  var STOCK_SECTORS = {
    YPFD:'Energy',PAMP:'Energy',CEPU:'Energy',TGSU2:'Energy',TGNO4:'Energy',EDN:'Energy',METR:'Energy',CAPX:'Energy',
    GGAL:'Finance',BMA:'Finance',BBAR:'Finance',SUPV:'Finance',BYMA:'Finance',VALO:'Finance',BHIP:'Finance',BPAT:'Finance',IRSA:'Finance',
    TECO2:'Telecom',CVH:'Telecom',
    TXAR:'Materials',ALUA:'Materials',LOMA:'Materials',HARG:'Materials',
    CRES:'Agriculture',AGRO:'Agriculture',MOLI:'Agriculture',SEMI:'Agriculture',LEDE:'Agriculture',
    MIRG:'Industry',TRAN:'Industry',BOLT:'Industry',
    COME:'Holding',GCLA:'Media'
  };
  var SECTOR_COLORS = {
    'Energy':'#f59e0b','Finance':'#3b82f6','Telecom':'#8b5cf6',
    'Materials':'#ef4444','Agriculture':'#22c55e','Industry':'#06b6d4',
    'Holding':'#ec4899','Media':'#a855f7'
  };

  function fillSectorHeatmap(stocks) {
    var sectorMap = {};
    for (var i = 0; i < stocks.length; i++) {
      var sym = (stocks[i].symbol || '').replace('.BA', '');
      var sec = STOCK_SECTORS[sym] || 'Other';
      if (sec === 'Other') continue;
      if (!sectorMap[sec]) sectorMap[sec] = { totalChg: 0, count: 0, stocks: [] };
      var chg = (stocks[i].change || 0) * 100;
      sectorMap[sec].totalChg += chg;
      sectorMap[sec].count++;
      sectorMap[sec].stocks.push({ symbol: sym, change: chg });
    }
    var sectors = [];
    for (var s in sectorMap) {
      if (sectorMap[s].count > 0) {
        sectors.push({ name: s, avgChg: sectorMap[s].totalChg / sectorMap[s].count, count: sectorMap[s].count, stocks: sectorMap[s].stocks });
      }
    }
    if (sectors.length < 2) return;
    sectors.sort(function(a, b) { return b.avgChg - a.avgChg; });

    var grid = document.querySelector('[data-mkt-heatmap]');
    if (!grid) return;
    var html = '';
    for (var j = 0; j < sectors.length; j++) {
      var sec = sectors[j];
      var chg = sec.avgChg;
      var cls = chg >= 0 ? 'rc-up' : 'rc-down';
      var bgColor = chg >= 0
        ? 'rgba(22,163,74,' + Math.min(0.08 + Math.abs(chg) * 0.04, 0.35) + ')'
        : 'rgba(220,38,38,' + Math.min(0.08 + Math.abs(chg) * 0.04, 0.35) + ')';
      var sColor = SECTOR_COLORS[sec.name] || '#9ca3af';
      var arrow = chg >= 0 ? '▲' : '▼';
      var chgFmt = Math.abs(chg).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2});
      html += '<div class="mkt-hm-cell" style="background:' + bgColor + ';border-color:' + sColor + '" aria-label="' + (sectorNames[sec.name] || sec.name) + ' ' + (chg >= 0 ? '+' : '\u2212') + chgFmt + '%">';
      var displayName = sectorNames[sec.name] || sec.name;
      html += '<div class="mkt-hm-top"><span class="mkt-hm-dot" style="background:' + sColor + '"></span><span class="mkt-hm-name">' + displayName + '</span></div>';
      html += '<span class="mkt-hm-chg ' + cls + '">' + arrow + ' ' + Math.abs(chg).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
      html += '<span class="mkt-hm-count">' + (sec.count === 1 ? oneStockLabel : nStocksLabel.replace('{n}', sec.count)) + '</span>';
      html += '</div>';
    }
    grid.innerHTML = html;
    document.querySelector('[data-mkt-sectors]').style.display = '';
  }

  // ─── MARKET PULSE ───
  function fillPulse(stocks) {
    var up = 0, down = 0, totalVol = 0, chgSum = 0, chgCount = 0;
    for (var i = 0; i < stocks.length; i++) {
      var c = stocks[i].change || 0;
      totalVol += stocks[i].volume || 0;
      if (c > 0) up++;
      else if (c < 0) down++;
      if (stocks[i].change != null) { chgSum += c * 100; chgCount++; }
    }
    var total = up + down + (stocks.length - up - down);
    // Score: 0 (extreme fear) to 100 (extreme greed)
    var score = total > 0 ? Math.round((up / total) * 100) : 50;
    var avgChg = chgCount > 0 ? chgSum / chgCount : 0;

    setEl('[data-pulse-up]', up.toString());
    setEl('[data-pulse-down]', down.toString());
    setEl('[data-pulse-vol]', totalVol > 0 ? fmtVol(totalVol) : '—');
    var avgEl = document.querySelector('[data-pulse-avgchg]');
    if (avgEl) {
      var oldAvgPulse = avgEl.textContent;
      var newAvgPulse = (avgChg >= 0 ? '+' : '') + avgChg.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
      avgEl.textContent = newAvgPulse;
      avgEl.className = 'mkt-pulse-sv ' + (avgChg >= 0 ? 'rc-up' : 'rc-down');
      flashEl(avgEl, newAvgPulse, oldAvgPulse);
    }

    // Gauge
    var label = score >= 60 ? (hub.getAttribute('data-i18n-greed') || 'Greed') : score <= 40 ? (hub.getAttribute('data-i18n-fear') || 'Fear') : (hub.getAttribute('data-i18n-neutral') || 'Neutral');
    var color = score >= 60 ? '#16a34a' : score <= 40 ? '#dc2626' : '#facc15';
    setEl('[data-pulse-score]', score + '/100');
    setEl('[data-pulse-label]', label);
    var labelEl = document.querySelector('[data-pulse-label]');
    if (labelEl) labelEl.style.color = color;
    var arcEl = document.querySelector('[data-pulse-arc]');
    if (arcEl) {
      var deg = (score / 100) * 180;
      arcEl.style.background = 'conic-gradient(from 180deg, #dc2626 0deg, #facc15 90deg, #16a34a 180deg, transparent 180deg)';
      arcEl.style.setProperty('--pulse-deg', deg + 'deg');
    }

    // Volume leaders
    var byVol = stocks.slice().sort(function(a, b) { return (b.volume || 0) - (a.volume || 0); }).slice(0, 5);
    var volList = document.querySelector('[data-pulse-vol-list]');
    if (volList) {
      var html = '';
      for (var j = 0; j < byVol.length; j++) {
        var s = byVol[j];
        var sym = (s.symbol || '').replace('.BA', '');
        var pct = (s.change || 0) * 100;
        var cls = pct >= 0 ? 'rc-up' : 'rc-down';
        var arrow = pct >= 0 ? '▲' : '▼';
        html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(sym) + '" class="mkt-pvol-row">';
        html += '<span class="mkt-pvol-sym">' + sym + '</span>';
        html += '<span class="mkt-pvol-vol">' + (s.volume ? fmtVol(s.volume) : '—') + '</span>';
        html += '<span class="mkt-pvol-chg ' + cls + '">' + arrow + ' ' + Math.abs(pct).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
        html += '</a>';
      }
      volList.innerHTML = html;
    }

    var pulse = document.querySelector('[data-mkt-pulse]');
    if (pulse) pulse.style.display = '';
  }

  // ─── FETCH ALL ───
  function fetchJson(url) { return fetch(url).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }); }

  function postBYMA(url) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(function(r) { return r.json(); }).catch(function() { return null; });
  }

  function parseYahooChart(json) {
    var result = json && json.chart && json.chart.result && json.chart.result[0];
    if (!result || !result.timestamp) return null;
    var q = result.indicators && result.indicators.quote && result.indicators.quote[0];
    return { timestamps: result.timestamp, closes: q ? q.close : [] };
  }

  function parseEvo(entries) {
    if (!entries || entries.length === 0) return {};
    var bySource = {};
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var key = e.source.toLowerCase();
      if (!bySource[key]) bySource[key] = [];
      bySource[key].push(e);
    }
    var result = {};
    ['oficial', 'blue'].forEach(function(src) {
      var arr = bySource[src];
      if (arr && arr.length > 1) {
        arr.sort(function(a, b) { return a.date < b.date ? 1 : -1; });
        result[src] = { prev: arr[1].value_sell };
      }
    });
    return result;
  }

  // Load merval: try API proxy, then BYMA direct
  function loadMerval() {
    return fetchJson('/api/merval').then(function(d) {
      if (d && d.price) return d;
      return postBYMA('https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/index-price')
        .then(function(bd) {
          var arr = (bd && bd.data) || bd || [];
          if (!Array.isArray(arr)) return null;
          var m = null;
          for (var i = 0; i < arr.length; i++) { if (arr[i].symbol === 'M') { m = arr[i]; break; } }
          if (!m) return null;
          return { price: m.price || m.closingPrice, high: m.highValue || m.high, low: m.minValue || m.low, previousClose: m.previousClosingPrice, variation: m.variation, volume: m.volume || m.tradeVolume };
        });
    }).catch(function() { return null; });
  }

  // Load stocks: try screener API, then BYMA direct
  function loadStocks() {
    return fetchJson('/api/screener').then(function(d) {
      if (d && Array.isArray(d) && d.length > 0) return d;
      return postBYMA('https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/leading-equity')
        .then(function(bd) {
          var arr = (bd && bd.data) || bd || [];
          if (!Array.isArray(arr) || arr.length === 0) return null;
          var seen = {};
          return arr.filter(function(s) {
            var sym = (s.symbol || '').replace('.BA', '');
            if (!sym || seen[sym]) return false;
            seen[sym] = true;
            return true;
          }).map(function(s) {
            var sym = (s.symbol || '').replace('.BA', '');
            return { symbol: sym, name: STOCK_NAMES[sym] || s.description || sym, price: s.trade || s.price, change: s.imbalance != null ? s.imbalance : (s.variation != null ? s.variation / 100 : null) };
          });
        });
    }).catch(function() { return null; });
  }

  // Commodity currency toggle
  (function() {
    var toggle = document.querySelector('[data-cmd-currency-toggle]');
    if (!toggle) return;
    toggle.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-cmd-curr]');
      if (!btn) return;
      var curr = btn.getAttribute('data-cmd-curr');
      if (curr === _cmdCurr) return;
      _cmdCurr = curr;
      toggle.querySelectorAll('.mkt-curr-btn').forEach(function(b) {
        b.classList.toggle('mkt-curr-btn--active', b.getAttribute('data-cmd-curr') === curr);
      });
      if (_cmdData) renderCommodities();
    });
  })();

  Promise.all([
    fetchJson('/api/rates'),
    fetchJson('https://api.bluelytics.com.ar/v2/latest'),
    fetchJson('https://api.bluelytics.com.ar/v2/evolution.json?days=10'),
    loadMerval(),
    fetchJson('/api/stock/%5EMERV?range=1mo&interval=1d'),
    loadStocks(),
    fetchJson('/api/commodities'),
    fetchJson('/api/crypto?limit=10')
  ]).then(function(res) {
    var apiRates = res[0];
    var latest = res[1];
    var evo = parseEvo(res[2]);
    var merval = res[3];
    var chart = res[4];
    var stocks = res[5];
    var commodities = res[6];
    var crypto = res[7];

    var hubUpdEl = document.querySelector('[data-mkt-updated]');
    if (hubUpdEl) hubUpdEl.innerHTML = '<span class="live-dot"></span>' + (hub.getAttribute('data-i18n-updated') || 'Updated') + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

    // FX rates
    if (latest && latest.blue && latest.blue.value_sell) {
      _blueRate = latest.blue.value_sell;
    }
    if (latest && latest.oficial) {
      fillFxCard('oficial', latest.oficial, evo);
      fillFxCard('blue', latest.blue, evo);
    } else {
      var fxGrid = document.querySelector('.mkt-fx-grid');
      if (fxGrid) fxGrid.innerHTML = MktStates.buildErrorCard({ message: i18nError, hint: i18nCheckConn, retryLabel: i18nRetry, compact: true });
    }
    if (apiRates) {
      if (apiRates.mep) fillFxCard('mep', apiRates.mep, evo);
      if (apiRates.ccl) fillFxCard('ccl', apiRates.ccl, evo);
    }

    // Merval
    if (!merval || !merval.price) {
      var idxCard = document.querySelector('.mkt-idx-card');
      if (idxCard) idxCard.innerHTML = MktStates.buildErrorCard({ message: i18nError, hint: i18nCheckConn, retryLabel: i18nRetry, compact: true });
    }
    fillMerval(merval);

    // Chart
    if (chart) {
      var cd = chart.timestamps ? chart : parseYahooChart(chart);
      if (cd) fillChart(cd);
    }

    // Top movers + breadth + pulse
    if (stocks && Array.isArray(stocks) && stocks.length > 0) {
      fillMovers(stocks);
      fillBreadth(stocks);
      fillSectorHeatmap(stocks);
      fillPulse(stocks);
    }

    // Commodities
    if (commodities && Array.isArray(commodities) && commodities.length > 0) {
      fillCommodities(commodities);
    } else {
      var cmdGrid = document.querySelector('[data-commodities-grid]');
      if (cmdGrid) cmdGrid.innerHTML = MktStates.buildErrorCard({ message: i18nError, hint: i18nCheckConn, retryLabel: i18nRetry, compact: true });
    }

    // Crypto
    if (crypto && Array.isArray(crypto) && crypto.length > 0) {
      fillCrypto(crypto);
    } else {
      var cGrid = document.querySelector('[data-crypto-grid]');
      if (cGrid) cGrid.innerHTML = MktStates.buildErrorCard({ message: i18nError, hint: i18nCheckConn, retryLabel: i18nRetry, compact: true });
    }

    // ─── AT-A-GLANCE SUMMARY ───
    var glanceEl = document.querySelector('[data-mkt-glance]');
    if (glanceEl) {
      var hasData = false;
      if (latest && latest.blue) {
        var gBlue = document.querySelector('[data-glance-blue]');
        if (gBlue) { var oldBlue = gBlue.textContent; gBlue.textContent = 'ARS ' + fmt(latest.blue.value_sell); gBlue.className = 'mkt-glance-val'; flashEl(gBlue, gBlue.textContent, oldBlue); hasData = true; }
      }
      if (merval && merval.price) {
        var gMerval = document.querySelector('[data-glance-merval]');
        if (gMerval) {
          var mPct2 = merval.variation != null ? merval.variation * 100 : null;
          var mText = fmtM(merval.price);
          if (mPct2 != null) mText += ' ' + (mPct2 >= 0 ? '▲' : '▼') + Math.abs(mPct2).toFixed(1) + '%';
          var oldMerval = gMerval.textContent;
          gMerval.textContent = mText;
          gMerval.className = 'mkt-glance-val ' + (mPct2 >= 0 ? 'rc-up' : 'rc-down');
          flashEl(gMerval, mText, oldMerval);
          hasData = true;
        }
      }
      if (crypto && crypto.length > 0) {
        var btc = crypto.find(function(c) { return c.symbol === 'BTC'; });
        if (btc) {
          var gBtc = document.querySelector('[data-glance-btc]');
          if (gBtc) {
            var btcChg = btc.change || 0;
            var oldBtc = gBtc.textContent;
            var newBtc = '$' + formatUSD(btc.price) + ' ' + (btcChg >= 0 ? '▲' : '▼') + Math.abs(btcChg).toFixed(1) + '%';
            gBtc.textContent = newBtc;
            gBtc.className = 'mkt-glance-val ' + (btcChg >= 0 ? 'rc-up' : 'rc-down');
            flashEl(gBtc, newBtc, oldBtc);
            hasData = true;
          }
        }
      }
      if (commodities && commodities.length > 0) {
        var gold = commodities.find(function(c) { return c.symbol === 'GC=F'; });
        if (gold) {
          var gGold = document.querySelector('[data-glance-gold]');
          if (gGold) {
            var gChg = gold.change || 0;
            var oldGold = gGold.textContent;
            var newGold = '$' + formatUSD(gold.price) + ' ' + (gChg >= 0 ? '▲' : '▼') + Math.abs(gChg).toFixed(1) + '%';
            gGold.textContent = newGold;
            gGold.className = 'mkt-glance-val ' + (gChg >= 0 ? 'rc-up' : 'rc-down');
            flashEl(gGold, newGold, oldGold);
            hasData = true;
          }
        }
      }
      if (hasData) glanceEl.style.display = '';
    }

    // ─── FX SPARKLINES from evolution data ───
    var rawEvo = res[2];
    if (rawEvo && rawEvo.length > 0) {
      var evoBySource = {};
      for (var ei = 0; ei < rawEvo.length; ei++) {
        var eKey = rawEvo[ei].source.toLowerCase();
        if (!evoBySource[eKey]) evoBySource[eKey] = [];
        evoBySource[eKey].push(rawEvo[ei]);
      }
      ['oficial', 'blue'].forEach(function(src) {
        var arr = evoBySource[src];
        if (!arr || arr.length < 3) return;
        arr.sort(function(a, b) { return a.date < b.date ? -1 : 1; });
        var vals = arr.map(function(e) { return e.value_sell; }).filter(function(v) { return v > 0; });
        if (vals.length < 3) return;
        var sparkEl = document.querySelector('[data-fx-spark="' + src + '"]');
        if (sparkEl) {
          var isUp = vals[vals.length - 1] >= vals[0];
          sparkEl.innerHTML = miniSparkSVG(vals, isUp, 48, 18);
        }
      });
    }
  }).catch(function() {
    setEl('[data-mkt-updated]', '—');
    var fxGrid = document.querySelector('.mkt-fx-grid');
    if (fxGrid) fxGrid.innerHTML = MktStates.buildErrorCard({ message: i18nError, hint: i18nCheckConn, retryLabel: i18nRetry, compact: true });
    var cmdGrid = document.querySelector('[data-commodities-grid]');
    if (cmdGrid) cmdGrid.innerHTML = MktStates.buildErrorCard({ message: i18nError, hint: i18nCheckConn, retryLabel: i18nRetry, compact: true });
    var cGrid = document.querySelector('[data-crypto-grid]');
    if (cGrid) cGrid.innerHTML = MktStates.buildErrorCard({ message: i18nError, hint: i18nCheckConn, retryLabel: i18nRetry, compact: true });
  });

  // ─── GLOBAL INDICES (separate load) ───
  var INDICES = [
    { symbol: '%5EGSPC', name: 'S&P 500', flag: '🇺🇸', region: 'americas', exchange: 'NYSE' },
    { symbol: '%5EDJI', name: 'Dow Jones', flag: '🇺🇸', region: 'americas', exchange: 'NYSE' },
    { symbol: '%5EIXIC', name: 'NASDAQ', flag: '🇺🇸', region: 'americas', exchange: 'NASDAQ' },
    { symbol: '%5EFTSE', name: 'FTSE 100', flag: '🇬🇧', region: 'europe', exchange: 'LSE' },
    { symbol: '%5EGDAXI', name: 'DAX', flag: '🇩🇪', region: 'europe', exchange: 'XETRA' },
    { symbol: '%5EN225', name: 'Nikkei 225', flag: '🇯🇵', region: 'asia', exchange: 'TSE' },
    { symbol: '%5EHSI', name: 'Hang Seng', flag: '🇭🇰', region: 'asia', exchange: 'HKEX' },
    { symbol: '%5EAXJO', name: 'ASX 200', flag: '🇦🇺', region: 'asia', exchange: 'ASX' }
  ];

  // Market hours by exchange (local time in minutes from midnight)
  var EXCHANGE_HOURS = {
    NYSE:   { tz: -4, open: 9*60+30, close: 16*60 },
    NASDAQ: { tz: -4, open: 9*60+30, close: 16*60 },
    LSE:    { tz: 1, open: 8*60, close: 16*60+30 },
    XETRA:  { tz: 2, open: 9*60, close: 17*60+30 },
    TSE:    { tz: 9, open: 9*60, close: 15*60 },
    HKEX:   { tz: 8, open: 9*60+30, close: 16*60 },
    ASX:    { tz: 10, open: 10*60, close: 16*60 }
  };

  function isMarketOpen(exchange) {
    var hours = EXCHANGE_HOURS[exchange];
    if (!hours) return false;
    var now = new Date();
    var day = now.getUTCDay();
    if (day === 0 || day === 6) return false;
    var utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    var localMin = utcMin + hours.tz * 60;
    if (localMin < 0) localMin += 1440;
    if (localMin >= 1440) localMin -= 1440;
    return localMin >= hours.open && localMin < hours.close;
  }

  function loadIndex(idx) {
    return fetchJson('/api/stock/' + idx.symbol + '?range=5d&interval=1d').then(function(d) {
      if (!d) return null;
      var data = d.timestamps ? d : parseYahooChart(d);
      if (!data || !data.closes || data.closes.length < 2) return null;
      var closes = data.closes.filter(function(v) { return v != null; });
      if (closes.length < 2) return null;
      var last = closes[closes.length - 1];
      var prev = closes[closes.length - 2];
      var chg = prev > 0 ? ((last - prev) / prev) * 100 : 0;
      return { name: idx.name, flag: idx.flag, symbol: idx.symbol, price: last, change: chg, closes: closes, region: idx.region, exchange: idx.exchange };
    }).catch(function() { return null; });
  }

  function miniSpark(closes, up) {
    if (!closes || closes.length < 2) return '';
    var w = 60, h = 24;
    var min = Math.min.apply(null, closes);
    var max = Math.max.apply(null, closes);
    var range = max - min || 1;
    var pts = [];
    for (var i = 0; i < closes.length; i++) {
      var x = (i / (closes.length - 1)) * w;
      var y = h - ((closes[i] - min) / range) * (h - 2) - 1;
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    var color = up ? 'var(--color-positive, #16a34a)' : 'var(--color-negative, #dc2626)';
    // Build gradient fill
    var fillPts = '0,' + h + ' ' + pts.join(' ') + ' ' + w + ',' + h;
    var gradId = 'sg' + Math.random().toString(36).substr(2, 5);
    return '<svg class="mkt-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<defs><linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + (up ? '#16a34a' : '#dc2626') + '" stop-opacity="0.2"/>' +
      '<stop offset="100%" stop-color="' + (up ? '#16a34a' : '#dc2626') + '" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<polygon points="' + fillPts + '" fill="url(#' + gradId + ')"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + (up ? '#16a34a' : '#dc2626') + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  Promise.all(INDICES.map(loadIndex)).then(function(results) {
    var valid = results.filter(function(r) { return r != null; });
    if (valid.length === 0) return;
    var grid = document.querySelector('[data-indices-grid]');
    var section = document.querySelector('[data-indices-section]');
    if (!grid || !section) return;

    // Get i18n region names
    var regionLabels = {
      americas: section.getAttribute('data-i18n-region-americas') || 'Americas',
      europe: section.getAttribute('data-i18n-region-europe') || 'Europe',
      asia: section.getAttribute('data-i18n-region-asia') || 'Asia'
    };

    // Group by region
    var regionOrder = ['americas', 'europe', 'asia'];
    var grouped = {};
    for (var i = 0; i < valid.length; i++) {
      var r = valid[i];
      if (!grouped[r.region]) grouped[r.region] = [];
      grouped[r.region].push(r);
    }

    var html = '';
    for (var ri = 0; ri < regionOrder.length; ri++) {
      var region = regionOrder[ri];
      var items = grouped[region];
      if (!items || items.length === 0) continue;

      html += '<div class="mkt-idx-region">';
      html += '<h3 class="mkt-idx-region-label">' + regionLabels[region] + '</h3>';
      html += '<div class="mkt-idx-region-cards">';

      for (var j = 0; j < items.length; j++) {
        var r = items[j];
        var isUp = r.change >= 0;
        var cls = isUp ? 'rc-up' : 'rc-down';
        var borderCls = isUp ? 'mkt-idx-mini--positive' : 'mkt-idx-mini--negative';
        var arrow = isUp ? '&#9650;' : '&#9660;';
        var open = isMarketOpen(r.exchange);
        var idxLink = '/' + lang + '/markets/stock/' + encodeURIComponent(r.symbol);

        html += '<a href="' + idxLink + '" class="mkt-idx-mini ' + borderCls + '">';
        html += '<div class="mkt-idx-mini-top">';
        html += '<span class="mkt-idx-mini-flag">' + r.flag + '</span>';
        html += '<span class="mkt-idx-mini-name">' + r.name + '</span>';
        if (open) html += '<span class="mkt-idx-mini-pulse" title="Market open"></span>';
        html += '</div>';
        html += '<div class="mkt-idx-mini-mid">';
        html += '<span class="mkt-idx-mini-price">' + formatUSD(r.price) + '</span>';
        html += '</div>';
        html += '<div class="mkt-idx-mini-spark">' + miniSpark(r.closes, isUp) + '</div>';
        html += '<span class="mkt-idx-mini-chg ' + cls + '">' + arrow + ' ' + Math.abs(r.change).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
        html += '</a>';
      }

      html += '</div></div>';
    }

    grid.innerHTML = html;
    section.style.display = '';
  });
  // Arrow key navigation for heatmap cells
  document.addEventListener('keydown', function(e) {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    var active = document.activeElement;
    if (!active || !active.classList.contains('mkt-hm-cell')) return;
    var cells = Array.from(document.querySelectorAll('.mkt-hm-cell'));
    var idx = cells.indexOf(active);
    if (idx < 0) return;
    var container = active.parentElement;
    var cols = Math.max(1, Math.round(container.offsetWidth / active.offsetWidth));
    var next = -1;
    if (e.key === 'ArrowRight') next = idx + 1;
    else if (e.key === 'ArrowLeft') next = idx - 1;
    else if (e.key === 'ArrowDown') next = idx + cols;
    else if (e.key === 'ArrowUp') next = idx - cols;
    if (next >= 0 && next < cells.length) {
      e.preventDefault();
      cells[next].focus();
    }
  });

  // Scroll to top button
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

  // Refresh is handled by the progress bar animation above
})();
