/**
 * PlataMarketTicker — live market data ticker strip.
 *
 * Fetches rates, merval, stocks, commodities, crypto and renders them
 * in the ticker bar. Uses localStorage caching for instant loads.
 *
 * Usage: <script src="/js/market-ticker.js"></script>
 */
(function() {
  'use strict';

  var CACHE_KEY = 'plata-market-v7';
  var RATES_URL = '/api/rates';
  var EVO_URL = 'https://api.bluelytics.com.ar/v2/evolution.json?days=10';
  var MERVAL_URL = '/api/merval';
  var SCREENER_URL = '/api/screener';
  var COMMODITIES_URL = '/api/commodities';
  var CRYPTO_URL = '/api/crypto';
  var REFRESH_MS = 5 * 60 * 1000;
  var lastFetchTime = 0;

  var lang = document.documentElement.lang || 'en';

  var CRYPTO_YAHOO = {
    BTC: 'BTC-USD', ETH: 'ETH-USD', XRP: 'XRP-USD', BNB: 'BNB-USD',
    SOL: 'SOL-USD', ADA: 'ADA-USD', DOGE: 'DOGE-USD', TRX: 'TRX-USD',
    AVAX: 'AVAX-USD', LINK: 'LINK-USD'
  };

  function pct(current, previous) {
    if (!previous || previous === 0) return null;
    var p = ((current - previous) / previous) * 100;
    if (Math.abs(p) < 0.01) return null;
    return p;
  }

  function formatARS(val) {
    return Math.round(val).toLocaleString('es-AR');
  }

  function formatMerval(val) {
    if (val >= 1000000) return (val / 1000000).toFixed(2) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
    return Math.round(val).toLocaleString('es-AR');
  }

  function formatUSD(val) {
    if (val >= 10000) return Math.round(val).toLocaleString('en-US');
    if (val >= 1000) return val.toFixed(0);
    if (val >= 1) return val.toFixed(2);
    return val.toFixed(4);
  }

  function cleanSymbol(sym) {
    return (sym || '').replace(/\.BA$/i, '').trim();
  }

  function applyItem(key, displayText, percent) {
    var el = document.querySelector('[data-tv="' + key + '"]');
    var chEl = document.querySelector('[data-tc="' + key + '"]');
    if (!el || !chEl) return;

    el.textContent = displayText;

    if (percent != null) {
      var sign = percent > 0 ? '+' : '';
      var arrow = percent > 0 ? '\u25B2' : percent < 0 ? '\u25BC' : '';
      chEl.textContent = arrow + ' ' + sign + percent.toFixed(2) + '%';
      chEl.className = 'ticker-change ' + (percent >= 0 ? 'ticker-up' : 'ticker-down');
    } else {
      chEl.textContent = '';
      chEl.className = 'ticker-change';
    }
  }

  function createTickerItem(key, label, href, nameClass) {
    var a = document.createElement('a');
    a.href = href;
    a.className = 'ticker-item';
    a.setAttribute('data-ticker', key);
    a.innerHTML =
      '<span class="ticker-name' + (nameClass ? ' ' + nameClass : '') + '">' + label + '</span>' +
      '<span class="ticker-row">' +
        '<span class="ticker-price" data-tv="' + key + '">---</span>' +
        '<span class="ticker-change" data-tc="' + key + '"></span>' +
      '</span>';
    return a;
  }

  function stockUrl(sym) {
    return '/' + lang + '/markets/stock/' + encodeURIComponent(sym);
  }

  var stocksBuilt = false;
  var commoditiesBuilt = false;
  var cryptoBuilt = false;

  function buildStocks(stocks) {
    if (stocksBuilt) return;
    var container = document.getElementById('stocks-container');
    if (!container) return;
    var top10 = stocks.slice(0, 10);
    for (var i = 0; i < top10.length; i++) {
      var s = top10[i];
      var sym = cleanSymbol(s.symbol);
      var key = 'stock-' + sym;
      container.appendChild(createTickerItem(key, sym, stockUrl(sym), 'ticker-name--stock'));
    }
    stocksBuilt = true;
  }

  function buildCommodities(commodities) {
    if (commoditiesBuilt) return;
    var container = document.getElementById('commodities-container');
    if (!container) return;
    for (var i = 0; i < commodities.length; i++) {
      var c = commodities[i];
      var key = 'comm-' + c.symbol.replace('=', '');
      container.appendChild(createTickerItem(key, c.name, stockUrl(c.symbol), 'ticker-name--commodity'));
    }
    commoditiesBuilt = true;
  }

  function buildCrypto(cryptos) {
    if (cryptoBuilt) return;
    var container = document.getElementById('crypto-container');
    if (!container) return;
    for (var i = 0; i < cryptos.length; i++) {
      var c = cryptos[i];
      var key = 'crypto-' + c.symbol;
      var yahooSym = CRYPTO_YAHOO[c.symbol] || (c.symbol + '-USD');
      container.appendChild(createTickerItem(key, c.symbol, stockUrl(yahooSym), 'ticker-name--crypto'));
    }
    cryptoBuilt = true;
  }

  function render(data) {
    if (data.oficial) applyItem('oficial', formatARS(data.oficial), data.oficialPct);
    if (data.blue) applyItem('blue', formatARS(data.blue), data.bluePct);
    if (data.mep) applyItem('mep', formatARS(data.mep), data.mepPct);
    if (data.ccl) applyItem('ccl', formatARS(data.ccl), data.cclPct);
    if (data.merval) applyItem('merval', formatMerval(data.merval), data.mervalPct);

    if (data.stocks && data.stocks.length) {
      buildStocks(data.stocks);
      for (var i = 0; i < data.stocks.length; i++) {
        var s = data.stocks[i];
        var sym = cleanSymbol(s.symbol);
        applyItem('stock-' + sym, formatARS(s.price), s.change != null ? s.change * 100 : null);
      }
    }

    if (data.commodities && data.commodities.length) {
      buildCommodities(data.commodities);
      for (var i = 0; i < data.commodities.length; i++) {
        var c = data.commodities[i];
        applyItem('comm-' + c.symbol.replace('=', ''), '$' + formatUSD(c.price), c.change);
      }
    }

    if (data.cryptos && data.cryptos.length) {
      buildCrypto(data.cryptos);
      for (var i = 0; i < data.cryptos.length; i++) {
        var c = data.cryptos[i];
        applyItem('crypto-' + c.symbol, '$' + formatUSD(c.price), c.change);
      }
    }
  }

  function loadCached() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveCache(data) {
    try {
      data.ts = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function parseEvolution(entries) {
    var bySource = {};
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var key = e.source.toLowerCase();
      if (!bySource[key]) bySource[key] = [];
      bySource[key].push(e);
    }
    function sortDesc(a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }
    var result = {};
    var sources = ['oficial', 'blue'];
    for (var s = 0; s < sources.length; s++) {
      var arr = bySource[sources[s]];
      if (arr && arr.length > 0) {
        arr.sort(sortDesc);
        result[sources[s]] = { current: arr[0].value_sell };
        if (arr.length > 1) result[sources[s]].previous = arr[1].value_sell;
      }
    }
    return result;
  }

  function fetchJson(url) {
    return fetch(url).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
  }

  function fetchAll() {
    var now = Date.now();
    if (now - lastFetchTime < 60000) return;
    lastFetchTime = now;

    var cached = loadCached() || {};

    Promise.all([
      fetchJson(RATES_URL),
      fetchJson(EVO_URL),
      fetchJson(MERVAL_URL),
      fetchJson(SCREENER_URL),
      fetchJson(COMMODITIES_URL),
      fetchJson(CRYPTO_URL)
    ]).then(function(results) {
      var rates = results[0];
      var evo = results[1];
      var mervalData = results[2];
      var screenerData = results[3];
      var commoditiesData = results[4];
      var cryptoData = results[5];

      var data = {
        oficial: cached.oficial || null, oficialPct: cached.oficialPct || null,
        blue: cached.blue || null, bluePct: cached.bluePct || null,
        mep: cached.mep || null, mepPct: cached.mepPct || null,
        ccl: cached.ccl || null, cclPct: cached.cclPct || null,
        merval: cached.merval || null, mervalPct: cached.mervalPct || null,
        stocks: cached.stocks || null,
        commodities: cached.commodities || null,
        cryptos: cached.cryptos || null
      };

      if (rates && rates.oficial) {
        data.oficial = rates.oficial.value_sell;
        data.blue = rates.blue ? rates.blue.value_sell : null;
        if (evo && evo.length > 0) {
          var parsed = parseEvolution(evo);
          if (parsed.oficial && parsed.oficial.previous) data.oficialPct = pct(data.oficial, parsed.oficial.previous);
          if (parsed.blue && parsed.blue.previous) data.bluePct = pct(data.blue, parsed.blue.previous);
        }
      }

      if (rates && rates.mep) { data.mep = rates.mep.value_sell; data.mepPct = null; }
      if (rates && rates.ccl) { data.ccl = rates.ccl.value_sell; data.cclPct = null; }

      if (mervalData && mervalData.price) {
        data.merval = mervalData.price;
        data.mervalPct = mervalData.variation != null
          ? mervalData.variation * 100
          : pct(mervalData.price, mervalData.previousClose);
      }

      if (screenerData && Array.isArray(screenerData) && screenerData.length) {
        data.stocks = screenerData.slice(0, 10).map(function(s) {
          return { symbol: cleanSymbol(s.symbol), name: s.name || s.symbol, price: s.price, change: s.change };
        });
      }

      if (commoditiesData && Array.isArray(commoditiesData) && commoditiesData.length) data.commodities = commoditiesData;
      if (cryptoData && Array.isArray(cryptoData) && cryptoData.length) data.cryptos = cryptoData;

      render(data);
      saveCache(data);
    }).catch(function(err) { console.warn('[PlataMarketTicker] fetch error:', err); });
  }

  // 1. Show cached immediately
  var cached = loadCached();
  if (cached) render(cached);

  // 2. Fetch live
  fetchAll();

  // 3. Auto-refresh
  setInterval(fetchAll, REFRESH_MS);

  // 4. Refresh on tab return
  document.addEventListener('visibilitychange', function() { if (!document.hidden) fetchAll(); });

  // 5. Refresh on focus
  window.addEventListener('focus', fetchAll);
})();
