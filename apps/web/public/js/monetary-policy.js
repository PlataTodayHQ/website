(function() {
  var pg = document.querySelector('[data-bcra-page]');
  if (!pg) return;
  var lang = pg.getAttribute('data-lang') || 'en';
  var i18nError = pg.getAttribute('data-i18n-error') || 'Failed to load data';
  var i18nRetry = pg.getAttribute('data-i18n-retry') || 'Retry';
  var i18nUpdated = pg.getAttribute('data-i18n-updated') || 'Updated';

  // ─── Educational panel dismiss ───
  var infoPanel = pg.querySelector('[data-bcra-info]');
  if (infoPanel) {
    var KEY = 'plata_bcra_info_seen';
    if (localStorage.getItem(KEY) === '1') {
      infoPanel.removeAttribute('open');
    }
    infoPanel.addEventListener('toggle', function() {
      if (!infoPanel.open) localStorage.setItem(KEY, '1');
      else localStorage.removeItem(KEY);
    });
  }

  // ─── Format helpers ───
  function fmtRate(v) {
    if (v == null) return '—';
    return v.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  function fmtReserves(v) {
    if (v == null) return '—';
    // v is in millions, display as billions
    var billions = v / 1000;
    return billions.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtMonetaryBase(v) {
    if (v == null) return '—';
    // v is in millions, display as trillions
    var trillions = v / 1000000;
    return trillions.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtIndex(v) {
    if (v == null) return '—';
    return v.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var formatters = {
    rate: fmtRate,
    reserves: fmtReserves,
    monetaryBase: fmtMonetaryBase,
    badlar: fmtRate,
    cer: fmtIndex,
    uva: fmtIndex,
    plazoFijoTNA: fmtRate
  };

  // ─── Fetch BCRA data ───
  function fetchBcra() {
    fetch('/api/bcra')
      .then(function(r) { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(function(data) {
        var keys = ['rate', 'reserves', 'monetaryBase', 'badlar', 'cer', 'uva', 'plazoFijoTNA'];
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          var el = pg.querySelector('[data-bcra-val="' + k + '"]');
          if (el) {
            var fmt = formatters[k] || fmtIndex;
            el.textContent = fmt(data[k]);
          }
          var card = pg.querySelector('[data-bcra-card="' + k + '"]');
          if (card) card.classList.remove('bcra-card--loading');
        }
        // Update timestamp
        var updEl = pg.querySelector('[data-bcra-updated]');
        if (updEl) {
          var now = new Date();
          updEl.textContent = i18nUpdated + ' ' + now.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
        }
      })
      .catch(function(err) {
        console.error('BCRA fetch error:', err);
        var updEl = pg.querySelector('[data-bcra-updated]');
        if (updEl) updEl.textContent = i18nError;
      });
  }

  // ─── SVG Chart ───
  function fetchAndDrawChart() {
    fetch('/api/economic-history?indicator=bcra_rate&days=365')
      .then(function(r) { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(function(data) {
        if (!data || !data.length || data.length < 3) return;
        drawChart(data);
      })
      .catch(function(err) {
        console.error('BCRA chart fetch error:', err);
      });
  }

  function drawChart(data) {
    var section = pg.querySelector('[data-bcra-chart-section]');
    var svg = pg.querySelector('[data-bcra-chart]');
    if (!svg || !section) return;

    section.style.display = '';

    var W = svg.parentElement.clientWidth || 800;
    var H = 280;
    var PAD_L = 56;
    var PAD_R = 16;
    var PAD_T = 16;
    var PAD_B = 32;

    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    var vals = data.map(function(d) { return d.value; });
    var minV = Math.min.apply(null, vals);
    var maxV = Math.max.apply(null, vals);
    var rangeV = maxV - minV || 1;

    // Add 5% padding to y range
    minV -= rangeV * 0.05;
    maxV += rangeV * 0.05;
    rangeV = maxV - minV;

    var plotW = W - PAD_L - PAD_R;
    var plotH = H - PAD_T - PAD_B;

    function xPos(i) { return PAD_L + (i / (data.length - 1)) * plotW; }
    function yPos(v) { return PAD_T + plotH - ((v - minV) / rangeV) * plotH; }

    // Build polyline points
    var points = [];
    for (var i = 0; i < data.length; i++) {
      points.push(xPos(i).toFixed(1) + ',' + yPos(data[i].value).toFixed(1));
    }

    // Fill area
    var areaPoints = points.slice();
    areaPoints.push(xPos(data.length - 1).toFixed(1) + ',' + (PAD_T + plotH));
    areaPoints.push(PAD_L + ',' + (PAD_T + plotH));

    // Y-axis labels (5 ticks)
    var yLabels = '';
    var gridLines = '';
    for (var yi = 0; yi <= 4; yi++) {
      var val = minV + (rangeV * yi / 4);
      var y = yPos(val);
      yLabels += '<text x="' + (PAD_L - 8) + '" y="' + (y + 4) + '" class="bcra-chart-label" text-anchor="end">' + val.toFixed(1) + '%</text>';
      gridLines += '<line x1="' + PAD_L + '" y1="' + y + '" x2="' + (W - PAD_R) + '" y2="' + y + '" class="bcra-chart-grid"/>';
    }

    // X-axis labels (6 ticks)
    var xLabels = '';
    var xCount = Math.min(6, data.length);
    for (var xi = 0; xi < xCount; xi++) {
      var idx = Math.round(xi * (data.length - 1) / (xCount - 1));
      var d = data[idx];
      var dateStr = d.date;
      // Format as MMM 'YY
      var parts = dateStr.split('-');
      var mo = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1).toLocaleDateString(lang, { month: 'short' });
      var yr = parts[0] ? "'" + parts[0].slice(2) : '';
      xLabels += '<text x="' + xPos(idx).toFixed(1) + '" y="' + (H - 6) + '" class="bcra-chart-label" text-anchor="middle">' + mo + ' ' + yr + '</text>';
    }

    svg.innerHTML =
      gridLines +
      '<polygon points="' + areaPoints.join(' ') + '" class="bcra-chart-fill"/>' +
      '<polyline points="' + points.join(' ') + '" class="bcra-chart-line" fill="none"/>' +
      yLabels + xLabels;
  }

  // ─── Init ───
  fetchBcra();
  fetchAndDrawChart();

  // Refresh every 5 minutes
  setInterval(fetchBcra, 5 * 60 * 1000);

  // Redraw chart on resize
  var resizeTimer;
  var chartData = null;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      // Re-fetch and redraw
      fetch('/api/economic-history?indicator=bcra_rate&days=365')
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(d) { if (d && d.length >= 3) drawChart(d); })
        .catch(function() {});
    }, 250);
  });
})();
