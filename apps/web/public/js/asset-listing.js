/**
 * Shared client-side logic for asset listing pages (CEDEARs, bonds, ONs, letras).
 * Reads configuration from data attributes on [data-asset-page].
 */
(function() {
  var page = document.querySelector('[data-asset-page]');
  if (!page) return;

  var lang = page.getAttribute('data-lang') || 'en';
  var apiUrl = page.getAttribute('data-api');
  var assetType = page.getAttribute('data-asset-type') || '';
  var stockUrl = page.getAttribute('data-stock-url') || '/' + lang + '/markets/stock';
  var i18nUpdated = page.getAttribute('data-i18n-updated') || 'Updated';
  var i18nError = page.getAttribute('data-i18n-error') || 'Failed to load data';
  var i18nRetry = page.getAttribute('data-i18n-retry') || 'Retry';
  var i18nNoResults = page.getAttribute('data-i18n-no-results') || 'No results found';
  var i18nPrevClose = page.getAttribute('data-i18n-prev-close') || 'Prev Close';
  var i18nHigh = page.getAttribute('data-i18n-high') || 'High';
  var i18nLow = page.getAttribute('data-i18n-low') || 'Low';

  var isBondPage = assetType === 'government_bond' || assetType === 'corporate_bond' || assetType === 'letra';

  // Bond tag i18n (only used on bond pages)
  var i18nTagLawAR = page.getAttribute('data-i18n-tag-law-ar') || 'Arg. Law';
  var i18nTagLawNY = page.getAttribute('data-i18n-tag-law-ny') || 'NY Law';
  var i18nTagCER = page.getAttribute('data-i18n-tag-cer') || 'CER';
  var i18nTagDual = page.getAttribute('data-i18n-tag-dual') || 'Dual';

  var allItems = [];
  var currentSort = { key: 'volume', dir: 'desc' };
  var searchTerm = '';

  // Detect how many columns the table has
  var headerCells = document.querySelectorAll('[data-asset-table] thead th[data-sort]');
  var hasPrevClose = false;
  headerCells.forEach(function(th) {
    if (th.getAttribute('data-sort') === 'previousClose') hasPrevClose = true;
  });
  var colCount = headerCells.length || 6;

  var tbody = document.querySelector('[data-asset-tbody]');
  var cards = document.querySelector('[data-asset-cards]');
  var updatedEl = document.querySelector('[data-mkts-updated]');
  var statsEl = document.querySelector('[data-asset-stats]');
  var countEl = document.querySelector('[data-asset-count]');
  var emptyEl = document.querySelector('[data-asset-empty]');
  var searchInput = document.querySelector('[data-asset-search]');

  // ---------------------------------------------------------------------------
  // Info panel localStorage dismiss
  // ---------------------------------------------------------------------------
  var infoPanel = document.querySelector('[data-fi-info]');
  if (infoPanel && isBondPage) {
    var storageKey = 'fi-info-dismissed-' + assetType;
    if (localStorage.getItem(storageKey) === '1') {
      infoPanel.removeAttribute('open');
    }
    infoPanel.addEventListener('toggle', function() {
      if (!infoPanel.open) {
        localStorage.setItem(storageKey, '1');
      } else {
        localStorage.removeItem(storageKey);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Bond metadata parser
  // ---------------------------------------------------------------------------
  var GOVT_BOND_PREFIXES = {
    'AL':  { currency: 'USD', law: 'AR' },
    'AE':  { currency: 'USD', law: 'AR' },
    'GD':  { currency: 'USD', law: 'NY' },
    'GE':  { currency: 'USD', law: 'NY' },
    'TX':  { currency: 'ARS', law: 'AR', type: 'CER' },
    'TC':  { currency: 'ARS', law: 'AR', type: 'CER' },
    'DI':  { currency: 'ARS', law: 'AR', type: 'CER' },
    'PR':  { currency: 'ARS', law: 'AR' },
    'BPOA': { currency: 'USD', law: 'AR', type: 'Bopreal' },
    'BPOB': { currency: 'USD', law: 'AR', type: 'Bopreal' },
    'BPOC': { currency: 'USD', law: 'AR', type: 'Bopreal' },
    'BPOD': { currency: 'USD', law: 'AR', type: 'Bopreal' },
    'TV':  { currency: 'USD', law: 'AR', type: 'DL' },
    'TZ':  { currency: 'ARS', law: 'AR', type: 'CER' },
    'T2':  { currency: 'ARS', law: 'AR', type: 'CER' },
    'T3':  { currency: 'ARS', law: 'AR' },
    'T4':  { currency: 'ARS', law: 'AR' },
    'T5':  { currency: 'ARS', law: 'AR' },
    'T6':  { currency: 'ARS', law: 'AR' },
    'TO':  { currency: 'ARS', law: 'AR' },
    'TDA': { currency: 'USD', law: 'AR', type: 'DL' },
    'TDB': { currency: 'USD', law: 'AR', type: 'DL' },
  };

  // Letras month letter encoding: the letter before the last digit encodes the month
  var MONTH_LETTERS = { E: 1, F: 2, M: 3, A: 4, Y: 5, J: 6, L: 7, G: 8, S: 9, O: 10, N: 11, D: 12 };
  var MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseBondMeta(symbol) {
    if (!symbol) return null;
    var sym = symbol.toUpperCase();

    // Letras: pattern like S31O5 (S + date + monthLetter + yearDigit)
    // or X18F5 etc. They typically start with S, X, L
    if (assetType === 'letra') {
      // Try to find month letter and year digit at the end
      var letraMatch = sym.match(/^([A-Z])(\d{2})([EFMAYLGJSOND])(\d)$/);
      if (letraMatch) {
        var monthNum = MONTH_LETTERS[letraMatch[3]];
        var yearDigit = parseInt(letraMatch[4]);
        var maturityYear = 2020 + yearDigit;
        if (maturityYear < 2024) maturityYear += 10;
        return {
          currency: 'ARS',
          maturity: MONTH_NAMES[monthNum] + ' ' + maturityYear,
          type: letraMatch[1] === 'S' ? 'LECAP' : letraMatch[1] === 'X' ? 'LEDE' : letraMatch[1] === 'L' ? 'LECER' : ''
        };
      }
      // Longer letras like S30S5 etc
      var letraMatch2 = sym.match(/^([A-Z])(\d+)([EFMAYLGJSOND])(\d)$/);
      if (letraMatch2) {
        var monthNum2 = MONTH_LETTERS[letraMatch2[3]];
        var yearDigit2 = parseInt(letraMatch2[4]);
        var maturityYear2 = 2020 + yearDigit2;
        if (maturityYear2 < 2024) maturityYear2 += 10;
        return {
          currency: 'ARS',
          maturity: MONTH_NAMES[monthNum2] + ' ' + maturityYear2,
          type: letraMatch2[1] === 'S' ? 'LECAP' : letraMatch2[1] === 'X' ? 'LEDE' : letraMatch2[1] === 'L' ? 'LECER' : ''
        };
      }
      return null;
    }

    // Government bonds: try longest prefix first
    var meta = null;
    var prefixes = Object.keys(GOVT_BOND_PREFIXES).sort(function(a, b) { return b.length - a.length; });
    for (var i = 0; i < prefixes.length; i++) {
      if (sym.indexOf(prefixes[i]) === 0) {
        meta = GOVT_BOND_PREFIXES[prefixes[i]];
        var rest = sym.substring(prefixes[i].length);
        var yearMatch = rest.match(/^(\d{2})/);
        if (yearMatch) {
          var yr = parseInt(yearMatch[1]);
          var fullYear = yr < 50 ? 2000 + yr : 1900 + yr;
          return {
            currency: meta.currency,
            law: meta.law,
            type: meta.type || null,
            maturity: '' + fullYear
          };
        }
        return { currency: meta.currency, law: meta.law, type: meta.type || null, maturity: null };
      }
    }
    return null;
  }

  function buildBondTag(meta) {
    if (!meta) return '';
    var parts = [];
    if (meta.currency) parts.push(meta.currency);
    if (meta.maturity) parts.push(meta.maturity);
    if (meta.law === 'NY') parts.push(i18nTagLawNY);
    if (meta.type === 'CER') parts.push(i18nTagCER);
    if (parts.length === 0) return '';
    return '<span class="at-bond-tag">' + parts.join(' · ') + '</span>';
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  var H = window.PlataHelpers || {};

  function fmt(n) {
    return H.formatCurrency ? H.formatCurrency(n, lang, null, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (n == null ? '—' : n.toFixed(2));
  }

  function fmtVol(v) {
    return H.formatVolume ? H.formatVolume(v, lang) : (v == null ? '—' : String(v));
  }

  var changeClass = H.changeClass || function(v) { return v == null || v === 0 ? 'rc-unch' : v > 0 ? 'rc-up' : 'rc-down'; };
  var changeText = H.changeText || function(v) { return v == null ? '—' : (v > 0 ? '+' : '') + v.toFixed(2) + '%'; };
  var escHtml = H.escHtml || function(s) { return s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''; };

  function sortItems(items) {
    var key = currentSort.key;
    var dir = currentSort.dir === 'asc' ? 1 : -1;
    return items.slice().sort(function(a, b) {
      var va, vb;
      if (key === 'symbol') {
        va = a.symbol || ''; vb = b.symbol || '';
      } else if (key === 'change') {
        va = a.variation || 0; vb = b.variation || 0;
      } else if (key === 'previousClose') {
        va = a.previousClose || a.previousClosingPrice || 0;
        vb = b.previousClose || b.previousClosingPrice || 0;
      } else {
        va = a[key] || 0; vb = b[key] || 0;
      }
      if (typeof va === 'string') return dir * va.localeCompare(vb);
      return dir * ((va || 0) - (vb || 0));
    });
  }

  function filterItems(items) {
    if (!searchTerm) return items;
    var q = searchTerm.toLowerCase();
    return items.filter(function(s) {
      return (s.symbol || '').toLowerCase().indexOf(q) !== -1 ||
             (s.description || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderTable(items) {
    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = '';
      if (emptyEl) {
        emptyEl.textContent = searchTerm ? i18nNoResults : i18nError;
        emptyEl.style.display = '';
      }
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var s = items[i];
      var cc = changeClass(s.variation);
      var prevClose = s.previousClose || s.previousClosingPrice;
      var bondTag = isBondPage ? buildBondTag(parseBondMeta(s.symbol)) : '';
      var starTd = '';
      if (window.PlataWatchlist) {
        starTd = '<td class="at-td at-td--star" data-wl-cell="' + escHtml(s.symbol) + '"></td>';
      }
      html += '<tr class="at-row" data-clickable data-symbol="' + escHtml(s.symbol) + '">' +
        starTd +
        '<td class="at-td at-td--name">' +
          '<div class="at-name-wrap">' +
            '<span class="at-sym">' + escHtml(s.symbol) + '</span>' +
            bondTag +
          '</div>' +
          (s.description ? '<span class="at-desc">' + escHtml(s.description) + '</span>' : '') +
        '</td>' +
        '<td class="at-td at-td--num">' + fmt(s.price) + '</td>' +
        '<td class="at-td at-td--num"><span class="at-change-badge ' + cc + '">' + changeText(s.variation) + '</span></td>' +
        '<td class="at-td at-td--num">' + fmtVol(s.volume) + '</td>';
      if (hasPrevClose) {
        html += '<td class="at-td at-td--num at-td--hide-mobile">' + fmt(prevClose) + '</td>';
      }
      html += '<td class="at-td at-td--num at-td--hide-mobile">' + fmt(s.high) + '</td>' +
        '<td class="at-td at-td--num at-td--hide-mobile">' + fmt(s.low) + '</td>' +
      '</tr>';
    }
    tbody.innerHTML = html;
  }

  function renderCards(items) {
    if (!cards) return;
    if (items.length === 0) { cards.innerHTML = ''; return; }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var s = items[i];
      var cc = changeClass(s.variation);
      var prevClose = s.previousClose || s.previousClosingPrice;
      var bondTag = isBondPage ? buildBondTag(parseBondMeta(s.symbol)) : '';
      var cardStarPlaceholder = window.PlataWatchlist ? '<span class="at-card-star" data-wl-card="' + escHtml(s.symbol) + '"></span>' : '';
      html += '<div class="at-card" data-clickable data-symbol="' + escHtml(s.symbol) + '">' +
        '<div class="at-card-top">' +
          '<div>' +
            '<div class="at-card-name-wrap">' + cardStarPlaceholder + '<span class="at-card-sym">' + escHtml(s.symbol) + '</span>' + bondTag + '</div>' +
            (s.description ? '<span class="at-card-desc">' + escHtml(s.description) + '</span>' : '') +
          '</div>' +
          '<span class="at-change-badge ' + cc + '">' + changeText(s.variation) + '</span>' +
        '</div>' +
        '<div class="at-card-bottom">' +
          '<span class="at-card-price">' + fmt(s.price) + '</span>' +
          '<span class="at-card-vol">Vol: ' + fmtVol(s.volume) + '</span>' +
        '</div>';
      // Extra row for prev close on bonds/letras
      if (hasPrevClose && prevClose != null) {
        html += '<div class="at-card-extra">' +
          '<span class="at-card-extra-label">' + escHtml(i18nPrevClose) + '</span>' +
          '<span class="at-card-extra-val">' + fmt(prevClose) + '</span>' +
          '<span class="at-card-extra-label">' + escHtml(i18nHigh) + '</span>' +
          '<span class="at-card-extra-val">' + fmt(s.high) + '</span>' +
          '<span class="at-card-extra-label">' + escHtml(i18nLow) + '</span>' +
          '<span class="at-card-extra-val">' + fmt(s.low) + '</span>' +
        '</div>';
      }
      html += '</div>';
    }
    cards.innerHTML = html;
  }

  function updateStats(items) {
    if (!statsEl) return;
    var gainers = 0, losers = 0, totalVol = 0;
    for (var i = 0; i < items.length; i++) {
      if ((items[i].variation || 0) > 0) gainers++;
      else if ((items[i].variation || 0) < 0) losers++;
      totalVol += items[i].volume || 0;
    }
    var el;
    el = statsEl.querySelector('[data-stat-count]'); if (el) el.textContent = items.length;
    el = statsEl.querySelector('[data-stat-gainers]'); if (el) el.textContent = gainers;
    el = statsEl.querySelector('[data-stat-losers]'); if (el) el.textContent = losers;
    el = statsEl.querySelector('[data-stat-volume]'); if (el) el.textContent = fmtVol(totalVol);
    statsEl.style.display = '';
  }

  // Insert actual star button DOM elements into placeholder cells/spans
  function injectStarButtons() {
    if (!window.PlataWatchlist) return;
    // Table star cells
    document.querySelectorAll('[data-wl-cell]').forEach(function(td) {
      var sym = td.getAttribute('data-wl-cell');
      if (td.children.length === 0) {
        td.appendChild(window.PlataWatchlist.createStar(sym, assetType, sym));
      }
    });
    // Card star spans
    document.querySelectorAll('[data-wl-card]').forEach(function(span) {
      var sym = span.getAttribute('data-wl-card');
      if (span.children.length === 0) {
        span.appendChild(window.PlataWatchlist.createStar(sym, assetType, sym));
      }
    });
  }

  // Add star column header to table if watchlist is available
  function addStarColumnHeader() {
    if (!window.PlataWatchlist) return;
    var thead = document.querySelector('[data-asset-table] thead tr');
    if (thead && !thead.querySelector('.at-th--star')) {
      var th = document.createElement('th');
      th.className = 'at-th at-th--star';
      th.style.width = '28px';
      th.style.padding = '0 2px';
      thead.insertBefore(th, thead.firstChild);
      colCount++;
    }
  }

  addStarColumnHeader();

  function render() {
    var filtered = filterItems(allItems);
    var sorted = sortItems(filtered);
    renderTable(sorted);
    renderCards(sorted);
    injectStarButtons();
    updateStats(allItems);
    if (countEl) {
      countEl.textContent = filtered.length + (filtered.length !== allItems.length ? ' / ' + allItems.length : '');
    }
  }

  // Re-render stars when watchlist changes (e.g. from another component)
  document.addEventListener('watchlist-changed', function() {
    injectStarButtons();
  });

  // Sort headers
  document.querySelectorAll('[data-sort]').forEach(function(th) {
    th.addEventListener('click', function() {
      var key = th.getAttribute('data-sort');
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = { key: key, dir: key === 'symbol' ? 'asc' : 'desc' };
      }
      // Update active styling
      document.querySelectorAll('.at-th').forEach(function(h) { h.classList.remove('at-th--active'); });
      th.classList.add('at-th--active');
      document.querySelectorAll('.at-arrow').forEach(function(a) { a.textContent = ''; });
      var arrow = th.querySelector('.at-arrow');
      if (arrow) arrow.textContent = currentSort.dir === 'asc' ? '\u25B2' : '\u25BC';
      render();
    });
  });

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      searchTerm = searchInput.value.trim();
      render();
    });
  }

  // Click to stock page
  document.addEventListener('click', function(e) {
    var row = e.target.closest('[data-clickable][data-symbol]');
    if (row) {
      var sym = row.getAttribute('data-symbol');
      window.location.href = stockUrl + '?s=' + encodeURIComponent(sym);
    }
  });

  // Fetch data
  function fetchData() {
    fetch(apiUrl)
      .then(function(r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function(data) {
        allItems = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
        render();
        if (updatedEl) {
          var now = new Date();
          updatedEl.textContent = i18nUpdated + ' ' + now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
        }
      })
      .catch(function() {
        if (updatedEl) updatedEl.textContent = i18nError;
        if (tbody) tbody.innerHTML = '<tr><td colspan="' + colCount + '" class="asset-empty">' + i18nError +
          ' <button onclick="location.reload()" style="margin-left:8px;cursor:pointer;text-decoration:underline;border:none;background:none;color:var(--color-gold);font-weight:600;">' + i18nRetry + '</button></td></tr>';
        if (cards) cards.innerHTML = '<div class="asset-empty">' + i18nError +
          ' <button onclick="location.reload()" style="margin-left:8px;cursor:pointer;text-decoration:underline;border:none;background:none;color:var(--color-gold);font-weight:600;">' + i18nRetry + '</button></div>';
      });
  }

  fetchData();

  // Auto-refresh every 30 seconds
  setInterval(fetchData, 30000);
})();
