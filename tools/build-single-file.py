"""Assemble le jeu en un seul fichier HTML autonome (styles, code et images intégrés).

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

# styles locaux → <style>
html = re.sub(r'  <link rel="stylesheet" href="(css/[^"]+)">\n',
              lambda m: '  <style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '  </style>\n', html)


# scripts locaux → <script> (les images de assets.js deviennent des data: URI)
def inline_script(m):
    code = (root / m.group(1)).read_text(encoding='utf-8')
    if m.group(1) == 'assets.js':
        code = re.sub(r"'(img/[^']+\.png)'", lambda x: "'" + uri(x.group(1)) + "'", code)
    return '  <script>\n' + code.replace('</script', '<\\/script') + '\n  </script>\n'


html = re.sub(r'  <script src="([^"]+\.js)"></script>\n', inline_script, html)
html = re.sub(r'href="(img/[^"]+\.png)"', lambda m: 'href="' + uri(m.group(1)) + '"', html)
# sans serveur : pas d'appli installable ni de notifications
html = html.replace('  <link rel="manifest" href="manifest.webmanifest">\n', '')

if artifact:
    # pas de téléchargement de fichier dans un artefact : on retire le bouton et son code
    start = html.index("$('exportFile').addEventListener('click'")
    end = html.index("$('exportCode').addEventListener('click'")
    html = html[:start] + html[end:]
    html = re.sub(r'\s*<button class="btn" id="exportFile">.*?</button>', '', html, count=1)
    # la plateforme fournit doctype / head / body : on ne garde que le contenu
    head = html[html.index('<head>') + len('<head>'):html.index('</head>')]
    body = html[html.index('<body>') + len('<body>'):html.index('</body>')]
    styles = ''.join(re.findall(r'  <style>\n.*?  </style>\n', head, flags=re.S))
    fonts = re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)">', head).group(1)
    extra = """  <style>
    /* ---- Réglages artefact ---- */
    :root { color-scheme: light; }
    html, body { background: #EAF4FA; }
    body {
      padding-left: max(16px, env(safe-area-inset-left, 0px));
      padding-right: max(16px, env(safe-area-inset-right, 0px));
      padding-block: 16px;
    }
  </style>
"""
    html = ('<title>Mon Chéri-o-tchi</title>\n'
            '<meta name="claude:viewport-fit-sides" content="cover">\n'
            f'<link rel="stylesheet" href="{fonts}">\n'
            + styles + extra + body)

out.write_text(html, encoding='utf-8')
print(f'{out} ({out.stat().st_size // 1024} Ko)')
