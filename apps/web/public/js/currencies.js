// Scroll indicators for FX rate strip
(function() {
  var wrap = document.querySelector('.fx-strip-wrap');
  var strip = wrap && wrap.querySelector('.fx-strip');
  if (!strip || !wrap) return;
  function update() {
    var sl = strip.scrollLeft, sw = strip.scrollWidth, cw = strip.clientWidth;
    wrap.classList.toggle('fx-strip-wrap--scrolled', sl > 8);
    wrap.classList.toggle('fx-strip-wrap--at-end', sl + cw >= sw - 8);
  }
  strip.addEventListener('scroll', update, { passive: true });
  update();
  new ResizeObserver(update).observe(strip);
})();

(function() {
  var LATEST = 'https://api.bluelytics.com.ar/v2/latest';
  var EVO = 'https://api.bluelytics.com.ar/v2/evolution.json?days=30';
  var C = window.PlataCharts;
  var pg = document.querySelector('[data-currencies-page]');
  var i18nError = pg.getAttribute('data-i18n-error') || 'Failed to load data';
  var i18nRetry = pg.getAttribute('data-i18n-retry') || 'Retry';
  var i18nCheckConn = pg.getAttribute('data-i18n-check-conn') || 'Check your connection and try again';
  var lang = (pg && pg.getAttribute('data-lang')) || 'en';
  function i18n(key, fallback) { return (pg && pg.getAttribute('data-i18n-' + key)) || fallback; }

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
  function setChange(sel, percent) {
    var el = document.querySelector(sel);
    if (!el) return;
    if (percent == null) { el.textContent = ''; return; }
    var old = el.textContent;
    var sign = percent >= 0 ? '+' : '';
    var newVal = sign + percent.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
    el.textContent = newVal;
    el.className = 'fx-change ' + (percent >= 0 ? 'rc-up' : 'rc-down');
    flashEl(el, newVal, old);
  }

  var chartData = null;

  function calcSpread(rateSell, officialSell) {
    var spread = rateSell - officialSell;
    var gap = officialSell > 0 ? (spread / officialSell) * 100 : 0;
    return { spread: spread, gap: gap };
  }

  function fillRate(key, data) {
    if (!data) return;
    setEl('[data-rc-price="' + key + '"]', 'ARS ' + C.fmt(data.value_sell));
    setEl('[data-rc-buy="' + key + '"]', C.fmt(data.value_buy));
    setEl('[data-rc-sell="' + key + '"]', C.fmt(data.value_sell));
  }

  var prevGaps = {};
  function fillSpread(key, rateSell, officialSell) {
    var s = calcSpread(rateSell, officialSell);
    var sel = '[data-spread-pct="' + key + '"]';
    var el = document.querySelector(sel);
    if (el) {
      var old = el.textContent;
      var newText = (s.gap >= 0 ? '+' : '') + s.gap.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%';
      el.textContent = newText;
      el.className = 'fx-spread-val ' + (s.gap >= 0 ? 'rc-up' : 'rc-down');
      flashEl(el, newText, old);
    }
    // Gap bar: scale 0-30% range
    var fill = document.querySelector('[data-gap-fill="' + key + '"]');
    if (fill) {
      var pct = Math.min(Math.abs(s.gap) / 30 * 100, 100);
      fill.style.width = pct + '%';
      // Color: green < 5%, yellow 5-10%, orange 10-20%, red > 20%
      if (Math.abs(s.gap) < 5) fill.style.background = '#16a34a';
      else if (Math.abs(s.gap) < 10) fill.style.background = '#eab308';
      else if (Math.abs(s.gap) < 20) fill.style.background = '#f97316';
      else fill.style.background = '#dc2626';
    }
    // Trend arrow
    var arrow = document.querySelector('[data-gap-arrow="' + key + '"]');
    if (arrow) {
      var prevGap = prevGaps[key];
      if (prevGap != null && Math.abs(s.gap - prevGap) > 0.01) {
        var widening = s.gap > prevGap;
        arrow.textContent = widening ? '↑' : '↓';
        arrow.className = 'fx-gap-arrow ' + (widening ? 'fx-gap-arrow--up' : 'fx-gap-arrow--down');
        arrow.title = widening ? (i18n('widening', 'Widening')) : (i18n('narrowing', 'Narrowing'));
      }
      prevGaps[key] = s.gap;
    } else {
      prevGaps[key] = s.gap;
    }
  }

  Promise.all([
    fetch(LATEST).then(function(r) { return r.json(); }).catch(function() { return null; }),
    fetch(EVO).then(function(r) { return r.json(); }).catch(function() { return null; }),
    fetch('/api/rates').then(function(r) { return r.json(); }).catch(function() { return null; })
  ]).then(function(res) {
    var latest = res[0];
    var evoRaw = res[1];
    var apiRates = res[2];

    var fxUpdEl = document.querySelector('[data-mkts-updated]');
    if (fxUpdEl) fxUpdEl.innerHTML = '<span class="live-dot"></span>' + i18n('updated', 'Updated') + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

    // Remove shimmer loading from all rate cards
    document.querySelectorAll('.fx-rate--loading').forEach(function(el) { el.classList.remove('fx-rate--loading'); });

    if (latest && latest.oficial) {
      fillRate('official', latest.oficial);
      fillRate('blue', latest.blue);
      fillSpread('blue', latest.blue.value_sell, latest.oficial.value_sell);

      if (apiRates) {
        if (apiRates.mep) {
          fillRate('mep', apiRates.mep);
          fillSpread('mep', apiRates.mep.value_sell, latest.oficial.value_sell);
        }
        if (apiRates.ccl) {
          fillRate('ccl', apiRates.ccl);
          fillSpread('ccl', apiRates.ccl.value_sell, latest.oficial.value_sell);
        }
      }

      // Rate types with labels and colors
      var rateTypes = [
        { key: 'oficial', label: i18n('official', 'Official'), color: '#75AADB', src: latest.oficial },
        { key: 'blue', label: i18n('blue', 'Blue'), color: '#F6B40E', src: latest.blue },
        { key: 'mep', label: i18n('mep', 'MEP'), color: '#22c55e', src: apiRates && apiRates.mep },
        { key: 'ccl', label: i18n('ccl', 'CCL'), color: '#a855f7', src: apiRates && apiRates.ccl }
      ].filter(function(rt) { return rt.src && rt.src.value_sell; });

      var rates = {};
      var rateLabels = {};
      var rateColors = {};
      for (var ri = 0; ri < rateTypes.length; ri++) {
        var rt = rateTypes[ri];
        rates[rt.key] = rt.src.value_sell;
        rateLabels[rt.key] = rt.label;
        rateColors[rt.key] = rt.color;
      }
      var rateKeys = rateTypes.map(function(rt) { return rt.key; });

      // Build spread matrix
      if (rateKeys.length >= 3) {
        var spreadGrid = document.querySelector('[data-fx-spread-grid]');
        var spreadSection = document.querySelector('[data-fx-spread]');
        if (spreadGrid && spreadSection) {
          var sHtml = '';
          for (var si = 1; si < rateKeys.length; si++) {
            var rk = rateKeys[si];
            var rv = rates[rk];
            var ofv = rates['oficial'];
            var gap = ofv > 0 ? ((rv - ofv) / ofv * 100) : 0;
            var diff = rv - ofv;
            var gCls = gap > 5 ? 'fx-sp--high' : gap > 2 ? 'fx-sp--mid' : 'fx-sp--low';
            sHtml += '<div class="fx-sp-card ' + gCls + '">';
            sHtml += '<div class="fx-sp-name">' + rateLabels[rk] + ' <span class="fx-sp-vs">' + i18n('vs-official', 'vs Official') + '</span></div>';
            sHtml += '<div class="fx-sp-gap">+' + gap.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</div>';
            sHtml += '<div class="fx-sp-diff">+ARS ' + C.fmt(diff) + '</div>';
            sHtml += '</div>';
          }
          spreadGrid.innerHTML = sHtml;
          spreadSection.style.display = '';
        }
      }

      // What $100 USD gets you
      if (rateKeys.length >= 2) {
        var pppGrid = document.querySelector('[data-fx-ppp-grid]');
        var pppSection = document.querySelector('[data-fx-ppp]');
        if (pppGrid && pppSection) {
          var bestRate = 0, bestKey = '';
          for (var pk = 0; pk < rateKeys.length; pk++) { if (rates[rateKeys[pk]] > bestRate) { bestRate = rates[rateKeys[pk]]; bestKey = rateKeys[pk]; } }
          var pHtml = '';
          for (var pi = 0; pi < rateKeys.length; pi++) {
            var pkey = rateKeys[pi];
            var pv = rates[pkey];
            var arsVal = pv * 100;
            var isBest = pkey === bestKey;
            var col = rateColors[pkey] || '#9ca3af';
            pHtml += '<div class="fx-ppp-card' + (isBest ? ' fx-ppp-card--best' : '') + '" style="border-top-color:' + col + '">';
            pHtml += '<span class="fx-ppp-name">' + rateLabels[pkey] + '</span>';
            pHtml += '<span class="fx-ppp-ars">ARS ' + C.fmt(Math.round(arsVal)) + '</span>';
            pHtml += '<span class="fx-ppp-rate">@ ' + C.fmt(pv) + '/USD</span>';
            if (isBest) pHtml += '<span class="fx-ppp-best">' + i18n('best-rate', 'Best rate') + '</span>';
            pHtml += '</div>';
          }
          pppGrid.innerHTML = pHtml;
          pppSection.style.display = '';
        }
      }

      // Visual rate comparison bars
      var maxRate = 0;
      for (var mk = 0; mk < rateKeys.length; mk++) { if (rates[rateKeys[mk]] > maxRate) maxRate = rates[rateKeys[mk]]; }
      if (maxRate > 0 && rateKeys.length >= 2) {
        var bGrid = document.querySelector('[data-fx-bars-grid]');
        var bSection = document.querySelector('[data-fx-bars]');
        if (bGrid && bSection) {
          var bHtml = '';
          for (var bi = 0; bi < rateKeys.length; bi++) {
            var bk = rateKeys[bi];
            var bv = rates[bk];
            var bPct = (bv / maxRate * 100).toFixed(1);
            var bColor = rateColors[bk] || '#9ca3af';
            bHtml += '<div class="fx-bar-row">';
            bHtml += '<span class="fx-bar-label">' + rateLabels[bk] + '</span>';
            bHtml += '<div class="fx-bar-track"><div class="fx-bar-fill" style="width:' + bPct + '%;background:' + bColor + '"></div></div>';
            bHtml += '<span class="fx-bar-val">ARS ' + C.fmt(bv) + '</span>';
            bHtml += '</div>';
          }
          bGrid.innerHTML = bHtml;
          bSection.style.display = '';
        }
      }
    }

    if (evoRaw && evoRaw.length > 0) {
      var parsed = C.parseEvolution(evoRaw);
      chartData = parsed;

      if (parsed.official.length >= 2) {
        C.drawSpark(document.querySelector('[data-spark="official"]'), parsed.official.map(function(p) { return p.v; }), '#75AADB', 'rgba(117,170,219,0.18)');
      }
      if (parsed.blue.length >= 2) {
        C.drawSpark(document.querySelector('[data-spark="blue"]'), parsed.blue.map(function(p) { return p.v; }), '#F6B40E', 'rgba(246,180,14,0.18)');
      }

      if (parsed.official.length >= 2) {
        var o = parsed.official;
        setChange('[data-rc-change="official"]', ((o[o.length - 1].v - o[o.length - 2].v) / o[o.length - 2].v) * 100);
      }
      if (parsed.blue.length >= 2) {
        var b = parsed.blue;
        setChange('[data-rc-change="blue"]', ((b[b.length - 1].v - b[b.length - 2].v) / b[b.length - 2].v) * 100);
      }

      C.drawChart(document.querySelector('[data-evo-chart]'), [
        { points: parsed.official, lineColor: '#75AADB', fillColor: 'rgba(117,170,219,0.08)', label: i18n('official', 'Official') },
        { points: parsed.blue, lineColor: '#F6B40E', fillColor: 'rgba(246,180,14,0.10)', label: i18n('blue', 'Blue') }
      ], { height: 320 });

      buildPerformance(parsed);
      buildVolatility(parsed);
      buildGapTrend(parsed);
      buildHistoryTable(parsed);
    }
  }).catch(function() {
    var updEl = document.querySelector('[data-mkts-updated]');
    if (updEl) updEl.textContent = '—';
    // Show error card in the rate strip area
    var rateStrip = document.querySelector('.fx-strip');
    if (rateStrip) rateStrip.innerHTML = MktStates.buildErrorCard({ message: i18nError, hint: i18nCheckConn, retryLabel: i18nRetry });
  });

  function buildPerformance(parsed) {
    function fillPerf(key, points) {
      if (!points || points.length < 2) return;
      var vals = points.map(function(p) { return p.v; });
      var first = vals[0];
      var last = vals[vals.length - 1];
      var high = Math.max.apply(null, vals);
      var low = Math.min.apply(null, vals);
      var chg = first > 0 ? ((last - first) / first) * 100 : 0;

      var chgEl = document.querySelector('[data-perf-chg="' + key + '"]');
      if (chgEl) {
        var oldPerf = chgEl.textContent;
        var sign = chg >= 0 ? '+' : '';
        var newPerf = sign + chg.toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2}) + '%';
        chgEl.textContent = newPerf;
        chgEl.className = 'fx-perf-sv ' + (chg >= 0 ? 'rc-up' : 'rc-down');
        flashEl(chgEl, newPerf, oldPerf);
      }
      setEl('[data-perf-high="' + key + '"]', 'ARS ' + C.fmt(high));
      setEl('[data-perf-low="' + key + '"]', 'ARS ' + C.fmt(low));

      // Range bar: where current price is between low and high
      var range = high - low || 1;
      var pct = ((last - low) / range * 100).toFixed(1);
      var bar = document.querySelector('[data-perf-bar="' + key + '"]');
      if (bar) bar.style.width = pct + '%';
    }
    fillPerf('oficial', parsed.official);
    fillPerf('blue', parsed.blue);
    var section = document.querySelector('[data-fx-perf]');
    if (section) section.style.display = '';
  }

  // ─── Gap Trend ───
  function buildGapTrend(parsed) {
    if (!parsed.official || !parsed.blue || parsed.official.length < 3) return;
    // Compute daily gap percentage
    var dateMap = {};
    parsed.official.forEach(function(p) { dateMap[p.d] = dateMap[p.d] || {}; dateMap[p.d].o = p.v; });
    parsed.blue.forEach(function(p) { dateMap[p.d] = dateMap[p.d] || {}; dateMap[p.d].b = p.v; });
    var gapPoints = [];
    var dates = Object.keys(dateMap).sort();
    for (var i = 0; i < dates.length; i++) {
      var row = dateMap[dates[i]];
      if (row.o && row.b && row.o > 0) {
        var gap = ((row.b - row.o) / row.o) * 100;
        gapPoints.push({ d: dates[i], v: gap });
      }
    }
    if (gapPoints.length < 3) return;

    // Stats
    var vals = gapPoints.map(function(p) { return p.v; });
    var current = vals[vals.length - 1];
    var avg = vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
    var maxGap = Math.max.apply(null, vals);
    var minGap = Math.min.apply(null, vals);
    var trend = current > avg ? i18n('widening', 'Widening') : i18n('narrowing', 'Narrowing');
    var trendCls = current > avg ? 'rc-down' : 'rc-up';

    var statsEl = document.querySelector('[data-fx-gap-stats]');
    if (statsEl) {
      var h = '<div class="fxg-stats">';
      h += '<div class="fxg-stat"><span class="fxg-sk">' + i18n('current', 'Current') + '</span><span class="fxg-sv">' + current.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span></div>';
      h += '<div class="fxg-stat"><span class="fxg-sk">' + i18n('avg30d', '30d Avg') + '</span><span class="fxg-sv">' + avg.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span></div>';
      h += '<div class="fxg-stat"><span class="fxg-sk">' + i18n('max', 'Max') + '</span><span class="fxg-sv">' + maxGap.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span></div>';
      h += '<div class="fxg-stat"><span class="fxg-sk">' + i18n('min', 'Min') + '</span><span class="fxg-sv">' + minGap.toLocaleString(lang, {minimumFractionDigits:1,maximumFractionDigits:1}) + '%</span></div>';
      h += '<div class="fxg-stat"><span class="fxg-sk">' + i18n('trend', 'Trend') + '</span><span class="fxg-sv ' + trendCls + '">' + trend + '</span></div>';
      h += '</div>';
      statsEl.innerHTML = h;
    }

    // Show section BEFORE drawing chart so canvas gets correct width
    document.querySelector('[data-fx-gap]').style.display = '';

    // Draw gap chart
    C.drawChart(document.querySelector('[data-gap-chart]'), [
      { points: gapPoints, lineColor: '#f59e0b', fillColor: 'rgba(245,158,11,0.1)' }
    ], { height: 180, xLabelCount: 5, yFormat: function(v) { return v.toFixed(1) + '%'; } });
  }

  // ─── Volatility ───
  function buildVolatility(parsed) {
    function calcVol(points) {
      if (!points || points.length < 3) return null;
      var changes = [];
      for (var vi = 1; vi < points.length; vi++) {
        if (points[vi - 1].v > 0) changes.push((points[vi].v - points[vi - 1].v) / points[vi - 1].v * 100);
      }
      if (changes.length < 2) return null;
      var mean = changes.reduce(function(a, b) { return a + b; }, 0) / changes.length;
      var variance = changes.reduce(function(a, b) { return a + (b - mean) * (b - mean); }, 0) / changes.length;
      var stdev = Math.sqrt(variance);
      var maxChg = Math.max.apply(null, changes.map(function(c) { return Math.abs(c); }));
      return { stdev: stdev, maxDailyChg: maxChg, avgDailyChg: mean, changes: changes };
    }

    var offVol = calcVol(parsed.official);
    var blueVol = calcVol(parsed.blue);
    if (!offVol && !blueVol) return;

    var volGrid = document.querySelector('[data-fx-vol-grid]');
    var volSection = document.querySelector('[data-fx-vol]');
    if (!volGrid || !volSection) return;

    var vhtml = '';
    var items = [];
    if (offVol) items.push({ name: i18n('official', 'Official'), vol: offVol, color: '#75AADB' });
    if (blueVol) items.push({ name: i18n('blue', 'Blue'), vol: blueVol, color: '#F6B40E' });

    var maxStdev = Math.max.apply(null, items.map(function(i) { return i.vol.stdev; }));

    for (var vi = 0; vi < items.length; vi++) {
      var item = items[vi];
      var v = item.vol;
      var level = v.stdev > 2 ? i18n('vol-high', 'High') : v.stdev > 0.5 ? i18n('vol-mod', 'Moderate') : i18n('vol-low', 'Low');
      var levelCls = v.stdev > 2 ? 'fxv--high' : v.stdev > 0.5 ? 'fxv--mid' : 'fxv--low';
      var barW = maxStdev > 0 ? (v.stdev / (maxStdev * 1.3) * 100).toFixed(1) : 50;
      vhtml += '<div class="fxv-card ' + levelCls + '">';
      vhtml += '<div class="fxv-head"><span class="fxv-name">' + item.name + '</span><span class="fxv-level">' + level + '</span></div>';
      vhtml += '<div class="fxv-bar-wrap"><div class="fxv-bar" style="width:' + barW + '%;background:' + item.color + '"></div></div>';
      vhtml += '<div class="fxv-stats">';
      vhtml += '<div class="fxv-stat"><span class="fxv-sk">' + i18n('vol30d', '30d Volatility') + '</span><span class="fxv-sv">' + v.stdev.toLocaleString(lang, {minimumFractionDigits:3,maximumFractionDigits:3}) + '%</span></div>';
      vhtml += '<div class="fxv-stat"><span class="fxv-sk">' + i18n('max-daily', 'Max Daily') + '</span><span class="fxv-sv">' + v.maxDailyChg.toLocaleString(lang, {minimumFractionDigits:3,maximumFractionDigits:3}) + '%</span></div>';
      vhtml += '<div class="fxv-stat"><span class="fxv-sk">' + i18n('avg-daily', 'Avg Daily') + '</span><span class="fxv-sv">' + (v.avgDailyChg >= 0 ? '+' : '') + v.avgDailyChg.toLocaleString(lang, {minimumFractionDigits:3,maximumFractionDigits:3}) + '%</span></div>';
      vhtml += '</div></div>';
    }
    volGrid.innerHTML = vhtml;
    volSection.style.display = '';
  }

  // ─── Rate History Table ───
  function buildHistoryTable(parsed) {
    if (!parsed.official || !parsed.blue || parsed.official.length < 2) return;
    var dateMap = {};
    parsed.official.forEach(function(p) { dateMap[p.d] = dateMap[p.d] || {}; dateMap[p.d].o = p.v; });
    parsed.blue.forEach(function(p) { dateMap[p.d] = dateMap[p.d] || {}; dateMap[p.d].b = p.v; });
    var dates = Object.keys(dateMap).sort().reverse(); // newest first
    if (dates.length < 2) return;

    var tbody = document.querySelector('[data-fx-history-tbody]');
    if (!tbody) return;

    var html = '';
    for (var i = 0; i < dates.length; i++) {
      var d = dates[i];
      var row = dateMap[d];
      if (!row.o || !row.b) continue;

      var gap = row.o > 0 ? ((row.b - row.o) / row.o * 100) : 0;

      // Daily change
      var prevDate = dates[i + 1];
      var prev = prevDate ? dateMap[prevDate] : null;
      var oChg = prev && prev.o ? ((row.o - prev.o) / prev.o * 100) : null;
      var bChg = prev && prev.b ? ((row.b - prev.b) / prev.b * 100) : null;

      // Format date
      var parts = d.split('-');
      var dateStr = parseInt(parts[2]) + '/' + parseInt(parts[1]);

      var isToday = i === 0;

      html += '<tr class="fx-ht-row' + (isToday ? ' fx-ht-row--today' : '') + '">';
      html += '<td class="fx-ht-td">' + dateStr + (isToday ? ' <span class="fx-ht-today-badge">•</span>' : '') + '</td>';
      html += '<td class="fx-ht-td fx-ht-td--num">ARS ' + C.fmt(row.o) + '</td>';
      html += '<td class="fx-ht-td fx-ht-td--num">ARS ' + C.fmt(row.b) + '</td>';
      html += '<td class="fx-ht-td fx-ht-td--num"><span class="' + (gap > 3 ? 'rc-down' : gap > 1 ? '' : 'rc-up') + '">' + gap.toFixed(1) + '%</span></td>';
      html += '<td class="fx-ht-td fx-ht-td--num fx-ht-td--hide-mobile">' + (oChg != null ? '<span class="' + (oChg >= 0 ? 'rc-up' : 'rc-down') + '">' + (oChg >= 0 ? '+' : '') + oChg.toFixed(2) + '%</span>' : '—') + '</td>';
      html += '<td class="fx-ht-td fx-ht-td--num fx-ht-td--hide-mobile">' + (bChg != null ? '<span class="' + (bChg >= 0 ? 'rc-up' : 'rc-down') + '">' + (bChg >= 0 ? '+' : '') + bChg.toFixed(2) + '%</span>' : '—') + '</td>';
      html += '</tr>';
    }
    tbody.innerHTML = html;
    var section = document.querySelector('[data-fx-history]');
    if (section) section.style.display = '';
  }

  // ─── Converter ───
  var convRates = {};
  var convDirection = 'usd-ars'; // or 'ars-usd'

  function updateConverter() {
    var fromInput = document.querySelector('[data-conv-from]');
    var toInput = document.querySelector('[data-conv-to]');
    var rateSelect = document.querySelector('[data-conv-rate]');
    if (!fromInput || !toInput || !rateSelect) return;
    var val = parseFloat(fromInput.value) || 0;
    var rateKey = rateSelect.value;
    var sell = convRates[rateKey] || 0;
    if (sell <= 0) { toInput.value = '—'; return; }
    if (convDirection === 'usd-ars') {
      toInput.value = 'ARS ' + C.fmt(val * sell);
    } else {
      toInput.value = 'USD ' + (val / sell).toLocaleString(lang, {minimumFractionDigits:2,maximumFractionDigits:2});
    }
  }

  function storeConvRate(key, sell) { convRates[key] = sell; }

  // Hook converter to rate data
  var origFillRate = fillRate;
  fillRate = function(key, data) {
    origFillRate(key, data);
    if (data && data.value_sell) storeConvRate(key, data.value_sell);
    updateConverter();
  };

  var fromEl = document.querySelector('[data-conv-from]');
  var rateEl = document.querySelector('[data-conv-rate]');
  var swapEl = document.querySelector('[data-conv-swap]');
  if (fromEl) fromEl.addEventListener('input', updateConverter);
  if (fromEl) fromEl.addEventListener('focus', function() { this.select(); });
  if (rateEl) rateEl.addEventListener('change', updateConverter);
  if (swapEl) swapEl.addEventListener('click', function() {
    convDirection = convDirection === 'usd-ars' ? 'ars-usd' : 'usd-ars';
    var fromLabel = document.querySelector('[data-conv-from-label]');
    var toLabel = document.querySelector('[data-conv-to-label]');
    if (fromLabel) fromLabel.textContent = convDirection === 'usd-ars' ? 'USD' : 'ARS';
    if (toLabel) toLabel.textContent = convDirection === 'usd-ars' ? 'ARS' : 'USD';
    updateConverter();
  });

  // Preset amount buttons
  var presets = document.querySelectorAll('[data-preset]');
  presets.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var val = parseInt(btn.getAttribute('data-preset'), 10);
      if (fromEl) { fromEl.value = val; }
      presets.forEach(function(b) { b.classList.remove('fx-conv-preset--active'); });
      btn.classList.add('fx-conv-preset--active');
      updateConverter();
    });
  });
  // Highlight default preset (100)
  var def = document.querySelector('[data-preset="100"]');
  if (def) def.classList.add('fx-conv-preset--active');
  // Remove active state when user types manually
  if (fromEl) fromEl.addEventListener('input', function() {
    presets.forEach(function(b) { b.classList.remove('fx-conv-preset--active'); });
  });

  // ─── Multi-Rate Converter ───
  var mcAmountEl = document.querySelector('[data-mc-amount]');
  var mcSection = document.querySelector('[data-fx-multiconv]');
  var mcKeys = ['oficial', 'blue', 'mep', 'ccl'];

  function updateMultiConv() {
    var amount = parseFloat(mcAmountEl && mcAmountEl.value) || 0;
    var anyRate = false;
    for (var mi = 0; mi < mcKeys.length; mi++) {
      var mk = mcKeys[mi];
      var sell = convRates[mk] || 0;
      var resultEl = document.querySelector('[data-mc-result="' + mk + '"]');
      var perEl = document.querySelector('[data-mc-per="' + mk + '"]');
      var cardEl = document.querySelector('[data-mc-card="' + mk + '"]');
      if (sell > 0) {
        anyRate = true;
        if (resultEl) resultEl.textContent = 'ARS ' + C.fmt(Math.round(amount * sell));
        if (perEl) perEl.textContent = '@ ' + C.fmt(sell) + ' ' + i18n('per-usd', '/USD');
        if (cardEl) cardEl.style.display = '';
      } else {
        if (cardEl) cardEl.style.display = 'none';
      }
    }
    if (anyRate && mcSection) mcSection.style.display = '';
  }

  // Hook into existing fillRate so multi-conv updates when rates load
  var origFillRate2 = fillRate;
  fillRate = function(key, data) {
    origFillRate2(key, data);
    updateMultiConv();
  };

  if (mcAmountEl) {
    mcAmountEl.addEventListener('input', updateMultiConv);
    mcAmountEl.addEventListener('focus', function() { this.select(); });
  }

  var rTimer;
  function redrawAllCharts() {
    if (!chartData) return;
    C.drawSpark(document.querySelector('[data-spark="official"]'), chartData.official.map(function(p) { return p.v; }), '#75AADB', 'rgba(117,170,219,0.18)');
    C.drawSpark(document.querySelector('[data-spark="blue"]'), chartData.blue.map(function(p) { return p.v; }), '#F6B40E', 'rgba(246,180,14,0.18)');
    C.drawChart(document.querySelector('[data-evo-chart]'), [
      { points: chartData.official, lineColor: '#75AADB', fillColor: 'rgba(117,170,219,0.08)', label: i18n('official', 'Official') },
      { points: chartData.blue, lineColor: '#F6B40E', fillColor: 'rgba(246,180,14,0.10)', label: i18n('blue', 'Blue') }
    ], { height: 320 });
  }
  if (typeof ResizeObserver !== 'undefined') {
    var chartWrap = document.querySelector('.fx-chart-wrap');
    if (chartWrap) {
      new ResizeObserver(function() {
        clearTimeout(rTimer);
        rTimer = setTimeout(redrawAllCharts, 150);
      }).observe(chartWrap);
    }
  } else {
    window.addEventListener('resize', function() {
      clearTimeout(rTimer);
      rTimer = setTimeout(redrawAllCharts, 200);
    });
  }

  // ─── Auto-refresh every 5 minutes with countdown ───
  var REFRESH_INTERVAL = 5 * 60;
  var fxRefreshRemaining = REFRESH_INTERVAL;
  var fxCountdownEl = null;

  function initFxCountdown() {
    var updEl = document.querySelector('[data-mkts-updated]');
    if (!updEl) return;
    fxCountdownEl = document.createElement('span');
    fxCountdownEl.className = 'refresh-countdown';
    updEl.appendChild(fxCountdownEl);
  }

  function fxTickCountdown() {
    fxRefreshRemaining--;
    if (fxCountdownEl) {
      var m = Math.floor(fxRefreshRemaining / 60);
      var s = fxRefreshRemaining % 60;
      fxCountdownEl.textContent = '(' + m + ':' + (s < 10 ? '0' : '') + s + ')';
    }
    if (fxRefreshRemaining <= 0) {
      fxRefreshRemaining = REFRESH_INTERVAL;
      Promise.all([
        fetch(LATEST).then(function(r) { return r.json(); }).catch(function() { return null; }),
        fetch('/api/rates').then(function(r) { return r.json(); }).catch(function() { return null; })
      ]).then(function(res) {
        var latest = res[0];
        var apiRates = res[1];
        var fxUpdEl = document.querySelector('[data-mkts-updated]');
        if (fxUpdEl) fxUpdEl.innerHTML = '<span class="live-dot"></span>' + i18n('updated', 'Updated') + ' ' + new Date().toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
        initFxCountdown();
        if (latest && latest.oficial) {
          fillRate('official', latest.oficial);
          fillRate('blue', latest.blue);
          fillSpread('blue', latest.blue.value_sell, latest.oficial.value_sell);
          if (apiRates) {
            if (apiRates.mep) { fillRate('mep', apiRates.mep); fillSpread('mep', apiRates.mep.value_sell, latest.oficial.value_sell); }
            if (apiRates.ccl) { fillRate('ccl', apiRates.ccl); fillSpread('ccl', apiRates.ccl.value_sell, latest.oficial.value_sell); }
          }
        }
      }).catch(function() {});
    }
  }

  initFxCountdown();
  setInterval(fxTickCountdown, 1000);

  // ─── Click-to-copy on rate values ───
  document.querySelectorAll('.fx-bs-val, .fx-price').forEach(function(el) {
    el.style.cursor = 'pointer';
    el.title = el.closest('[data-currencies-page]') ? 'Click to copy' : '';
    el.addEventListener('click', function() {
      var text = el.textContent.replace(/[^0-9.,]/g, '').trim();
      if (!text || text === '—') return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
          el.classList.add('fx-copied');
          setTimeout(function() { el.classList.remove('fx-copied'); }, 600);
        });
      }
    });
  });
})();
