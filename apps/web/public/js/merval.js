// Mobile filter drawer
(function() {
  var fab = document.querySelector('[data-filter-fab]');
  var drawer = document.querySelector('[data-filter-drawer]');
  var backdrop = document.querySelector('[data-filter-backdrop]');
  var closeBtn = document.querySelector('[data-filter-drawer-close]');
  var drawerChips = document.querySelector('[data-drawer-chips]');
  var sectorChips = document.querySelector('[data-sector-chips]');
  if (!fab || !drawer || !backdrop || !sectorChips) return;

  function openDrawer() {
    // Clone current sector chips into drawer
    drawerChips.innerHTML = '';
    sectorChips.querySelectorAll('.sector-chip, [data-sector-filter]').forEach(function(chip) {
      var clone = chip.cloneNode(true);
      clone.addEventListener('click', function() {
        chip.click();
        // Update active states in drawer
        setTimeout(syncDrawer, 50);
        closeDrawer();
      });
      drawerChips.appendChild(clone);
    });
    drawer.classList.add('mv-filter-drawer--open');
    backdrop.classList.add('mv-filter-backdrop--visible');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('mv-filter-drawer--open');
    backdrop.classList.remove('mv-filter-backdrop--visible');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function syncDrawer() {
    // Update FAB count
    var active = sectorChips.querySelector('.sector-chip--active, [data-sector-filter].sector-chip--active');
    var count = document.querySelector('[data-fab-count]');
    if (count && active && active.getAttribute('data-sector-filter') !== 'all') {
      count.textContent = '1';
      count.style.display = '';
    } else if (count) {
      count.textContent = '';
      count.style.display = 'none';
    }
  }

  fab.addEventListener('click', openDrawer);
  backdrop.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  // Watch for chip changes
  var observer = new MutationObserver(syncDrawer);
  observer.observe(sectorChips, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  syncDrawer();
})();

(function() {
  var C = window.PlataCharts;
  var page = document.querySelector('[data-merval-page]');
  var lang = page.getAttribute('data-lang') || 'en';

  // Platform-aware kbd labels
  if (!/Mac|iPhone|iPad/.test(navigator.platform || '')) {
    document.querySelectorAll('.search-kbd').forEach(function(el) { el.textContent = 'Ctrl K'; });
  }
  // Hide on touch devices
  if ('ontouchstart' in window) {
    document.querySelectorAll('.search-kbd').forEach(function(el) { el.style.display = 'none'; });
  }

  // i18n helpers
  function i18nAttr(key, fallback) { return page.getAttribute('data-i18n-' + key) || fallback; }
  var I = {
    updated: i18nAttr('updated', 'Updated'),
    unable: i18nAttr('unable', 'Unable to load data'),
    noStock: i18nAttr('no-stock', 'No stock data available'),
    unableStocks: i18nAttr('unable-stocks', 'Unable to load stocks'),
    chartUnavail: i18nAttr('chart-unavail', 'Chart data temporarily unavailable'),
    nSectors: i18nAttr('n-sectors', '{n} sectors'),
    vol: i18nAttr('vol', 'Vol'),
    cap: i18nAttr('cap', 'Cap'),
    searchPlaceholder: i18nAttr('search-placeholder', 'Search stocks…'),
    noMatch: i18nAttr('no-match', 'No stocks match your search'),
    showing: i18nAttr('showing', 'Showing'),
    of: i18nAttr('of', 'of'),
    retry: i18nAttr('retry', 'Retry'),
    checkConn: i18nAttr('check-conn', 'Check your connection and try again'),
    tryDifferent: i18nAttr('try-different', 'Try different search terms or broaden your filters'),
  };
  // ─── Market Status Badge (BYMA: Mon-Fri, 11:00-17:00 UTC-3) ───
  (function() {
    var badge = document.querySelector('[data-mkt-badge]');
    if (!badge) return;
    var now = new Date();
    var utcH = now.getUTCHours(), utcM = now.getUTCMinutes();
    var localMin = (utcH * 60 + utcM) + (-3 * 60); // Argentina UTC-3
    if (localMin < 0) localMin += 1440;
    if (localMin >= 1440) localMin -= 1440;
    var day = now.getUTCDay();
    var isOpen = day > 0 && day < 6 && localMin >= 11 * 60 && localMin < 17 * 60;
    var openLabel = i18nAttr('market-open', 'Market Open');
    var closedLabel = i18nAttr('market-closed', 'Market Closed');
    badge.className = 'mkt-badge ' + (isOpen ? 'mkt-badge--open' : 'mkt-badge--closed');
    badge.innerHTML = '<span class="mkt-badge-dot"></span>' + (isOpen ? openLabel : closedLabel);
  })();

  var SECTOR_I18N = {
    'Energy': i18nAttr('sec-energy', 'Energy'),
    'Finance': i18nAttr('sec-finance', 'Finance'),
    'Telecom': i18nAttr('sec-telecom', 'Telecom'),
    'Materials': i18nAttr('sec-materials', 'Materials'),
    'Agriculture': i18nAttr('sec-agriculture', 'Agriculture'),
    'Industry': i18nAttr('sec-industry', 'Industry'),
    'Holding': i18nAttr('sec-holding', 'Holding'),
    'Media': i18nAttr('sec-media', 'Media'),
    'Consumer': i18nAttr('sec-consumer', 'Consumer'),
    'Real Estate': i18nAttr('sec-realestate', 'Real Estate'),
    'Other': i18nAttr('sec-other', 'Other'),
  };
  function secName(key) { return SECTOR_I18N[key] || key; }

  function flashEl(el, newVal, oldVal) {
    if (!el || newVal === oldVal) return;
    var cls = parseFloat(newVal) > parseFloat(oldVal) ? 'data-flash-up' : 'data-flash-down';
    el.classList.remove('data-flash-up', 'data-flash-down');
    void el.offsetWidth;
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

  // ─── Panel Líder stock names (BYMA securityDesc is often empty) ───
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
    AGRO: 'Agrometal', DGCU2: 'Distrib. Gas Cuyana', RICH: 'S.A. San Miguel',
    SEMI: 'Molinos Río de la Plata', MOLI: 'Molinos Agro', LONG: 'Longvie',
    FERR: 'Ferrum', BOLT: 'Boldt', BHIP: 'Banco Hipotecario',
    CARC: 'Carboclor', GARO: 'Garovaglio y Zorraquín', MORI: 'Morixe',
    GBAN: 'Gas Natural BAN', AUSO: 'Autopistas del Sol', SAMI: 'S.A. San Miguel',
    INVJ: 'Inversora Juramento', FIPL: 'Fiplasto', DYCA: 'Dycasa',
    GRIM: 'Grimoldi', POLL: 'Polledo', BPAT: 'Banco Patagonia',
    OEST: 'Grupo Concesionario Oeste', RIGO: 'Rigolleau', CADO: 'Carlos Casado',
    CAPX: 'Capex', CGPA2: 'Camuzzi Gas Pampeana', GCLA: 'Grupo Clarín',
    DOME: 'Domec', INTR: 'Introductora', LEDE: 'Ledesma', MOLA: 'Molinos Agro',
    ROSE: 'Research for Life', CTIO: 'Consultatio', MTAU: 'Metaverso',
    HAVA: 'Havanna', NORT: 'Ind. del Norte'
  };

  // ─── Approximate market cap ranking (USD millions, Q1 2026 estimates) ───
  var STOCK_MCAP = {
    YPFD: 16000, GGAL: 8500, BMA: 5200, BBAR: 4500, PAMP: 4200,
    TECO2: 3500, CEPU: 3200, TXAR: 3000, TGSU2: 2500, LOMA: 1800,
    SUPV: 1600, TRAN: 1500, ALUA: 1500, EDN: 1200, CRES: 1100,
    BYMA: 1000, VALO: 900, TGNO4: 850, IRSA: 800, COME: 500,
    METR: 450, MIRG: 400, HARG: 350, BPAT: 320, CVH: 300,
    BHIP: 250, CAPX: 200, CTIO: 180, LEDE: 170, BOLT: 150,
    GCLA: 140, CGPA2: 130, GBAN: 120, CELU: 110, MOLI: 100,
    SEMI: 90, RICH: 80, AGRO: 70, CADO: 60, DGCU2: 55,
    HAVA: 50, LONG: 40, FERR: 35, MORI: 30, RIGO: 25
  };

  // ─── State ───
  var stocksData = [];
  var currentSort = { key: 'mcap', dir: 'desc' };
  var activeSector = 'all';
  var chartData = null;

  // ─── BYMA direct fetch helper (POST, no CORS proxy needed if BYMA allows it) ───
  var BYMA_INDEX = 'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/index-price';
  var BYMA_STOCKS = 'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/leading-equity';
  var bymaOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };

  function fetchBYMA(url) {
    return fetch(url, bymaOpts).then(function(r) { return r.json(); });
  }

  // ─── Load Merval index data ───
  function loadIndexData() {
    // Try BYMA direct, fallback to proxy
    return fetchBYMA(BYMA_INDEX).then(function(d) {
      var arr = (d && d.data) || d || [];
      if (!Array.isArray(arr)) throw new Error('bad');
      var m = null;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].symbol === 'M') { m = arr[i]; break; }
      }
      if (!m) throw new Error('not found');
      return {
        price: m.price || m.closingPrice,
        high: m.highValue || m.high,
        low: m.minValue || m.low,
        previousClose: m.previousClosingPrice,
        variation: m.variation,
        volume: m.volume || m.tradeVolume
      };
    }).catch(function() {
      return fetch('/api/merval').then(function(r) { return r.json(); }).catch(function() { return null; });
    });
  }

  // ─── Load stocks table data ───
  function normalizeStocks(arr) {
    // Map raw BYMA items to normalized objects
    var items = arr.map(function(s) {
      var sym = (s.symbol || '').replace('.BA', '');
      return {
        symbol: sym,
        description: s.securityDesc || s.description || STOCK_NAMES[sym] || '',
        price: s.trade || s.price || s.closingPrice,
        variation: s.imbalance != null ? s.imbalance : (s.variation != null ? s.variation / 100 : null),
        previousClose: s.previousClosingPrice,
        openingPrice: s.openingPrice,
        volume: s.volume || s.tradeVolume || 0,
        high: s.tradingHighPrice || s.high,
        low: s.tradingLowPrice || s.low,
        mcap: STOCK_MCAP[sym] || 0
      };
    });
    // Deduplicate: keep entry with highest volume per symbol
    var seen = {};
    var result = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (!item.symbol) continue;
      if (seen[item.symbol] != null) {
        var prev = result[seen[item.symbol]];
        if ((item.volume || 0) > (prev.volume || 0)) {
          result[seen[item.symbol]] = item;
        }
      } else {
        seen[item.symbol] = result.length;
        result.push(item);
      }
    }
    return result.sort(function(a, b) { return (b.volume || 0) - (a.volume || 0); });
  }

  function loadStocksData() {
    // Try BYMA direct, fallback to proxy
    return fetchBYMA(BYMA_STOCKS).then(function(d) {
      var arr = (d && d.data) || d || [];
      if (!Array.isArray(arr) || arr.length === 0) throw new Error('empty');
      return normalizeStocks(arr);
    }).catch(function() {
      return fetch('/api/leading-equity').then(function(r) { return r.json(); })
        .then(function(arr) { return Array.isArray(arr) ? normalizeStocks(arr) : null; })
        .catch(function() { return null; });
    });
  }

  // ─── Load chart data ───
  // In dev: Vite proxy forwards /api/stock/* to Yahoo Finance
  // In prod: Cloudflare Pages Function proxies to Yahoo Finance
  function parseYahooChart(json) {
    var result = json && json.chart && json.chart.result && json.chart.result[0];
    if (!result || !result.timestamp) return null;
    var q = result.indicators && result.indicators.quote && result.indicators.quote[0];
    return {
      timestamps: result.timestamp,
      closes: q ? q.close : [],
      volumes: q ? (q.volume || []) : [],
      symbol: '^MERV'
    };
  }

  function normalizeChartResponse(data) {
    // Our Pages Function returns {timestamps, closes} at top level
    if (data && data.timestamps && data.closes) return data;
    // Vite dev proxy returns raw Yahoo format → parse it
    var parsed = parseYahooChart(data);
    if (parsed) return parsed;
    return null;
  }

  function loadChartData(range, interval) {
    range = range || '1mo';
    interval = interval || '1d';
    return fetch('/api/stock/%5EMERV?range=' + range + '&interval=' + interval)
      .then(function(r) { if (!r.ok) throw new Error('proxy ' + r.status); return r.json(); })
      .then(normalizeChartResponse)
      .then(function(d) { if (!d) throw new Error('no data'); return d; })
      .catch(function() {
        return fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EMERV?interval=' + interval + '&range=' + range)
          .then(function(r) { if (!r.ok) throw new Error('yahoo'); return r.json(); })
          .then(parseYahooChart)
          .catch(function() { return null; });
      });
  }

  // Range buttons for chart
  document.querySelectorAll('[data-mrange]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-mrange]').forEach(function(b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      var range = btn.getAttribute('data-mrange');
      var interval = btn.getAttribute('data-minterval');
      loadChartData(range, interval).then(function(d) {
        if (d && d.timestamps && d.closes) {
          chartData = d;
          var pts = C.yahooToPoints(d.timestamps, d.closes);
          C.drawChart(document.querySelector('[data-merval-chart]'), [
            { points: pts, lineColor: '#60a5fa', fillColor: 'rgba(96,165,250,0.12)' }
          ], { yFormat: C.fmtM, volumes: d.volumes || [] });
        }
      });
    });
  });

  // ─── Fetch all data in parallel ───
  Promise.all([
    loadIndexData(),
    loadChartData(),
    loadStocksData()
  ]).then(function(res) {
    var merval = res[0];
    var chart = res[1];
    var stocks = res[2];

    var updEl = document.querySelector('[data-mkts-updated]');
    if (updEl) {
      updEl.innerHTML = '<span class="live-dot"></span>' + I.updated + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    }

    // Index summary
    if (merval && merval.price) {
      setEl('[data-idx-price]', C.fmtM(merval.price));
      if (merval.high) setEl('[data-idx-high]', C.fmtM(merval.high));
      if (merval.low) setEl('[data-idx-low]', C.fmtM(merval.low));
      if (merval.previousClose) setEl('[data-idx-prev]', C.fmtM(merval.previousClose));
      if (merval.volume) setEl('[data-idx-vol]', C.fmtVol(merval.volume));

      var mPct = merval.variation != null ? merval.variation * 100 : null;
      if (mPct == null && merval.previousClose > 0) {
        mPct = ((merval.price - merval.previousClose) / merval.previousClose) * 100;
      }
      var chEl = document.querySelector('[data-idx-change]');
      if (chEl && mPct != null) {
        var oldChg = chEl.textContent;
        var newChg = C.pctText(mPct);
        chEl.textContent = newChg;
        chEl.className = 'idx-change ' + (mPct >= 0 ? 'rc-up' : 'rc-down');
        flashEl(chEl, newChg, oldChg);
      }
    }

    // Chart
    var chartSkel = document.querySelector('[data-chart-skeleton]');
    var chartCanvas = document.querySelector('[data-merval-chart]');
    if (chart && chart.timestamps && chart.closes) {
      chartData = chart;
      var points = C.yahooToPoints(chart.timestamps, chart.closes);
      if (chartSkel) chartSkel.style.display = 'none';
      if (chartCanvas) chartCanvas.style.display = '';
      C.drawChart(chartCanvas, [
        { points: points, lineColor: '#60a5fa', fillColor: 'rgba(96,165,250,0.12)' }
      ], { yFormat: C.fmtM, volumes: chart.volumes || [] });
    } else {
      if (chartSkel) chartSkel.style.display = 'none';
      if (chartCanvas) chartCanvas.style.display = 'none';
      var chartWrap = document.querySelector('.chart-wrap');
      if (chartWrap) chartWrap.insertAdjacentHTML('beforeend', '<div class="chart-unavailable">' + I.chartUnavail + '</div>');
    }

    // Stocks cards + breadth
    if (stocks && Array.isArray(stocks) && stocks.length > 0) {
      stocksData = stocks;
      // Market breadth
      var up = 0, dn = 0;
      for (var bi = 0; bi < stocks.length; bi++) {
        var bv = stocks[bi].variation;
        if (bv != null) { if (bv >= 0) up++; else dn++; }
      }
      setEl('[data-breadth-up]', up);
      setEl('[data-breadth-down]', dn);
      var total = up + dn || 1;
      var fillEl = document.querySelector('[data-breadth-fill]');
      if (fillEl) fillEl.style.width = Math.round(up / total * 100) + '%';
      // Market summary stats
      var totalVol = 0, totalMcap = 0, chgSum = 0, chgCount = 0;
      for (var si = 0; si < stocks.length; si++) {
        totalVol += stocks[si].volume || 0;
        if (STOCK_MCAP[stocks[si].symbol]) totalMcap += STOCK_MCAP[stocks[si].symbol];
        if (stocks[si].variation != null) { chgSum += stocks[si].variation * 100; chgCount++; }
      }
      setEl('[data-mkt-totvol]', C.fmtVol(totalVol));
      setEl('[data-mkt-traded]', stocks.length.toString());
      setEl('[data-mkt-totmcap]', '~$' + C.fmtVol(totalMcap * 1e6));
      var avgChg = chgCount > 0 ? chgSum / chgCount : 0;
      var avgEl = document.querySelector('[data-mkt-avgchg]');
      if (avgEl) {
        var oldAvg = avgEl.textContent;
        var newAvg = (avgChg >= 0 ? '+' : '') + avgChg.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
        avgEl.textContent = newAvg;
        avgEl.classList.add(avgChg >= 0 ? 'rc-up' : 'rc-down');
        flashEl(avgEl, newAvg, oldAvg);
      }
      var sumEl = document.querySelector('[data-mkt-summary]');
      if (sumEl) sumEl.style.display = '';

      renderMovers(stocks);
      renderHeatmap(stocks);
      renderSectorChart(stocks);
      renderMcapConc(stocks);
      renderVolDist(stocks);
      renderSectorPerf(stocks);
      renderVolLeaders(stocks);
      buildSectorChips(stocks);
      renderStocks();
    } else {
      // Remove skeletons and show error state
      var stkSkel = document.querySelector('[data-stocks-skeleton]');
      if (stkSkel) stkSkel.remove();
      var mvSkels = document.querySelectorAll('[data-movers-skeleton]');
      mvSkels.forEach(function(el) { el.remove(); });
      var hmSkel2 = document.querySelector('[data-heatmap-skeleton]');
      if (hmSkel2) hmSkel2.remove();
      var hmSec = document.querySelector('[data-heatmap-section]');
      if (hmSec) hmSec.style.display = 'none';
      var mvSec = document.querySelector('[data-movers]');
      if (mvSec) mvSec.style.display = 'none';
      var grid = document.querySelector('[data-stocks-grid]');
      if (grid) grid.innerHTML = MktStates.buildErrorCard({ message: stocks && stocks.error ? I.unableStocks : I.noStock, hint: I.checkConn, retryLabel: I.retry });
    }
  }).catch(function() {
    var updEl = document.querySelector('[data-mkts-updated]');
    if (updEl) updEl.textContent = '—';
    // Remove all skeletons on error
    var skels = document.querySelectorAll('[data-chart-skeleton],[data-heatmap-skeleton],[data-movers-skeleton],[data-stocks-skeleton]');
    skels.forEach(function(el) { el.remove(); });
    var chartCanvas2 = document.querySelector('[data-merval-chart]');
    if (chartCanvas2) chartCanvas2.style.display = '';
    var hmSec2 = document.querySelector('[data-heatmap-section]');
    if (hmSec2) hmSec2.style.display = 'none';
    var mvSec2 = document.querySelector('[data-movers]');
    if (mvSec2) mvSec2.style.display = 'none';
    // Show error card in the stocks grid
    var grid = document.querySelector('[data-stocks-grid]');
    if (grid) grid.innerHTML = MktStates.buildErrorCard({ message: I.unable, hint: I.checkConn, retryLabel: I.retry });
  });

  // ─── Logo / Avatar helpers ───
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

  // Deterministic color palette based on symbol
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

  function logoHtml(sym) {
    var url = STOCK_LOGOS[sym];
    var color = avatarColor(sym);
    var initials = sym.substring(0, 2);
    if (url) {
      return '<div class="stk-logo" style="background:' + color + '22" data-stk-logo="' + sym + '" data-color="' + color + '">' +
        '<img src="' + url + '?size=64&format=png" alt="' + sym + ' logo" loading="lazy" width="32" height="32">' +
        '</div>';
    }
    return '<div class="stk-logo stk-logo--fallback" style="background:' + color + '22;color:' + color + '">' + initials + '</div>';
  }

  // Handle logo load errors → fall back to initials
  document.addEventListener('error', function(e) {
    if (e.target.tagName !== 'IMG') return;
    var logoDiv = e.target.closest('[data-stk-logo]');
    if (!logoDiv) return;
    var sym = logoDiv.getAttribute('data-stk-logo');
    var color = logoDiv.getAttribute('data-color');
    logoDiv.classList.add('stk-logo--fallback');
    logoDiv.style.color = color;
    logoDiv.innerHTML = sym.substring(0, 2);
  }, true);

  // ─── Render top movers ───
  function renderMovers(stocks) {
    var withChange = stocks.filter(function(s) { return s.variation != null; });
    var sorted = withChange.slice().sort(function(a, b) { return (b.variation || 0) - (a.variation || 0); });
    var gainers = sorted.slice(0, 5);
    var losers = sorted.slice(-5).reverse();

    function moverRow(s) {
      var pct = s.variation != null ? s.variation * 100 : 0;
      var cls = pct >= 0 ? 'rc-up' : 'rc-down';
      var arrow = pct >= 0 ? '▲' : '▼';
      var name = STOCK_NAMES[s.symbol] || s.description || s.symbol;
      return '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(s.symbol) + '" class="mover-item">' +
        logoHtml(s.symbol) +
        '<div class="mover-info"><span class="mover-sym">' + s.symbol + '</span><span class="mover-name">' + name + '</span></div>' +
        '<div class="mover-right">' +
        '<span class="mover-price">ARS ' + (s.price ? C.fmt(s.price) : '—') + '</span>' +
        '<span class="mover-pct ' + cls + '">' + arrow + ' ' + Math.abs(pct).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>' +
        '</div></a>';
    }

    var upHtml = '', dnHtml = '';
    gainers.forEach(function(s) { upHtml += moverRow(s); });
    losers.forEach(function(s) { dnHtml += moverRow(s); });

    var mvSkels = document.querySelectorAll('[data-movers-skeleton]');
    mvSkels.forEach(function(el) { el.remove(); });
    var upEl = document.querySelector('[data-movers-up]');
    var dnEl = document.querySelector('[data-movers-down]');
    if (upEl) upEl.innerHTML = upHtml;
    if (dnEl) dnEl.innerHTML = dnHtml;
    var moversEl = document.querySelector('[data-movers]');
    if (moversEl && gainers.length === 0 && losers.length === 0) moversEl.style.display = 'none';
  }

  // ─── Render heatmap ───
  function renderHeatmap(stocks) {
    var container = document.querySelector('[data-heatmap]');
    var section = document.querySelector('[data-heatmap-section]');
    if (!container || !section) return;
    // Filter to stocks with market cap and variation
    var items = stocks.filter(function(s) { return s.mcap > 0 && s.variation != null; })
      .sort(function(a, b) { return b.mcap - a.mcap; })
      .slice(0, 20);
    if (items.length === 0) { section.style.display = 'none'; return; }

    var totalMcap = 0;
    for (var i = 0; i < items.length; i++) totalMcap += items[i].mcap;

    function heatColor(pct) {
      // pct is decimal (0.01 = 1%)
      var v = Math.min(Math.abs(pct * 100), 5) / 5; // normalize to 0-1 (5% max)
      if (pct >= 0) return 'rgba(22,163,74,' + (0.15 + v * 0.65).toFixed(2) + ')';
      return 'rgba(220,38,38,' + (0.15 + v * 0.65).toFixed(2) + ')';
    }

    var html = '';
    for (var j = 0; j < items.length; j++) {
      var s = items[j];
      var pct = s.variation || 0;
      var pctText = (pct >= 0 ? '+' : '') + (pct * 100).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
      var weight = (s.mcap / totalMcap * 100).toFixed(2);
      var bg = heatColor(pct);
      var tipName = STOCK_NAMES[s.symbol] || s.name || s.symbol;
      var tipPrice = 'ARS ' + C.fmt(s.price || 0);
      var tipVol = s.volume ? C.fmtVol(s.volume) : '—';
      var tipMcap = C.fmtVol(s.mcap * 1e6);
      html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(s.symbol) + '" class="hm-cell" style="flex-basis:' + weight + '%;background:' + bg + '" aria-label="' + (STOCK_NAMES[s.symbol] || s.symbol) + ' ' + pctText + '">';
      html += '<span class="hm-sym">' + s.symbol + '</span>';
      html += '<span class="hm-pct">' + pctText + '</span>';
      html += '<div class="hm-tip"><strong>' + tipName + '</strong><span>' + tipPrice + ' ' + pctText + '</span><span>' + I.vol + ': ' + tipVol + '</span><span>' + I.cap + ': ' + tipMcap + '</span></div>';
      html += '</a>';
    }
    var hmSkel = document.querySelector('[data-heatmap-skeleton]');
    if (hmSkel) hmSkel.remove();
    container.innerHTML = html;
  }

  // ─── Sector mapping ───
  var STOCK_SECTORS = {
    YPFD: 'Energy', PAMP: 'Energy', CEPU: 'Energy', TGSU2: 'Energy', TGNO4: 'Energy',
    EDN: 'Energy', METR: 'Energy', CAPX: 'Energy', CGPA2: 'Energy', GBAN: 'Energy', DGCU2: 'Energy',
    GGAL: 'Finance', BMA: 'Finance', BBAR: 'Finance', SUPV: 'Finance', BYMA: 'Finance',
    VALO: 'Finance', BHIP: 'Finance', BPAT: 'Finance', IRSA: 'Finance', CTIO: 'Finance',
    TECO2: 'Telecom', CVH: 'Telecom',
    TXAR: 'Materials', ALUA: 'Materials', LOMA: 'Materials', HARG: 'Materials',
    CELU: 'Materials', FERR: 'Materials', RIGO: 'Materials',
    CRES: 'Agriculture', AGRO: 'Agriculture', MOLI: 'Agriculture', SEMI: 'Agriculture',
    LEDE: 'Agriculture', MORI: 'Agriculture', RICH: 'Agriculture',
    MIRG: 'Industry', TRAN: 'Industry', BOLT: 'Industry', LONG: 'Industry',
    COME: 'Holding', GCLA: 'Media', HAVA: 'Consumer', CADO: 'Real Estate'
  };

  var SECTOR_COLORS = {
    'Energy': '#f59e0b', 'Finance': '#3b82f6', 'Telecom': '#8b5cf6',
    'Materials': '#6b7280', 'Agriculture': '#22c55e', 'Industry': '#ef4444',
    'Holding': '#06b6d4', 'Media': '#ec4899', 'Consumer': '#14b8a6',
    'Real Estate': '#a855f7', 'Other': '#9ca3af'
  };

  function renderSectorChart(stocks) {
    var sectorMap = {};
    for (var i = 0; i < stocks.length; i++) {
      var sec = STOCK_SECTORS[stocks[i].symbol] || 'Other';
      if (!sectorMap[sec]) sectorMap[sec] = { mcap: 0, count: 0, avgChange: 0, totalChange: 0 };
      sectorMap[sec].mcap += stocks[i].mcap || 0;
      sectorMap[sec].count++;
      if (stocks[i].variation != null) sectorMap[sec].totalChange += stocks[i].variation;
    }
    var sectors = [];
    var totalMcap = 0;
    for (var sec in sectorMap) {
      var d = sectorMap[sec];
      d.avgChange = d.count > 0 ? d.totalChange / d.count : 0;
      sectors.push({ name: sec, mcap: d.mcap, count: d.count, avgChange: d.avgChange });
      totalMcap += d.mcap;
    }
    if (totalMcap === 0 || sectors.length === 0) return;
    sectors.sort(function(a, b) { return b.mcap - a.mcap; });

    // Draw donut
    var canvas = document.querySelector('[data-sector-chart]');
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var cx = size / 2, cy = size / 2, r = 90, inner = 55;
    var angle = -Math.PI / 2;

    for (var j = 0; j < sectors.length; j++) {
      var pct = sectors[j].mcap / totalMcap;
      var sweep = pct * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, angle, angle + sweep);
      ctx.arc(cx, cy, inner, angle + sweep, angle, true);
      ctx.closePath();
      ctx.fillStyle = SECTOR_COLORS[sectors[j].name] || '#9ca3af';
      ctx.fill();
      angle += sweep;
    }

    // Center text
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#fff';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(I.nSectors.replace('{n}', sectors.length), cx, cy);

    // Draw helper (reusable for hover)
    function drawDonut(highlightIdx) {
      ctx.clearRect(0, 0, size, size);
      var a = -Math.PI / 2;
      for (var d = 0; d < sectors.length; d++) {
        var pct2 = sectors[d].mcap / totalMcap;
        var sw = pct2 * Math.PI * 2;
        var isHl = highlightIdx === d;
        var rr = isHl ? r + 6 : r;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, a, a + sw);
        ctx.arc(cx, cy, inner, a + sw, a, true);
        ctx.closePath();
        ctx.fillStyle = SECTOR_COLORS[sectors[d].name] || '#9ca3af';
        ctx.globalAlpha = (highlightIdx != null && !isHl) ? 0.35 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;
        a += sw;
      }
      // Center text
      var cIdx = highlightIdx != null ? highlightIdx : -1;
      var cLabel = cIdx >= 0 ? secName(sectors[cIdx].name) : I.nSectors.replace('{n}', sectors.length);
      var cSub = cIdx >= 0 ? (sectors[cIdx].mcap / totalMcap * 100).toFixed(1) + '%' : '';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-text').trim() || '#fff';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = cSub ? 'bottom' : 'middle';
      ctx.fillText(cLabel, cx, cSub ? cy - 2 : cy);
      if (cSub) {
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(cSub, cx, cy + 2);
      }
    }
    drawDonut(null);

    // Hover interaction on canvas
    var sectorAngles = [];
    (function() {
      var a = -Math.PI / 2;
      for (var d = 0; d < sectors.length; d++) {
        var sw = (sectors[d].mcap / totalMcap) * Math.PI * 2;
        sectorAngles.push({ start: a, end: a + sw });
        a += sw;
      }
    })();

    canvas.addEventListener('mousemove', function(e) {
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left - cx;
      var y = e.clientY - rect.top - cy;
      var dist = Math.sqrt(x * x + y * y);
      if (dist < inner || dist > r + 8) { highlightSector(null); return; }
      var ang = Math.atan2(y, x);
      for (var d = 0; d < sectorAngles.length; d++) {
        var s = sectorAngles[d].start, en = sectorAngles[d].end;
        // Normalize angle
        var a2 = ang < s ? ang + Math.PI * 2 : ang;
        var s2 = s, e2 = en < s ? en + Math.PI * 2 : en;
        if (a2 >= s2 && a2 < e2) { highlightSector(d); return; }
      }
      highlightSector(null);
    });
    canvas.addEventListener('mouseleave', function() { highlightSector(null); });
    canvas.style.cursor = 'pointer';

    function highlightSector(idx) {
      if (highlightSector._prev === idx) return;
      highlightSector._prev = idx;
      drawDonut(idx);
      var items = legEl.querySelectorAll('.sec-leg-item');
      for (var i = 0; i < items.length; i++) {
        items[i].style.opacity = (idx != null && i !== idx) ? '0.4' : '';
        items[i].style.transform = (idx != null && i === idx) ? 'translateX(4px)' : '';
      }
    }

    // Legend
    var legEl = document.querySelector('[data-sector-legend]');
    if (!legEl) return;
    var html = '';
    for (var k = 0; k < sectors.length; k++) {
      var s = sectors[k];
      var pctVal = (s.mcap / totalMcap * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1});
      var chg = s.avgChange * 100;
      var chgCls = chg >= 0 ? 'rc-up' : 'rc-down';
      var chgArrow = chg >= 0 ? '▲' : '▼';
      html += '<div class="sec-leg-item" data-sector-idx="' + k + '">';
      html += '<span class="sec-dot" style="background:' + (SECTOR_COLORS[s.name] || '#9ca3af') + '"></span>';
      html += '<span class="sec-name">' + secName(s.name) + '</span>';
      html += '<span class="sec-pct">' + pctVal + '%</span>';
      html += '<span class="sec-count">' + s.count + '</span>';
      html += '<span class="sec-chg ' + chgCls + '">' + chgArrow + ' ' + Math.abs(chg).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
      html += '</div>';
    }
    legEl.innerHTML = html;

    // Legend → canvas hover
    legEl.addEventListener('mouseover', function(e) {
      var item = e.target.closest('.sec-leg-item');
      if (!item) return;
      var idx = parseInt(item.getAttribute('data-sector-idx'), 10);
      if (!isNaN(idx)) highlightSector(idx);
    });
    legEl.addEventListener('mouseleave', function() { highlightSector(null); });

    var section = document.querySelector('[data-sector-section]');
    if (section) section.style.display = '';
  }

  // ─── Market Cap Concentration ───
  function renderMcapConc(stocks) {
    var sorted = stocks.filter(function(s) { return s.mcap > 0; })
      .sort(function(a, b) { return b.mcap - a.mcap; });
    if (sorted.length < 3) return;
    var totalMcap = 0;
    for (var i = 0; i < sorted.length; i++) totalMcap += sorted[i].mcap;
    if (totalMcap === 0) return;

    var top5 = sorted.slice(0, 5);
    var top5Mcap = 0;
    for (var j = 0; j < top5.length; j++) top5Mcap += top5[j].mcap;
    var top5PctRaw = (top5Mcap / totalMcap * 100);
    var top5Pct = top5PctRaw.toFixed(1);
    var restPct = (100 - top5PctRaw).toFixed(1);
    var top5PctDisplay = top5PctRaw.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1});

    var html = '<div class="mcc-summary">';
    html += '<div class="mcc-stat"><span class="mcc-stat-val">' + top5PctDisplay + '%</span><span class="mcc-stat-label">Top 5</span></div>';
    html += '<div class="mcc-stat"><span class="mcc-stat-val">' + sorted.length + '</span><span class="mcc-stat-label">' + I.vol + '</span></div>';
    html += '</div>';

    // Stacked bar
    html += '<div class="mcc-bar">';
    for (var k = 0; k < top5.length; k++) {
      var pct = (top5[k].mcap / totalMcap * 100);
      var sec = STOCK_SECTORS[top5[k].symbol] || 'Other';
      var col = SECTOR_COLORS[sec] || '#9ca3af';
      html += '<div class="mcc-seg" style="width:' + pct.toFixed(1) + '%;background:' + col + '" title="' + top5[k].symbol + ' ' + pct.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%"></div>';
    }
    html += '<div class="mcc-seg mcc-seg--rest" style="width:' + restPct + '%"></div>';
    html += '</div>';

    // Legend rows
    html += '<div class="mcc-list">';
    for (var m = 0; m < top5.length; m++) {
      var s = top5[m];
      var w = (s.mcap / totalMcap * 100).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1});
      var sec2 = STOCK_SECTORS[s.symbol] || 'Other';
      var col2 = SECTOR_COLORS[sec2] || '#9ca3af';
      var chg = s.variation != null ? (s.variation * 100) : 0;
      var chgCls = chg >= 0 ? 'rc-up' : 'rc-down';
      html += '<div class="mcc-row">';
      html += '<span class="mcc-rank">' + (m + 1) + '</span>';
      html += '<span class="mcc-dot" style="background:' + col2 + '"></span>';
      html += '<a class="mcc-sym" href="/' + (document.querySelector('[data-merval-page]')?.getAttribute('data-lang') || 'en') + '/markets/stock/' + s.symbol + '">' + s.symbol + '</a>';
      html += '<span class="mcc-w">' + w + '%</span>';
      html += '<span class="mcc-cap">$' + C.fmtVol(s.mcap * 1e6) + '</span>';
      html += '<span class="' + chgCls + '">' + (chg >= 0 ? '+' : '') + chg.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
      html += '</div>';
    }
    html += '<div class="mcc-row mcc-row--rest">';
    html += '<span class="mcc-rank"></span><span class="mcc-dot" style="background:#4b5563"></span>';
    html += '<span class="mcc-sym">' + (sorted.length - 5) + '+</span>';
    html += '<span class="mcc-w">' + (100 - top5PctRaw).toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span>';
    html += '<span class="mcc-cap"></span><span></span>';
    html += '</div>';
    html += '</div>';

    var body = document.querySelector('[data-mcap-conc-body]');
    if (body) body.innerHTML = html;
    var section = document.querySelector('[data-mcap-conc]');
    if (section) section.style.display = '';
  }

  // ─── Sector Performance ───
  function renderSectorPerf(stocks) {
    var sectorMap = {};
    for (var i = 0; i < stocks.length; i++) {
      var sec = STOCK_SECTORS[stocks[i].symbol] || 'Other';
      if (!sectorMap[sec]) sectorMap[sec] = { totalChange: 0, count: 0 };
      if (stocks[i].variation != null) {
        sectorMap[sec].totalChange += stocks[i].variation;
        sectorMap[sec].count++;
      }
    }
    var sectors = [];
    for (var sec in sectorMap) {
      if (sectorMap[sec].count > 0) {
        sectors.push({ name: sec, avgChange: sectorMap[sec].totalChange / sectorMap[sec].count * 100, count: sectorMap[sec].count });
      }
    }
    if (sectors.length < 2) return;
    sectors.sort(function(a, b) { return b.avgChange - a.avgChange; });
    var maxAbs = Math.max.apply(null, sectors.map(function(s) { return Math.abs(s.avgChange); }));
    if (maxAbs === 0) maxAbs = 1;

    var chart = document.querySelector('[data-sector-perf-chart]');
    if (!chart) return;
    var html = '';
    for (var j = 0; j < sectors.length; j++) {
      var s = sectors[j];
      var isPos = s.avgChange >= 0;
      var barW = (Math.abs(s.avgChange) / maxAbs * 50).toFixed(1);
      var color = isPos ? '#16a34a' : '#dc2626';
      html += '<div class="sp-row">';
      html += '<span class="sp-name">' + secName(s.name) + ' <span class="sp-cnt">(' + s.count + ')</span></span>';
      html += '<div class="sp-bar-area">';
      if (isPos) {
        html += '<div class="sp-bar-left"></div><div class="sp-bar-center"></div>';
        html += '<div class="sp-bar-right"><div class="sp-bar-fill" style="width:' + barW + '%;background:' + color + '"></div></div>';
      } else {
        html += '<div class="sp-bar-left"><div class="sp-bar-fill sp-bar-fill--neg" style="width:' + barW + '%;background:' + color + '"></div></div>';
        html += '<div class="sp-bar-center"></div><div class="sp-bar-right"></div>';
      }
      html += '</div>';
      html += '<span class="sp-val ' + (isPos ? 'rc-up' : 'rc-down') + '">' + (isPos ? '+' : '') + s.avgChange.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
      html += '</div>';
    }
    chart.innerHTML = html;
    document.querySelector('[data-sector-perf]').style.display = '';
  }

  // ─── Volatility Leaders ───
  function renderVolLeaders(stocks) {
    var withChange = stocks.filter(function(s) { return s.variation != null; });
    withChange.sort(function(a, b) { return Math.abs(b.variation) - Math.abs(a.variation); });
    var leaders = withChange.slice(0, 5);
    if (leaders.length < 3) return;

    var maxAbs = Math.abs(leaders[0].variation) * 100;
    if (maxAbs < 0.1) return;

    var grid = document.querySelector('[data-vol-leaders-grid]');
    if (!grid) return;

    var html = '';
    for (var i = 0; i < leaders.length; i++) {
      var s = leaders[i];
      var pct = s.variation * 100;
      var isUp = pct >= 0;
      var barW = (Math.abs(pct) / maxAbs * 100).toFixed(1);
      var color = isUp ? '#16a34a' : '#dc2626';
      var link = '/' + lang + '/markets/stock/' + encodeURIComponent(s.symbol);
      html += '<a href="' + link + '" class="vl-row">';
      html += '<span class="vl-sym">' + s.symbol + '</span>';
      html += '<div class="vl-bar-wrap"><div class="vl-bar" style="width:' + barW + '%;background:' + color + '"></div></div>';
      html += '<span class="vl-pct" style="color:' + color + '">' + (isUp ? '+' : '') + pct.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%</span>';
      html += '</a>';
    }
    grid.innerHTML = html;
    document.querySelector('[data-vol-leaders]').style.display = '';
  }

  // ─── Volume Distribution ───
  function renderVolDist(stocks) {
    var byVol = stocks.slice().sort(function(a, b) { return (b.volume || 0) - (a.volume || 0); }).slice(0, 10);
    if (byVol.length === 0 || !byVol[0].volume) return;
    var maxVol = byVol[0].volume || 1;
    var chart = document.querySelector('[data-vol-dist-chart]');
    if (!chart) return;
    var html = '';
    for (var i = 0; i < byVol.length; i++) {
      var s = byVol[i];
      var sym = (s.symbol || '').replace('.BA', '');
      var pct = ((s.volume || 0) / maxVol * 100).toFixed(1);
      var chg = s.variation != null ? s.variation * 100 : 0;
      var barColor = chg >= 0 ? '#16a34a' : '#dc2626';
      html += '<div class="vd-row">';
      html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(sym) + '" class="vd-sym">' + sym + '</a>';
      html += '<div class="vd-bar-track"><div class="vd-bar-fill" style="width:' + pct + '%;background:' + barColor + '"></div></div>';
      html += '<span class="vd-vol">' + C.fmtVol(s.volume || 0) + '</span>';
      html += '</div>';
    }
    chart.innerHTML = html;
    document.querySelector('[data-vol-dist]').style.display = '';
  }

  // ─── Search state ───
  var searchQuery = '';
  var searchInput = document.querySelector('[data-stocks-search]');
  var searchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() {
        searchQuery = searchInput.value.trim();
        renderStocks();
      }, 150);
    });
    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { searchInput.value = ''; searchQuery = ''; renderStocks(); }
    });
  }

  // ─── Build sector filter chips ───
  function buildSectorChips(stocks) {
    var chipsEl = document.querySelector('[data-sector-chips]');
    if (!chipsEl) return;
    var sectorSet = {};
    for (var i = 0; i < stocks.length; i++) {
      var sec = STOCK_SECTORS[stocks[i].symbol] || 'Other';
      if (!sectorSet[sec]) sectorSet[sec] = 0;
      sectorSet[sec]++;
    }
    var sectors = Object.keys(sectorSet).sort(function(a, b) { return sectorSet[b] - sectorSet[a]; });
    var html = '<button class="sector-chip sector-chip--active" data-sector-filter="all">' + (I.showing ? I.showing.split(' ')[0] : 'All') + ' (' + stocks.length + ')</button>';
    for (var j = 0; j < sectors.length; j++) {
      var s = sectors[j];
      var color = SECTOR_COLORS[s] || '#9ca3af';
      html += '<button class="sector-chip" data-sector-filter="' + s + '" style="--chip-color:' + color + '">';
      html += '<span class="sector-chip-dot" style="background:' + color + '"></span>';
      html += secName(s) + ' <span class="sector-chip-count">' + sectorSet[s] + '</span>';
      html += '</button>';
    }
    chipsEl.innerHTML = html;

    // Bind click handlers
    chipsEl.querySelectorAll('[data-sector-filter]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        chipsEl.querySelectorAll('.sector-chip').forEach(function(c) { c.classList.remove('sector-chip--active'); });
        btn.classList.add('sector-chip--active');
        activeSector = btn.getAttribute('data-sector-filter');
        renderStocks();
      });
    });
  }

  // ─── Render stock cards ───
  function renderStocks() {
    if (viewMode === 'table') { renderStocksTable(); return; }
    var grid = document.querySelector('[data-stocks-grid]');
    if (!grid || stocksData.length === 0) return;
    var stkSkel = document.querySelector('[data-stocks-skeleton]');
    if (stkSkel) stkSkel.remove();

    // Filter by sector
    var data = stocksData;
    if (activeSector && activeSector !== 'all') {
      data = data.filter(function(s) {
        return (STOCK_SECTORS[s.symbol] || 'Other') === activeSector;
      });
    }
    // Filter by search
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      data = data.filter(function(s) {
        var sym = (s.symbol || '').toLowerCase();
        var desc = (s.description || '').toLowerCase();
        var name = (STOCK_NAMES[s.symbol] || '').toLowerCase();
        return sym.indexOf(q) !== -1 || desc.indexOf(q) !== -1 || name.indexOf(q) !== -1;
      });
    }

    // Update count
    var countEl = document.querySelector('[data-stocks-count]');
    if (countEl) {
      if (searchQuery && data.length !== stocksData.length) {
        countEl.textContent = I.showing + ' ' + data.length + ' ' + I.of + ' ' + stocksData.length;
      } else {
        countEl.textContent = data.length + ' stocks';
      }
    }

    // No results
    if (data.length === 0) {
      grid.innerHTML = MktStates.buildEmptyState({ message: I.noMatch, query: searchQuery, hint: I.tryDifferent });
      return;
    }

    // Sort
    var sorted = data.slice().sort(function(a, b) {
      var key = currentSort.key;
      var av = a[key], bv = b[key];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
      if (av == null) av = 0;
      if (bv == null) bv = 0;
      var cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return currentSort.dir === 'desc' ? -cmp : cmp;
    });

    // Find max volume for relative bar
    var maxVol = 0;
    for (var vi = 0; vi < sorted.length; vi++) {
      if (sorted[vi].volume > maxVol) maxVol = sorted[vi].volume;
    }

    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      var s = sorted[i];
      var pct = s.variation != null ? s.variation * 100 : null;
      var pctClass = pct != null ? (pct >= 0 ? 'rc-up' : 'rc-down') : '';
      var arrow = pct != null ? (pct >= 0 ? '▲' : '▼') : '';
      var borderColor = pct != null ? (pct >= 0 ? '#16a34a' : '#dc2626') : 'var(--color-border)';
      var volPct = s.volume && maxVol > 0 ? (s.volume / maxVol * 100).toFixed(1) : 0;
      var volColor = pct != null ? (pct >= 0 ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)') : 'rgba(128,128,128,0.1)';

      var delay = Math.min(i * 30, 600);
      html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(s.symbol) + '" class="stk-card" style="--stk-accent:' + borderColor + ';animation-delay:' + delay + 'ms">';
      html += '<div class="stk-vol-bg" style="width:' + volPct + '%;background:' + volColor + '"></div>';
      html += '<div class="stk-row1">';
      html += logoHtml(s.symbol);
      html += '<div class="stk-id">';
      html += '<span class="stk-symbol">' + (s.symbol || '—') + '</span>';
      html += '<span class="stk-name">' + (s.description || s.symbol || '') + '</span>';
      html += '</div>';
      html += '<div class="stk-change ' + pctClass + '">' + arrow + ' ' + (pct != null ? Math.abs(pct).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%' : '—') + '</div>';
      html += '</div>';
      html += '<div class="stk-row2">';
      html += '<span class="stk-price">ARS ' + (s.price ? C.fmt(s.price) : '—') + '</span>';
      html += '<span class="stk-meta">';
      if (s.volume) html += '<span class="stk-vol">Vol ' + C.fmtVol(s.volume) + '</span>';
      if (STOCK_MCAP[s.symbol]) html += '<span class="stk-mcap">Cap ~$' + C.fmtVol(STOCK_MCAP[s.symbol] * 1e6) + '</span>';
      html += '</span>';
      html += '</div>';
      var sec = STOCK_SECTORS[s.symbol];
      if (sec && sec !== 'Other') {
        var secCol = SECTOR_COLORS[sec] || '#9ca3af';
        html += '<div class="stk-row3"><span class="stk-sector" style="color:' + secCol + ';border-color:' + secCol + '">' + secName(sec) + '</span></div>';
      }
      html += '</a>';
    }
    grid.innerHTML = html;
  }

  // ─── View toggle (cards/table) ───
  var viewMode = 'cards';
  document.querySelectorAll('[data-view-mode]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      viewMode = btn.getAttribute('data-view-mode');
      document.querySelectorAll('[data-view-mode]').forEach(function(b) { b.classList.remove('view-btn--active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('view-btn--active');
      btn.setAttribute('aria-pressed', 'true');
      var grid = document.querySelector('[data-stocks-grid]');
      var tableWrap = document.querySelector('[data-stocks-table-wrap]');
      if (viewMode === 'table') {
        if (grid) grid.style.display = 'none';
        if (tableWrap) tableWrap.style.display = '';
        renderStocksTable();
      } else {
        if (grid) grid.style.display = '';
        if (tableWrap) tableWrap.style.display = 'none';
        renderStocks();
      }
    });
  });

  function renderStocksTable() {
    var tbody = document.querySelector('[data-stocks-tbody]');
    if (!tbody || stocksData.length === 0) return;
    var data = stocksData;
    if (activeSector && activeSector !== 'all') {
      data = data.filter(function(s) { return (STOCK_SECTORS[s.symbol] || 'Other') === activeSector; });
    }
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      data = data.filter(function(s) {
        var sym = (s.symbol || '').toLowerCase();
        var desc = (s.description || '').toLowerCase();
        var name = (STOCK_NAMES[s.symbol] || '').toLowerCase();
        return sym.indexOf(q) !== -1 || desc.indexOf(q) !== -1 || name.indexOf(q) !== -1;
      });
    }
    var sorted = data.slice().sort(function(a, b) {
      var key = currentSort.key;
      var av = a[key], bv = b[key];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv || '').toLowerCase(); }
      if (av == null) av = 0; if (bv == null) bv = 0;
      var cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return currentSort.dir === 'desc' ? -cmp : cmp;
    });
    var html = '';
    for (var i = 0; i < sorted.length; i++) {
      var s = sorted[i];
      var pct = s.variation != null ? s.variation * 100 : null;
      var pctClass = pct != null ? (pct >= 0 ? 'rc-up' : 'rc-down') : '';
      var arrow = pct != null ? (pct >= 0 ? '▲' : '▼') : '';
      html += '<tr class="stbl-row" data-symbol="' + s.symbol + '">';
      html += '<td class="stbl-td stbl-td--name">';
      html += '<a href="/' + lang + '/markets/stock/' + encodeURIComponent(s.symbol) + '" class="stbl-link">';
      html += logoHtml(s.symbol);
      html += '<div class="stbl-name-text"><span class="stbl-sym">' + s.symbol + '</span>';
      html += '<span class="stbl-desc">' + (STOCK_NAMES[s.symbol] || s.description || '') + '</span></div></a></td>';
      html += '<td class="stbl-td stbl-td--num">' + (s.price ? 'ARS ' + C.fmt(s.price) : '—') + '</td>';
      html += '<td class="stbl-td stbl-td--num"><span class="stbl-pct ' + pctClass + '">' + arrow + ' ' + (pct != null ? Math.abs(pct).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%' : '—') + '</span></td>';
      html += '<td class="stbl-td stbl-td--num">' + (s.volume ? C.fmtVol(s.volume) : '—') + '</td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;
    // Make rows clickable
    tbody.querySelectorAll('.stbl-row').forEach(function(row) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function(e) {
        if (e.target.closest('a')) return;
        var sym = row.getAttribute('data-symbol');
        if (sym) window.location.href = '/' + lang + '/markets/stock/' + encodeURIComponent(sym);
      });
    });
  }

  // ─── Sort buttons ───
  document.querySelectorAll('[data-sort-btn]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var key = btn.getAttribute('data-sort-btn');
      if (currentSort.key === key) {
        currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = { key: key, dir: key === 'symbol' ? 'asc' : 'desc' };
      }
      document.querySelectorAll('[data-sort-btn]').forEach(function(b) { b.classList.remove('sort-btn--active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('sort-btn--active');
      btn.setAttribute('aria-pressed', 'true');
      renderStocks();
    });
  });

  // ─── Resize handler ───
  var rTimer;
  function redrawChart() {
    clearTimeout(rTimer);
    rTimer = setTimeout(function() {
      if (!chartData) return;
      var points = C.yahooToPoints(chartData.timestamps, chartData.closes);
      C.drawChart(document.querySelector('[data-merval-chart]'), [
        { points: points, lineColor: '#60a5fa', fillColor: 'rgba(96,165,250,0.12)' }
      ], { yFormat: C.fmtM, volumes: chartData.volumes || [] });
    }, 200);
  }
  var chartWrapEl = document.querySelector('.chart-wrap');
  if (chartWrapEl && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(redrawChart).observe(chartWrapEl);
  } else {
    window.addEventListener('resize', redrawChart);
  }
  // Arrow key navigation for heatmap cells
  document.addEventListener('keydown', function(e) {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    var active = document.activeElement;
    if (!active || !active.classList.contains('mv-hm-cell')) return;
    var cells = Array.from(document.querySelectorAll('.mv-hm-cell'));
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

  // Arrow key navigation for stock card grid
  document.addEventListener('keydown', function(e) {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    var active = document.activeElement;
    if (!active || !active.classList.contains('stk-card')) return;
    var grid = active.parentElement;
    if (!grid || !grid.classList.contains('stocks-grid')) return;
    var cards = Array.from(grid.querySelectorAll('.stk-card'));
    var idx = cards.indexOf(active);
    if (idx < 0) return;
    var cols = Math.max(1, Math.round(grid.offsetWidth / active.offsetWidth));
    var next = -1;
    if (e.key === 'ArrowRight') next = idx + 1;
    else if (e.key === 'ArrowLeft') next = idx - 1;
    else if (e.key === 'ArrowDown') next = idx + cols;
    else if (e.key === 'ArrowUp') next = idx - cols;
    if (next >= 0 && next < cards.length) {
      e.preventDefault();
      cards[next].focus();
    }
  });

  // Ctrl/Cmd+K to focus search
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      var si = document.querySelector('[data-stocks-search]');
      if (si) { si.focus(); si.select(); }
    }
  });

  // Scroll to top button
  // Scroll-reveal for sections
  if ('IntersectionObserver' in window) {
    var revealObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('mv-visible'); revealObs.unobserve(e.target); }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.mkt-summary, .movers-section, .sector-section, .mcap-conc-section, .sector-perf-section, .vol-dist-section, .vol-leaders-section').forEach(function(s) {
      revealObs.observe(s);
    });
  } else {
    document.querySelectorAll('.mkt-summary, .movers-section, .sector-section, .mcap-conc-section, .sector-perf-section, .vol-dist-section, .vol-leaders-section').forEach(function(s) {
      s.classList.add('mv-visible');
    });
  }

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

  // ─── Auto-refresh every 5 minutes with countdown ───
  var REFRESH_INTERVAL = 5 * 60; // seconds
  var refreshRemaining = REFRESH_INTERVAL;
  var countdownEl = null;

  function initCountdown() {
    var updEl = document.querySelector('[data-mkts-updated]');
    if (!updEl) return;
    countdownEl = document.createElement('span');
    countdownEl.className = 'refresh-countdown';
    updEl.appendChild(countdownEl);
  }

  function tickCountdown() {
    refreshRemaining--;
    if (countdownEl) {
      var m = Math.floor(refreshRemaining / 60);
      var s = refreshRemaining % 60;
      countdownEl.textContent = '(' + m + ':' + (s < 10 ? '0' : '') + s + ')';
    }
    if (refreshRemaining <= 0) {
      refreshData();
    }
  }

  function refreshData() {
    refreshRemaining = REFRESH_INTERVAL;
    Promise.all([loadIndexData(), loadStocksData()]).then(function(res) {
      var merval = res[0];
      var stocks = res[1];
      var updEl = document.querySelector('[data-mkts-updated]');
      if (updEl) {
        updEl.innerHTML = '<span class="live-dot"></span>' + I.updated + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
        initCountdown();
      }
      if (merval && merval.price) {
        setEl('[data-idx-price]', C.fmtM(merval.price));
        if (merval.high) setEl('[data-idx-high]', C.fmtM(merval.high));
        if (merval.low) setEl('[data-idx-low]', C.fmtM(merval.low));
        if (merval.volume) setEl('[data-idx-vol]', C.fmtVol(merval.volume));
        var mPct = merval.variation != null ? merval.variation * 100 : null;
        if (mPct == null && merval.previousClose > 0) mPct = ((merval.price - merval.previousClose) / merval.previousClose) * 100;
        var chEl = document.querySelector('[data-idx-change]');
        if (chEl && mPct != null) {
          var oldChg2 = chEl.textContent;
          var newChg2 = C.pctText(mPct);
          chEl.textContent = newChg2;
          chEl.className = 'idx-change ' + (mPct >= 0 ? 'rc-up' : 'rc-down');
          flashEl(chEl, newChg2, oldChg2);
        }
      }
      if (stocks && Array.isArray(stocks) && stocks.length > 0) {
        stocksData = stocks;
        renderMovers(stocks);
        renderStocks();
      }
    }).catch(function() {});
  }

  initCountdown();
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
