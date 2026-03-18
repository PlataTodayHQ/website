(function() {
  var C = window.PlataCharts || {};
  var page = document.querySelector('[data-screener-page]');
  var lang = page.getAttribute('data-lang') || 'en';
  var fmt = C.fmt || function(n) { return Math.round(n).toLocaleString(lang); };
  var fmtM = C.fmtM || function(v) { return v >= 1e9 ? (v/1e9).toLocaleString(lang, {maximumFractionDigits:1})+'B' : v >= 1e6 ? (v/1e6).toLocaleString(lang, {maximumFractionDigits:1})+'M' : Math.round(v).toLocaleString(lang); };
  var fmtVol = C.fmtVol || function(v) { return v >= 1e9 ? (v/1e9).toLocaleString(lang, {maximumFractionDigits:1})+'B' : v >= 1e6 ? (v/1e6).toLocaleString(lang, {maximumFractionDigits:1})+'M' : v >= 1e3 ? (v/1e3).toLocaleString(lang, {maximumFractionDigits:1})+'K' : Math.round(v).toLocaleString(lang); };

  // Platform-aware kbd labels
  if (!/Mac|iPhone|iPad/.test(navigator.platform || '')) {
    document.querySelectorAll('.search-kbd').forEach(function(el) { el.textContent = 'Ctrl K'; });
  }
  if ('ontouchstart' in window) {
    document.querySelectorAll('.search-kbd').forEach(function(el) { el.style.display = 'none'; });
  }

  var allStocks = [];
  var liderSymbols = {};
  var currentPanel = 'all';
  var urlParams = new URLSearchParams(window.location.search);
  var urlSector = urlParams.get('sector') || '';
  var urlSearch = urlParams.get('q') || '';
  var currentSector = urlSector;
  var currentSort = { key: 'marketCap', dir: 'desc' };
  var searchTerm = urlSearch;
  var currentView = 'table';
  var secMap = {};
  try { secMap = JSON.parse(page.getAttribute('data-i18n-secmap') || '{}'); } catch(e) {}
  function tSec(s) { return secMap[s] || s; }
  var i18nCap = page.getAttribute('data-i18n-cap') || 'Cap';
  var i18nVol = page.getAttribute('data-i18n-vol') || 'Vol';
  var i18nWatchlist = page.getAttribute('data-i18n-watchlist') || 'Watchlist';
  var i18nAddedToWatchlist = page.getAttribute('data-i18n-added-to-watchlist') || 'Added to watchlist';
  var i18nRemovedFromWatchlist = page.getAttribute('data-i18n-removed-from-watchlist') || 'Removed from watchlist';

  // ─── Watchlist ───
  var WL_KEY = 'plata-watchlist';
  function getWatchlist() {
    try { return JSON.parse(localStorage.getItem(WL_KEY) || '[]'); } catch(e) { return []; }
  }
  function saveWatchlist(list) {
    try { localStorage.setItem(WL_KEY, JSON.stringify(list)); } catch(e) {}
  }
  function isInWatchlist(sym) {
    return getWatchlist().indexOf(sym) !== -1;
  }
  function toggleWatchlist(sym) {
    var list = getWatchlist();
    var idx = list.indexOf(sym);
    var added;
    if (idx !== -1) { list.splice(idx, 1); added = false; }
    else { list.push(sym); added = true; }
    saveWatchlist(list);
    showWlToast(added ? i18nAddedToWatchlist : i18nRemovedFromWatchlist);
    return added;
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

  // Set watchlist tab label from i18n
  var wlTabLabel = document.querySelector('[data-wl-tab-label]');
  if (wlTabLabel) wlTabLabel.textContent = i18nWatchlist;

  // ─── Stock logos ───
  var STOCK_LOGOS = {
    YPFD: 'https://logo.clearbit.com/ypf.com',
    GGAL: 'https://logo.clearbit.com/galiciamas.com.ar',
    BMA: 'https://logo.clearbit.com/macro.com.ar',
    BBAR: 'https://logo.clearbit.com/bbva.com.ar',
    PAMP: 'https://logo.clearbit.com/pampaenergia.com',
    TECO2: 'https://logo.clearbit.com/telecom.com.ar',
    CEPU: 'https://logo.clearbit.com/centralpuerto.com',
    TXAR: 'https://logo.clearbit.com/ternium.com',
    TGSU2: 'https://logo.clearbit.com/tgs.com.ar',
    LOMA: 'https://logo.clearbit.com/lomanegra.com',
    SUPV: 'https://logo.clearbit.com/supervielle.com.ar',
    ALUA: 'https://logo.clearbit.com/aluar.com.ar',
    TRAN: 'https://logo.clearbit.com/transener.com.ar',
    EDN: 'https://logo.clearbit.com/edenor.com.ar',
    CRES: 'https://logo.clearbit.com/cresud.com.ar',
    BYMA: 'https://logo.clearbit.com/byma.com.ar',
    IRSA: 'https://logo.clearbit.com/irsa.com.ar',
    MIRG: 'https://logo.clearbit.com/mirgor.com.ar',
    METR: 'https://logo.clearbit.com/metrogas.com.ar',
    BHIP: 'https://logo.clearbit.com/hipotecario.com.ar',
    BPAT: 'https://logo.clearbit.com/bancopatagonia.com.ar',
    COME: 'https://logo.clearbit.com/comercialdelplata.com.ar',
    VALO: 'https://logo.clearbit.com/grupovalores.com',
    HARG: 'https://logo.clearbit.com/holcim.com.ar',
    CVH: 'https://logo.clearbit.com/cablevisionholding.com.ar',
    GCLA: 'https://logo.clearbit.com/clarin.com',
    TGNO4: 'https://logo.clearbit.com/tgn.com.ar'
  };

  var AVATAR_COLORS = [
    '#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981',
    '#06b6d4','#6366f1','#ef4444','#14b8a6','#f97316',
    '#84cc16','#a855f7','#0ea5e9','#e11d48','#22c55e'
  ];

  function avatarColor(sym) {
    var h = 0;
    for (var i = 0; i < sym.length; i++) h = ((h << 5) - h + sym.charCodeAt(i)) | 0;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }

  function logoCell(sym) {
    var url = STOCK_LOGOS[sym];
    var color = avatarColor(sym);
    var initials = sym.substring(0, 2);
    if (url) {
      return '<div class="scr-logo" style="background:' + color + '22" data-stk-logo="' + sym + '" data-color="' + color + '">' +
        '<img src="' + url + '?size=64&format=png" alt="' + sym + ' logo" loading="lazy" width="32" height="32">' +
        '</div>';
    }
    return '<div class="scr-logo scr-logo--fallback" style="background:' + color + '22;color:' + color + '">' + initials + '</div>';
  }

  // Logo error fallback
  document.addEventListener('error', function(e) {
    if (e.target.tagName !== 'IMG') return;
    var logoDiv = e.target.closest('[data-stk-logo]');
    if (!logoDiv) return;
    var sym = logoDiv.getAttribute('data-stk-logo');
    var color = logoDiv.getAttribute('data-color');
    logoDiv.classList.add('scr-logo--fallback');
    logoDiv.style.color = color;
    logoDiv.innerHTML = sym.substring(0, 2);
  }, true);

  // ─── Helpers ───
  function setEl(sel, text) {
    var el = document.querySelector(sel);
    if (el) el.textContent = text;
  }

  function pctHtml(val) {
    if (val == null) return '<span class="scr-dim">—</span>';
    var pct = val * 100;
    var cls = pct >= 0 ? 'rc-up' : 'rc-down';
    var arrow = pct >= 0 ? '▲' : '▼';
    return '<span class="scr-pct ' + cls + '">' + arrow + ' ' + Math.abs(pct).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
  }

  function numHtml(val, formatter) {
    if (val == null) return '<span class="scr-dim">—</span>';
    return (formatter || fmt)(val);
  }

  function hlText(text, q) {
    if (!q || !text) return text || '';
    var esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp('(' + esc + ')', 'gi'), '<mark class="scr-hl">$1</mark>');
  }

  function range52Html(s) {
    if (s.fifty_two_week_low == null || s.fifty_two_week_high == null || s.price == null) {
      return '<span class="scr-dim">—</span>';
    }
    var lo = s.fifty_two_week_low;
    var hi = s.fifty_two_week_high;
    var cur = s.price;
    var pct = hi > lo ? ((cur - lo) / (hi - lo)) * 100 : 50;
    pct = Math.max(0, Math.min(100, pct));
    return '<div class="scr-range">' +
      '<span class="scr-range-lo">' + fmt(lo) + '</span>' +
      '<div class="scr-range-bar">' +
        '<div class="scr-range-fill" style="width:' + pct + '%"></div>' +
        '<div class="scr-range-dot" style="inset-inline-start:' + pct + '%"></div>' +
      '</div>' +
      '<span class="scr-range-hi">' + fmt(hi) + '</span>' +
    '</div>';
  }

  // ─── Normalize data ───
  function normalize(raw) {
    return raw.map(function(s) {
      return {
        symbol: s.symbol,
        name: s.name || s.symbol,
        sector: s.sector || null,
        industry: s.industry || null,
        price: s.price,
        change: s.change,
        volume: s.volume || 0,
        marketCap: s.market_cap,
        pe: s.trailing_pe,
        forwardPe: s.forward_pe,
        eps: s.eps,
        dividendYield: s.dividend_yield,
        beta: s.beta,
        fiftyTwoWeekHigh: s.fifty_two_week_high,
        fiftyTwoWeekLow: s.fifty_two_week_low,
        fifty_two_week_high: s.fifty_two_week_high,
        fifty_two_week_low: s.fifty_two_week_low,
        recommendation: s.recommendation_key
      };
    });
  }

  // ─── Sort & Filter ───
  function getFiltered() {
    var q = searchTerm.toLowerCase();
    var filtered = allStocks;
    // Panel filter
    if (currentPanel === 'lider') {
      filtered = filtered.filter(function(s) { return s._panel === 'lider'; });
    } else if (currentPanel === 'general') {
      filtered = filtered.filter(function(s) { return s._panel === 'general'; });
    } else if (currentPanel === 'watchlist') {
      var wl = getWatchlist();
      filtered = filtered.filter(function(s) { return wl.indexOf(s.symbol) !== -1; });
    }
    // Sector filter
    if (currentSector) {
      filtered = filtered.filter(function(s) { return s.sector === currentSector; });
    }
    if (q) {
      filtered = filtered.filter(function(s) {
        return s.symbol.toLowerCase().indexOf(q) !== -1 ||
               (s.name && s.name.toLowerCase().indexOf(q) !== -1) ||
               (s.sector && s.sector.toLowerCase().indexOf(q) !== -1);
      });
    }
    var key = currentSort.key;
    var dir = currentSort.dir;
    filtered = filtered.slice().sort(function(a, b) {
      var av = a[key], bv = b[key];
      if (typeof av === 'string') { av = (av || '').toLowerCase(); bv = (bv || '').toLowerCase(); }
      if (av == null) av = key === 'symbol' ? 'zzz' : -Infinity;
      if (bv == null) bv = key === 'symbol' ? 'zzz' : -Infinity;
      var cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'desc' ? -cmp : cmp;
    });
    return filtered;
  }

  // ─── Render Table ───
  function renderTable() {
    var tbody = document.querySelector('[data-scr-tbody]');
    var cards = document.querySelector('[data-scr-cards]');
    var empty = document.querySelector('[data-scr-empty]');
    if (!tbody) return;

    var filtered = getFiltered();

    // Count
    var stocksWord = page.getAttribute('data-i18n-stocks') || 'stocks';
    setEl('[data-scr-count]', filtered.length + ' ' + stocksWord);

    updateBreadthAndStats(filtered);

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      cards.innerHTML = '';
      var noResultsMsg = empty.getAttribute('data-i18n-no-results') || 'No stocks match your search';
      var tryDiffMsg = empty.getAttribute('data-i18n-try-different') || 'Try different search terms or broaden your filters';
      empty.innerHTML = MktStates.buildEmptyState({ message: noResultsMsg, query: searchTerm, hint: tryDiffMsg });
      empty.style.display = 'block';
      if (currentView === 'heatmap') document.querySelector('[data-scr-heatmap]').innerHTML = '';
      return;
    }
    empty.style.display = 'none';

    if (currentView === 'heatmap') {
      renderHeatmap(filtered);
      return;
    }

    // Table rows
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var s = filtered[i];
      var borderColor = s.change != null ? (s.change >= 0 ? '#16a34a' : '#dc2626') : 'var(--color-border)';

      var rowDelay = Math.min(i * 15, 400);
      html += '<tr class="scr-row" data-symbol="' + s.symbol + '" style="animation-delay:' + rowDelay + 'ms">';
      // Watchlist star
      var starred = isInWatchlist(s.symbol);
      html += '<td class="scr-td scr-td--star"><button class="wl-star' + (starred ? ' wl-star--active' : '') + '" data-wl-toggle="' + s.symbol + '" aria-label="' + i18nWatchlist + '" title="' + i18nWatchlist + '">' + (starred ? '\u2605' : '\u2606') + '</button></td>';
      // Symbol + Name
      html += '<td class="scr-td scr-td--name">';
      html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(s.symbol) + '" class="scr-name-link">';
      html += logoCell(s.symbol);
      html += '<div class="scr-name-text">';
      html += '<span class="scr-symbol">' + hlText(s.symbol, searchTerm) + '</span>';
      html += '<span class="scr-company">' + hlText(s.name || '', searchTerm) + '</span>';
      html += '</div></a></td>';
      // Price
      html += '<td class="scr-td scr-td--num">' + (s.price != null ? 'ARS ' + fmt(s.price) : '<span class="scr-dim">—</span>') + '</td>';
      // Change
      html += '<td class="scr-td scr-td--num">' + pctHtml(s.change) + '</td>';
      // Volume
      html += '<td class="scr-td scr-td--num">' + numHtml(s.volume, fmtVol) + '</td>';
      // Market Cap
      html += '<td class="scr-td scr-td--num">' + (s.marketCap ? '$' + fmtVol(s.marketCap) : '<span class="scr-dim">—</span>') + '</td>';
      // P/E
      html += '<td class="scr-td scr-td--num">' + (s.pe != null ? s.pe.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) : '<span class="scr-dim">—</span>') + '</td>';
      // Forward P/E
      html += '<td class="scr-td scr-td--num scr-td--hide-mobile">' + (s.forwardPe != null ? s.forwardPe.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) : '<span class="scr-dim">—</span>') + '</td>';
      // EPS
      html += '<td class="scr-td scr-td--num scr-td--hide-mobile">' + (s.eps != null ? s.eps.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) : '<span class="scr-dim">—</span>') + '</td>';
      // 52W Range
      html += '<td class="scr-td scr-td--range scr-td--hide-mobile">' + range52Html(s) + '</td>';
      // Sector
      html += '<td class="scr-td scr-td--text scr-td--hide-tablet">' + (s.sector ? tSec(s.sector) : '<span class="scr-dim">—</span>') + '</td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;

    // Watchlist star click delegation
    tbody.querySelectorAll('[data-wl-toggle]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var sym = btn.getAttribute('data-wl-toggle');
        var added = toggleWatchlist(sym);
        btn.classList.toggle('wl-star--active', added);
        btn.textContent = added ? '\u2605' : '\u2606';
        // If on watchlist tab and removed, re-render
        if (currentPanel === 'watchlist' && !added) renderTable();
      });
    });

    // Make entire row clickable and keyboard accessible
    tbody.querySelectorAll('.scr-row').forEach(function(row) {
      row.style.cursor = 'pointer';
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'link');
      row.addEventListener('click', function(e) {
        if (e.target.closest('a') || e.target.closest('[data-wl-toggle]')) return;
        var sym = row.getAttribute('data-symbol');
        if (sym) window.location.href = '/' + lang + '/markets/stock/' + encodeURIComponent(sym);
      });
      row.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          var sym = row.getAttribute('data-symbol');
          if (sym) window.location.href = '/' + lang + '/markets/stock/' + encodeURIComponent(sym);
        }
      });
    });

    // Mobile cards
    var cardsHtml = '';
    for (var j = 0; j < filtered.length; j++) {
      var st = filtered[j];
      var pct = st.change != null ? st.change * 100 : null;
      var pctClass = pct != null ? (pct >= 0 ? 'rc-up' : 'rc-down') : '';
      var arrow = pct != null ? (pct >= 0 ? '▲' : '▼') : '';
      var border = pct != null ? (pct >= 0 ? '#16a34a' : '#dc2626') : 'var(--color-border)';

      var cardDelay = Math.min(j * 25, 500);
      var cStarred = isInWatchlist(st.symbol);
      cardsHtml += '<div class="stk-card-wrap" style="--stk-accent:' + border + ';animation-delay:' + cardDelay + 'ms">';
      cardsHtml += '<button class="wl-star wl-star--card' + (cStarred ? ' wl-star--active' : '') + '" data-wl-card-toggle="' + st.symbol + '" aria-label="' + i18nWatchlist + '">' + (cStarred ? '\u2605' : '\u2606') + '</button>';
      cardsHtml += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(st.symbol) + '" class="stk-card" style="--stk-accent:' + border + '" aria-label="' + st.symbol + (st.name ? ' — ' + st.name : '') + '">';
      cardsHtml += '<div class="stk-row1">';
      cardsHtml += logoCell(st.symbol).replace('scr-logo', 'stk-logo');
      cardsHtml += '<div class="stk-id">';
      cardsHtml += '<span class="stk-symbol">' + hlText(st.symbol, searchTerm) + '</span>';
      cardsHtml += '<span class="stk-name">' + hlText(st.name || '', searchTerm) + '</span>';
      cardsHtml += '</div>';
      cardsHtml += '<div class="stk-change ' + pctClass + '">' + arrow + ' ' + (pct != null ? Math.abs(pct).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%' : '—') + '</div>';
      cardsHtml += '</div>';
      cardsHtml += '<div class="stk-row2">';
      cardsHtml += '<span class="stk-price">' + (st.price != null ? 'ARS ' + fmt(st.price) : '—') + '</span>';
      cardsHtml += '<span class="stk-meta">';
      if (st.pe != null) cardsHtml += '<span class="stk-pe">P/E ' + st.pe.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '</span>';
      if (st.marketCap) cardsHtml += '<span class="stk-mcap">' + i18nCap + ' $' + fmtVol(st.marketCap) + '</span>';
      if (st.volume) cardsHtml += '<span class="stk-vol">' + i18nVol + ' ' + fmtVol(st.volume) + '</span>';
      cardsHtml += '</span>';
      cardsHtml += '</div>';
      if (st.sector) {
        cardsHtml += '<div class="stk-row3"><span class="stk-sector">' + tSec(st.sector) + '</span></div>';
      }
      cardsHtml += '</a></div>';
    }
    cards.innerHTML = cardsHtml;

    // Card star click handlers
    cards.querySelectorAll('[data-wl-card-toggle]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var sym = btn.getAttribute('data-wl-card-toggle');
        var added = toggleWatchlist(sym);
        btn.classList.toggle('wl-star--active', added);
        btn.textContent = added ? '\u2605' : '\u2606';
        if (currentPanel === 'watchlist' && !added) renderTable();
      });
    });
  }

  // ─── Sort headers ───
  function updateArrows() {
    document.querySelectorAll('[data-arrow]').forEach(function(el) {
      var col = el.getAttribute('data-arrow');
      el.textContent = currentSort.key === col ? (currentSort.dir === 'desc' ? '▼' : '▲') : '';
    });
    document.querySelectorAll('[data-sort-col]').forEach(function(th) {
      var col = th.getAttribute('data-sort-col');
      th.classList.toggle('scr-th--active', currentSort.key === col);
    });
  }

  document.querySelectorAll('[data-sort-col]').forEach(function(th) {
    th.setAttribute('tabindex', '0');
    th.setAttribute('role', 'columnheader');
    th.setAttribute('aria-sort', 'none');
    function doSort() {
      var col = th.getAttribute('data-sort-col');
      if (currentSort.key === col) {
        currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc';
      } else {
        currentSort = { key: col, dir: col === 'symbol' || col === 'sector' ? 'asc' : 'desc' };
      }
      document.querySelectorAll('[data-sort-col]').forEach(function(h) { h.setAttribute('aria-sort', 'none'); });
      th.setAttribute('aria-sort', currentSort.dir === 'asc' ? 'ascending' : 'descending');
      updateArrows();
      renderTable();
    }
    th.addEventListener('click', doSort);
    th.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doSort(); }
    });
  });

  // ─── Search ───
  var searchInput = document.querySelector('[data-scr-search]');
  if (urlSearch) searchInput.value = urlSearch;
  var searchTimer;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      searchTerm = searchInput.value.trim();
      renderTable();
    }, 150);
  });

  // ─── Hardcoded names & mcap for BYMA fallback ───
  var STOCK_NAMES = {
    ALUA: 'Aluar Aluminio', BBAR: 'BBVA Argentina', BMA: 'Banco Macro',
    BYMA: 'Bolsas y Mercados Arg.', CEPU: 'Central Puerto',
    COME: 'Soc. Comercial del Plata', CRES: 'Cresud', CELU: 'Celulosa Argentina',
    CVH: 'Cablevision Holding', EDN: 'Edenor', GGAL: 'Grupo Fin. Galicia',
    HARG: 'Holcim Argentina', LOMA: 'Loma Negra', MIRG: 'Mirgor',
    PAMP: 'Pampa Energía', SUPV: 'Grupo Supervielle', TECO2: 'Telecom Argentina',
    TGNO4: 'Transp. Gas del Norte', TGSU2: 'Transp. Gas del Sur',
    TRAN: 'Transener', TXAR: 'Ternium Argentina', VALO: 'Grupo Fin. Valores',
    YPFD: 'YPF', METR: 'MetroGAS', IRSA: 'IRSA Inversiones',
    BHIP: 'Banco Hipotecario', BPAT: 'Banco Patagonia', CAPX: 'Capex',
    GCLA: 'Grupo Clarín', LEDE: 'Ledesma', CTIO: 'Consultatio',
    BOLT: 'Boldt', HAVA: 'Havanna'
  };
  var STOCK_MCAP = {
    YPFD: 16000, GGAL: 8500, BMA: 5200, BBAR: 4500, PAMP: 4200,
    TECO2: 3500, CEPU: 3200, TXAR: 3000, TGSU2: 2500, LOMA: 1800,
    SUPV: 1600, TRAN: 1500, ALUA: 1500, EDN: 1200, CRES: 1100,
    BYMA: 1000, VALO: 900, TGNO4: 850, IRSA: 800, COME: 500,
    METR: 450, MIRG: 400, HARG: 350, BPAT: 320, CVH: 300,
    BHIP: 250, CAPX: 200, CTIO: 180, LEDE: 170, BOLT: 150,
    GCLA: 140
  };

  function normalizeBYMA(arr, panel) {
    var seen = {};
    var result = [];
    for (var i = 0; i < arr.length; i++) {
      var s = arr[i];
      var sym = (s.symbol || '').replace('.BA', '');
      if (!sym || seen[sym]) continue;
      seen[sym] = true;
      var variation = s.imbalance != null ? s.imbalance : (s.variation != null ? s.variation / 100 : null);
      var price = s.trade || s.price || s.closingPrice;
      if (!price || price <= 0) continue;
      result.push({
        symbol: sym,
        name: STOCK_NAMES[sym] || s.securityDesc || s.description || sym,
        sector: null, industry: null,
        price: price,
        change: variation,
        volume: s.volume || s.tradeVolume || 0,
        marketCap: STOCK_MCAP[sym] ? STOCK_MCAP[sym] * 1e6 : null,
        pe: null, forwardPe: null, eps: null,
        dividendYield: null, beta: null,
        fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null,
        fifty_two_week_high: null, fifty_two_week_low: null,
        recommendation: null,
        _panel: panel || 'lider'
      });
    }
    return result.sort(function(a, b) { return (b.marketCap || 0) - (a.marketCap || 0); });
  }

  // ─── Panel tabs ───
  document.querySelectorAll('[data-panel]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentPanel = btn.getAttribute('data-panel');
      document.querySelectorAll('[data-panel]').forEach(function(b) { b.classList.remove('scr-tab--active'); });
      btn.classList.add('scr-tab--active');
      renderTable();
    });
  });

  // ─── Sector filter ───
  var sectorSelect = document.querySelector('[data-scr-sector-filter]');
  if (sectorSelect) {
    sectorSelect.addEventListener('change', function() {
      currentSector = sectorSelect.value;
      renderTable();
    });
  }

  function populateSectors() {
    if (!sectorSelect) return;
    var sectorCounts = {};
    allStocks.forEach(function(s) { if (s.sector) sectorCounts[s.sector] = (sectorCounts[s.sector] || 0) + 1; });
    var sorted = Object.keys(sectorCounts).sort();
    var html = sectorSelect.options[0].outerHTML;
    sorted.forEach(function(sec) {
      html += '<option value="' + sec + '">' + tSec(sec) + '</option>';
    });
    sectorSelect.innerHTML = html;
    if (currentSector) sectorSelect.value = currentSector;

    // Sector chips
    var chipsEl = document.querySelector('[data-scr-chips]');
    if (chipsEl && sorted.length >= 2) {
      var allLabel = sectorSelect.options[0].textContent || 'All';
      var allActive = !currentSector ? ' scr-chip--active' : '';
      var chtml = '<button class="scr-chip' + allActive + '" data-chip="">' + allLabel + '</button>';
      sorted.forEach(function(sec) {
        var active = currentSector === sec ? ' scr-chip--active' : '';
        chtml += '<button class="scr-chip' + active + '" data-chip="' + sec + '">' + tSec(sec) + ' <span class="scr-chip-count">' + sectorCounts[sec] + '</span></button>';
      });
      chipsEl.innerHTML = chtml;
      chipsEl.style.display = '';
      chipsEl.querySelectorAll('.scr-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          currentSector = chip.getAttribute('data-chip');
          chipsEl.querySelectorAll('.scr-chip').forEach(function(c) { c.classList.remove('scr-chip--active'); });
          chip.classList.add('scr-chip--active');
          if (sectorSelect) sectorSelect.value = currentSector;
          renderTable();
        });
      });
    }
  }

  // ─── Market Breadth & Stats ───
  function updateBreadthAndStats(filtered) {
    var gainers = 0, losers = 0, unchanged = 0;
    var totalVol = 0, chgSum = 0, chgCount = 0;
    for (var i = 0; i < filtered.length; i++) {
      var s = filtered[i];
      totalVol += s.volume || 0;
      if (s.change != null) {
        var pct = s.change * 100;
        if (pct > 0.01) gainers++;
        else if (pct < -0.01) losers++;
        else unchanged++;
        chgSum += pct;
        chgCount++;
      } else { unchanged++; }
    }
    var total = gainers + losers + unchanged;
    if (total > 0) {
      var upPct = (gainers / total * 100).toFixed(1);
      var unchPct = (unchanged / total * 100).toFixed(1);
      var downPct = (losers / total * 100).toFixed(1);
      var upSeg = document.querySelector('[data-scr-breadth-up]');
      var unchSeg = document.querySelector('[data-scr-breadth-unch]');
      var downSeg = document.querySelector('[data-scr-breadth-down]');
      if (upSeg) upSeg.style.width = upPct + '%';
      if (unchSeg) unchSeg.style.width = unchPct + '%';
      if (downSeg) downSeg.style.width = downPct + '%';
      var countsEl = document.querySelector('[data-scr-breadth-counts]');
      if (countsEl) {
        countsEl.innerHTML = '<span class="rc-up">' + gainers + ' ▲</span>' +
          '<span class="scr-breadth-unch-label">' + unchanged + ' —</span>' +
          '<span class="rc-down">' + losers + ' ▼</span>';
      }
      document.querySelector('[data-scr-breadth]').style.display = '';
    }
    setEl('[data-scr-gainers]', gainers.toString());
    setEl('[data-scr-losers]', losers.toString());
    setEl('[data-scr-totvol]', fmtVol(totalVol));
    var avgChg = chgCount > 0 ? (chgSum / chgCount) : 0;
    var avgEl = document.querySelector('[data-scr-avgchg]');
    if (avgEl) {
      avgEl.textContent = (avgChg >= 0 ? '+' : '') + avgChg.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
      avgEl.className = 'scr-stat-val ' + (avgChg >= 0 ? 'rc-up' : 'rc-down');
    }
    document.querySelector('[data-scr-stats]').style.display = '';
  }

  // ─── Heatmap ───
  function heatColor(pct) {
    if (Math.abs(pct) < 0.01) return { bg: 'rgba(128,128,128,0.12)', text: 'var(--color-text-meta)' };
    var intensity = Math.min(Math.abs(pct) / 5, 1);
    var alpha = 0.12 + intensity * 0.38;
    if (pct > 0) {
      var r = Math.round(22 + (34 - 22) * intensity);
      var g = Math.round(163 + (197 - 163) * intensity);
      var b = Math.round(74 + (94 - 74) * intensity);
      return { bg: 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(2) + ')', text: intensity > 0.4 ? '#dcfce7' : '#16a34a' };
    }
    var r2 = Math.round(220 + (239 - 220) * intensity);
    var g2 = Math.round(38 + (68 - 38) * intensity);
    var b2 = Math.round(38 + (68 - 38) * intensity);
    return { bg: 'rgba(' + r2 + ',' + g2 + ',' + b2 + ',' + alpha.toFixed(2) + ')', text: intensity > 0.4 ? '#fecaca' : '#dc2626' };
  }

  function renderHeatmap(filtered) {
    var container = document.querySelector('[data-scr-heatmap]');
    if (!container) return;
    if (filtered.length === 0) { container.innerHTML = ''; return; }
    var sorted = filtered.slice().sort(function(a, b) { return (b.marketCap || 0) - (a.marketCap || 0); });
    var totalMcap = 0;
    for (var i = 0; i < sorted.length; i++) totalMcap += sorted[i].marketCap || 1e6;
    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      var s = sorted[i];
      var pct = s.change != null ? s.change * 100 : 0;
      var colors = heatColor(pct);
      var weight = (s.marketCap || 1e6) / totalMcap;
      var flex = Math.max(weight * 100, 1.5).toFixed(2);
      var minH = Math.max(50, Math.round(weight * 400));
      if (minH > 120) minH = 120;
      var mcapStr = s.marketCap ? '$' + fmtVol(s.marketCap) : '';
      var volStr = s.volume ? fmtVol(s.volume) : '';
      var pctStr = (pct >= 0 ? '+' : '') + pct.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
      html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(s.symbol) + '" class="hm-cell" style="flex:' + flex + ' 1 0;background:' + colors.bg + ';min-height:' + minH + 'px" data-hm-sym="' + s.symbol + '" data-hm-name="' + (s.name || s.symbol) + '" data-hm-pct="' + pctStr + '" data-hm-price="' + (s.price != null ? 'ARS ' + fmt(s.price) : '') + '" data-hm-mcap="' + mcapStr + '" data-hm-vol="' + volStr + '" data-hm-sector="' + (s.sector ? tSec(s.sector) : '') + '" aria-label="' + s.symbol + ' ' + pctStr + '">';
      html += '<span class="hm-sym">' + s.symbol + '</span>';
      html += '<span class="hm-pct" style="color:' + colors.text + '">' + pctStr + '</span>';
      if (s.price != null && weight > 0.03) html += '<span class="hm-price">' + fmt(s.price) + '</span>';
      if (mcapStr && weight > 0.05) html += '<span class="hm-mcap">' + mcapStr + '</span>';
      html += '</a>';
    }
    container.innerHTML = html;
    initHeatmapTooltip(container);
  }

  function initHeatmapTooltip(container) {
    var tip = document.getElementById('hm-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'hm-tooltip';
      tip.className = 'hm-tooltip';
      document.body.appendChild(tip);
    }
    function showTip(cell, e) {
      var sym = cell.getAttribute('data-hm-sym');
      var name = cell.getAttribute('data-hm-name');
      var pctVal = cell.getAttribute('data-hm-pct');
      var price = cell.getAttribute('data-hm-price');
      var mcap = cell.getAttribute('data-hm-mcap');
      var vol = cell.getAttribute('data-hm-vol');
      var sector = cell.getAttribute('data-hm-sector');
      var html2 = '<div class="hm-tip-head"><strong>' + sym + '</strong><span class="hm-tip-name">' + name + '</span></div>';
      html2 += '<div class="hm-tip-row"><span>' + pctVal + '</span>';
      if (price) html2 += '<span>' + price + '</span>';
      html2 += '</div>';
      if (mcap || vol) {
        html2 += '<div class="hm-tip-row hm-tip-meta">';
        if (mcap) html2 += '<span>' + i18nCap + ' ' + mcap + '</span>';
        if (vol) html2 += '<span>' + i18nVol + ' ' + vol + '</span>';
        html2 += '</div>';
      }
      if (sector) html2 += '<div class="hm-tip-sector">' + sector + '</div>';
      tip.innerHTML = html2;
      tip.style.display = 'block';
      var rect = cell.getBoundingClientRect();
      var tipW = tip.offsetWidth || 200;
      var x = rect.left + rect.width / 2 - tipW / 2;
      if (x + tipW > window.innerWidth - 8) x = window.innerWidth - tipW - 8;
      if (x < 8) x = 8;
      tip.style.left = x + 'px';
      tip.style.top = (rect.top - tip.offsetHeight - 8 + window.scrollY) + 'px';
    }
    function hideTip() { tip.style.display = 'none'; }
    container.addEventListener('mouseenter', function(e) {
      var cell = e.target.closest('.hm-cell');
      if (cell) showTip(cell, e);
    }, true);
    container.addEventListener('mouseleave', function(e) {
      var cell = e.target.closest('.hm-cell');
      if (cell) hideTip();
    }, true);
    container.addEventListener('mouseover', function(e) {
      var cell = e.target.closest('.hm-cell');
      if (cell) showTip(cell, e);
      else hideTip();
    });
  }

  // ─── View toggle ───
  document.querySelectorAll('[data-view]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentView = btn.getAttribute('data-view');
      document.querySelectorAll('[data-view]').forEach(function(b) { b.classList.remove('scr-view-btn--active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('scr-view-btn--active');
      btn.setAttribute('aria-pressed', 'true');
      var tableWrap = document.querySelector('.scr-table-wrap');
      var heatmap = document.querySelector('[data-scr-heatmap]');
      var cards = document.querySelector('[data-scr-cards]');
      var hmSkel = document.querySelector('[data-scr-skeleton-heatmap]');
      if (currentView === 'heatmap') {
        if (tableWrap) tableWrap.style.display = 'none';
        if (cards) cards.style.display = 'none';
        if (heatmap) heatmap.style.display = '';
        if (allStocks.length === 0 && hmSkel) hmSkel.style.display = '';
        renderHeatmap(getFiltered());
      } else {
        if (tableWrap) tableWrap.style.display = '';
        if (heatmap) heatmap.style.display = 'none';
        if (hmSkel) hmSkel.style.display = 'none';
        if (cards) cards.style.display = '';
      }
    });
  });

  // ─── Load data: try /api/screener, fallback to BYMA direct (both panels) ───
  function hideSkeletons() {
    var skels = page.querySelectorAll('[data-scr-skeleton-breadth],[data-scr-skeleton-stats],[data-scr-skeleton-heatmap]');
    for (var i = 0; i < skels.length; i++) skels[i].style.display = 'none';
    var skelRows = page.querySelectorAll('.scr-skeleton-row');
    for (var i = 0; i < skelRows.length; i++) skelRows[i].remove();
    var skelCards = page.querySelectorAll('.scr-skeleton-card');
    for (var i = 0; i < skelCards.length; i++) skelCards[i].remove();
  }

  function onData(stocks) {
    hideSkeletons();
    allStocks = stocks;
    populateSectors();
    var updEl = document.querySelector('[data-mkts-updated]');
    if (updEl) updEl.innerHTML = '<span class="live-dot"></span>' + (page.getAttribute('data-i18n-updated') || 'Updated') + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    renderTable();
  }

  function onError() {
    hideSkeletons();
    var errMsg = page.getAttribute('data-i18n-error') || 'Unable to load stock data';
    var retryLabel = page.getAttribute('data-i18n-retry') || 'Retry';
    var checkConn = page.getAttribute('data-i18n-check-conn') || 'Check your connection and try again';
    setEl('[data-mkts-updated]', '—');
    var errorHtml = MktStates.buildErrorCard({ message: errMsg, hint: checkConn, retryLabel: retryLabel });
    document.querySelector('[data-scr-tbody]').innerHTML = '<tr><td colspan="10">' + errorHtml + '</td></tr>';
    document.querySelector('[data-scr-cards]').innerHTML = errorHtml;
  }

  function postBYMA(url) {
    return fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    }).then(function(r) { return r.json(); });
  }

  function fetchBothPanels() {
    var BYMA_LIDER = 'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/leading-equity';
    var BYMA_GENERAL = 'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/general-equity';

    return Promise.all([
      postBYMA(BYMA_LIDER).catch(function() { return null; }),
      postBYMA(BYMA_GENERAL).catch(function() { return null; })
    ]).then(function(results) {
      var liderData = results[0];
      var generalData = results[1];
      var liderArr = (liderData && liderData.data) || liderData || [];
      var generalArr = (generalData && generalData.data) || generalData || [];
      if (!Array.isArray(liderArr)) liderArr = [];
      if (!Array.isArray(generalArr)) generalArr = [];

      var liderStocks = normalizeBYMA(liderArr, 'lider');
      var liderSet = {};
      liderStocks.forEach(function(s) { liderSet[s.symbol] = true; });

      var generalStocks = normalizeBYMA(generalArr, 'general').filter(function(s) {
        return !liderSet[s.symbol];
      });

      var all = liderStocks.concat(generalStocks);
      all.sort(function(a, b) { return (b.marketCap || 0) - (a.marketCap || 0) || (b.volume || 0) - (a.volume || 0); });
      return all;
    });
  }

  fetch('/api/screener')
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(data) {
      if (!Array.isArray(data) || data.length === 0) throw new Error('bad');
      var stocks = normalize(data);
      stocks.forEach(function(s) { s._panel = s._panel || 'lider'; });
      onData(stocks);
      postBYMA('https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/general-equity')
        .then(function(d) {
          var arr = (d && d.data) || d || [];
          if (!Array.isArray(arr) || arr.length === 0) return;
          var liderSet = {};
          allStocks.forEach(function(s) { liderSet[s.symbol] = true; });
          var generalStocks = normalizeBYMA(arr, 'general').filter(function(s) { return !liderSet[s.symbol]; });
          if (generalStocks.length > 0) {
            allStocks = allStocks.concat(generalStocks);
            allStocks.sort(function(a, b) { return (b.marketCap || 0) - (a.marketCap || 0) || (b.volume || 0) - (a.volume || 0); });
            renderTable();
          }
        }).catch(function() {});
    })
    .catch(function() {
      fetchBothPanels()
        .then(function(stocks) {
          if (stocks.length === 0) throw new Error('empty');
          onData(stocks);
        })
        .catch(function() {
          fetch('/api/leading-equity')
            .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function(arr) {
              if (!Array.isArray(arr) || arr.length === 0) throw new Error('empty');
              onData(normalizeBYMA(arr, 'lider'));
            })
            .catch(onError);
        });
    });

  // Keyboard shortcut: / to focus search
  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      var searchInput = document.querySelector('[data-scr-search]');
      if (searchInput) searchInput.focus();
    }
    if (e.key === 'Escape') {
      var searchInput = document.querySelector('[data-scr-search]');
      if (searchInput && document.activeElement === searchInput) {
        searchInput.blur();
        searchInput.value = '';
        searchTerm = '';
        renderTable();
      }
    }
  });

  // Ctrl/Cmd+K to focus search
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      var si = document.querySelector('[data-scr-search]');
      if (si) { si.focus(); si.select(); }
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

  // Auto-refresh with countdown (5 min)
  var REFRESH_INTERVAL = 5 * 60;
  var refreshRemaining = REFRESH_INTERVAL;
  function fmtCountdown(s) {
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function tickCountdown() {
    refreshRemaining--;
    if (refreshRemaining <= 0) {
      refreshRemaining = REFRESH_INTERVAL;
      window.location.reload();
      return;
    }
    var cdEl = document.querySelector('.refresh-countdown');
    if (cdEl) cdEl.textContent = '(' + fmtCountdown(refreshRemaining) + ')';
  }
  var updatedEl = document.querySelector('[data-mkts-updated]');
  if (updatedEl && !updatedEl.querySelector('.refresh-countdown')) {
    var cdSpan = document.createElement('span');
    cdSpan.className = 'refresh-countdown';
    cdSpan.textContent = '(' + fmtCountdown(refreshRemaining) + ')';
    updatedEl.appendChild(document.createTextNode(' '));
    updatedEl.appendChild(cdSpan);
  }
  setInterval(tickCountdown, 1000);

  // ─── Tooltip toggle for mobile + keyboard ───
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.tip-btn');
    document.querySelectorAll('.tip-btn.tip--active').forEach(function(el) { if (el !== btn) el.classList.remove('tip--active'); });
    if (btn) { e.stopPropagation(); btn.classList.toggle('tip--active'); }
  });
  document.addEventListener('keydown', function(e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('tip-btn')) {
      e.preventDefault(); e.stopPropagation(); e.target.classList.toggle('tip--active');
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.tip-btn.tip--active').forEach(function(el) { el.classList.remove('tip--active'); });
    }
  });
})();
