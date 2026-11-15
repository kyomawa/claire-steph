// =====================================================================
//  Sauvegarde : export / import / sauvegarde d'hier
// =====================================================================
const BACKUP_KEY = 'cheriotchi_backup';
const saveModal = $('saveModal');
const encodeSave = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
const decodeSave = (code) => JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
let persisted = false;

function requestPersist() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then((p) => p || navigator.storage.persist()).then((p) => { persisted = !!p; }).catch(() => {});
    }
  } catch (e) { /* ignoré */ }
}

function backupYesterday() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) localStorage.setItem(BACKUP_KEY, raw);
  } catch (e) { /* ignoré */ }
}

function restoreFrom(obj) {
  if (!obj || typeof obj.hunger !== 'number') throw new Error('format');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  saveRestoring = true;
  location.reload();
}

function setSaveMsg(text) { $('saveMsg').textContent = text; }

function renderSaveModal() {
  const t = state.lastSeen ? new Date(state.lastSeen) : new Date();
  $('saveWhen').textContent = t.toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  $('savePersist').textContent = persisted ? 'oui ✅' : 'pas garanti (ajoute le jeu à l’écran d’accueil)';
  let backup = null;
  try { backup = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null'); } catch (e) { backup = null; }
  $('restoreBackup').hidden = !backup;
  if (backup && backup.lastSeen) $('restoreBackup').textContent = `↩️ Revenir à la sauvegarde du ${new Date(backup.lastSeen).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
  $('saveCode').value = '';
  setSaveMsg('');
}

$('btnSettings').addEventListener('click', () => { saveState(); renderSaveModal(); renderCloudBox(); renderPushBox(); saveModal.hidden = false; });
$('saveClose').addEventListener('click', () => { saveModal.hidden = true; });
saveModal.addEventListener('click', (e) => { if (e.target === saveModal) saveModal.hidden = true; });

$('exportFile').addEventListener('click', () => {
  saveState();
  const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cheriotchi-sauvegarde-${dayKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  setSaveMsg('Fichier téléchargé ✅ Garde-le précieusement.');
});

$('exportCode').addEventListener('click', async () => {
  saveState();
  const code = encodeSave(state);
  $('saveCode').value = code;
  try { await navigator.clipboard.writeText(code); setSaveMsg('Code copié ✅ Colle-le sur l’autre téléphone.'); }
  catch (e) { $('saveCode').select(); setSaveMsg('Code affiché ci-dessous : copie-le à la main.'); }
});

$('importCode').addEventListener('click', () => {
  const code = $('saveCode').value;
  if (!code.trim()) return setSaveMsg('Colle d’abord un code de sauvegarde ci-dessous.');
  try {
    const obj = decodeSave(code);
    askConfirm('Remplacer la partie actuelle par cette sauvegarde ?', 'Remplacer').then((ok) => { if (ok) restoreFrom(obj); });
  } catch (e) { setSaveMsg('Ce code ne marche pas 😕'); }
});

$('importFile').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  f.text().then((txt) => {
    let obj;
    try { obj = JSON.parse(txt); } catch (err) { obj = null; }
    if (!obj) { try { obj = decodeSave(txt); } catch (err) { obj = null; } }
    if (!obj || typeof obj.hunger !== 'number') return setSaveMsg('Ce fichier ne ressemble pas à une sauvegarde 😕');
    askConfirm('Remplacer la partie actuelle par ce fichier ?', 'Remplacer').then((ok) => { if (ok) restoreFrom(obj); });
  });
  e.target.value = '';
});

$('restoreBackup').addEventListener('click', () => {
  try {
    const obj = JSON.parse(localStorage.getItem(BACKUP_KEY));
    if (!obj) throw new Error('vide');
    askConfirm('Revenir à la sauvegarde de la veille ? La progression d’aujourd’hui sera perdue.', 'Revenir à hier').then((ok) => { if (ok) restoreFrom(obj); });
  } catch (e) { setSaveMsg('Pas de sauvegarde de la veille.'); }
});

$('resetGame').addEventListener('click', async () => {
  if (!(await askConfirm('Tout effacer et recommencer à zéro ? Une copie reste dans « sauvegarde d’hier ».', 'Tout effacer', true))) return;
  backupYesterday();
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignoré */ }
  saveRestoring = true;
  location.reload();
});
