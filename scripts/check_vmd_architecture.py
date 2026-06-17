#!/usr/bin/env python3
from __future__ import annotations
import json
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parents[1]
fail: list[str] = []
main = (ROOT / 'src/main.js').read_text(encoding='utf-8')

required_main = {
    'imports MMDAnimationHelper': 'MMDAnimationHelper' in main and 'three/examples/jsm/animation/MMDAnimationHelper.js' in main,
    'uses loadAnimation': 'loader.loadAnimation' in main,
    'uses helper add': 'mmdHelper.add(mesh' in main,
    'updates helper each frame': 'mmdHelper.update(delta)' in main,
    'supports VPD': 'loader.loadVPD' in main and 'mmdHelper.pose' in main,
    'has no procedural action functions': all(x not in main for x in ['function applyDefaultPose', 'function applyWaveAction', 'function applyJumpAction', 'function applyPeekAction']),
    'has no direct bone rotation runtime helpers': all(x not in main for x in ['function setBoneRot', 'function setBoneAdd']),
}
for name, ok in required_main.items():
    if not ok:
        fail.append(name)

expected_vmd = [
    'public/motions/generated/breath_hiying_compatible.vmd',
    'public/motions/generated/builtin_idle.vmd',
    'public/motions/generated/builtin_wave.vmd',
    'public/motions/generated/builtin_jump.vmd',
    'public/motions/generated/builtin_peek.vmd',
    'public/motions/external/shoten_time_mihoyo_yujie.vmd',
    'public/motions/external/good_tea_shake_mihoyo_yujie.vmd',
    'public/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd',
]


def read_u32(buf: bytes, off: int) -> tuple[int, int]:
    return struct.unpack_from('<I', buf, off)[0], off + 4

vmd_report = []
for rel in expected_vmd:
    path = ROOT / rel
    if not path.exists():
        fail.append(f'missing {rel}')
        continue
    data = path.read_bytes()
    if len(data) < 54:
        fail.append(f'{rel} too small')
        continue
    header = data[:30].rstrip(b'\x00')
    if header != b'Vocaloid Motion Data 0002':
        fail.append(f'{rel} invalid VMD header: {header!r}')
        continue
    off = 50
    bone_count, off = read_u32(data, off)
    off += bone_count * 111
    if off + 4 > len(data):
        fail.append(f'{rel} truncated before morph count')
        continue
    morph_count, off = read_u32(data, off)
    off += morph_count * 23
    if off + 16 > len(data):
        fail.append(f'{rel} truncated after morph section')
        continue
    camera_count, off = read_u32(data, off)
    light_count, off = read_u32(data, off)
    shadow_count, off = read_u32(data, off)
    ik_count, off = read_u32(data, off)
    if bone_count <= 0:
        fail.append(f'{rel} has no bone frames')
    vmd_report.append({
        'path': rel,
        'bytes': len(data),
        'boneFrames': bone_count,
        'morphFrames': morph_count,
        'cameraFrames': camera_count,
        'lightFrames': light_count,
        'selfShadowFrames': shadow_count,
        'ikFrames': ik_count,
    })

for rel in ['public/poses/generated/default_stand.vpd', 'public/motions/vmd_manifest.json', 'public/motions/external/README.md']:
    if not (ROOT / rel).exists():
        fail.append(f'missing {rel}')

manifest = json.loads((ROOT / 'public/motions/vmd_manifest.json').read_text(encoding='utf-8'))
motions = manifest.get('motions', [])
original_breath = manifest.get('originalBreathPackage', [])
if not any(item.get('id') == 'eyedartBreath' for item in motions):
    fail.append('manifest missing eyedartBreath')
if not any(item.get('id') == 'shotenTime' for item in motions):
    fail.append('manifest missing shotenTime')
if not any(item.get('id') == 'goodTea' for item in motions):
    fail.append('manifest missing goodTea')
if not any(item.get('id') == 'lovermaxHipSway' for item in motions):
    fail.append('manifest missing lovermaxHipSway')
if not any(item.get('id') == 'breathMultistageOriginal' for item in original_breath):
    fail.append('manifest missing uploaded breath original')
for rel in [
    'public/motions/external/shoten_time_mihoyo_yujie.vmd',
    'public/motions/external/good_tea_shake_mihoyo_yujie.vmd',
    'public/motions/external/shoten_time_README.txt',
    'public/motions/external/good_tea_shake_README.txt',
    'public/motions/external/lovermax_tiktok_hip_sway.vmd',
    'public/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd',
    'public/motions/external/lovermax_tiktok_hip_sway_README.txt',
    'public/motions/external/breath_original/breath_conversation_0f.vmd',
    'public/motions/external/breath_original/breath_multistage_0f.vmd',
    'public/motions/external/breath_original/breath_multistage_loop_9415f.vmd',
    'public/motions/external/breath_original/required_bones_original.txt',
]:
    if not (ROOT / rel).exists():
        fail.append(f'missing VMD resource {rel}')

if fail:
    print('FAIL VMD architecture checks')
    for item in fail:
        print(' -', item)
    raise SystemExit(1)

print(json.dumps({
    'status': 'PASS',
    'runtime': required_main,
    'vmd': vmd_report,
    'note': '运行时只通过 MMDAnimationHelper 播放 VMD/VPD。'
}, ensure_ascii=False, indent=2))
