/**
 * PlataCharts — shared canvas chart utilities for Plata Today market pages
 *
 * Usage:
 *   <script src="/js/charts.js"></script>
 *   PlataCharts.drawSpark(canvas, values, '#75AADB', 'rgba(117,170,219,0.25)');
 *   PlataCharts.drawChart(canvas, datasets, options);
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : {};

  // ─── Helpers ───

  function getDPR() { return window.devicePixelRatio || 1; }

  function sizeCanvas(canvas, w, h) {
    var dpr = getDPR();
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  }

  function getThemeColor(prop, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  // ─── Sparkline (mini chart, 60px tall) ───

  function drawSpark(canvasEl, values, lineColor, fillColor) {
    if (!canvasEl || !values || values.length < 2) return;

    var rect = canvasEl.parentElement.getBoundingClientRect();
    var w = Math.round(rect.width) || 280;
    var h = 60;
    var ctx = sizeCanvas(canvasEl, w, h);
    var pad = 4;

    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;

    var pts = [];
    for (var i = 0; i < values.length; i++) {
      pts.push({
        x: (i / (values.length - 1)) * (w - pad * 2) + pad,
        y: h - pad - ((values[i] - min) / range) * (h - pad * 2)
      });
    }

    // Area fill (smooth)
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, fillColor);
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    smoothPath(ctx, pts);
    ctx.lineTo(pts[pts.length - 1].x, h);
    ctx.lineTo(pts[0].x, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line (smooth)
    ctx.beginPath();
    smoothPath(ctx, pts);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // End dot with glow
    ctx.beginPath();
    ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  }

  // ─── Full Chart (grid, labels, multi-line support) ───
  //
  // datasets: array of { points: [{d: 'YYYY-MM-DD', v: number}], lineColor, fillColor, label? }
  // options:  { height?, padL?, padR?, padT?, padB?, yFormat?, xLabelCount? }

  function drawChart(canvasEl, datasets, options) {
    if (!canvasEl || !datasets || datasets.length === 0) return;
    // Filter out empty datasets
    datasets = datasets.filter(function (ds) { return ds.points && ds.points.length >= 2; });
    if (datasets.length === 0) return;

    var opts = options || {};
    var wrap = canvasEl.parentElement;
    var wrapStyle = getComputedStyle(wrap);
    var wrapPadX = parseFloat(wrapStyle.paddingLeft) + parseFloat(wrapStyle.paddingRight);
    var w = Math.round(wrap.getBoundingClientRect().width - wrapPadX) || 900;
    var h = opts.height || 280;
    var ctx = sizeCanvas(canvasEl, w, h);

    var padL = opts.padL ?? 65;
    var padR = opts.padR ?? 20;
    var padT = opts.padT ?? 20;
    var padB = opts.padB ?? 40;
    var cW = w - padL - padR;
    var cH = h - padT - padB;

    // Compute global min/max across all datasets
    var allV = [];
    var maxLen = 0;
    for (var d = 0; d < datasets.length; d++) {
      var pts = datasets[d].points;
      if (pts.length > maxLen) maxLen = pts.length;
      for (var i = 0; i < pts.length; i++) {
        if (pts[i].v != null) allV.push(pts[i].v);
      }
    }
    if (allV.length === 0) return;

    var min = Math.min.apply(null, allV);
    var max = Math.max.apply(null, allV);
    var range = max - min || 1;
    min -= range * 0.05;
    max += range * 0.05;
    range = max - min;

    var textColor = getThemeColor('--color-text-meta', '#6e6e6e');
    var yFormat = opts.yFormat || function (v) { return Math.round(v).toLocaleString(document.documentElement.lang || 'es-AR'); };

    // Grid + Y-axis labels
    var steps = 5;
    ctx.strokeStyle = 'rgba(128,128,128,0.12)';
    ctx.lineWidth = 1;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'right';

    for (var s = 0; s <= steps; s++) {
      var val = min + (range * s / steps);
      var y = Math.round(padT + cH - (s / steps) * cH) + 0.5;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText(yFormat(val), padL - 10, y + 4);
    }

    // X-axis labels (use first dataset with longest points for dates)
    var longestDs = datasets[0];
    for (var ld = 1; ld < datasets.length; ld++) {
      if (datasets[ld].points.length > longestDs.points.length) longestDs = datasets[ld];
    }
    var dates = longestDs.points;
    var xLabels = opts.xLabelCount || 7;
    var labelEvery = Math.max(1, Math.floor(dates.length / xLabels));
    ctx.textAlign = 'center';
    for (var xi = 0; xi < dates.length; xi += labelEvery) {
      var xPos = padL + (xi / (maxLen - 1)) * cW;
      var label = '';
      if (dates[xi].d) {
        var parts = dates[xi].d.split('-');
        label = parseInt(parts[2]) + '/' + parseInt(parts[1]);
      } else if (dates[xi].ts) {
        var dt = new Date(dates[xi].ts * 1000);
        label = dt.getDate() + '/' + (dt.getMonth() + 1);
      }
      ctx.fillText(label, xPos, h - 12);
    }

    // Draw each dataset (area + line)
    for (var di = 0; di < datasets.length; di++) {
      var ds = datasets[di];
      var dsPts = ds.points;
      var coords = [];
      for (var pi = 0; pi < dsPts.length; pi++) {
        var v = dsPts[pi].v;
        if (v == null) continue;
        coords.push({
          x: padL + (pi / (maxLen - 1)) * cW,
          y: padT + cH - ((v - min) / range) * cH
        });
      }
      if (coords.length < 2) continue;

      // Area (smooth Bézier)
      var grad = ctx.createLinearGradient(0, padT, 0, padT + cH);
      grad.addColorStop(0, ds.fillColor || 'rgba(0,0,0,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      smoothPath(ctx, coords);
      ctx.lineTo(coords[coords.length - 1].x, padT + cH);
      ctx.lineTo(coords[0].x, padT + cH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Line (smooth Bézier)
      ctx.beginPath();
      smoothPath(ctx, coords);
      ctx.strokeStyle = ds.lineColor || '#75AADB';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // ─── Volume bars (if provided) ───
    if (opts.volumes && opts.volumes.length > 0) {
      var vols = opts.volumes;
      var closes = datasets[0] ? datasets[0].points : [];
      var maxVol = 0;
      for (var vi2 = 0; vi2 < vols.length; vi2++) {
        if (vols[vi2] > maxVol) maxVol = vols[vi2];
      }
      if (maxVol > 0) {
        var volH = cH * 0.18; // volume area is 18% of chart height
        var volBaseY = padT + cH;
        for (var vj = 0; vj < vols.length; vj++) {
          if (!vols[vj]) continue;
          var vx = padL + (vj / (maxLen - 1)) * cW;
          var vBarH = (vols[vj] / maxVol) * volH;
          var vBarW = Math.max(1, (cW / maxLen) * 0.6);
          var isUp = true;
          if (closes[vj] && closes[vj].v != null && vj > 0 && closes[vj - 1] && closes[vj - 1].v != null) {
            isUp = closes[vj].v >= closes[vj - 1].v;
          }
          ctx.fillStyle = isUp ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)';
          ctx.fillRect(vx - vBarW / 2, volBaseY - vBarH, vBarW, vBarH);
        }
      }
    }

    // Current price line — dashed horizontal at last close
    if (datasets.length === 1) {
      var lastDs = datasets[0];
      var lastPt = null;
      for (var lpi = lastDs.points.length - 1; lpi >= 0; lpi--) {
        if (lastDs.points[lpi].v != null) { lastPt = lastDs.points[lpi]; break; }
      }
      if (lastPt) {
        var lastY = padT + cH - ((lastPt.v - min) / range) * cH;
        ctx.beginPath();
        ctx.moveTo(padL, lastY);
        ctx.lineTo(w - padR, lastY);
        ctx.strokeStyle = lastDs.lineColor || '#75AADB';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.35;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;

        // Price label on right edge
        var lpStr = yFormat(lastPt.v);
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
        var lpW = ctx.measureText(lpStr).width + 10;
        ctx.fillStyle = lastDs.lineColor || '#75AADB';
        ctx.beginPath();
        roundRect(ctx, w - padR, lastY - 9, lpW, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(lpStr, w - padR + 5, lastY + 3.5);
        ctx.textAlign = 'left';
      }
    }

    // Legend (if multiple datasets with labels)
    var labeled = datasets.filter(function (ds) { return ds.label; });
    if (labeled.length > 1) {
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      var lx = padL + 8;
      var ly = padT + 16;
      for (var ll = 0; ll < labeled.length; ll++) {
        ctx.fillStyle = labeled[ll].lineColor || '#75AADB';
        ctx.fillRect(lx, ly - 8, 16, 3);
        ctx.fillStyle = textColor;
        ctx.fillText(labeled[ll].label, lx + 22, ly - 3);
        lx += ctx.measureText(labeled[ll].label).width + 50;
      }
    }

    // ─── Interactive hover tooltip ───

    var dpr = getDPR();
    var baseImage = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);

    // Build a flat lookup: index → { x, y, value, dateLabel, lineColor } per dataset
    var hoverData = [];
    for (var hd = 0; hd < datasets.length; hd++) {
      var hdPts = datasets[hd].points;
      var hdCoords = [];
      for (var hp = 0; hp < hdPts.length; hp++) {
        if (hdPts[hp].v == null) continue;
        var hx = padL + (hp / (maxLen - 1)) * cW;
        var hy = padT + cH - ((hdPts[hp].v - min) / range) * cH;
        var dl = '';
        if (hdPts[hp].d) {
          var dp = hdPts[hp].d.split('-');
          dl = parseInt(dp[2]) + '/' + parseInt(dp[1]) + '/' + dp[0];
        } else if (hdPts[hp].ts) {
          var hdt = new Date(hdPts[hp].ts * 1000);
          dl = hdt.getDate() + '/' + (hdt.getMonth() + 1) + '/' + hdt.getFullYear();
        }
        hdCoords.push({ x: hx, y: hy, v: hdPts[hp].v, date: dl, color: datasets[hd].lineColor || '#75AADB' });
      }
      hoverData.push(hdCoords);
    }

    canvasEl.style.cursor = 'crosshair';

    // Remove old listeners if re-drawing
    if (canvasEl._plataHoverOff) canvasEl._plataHoverOff();

    function onHover(e) {
      var rect = canvasEl.getBoundingClientRect();
      var mx;
      if (e.touches && e.touches.length) {
        mx = e.touches[0].clientX - rect.left;
      } else {
        mx = e.clientX - rect.left;
      }

      // Restore base image
      ctx.putImageData(baseImage, 0, 0);
      // Reset scale after putImageData (it resets transform)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (mx < padL || mx > w - padR) return;

      // Find nearest point index by x for first dataset
      var nearest = null;
      var nearDist = Infinity;
      var allNearest = [];
      for (var si = 0; si < hoverData.length; si++) {
        var best = null;
        var bestDist = Infinity;
        for (var sj = 0; sj < hoverData[si].length; sj++) {
          var dist = Math.abs(hoverData[si][sj].x - mx);
          if (dist < bestDist) { bestDist = dist; best = hoverData[si][sj]; }
        }
        if (best) {
          allNearest.push(best);
          if (bestDist < nearDist) { nearDist = bestDist; nearest = best; }
        }
      }
      if (!nearest) return;

      var snapX = nearest.x;

      // Vertical crosshair line
      ctx.beginPath();
      ctx.moveTo(snapX, padT);
      ctx.lineTo(snapX, padT + cH);
      ctx.strokeStyle = 'rgba(128,128,128,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dots on each dataset line
      for (var di2 = 0; di2 < allNearest.length; di2++) {
        var pt = allNearest[di2];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
      }

      // Compute change from first point
      var firstV = hoverData[0] && hoverData[0].length > 0 ? hoverData[0][0].v : null;
      var changeStr = '';
      var changeColor = '';
      if (firstV != null && firstV !== 0 && nearest.v != null) {
        var changePct = ((nearest.v - firstV) / firstV) * 100;
        changeStr = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%';
        changeColor = changePct >= 0 ? '#16a34a' : '#dc2626';
      }

      // Theme-aware tooltip colors
      var isDark = false;
      try {
        var bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
        isDark = bg && (bg === '#1a1a1a' || bg.indexOf('26,26,26') !== -1);
      } catch(e) {}
      var tooltipBg = isDark ? '#2a2a2a' : '#fff';
      var tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
      var tooltipText = isDark ? '#e8e6e3' : '#1a1a1a';
      var tooltipMeta = isDark ? '#8a8680' : '#888';
      var tooltipShadow = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)';

      // Tooltip box
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
      var valStr = yFormat(nearest.v);
      var dateStr = nearest.date;
      var valW = ctx.measureText(valStr).width;
      var dateW = ctx.measureText(dateStr).width;
      var changeW = changeStr ? ctx.measureText(changeStr).width + 8 : 0;
      var tw = Math.max(valW + changeW, dateW) + 24;
      var th = changeStr ? 48 : 44;
      var tx = snapX + 12;
      var ty = Math.max(padT, nearest.y - th / 2);
      // Keep tooltip inside canvas
      if (tx + tw > w - 4) tx = snapX - tw - 12;
      if (ty + th > padT + cH) ty = padT + cH - th;

      // Shadow
      ctx.shadowColor = tooltipShadow;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3;

      // Background
      ctx.beginPath();
      roundRect(ctx, tx, ty, tw, th, 8);
      ctx.fillStyle = tooltipBg;
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Border
      ctx.beginPath();
      roundRect(ctx, tx, ty, tw, th, 8);
      ctx.strokeStyle = tooltipBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Value text
      ctx.fillStyle = tooltipText;
      ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(valStr, tx + 10, ty + 18);

      // Change % inline
      if (changeStr) {
        ctx.fillStyle = changeColor;
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(changeStr, tx + 10 + valW + 6, ty + 18);
      }

      // Date text
      ctx.fillStyle = tooltipMeta;
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(dateStr, tx + 10, ty + 36);

      // Horizontal price line at current hover point
      ctx.beginPath();
      ctx.moveTo(padL, nearest.y);
      ctx.lineTo(snapX - 6, nearest.y);
      ctx.strokeStyle = nearest.color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1.0;

      // Y-axis price label
      var yLabelStr = yFormat(nearest.v);
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      var ylw = ctx.measureText(yLabelStr).width + 8;
      ctx.fillStyle = nearest.color;
      ctx.beginPath();
      roundRect(ctx, padL - ylw - 4, nearest.y - 8, ylw + 4, 16, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(yLabelStr, padL - ylw / 2 - 2, nearest.y + 3.5);
      ctx.textAlign = 'left';

      // X-axis date label (like TradingView)
      if (dateStr) {
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
        var xdw = ctx.measureText(dateStr).width + 10;
        var xdx = snapX - xdw / 2;
        if (xdx < padL) xdx = padL;
        if (xdx + xdw > w - padR) xdx = w - padR - xdw;
        ctx.fillStyle = isDark ? '#333' : '#e8e6e3';
        ctx.beginPath();
        roundRect(ctx, xdx, padT + cH + 2, xdw, 16, 3);
        ctx.fill();
        ctx.fillStyle = isDark ? '#e8e6e3' : '#1a1a1a';
        ctx.textAlign = 'center';
        ctx.fillText(dateStr, xdx + xdw / 2, padT + cH + 13);
        ctx.textAlign = 'left';
      }
    }

    function onLeave() {
      ctx.putImageData(baseImage, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    canvasEl.addEventListener('mousemove', onHover);
    canvasEl.addEventListener('touchmove', onHover, { passive: true });
    canvasEl.addEventListener('mouseleave', onLeave);
    canvasEl.addEventListener('touchend', onLeave);

    canvasEl._plataHoverOff = function () {
      canvasEl.removeEventListener('mousemove', onHover);
      canvasEl.removeEventListener('touchmove', onHover);
      canvasEl.removeEventListener('mouseleave', onLeave);
      canvasEl.removeEventListener('touchend', onLeave);
    };
  }

  // Smooth Bézier path through points (monotone cubic)
  function smoothPath(ctx, coords) {
    if (coords.length < 2) return;
    ctx.moveTo(coords[0].x, coords[0].y);
    if (coords.length === 2) {
      ctx.lineTo(coords[1].x, coords[1].y);
      return;
    }
    for (var i = 0; i < coords.length - 1; i++) {
      var p0 = coords[Math.max(0, i - 1)];
      var p1 = coords[i];
      var p2 = coords[i + 1];
      var p3 = coords[Math.min(coords.length - 1, i + 2)];
      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  // Rounded rectangle helper
  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  // ─── Parse Bluelytics Evolution Data ───

  function parseEvolution(entries) {
    var offMap = {}, bluMap = {};
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var src = e.source.toLowerCase();
      var d = e.date.substring(0, 10);
      if (src === 'oficial') offMap[d] = e.value_sell;
      else if (src === 'blue') bluMap[d] = e.value_sell;
    }
    function toArr(m) {
      var a = [];
      for (var k in m) a.push({ d: k, v: m[k] });
      a.sort(function (x, y) { return x.d < y.d ? -1 : x.d > y.d ? 1 : 0; });
      return a;
    }
    return { official: toArr(offMap), blue: toArr(bluMap) };
  }

  // ─── Convert Yahoo Finance timestamps + closes to chart points ───

  function yahooToPoints(timestamps, closes) {
    var pts = [];
    for (var i = 0; i < timestamps.length; i++) {
      if (closes[i] == null) continue;
      var dt = new Date(timestamps[i] * 1000);
      var d = dt.getFullYear() + '-' +
        String(dt.getMonth() + 1).padStart(2, '0') + '-' +
        String(dt.getDate()).padStart(2, '0');
      pts.push({ d: d, ts: timestamps[i], v: closes[i] });
    }
    return pts;
  }

  // ─── Formatting helpers ───

  function fmt(n) {
    var locale = (document.documentElement.lang || 'es-AR');
    return Math.round(n).toLocaleString(locale);
  }

  function fmtM(v) {
    var locale = (document.documentElement.lang || 'es-AR');
    if (v >= 1e6) return (v / 1e6).toLocaleString(locale, { maximumFractionDigits: 2 }) + 'M';
    if (v >= 1e3) return (v / 1e3).toLocaleString(locale, { maximumFractionDigits: 0 }) + 'K';
    return fmt(v);
  }

  function fmtVol(v) {
    var locale = (document.documentElement.lang || 'es-AR');
    if (v >= 1e9) return (v / 1e9).toLocaleString(locale, { maximumFractionDigits: 1 }) + 'B';
    if (v >= 1e6) return (v / 1e6).toLocaleString(locale, { maximumFractionDigits: 1 }) + 'M';
    if (v >= 1e3) return (v / 1e3).toLocaleString(locale, { maximumFractionDigits: 0 }) + 'K';
    return fmt(v);
  }

  function pctText(pct) {
    if (pct == null) return '';
    var sign = pct >= 0 ? '+' : '';
    return sign + pct.toFixed(2) + '%';
  }

  // ─── Export ───

  root.PlataCharts = {
    drawSpark: drawSpark,
    drawChart: drawChart,
    parseEvolution: parseEvolution,
    yahooToPoints: yahooToPoints,
    fmt: fmt,
    fmtM: fmtM,
    fmtVol: fmtVol,
    pctText: pctText,
  };
})();
