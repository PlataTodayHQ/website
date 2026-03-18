(function() {
  'use strict';

  var allCoins = [];
  var page = document.querySelector('[data-crypto-page]');
  var lang = page.getAttribute('data-lang');
  var i18nUpdated = page.getAttribute('data-i18n-updated') || '';
  var i18nCap = page.getAttribute('data-i18n-cap') || '';
  var i18nCoins = page.getAttribute('data-i18n-coins') || '';
  var i18nNoCoins = page.getAttribute('data-i18n-nocoins') || '';
  var i18nOthers = page.getAttribute('data-i18n-others') || '';
  var i18nExtremeFear = page.getAttribute('data-i18n-extremefear') || '';
  var i18nFear = page.getAttribute('data-i18n-fear') || '';
  var i18nNeutral = page.getAttribute('data-i18n-neutral') || '';
  var i18nGreed = page.getAttribute('data-i18n-greed') || '';
  var i18nExtremeGreed = page.getAttribute('data-i18n-extremegreed') || '';
  var i18nError = page.getAttribute('data-i18n-error') || '';
  var i18nRetry = page.getAttribute('data-i18n-retry') || '';
  var i18nCheckConn = page.getAttribute('data-i18n-checkconn') || '';
  var i18nTryDifferent = page.getAttribute('data-i18n-trydifferent') || '';

  // Platform-aware kbd labels
  if (!/Mac|iPhone|iPad/.test(navigator.platform || '')) {
    document.querySelectorAll('.search-kbd').forEach(function(el) { el.textContent = 'Ctrl K'; });
  }
  if ('ontouchstart' in window) {
    document.querySelectorAll('.search-kbd').forEach(function(el) { el.style.display = 'none'; });
  }

  var searchTerm = '';
  var sortKey = 'rank';
  var sortAsc = true;
  var currentCat = '';

  var CRYPTO_CATS = {
    'bitcoin': 'Store of Value', 'ethereum': 'L1', 'solana': 'L1',
    'cardano': 'L1', 'polkadot': 'L1', 'avalanche-2': 'L1',
    'near': 'L1', 'internet-computer': 'L1', 'aptos': 'L1', 'sui': 'L1',
    'cosmos': 'L1', 'algorand': 'L1', 'hedera-hashgraph': 'L1', 'toncoin': 'L1',
    'binancecoin': 'Exchange', 'okb': 'Exchange', 'crypto-com-chain': 'Exchange',
    'leo-token': 'Exchange', 'kucoin-shares': 'Exchange',
    'tether': 'Stablecoin', 'usd-coin': 'Stablecoin', 'dai': 'Stablecoin',
    'first-digital-usd': 'Stablecoin', 'true-usd': 'Stablecoin', 'ethena-usde': 'Stablecoin',
    'dogecoin': 'Meme', 'shiba-inu': 'Meme', 'pepe': 'Meme',
    'dogwifcoin': 'Meme', 'floki': 'Meme', 'bonk': 'Meme', 'brett': 'Meme',
    'uniswap': 'DeFi', 'aave': 'DeFi', 'maker': 'DeFi', 'jupiter-exchange-solana': 'DeFi',
    'lido-dao': 'DeFi', 'the-graph': 'DeFi', 'raydium': 'DeFi',
    'rocket-pool': 'DeFi', 'pancakeswap-token': 'DeFi', 'curve-dao-token': 'DeFi',
    'chainlink': 'Oracle', 'band-protocol': 'Oracle', 'pyth-network': 'Oracle',
    'matic-network': 'L2', 'arbitrum': 'L2', 'optimism': 'L2',
    'starknet': 'L2', 'mantle': 'L2', 'immutable-x': 'L2', 'polygon-ecosystem-token': 'L2',
    'ripple': 'Payments', 'litecoin': 'Payments', 'stellar': 'Payments', 'kaspa': 'Payments',
    'bitcoin-cash': 'Payments',
    'render-token': 'AI', 'fetch-ai': 'AI', 'bittensor': 'AI',
    'filecoin': 'Storage', 'arweave': 'Storage',
    'monero': 'Privacy', 'zcash': 'Privacy',
    'wrapped-bitcoin': 'Wrapped'
  };

  var CAT_COLORS = {
    'L1': { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', darkText: '#818cf8' },
    'L2': { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6', darkText: '#a78bfa' },
    'DeFi': { bg: 'rgba(16,185,129,0.12)', text: '#059669', darkText: '#34d399' },
    'Meme': { bg: 'rgba(251,146,60,0.12)', text: '#d97706', darkText: '#fbbf24' },
    'Store of Value': { bg: 'rgba(245,158,11,0.12)', text: '#b45309', darkText: '#fbbf24' },
    'Stablecoin': { bg: 'rgba(34,197,94,0.12)', text: '#16a34a', darkText: '#4ade80' },
    'Exchange': { bg: 'rgba(59,130,246,0.12)', text: '#2563eb', darkText: '#60a5fa' },
    'Oracle': { bg: 'rgba(168,85,247,0.12)', text: '#7c3aed', darkText: '#c084fc' },
    'Payments': { bg: 'rgba(6,182,212,0.12)', text: '#0891b2', darkText: '#22d3ee' },
    'AI': { bg: 'rgba(236,72,153,0.12)', text: '#db2777', darkText: '#f472b6' },
    'Storage': { bg: 'rgba(107,114,128,0.12)', text: '#4b5563', darkText: '#9ca3af' },
    'Privacy': { bg: 'rgba(75,85,99,0.12)', text: '#374151', darkText: '#9ca3af' },
    'Wrapped': { bg: 'rgba(245,158,11,0.08)', text: '#92400e', darkText: '#fbbf24' }
  };

  // Look up category by CoinGecko id or by symbol fallback
  function getCat(coin) {
    if (!coin) return '';
    // Try by id (CoinGecko provides this)
    var id = (coin.id || '').toLowerCase();
    if (CRYPTO_CATS[id]) return CRYPTO_CATS[id];
    // Fallback: match by name
    var name = (coin.name || '').toLowerCase().replace(/\s+/g, '-');
    if (CRYPTO_CATS[name]) return CRYPTO_CATS[name];
    return '';
  }

  function catBadgeHtml(cat) {
    if (!cat) return '';
    var c = CAT_COLORS[cat] || { bg: 'rgba(128,128,128,0.1)', text: '#6b7280', darkText: '#9ca3af' };
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var color = isDark ? c.darkText : c.text;
    return '<span class="cr-cat-badge" style="background:' + c.bg + ';color:' + color + '">' + cat + '</span>';
  }

  function setEl(sel, text) {
    var el = document.querySelector(sel);
    if (el) el.textContent = text;
  }

  function fmtPrice(n) {
    if (n == null) return '—';
    if (n >= 1) return '$' + n.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 0.01) return '$' + n.toLocaleString(lang, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return '$' + n.toLocaleString(lang, { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  }

  function fmtCap(n) {
    if (n == null) return '—';
    if (n >= 1e12) return '$' + (n / 1e12).toLocaleString(lang, { maximumFractionDigits: 2 }) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toLocaleString(lang, { maximumFractionDigits: 1 }) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toLocaleString(lang, { maximumFractionDigits: 1 }) + 'M';
    return '$' + n.toLocaleString(lang);
  }

  function fmtVol(n) {
    if (n == null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toLocaleString(lang, { maximumFractionDigits: 1 }) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toLocaleString(lang, { maximumFractionDigits: 1 }) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toLocaleString(lang, { maximumFractionDigits: 0 }) + 'K';
    return '$' + Math.round(n).toLocaleString(lang);
  }

  function fmtSupply(n, sym) {
    if (n == null) return '—';
    var v = n >= 1e9 ? (n / 1e9).toLocaleString(lang, { maximumFractionDigits: 2 }) + 'B' : n >= 1e6 ? (n / 1e6).toLocaleString(lang, { maximumFractionDigits: 1 }) + 'M' : n >= 1e3 ? (n / 1e3).toLocaleString(lang, { maximumFractionDigits: 0 }) + 'K' : Math.round(n).toLocaleString(lang);
    return v + ' ' + (sym || '');
  }

  function supplyCell(c) {
    var text = fmtSupply(c.circulatingSupply, c.symbol);
    if (c.maxSupply && c.circulatingSupply) {
      var pct = (c.circulatingSupply / c.maxSupply * 100).toFixed(0);
      return text + '<div class="cr-supply-bar"><div class="cr-supply-fill" style="width:' + pct + '%"></div></div>';
    }
    return text;
  }

  function pctHtml(val) {
    if (val == null) return '<span style="color:var(--color-text-meta)">—</span>';
    var cls = val >= 0 ? 'cr-up' : 'cr-down';
    var arrow = val >= 0 ? '▲' : '▼';
    return '<span class="cr-pct ' + cls + '">' + arrow + ' ' + Math.abs(val).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
  }

  function miniSparkline(data, up) {
    if (!data || data.length < 4) return '';
    var w = 80, h = 28;
    var min = Infinity, max = -Infinity;
    for (var i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    if (max === min) return '';
    var pts = [];
    for (var j = 0; j < data.length; j++) {
      var x = (j / (data.length - 1)) * w;
      var y = h - ((data[j] - min) / (max - min)) * h;
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    var color = up ? '#16a34a' : '#dc2626';
    return '<svg class="cr-spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline fill="none" stroke="' + color + '" stroke-width="1.5" points="' + pts.join(' ') + '"/></svg>';
  }

  function getFiltered() {
    var q = searchTerm.toLowerCase();
    var filtered = allCoins;
    if (currentCat) {
      filtered = filtered.filter(function(c) { return getCat(c) === currentCat; });
    }
    if (q) {
      filtered = filtered.filter(function(c) {
        return c.symbol.toLowerCase().indexOf(q) !== -1 ||
               (c.name && c.name.toLowerCase().indexOf(q) !== -1);
      });
    }
    filtered = filtered.slice().sort(function(a, b) {
      var va = a[sortKey], vb = b[sortKey];
      if (va == null) va = sortKey === 'name' ? 'zzz' : -Infinity;
      if (vb == null) vb = sortKey === 'name' ? 'zzz' : -Infinity;
      if (typeof va === 'string') {
        var cmp = va.localeCompare(vb);
        return sortAsc ? cmp : -cmp;
      }
      return sortAsc ? va - vb : vb - va;
    });
    return filtered;
  }

  function renderTable() {
    var filtered = getFiltered();
    var tbody = document.querySelector('[data-cr-tbody]');
    var cards = document.querySelector('[data-cr-cards]');
    setEl('[data-cr-count]', filtered.length + ' ' + i18nCoins);

    // Desktop table
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var c = filtered[i];
      var chg = c.change || 0;
      var cls = chg >= 0 ? 'cr-up' : 'cr-down';
      var arrow = chg >= 0 ? '▲' : '▼';
      var yahooSym = c.symbol + '-USD';
      var link = '/' + lang + '/markets/stock/' + encodeURIComponent(yahooSym);
      var imgHtml = c.image
        ? '<img class="cr-coin-img" src="' + c.image + '" alt="' + c.symbol + '" width="24" height="24" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
          + '<span class="cr-coin-icon" style="display:none">' + c.symbol.charAt(0) + '</span>'
        : '<span class="cr-coin-icon">' + c.symbol.charAt(0) + '</span>';

      var rDelay = Math.min(i * 15, 400);
      html += '<tr class="cr-row" style="animation-delay:' + rDelay + 'ms" onclick="window.location=\'' + link + '\'" tabindex="0" role="link" onkeydown="if(event.key===\'Enter\')window.location=\'' + link + '\'">';
      html += '<td class="cr-td cr-td--rank">' + c.rank + '</td>';
      var coinCat = getCat(c);
      html += '<td class="cr-td cr-td--name"><a href="' + link + '" class="cr-name-link">'
        + imgHtml
        + '<span class="cr-name-text"><strong class="cr-symbol">' + c.symbol + catBadgeHtml(coinCat) + '</strong><span class="cr-company">' + (c.name || '') + '</span></span>'
        + '</a></td>';
      var nearAthLabel = page.getAttribute('data-i18n-nearath') || 'Near ATH';
      var athBadge = (c.athChangePercentage != null && c.athChangePercentage > -10) ? '<span class="cr-ath-badge" title="' + nearAthLabel + ' (' + c.athChangePercentage.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%)">ATH</span>' : '';
      html += '<td class="cr-td cr-td--num">' + fmtPrice(c.price) + athBadge + '</td>';
      html += '<td class="cr-td cr-td--num">' + pctHtml(chg) + '</td>';
      html += '<td class="cr-td cr-td--num">' + pctHtml(c.change7d) + '</td>';
      html += '<td class="cr-td cr-td--num cr-td--hide-mobile">' + fmtCap(c.marketCap) + '</td>';
      html += '<td class="cr-td cr-td--num cr-td--hide-mobile">' + fmtVol(c.volume) + '</td>';
      html += '<td class="cr-td cr-td--num cr-td--hide-tablet">' + supplyCell(c) + '</td>';
      html += '<td class="cr-td cr-td--num cr-td--hide-tablet cr-td--spark">' + miniSparkline(c.sparkline, chg >= 0) + '</td>';
      html += '</tr>';
    }
    if (tbody) tbody.innerHTML = html || '<tr><td colspan="9">' + MktStates.buildEmptyState({ message: i18nNoCoins, query: searchTerm, hint: i18nTryDifferent }) + '</td></tr>';

    // Mobile cards
    var cardHtml = '';
    for (var j = 0; j < filtered.length; j++) {
      var co = filtered[j];
      var ch = co.change || 0;
      var cc = ch >= 0 ? 'cr-up' : 'cr-down';
      var ar = ch >= 0 ? '▲' : '▼';
      var ys = co.symbol + '-USD';
      var lk = '/' + lang + '/markets/stock/' + encodeURIComponent(ys);
      var border = ch >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
      var imgCard = co.image
        ? '<img class="cr-coin-img" src="' + co.image + '" alt="' + co.symbol + '" width="32" height="32" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
          + '<span class="cr-coin-icon cr-coin-icon--card" style="display:none">' + co.symbol.charAt(0) + '</span>'
        : '<span class="cr-coin-icon cr-coin-icon--card">' + co.symbol.charAt(0) + '</span>';

      var cDelay = Math.min(j * 25, 500);
      cardHtml += '<a href="' + lk + '" class="cr-card" style="border-inline-start-color:' + border + ';animation-delay:' + cDelay + 'ms">';
      cardHtml += '<div class="cr-card-header">';
      cardHtml += '<span class="cr-card-rank">' + co.rank + '</span>';
      cardHtml += imgCard;
      var cardCat = getCat(co);
      cardHtml += '<div class="cr-card-name"><strong>' + co.symbol + catBadgeHtml(cardCat) + '</strong><span class="cr-card-fullname">' + (co.name || '') + '</span></div>';
      cardHtml += '<span class="cr-pct ' + cc + '">' + ar + ' ' + Math.abs(ch).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
      cardHtml += '</div>';
      cardHtml += '<div class="cr-card-body">';
      cardHtml += '<span class="cr-card-price">' + fmtPrice(co.price) + '</span>';
      if (co.change7d != null) {
        var c7cls = co.change7d >= 0 ? 'cr-up' : 'cr-down';
        var c7ar = co.change7d >= 0 ? '▲' : '▼';
        cardHtml += '<span class="cr-pct cr-pct--sm ' + c7cls + '">7d ' + c7ar + ' ' + Math.abs(co.change7d).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span>';
      }
      cardHtml += '<span class="cr-card-meta">' + i18nCap + ' ' + fmtCap(co.marketCap) + '</span>';
      cardHtml += '</div>';
      cardHtml += '</a>';
    }
    if (cards) cards.innerHTML = cardHtml || MktStates.buildEmptyState({ message: i18nNoCoins, query: searchTerm, hint: i18nTryDifferent });
  }

  // Sorting
  document.querySelectorAll('[data-sort]').forEach(function(th) {
    if (!th.classList.contains('cr-th--spark')) {
      th.setAttribute('tabindex', '0');
      th.setAttribute('role', 'columnheader');
      th.setAttribute('aria-sort', th.classList.contains('cr-th--active') ? 'ascending' : 'none');
    }
    function doSort() {
      var key = th.getAttribute('data-sort');
      if (sortKey === key) { sortAsc = !sortAsc; }
      else { sortKey = key; sortAsc = key === 'name' ? true : (key === 'rank' ? true : false); }
      document.querySelectorAll('[data-sort]').forEach(function(h) {
        h.classList.remove('cr-th--active');
        h.removeAttribute('data-dir');
        h.setAttribute('aria-sort', 'none');
      });
      th.classList.add('cr-th--active');
      th.setAttribute('data-dir', sortAsc ? 'asc' : 'desc');
      th.setAttribute('aria-sort', sortAsc ? 'ascending' : 'descending');
      renderTable();
    }
    th.addEventListener('click', doSort);
    th.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doSort(); }
    });
  });

  // Search
  var searchInput = document.querySelector('[data-cr-search]');
  var searchTimer;
  searchInput.addEventListener('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() {
      searchTerm = searchInput.value.trim();
      renderTable();
    }, 200);
  });

  // Load data
  function renderOverview(coins) {
    var totalMcap = 0, totalVol = 0;
    var top5 = [];
    for (var i = 0; i < coins.length; i++) {
      totalMcap += coins[i].marketCap || 0;
      totalVol += coins[i].volume || 0;
    }
    // Top 5 by market cap for dominance
    var sorted = coins.slice().sort(function(a,b) { return (b.marketCap||0) - (a.marketCap||0); });
    for (var j = 0; j < Math.min(5, sorted.length); j++) {
      if (sorted[j].marketCap > 0) top5.push(sorted[j]);
    }
    setEl('[data-cr-total-mcap]', totalMcap > 0 ? fmtCap(totalMcap) : '—');
    setEl('[data-cr-total-vol]', totalVol > 0 ? fmtVol(totalVol) : '—');
    if (top5.length > 0 && totalMcap > 0) {
      var btcDom = top5[0].symbol === 'BTC' ? (top5[0].marketCap / totalMcap * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%' : '—';
      setEl('[data-cr-btc-dom]', btcDom);

      // Dominance bar
      var barEl = document.querySelector('[data-cr-dom-bar]');
      var legEl = document.querySelector('[data-cr-dom-legend]');
      var colors = ['#f7931a','#627eea','#26a17b','#f3ba2f','#8247e5'];
      var barHtml = '', legHtml = '';
      var othPct = 100;
      for (var k = 0; k < top5.length; k++) {
        var pct = (top5[k].marketCap / totalMcap * 100);
        othPct -= pct;
        barHtml += '<div class="cr-dom-seg" style="width:' + pct.toFixed(1) + '%;background:' + colors[k] + '" title="' + top5[k].symbol + ' ' + pct.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%"></div>';
        legHtml += '<span class="cr-dom-leg"><span class="cr-dom-dot" style="background:' + colors[k] + '"></span>' + top5[k].symbol + ' ' + pct.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span>';
      }
      if (othPct > 0.5) {
        barHtml += '<div class="cr-dom-seg" style="width:' + othPct.toFixed(1) + '%;background:var(--color-text-meta);opacity:0.3"></div>';
        legHtml += '<span class="cr-dom-leg"><span class="cr-dom-dot" style="background:var(--color-text-meta)"></span>' + i18nOthers + ' ' + othPct.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span>';
      }
      if (barEl) barEl.innerHTML = barHtml;
      if (legEl) legEl.innerHTML = legHtml;
    }
    var ov = document.querySelector('[data-cr-overview]');
    if (ov) ov.style.display = '';
  }

  function renderMovers(coins) {
    var moversEl = document.querySelector('[data-cr-movers]');
    var gainersEl = document.querySelector('[data-cr-gainers]');
    var losersEl = document.querySelector('[data-cr-losers]');
    if (!moversEl || !gainersEl || !losersEl) return;

    var withChange = coins.filter(function(c) { return c.change != null; });
    var sorted = withChange.slice().sort(function(a, b) { return (b.change || 0) - (a.change || 0); });
    var gainers = sorted.slice(0, 3);
    var losers = sorted.slice(-3).reverse();

    function moverCard(c, isGainer) {
      var ch = c.change || 0;
      var cls = isGainer ? 'cr-mv-card--up' : 'cr-mv-card--down';
      var arrow = ch >= 0 ? '▲' : '▼';
      var yahooSym = c.symbol + '-USD';
      var link = '/' + lang + '/markets/stock/' + encodeURIComponent(yahooSym);
      var imgH = c.image
        ? '<img class="cr-mv-img" src="' + c.image + '" alt="' + c.symbol + '" width="28" height="28" loading="lazy" onerror="this.style.display=\'none\'">'
        : '';
      return '<a href="' + link + '" class="cr-mv-card ' + cls + '">'
        + '<div class="cr-mv-left">' + imgH + '<div class="cr-mv-info"><strong>' + c.symbol + '</strong><span>' + (c.name || '') + '</span></div></div>'
        + '<div class="cr-mv-right"><span class="cr-mv-price">' + fmtPrice(c.price) + '</span>'
        + '<span class="cr-mv-chg">' + arrow + ' ' + Math.abs(ch).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span></div>'
        + '</a>';
    }

    var gHtml = '', lHtml = '';
    for (var i = 0; i < gainers.length; i++) gHtml += moverCard(gainers[i], true);
    for (var j = 0; j < losers.length; j++) lHtml += moverCard(losers[j], false);
    // Keep title, append cards
    var gTitle = gainersEl.querySelector('.cr-movers-title');
    var lTitle = losersEl.querySelector('.cr-movers-title');
    gainersEl.innerHTML = (gTitle ? gTitle.outerHTML : '') + gHtml;
    losersEl.innerHTML = (lTitle ? lTitle.outerHTML : '') + lHtml;
    moversEl.style.display = '';
  }

  function renderPerf7d(coins) {
    var perf = coins.filter(function(c) { return c.change7d != null; }).slice(0, 15);
    if (perf.length < 3) return;
    // Sort by 7d change descending
    perf.sort(function(a, b) { return (b.change7d || 0) - (a.change7d || 0); });
    var maxAbs = 0;
    for (var i = 0; i < perf.length; i++) {
      var abs = Math.abs(perf[i].change7d || 0);
      if (abs > maxAbs) maxAbs = abs;
    }
    if (maxAbs < 0.1) maxAbs = 1;
    var chart = document.querySelector('[data-cr-perf7d-chart]');
    if (!chart) return;
    var html = '';
    for (var j = 0; j < perf.length; j++) {
      var c = perf[j];
      var v = c.change7d || 0;
      var barW = (Math.abs(v) / maxAbs * 45).toFixed(1);
      var isPos = v >= 0;
      var color = isPos ? '#16a34a' : '#dc2626';
      var imgH = c.image
        ? '<img src="' + c.image + '" alt="" role="presentation" width="18" height="18" style="border-radius:50%" loading="lazy" onerror="this.style.display=\'none\'">'
        : '';
      html += '<div class="cr-p7-row">';
      html += '<div class="cr-p7-coin">' + imgH + '<span class="cr-p7-sym">' + c.symbol + '</span></div>';
      html += '<div class="cr-p7-bar-wrap">';
      if (isPos) {
        html += '<div class="cr-p7-left"></div>';
        html += '<div class="cr-p7-center"></div>';
        html += '<div class="cr-p7-right"><div class="cr-p7-fill" style="width:' + barW + '%;background:' + color + '"></div></div>';
      } else {
        html += '<div class="cr-p7-left"><div class="cr-p7-fill cr-p7-fill--neg" style="width:' + barW + '%;background:' + color + '"></div></div>';
        html += '<div class="cr-p7-center"></div>';
        html += '<div class="cr-p7-right"></div>';
      }
      html += '</div>';
      html += '<span class="cr-p7-val" style="color:' + color + '">' + (v >= 0 ? '+' : '') + v.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
      html += '</div>';
    }
    chart.innerHTML = html;
    document.querySelector('[data-cr-perf7d]').style.display = '';
  }

  function renderLiquidity(coins) {
    var items = coins.filter(function(c) { return c.volume > 0 && c.marketCap > 0; })
      .map(function(c) {
        return { symbol: c.symbol, name: c.name, image: c.image, ratio: c.volume / c.marketCap, volume: c.volume, mcap: c.marketCap };
      })
      .sort(function(a, b) { return b.ratio - a.ratio; })
      .slice(0, 10);
    if (items.length < 3) return;

    var maxRatio = items[0].ratio;
    var grid = document.querySelector('[data-cr-liq-grid]');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var pct = (it.ratio / maxRatio * 100).toFixed(1);
      var ratioPct = (it.ratio * 100).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2});
      var level = it.ratio > 0.3 ? 'high' : it.ratio > 0.1 ? 'mid' : 'low';
      var color = level === 'high' ? '#16a34a' : level === 'mid' ? '#f59e0b' : '#6b7280';
      var imgH = it.image
        ? '<img src="' + it.image + '" alt="" role="presentation" width="18" height="18" style="border-radius:50%" loading="lazy" onerror="this.style.display=\'none\'">'
        : '';
      html += '<div class="cr-liq-row">';
      html += '<div class="cr-liq-coin">' + imgH + '<span class="cr-liq-sym">' + it.symbol + '</span></div>';
      html += '<div class="cr-liq-bar-wrap"><div class="cr-liq-bar" style="width:' + pct + '%;background:' + color + '"></div></div>';
      html += '<span class="cr-liq-val" style="color:' + color + '">' + ratioPct + '%</span>';
      html += '</div>';
    }
    grid.innerHTML = html;
    document.querySelector('[data-cr-liquidity]').style.display = '';
  }

  function renderAthDistance(coins) {
    var items = coins.filter(function(c) { return c.athChangePercentage != null && c.marketCap > 0; })
      .sort(function(a, b) { return b.athChangePercentage - a.athChangePercentage; })
      .slice(0, 10);
    if (items.length < 5) return;

    var grid = document.querySelector('[data-cr-ath-grid]');
    if (!grid) return;

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var c = items[i];
      var pct = c.athChangePercentage;
      var recovered = 100 + pct; // how much of ATH price recovered (e.g., -20% = 80% recovered)
      var barW = Math.max(recovered, 2).toFixed(1);
      var color = recovered >= 90 ? '#16a34a' : recovered >= 60 ? '#f59e0b' : '#dc2626';
      var imgH = c.image ? '<img src="' + c.image + '" alt="" role="presentation" width="18" height="18" style="border-radius:50%" loading="lazy" onerror="this.style.display=\'none\'">' : '';
      html += '<div class="cr-ath-row">';
      html += '<div class="cr-ath-coin">' + imgH + '<span class="cr-ath-sym">' + c.symbol + '</span></div>';
      html += '<div class="cr-ath-bar-wrap"><div class="cr-ath-bar" style="width:' + barW + '%;background:' + color + '"></div></div>';
      html += '<span class="cr-ath-val" style="color:' + color + '">' + pct.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span>';
      html += '</div>';
    }
    grid.innerHTML = html;
    document.querySelector('[data-cr-ath]').style.display = '';
  }

  function renderSupplyPressure(coins) {
    var items = coins.filter(function(c) {
      return c.circulatingSupply > 0 && c.maxSupply > 0 && c.maxSupply > c.circulatingSupply;
    }).map(function(c) {
      var pct = (c.circulatingSupply / c.maxSupply * 100);
      var remaining = c.maxSupply - c.circulatingSupply;
      return { symbol: c.symbol, name: c.name, image: c.image, pct: pct, remaining: remaining, maxSupply: c.maxSupply, circulating: c.circulatingSupply };
    }).sort(function(a, b) { return b.pct - a.pct; }).slice(0, 12);
    if (items.length < 3) return;

    var grid = document.querySelector('[data-cr-supply-grid]');
    if (!grid) return;
    var cpg = document.querySelector('[data-crypto-page]');
    var lblScarce = (cpg && cpg.getAttribute('data-i18n-scarce')) || 'Scarce';
    var lblModerate = (cpg && cpg.getAttribute('data-i18n-moderate')) || 'Moderate';
    var lblAbundant = (cpg && cpg.getAttribute('data-i18n-abundant')) || 'Abundant';
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var color = it.pct >= 90 ? '#dc2626' : it.pct >= 70 ? '#f59e0b' : '#16a34a';
      var label = it.pct >= 90 ? lblScarce : it.pct >= 70 ? lblModerate : lblAbundant;
      var imgH = it.image ? '<img src="' + it.image + '" alt="" role="presentation" width="18" height="18" style="border-radius:50%" loading="lazy" onerror="this.style.display=\'none\'">' : '';
      html += '<div class="cr-sp-row">';
      html += '<div class="cr-sp-coin">' + imgH + '<span class="cr-sp-sym">' + it.symbol + '</span></div>';
      html += '<div class="cr-sp-bar-wrap"><div class="cr-sp-bar" style="width:' + it.pct.toFixed(1) + '%;background:' + color + '"></div></div>';
      html += '<div class="cr-sp-meta"><span class="cr-sp-pct" style="color:' + color + '">' + it.pct.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span><span class="cr-sp-label">' + label + '</span></div>';
      html += '</div>';
    }
    grid.innerHTML = html;
    document.querySelector('[data-cr-supply]').style.display = '';
  }

  function renderTreemap(coins) {
    var items = coins.filter(function(c) { return c.marketCap > 0; })
      .sort(function(a, b) { return b.marketCap - a.marketCap; })
      .slice(0, 20);
    if (items.length < 5) return;

    var totalMcap = 0;
    for (var i = 0; i < items.length; i++) totalMcap += items[i].marketCap;

    var grid = document.querySelector('[data-cr-treemap-grid]');
    if (!grid) return;

    var html = '';
    for (var j = 0; j < items.length; j++) {
      var c = items[j];
      var pct = (c.marketCap / totalMcap * 100);
      var chg = c.change || 0;
      var bgColor = chg >= 0 ? 'rgba(22,163,74,' + Math.min(0.15 + Math.abs(chg) * 0.03, 0.6) + ')' : 'rgba(220,38,38,' + Math.min(0.15 + Math.abs(chg) * 0.03, 0.6) + ')';
      var borderColor = chg >= 0 ? 'rgba(22,163,74,0.4)' : 'rgba(220,38,38,0.4)';
      var flex = Math.max(pct, 2).toFixed(2);
      var imgH = c.image ? '<img src="' + c.image + '" alt="" role="presentation" width="16" height="16" style="border-radius:50%" loading="lazy" onerror="this.style.display=\'none\'">' : '';
      var link = '/' + lang + '/markets/stock/' + encodeURIComponent(c.symbol + '-USD');
      html += '<a href="' + link + '" class="cr-tm-cell" style="flex:' + flex + ';background:' + bgColor + ';border-color:' + borderColor + '">';
      html += '<div class="cr-tm-top">' + imgH + '<strong>' + c.symbol + '</strong></div>';
      html += '<span class="cr-tm-pct">' + (chg >= 0 ? '+' : '') + chg.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span>';
      html += '<span class="cr-tm-mcap">' + fmtCap(c.marketCap) + '</span>';
      html += '</a>';
    }
    grid.innerHTML = html;
    document.querySelector('[data-cr-treemap]').style.display = '';
  }

  function onData(coins) {
    allCoins = coins;
    var loadingEl = document.querySelector('[data-cr-loading]');
    if (loadingEl) loadingEl.style.display = 'none';
    var overviewSkeleton = document.querySelector('[data-cr-overview-skeleton]');
    if (overviewSkeleton) overviewSkeleton.style.display = 'none';
    var crUpdEl = document.querySelector('[data-mkts-updated]');
    if (crUpdEl) crUpdEl.innerHTML = '<span class="live-dot"></span>' + i18nUpdated + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    renderOverview(coins);
    renderMovers(coins);
    renderPerf7d(coins);
    renderLiquidity(coins);
    renderAthDistance(coins);
    renderSupplyPressure(coins);
    renderTreemap(coins);
    renderCatChips(coins);
    renderTable();
  }

  function renderCatChips(coins) {
    var chipsEl = document.querySelector('[data-cr-cat-chips]');
    if (!chipsEl) return;
    var catCounts = {};
    for (var i = 0; i < coins.length; i++) {
      var cat = getCat(coins[i]);
      if (cat) {
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      }
    }
    var cats = Object.keys(catCounts).sort(function(a, b) { return catCounts[b] - catCounts[a]; });
    if (cats.length < 2) return;
    var allActive = !currentCat ? ' cr-cat-chip--active' : '';
    var html = '<button class="cr-cat-chip' + allActive + '" data-cat-chip="">All</button>';
    for (var j = 0; j < cats.length; j++) {
      var c = cats[j];
      var active = currentCat === c ? ' cr-cat-chip--active' : '';
      var cc = CAT_COLORS[c] || { bg: 'rgba(128,128,128,0.1)', text: '#6b7280', darkText: '#9ca3af' };
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      var dotColor = isDark ? cc.darkText : cc.text;
      html += '<button class="cr-cat-chip' + active + '" data-cat-chip="' + c + '"><span class="cr-cat-chip-dot" style="background:' + dotColor + '"></span>' + c + ' <span class="cr-cat-chip-count">' + catCounts[c] + '</span></button>';
    }
    chipsEl.innerHTML = html;
    chipsEl.style.display = '';
    chipsEl.querySelectorAll('.cr-cat-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        currentCat = chip.getAttribute('data-cat-chip');
        chipsEl.querySelectorAll('.cr-cat-chip').forEach(function(c) { c.classList.remove('cr-cat-chip--active'); });
        chip.classList.add('cr-cat-chip--active');
        renderTable();
      });
    });
  }

  // Client-side CoinGecko fallback
  function fetchCoinGeckoDirect() {
    return fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=7d')
      .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(raw) {
        return raw.map(function(coin, i) {
          return {
            rank: i + 1,
            symbol: (coin.symbol || '').toUpperCase(),
            name: coin.name,
            price: coin.current_price,
            change: coin.price_change_percentage_24h,
            change7d: coin.price_change_percentage_7d_in_currency,
            marketCap: coin.market_cap,
            volume: coin.total_volume,
            circulatingSupply: coin.circulating_supply || null,
            maxSupply: coin.max_supply || null,
            athChangePercentage: coin.ath_change_percentage || null,
            image: coin.image,
            sparkline: coin.sparkline_in_7d ? coin.sparkline_in_7d.price : null,
            id: coin.id || '',
          };
        });
      });
  }

  // Client-side Binance fallback (top coins only)
  function fetchBinanceDirect() {
    return fetch('https://api.binance.com/api/v3/ticker/24hr')
      .then(function(r) { return r.json(); })
      .then(function(raw) {
        var usdtPairs = raw.filter(function(t) {
          return t.symbol.endsWith('USDT') && parseFloat(t.quoteVolume) > 1000000;
        });
        usdtPairs.sort(function(a, b) { return parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume); });
        return usdtPairs.slice(0, 100).map(function(t, i) {
          var sym = t.symbol.replace('USDT', '');
          return {
            rank: i + 1,
            symbol: sym,
            name: sym,
            price: parseFloat(t.lastPrice),
            change: parseFloat(t.priceChangePercent),
            marketCap: null,
            volume: parseFloat(t.quoteVolume),
            image: null,
          };
        });
      });
  }

  // Fear & Greed Index
  function fgLabel(val) {
    if (val <= 24) return i18nExtremeFear;
    if (val <= 44) return i18nFear;
    if (val <= 55) return i18nNeutral;
    if (val <= 74) return i18nGreed;
    return i18nExtremeGreed;
  }

  function fgClass(val) {
    if (val <= 24) return 'exfear';
    if (val <= 44) return 'fear';
    if (val <= 55) return 'neutral';
    if (val <= 74) return 'greed';
    return 'exgreed';
  }

  function renderFearGreed(val) {
    var card = document.querySelector('[data-cr-fg-card]');
    var needle = document.querySelector('[data-cr-fg-needle]');
    var valEl = document.querySelector('[data-cr-fg-val]');
    var labelEl = document.querySelector('[data-cr-fg-label]');
    if (!card || !needle || !valEl || !labelEl) return;
    valEl.textContent = val;
    labelEl.textContent = fgLabel(val);
    labelEl.className = 'cr-fg-label cr-fg-label--' + fgClass(val);
    var angle = -90 + (val / 100) * 180;
    needle.style.setProperty('--fg-needle-angle', angle + 'deg');
    needle.classList.add('cr-fg-needle-animate');
    card.style.display = '';
  }

  fetch('https://api.alternative.me/fng/?limit=1')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d && d.data && d.data[0]) renderFearGreed(parseInt(d.data[0].value));
    })
    .catch(function() {});

  fetch('/api/crypto?limit=100')
    .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(data) {
      if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
      onData(data);
    })
    .catch(function() {
      fetchCoinGeckoDirect()
        .then(onData)
        .catch(function() {
          fetchBinanceDirect()
            .then(onData)
            .catch(function() {
              var ld = document.querySelector('[data-cr-loading]');
              if (ld) ld.style.display = 'none';
              var os = document.querySelector('[data-cr-overview-skeleton]');
              if (os) os.style.display = 'none';
              var updEl = document.querySelector('[data-mkts-updated]');
              if (updEl) updEl.textContent = '—';
              // Show error card in the table area
              var tableWrap = document.querySelector('[data-cr-tbody]');
              if (tableWrap) {
                tableWrap.closest('table').insertAdjacentHTML('afterend', MktStates.buildErrorCard({ message: i18nError, hint: i18nCheckConn, retryLabel: i18nRetry }));
                tableWrap.closest('table').style.display = 'none';
              }
            });
        });
    });
  // Keyboard shortcut: / to focus search, Esc to clear
  document.addEventListener('keydown', function(e) {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      var s = document.querySelector('[data-cr-search]');
      if (s) s.focus();
    }
    if (e.key === 'Escape') {
      var s = document.querySelector('[data-cr-search]');
      if (s && document.activeElement === s) {
        s.blur(); s.value = ''; searchTerm = ''; renderTable();
      }
    }
  });

  // Ctrl/Cmd+K to focus search
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      var si = document.querySelector('[data-cr-search]');
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
  // Add countdown span next to updated text
  var updatedEl = document.querySelector('[data-mkts-updated]');
  if (updatedEl && !updatedEl.querySelector('.refresh-countdown')) {
    var cdSpan = document.createElement('span');
    cdSpan.className = 'refresh-countdown';
    cdSpan.textContent = '(' + fmtCountdown(refreshRemaining) + ')';
    updatedEl.appendChild(document.createTextNode(' '));
    updatedEl.appendChild(cdSpan);
  }
  setInterval(tickCountdown, 1000);
})();
