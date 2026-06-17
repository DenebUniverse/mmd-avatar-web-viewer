#!/usr/bin/env python3
from __future__ import annotations
import argparse
import json
import pathlib
import re
import shutil
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]

MODEL_EXTS = {'.pmx', '.pmd'}
MOTION_EXTS = {'.vmd'}
POSE_EXTS = {'.vpd'}


def read_json(path: pathlib.Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        print(f'WARN: cannot read {path}: {exc}')
        return default


def slug(text: str, used: set[str] | None = None) -> str:
    # Keep common ASCII ids readable; collapse everything else to codepoints so ids stay stable.
    s = pathlib.Path(text).stem
    out = []
    for ch in s:
        if ch.isascii() and ch.isalnum():
            out.append(ch)
        elif ch in ['-', '_']:
            out.append('_')
        else:
            out.append(f'u{ord(ch):04x}')
    value = re.sub(r'_+', '_', ''.join(out)).strip('_') or 'asset'
    if value[0].isdigit():
        value = f'a_{value}'
    if used is not None:
        base = value
        i = 2
        while value in used:
            value = f'{base}_{i}'
            i += 1
        used.add(value)
    return value


def url_from_path(path: pathlib.Path, base: pathlib.Path) -> str:
    return '/' + path.relative_to(base).as_posix()


def is_valid_pmx_pmd(path: pathlib.Path) -> bool:
    try:
        head = path.read_bytes()[:4]
    except OSError:
        return False
    return head in {b'PMX ', b'Pmd'}


def is_valid_vmd(path: pathlib.Path) -> bool:
    try:
        data = path.read_bytes()[:30]
    except OSError:
        return False
    return data.rstrip(b'\x00') == b'Vocaloid Motion Data 0002'


def is_valid_vpd(path: pathlib.Path) -> bool:
    try:
        head = path.read_bytes()[:64]
    except OSError:
        return False
    return b'Vocaloid Pose Data file' in head


def make_map(items: list[dict[str, Any]], path_key: str) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for item in items:
        path = item.get(path_key) or item.get('path') or item.get('modelPath') or item.get('modelUrl')
        if path:
            out[path] = item
    return out


def scan_public(public_dir: pathlib.Path) -> dict[str, Any]:
    model_manifest = read_json(public_dir / 'models/avatar_manifest.json', {})
    motion_manifest = read_json(public_dir / 'motions/vmd_manifest.json', {})

    configured_characters = []
    for item in model_manifest.get('characters', []):
        model_path = item.get('modelPath') or item.get('modelUrl') or item.get('path')
        if not model_path:
            continue
        normalized = dict(item)
        normalized['id'] = normalized.get('id') or slug(model_path)
        normalized['label'] = normalized.get('label') or pathlib.Path(model_path).stem
        normalized['modelPath'] = model_path
        normalized['modelUrl'] = model_path
        normalized['assetDir'] = normalized.get('assetDir') or '/' + pathlib.Path(model_path.lstrip('/')).parent.as_posix() + '/'
        normalized['origin'] = normalized.get('origin') or 'manifest'
        configured_characters.append(normalized)

    character_by_path = make_map(configured_characters, 'modelPath')
    known_accessory_paths = set()
    for item in configured_characters:
        for accessory in item.get('accessoryModels', []) or []:
            known_accessory_paths.add(accessory)
    used_character_ids = {c['id'] for c in configured_characters}
    scanned_characters = []
    models_dir = public_dir / 'models'
    if models_dir.exists():
        for path in sorted(models_dir.rglob('*')):
            if not path.is_file() or path.suffix.lower() not in MODEL_EXTS:
                continue
            if not is_valid_pmx_pmd(path):
                continue
            url = url_from_path(path, public_dir)
            if url in character_by_path or url in known_accessory_paths:
                continue
            scanned_characters.append({
                'id': slug(path.parent.name + '_' + path.stem, used_character_ids),
                'label': path.stem,
                'modelPath': url,
                'modelUrl': url,
                'assetDir': '/' + path.parent.relative_to(public_dir).as_posix() + '/',
                'origin': 'scanned',
                'format': path.suffix.lower().lstrip('.'),
            })

    default_character_id = model_manifest.get('defaultCharacterId') or 'hiying'
    characters = configured_characters + scanned_characters
    if not any(c.get('id') == default_character_id for c in characters) and characters:
        default_character_id = characters[0]['id']
    characters.sort(key=lambda x: (0 if x.get('id') == default_character_id else 1, x.get('origin') != 'manifest', x.get('label', '')))

    configured_motions: list[dict[str, Any]] = []
    for section in ['motions', 'originalBreathPackage']:
        for item in motion_manifest.get(section, []):
            path = item.get('path')
            if not path:
                continue
            normalized = dict(item)
            normalized['id'] = normalized.get('id') or slug(path)
            normalized['label'] = normalized.get('label') or normalized.get('title') or pathlib.Path(path).stem
            normalized['title'] = normalized.get('title') or normalized['label']
            normalized['path'] = path
            normalized['origin'] = normalized.get('origin') or 'manifest'
            if section == 'originalBreathPackage':
                normalized['category'] = normalized.get('category') or 'original-breath-package'
            configured_motions.append(normalized)
    motion_by_path = make_map(configured_motions, 'path')
    used_motion_ids = {m['id'] for m in configured_motions}
    scanned_motions = []
    motions_dir = public_dir / 'motions'
    if motions_dir.exists():
        for path in sorted(motions_dir.rglob('*')):
            if not path.is_file() or path.suffix.lower() not in MOTION_EXTS:
                continue
            if not is_valid_vmd(path):
                continue
            url = url_from_path(path, public_dir)
            if url in motion_by_path:
                continue
            scanned_motions.append({
                'id': slug(path.parent.name + '_' + path.stem, used_motion_ids),
                'label': path.stem,
                'title': path.stem,
                'path': url,
                'origin': 'scanned',
                'format': 'vmd',
            })
    motions = configured_motions + scanned_motions
    motions.sort(key=lambda x: (x.get('origin') != 'manifest', x.get('label', x.get('title', ''))))

    configured_poses = []
    for item in motion_manifest.get('poses', []):
        path = item.get('path')
        if not path:
            continue
        normalized = dict(item)
        normalized['id'] = normalized.get('id') or slug(path)
        normalized['label'] = normalized.get('label') or normalized.get('title') or pathlib.Path(path).stem
        normalized['title'] = normalized.get('title') or normalized['label']
        normalized['path'] = path
        normalized['origin'] = normalized.get('origin') or 'manifest'
        configured_poses.append(normalized)
    pose_by_path = make_map(configured_poses, 'path')
    used_pose_ids = {p['id'] for p in configured_poses}
    scanned_poses = []
    poses_dir = public_dir / 'poses'
    if poses_dir.exists():
        for path in sorted(poses_dir.rglob('*')):
            if not path.is_file() or path.suffix.lower() not in POSE_EXTS:
                continue
            if not is_valid_vpd(path):
                continue
            url = url_from_path(path, public_dir)
            if url in pose_by_path:
                continue
            scanned_poses.append({
                'id': slug(path.parent.name + '_' + path.stem, used_pose_ids),
                'label': path.stem,
                'title': path.stem,
                'path': url,
                'origin': 'scanned',
                'format': 'vpd',
            })
    poses = configured_poses + scanned_poses
    poses.sort(key=lambda x: (x.get('origin') != 'manifest', x.get('label', x.get('title', ''))))

    return {
        'schema': 1,
        'generatedBy': 'scripts/scan_public_assets.py',
        'runtime': 'PMX + VMD + VPD + MMDAnimationHelper',
        'defaultCharacterId': default_character_id,
        'defaultMotionId': motion_manifest.get('defaultMotionId') or 'breath',
        'defaultPoseId': motion_manifest.get('defaultPoseId') or (poses[0]['id'] if poses else None),
        'characters': characters,
        'motions': motions,
        'poses': poses,
        'summary': {
            'characters': len(characters),
            'motions': len(motions),
            'poses': len(poses),
            'scannedCharacters': len(scanned_characters),
            'scannedMotions': len(scanned_motions),
            'scannedPoses': len(scanned_poses),
        },
    }


def write_manifest(target_dir: pathlib.Path) -> pathlib.Path:
    manifest = scan_public(target_dir)
    out = target_dir / 'resource_manifest.json'
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return out


def main():
    parser = argparse.ArgumentParser(description='Scan public/dist MMD assets and generate resource_manifest.json')
    parser.add_argument('--target', action='append', help='target directory to scan, e.g. public or dist. Can be repeated.')
    parser.add_argument('--copy-public-to-dist', action='store_true', help='copy public models/motions/poses into dist before scanning dist')
    args = parser.parse_args()

    targets = [ROOT / t for t in args.target] if args.target else [ROOT / 'public']
    if args.copy_public_to_dist:
        dist = ROOT / 'dist'
        dist.mkdir(exist_ok=True)
        for dirname in ['models', 'motions', 'poses']:
            src = ROOT / 'public' / dirname
            dst = dist / dirname
            if dst.exists():
                shutil.rmtree(dst)
            if src.exists():
                shutil.copytree(src, dst)
        if dist not in targets:
            targets.append(dist)

    reports = []
    for target in targets:
        if not target.exists():
            print(f'SKIP: target does not exist: {target}')
            continue
        out = write_manifest(target)
        data = read_json(out, {})
        reports.append({'target': str(target.relative_to(ROOT)), 'output': str(out.relative_to(ROOT)), 'summary': data.get('summary', {})})
    print(json.dumps({'status': 'PASS', 'reports': reports}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
