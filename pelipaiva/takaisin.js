/* Turnauksen tulospalvelun takaisin-nappi. Takaisin-nappi kotinäytölle lisätyssä sovelluksessa (iPhone/Android). Safarin oma takaisin-nuoli puuttuu silloin,
   joten nappi näytetään vain sovellustilassa. Selaimessa sivu näyttää samalta kuin ennenkin. */
(function () {
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  var app = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (!app) return;
  var p = location.pathname;
  var etusivu = /^\/(index\.html)?$/.test(p);
  var historia = history.length > 1 && document.referrer.indexOf(location.origin) === 0;
  var tiedosto = p.replace(/^.*\//, '');
  var varalla = tiedosto === '' || tiedosto === 'index.html'
    ? (sessionStorageGet('p15-hub') ? '/#koti' : null)   // tulospalvelu: paluu P2015-sivulle vain sieltä tulleille
    : tiedosto === 'kuva.html' ? './' : null;            // toimitsijasivuilla ei varapaluuta
  etusivu = false;
  if (etusivu || (!historia && !varalla)) return;
  var css = '.p15-back{position:fixed;z-index:30;left:calc(14px + env(safe-area-inset-left,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));' +
    'display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 16px 0 12px;border:1px solid rgba(255,255,255,.18);border-radius:999px;' +
    'background:rgba(33,30,30,.78);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);color:#fff;' +
    'font:600 15px/1 Figtree,-apple-system,system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.28);cursor:pointer;-webkit-tap-highlight-color:transparent}' +
    '.p15-back:active{transform:scale(.95)}.p15-back svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
    '.p15-back:focus-visible{outline:3px solid #bdb03a;outline-offset:2px}' +
    'body{padding-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}';
  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  var b = document.createElement('button');
  b.type = 'button'; b.className = 'p15-back'; b.setAttribute('aria-label', 'Takaisin');
  b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Takaisin';
  b.addEventListener('click', function () { if (historia) history.back(); else location.href = varalla; });
  (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); })).then(function () { document.body.appendChild(b); });
})();
