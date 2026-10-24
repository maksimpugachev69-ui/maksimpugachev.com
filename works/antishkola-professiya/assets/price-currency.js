/* price-currency.js — конвертер валют «по типу /price/»: USD-цены (.p-usd внутри #asp-root)
   пересчитываются в EUR/ILS/RUB по гео (ipwho.is) или выбору пользователя; курсы CoinGecko
   (tether) с fallback; выбор хранится в cookie pricing_currency (общий с /price/).
   Переиспользуемый: страница должна иметь #asp-root, цены в <span class="p-usd">$NNN</span>,
   кнопки [data-cur-btn=usd|eur|ils|rub]. Извлечён из output/site/price/index.html (2026-06-30). */

(function(){
  var root = document.getElementById('asp-root');
  if (!root) return;
  var FALLBACK_RATES = { usd: 1, eur: 0.97, ils: 3.7, rub: 100 };
  var exchangeRates = Object.assign({}, FALLBACK_RATES);

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + (days || 180) * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + value + '; expires=' + d.toUTCString() + '; path=/; SameSite=Lax';
  }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? m[2] : null;
  }

  function getParam(name) {
    try {
      return new URL(window.location.href).searchParams.get(name);
    } catch (_) {
      return null;
    }
  }

  function clampCurrency(v) {
    return ['usd', 'eur', 'ils', 'rub'].indexOf(v) >= 0 ? v : null;
  }

  function fetchWithTimeout(url, opts, ms) {
    var ctl = new AbortController();
    var timer = setTimeout(function() { ctl.abort(); }, ms || 2500);
    return fetch(url, Object.assign({}, opts || {}, { signal: ctl.signal })).finally(function() {
      clearTimeout(timer);
    });
  }

  async function detectCountryCodeMulti() {
    return null; // portfolio copy: no geo-IP lookup
  }

  function resolveDefaultCurrencyByCC(cc) {
    if (cc === 'RU') return 'rub';
    if (cc === 'IL') return 'ils';
    var european = ['AL','AD','AT','BY','BE','BA','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IS','IE','IT','LV','LT','LU','MT','MD','MC','ME','NL','MK','NO','PL','PT','RO','RS','SK','SI','ES','SE','CH','UA','GB','SM','VA'];
    if (cc && european.indexOf(cc) >= 0) return 'eur';
    return 'usd';
  }

  function formatCurrency(value, currency, noDecimals) {
    var locale = 'en-US';
    var code = 'USD';
    var digits = noDecimals ? 0 : 2;

    if (currency === 'eur') {
      locale = 'de-DE';
      code = 'EUR';
    } else if (currency === 'ils') {
      locale = 'he-IL';
      code = 'ILS';
    } else if (currency === 'rub') {
      locale = 'ru-RU';
      code = 'RUB';
      digits = 0;
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  function convertUsdText(text, currency) {
    if (currency === 'usd') return text;
    return text.replace(/\$[\d,]+(?:\.\d+)?/g, function(match) {
      var usdValue = parseFloat(match.replace(/\$/g, '').replace(/,/g, ''));
      var converted = usdValue * exchangeRates[currency];
      var noDecimals = currency === 'rub' || usdValue >= 90;
      return '≈ ' + formatCurrency(converted, currency, noDecimals);
    });
  }

  function ensureCurrencySpan(usdNode, cls) {
    var sibling = null;
    Array.prototype.forEach.call(usdNode.parentNode.children, function(child) {
      if (!sibling && child.classList && child.classList.contains(cls)) sibling = child;
    });
    if (sibling) return sibling;
    sibling = document.createElement('span');
    sibling.className = cls;
    usdNode.parentNode.insertBefore(sibling, usdNode.nextSibling);
    return sibling;
  }

  function hydrateMoneyNodes() {
    root.querySelectorAll('.p-usd').forEach(function(usdNode) {
      if (!usdNode.dataset.usdText) usdNode.dataset.usdText = usdNode.textContent.trim();
      ensureCurrencySpan(usdNode, 'p-eur').textContent = convertUsdText(usdNode.dataset.usdText, 'eur');
      ensureCurrencySpan(usdNode, 'p-ils').textContent = convertUsdText(usdNode.dataset.usdText, 'ils');
      ensureCurrencySpan(usdNode, 'p-rub').textContent = convertUsdText(usdNode.dataset.usdText, 'rub');
    });
  }

  function setCur(cur) {
    root.dataset.cur = cur;
    root.querySelectorAll('[data-cur-btn]').forEach(function(btn) {
      btn.classList.toggle('is-active', btn.dataset.curBtn === cur);
    });
    setCookie('pricing_currency', cur);
  }

  async function loadExchangeRates() {
    try {
      throw new Error('rates'); // portfolio copy: no external API, fixed fallback rates
    } catch (_) {
      exchangeRates = Object.assign({}, FALLBACK_RATES);
    }
    hydrateMoneyNodes();
  }

  root.querySelectorAll('[data-cur-btn]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      setCur(btn.dataset.curBtn);
    });
  });

  (async function init() {
    await loadExchangeRates();
    setInterval(loadExchangeRates, 60 * 60 * 1000);

    // Default to USD (show dollars, not rubles). Only an explicit ?currency= override wins;
    // no geo auto-detect / no cookie-carry so the page always opens in dollars.
    var initialCurrency = clampCurrency(String(getParam('currency') || '').toLowerCase()) || 'usd';
    setCur(initialCurrency);
  })();
})();
