// Contrôles statiques du jeu : node tools/check.js
// - syntaxe de chaque fichier JS
// - noms globaux déclarés deux fois (les scripts partagent la même portée : ça planterait au chargement)
// - $('id') / getElementById('id') qui visent un élément absent de la page
// - scripts et feuilles de style référencés par index.html qui n'existent pas
// - images référencées par assets.js qui n'existent pas
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'html');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const problems = [];

const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const styles = [...html.matchAll(/<link rel="stylesheet" href="((?!https?:)[^"]+)">/g)].map((m) => m[1]);
for (const f of [...scripts, ...styles]) if (!fs.existsSync(path.join(root, f))) problems.push(`fichier manquant : ${f}`);

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const seen = new Map();
const dynamicIds = new Set();

for (const f of scripts) {
  const file = path.join(root, f);
  if (!fs.existsSync(file)) continue;
  const code = fs.readFileSync(file, 'utf8');
  try { new Function(code); } catch (e) { problems.push(`syntaxe ${f} : ${e.message}`); continue; }
  if (f.startsWith('js/engine/') || f === 'assets.js') continue;
  // éléments créés par le code (el.id = …) : pas besoin qu'ils soient dans la page
  for (const m of code.matchAll(/\.id\s*=\s*'([^']+)'/g)) dynamicIds.add(m[1]);
  // déclarations globales (colonne 0)
  for (const m of code.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = m[1];
    if (seen.has(name)) problems.push(`nom global en double « ${name} » : ${seen.get(name)} et ${f}`);
    else seen.set(name, f);
  }
  for (const m of code.matchAll(/(?:\$|getElementById)\('([^']+)'\)/g)) {
    if (!ids.has(m[1])) problems.push(`élément introuvable #${m[1]} (${f})`);
  }
}
for (const p of [...problems]) {
  const m = p.match(/^élément introuvable #(\S+)/);
  if (m && dynamicIds.has(m[1])) problems.splice(problems.indexOf(p), 1);
}

// images
const assets = fs.readFileSync(path.join(root, 'assets.js'), 'utf8');
for (const m of assets.matchAll(/'(img\/[^']+)'/g)) if (!fs.existsSync(path.join(root, m[1]))) problems.push(`image manquante : ${m[1]}`);

// identifiants en double dans la page
const allIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dupIds = allIds.filter((x, i) => allIds.indexOf(x) !== i);
for (const d of new Set(dupIds)) problems.push(`id en double dans la page : #${d}`);

if (problems.length) {
  console.error(`✗ ${problems.length} problème(s) :\n  - ` + problems.join('\n  - '));
  process.exit(1);
}
console.log(`✓ contrôles statiques OK (${scripts.length} scripts, ${ids.size} éléments, ${seen.size} noms globaux)`);
