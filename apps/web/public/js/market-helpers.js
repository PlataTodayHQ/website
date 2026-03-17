/**
 * PlataMarketHelpers — shared formatting and utility functions for market pages.
 *
 * Usage:
 *   <script src="/js/market-helpers.js"></script>
 *   PlataHelpers.formatCurrency(12345.67, 'de', 'ARS');
 */
(function () {
  'use strict';

  var root = (typeof window !== 'undefined') ? window : {};

  /**
   * Get the page language from <html lang="...">.
   */
  function getLang() {
    return (document.documentElement.lang || 'en').toLowerCase();
  }

  /**
   * Format a currency value with locale-aware separators.
   * @param {number} value
   * @param {string} [locale] — BCP 47 locale (defaults to page lang)
   * @param {string} [currency] — 'ARS', 'USD', etc.
   * @param {object} [opts] — Intl.NumberFormat options
   */
  function formatCurrency(value, locale, currency, opts) {
    if (value == null || isNaN(value)) return '—';
    locale = locale || getLang();
    try {
      var options = Object.assign(
        { style: currency ? 'currency' : 'decimal', currency: currency || undefined },
        opts || {}
      );
      return new Intl.NumberFormat(locale, options).format(value);
    } catch (e) {
      return String(value);
    }
  }

  /**
   * Format a percentage change with sign and arrow.
   * @param {number} value — e.g. 2.5 for +2.5%
   * @param {string} [locale]
   * @returns {{ text: string, cls: string }}
   */
  function formatChange(value, locale) {
    if (value == null || isNaN(value)) return { text: '', cls: '' };
    locale = locale || getLang();
    var sign = value > 0 ? '+' : '';
    var arrow = value > 0 ? '\u25B2' : value < 0 ? '\u25BC' : '';
    var formatted;
    try {
      formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Math.abs(value));
    } catch (e) {
      formatted = Math.abs(value).toFixed(2);
    }
    return {
      text: arrow + ' ' + sign + formatted + '%',
      cls: value >= 0 ? 'ticker-up' : 'ticker-down'
    };
  }

  /**
   * Format a large number with compact notation (1.2M, 500K, 3.4B).
   * @param {number} value
   * @param {string} [locale]
   */
  function formatVolume(value, locale) {
    if (value == null || isNaN(value)) return '—';
    locale = locale || getLang();
    try {
      return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    } catch (e) {
      if (Math.abs(value) >= 1e12) return (value / 1e12).toFixed(1) + 'T';
      if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(1) + 'B';
      if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(1) + 'M';
      if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(0) + 'K';
      return String(Math.round(value));
    }
  }

  /**
   * Format market cap (same as volume but with currency prefix).
   */
  function formatMarketCap(value, locale, currency) {
    if (value == null || isNaN(value)) return '—';
    var prefix = currency === 'USD' ? '$' : currency === 'ARS' ? 'AR$' : '';
    return prefix + formatVolume(value, locale);
  }

  /**
   * Relative time string ("5 min ago", "just now", etc.)
   * @param {Date|string|number} date
   * @param {string} [locale]
   */
  function relativeTime(date, locale) {
    locale = locale || getLang();
    var ts = date instanceof Date ? date.getTime() : new Date(date).getTime();
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    try {
      var rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute');
      if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour');
      return rtf.format(-Math.floor(diff / 86400), 'day');
    } catch (e) {
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return Math.floor(diff / 86400) + 'd ago';
    }
  }

  /**
   * Fetch JSON with timeout and error handling.
   */
  function fetchWithTimeout(url, ms) {
    ms = ms || 10000;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    return fetch(url, { signal: controller.signal })
      .then(function (r) {
        clearTimeout(timer);
        return r.ok ? r.json() : null;
      })
      .catch(function () {
        clearTimeout(timer);
        return null;
      });
  }

  /**
   * Show/hide skeleton loader on a container.
   */
  function showSkeleton(container) {
    if (!container) return;
    container.classList.add('skeleton-loading');
  }

  function hideSkeleton(container) {
    if (!container) return;
    container.classList.remove('skeleton-loading');
  }

  /**
   * Flash animation on value change.
   */
  function flashElement(el, direction) {
    if (!el) return;
    el.classList.remove('flash-up', 'flash-down');
    void el.offsetWidth; // force reflow
    el.classList.add(direction > 0 ? 'flash-up' : 'flash-down');
    setTimeout(function () {
      el.classList.remove('flash-up', 'flash-down');
    }, 400);
  }

  // Export
  root.PlataHelpers = {
    getLang: getLang,
    formatCurrency: formatCurrency,
    formatChange: formatChange,
    formatVolume: formatVolume,
    formatMarketCap: formatMarketCap,
    relativeTime: relativeTime,
    fetchWithTimeout: fetchWithTimeout,
    showSkeleton: showSkeleton,
    hideSkeleton: hideSkeleton,
    flashElement: flashElement
  };
})();
