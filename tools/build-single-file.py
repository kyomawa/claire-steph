"""Construit un seul fichier HTML autonome (images intégrées) pour tester le jeu sans serveur.

    python3 tools/build-single-file.py [sortie.html]             # fichier à ouvrir directement
    python3 tools/build-single-file.py --artifact [sortie.html]  # version pour un artefact claude.ai
"""
import base64
import re
import sys
from pathlib import Path

args = [a for a in sys.argv[1:] if not a.startswith('--')]
artifact = '--artifact' in sys.argv
root = Path(__file__).resolve().parent.parent / 'html'
out = Path(args[0]) if args else root.parent / ('cheriotchi-artefact.html' if artifact else 'cheriotchi-autonome.html')


def uri(rel):
    return 'data:image/png;base64,' + base64.b64encode((root / rel).read_bytes()).decode()


html = (root / 'index.html').read_text(encoding='utf-8')
js = (root / 'assets.js').read_text(encoding='utf-8')
js = re.sub(r"'(img/[^']+\.png)'", lambda m: "'" + uri(m.group(1)) + "'", js)
html = html.replace('<script src="assets.js"></script>', '<script>\n' + js + '\n</script>')
html = re.sub(r'href="(img/[^"]+\.png)"', lambda m: 'href="' + uri(m.group(1)) + '"', html)
# le fichier autonome s'ouvre sans serveur : pas d'appli installable ni de notifications
html = html.replace('  <link rel="manifest" href="manifest.webmanifest">\n', '')

if artifact:
    # la plateforme fournit déjà doctype / head / body : on ne garde que le contenu
    head = html[html.index('<head>') + len('<head>'):html.index('</head>')]
    body = html[html.index('<body>') + len('<body>'):html.index('</body>')]
    style = head[head.index('<style>'):head.index('</style>') + len('</style>')]
    fonts = re.search(r"@import url\('([^']+)'\);", style).group(1)
    style = re.sub(r"\s*@import url\('[^']+'\);", '', style, count=1)
    extra = """
    /* ---- Réglages artefact ---- */
    :root { color-scheme: light; }
    html, body { background: #EAF4FA; }
    body {
      padding-left: max(16px, env(safe-area-inset-left, 0px));
      padding-right: max(16px, env(safe-area-inset-right, 0px));
      padding-block: 16px;
    }
    #exportFile { display: none !important; }
  </style>"""
    style = style[:-len('</style>')] + extra
    html = ('<title>Mon Chéri-o-tchi</title>\n'
            '<meta name="claude:viewport-fit-sides" content="cover">\n'
            f'<link rel="stylesheet" href="{fonts}">\n'
            + style + '\n' + body)

out.write_text(html, encoding='utf-8')
print(f'{out} ({out.stat().st_size // 1024} Ko)')
