// =====================================================================
//  📸 Photo souvenir
// =====================================================================
const PHOTOS_KEY = 'cheriotchi_photos';
const photoModal = $('photoModal');
let lastPhoto = null;

function loadPhotos() { try { return JSON.parse(localStorage.getItem(PHOTOS_KEY) || '[]'); } catch (e) { return []; } }
function storePhoto(dataUrl) {
  const list = loadPhotos();
  list.push({ d: dayKey(now()), src: dataUrl });
  while (list.length) {
    try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(list.slice(-12))); return; } catch (e) { list.shift(); }
  }
}

function drawImgEl(ctx, img, sx, sy) {
  if (!img || img.hidden || !img.complete || !img.naturalWidth) return;
  const cs = getComputedStyle(img);
  if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return;
  const r = img.getBoundingClientRect();
  if (!r.width) return;
  const flip = new DOMMatrixReadOnly(cs.transform === 'none' ? undefined : cs.transform).a < 0;
  ctx.save();
  ctx.globalAlpha = Number(cs.opacity) || 1;
  if (flip) { ctx.translate(r.left - sx + r.width, r.top - sy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, r.width, r.height); }
  else ctx.drawImage(img, r.left - sx, r.top - sy, r.width, r.height);
  ctx.restore();
}

async function takePhoto() {
  if (game.active) return;
  const sr = screenEl.getBoundingClientRect();
  const W = Math.round(sr.width), H = Math.round(sr.height);
  const scale = 2, pad = 14, bottom = 46;
  const cv = document.createElement('canvas');
  cv.width = (W + pad * 2) * scale;
  cv.height = (H + pad + bottom) * scale;
  const c = cv.getContext('2d');
  c.scale(scale, scale);
  // cadre polaroïd aux couleurs Gulf
  c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W + pad * 2, H + pad + bottom);
  c.fillStyle = '#F26A21'; c.fillRect(0, H + pad + bottom - 8, W + pad * 2, 8);
  c.fillStyle = '#1E3456'; c.fillRect(0, H + pad + bottom - 11, W + pad * 2, 3);
  c.save();
  c.translate(pad, pad);
  c.beginPath(); c.rect(0, 0, W, H); c.clip();
  // fond
  const ph = phase();
  c.fillStyle = ph === 'night' ? '#1B2541' : (ph === 'dusk' ? '#FFE6CC' : '#FFFFFF');
  c.fillRect(0, 0, W, H);
  const bd = $('backdrop');
  if (!bd.hidden && bd.complete && bd.naturalWidth) {
    const k = Math.max(W / bd.naturalWidth, H / bd.naturalHeight) * 1.03;
    const dw = bd.naturalWidth * k, dh = bd.naturalHeight * k;
    c.globalAlpha = 0.7;
    c.filter = 'blur(1.2px)';
    c.drawImage(bd, (W - dw) / 2, (H - dh) * 0.85, dw, dh);
    c.filter = 'none';
    c.globalAlpha = 1;
  }
  if (ph === 'night') { c.fillStyle = 'rgba(27,37,65,0.82)'; c.fillRect(0, 0, W, H); }
  if (screenEl.classList.contains('rain') && ph !== 'night') { c.fillStyle = 'rgba(70,90,115,0.28)'; c.fillRect(0, 0, W, H); }
  c.fillStyle = 'rgba(30,52,86,0.12)'; c.fillRect(0, H - 27, W, 27);
  // tout ce qui est visible : décor, lui, elle, accessoires, compagnon, ballon, cacas
  const sel = '.deco-floor, .deco-balloon, .sprite-layer img, .poop';
  const imgs = [...screenEl.querySelectorAll(sel)].filter((x) => x.tagName === 'IMG');
  imgs.sort((a, b) => (Number(getComputedStyle(a).zIndex) || 0) - (Number(getComputedStyle(b).zIndex) || 0));
  for (const im of imgs) drawImgEl(c, im, sr.left, sr.top);
  c.restore();
  // légende
  c.fillStyle = '#1E3456';
  c.font = '700 15px "Racing Sans One", "Baloo 2", sans-serif';
  c.textBaseline = 'middle';
  c.fillText(petNameEl.textContent.trim().slice(0, 28) || 'Mon Chéri-o-tchi', pad, H + pad + 17);
  c.font = '11px "Space Mono", monospace';
  c.textAlign = 'right';
  c.fillText(now().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }), W + pad, H + pad + 17);
  // flash
  const fl = el('div', 'flash');
  screenEl.appendChild(fl);
  setTimeout(() => fl.remove(), 600);
  sfx.coin();
  lastPhoto = cv;
  let small;
  try { small = cv.toDataURL('image/jpeg', 0.72); }
  catch (e) { toast('Photo impossible en ouvrant le jeu comme simple fichier 😕'); return; }
  storePhoto(small);
  state.counters.photos++;
  checkTrophies();
  $('photoImg').src = small;
  $('photoMsg').textContent = 'Rangée dans le carnet 📖';
  $('photoShare').hidden = !(navigator.canShare && navigator.share);
  photoModal.hidden = false;
}

$('btnPhoto').addEventListener('click', () => { takePhoto().catch(() => toast('Photo impossible 😕')); });
$('photoClose').addEventListener('click', () => { photoModal.hidden = true; });
photoModal.addEventListener('click', (e) => { if (e.target === photoModal) photoModal.hidden = true; });
$('photoShare').addEventListener('click', async () => {
  if (!lastPhoto) return;
  try {
    const blob = await new Promise((r) => lastPhoto.toBlob(r, 'image/jpeg', 0.9));
    const file = new File([blob], `cheriotchi-${dayKey(new Date())}.jpg`, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Chéri-o-tchi' });
    else $('photoMsg').textContent = 'Partage indisponible ici : fais un appui long sur la photo pour l’enregistrer.';
  } catch (e) { /* partage annulé */ }
});
