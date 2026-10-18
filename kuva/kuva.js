/* SJK P2015 -joukkuekuva: oma kuva + joukkueen kehys. Kaikki tapahtuu selaimessa, kuvaa ei lähetetä minnekään. */
const K = { img: null, logo: null, fmt: 'post', team: '', text: '', place: '', zoom: 1, ox: 0, oy: 0 };
const $ = id => document.getElementById(id);
const cv = $('cv'), ctx = cv.getContext('2d');
const FMT = { post: [1080, 1350], story: [1080, 1920] };
const SAIRA = '"Saira Condensed", "Arial Narrow", sans-serif', FIG = '"Figtree", system-ui, sans-serif';
const GOLD = '#bdb03a', DARK = '#211e1e';
const TEAM = { Kulta: { bg: '#bdb03a', ink: '#161414' }, Valkoinen: { bg: '#ffffff', ink: '#161414' }, Oranssi: { bg: '#e8742a', ink: '#161414' }, Musta: { bg: '#161414', ink: '#ffffff', edge: '#ffffff' } };

const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
function fitFont(txt, max, size, weight, fam, min = 24) { let s = size; ctx.font = `${weight} ${s}px ${fam}`; while (ctx.measureText(txt).width > max && s > min) { s -= 2; ctx.font = `${weight} ${s}px ${fam}`; } return s; }
function spacing(px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function placement(W, H) {
  const i = K.img, s = Math.max(W / i.width, H / i.height) * K.zoom, w = i.width * s, h = i.height * s;
  const mx = (w - W) / 2, my = (h - H) / 2;
  K.ox = Math.max(-mx, Math.min(mx, K.ox)); K.oy = Math.max(-my, Math.min(my, K.oy));
  return { x: (W - w) / 2 + K.ox, y: (H - h) / 2 + K.oy, w, h };
}

function draw() {
  const [W, H] = FMT[K.fmt]; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const P = 72;
  ctx.save(); ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = DARK; ctx.fillRect(0, 0, W, H);
  if (K.img) { const p = placement(W, H); ctx.drawImage(K.img, p.x, p.y, p.w, p.h); }
  const band = K.fmt === 'story' ? 0.46 : 0.52;
  let g = ctx.createLinearGradient(0, H * (1 - band), 0, H);
  g.addColorStop(0, rgba(DARK, 0)); g.addColorStop(0.45, rgba(DARK, 0.72)); g.addColorStop(1, rgba(DARK, 0.96));
  ctx.fillStyle = g; ctx.fillRect(0, H * (1 - band), W, H * band);
  g = ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, rgba(DARK, 0.45)); g.addColorStop(1, rgba(DARK, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 200);
  ctx.fillStyle = GOLD; ctx.fillRect(0, 0, W, 14);
  if (K.logo) ctx.drawImage(K.logo, W - P - 160, 56, 160, 160);

  ctx.textBaseline = 'alphabetic';
  let y = H - (K.fmt === 'story' ? 150 : P);
  const place = K.place.trim();
  if (place) { spacing(0); ctx.fillStyle = 'rgba(255,255,255,.88)'; fitFont(place, W - 2 * P, 38, 600, FIG); ctx.fillText(place, P, y); y -= 70; }

  // Joukkue värisirussa tai koko ikäluokan nimi isolla
  const t = TEAM[K.team];
  const big = 'SJK P2015';
  if (t) {
    const label = K.team.toUpperCase(), hgt = 120;
    const fs = fitFont(label, W - 2 * P - 80, 100, 800, SAIRA, 48), tw = Math.min(W - 2 * P, ctx.measureText(label).width + 84), top = y - hgt;
    ctx.fillStyle = t.bg; roundRect(P, top, tw, hgt, 20); ctx.fill();
    if (t.edge) { ctx.strokeStyle = t.edge; ctx.lineWidth = 5; roundRect(P + 9, top + 9, tw - 18, hgt - 18, 13); ctx.stroke(); }
    ctx.fillStyle = t.ink; ctx.textAlign = 'center'; ctx.font = `800 ${fs}px ${SAIRA}`; ctx.fillText(label, P + tw / 2, top + hgt / 2 + fs * 0.36); ctx.textAlign = 'left';
    y = top - 30;
    ctx.fillStyle = '#fff'; const bs = fitFont(big, W - 2 * P, 130, 800, SAIRA, 60); ctx.fillText(big, P, y); y -= bs * 0.95;
  } else {
    ctx.fillStyle = '#fff'; const bs = fitFont(big, W - 2 * P, 170, 800, SAIRA, 60); ctx.fillText(big, P, y); y -= bs * 0.95;
  }
  const txt = K.text.trim();
  if (txt) { ctx.fillStyle = GOLD; const fs = fitFont(txt.toUpperCase(), W - 2 * P, 80, 800, SAIRA, 40); ctx.fillText(txt.toUpperCase(), P, y); y -= fs * 0.95; }
  spacing(6); ctx.fillStyle = GOLD; fitFont('SJK-JUNIORIT · POJAT 2015', W - 2 * P, 40, 600, SAIRA); ctx.fillText('SJK-JUNIORIT · POJAT 2015', P, y); spacing(0); y -= 64;
  ctx.fillStyle = GOLD; ctx.fillRect(P, y + 18, 110, 7);
  ctx.restore();
}

function setFmt(f) { K.fmt = f; document.querySelectorAll('#fmt [data-fmt]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fmt === f))); draw(); }
async function loadPhoto(file) {
  if (!file) return;
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const max = 2600, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (s < 1) { const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp = c; }
  K.img = bmp; K.zoom = 1; K.ox = 0; K.oy = 0; $('zoom').value = 1;
  $('empty').hidden = true; $('adjust').hidden = false; draw();
}
const exportBlob = () => new Promise(res => cv.toBlob(res, 'image/jpeg', 0.92));
const fileName = () => `sjk-p2015${K.team ? '-' + K.team.toLowerCase() : ''}.jpg`;
async function doShare() {
  const blob = await exportBlob(); if (!blob) return;
  const file = new File([blob], fileName(), { type: 'image/jpeg' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  doSave(blob);
}
async function doSave(blob) {
  blob = blob || await exportBlob(); if (!blob) return;
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = fileName(); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const ptr = new Map(); let pinch = null;
const scale = () => cv.width / cv.getBoundingClientRect().width;
cv.addEventListener('pointerdown', e => { if (!K.img) return; cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: K.zoom }; } });
cv.addEventListener('pointermove', e => {
  if (!ptr.has(e.pointerId)) return;
  const prev = ptr.get(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size === 2 && pinch) { const [a, b] = [...ptr.values()]; K.zoom = Math.max(1, Math.min(3, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)); $('zoom').value = K.zoom; }
  else if (ptr.size === 1) { const s = scale(); K.ox += (e.clientX - prev.x) * s; K.oy += (e.clientY - prev.y) * s; }
  draw();
});
['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; }));
$('photo').addEventListener('change', e => loadPhoto(e.target.files[0]).catch(() => { $('empty').hidden = false; $('empty').textContent = 'Kuvaa ei voitu avata. Kokeile toista kuvaa.'; }));
$('team').addEventListener('change', e => { K.team = e.target.value; draw(); });
$('txt').addEventListener('input', e => { K.text = e.target.value; draw(); });
$('place').addEventListener('input', e => { K.place = e.target.value; draw(); });
$('zoom').addEventListener('input', e => { K.zoom = Number(e.target.value); draw(); });
$('fmt').addEventListener('click', e => { const b = e.target.closest('[data-fmt]'); if (b) setFmt(b.dataset.fmt); });
$('share').addEventListener('click', doShare);
$('save').addEventListener('click', () => doSave());
(async () => {
  try { await Promise.all([document.fonts.load(`800 100px ${SAIRA}`), document.fonts.load(`600 40px ${SAIRA}`), document.fonts.load(`600 36px ${FIG}`)]); } catch (e) { }
  K.logo = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = '../assets/logo-512.png'; });
  draw();
})();
