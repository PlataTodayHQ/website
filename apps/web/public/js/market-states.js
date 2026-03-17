/**
 * Shared error card and empty state builders for market pages.
 * Produces HTML strings matching the .mkts-error-card / .mkts-empty-state CSS in global.css.
 */
(function() {
  'use strict';

  // SVG icons (no emojis)
  var ICON_CHART_ERROR = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 4-4"/><circle cx="19" cy="5" r="3" fill="none" stroke="currentColor"/><path d="M19 4v2"/><circle cx="19" cy="7.5" r="0.25" fill="currentColor" stroke="none"/></svg>';

  var ICON_DISCONNECTED = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/><line x1="4" y1="4" x2="20" y2="20"/></svg>';

  var ICON_SEARCH = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';

  var ICON_CHART_ERROR_SM = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 4-4"/><circle cx="19" cy="5" r="3" fill="none" stroke="currentColor"/><path d="M19 4v2"/><circle cx="19" cy="7.5" r="0.25" fill="currentColor" stroke="none"/></svg>';

  var RETRY_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';

  /**
   * Build an error card HTML string.
   * @param {object} opts
   * @param {string} opts.message - Error message text
   * @param {string} [opts.hint] - Subtle hint (e.g. "Check your connection")
   * @param {string} [opts.retryLabel] - Retry button label (default: "Retry")
   * @param {boolean} [opts.compact] - Use compact variant
   * @param {string} [opts.icon] - 'chart' (default) or 'disconnect'
   * @returns {string} HTML
   */
  function buildErrorCard(opts) {
    var msg = opts.message || 'Failed to load data';
    var hint = opts.hint || '';
    var retryLabel = opts.retryLabel || 'Retry';
    var compact = opts.compact || false;
    var iconSvg = opts.icon === 'disconnect'
      ? (compact ? ICON_DISCONNECTED.replace(/width="40"/g, 'width="28"').replace(/height="40"/g, 'height="28"') : ICON_DISCONNECTED)
      : (compact ? ICON_CHART_ERROR_SM : ICON_CHART_ERROR);

    var cls = 'mkts-error-card' + (compact ? ' mkts-error-card--compact' : '');

    var html = '<div class="' + cls + '" role="alert">';
    html += iconSvg;
    html += '<p class="mkts-error-card__msg">' + escHtml(msg) + '</p>';
    if (hint) {
      html += '<p class="mkts-error-card__hint">' + escHtml(hint) + '</p>';
    }
    html += '<button class="mkts-retry-btn" onclick="window.location.reload()">';
    html += RETRY_ICON + ' ' + escHtml(retryLabel);
    html += '</button>';
    html += '</div>';
    return html;
  }

  /**
   * Build an empty state HTML string (for search no-results).
   * @param {object} opts
   * @param {string} opts.message - Primary text (e.g. "No stocks match your search")
   * @param {string} [opts.query] - The search query to display
   * @param {string} [opts.hint] - Hint text (e.g. "Try different search terms")
   * @returns {string} HTML
   */
  function buildEmptyState(opts) {
    var msg = opts.message || 'No results found';
    var query = opts.query || '';
    var hint = opts.hint || '';

    var html = '<div class="mkts-empty-state">';
    html += ICON_SEARCH;
    if (query) {
      html += '<p class="mkts-empty-state__query">&ldquo;' + escHtml(query) + '&rdquo;</p>';
    }
    html += '<p class="mkts-empty-state__query">' + escHtml(msg) + '</p>';
    if (hint) {
      html += '<p class="mkts-empty-state__hint">' + escHtml(hint) + '</p>';
    }
    html += '</div>';
    return html;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Expose globally
  window.MktStates = {
    buildErrorCard: buildErrorCard,
    buildEmptyState: buildEmptyState
  };
})();
