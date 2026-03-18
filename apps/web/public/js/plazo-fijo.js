(function() {
  var pg = document.querySelector('[data-pf-page]');
  if (!pg) return;
  var lang = pg.getAttribute('data-lang') || 'en';

  // --- i18n helper ---
  function i18n(key, fallback) { return pg.getAttribute('data-i18n-' + key) || fallback; }

  // --- Number formatting ---
  function fmtARS(n) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtPct(n) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }
  function fmtNum(n, dec) {
    return n.toLocaleString('es-AR', { minimumFractionDigits: dec || 2, maximumFractionDigits: dec || 2 });
  }

  // --- State ---
  var state = { amount: 1000000, days: 30, tna: null };

  // --- DOM refs ---
  var amountInput = pg.querySelector('[data-pf-amount]');
  var rateInput = pg.querySelector('[data-pf-rate]');
  var termBtns = pg.querySelectorAll('[data-pf-term-btn]');
  var heroTna = pg.querySelector('[data-pf-hero-tna]');
  var interestEl = pg.querySelector('[data-pf-interest]');
  var totalEl = pg.querySelector('[data-pf-total]');
  var monthlyEl = pg.querySelector('[data-pf-monthly]');
  var teaEl = pg.querySelector('[data-pf-tea]');

  // --- Calculator ---
  function calculate() {
    var amount = parseFloat(amountInput.value) || 0;
    var days = state.days;
    var tna = parseFloat(rateInput.value);
    if (isNaN(tna) || tna <= 0 || amount <= 0) {
      interestEl.textContent = '\u2014';
      totalEl.textContent = '\u2014';
      monthlyEl.textContent = '\u2014';
      teaEl.textContent = '\u2014';
      return;
    }

    // Interest = Amount * (TNA/100) * (days/365)
    var interest = amount * (tna / 100) * (days / 365);
    var total = amount + interest;

    // Monthly effective rate = (TNA/100) * (30/365) * 100
    var monthlyRate = (tna / 100) * (30 / 365) * 100;

    // TEA = ((1 + TNA/365 * days)^(365/days) - 1) * 100
    var tea = (Math.pow(1 + (tna / 100) * (days / 365), 365 / days) - 1) * 100;

    interestEl.textContent = '$ ' + fmtARS(interest);
    totalEl.textContent = '$ ' + fmtARS(total);
    monthlyEl.textContent = fmtPct(monthlyRate);
    teaEl.textContent = fmtPct(tea);
  }

  // --- Term buttons ---
  termBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      termBtns.forEach(function(b) { b.classList.remove('pf-term-btn--active'); });
      btn.classList.add('pf-term-btn--active');
      state.days = parseInt(btn.getAttribute('data-pf-term-btn'), 10);
      calculate();
    });
  });

  // --- Input listeners ---
  amountInput.addEventListener('input', calculate);
  rateInput.addEventListener('input', calculate);

  // --- Educational panel dismiss ---
  var details = pg.querySelector('[data-pf-details]');
  var DISMISS_KEY = 'plata_pf_info_seen';
  if (details) {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') {
        details.removeAttribute('open');
      }
    } catch (e) {}
    details.addEventListener('toggle', function() {
      try {
        if (!details.open) {
          localStorage.setItem(DISMISS_KEY, '1');
        } else {
          localStorage.removeItem(DISMISS_KEY);
        }
      } catch (e) {}
    });
  }

  // --- Fetch data ---
  function loadData() {
    fetch('/api/plazo-fijo')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        // Hero TNA
        if (data.tna30 != null) {
          heroTna.textContent = fmtPct(data.tna30);
          heroTna.classList.add('pf-hero-value--loaded');
          // Set rate input if user hasn't modified it
          if (!rateInput.value || rateInput.value === '') {
            rateInput.value = data.tna30;
            state.tna = data.tna30;
            calculate();
          }
        }

        // Rate cards
        var cards = { tna30: data.tna30, badlar: data.badlar, cer: data.cer, uva: data.uva };
        Object.keys(cards).forEach(function(key) {
          var el = pg.querySelector('[data-pf-val="' + key + '"]');
          if (!el) return;
          if (cards[key] != null) {
            el.textContent = (key === 'cer' || key === 'uva') ? fmtNum(cards[key], 2) : fmtPct(cards[key]);
            el.closest('[data-pf-card]').classList.add('pf-rate-card--loaded');
          }
        });
      })
      .catch(function(err) {
        console.error('Failed to load plazo fijo data:', err);
      });
  }

  loadData();
  // Refresh every 5 minutes
  setInterval(loadData, 5 * 60 * 1000);
})();
