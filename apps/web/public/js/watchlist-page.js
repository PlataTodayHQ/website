(function() {
  var page = document.querySelector('[data-wl-page]');
  if (!page || !window.PlataWatchlist) return;

  var lang = page.getAttribute('data-lang') || 'en';
  var stockUrl = page.getAttribute('data-stock-url') || '/' + lang + '/markets/stock';
  var loadingEl = page.querySelector('[data-wl-loading]');
  var emptyEl = page.querySelector('[data-wl-empty]');
  var groupsEl = page.querySelector('[data-wl-groups]');
  var updatedEl = page.querySelector('[data-wl-updated]');
  var disclaimerEl = page.querySelector('[data-wl-disclaimer]');

  var API_MAP = {
    stock: '/api/leading-equity',
    government_bond: '/api/bonds',
    corporate_bond: '/api/corporate-bonds',
    cedear: '/api/cedears',
    letra: '/api/letras'
  };

  var TYPE_LABELS = {
    stock: 'Stocks',
    government_bond: 'Government Bonds',
    corporate_bond: 'Corporate Bonds',
    cedear: 'CEDEARs',
    letra: 'Letras'
  };

  function fmt(n) {
    if (n == null || isNaN(n)) return '\u2014';
    return n.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtVol(v) {
    if (v == null || isNaN(v)) return '\u2014';
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
    if (v == null) return '\u2014';
    var sign = v > 0 ? '+' : '';
    return sign + v.toFixed(2) + '%';
  }

  function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function groupByType(items) {
    var groups = {};
    for (var i = 0; i < items.length; i++) {
      var type = items[i].assetType || 'stock';
      if (!groups[type]) groups[type] = [];
      groups[type].push(items[i]);
    }
    return groups;
  }

  function buildGroupHtml(type, items, priceMap) {
    var label = TYPE_LABELS[type] || type;
    var html = '<div class="wl-group">';
    html += '<h2 class="wl-group-title">' + escHtml(label) + ' <span class="wl-group-count">(' + items.length + ')</span></h2>';
    html += '<div class="wl-table-wrap"><table class="asset-table wl-table">';
    html += '<thead><tr>';
    html += '<th class="at-th at-th--star" style="width:28px;padding:0 2px;"></th>';
    html += '<th class="at-th at-th--name">Symbol</th>';
    html += '<th class="at-th at-th--num">Price</th>';
    html += '<th class="at-th at-th--num">Change</th>';
    html += '<th class="at-th at-th--num">Volume</th>';
    html += '</tr></thead><tbody>';

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var data = priceMap[item.symbol];
      var price = data ? data.price : null;
      var variation = data ? data.variation : null;
      var volume = data ? data.volume : null;
      var desc = data ? (data.description || item.name) : item.name;
      var cc = changeClass(variation);

      html += '<tr class="at-row" data-clickable data-symbol="' + escHtml(item.symbol) + '">';
      html += '<td class="at-td at-td--star" data-wl-remove="' + escHtml(item.symbol) + '" data-wl-type="' + escHtml(type) + '" data-wl-name="' + escHtml(item.name) + '"></td>';
      html += '<td class="at-td at-td--name">';
      html += '<span class="at-sym">' + escHtml(item.symbol) + '</span>';
      if (desc && desc !== item.symbol) html += '<span class="at-desc">' + escHtml(desc) + '</span>';
      html += '</td>';
      html += '<td class="at-td at-td--num">' + fmt(price) + '</td>';
      html += '<td class="at-td at-td--num"><span class="at-change-badge ' + cc + '">' + changeText(variation) + '</span></td>';
      html += '<td class="at-td at-td--num">' + fmtVol(volume) + '</td>';
      html += '</tr>';
    }

    html += '</tbody></table></div></div>';
    return html;
  }

  function injectStarButtons() {
    document.querySelectorAll('[data-wl-remove]').forEach(function(td) {
      var sym = td.getAttribute('data-wl-remove');
      var type = td.getAttribute('data-wl-type') || 'stock';
      var name = td.getAttribute('data-wl-name') || sym;
      if (td.children.length === 0) {
        td.appendChild(window.PlataWatchlist.createStar(sym, type, name));
      }
    });
  }

  function loadWatchlist() {
    var watchlist = window.PlataWatchlist.get();
    if (watchlist.length === 0) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) emptyEl.style.display = '';
      if (groupsEl) groupsEl.innerHTML = '';
      if (disclaimerEl) disclaimerEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (loadingEl) loadingEl.style.display = '';

    var groups = groupByType(watchlist);
    var typeKeys = Object.keys(groups);
    var priceMap = {};
    var fetched = 0;
    var totalFetches = 0;

    // Determine unique API endpoints to fetch
    var apisToFetch = {};
    for (var i = 0; i < typeKeys.length; i++) {
      var api = API_MAP[typeKeys[i]];
      if (api && !apisToFetch[api]) {
        apisToFetch[api] = [];
        totalFetches++;
      }
      if (api) {
        apisToFetch[api] = apisToFetch[api].concat(groups[typeKeys[i]]);
      }
    }

    // For stocks, also try leading-equity
    if (totalFetches === 0) {
      // No APIs to fetch, just show names
      renderGroups(groups, priceMap);
      return;
    }

    var apiKeys = Object.keys(apisToFetch);
    for (var j = 0; j < apiKeys.length; j++) {
      (function(apiUrl, items) {
        var symbolSet = {};
        for (var k = 0; k < items.length; k++) {
          symbolSet[items[k].symbol] = true;
        }
        fetch(apiUrl)
          .then(function(r) { return r.json(); })
          .then(function(data) {
            var arr = Array.isArray(data) ? data : [];
            for (var m = 0; m < arr.length; m++) {
              if (symbolSet[arr[m].symbol]) {
                priceMap[arr[m].symbol] = arr[m];
              }
            }
          })
          .catch(function() {})
          .finally(function() {
            fetched++;
            if (fetched >= totalFetches) {
              renderGroups(groups, priceMap);
            }
          });
      })(apiKeys[j], apisToFetch[apiKeys[j]]);
    }
  }

  function renderGroups(groups, priceMap) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (!groupsEl) return;

    var typeOrder = ['stock', 'cedear', 'government_bond', 'corporate_bond', 'letra'];
    var html = '';
    for (var i = 0; i < typeOrder.length; i++) {
      if (groups[typeOrder[i]] && groups[typeOrder[i]].length > 0) {
        html += buildGroupHtml(typeOrder[i], groups[typeOrder[i]], priceMap);
      }
    }
    // Any remaining types not in typeOrder
    var keys = Object.keys(groups);
    for (var j = 0; j < keys.length; j++) {
      if (typeOrder.indexOf(keys[j]) === -1 && groups[keys[j]].length > 0) {
        html += buildGroupHtml(keys[j], groups[keys[j]], priceMap);
      }
    }

    groupsEl.innerHTML = html;
    injectStarButtons();
    if (disclaimerEl) disclaimerEl.style.display = '';

    if (updatedEl) {
      var now = new Date();
      updatedEl.textContent = 'Updated ' + now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Click row to navigate to stock page
  document.addEventListener('click', function(e) {
    var row = e.target.closest('[data-clickable][data-symbol]');
    if (row && !e.target.closest('.wl-star')) {
      var sym = row.getAttribute('data-symbol');
      window.location.href = stockUrl + '?s=' + encodeURIComponent(sym);
    }
  });

  // Reload when watchlist changes (item removed)
  document.addEventListener('watchlist-changed', function() {
    loadWatchlist();
  });

  loadWatchlist();

  // Auto-refresh prices every 30 seconds
  setInterval(loadWatchlist, 30000);
})();
