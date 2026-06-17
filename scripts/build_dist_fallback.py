#!/usr/bin/env python3
from __future__ import annotations
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)

style = (ROOT / 'src/style.css').read_text(encoding='utf-8')
index = (ROOT / 'index.html').read_text(encoding='utf-8')
# Remove the Vite source script; add importmap + dist main instead.
index = re.sub(r'\s*<script type="module" src="/src/main\.js"></script>', '', index)
index = index.replace('</head>', f'''  <style>\n{style}\n</style>\n<script>\nwindow.addEventListener('error', (event) => {{\n  const el = document.querySelector('#status');\n  const msg = String(event.message || '');\n  if (el && (msg.toLowerCase().includes('module') || msg.toLowerCase().includes('failed to fetch dynamically imported module'))) {{\n    el.style.display = 'block';\n    el.textContent = '前端模块加载失败：dist 预览需要加载 three.js/MMDLoader/MMDAnimationHelper。请优先使用 npm install && npm run dev；如果必须用 dist，请确认浏览器能访问 jsDelivr CDN。';\n  }}\n}});\nwindow.addEventListener('unhandledrejection', (event) => {{\n  const el = document.querySelector('#status');\n  if (el && !window.__mmdAvatarViewerModuleStarted) {{\n    el.style.display = 'block';\n    el.textContent = '前端模块加载失败：' + (event.reason?.message || event.reason || '未知 Promise 错误');\n  }}\n}});\n</script>\n<script type="importmap">\n{{\n  "imports": {{\n    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",\n    "three/examples/jsm/loaders/MMDLoader.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/MMDLoader.js",\n    "three/examples/jsm/animation/MMDAnimationHelper.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/animation/MMDAnimationHelper.js",\n    "three/examples/jsm/controls/OrbitControls.js": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js"\n  }}\n}}\n</script>\n</head>''')
index = index.replace('/models/hiying_pmx/星穹铁道—绯英2.pmx', './models/hiying_pmx/星穹铁道—绯英2.pmx')
index = index.replace('/motions/external/', './motions/external/')
index = index.replace('/motions/local/', './motions/local/')
index = index.replace('/motions/generated/', './motions/generated/')
index = index.replace('/poses/generated/', './poses/generated/')
index = index.replace('</body>', '    <script type="module" src="./main.js"></script>\n  </body>')
(DIST / 'index.html').write_text(index, encoding='utf-8')

main = (ROOT / 'src/main.js').read_text(encoding='utf-8')
main = main.replace("import './style.css';\n", '')
main = main.replace("'/models/", "'./models/")
main = main.replace("'/motions/", "'./motions/")
main = main.replace("'/poses/", "'./poses/")
main = '// DIST_GENERATED_FROM_SRC_MAIN_JS\n' + main
(DIST / 'main.js').write_text(main, encoding='utf-8')

# Keep dist static assets in sync for local `python3 -m http.server` preview.
for dirname in ['models', 'motions', 'poses']:
    src = ROOT / 'public' / dirname
    dst = DIST / dirname
    if dst.exists():
        shutil.rmtree(dst)
    if src.exists():
        shutil.copytree(src, dst)


# Rebuild static resource index for dist.
import subprocess
subprocess.run(['python3', 'scripts/scan_public_assets.py', '--target', 'dist'], cwd=ROOT, check=True)

print('dist fallback rebuilt')
