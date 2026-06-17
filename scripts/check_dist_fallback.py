#!/usr/bin/env python3
from __future__ import annotations
import pathlib, json
ROOT = pathlib.Path(__file__).resolve().parents[1]
dist = ROOT/'dist'
fail=[]
for rel in [
    'index.html',
    'main.js',
    'models/hiying_pmx/星穹铁道—绯英2.pmx',
    'models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx',
    'models/qianye_blade_pmx/衣.png',
    'models/qianye_blade_pmx/颜1.png',
    'models/avatar_manifest.json',
    'models/hiying_pmx/颜.png',
    'models/hiying_pmx/髪.png',
    'models/hiying_pmx/衣.png',
    'motions/generated/builtin_idle.vmd',
    'motions/generated/builtin_wave.vmd',
    'motions/generated/builtin_jump.vmd',
    'motions/generated/builtin_peek.vmd',
    'motions/vmd_manifest.json',
    'poses/generated/default_stand.vpd',
]:
    if not (dist/rel).exists(): fail.append(f'missing dist/{rel}')
index=(dist/'index.html').read_text(encoding='utf-8') if (dist/'index.html').exists() else ''
main=(dist/'main.js').read_text(encoding='utf-8') if (dist/'main.js').exists() else ''
if 'importmap' not in index: fail.append('dist/index.html missing importmap fallback')
if 'MMDLoader' not in main: fail.append('dist/main.js not using MMDLoader')
if 'MMDAnimationHelper' not in main or 'MMDAnimationHelper.js' not in index: fail.append('dist missing MMDAnimationHelper runtime/importmap')
if './models/hiying_pmx/星穹铁道—绯英2.pmx' not in main: fail.append('dist/main.js missing relative Hiying PMX path')
if './models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx' not in main: fail.append('dist/main.js missing relative Qianye PMX path')
if './motions/generated/builtin_idle.vmd' not in main: fail.append('dist/main.js missing relative VMD path')
if './poses/generated/default_stand.vpd' not in main: fail.append('dist/main.js missing relative VPD path')
if not (dist/'motions/external/shoten_time_mihoyo_yujie.vmd').exists(): fail.append('dist missing shoten_time_mihoyo_yujie.vmd')
if not (dist/'motions/external/good_tea_shake_mihoyo_yujie.vmd').exists(): fail.append('dist missing good_tea_shake_mihoyo_yujie.vmd')
if fail:
    print('FAIL dist fallback')
    for f in fail: print(' -', f)
    raise SystemExit(1)
print(json.dumps({'status':'PASS','dist':'ready','note':'can run with python3 -m http.server; VMD/VPD assets included'}, ensure_ascii=False, indent=2))
