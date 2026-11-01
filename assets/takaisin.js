/* Sovellustilan napit kotinäytölle lisätyssä sivussa (iPhone/Android): Safarin omat takaisin- ja päivitä-painikkeet puuttuvat silloin.
   Takaisin vasemmalla (ei etusivulla), Päivitä oikealla kaikilla sivuilla. Selaimessa sivu näyttää samalta kuin ennenkin. */
(function () {
  var app = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if (!app) return;
  var p = location.pathname;
  var etusivu = /^\/(index\.html)?$/.test(p);
  var historia = history.length > 1 && document.referrer.indexOf(location.origin) === 0;
  var varalla = (etusivu ? null : '/#koti');
  var takaisin = !etusivu && (historia || varalla);
  var nappi = 'position:fixed;z-index:30;bottom:calc(14px + env(safe-area-inset-bottom,0px));display:inline-flex;align-items:center;gap:6px;height:44px;' +
    'border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(33,30,30,.78);-webkit-backdrop-filter:blur(12px) saturate(1.4);' +
    'backdrop-filter:blur(12px) saturate(1.4);color:#fff;font:600 15px/1 Figtree,-apple-system,system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.28);' +
    'cursor:pointer;-webkit-tap-highlight-color:transparent;';
  var css = '.p15-back{' + nappi + 'left:calc(14px + env(safe-area-inset-left,0px));padding:0 16px 0 12px}' +
    '.p15-reload{' + nappi + 'right:calc(14px + env(safe-area-inset-right,0px));padding:0 16px 0 13px}' +
    '.p15-back:active,.p15-reload:active{transform:scale(.95)}' +
    '.p15-back svg,.p15-reload svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
    '.p15-reload.pyorii svg{animation:p15spin .8s linear infinite}@keyframes p15spin{to{transform:rotate(360deg)}}' +
    '.p15-back:focus-visible,.p15-reload:focus-visible{outline:3px solid #bdb03a;outline-offset:2px}' +
    'body{padding-bottom:calc(72px + env(safe-area-inset-bottom,0px))!important}';
  var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  var napit = [];
  if (takaisin) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'p15-back'; b.setAttribute('aria-label', 'Takaisin');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Takaisin';
    b.addEventListener('click', function () { if (historia) history.back(); else location.href = varalla; });
    napit.push(b);
  }
  var r = document.createElement('button');
  r.type = 'button'; r.className = 'p15-reload'; r.setAttribute('aria-label', 'Päivitä sivu');
  r.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg>Päivitä';
  // Uusi osoite ohittaa puhelimen välimuistin, joten myös sivun uusin versio latautuu
  r.addEventListener('click', function () { r.classList.add('pyorii'); location.replace(p + '?p=' + Date.now() + location.hash); });
  napit.push(r);
  (document.body ? Promise.resolve() : new Promise(function (res) { document.addEventListener('DOMContentLoaded', res); })).then(function () { napit.forEach(function (n) { document.body.appendChild(n); }); });
})();
