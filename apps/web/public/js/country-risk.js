(function() {
  var pg = document.querySelector('[data-cr-page]');
  if (!pg) return;
  var lang = pg.getAttribute('data-lang') || 'en';
  var i18nUpdated = pg.getAttribute('data-i18n-updated') || 'Updated';
  var i18nBps = pg.getAttribute('data-i18n-bps') || 'bps';
  var activeDays = 365;
  var historyData = null;

  // ─── Educational panel dismiss ───
  var eduSection = document.querySelector('[data-cr-edu]');
  var dismissBtn = document.querySelector('[data-cr-edu-dismiss]');
  if (localStorage.getItem('cr-edu-dismissed') === '1' && eduSection) {
    eduSection.style.display = 'none';
  }
  if (dismissBtn) {
    dismissBtn.addEventListener('click', function() {
      localStorage.setItem('cr-edu-dismissed', '1');
      if (eduSection) eduSection.style.display = 'none';
    });
  }

  // ─── Formatting helpers ───
  function fmt(n) {
    if (n == null) return '—';
    return Math.round(n).toLocaleString(lang);
  }

  // ─── Fetch current value ───
  function fetchCurrent() {
    fetch('/api/country-risk')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d && d.value != null) {
          var valEl = document.querySelector('[data-cr-value]');
          if (valEl) valEl.textContent = fmt(d.value);
          var statEl = document.querySelector('[data-cr-stat="current"]');
          if (statEl) statEl.textContent = fmt(d.value) + ' ' + i18nBps;
        }
        var updEl = document.querySelector('[data-cr-updated]');
        if (updEl) updEl.innerHTML = '<span class="live-dot"></span>' + i18nUpdated + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
      })
      .catch(function() {});
  }

  // ─── SVG Chart ───
  function drawChart(data, svgEl) {
    if (!data || data.length < 2 || !svgEl) return;

    var wrap = svgEl.parentElement;
    var W = wrap ? wrap.clientWidth : 800;
    var H = 320;
    var padTop = 30, padBottom = 40, padLeft = 60, padRight = 20;
    var chartW = W - padLeft - padRight;
    var chartH = H - padTop - padBottom;

    var values = data.map(function(d) { return d.value; });
    var minV = Math.min.apply(null, values);
    var maxV = Math.max.apply(null, values);
    var range = maxV - minV || 1;
    // Add 5% padding
    minV = minV - range * 0.05;
    maxV = maxV + range * 0.05;
    range = maxV - minV;

    function x(i) { return padLeft + (i / (data.length - 1)) * chartW; }
    function y(v) { return padTop + (1 - (v - minV) / range) * chartH; }

    // Build polyline points
    var points = data.map(function(d, i) { return x(i) + ',' + y(d.value); }).join(' ');

    // Fill area
    var areaPoints = padLeft + ',' + (padTop + chartH) + ' ' + points + ' ' + (padLeft + chartW) + ',' + (padTop + chartH);

    // Y-axis labels (5 ticks)
    var yLabels = '';
    var gridLines = '';
    for (var t = 0; t <= 4; t++) {
      var val = minV + (t / 4) * range;
      var yPos = y(val);
      yLabels += '<text x="' + (padLeft - 8) + '" y="' + (yPos + 4) + '" class="cr-axis-label" text-anchor="end">' + Math.round(val) + '</text>';
      gridLines += '<line x1="' + padLeft + '" y1="' + yPos + '" x2="' + (W - padRight) + '" y2="' + yPos + '" class="cr-grid-line"/>';
    }

    // X-axis labels (show ~6 dates)
    var xLabels = '';
    var step = Math.max(1, Math.floor(data.length / 6));
    for (var i = 0; i < data.length; i += step) {
      var d = data[i].date;
      var parts = d.split('-');
      var label = parseInt(parts[2]) + '/' + parseInt(parts[1]);
      xLabels += '<text x="' + x(i) + '" y="' + (H - 8) + '" class="cr-axis-label" text-anchor="middle">' + label + '</text>';
    }

    // Tooltip line + circle (hidden by default)
    var tooltipG = '<g data-cr-tooltip style="display:none">' +
      '<line data-cr-tt-line class="cr-tt-line" x1="0" y1="' + padTop + '" x2="0" y2="' + (padTop + chartH) + '"/>' +
      '<circle data-cr-tt-dot class="cr-tt-dot" r="4" cx="0" cy="0"/>' +
      '<rect data-cr-tt-bg class="cr-tt-bg" rx="4" width="0" height="0" x="0" y="0"/>' +
      '<text data-cr-tt-text class="cr-tt-text" x="0" y="0"></text>' +
      '</g>';

    svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svgEl.setAttribute('width', W);
    svgEl.setAttribute('height', H);
    svgEl.innerHTML =
      '<defs>' +
        '<linearGradient id="crFill" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="var(--color-gold)" stop-opacity="0.25"/>' +
          '<stop offset="100%" stop-color="var(--color-gold)" stop-opacity="0.02"/>' +
        '</linearGradient>' +
      '</defs>' +
      gridLines +
      '<polygon points="' + areaPoints + '" fill="url(#crFill)"/>' +
      '<polyline points="' + points + '" fill="none" stroke="var(--color-gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      yLabels + xLabels +
      '<rect data-cr-hover class="cr-hover-rect" x="' + padLeft + '" y="' + padTop + '" width="' + chartW + '" height="' + chartH + '" fill="transparent"/>' +
      tooltipG;

    // Interactive tooltip
    var hoverRect = svgEl.querySelector('[data-cr-hover]');
    var ttGroup = svgEl.querySelector('[data-cr-tooltip]');
    var ttLine = svgEl.querySelector('[data-cr-tt-line]');
    var ttDot = svgEl.querySelector('[data-cr-tt-dot]');
    var ttBg = svgEl.querySelector('[data-cr-tt-bg]');
    var ttText = svgEl.querySelector('[data-cr-tt-text]');

    if (hoverRect && ttGroup) {
      hoverRect.addEventListener('mousemove', function(e) {
        var rect = svgEl.getBoundingClientRect();
        var mx = (e.clientX - rect.left) * (W / rect.width);
        var idx = Math.round(((mx - padLeft) / chartW) * (data.length - 1));
        idx = Math.max(0, Math.min(data.length - 1, idx));
        var d = data[idx];
        var px = x(idx);
        var py = y(d.value);

        ttGroup.style.display = '';
        ttLine.setAttribute('x1', px);
        ttLine.setAttribute('x2', px);
        ttDot.setAttribute('cx', px);
        ttDot.setAttribute('cy', py);

        var label = d.date + ': ' + Math.round(d.value) + ' ' + i18nBps;
        ttText.textContent = label;
        var textW = label.length * 7 + 16;
        var textX = Math.min(px + 8, W - padRight - textW);
        ttBg.setAttribute('x', textX);
        ttBg.setAttribute('y', py - 24);
        ttBg.setAttribute('width', textW);
        ttBg.setAttribute('height', 22);
        ttText.setAttribute('x', textX + 8);
        ttText.setAttribute('y', py - 10);
      });
      hoverRect.addEventListener('mouseleave', function() {
        ttGroup.style.display = 'none';
      });
    }
  }

  // ─── Fetch history + compute stats ───
  function fetchHistory(days) {
    fetch('/api/economic-history?indicator=country_risk&days=' + days)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!Array.isArray(data) || data.length === 0) return;
        historyData = data;

        var svgEl = document.querySelector('[data-cr-chart]');
        drawChart(data, svgEl);

        // Compute stats
        var values = data.map(function(d) { return d.value; });
        var current = values[values.length - 1];
        var high52 = Math.max.apply(null, values);
        var low52 = Math.min.apply(null, values);

        // 30-day avg
        var last30 = values.slice(-30);
        var sum30 = 0;
        for (var i = 0; i < last30.length; i++) sum30 += last30[i];
        var avg30 = last30.length > 0 ? sum30 / last30.length : current;

        // Daily change
        if (values.length >= 2) {
          var prev = values[values.length - 2];
          var diff = current - prev;
          var pct = prev > 0 ? (diff / prev) * 100 : 0;
          var chgEl = document.querySelector('[data-cr-change]');
          if (chgEl) {
            var sign = diff >= 0 ? '+' : '';
            chgEl.textContent = sign + Math.round(diff) + ' (' + sign + pct.toFixed(2) + '%)';
            chgEl.className = 'cr-hero-change ' + (diff >= 0 ? 'rc-up' : 'rc-down');
          }
        }

        // Update stat cards
        var statCurrent = document.querySelector('[data-cr-stat="current"]');
        if (statCurrent) statCurrent.textContent = fmt(current) + ' ' + i18nBps;

        var statAvg = document.querySelector('[data-cr-stat="avg30"]');
        if (statAvg) statAvg.textContent = fmt(avg30) + ' ' + i18nBps;

        var statHigh = document.querySelector('[data-cr-stat="high52"]');
        if (statHigh) statHigh.textContent = fmt(high52) + ' ' + i18nBps;

        var statLow = document.querySelector('[data-cr-stat="low52"]');
        if (statLow) statLow.textContent = fmt(low52) + ' ' + i18nBps;

        // Update hero value from historical data too
        var valEl = document.querySelector('[data-cr-value]');
        if (valEl) valEl.textContent = fmt(current);
      })
      .catch(function(err) {
        console.error('[country-risk] History fetch error:', err);
      });
  }

  // ─── Tab switching ───
  var tabs = document.querySelectorAll('[data-cr-tab]');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) { t.classList.remove('cr-tab--active'); });
      tab.classList.add('cr-tab--active');
      activeDays = parseInt(tab.getAttribute('data-cr-tab'), 10);
      fetchHistory(activeDays);
    });
  });

  // ─── Resize handling ───
  var rTimer;
  function handleResize() {
    if (historyData) {
      var svgEl = document.querySelector('[data-cr-chart]');
      drawChart(historyData, svgEl);
    }
  }
  if (typeof ResizeObserver !== 'undefined') {
    var wrap = document.querySelector('[data-cr-chart-wrap]');
    if (wrap) {
      new ResizeObserver(function() {
        clearTimeout(rTimer);
        rTimer = setTimeout(handleResize, 150);
      }).observe(wrap);
    }
  } else {
    window.addEventListener('resize', function() {
      clearTimeout(rTimer);
      rTimer = setTimeout(handleResize, 200);
    });
  }

  // ─── Init ───
  fetchCurrent();
  fetchHistory(activeDays);

  // Auto-refresh every 5 minutes
  setInterval(function() {
    fetchCurrent();
    fetchHistory(activeDays);
  }, 5 * 60 * 1000);
})();
