#!/usr/bin/env python3
from __future__ import annotations
import json
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
fail: list[str] = []
proc = subprocess.run(['python3', 'scripts/scan_public_assets.py'], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
if proc.returncode != 0:
    print(proc.stdout)
    print(proc.stderr)
    raise SystemExit('FAIL: scan_public_assets.py failed')
manifest_path = ROOT / 'public/resource_manifest.json'
if not manifest_path.exists():
    fail.append('missing public/resource_manifest.json')
else:
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    for section in ['characters', 'motions', 'poses']:
        if not isinstance(manifest.get(section), list) or not manifest[section]:
            fail.append(f'resource manifest missing non-empty {section}')
    if manifest.get('defaultCharacterId') != 'hiying':
        fail.append('defaultCharacterId should be hiying')
    if not any(c.get('id') == 'qianyeBlade' for c in manifest.get('characters', [])):
        fail.append('resource manifest missing qianyeBlade')
    required_motions = {'breath', 'idle', 'wave', 'jump', 'peek', 'shotenTime', 'goodTea', 'lovermaxHipSway'}
    motion_ids = {m.get('id') for m in manifest.get('motions', [])}
    missing = sorted(required_motions - motion_ids)
    if missing:
        fail.append(f'resource manifest missing required motions: {missing}')
    if manifest.get('summary', {}).get('motions', 0) < len(required_motions):
        fail.append('resource manifest motion count too small')

# Verify a newly dropped valid VMD is discovered without editing config.
with tempfile.TemporaryDirectory(prefix='asset-scan-') as td:
    tmp_root = pathlib.Path(td)
    public = tmp_root / 'public'
    shutil.copytree(ROOT / 'public', public)
    local_dir = public / 'motions/local'
    local_dir.mkdir(parents=True, exist_ok=True)
    src = ROOT / 'public/motions/generated/builtin_wave.vmd'
    dst = local_dir / 'auto_added_wave.vmd'
    shutil.copy2(src, dst)
    # Run the scanner against a temporary project layout by importing its script logic through subprocess copy.
    scripts_dir = tmp_root / 'scripts'
    scripts_dir.mkdir()
    shutil.copy2(ROOT / 'scripts/scan_public_assets.py', scripts_dir / 'scan_public_assets.py')
    p = subprocess.run(['python3', 'scripts/scan_public_assets.py'], cwd=tmp_root, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if p.returncode != 0:
        fail.append('temporary asset scan failed')
    else:
        data = json.loads((public / 'resource_manifest.json').read_text(encoding='utf-8'))
        if not any(m.get('path') == '/motions/local/auto_added_wave.vmd' for m in data.get('motions', [])):
            fail.append('newly dropped VMD was not dynamically scanned into manifest')

if fail:
    print('FAIL resource scanning')
    for item in fail:
        print(' -', item)
    raise SystemExit(1)

print(json.dumps({'status': 'PASS', 'manifest': 'public/resource_manifest.json', 'message': 'public/models, public/motions and public/poses are scanned into dynamic manifest.'}, ensure_ascii=False, indent=2))
