/**
 * Shared client-side logic for asset listing pages (CEDEARs, bonds, ONs, letras).
 * Reads configuration from data attributes on [data-asset-page].
 */
(function() {
  var page = document.querySelector('[data-asset-page]');
  if (!page) return;

  var lang = page.getAttribute('data-lang') || 'en';
  var apiUrl = page.getAttribute('data-api');
  var stockUrl = page.getAttribute('data-stock-url') || '/' + lang + '/markets/stock';
  var i18nUpdated = page.getAttribute('data-i18n-updated') || 'Updated';
  var i18nError = page.getAttribute('data-i18n-error') || 'Failed to load data';
  var i18nRetry = page.getAttribute('data-i18n-retry') || 'Retry';
  var i18nNoResults = page.getAttribute('data-i18n-no-results') || 'No results found';

  var allItems = [];
  var currentSort = { key: 'volume', dir: 'desc' };
  var searchTerm = '';

  var tbody = document.querySelector('[data-asset-tbody]');
  var cards = document.querySelector('[data-asset-cards]');
  var updatedEl = document.querySelector('[data-mkts-updated]');
  var statsEl = document.querySelector('[data-asset-stats]');
  var countEl = document.querySelector('[data-asset-count]');
  var emptyEl = document.querySelector('[data-asset-empty]');
  var searchInput = document.querySelector('[data-asset-search]');

  function fmt(n) {
    if (n == null || isNaN(n)) return '—';
    return n.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtVol(v) {
    if (v == null || isNaN(v)) return '—';
    if (v >= 1e9) return (v / 1e9).toLocaleString(lang, { maximumFractionDigits: 1 }) + 'B';
    if (v >= 1e6) return (v / 1e6).toLocaleString(lang, { maximumFractionDigits: 1 }) + 'M';
    if (v >= 1e3) return (v / 1e3).toLocaleString(lang, { maximumFractionDigits: 1 }) + 'K';
    return Math.round(v).toLocaleString(lang);
  }

  function changeClass(v) {
    if (v == null || v === 0) return 'rc-unch';
    return v > 0 ? 'rc-up' : 'rc-down';
  }

  function changeText(v) {
    if (v == null) return '—';
    var sign = v > 0 ? '+' : '';
    return sign + v.toFixed(2) + '%';
  }

  function sortItems(items) {
    var key = currentSort.key;
    var dir = currentSort.dir === 'asc' ? 1 : -1;
    return items.slice().sort(function(a, b) {
      var va = key === 'symbol' ? (a.symbol || '') : (key === 'change' ? (a.variation || 0) : (a[key] || 0));
      var vb = key === 'symbol' ? (b.symbol || '') : (key === 'change' ? (b.variation || 0) : (b[key] || 0));
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
      html += '<tr class="at-row" data-clickable data-symbol="' + s.symbol + '">' +
        '<td class="at-td at-td--name"><span class="at-sym">' + s.symbol + '</span>' +
          (s.description ? '<span class="at-desc">' + s.description + '</span>' : '') + '</td>' +
        '<td class="at-td at-td--num">' + fmt(s.price) + '</td>' +
        '<td class="at-td at-td--num"><span class="at-change-badge ' + cc + '">' + changeText(s.variation) + '</span></td>' +
        '<td class="at-td at-td--num">' + fmtVol(s.volume) + '</td>' +
        '<td class="at-td at-td--num at-td--hide-mobile">' + fmt(s.high) + '</td>' +
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
      html += '<div class="at-card" data-clickable data-symbol="' + s.symbol + '">' +
        '<div class="at-card-top">' +
          '<div><span class="at-card-sym">' + s.symbol + '</span>' +
            (s.description ? '<span class="at-card-desc">' + s.description + '</span>' : '') + '</div>' +
          '<span class="at-change-badge ' + cc + '">' + changeText(s.variation) + '</span>' +
        '</div>' +
        '<div class="at-card-bottom">' +
          '<span class="at-card-price">' + fmt(s.price) + '</span>' +
          '<span class="at-card-vol">Vol: ' + fmtVol(s.volume) + '</span>' +
        '</div>' +
      '</div>';
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

  function render() {
    var filtered = filterItems(allItems);
    var sorted = sortItems(filtered);
    renderTable(sorted);
    renderCards(sorted);
    updateStats(allItems);
    if (countEl) {
      countEl.textContent = filtered.length + (filtered.length !== allItems.length ? ' / ' + allItems.length : '');
    }
  }

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
      if (arrow) arrow.textContent = currentSort.dir === 'asc' ? '▲' : '▼';
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
      .then(function(r) { return r.json(); })
      .then(function(data) {
        allItems = Array.isArray(data) ? data : [];
        render();
        if (updatedEl) {
          var now = new Date();
          updatedEl.textContent = i18nUpdated + ' ' + now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
        }
      })
      .catch(function() {
        if (updatedEl) updatedEl.textContent = i18nError;
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="asset-empty">' + i18nError +
          ' <button onclick="location.reload()" style="margin-left:8px;cursor:pointer;text-decoration:underline;border:none;background:none;color:var(--color-gold);font-weight:600;">' + i18nRetry + '</button></td></tr>';
      });
  }

  fetchData();

  // Auto-refresh every 30 seconds
  setInterval(fetchData, 30000);
})();
