// =====================================================================
//  Mots doux (envoyés d'un téléphone à l'autre avec le même code)
// =====================================================================
const DEVICE_KEY = 'cheriotchi_device';
const NOTES_SEEN_KEY = 'cheriotchi_notes_seen';
let deviceId = '';
try {
  deviceId = localStorage.getItem(DEVICE_KEY) || '';
  if (!deviceId) { deviceId = Math.random().toString(36).slice(2, 12); localStorage.setItem(DEVICE_KEY, deviceId); }
} catch (e) { deviceId = 'x' + Math.random().toString(36).slice(2, 8); }
const pendingNotes = [];
const noteModal = $('noteModal');

function notesSeen() { try { return Number(localStorage.getItem(NOTES_SEEN_KEY)) || 0; } catch (e) { return 0; } }

async function fetchNotes() {
  if (!cloud.available || !cloud.code) return;
  try {
    const r = await api('GET', `/api/notes/${cloud.code}?after=${notesSeen()}`);
    if (r.status !== 200) return;
    let maxId = notesSeen();
    for (const n of r.data.notes || []) {
      maxId = Math.max(maxId, n.id);
      if (n.device === deviceId) continue;
      if (!pendingNotes.some((x) => x.id === n.id)) pendingNotes.push(n);
    }
    try { localStorage.setItem(NOTES_SEEN_KEY, String(maxId)); } catch (e) { /* ignoré */ }
    if (pendingNotes.length) {
      toast('💌 Un mot doux arrive…');
      setTimeout(() => { if (canAct() && himMode() !== 'sleep') startGirlVisit(); }, 2500);
    }
  } catch (e) { /* hors ligne */ }
}

function renderNoteModal() {
  const ok = cloud.available && cloud.code;
  $('noteForm').hidden = !ok;
  $('noteOff').hidden = !!ok;
  $('noteOff').textContent = !cloud.available
    ? 'Les mots doux passent par le serveur : ouvre le jeu depuis son adresse en ligne.'
    : 'Il faut la même partie sur vos deux téléphones : sur le sien, 💾 → activer la sauvegarde en ligne, puis sur le tien, 💾 → « J’ai un code ».';
  $('noteMsg').textContent = '';
  $('noteCount').textContent = `${$('noteText').value.length} / 200`;
}

$('btnNote').addEventListener('click', () => { duo.hidden = true; renderNoteModal(); noteModal.hidden = false; setTimeout(() => $('noteText').focus(), 50); });
$('noteClose').addEventListener('click', () => { noteModal.hidden = true; });
noteModal.addEventListener('click', (e) => { if (e.target === noteModal) noteModal.hidden = true; });
$('noteText').addEventListener('input', () => { $('noteCount').textContent = `${$('noteText').value.length} / 200`; });
$('noteSend').addEventListener('click', async () => {
  const text = $('noteText').value.trim();
  if (!text) { $('noteMsg').textContent = 'Écris d’abord ton petit mot 🙂'; return; }
  let exclude = null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    exclude = sub ? sub.endpoint : null;
  } catch (e) { /* pas d'abonnement */ }
  try {
    const r = await api('POST', `/api/notes/${cloud.code}`, { text, device: deviceId, exclude });
    if (r.status !== 201) throw new Error();
    $('noteText').value = '';
    $('noteMsg').textContent = r.data.sent ? 'Envoyé 💌 Son téléphone vient de vibrer !' : 'Envoyé 💌 Il le recevra à sa prochaine visite dans le jeu.';
    $('noteCount').textContent = '0 / 200';
    state.counters.notesSent++;
    act('love', 3);
    addMemory('💌 Mot envoyé : ' + text, 'answer');
    sfx.coin();
    renderStats();
    checkTrophies();
  } catch (e) { $('noteMsg').textContent = 'Envoi impossible, réessaie dans un moment 😕'; }
});
