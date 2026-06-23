#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
main = (ROOT / 'apps/web/src/main.js').read_text(encoding='utf-8')
index = (ROOT / 'apps/web/index.html').read_text(encoding='utf-8')
style = (ROOT / 'apps/web/src/styles/style.css').read_text(encoding='utf-8')
pkg = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))

fail = []

checks = {
    'apps web entry exists': (ROOT / 'apps/web/index.html').exists(),
    'root dev points to apps web': 'dev:web' in pkg.get('scripts', {}) and 'apps/web/vite.config.js' in pkg['scripts']['dev:web'],
    'assets scan script exists': pkg.get('scripts', {}).get('assets:scan') == 'python3 scripts/assets/scan_assets.py',
    'uses MMDLoader': 'MMDLoader' in main and 'three/examples/jsm/loaders/MMDLoader.js' in main,
    'uses MMDAnimationHelper': 'MMDAnimationHelper' in main and 'three/examples/jsm/animation/MMDAnimationHelper.js' in main,
    'plays VMD through helper': all(x in main for x in ['loader.loadAnimation', 'mmdHelper.add(mesh', 'mmdHelper.update(delta)']),
    'supports VPD pose': all(x in main for x in ['loader.loadVPD', 'mmdHelper.pose', 'default_stand.vpd']),
    'uses assets paths': '/assets/models/hiying_pmx/星穹铁道—绯英2.pmx' in main and '/assets/motions/generated/builtin_idle.vmd' in main,
    'uses generated registry': '/generated/assets-registry.json' in main,
    'no runtime fetch old manifest': "'/resource_manifest.json'" not in main and '"./resource_manifest.json"' not in main and "'./resource_manifest.json'" not in main,
    'three column layout exists': all(x in index for x in ['id="sidebar"', 'id="stage"', 'id="chatPanel"']),
    'chat collapsible': all(x in index + main + style for x in ['openChatPanelBtn', 'collapseChatBtn', 'chat-collapsed']),
    'chat has sessions and messages views': all(x in index for x in ['data-view="sessions"', 'data-view-for="sessions"', 'data-view-for="messages"', 'data-chat-session']),
    'chat composer connected': all(x in index for x in ['id="chatInput"', 'id="chatSendBtn"', 'id="chatStopBtn"', 'id="chatSessionList"', 'id="chatMessageList"']) and 'id="chatInput" disabled' not in index,
    'chat uses server protocol': all(x in main for x in ['AGENT_API_PREFIX', 'EventSource', '/sessions', '/events?sessionId=', 'sendAgentPrompt', 'cancelAgentRun']),
    'server orchestrator exists': all((ROOT / rel).exists() for rel in ['apps/server/src/main.js', 'apps/server/src/config.js', 'packages/orchestrator/index.js']),
    'private config exists': (ROOT / 'config/agentstage.default.yaml').exists() and (ROOT / 'config/secrets.local.env').exists(),
    'service scripts exist': all((ROOT / rel).exists() for rel in ['install.sh', 'start.sh', 'scripts/clean/kill-services.sh']),
    'stage-aware sizing exists': all(x in main for x in ['getRenderSize', 'getBoundingClientRect', 'diagnostics.renderSize']),
    'obs hides chat': 'body.obs-mode #chatPanel' in style,
}

for name, ok in checks.items():
    if not ok:
        fail.append(name)

for rel in ['index.html', 'src/main.js', 'src/style.css']:
    if (ROOT / rel).exists():
        fail.append(f'legacy root viewer path still exists: {rel}')

if fail:
    print('FAIL web migration checks')
    for item in fail:
        print(' -', item)
    raise SystemExit(1)

print(json.dumps({'status': 'PASS', 'checks': checks}, ensure_ascii=False, indent=2))
