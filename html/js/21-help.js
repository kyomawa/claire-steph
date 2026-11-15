// =====================================================================
//  Aide « comment jouer »
// =====================================================================
const helpModal = $('help');
function closeHelp() {
  helpModal.hidden = true;
  if (!state.seenHelp) { state.seenHelp = true; saveState(); setTimeout(() => checkChapters(), 700); }
}
$('btnHelp').addEventListener('click', () => { helpModal.hidden = false; });
$('helpClose').addEventListener('click', closeHelp);
$('helpOk').addEventListener('click', closeHelp);
helpModal.addEventListener('click', (e) => { if (e.target === helpModal) closeHelp(); });
