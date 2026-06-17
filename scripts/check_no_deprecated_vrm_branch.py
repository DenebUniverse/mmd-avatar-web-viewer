#!/usr/bin/env python3
from __future__ import annotations
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
fail=[]

pkg=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
deps={**pkg.get('dependencies',{}), **pkg.get('devDependencies',{})}
for bad in ['@pixiv/three-vrm']:
    if bad in deps:
        fail.append(f'unsupported dependency still present: {bad}')

for rel in ['public/models/hiying.vrm', 'dist/models/hiying.vrm']:
    if (ROOT/rel).exists():
        fail.append(f'unsupported generated VRM still present: {rel}')

for p in ROOT.rglob('*'):
    if not p.is_file():
        continue
    rel=str(p.relative_to(ROOT))
    if rel.startswith('docs/'):
        continue  # docs may discuss the unsupported route
    if p.name.startswith('pmx_to') or 'minimal_vrm' in p.name or 'three-vrm' in p.name:
        fail.append(f'unsupported converter/runtime file present: {rel}')
    # Runtime/source files must not reference the VRM route. Check scripts can mention it only for validation.
    if rel.startswith('scripts/check_'):
        continue
    if p.suffix.lower() in {'.js','.ts','.py','.html','.json','.sh'}:
        txt=p.read_text(errors='ignore')
        if '@pixiv/three-vrm' in txt:
            fail.append(f'unsupported three-vrm import/reference in runtime code: {rel}')
        if '/models/hiying.vrm' in txt:
            fail.append(f'unsupported hiying.vrm default path in runtime code: {rel}')

if fail:
    print('FAIL unsupported VRM branch cleanup')
    for f in fail:
        print(' -', f)
    raise SystemExit(1)

print(json.dumps({
    'status':'PASS',
    'message':'VRM 转换分支未进入当前代码/资源。'
}, ensure_ascii=False, indent=2))
