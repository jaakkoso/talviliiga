/* Joukkuekuva: oma kuva + turnauksen kehys. Kaikki tapahtuu selaimessa, kuvaa ei lähetetä minnekään. */
const K = { img: null, team: ls.get('tulospalvelu-team', ''), fmt: 'post', text: '', zoom: 1, ox: 0, oy: 0 };
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const FMT = { post: [1080, 1350], story: [1080, 1920] };
const SAIRA = '"Saira Condensed", "Arial Narrow", sans-serif', FIG = '"Figtree", system-ui, sans-serif';
const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#bdb03a';
const base = () => getComputedStyle(document.documentElement).getPropertyValue('--head').trim() || '#211e1e';

function hexA(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function fitFont(txt, max, size, weight, fam, min = 24) { let s = size; ctx.font = `${weight} ${s}px ${fam}`; while (ctx.measureText(txt).width > max && s > min) { s -= 2; ctx.font = `${weight} ${s}px ${fam}`; } return s; }
function spacing(px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px'; }

/* Kuvan sijainti: peittää koko pohjan; zoom ja siirto rajataan niin, ettei reunoille jää tyhjää */
function placement(W, H) {
  const i = K.img, s = Math.max(W / i.width, H / i.height) * K.zoom, w = i.width * s, h = i.height * s;
  const mx = (w - W) / 2, my = (h - H) / 2;
  K.ox = Math.max(-mx, Math.min(mx, K.ox)); K.oy = Math.max(-my, Math.min(my, K.oy));
  return { x: (W - w) / 2 + K.ox, y: (H - h) / 2 + K.oy, w, h };
}

function draw() {
  const [W, H] = FMT[K.fmt]; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const gold = accent(), dark = base(), P = 72;
  ctx.save(); ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H);
  if (K.img) { const p = placement(W, H); ctx.drawImage(K.img, p.x, p.y, p.w, p.h); }

  // Alareunan häivytys tekstin taakse ja kevyt varjo yläreunaan
  const band = K.fmt === 'story' ? 0.46 : 0.5;
  let g = ctx.createLinearGradient(0, H * (1 - band), 0, H);
  g.addColorStop(0, hexA(dark, 0)); g.addColorStop(0.45, hexA(dark, 0.72)); g.addColorStop(1, hexA(dark, 0.96));
  ctx.fillStyle = g; ctx.fillRect(0, H * (1 - band), W, H * band);
  g = ctx.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, hexA(dark, 0.45)); g.addColorStop(1, hexA(dark, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 180);
  ctx.fillStyle = gold; ctx.fillRect(0, 0, W, 14);

  // Logo oikeaan yläkulmaan
  if (K.logo) ctx.drawImage(K.logo, W - P - 150, 56, 150, 150);

  // Tekstit alhaalta ylöspäin
  let y = H - (K.fmt === 'story' ? 150 : P);
  const d = EVENT.date, dateTxt = d ? `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}` : '';
  const foot = [EVENT.venue, dateTxt].filter(Boolean).join(' · ');
  spacing(0); ctx.fillStyle = 'rgba(255,255,255,.88)'; fitFont(foot, W - 2 * P, 36, 600, FIG); ctx.textBaseline = 'alphabetic';
  ctx.fillText(foot, P, y); y -= 64;

  const team = K.team && EVENT.teams[K.team] ? K.team : '';
  if (team) {
    const tc = EVENT.teams[team], hgt = 132;
    const fs = fitFont(team.toUpperCase(), W - 2 * P - 80, 112, 800, SAIRA, 48);
    const tw = Math.min(W - 2 * P, ctx.measureText(team.toUpperCase()).width + 88);
    const top = y - hgt;
    ctx.fillStyle = tc.bg; roundRect(ctx, P, top, tw, hgt, 20); ctx.fill();
    if (tc.edgeType === 'raita' && tc.edge) { ctx.strokeStyle = tc.edge; ctx.lineWidth = 6; roundRect(ctx, P + 9, top + 9, tw - 18, hgt - 18, 13); ctx.stroke(); }
    if (tc.edgeType === 'ala' && tc.edge) { ctx.fillStyle = tc.edge; ctx.fillRect(P + 16, top + hgt - 14, tw - 32, 10); }
    ctx.fillStyle = tc.ink; ctx.textAlign = 'center'; ctx.font = `800 ${fs}px ${SAIRA}`;
    ctx.fillText(team.toUpperCase(), P + tw / 2, top + hgt / 2 + fs * 0.36); ctx.textAlign = 'left';
    y = top - 34;
  } else {
    ctx.fillStyle = '#fff'; const fs = fitFont(EVENT.name.toUpperCase(), W - 2 * P, 150, 800, SAIRA, 60);
    ctx.fillText(EVENT.name.toUpperCase(), P, y); y -= fs * 0.95;
  }

  const t = K.text.trim();
  if (t) { ctx.fillStyle = '#fff'; const fs = fitFont(t.toUpperCase(), W - 2 * P, 84, 800, SAIRA, 40); ctx.fillText(t.toUpperCase(), P, y); y -= fs * 0.92; }

  const eyebrow = [EVENT.name, (EVENT.sub || '').split('·')[0].trim()].filter(Boolean).join(' · ').toUpperCase();
  if (team || t) { spacing(6); ctx.fillStyle = gold; fitFont(eyebrow, W - 2 * P, 44, 600, SAIRA); ctx.fillText(eyebrow, P, y); spacing(0); y -= 70; }
  ctx.fillStyle = gold; ctx.fillRect(P, y + 18, 110, 7);
  ctx.restore();
}

function setFmt(f) { K.fmt = f; document.querySelectorAll('#fmt [data-fmt]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.fmt === f))); draw(); }

async function loadPhoto(file) {
  if (!file) return;
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch (e) { bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  // Pienennetään valtavat kuvat, jotta vanhemmatkin puhelimet jaksavat
  const max = 2600, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (s < 1) { const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp = c; }
  K.img = bmp; K.zoom = 1; K.ox = 0; K.oy = 0; $('zoom').value = 1;
  $('empty').hidden = true; $('adjust').hidden = false; draw();
}

function exportBlob() { return new Promise(res => cv.toBlob(res, 'image/jpeg', 0.92)); }
function fileName() { return `${(EVENT.name || 'turnaus')}-${K.team || 'joukkuekuva'}.jpg`.toLowerCase().replace(/[^a-z0-9.\-äöå]+/g, '-'); }
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

/* Siirto sormella tai hiirellä, kahdella sormella zoomaus */
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

$('photo').addEventListener('change', e => loadPhoto(e.target.files[0]).catch(() => alertBox('Kuvaa ei voitu avata. Kokeile toista kuvaa.')));
$('team').addEventListener('change', e => { K.team = e.target.value; draw(); });
$('txt').addEventListener('input', e => { K.text = e.target.value; draw(); });
$('zoom').addEventListener('input', e => { K.zoom = Number(e.target.value); draw(); });
$('fmt').addEventListener('click', e => { const b = e.target.closest('[data-fmt]'); if (b) setFmt(b.dataset.fmt); });
$('share').addEventListener('click', doShare);
$('save').addEventListener('click', () => doSave());
function alertBox(msg) { $('empty').hidden = false; $('empty').textContent = msg; }

(async function init() {
  try { await Store.loadMeta(true); } catch (e) { const m = ls.get('tulospalvelu-meta', null); if (m) { EVENT = buildEvent(m.settings, m.teams); applyHeader(); } }
  const sel = $('team');
  sel.innerHTML = `<option value="">Ei joukkuetta</option>` + (EVENT.teamNames || []).map(t => `<option value="${esc(t)}"${t === K.team ? ' selected' : ''}>${esc(t)}</option>`).join('');
  if (!EVENT.teams[K.team]) K.team = '';
  try { await Promise.all([document.fonts.load(`800 100px ${SAIRA}`), document.fonts.load(`600 40px ${SAIRA}`), document.fonts.load(`600 36px ${FIG}`)]); } catch (e) { }
  K.logo = await logoImg();
  draw();
})();
