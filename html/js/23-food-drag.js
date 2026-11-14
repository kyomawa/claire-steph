// =====================================================================
//  Repas à glisser jusqu'à lui
// =====================================================================
let foodItem = null;
let foodHints = 0;

function removeFood(poof) {
  if (!foodItem) return;
  const it = foodItem;
  foodItem = null;
  if (poof) { it.el.classList.add('poof'); setTimeout(() => it.el.remove(), 400); } else it.el.remove();
}

function spawnFood(f) {
  removeFood();
  const box = el('div', 'drag-food');
  if (f.drag && f.drag.startsWith('ico') === false && f.drag.length <= 4) box.textContent = f.drag;
  else { const im = el('img'); im.src = A[f.drag] || f.img(); im.alt = f.n; box.appendChild(im); }
  box.setAttribute('role', 'button');
  box.setAttribute('aria-label', `${f.n} : glisse-le jusqu'à lui`);
  screenEl.appendChild(box);
  const startX = (posX > screenEl.clientWidth / 2) ? 14 : screenEl.clientWidth - 54;
  foodItem = { el: box, f, x: startX, bottom: 28, dragging: false, born: Date.now() };
  box.style.left = startX + 'px';
  box.style.bottom = '28px';
  if (foodHints < 2) { foodHints++; showBubble("Glisse-le jusqu'à moi ! 😋", 2200); }
  sfx.pop();

  let down = null;
  box.addEventListener('pointerdown', (e) => {
    if (!foodItem || foodItem.el !== box) return;
    e.stopPropagation();
    down = { x: e.clientX, y: e.clientY, moved: 0 };
    foodItem.dragging = true;
    box.classList.add('dragging');
    try { box.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
  });
  box.addEventListener('pointermove', (e) => {
    if (!down || !foodItem || foodItem.el !== box) return;
    down.moved += Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down.x = e.clientX; down.y = e.clientY;
    const r = screenEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width - box.offsetWidth, e.clientX - r.left - box.offsetWidth / 2));
    const b = Math.max(0, Math.min(r.height - box.offsetHeight, r.bottom - e.clientY - box.offsetHeight / 2));
    foodItem.x = x;
    foodItem.bottom = b;
    box.style.left = x + 'px';
    box.style.bottom = b + 'px';
  });
  const up = (e) => {
    if (!down || !foodItem || foodItem.el !== box) return;
    e.stopPropagation();
    const moved = down.moved;
    down = null;
    foodItem.dragging = false;
    box.classList.remove('dragging');
    const a = box.getBoundingClientRect(), h = spriteEl.getBoundingClientRect();
    const over = a.right > h.left + 6 && a.left < h.right - 6 && a.bottom > h.top + 6 && a.top < h.bottom - 6;
    if (over) return eatFood();
    if (moved < 8) {
      // simple tape : il va le chercher
      if (himMode() === 'normal' && canAct() && walkSpeed() > 0) {
        walkTarget = Math.max(6, Math.min(screenEl.clientWidth - spriteEl.offsetWidth - 12, foodItem.x - spriteEl.offsetWidth / 2 + 18));
        pauseUntil = 0;
        showBubble("J'arrive ! 🏃", 1000);
      }
      return;
    }
    // on le repose par terre
    foodItem.bottom = 28;
    box.style.bottom = '28px';
  };
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  box.addEventListener('click', (e) => e.stopPropagation());
}

function eatFood() {
  if (!foodItem) return;
  if (!canAct()) { foodItem.bottom = 28; foodItem.el.style.bottom = '28px'; return; }
  const f = foodItem.f;
  removeFood();
  feed(f);
}

function syncFood() {
  if (!foodItem || foodItem.dragging) return;
  if (Date.now() - foodItem.born > 60 * 1000) { removeFood(true); return; }
  if (foodItem.bottom > 40 || !canAct() || himMode() !== 'normal') return;
  const fc = foodItem.x + foodItem.el.offsetWidth / 2;
  const hc = spriteEl.offsetLeft + spriteEl.offsetWidth / 2;
  if (Math.abs(fc - hc) < 26) eatFood();
}
