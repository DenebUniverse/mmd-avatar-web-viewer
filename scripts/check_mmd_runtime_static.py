#!/usr/bin/env python3
from __future__ import annotations
import pathlib, json
ROOT = pathlib.Path(__file__).resolve().parents[1]
main = (ROOT/'src/main.js').read_text(encoding='utf-8')
pkg = json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
index = (ROOT/'index.html').read_text(encoding='utf-8')
style = (ROOT/'src/style.css').read_text(encoding='utf-8')
fail=[]
checks = {
    'uses MMDLoader': "MMDLoader" in main and "three/examples/jsm/loaders/MMDLoader.js" in main,
    'uses MMDAnimationHelper': "MMDAnimationHelper" in main and "three/examples/jsm/animation/MMDAnimationHelper.js" in main,
    'plays VMD through helper': all(x in main for x in ['loader.loadAnimation', 'mmdHelper.add(mesh', 'mmdHelper.update(delta)']),
    'supports VPD pose': all(x in main for x in ['loader.loadVPD', 'mmdHelper.pose', 'default_stand.vpd']),
    'defaults to official PMX': "星穹铁道—绯英2.pmx" in main,
    'supports character selection': all(x in main for x in ['CHARACTER_MODELS', 'qianyeBlade', 'characterSelect', 'loadModel(next.modelUrl']) and 'id="characterSelect"' in index,
    'does not default to generated VRM': "/models/hiying.vrm" not in main,
    'hides neutral overlay materials': "mat.name === 'biaoq'" in main and "mat.name.endsWith('+')" in main and "電子寵物蛋表情2" in main and "mat.visible = false" in main,
    'procedural action runtime absent': all(x not in main for x in ['function applyDefaultPose', 'function applyJumpAction', 'function applyWaveAction', 'function applyPeekAction', 'function setBoneRot', 'function setBoneAdd']),
    'builtin VMD actions referenced': all(x in main for x in ['builtin_idle.vmd', 'builtin_wave.vmd', 'builtin_jump.vmd', 'builtin_peek.vmd']),
    'external VMD hooks exist': all(x in (ROOT/'public/resource_manifest.json').read_text(encoding='utf-8') for x in ['eyedart_breath.vmd', 'shoten_time_mihoyo_yujie.vmd', 'good_tea_shake_mihoyo_yujie.vmd']),
    'bundled uploaded VMD files exist': all((ROOT/x).exists() for x in ['public/motions/external/shoten_time_mihoyo_yujie.vmd', 'public/motions/external/good_tea_shake_mihoyo_yujie.vmd']),
    'three dependency': 'three' in pkg.get('dependencies', {}),
    'left-right layout exists': all(x in index for x in ['id="sidebar"', 'id="stage"', 'id="collapseBtn"', 'id="openPanelBtn"']),
    'collapsible panel logic exists': all(x in main for x in ['setPanelCollapsed', 'panel-collapsed', 'openPanelBtn', 'collapseBtn']),
    'stage-aware renderer sizing exists': all(x in main for x in ['getRenderSize', 'getBoundingClientRect', 'diagnostics.renderSize']) and 'body.obs-mode #app' in style,
    'safe DOM binding exists': all(x in main for x in ['requireEl', 'optionalEl', 'bindClick', "bindClick('#hideBtn'", '前端运行错误']),
    'VMD UI exists': all(x in index for x in ['id="characterSelect"', 'id="motionSelect"', 'id="poseSelect"', 'id="breathBtn"', 'id="eyedartBtn"', 'id="shotenTimeBtn"', 'id="goodTeaBtn"', 'id="poseBtn"', 'PMX 模型 + VMD 动作 + VPD 姿态 + MMDAnimationHelper']),
}
for k,v in checks.items():
    if not v: fail.append(k)
if fail:
    print('FAIL runtime static checks')
    for f in fail: print(' -', f)
    raise SystemExit(1)
print(json.dumps({'status':'PASS','checks':checks}, ensure_ascii=False, indent=2))
