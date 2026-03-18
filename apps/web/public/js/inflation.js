(function() {
  var pg = document.querySelector('[data-inflation-page]');
  if (!pg) return;
  var lang = pg.getAttribute('data-lang') || 'en';
  var annualInflation = null;

  // i18n helper
  function i18n(key, fallback) { return pg.getAttribute('data-i18n-' + key) || fallback || ''; }

  // localStorage dismiss for educational panel
  var eduKey = 'plata_inflation_info_seen';
  var edu = pg.querySelector('[data-inf-edu]');
  if (edu && localStorage.getItem(eduKey)) {
    edu.removeAttribute('open');
  }
  if (edu) {
    edu.addEventListener('toggle', function() {
      if (!edu.open) localStorage.setItem(eduKey, '1');
    });
  }

  // Format percentage with 1 decimal
  function fmtPct(val) {
    if (val == null) return '--';
    return val.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }

  // Format number with 2 decimals
  function fmtNum(val) {
    if (val == null) return '--';
    return val.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Calculate real return
  function calcRealReturn() {
    var input = pg.querySelector('[data-inf-nominal]');
    var result = pg.querySelector('[data-inf-real-return]');
    var note = pg.querySelector('[data-inf-calc-note]');
    if (!input || !result) return;

    var nominal = parseFloat(input.value);
    if (isNaN(nominal) || annualInflation == null) {
      result.textContent = '--';
      result.className = 'inf-calc-result';
      if (note) note.textContent = '';
      return;
    }

    var real = ((1 + nominal / 100) / (1 + annualInflation / 100) - 1) * 100;
    result.textContent = (real >= 0 ? '+' : '') + real.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    result.className = 'inf-calc-result ' + (real >= 0 ? 'inf-calc-positive' : 'inf-calc-negative');

    if (note) {
      if (real < 0) {
        note.textContent = i18n('calc-note-losing', 'With annual inflation at {inflation}, a {nominal} nominal return means you are losing purchasing power.').replace('{inflation}', fmtPct(annualInflation)).replace('{nominal}', fmtPct(nominal));
      } else {
        note.textContent = i18n('calc-note-gaining', 'With annual inflation at {inflation}, your real gain is {real}.').replace('{inflation}', fmtPct(annualInflation)).replace('{real}', fmtPct(real));
      }
    }
  }

  // Listen to calculator input
  var nominalInput = pg.querySelector('[data-inf-nominal]');
  if (nominalInput) {
    nominalInput.addEventListener('input', calcRealReturn);
  }

  // Fetch inflation data
  fetch('/api/inflation')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      // Remove loading states
      pg.querySelectorAll('.inf-stat-card--loading').forEach(function(el) {
        el.classList.remove('inf-stat-card--loading');
      });

      // Update hero stats
      var monthlyEl = pg.querySelector('[data-inf-monthly]');
      var annualEl = pg.querySelector('[data-inf-annual]');
      var cerEl = pg.querySelector('[data-inf-cer]');

      if (monthlyEl) monthlyEl.textContent = fmtPct(data.monthly);
      if (annualEl) annualEl.textContent = fmtPct(data.annual);
      if (cerEl) cerEl.textContent = data.cer != null ? fmtNum(data.cer) : '--';

      // Store annual for calculator
      annualInflation = data.annual;
      calcRealReturn();

      // Update timestamp
      var updEl = pg.querySelector('[data-inf-updated]');
      if (updEl) {
        updEl.innerHTML = '<span class="live-dot"></span>' + i18n('updated', 'Updated') + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
      }
    })
    .catch(function() {
      pg.querySelectorAll('.inf-stat-card--loading').forEach(function(el) {
        el.classList.remove('inf-stat-card--loading');
      });
    });

  // Fetch historical chart data
  fetch('/api/economic-history?indicator=inflation_monthly&days=730')
    .then(function(r) { return r.json(); })
    .then(function(history) {
      var chartEl = pg.querySelector('[data-inf-chart]');
      if (!chartEl || !Array.isArray(history) || history.length === 0) {
        if (chartEl) chartEl.innerHTML = '<p class="inf-chart-empty">' + i18n('no-data', 'No historical data available') + '</p>';
        return;
      }

      // Group by month (take latest value per month)
      var months = {};
      var monthOrder = [];
      for (var i = 0; i < history.length; i++) {
        var d = new Date(history[i].date);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!months[key]) {
          months[key] = { date: d, value: history[i].value, key: key };
          monthOrder.push(key);
        } else {
          // Keep the latest date per month
          if (d > months[key].date) {
            months[key] = { date: d, value: history[i].value, key: key };
          }
        }
      }

      // Sort by date
      monthOrder.sort();

      // Build data array
      var data = [];
      for (var j = 0; j < monthOrder.length; j++) {
        data.push(months[monthOrder[j]]);
      }

      if (data.length === 0) {
        chartEl.innerHTML = '<p class="inf-chart-empty">' + i18n('no-data', 'No historical data available') + '</p>';
        return;
      }

      // Find max value for scaling
      var maxVal = 0;
      for (var k = 0; k < data.length; k++) {
        if (Math.abs(data[k].value) > maxVal) maxVal = Math.abs(data[k].value);
      }
      if (maxVal === 0) maxVal = 1;

      // SVG bar chart
      var svgW = 800;
      var svgH = 300;
      var padTop = 30;
      var padBottom = 50;
      var padLeft = 50;
      var padRight = 20;
      var chartW = svgW - padLeft - padRight;
      var chartH = svgH - padTop - padBottom;
      var barCount = data.length;
      var barGap = Math.max(2, Math.floor(chartW / barCount * 0.15));
      var barW = Math.max(4, Math.floor((chartW - barGap * barCount) / barCount));

      var svg = '<svg viewBox="0 0 ' + svgW + ' ' + svgH + '" style="width:100%;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">';

      // Y-axis grid lines
      var gridSteps = 5;
      var stepVal = maxVal / gridSteps;
      // Round step to nice number
      if (stepVal > 1) stepVal = Math.ceil(stepVal);
      else stepVal = Math.ceil(stepVal * 10) / 10;
      maxVal = stepVal * gridSteps;

      var textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-meta').trim() || '#9ca3af';
      var borderColor = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim() || '#e5e7eb';

      for (var g = 0; g <= gridSteps; g++) {
        var gy = padTop + chartH - (g / gridSteps) * chartH;
        var gv = (stepVal * g).toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        svg += '<line x1="' + padLeft + '" y1="' + gy + '" x2="' + (svgW - padRight) + '" y2="' + gy + '" stroke="' + borderColor + '" stroke-width="1" stroke-dasharray="4,4"/>';
        svg += '<text x="' + (padLeft - 8) + '" y="' + (gy + 4) + '" text-anchor="end" fill="' + textColor + '" font-size="11" font-weight="600">' + gv + '%</text>';
      }

      // Bars
      var shortMonths = [];
      for (var m = 0; m < 12; m++) {
        shortMonths.push(new Date(2000, m, 1).toLocaleString(lang, { month: 'short' }));
      }
      for (var b = 0; b < data.length; b++) {
        var val = data[b].value;
        var barH = Math.max(2, (Math.abs(val) / maxVal) * chartH);
        var bx = padLeft + b * (barW + barGap) + barGap / 2;
        var by = padTop + chartH - barH;

        // Color: compare with previous month for trend
        var barColor;
        if (b > 0 && val < data[b - 1].value) {
          barColor = '#16a34a'; // green — declining
        } else if (b > 0 && val > data[b - 1].value) {
          barColor = '#dc2626'; // red — increasing
        } else {
          barColor = '#eab308'; // yellow — same
        }

        svg += '<rect x="' + bx + '" y="' + by + '" width="' + barW + '" height="' + barH + '" rx="2" fill="' + barColor + '" opacity="0.85">';
        svg += '<title>' + shortMonths[data[b].date.getMonth()] + ' ' + data[b].date.getFullYear() + ': ' + val.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%</title>';
        svg += '</rect>';

        // X-axis labels (show every month or every other month if too many)
        var showLabel = data.length <= 12 || b % 2 === 0 || b === data.length - 1;
        if (showLabel) {
          var labelText = shortMonths[data[b].date.getMonth()];
          // Show year for January or first bar
          if (data[b].date.getMonth() === 0 || b === 0) {
            labelText += ' ' + String(data[b].date.getFullYear()).slice(2);
          }
          svg += '<text x="' + (bx + barW / 2) + '" y="' + (padTop + chartH + 20) + '" text-anchor="middle" fill="' + textColor + '" font-size="10" font-weight="600">' + labelText + '</text>';
        }
      }

      // Legend
      svg += '<rect x="' + padLeft + '" y="' + (svgH - 12) + '" width="10" height="10" rx="2" fill="#16a34a" opacity="0.85"/>';
      svg += '<text x="' + (padLeft + 14) + '" y="' + (svgH - 3) + '" fill="' + textColor + '" font-size="10" font-weight="600">' + i18n('legend-declining', 'Declining') + '</text>';
      svg += '<rect x="' + (padLeft + 80) + '" y="' + (svgH - 12) + '" width="10" height="10" rx="2" fill="#dc2626" opacity="0.85"/>';
      svg += '<text x="' + (padLeft + 94) + '" y="' + (svgH - 3) + '" fill="' + textColor + '" font-size="10" font-weight="600">' + i18n('legend-increasing', 'Increasing') + '</text>';

      svg += '</svg>';
      chartEl.innerHTML = svg;
    })
    .catch(function() {
      var chartEl = pg.querySelector('[data-inf-chart]');
      if (chartEl) chartEl.innerHTML = '<p class="inf-chart-empty">' + i18n('chart-error', 'Failed to load chart data') + '</p>';
    });

  // Scroll to top button
  var scrollBtn = pg.querySelector('[data-scroll-top]');
  if (scrollBtn) {
    window.addEventListener('scroll', function() {
      scrollBtn.classList.toggle('scroll-top-btn--visible', window.scrollY > 400);
    }, { passive: true });
    scrollBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
