"""Construit un seul fichier HTML autonome (images intégrées) pour tester le jeu
sans serveur : python3 tools/build-single-file.py [sortie.html]"""
import base64
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent / 'html'
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / 'cheriotchi-autonome.html'


def uri(rel):
    return 'data:image/png;base64,' + base64.b64encode((root / rel).read_bytes()).decode()


html = (root / 'index.html').read_text(encoding='utf-8')
js = (root / 'assets.js').read_text(encoding='utf-8')
js = re.sub(r"'(img/[^']+\.png)'", lambda m: "'" + uri(m.group(1)) + "'", js)
html = html.replace('<script src="assets.js"></script>', '<script>\n' + js + '\n</script>')
html = re.sub(r'href="(img/[^"]+\.png)"', lambda m: 'href="' + uri(m.group(1)) + '"', html)
out.write_text(html, encoding='utf-8')
print(f'{out} ({out.stat().st_size // 1024} Ko)')
