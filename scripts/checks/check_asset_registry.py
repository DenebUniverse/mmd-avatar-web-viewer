#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]

proc = subprocess.run(['python3', 'scripts/assets/scan_assets.py'], cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
if proc.returncode != 0:
    print(proc.stdout)
    print(proc.stderr)
    raise SystemExit('FAIL: assets scan failed')

registry_path = ROOT / '.generated/assets-registry.json'
characters_path = ROOT / '.generated/characters-registry.json'
fail = []

if not registry_path.exists():
    fail.append('missing .generated/assets-registry.json')
else:
    data = json.loads(registry_path.read_text(encoding='utf-8'))
    if data.get('defaultCharacterId') != 'hiying':
      fail.append('defaultCharacterId should be hiying')
    character_ids = {item.get('id') for item in data.get('characters', [])}
    for required in ['hiying', 'qianyeBlade']:
        if required not in character_ids:
            fail.append(f'missing character {required}')
    motion_ids = {item.get('id') for item in data.get('motions', [])}
    for required in ['breath', 'idle', 'wave', 'jump', 'peek', 'shotenTime', 'goodTea', 'lovermaxHipSway']:
        if required not in motion_ids:
            fail.append(f'missing motion {required}')
    pose_ids = {item.get('id') for item in data.get('poses', [])}
    if 'defaultStand' not in pose_ids:
        fail.append('missing pose defaultStand')
    if data.get('missing'):
        fail.append(f'unexpected required missing assets: {data.get("missing")}')

if not characters_path.exists():
    fail.append('missing .generated/characters-registry.json')

for rel in [
    'assets/models/hiying_pmx/星穹铁道—绯英2.pmx',
    'assets/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx',
    'assets/models/qianye_blade_pmx/剑.pmx',
    'assets/models/qianye_blade_pmx/環.pmx',
    'assets/motions/generated/breath_hiying_compatible.vmd',
    'assets/motions/generated/builtin_idle.vmd',
    'assets/motions/generated/builtin_wave.vmd',
    'assets/motions/generated/builtin_jump.vmd',
    'assets/motions/generated/builtin_peek.vmd',
    'assets/poses/generated/default_stand.vpd',
]:
    if not (ROOT / rel).exists():
        fail.append(f'missing {rel}')

if fail:
    print('FAIL asset registry')
    for item in fail:
        print(' -', item)
    raise SystemExit(1)

print(json.dumps({'status': 'PASS', 'registry': '.generated/assets-registry.json'}, ensure_ascii=False, indent=2))
