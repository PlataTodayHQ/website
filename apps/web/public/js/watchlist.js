/**
 * Cross-page watchlist manager for Plata market pages.
 * Stores watchlist in localStorage and exposes window.PlataWatchlist API.
 */
(function() {
  var STORAGE_KEY = 'plata-watchlist-v1';

  // Inject CSS for star buttons
  var style = document.createElement('style');
  style.textContent =
    '.wl-star{background:none;border:none;cursor:pointer;padding:2px;color:var(--color-text-meta,#94a3b8);opacity:0.4;transition:opacity 0.15s,color 0.15s;display:inline-flex;align-items:center;vertical-align:middle;flex-shrink:0;}' +
    '.wl-star:hover{opacity:1;}' +
    '.wl-star--active{color:#eab308;opacity:1;}';
  document.head.appendChild(style);

  function getWatchlist() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch(e) { return []; }
  }

  function saveWatchlist(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch(e) {}
  }

  function isWatched(symbol) {
    return getWatchlist().some(function(item) { return item.symbol === symbol; });
  }

  function addToWatchlist(symbol, assetType, name) {
    var list = getWatchlist();
    if (list.some(function(i) { return i.symbol === symbol; })) return;
    list.push({ symbol: symbol, assetType: assetType || 'stock', name: name || symbol, addedAt: Date.now() });
    saveWatchlist(list);
    document.dispatchEvent(new CustomEvent('watchlist-changed', { detail: { symbol: symbol, action: 'add' } }));
  }

  function removeFromWatchlist(symbol) {
    var list = getWatchlist().filter(function(i) { return i.symbol !== symbol; });
    saveWatchlist(list);
    document.dispatchEvent(new CustomEvent('watchlist-changed', { detail: { symbol: symbol, action: 'remove' } }));
  }

  function toggleWatchlist(symbol, assetType, name) {
    if (isWatched(symbol)) {
      removeFromWatchlist(symbol);
      return false;
    } else {
      addToWatchlist(symbol, assetType, name);
      return true;
    }
  }

  // Create star button element
  function createStarButton(symbol, assetType, name) {
    var btn = document.createElement('button');
    var watched = isWatched(symbol);
    btn.className = 'wl-star' + (watched ? ' wl-star--active' : '');
    btn.setAttribute('aria-label', watched ? 'Remove from watchlist' : 'Add to watchlist');
    btn.setAttribute('data-wl-symbol', symbol);
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (watched ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var added = toggleWatchlist(symbol, assetType, name);
      btn.className = 'wl-star' + (added ? ' wl-star--active' : '');
      btn.querySelector('svg').setAttribute('fill', added ? 'currentColor' : 'none');
      btn.setAttribute('aria-label', added ? 'Remove from watchlist' : 'Add to watchlist');
    });
    return btn;
  }

  window.PlataWatchlist = {
    get: getWatchlist,
    isWatched: isWatched,
    add: addToWatchlist,
    remove: removeFromWatchlist,
    toggle: toggleWatchlist,
    createStar: createStarButton
  };
})();
