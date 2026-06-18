#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import pathlib
import re
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
ASSETS_DIR = ROOT / 'assets'
GENERATED_DIR = ROOT / '.generated'
LEGACY_REGISTRY_DIR = ROOT / 'apps/web/src/registry/legacy'

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
    stem = pathlib.Path(text).stem
    out = []
    for ch in stem:
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


def asset_url_from_path(path: pathlib.Path) -> str:
    return '/assets/' + path.relative_to(ASSETS_DIR).as_posix()


def migrate_url(value: str | None) -> str:
    if not value:
        return ''
    if value.startswith('/assets/'):
        return value
    for prefix in ['/models/', '/motions/', '/poses/']:
        if value.startswith(prefix):
            return '/assets' + value
    return value


def path_from_url(url: str) -> pathlib.Path | None:
    if not url.startswith('/assets/'):
        return None
    return ASSETS_DIR / url[len('/assets/'):].lstrip('/')


def is_valid_pmx_pmd(path: pathlib.Path) -> bool:
    try:
        return path.read_bytes()[:4] in {b'PMX ', b'Pmd'}
    except OSError:
        return False


def is_valid_vmd(path: pathlib.Path) -> bool:
    try:
        return path.read_bytes()[:30].rstrip(b'\x00') == b'Vocaloid Motion Data 0002'
    except OSError:
        return False


def is_valid_vpd(path: pathlib.Path) -> bool:
    try:
        return b'Vocaloid Pose Data file' in path.read_bytes()[:64]
    except OSError:
        return False


def exists_for_url(url: str) -> bool:
    path = path_from_url(url)
    return bool(path and path.exists())


def normalize_character(item: dict[str, Any]) -> dict[str, Any]:
    model_path = migrate_url(item.get('modelPath') or item.get('modelUrl') or item.get('path'))
    asset_dir = migrate_url(item.get('assetDir') or '/' + pathlib.Path(model_path.lstrip('/')).parent.as_posix() + '/')
    out = dict(item)
    out['id'] = out.get('id') or slug(model_path)
    out['label'] = out.get('label') or pathlib.Path(model_path).stem
    out['modelPath'] = model_path
    out['modelUrl'] = model_path
    out['assetDir'] = asset_dir
    out['origin'] = out.get('origin') or 'manifest'
    if out.get('accessoryModels'):
        out['accessoryModels'] = [migrate_url(x) for x in out.get('accessoryModels', [])]
    if out.get('usageRulePath'):
        out['usageRulePath'] = migrate_url(out['usageRulePath'])
    out['missing'] = not exists_for_url(model_path)
    return out


def normalize_motion(item: dict[str, Any], section: str = 'motions') -> dict[str, Any]:
    path = migrate_url(item.get('path') or item.get('url'))
    out = dict(item)
    out['id'] = out.get('id') or slug(path)
    out['label'] = out.get('label') or out.get('title') or pathlib.Path(path).stem
    out['title'] = out.get('title') or out['label']
    out['path'] = path
    out['origin'] = out.get('origin') or 'manifest'
    if section == 'originalBreathPackage':
        out['category'] = out.get('category') or 'original-breath-package'
    for key in ['readmePath', 'originalPath']:
        if out.get(key):
            out[key] = migrate_url(out[key])
    out['missing'] = not exists_for_url(path)
    out['optional'] = bool(out.get('optional') or out.get('status') == 'optional; download separately if needed')
    return out


def normalize_pose(item: dict[str, Any]) -> dict[str, Any]:
    path = migrate_url(item.get('path') or item.get('url'))
    out = dict(item)
    out['id'] = out.get('id') or slug(path)
    out['label'] = out.get('label') or out.get('title') or pathlib.Path(path).stem
    out['title'] = out.get('title') or out['label']
    out['path'] = path
    out['origin'] = out.get('origin') or 'manifest'
    out['missing'] = not exists_for_url(path)
    return out


def scan_assets() -> dict[str, Any]:
    legacy_characters = read_json(LEGACY_REGISTRY_DIR / 'avatar_manifest.json', {})
    legacy_motions = read_json(LEGACY_REGISTRY_DIR / 'vmd_manifest.json', {})

    characters = [
        normalize_character(item)
        for item in legacy_characters.get('characters', [])
        if item.get('modelPath') or item.get('modelUrl') or item.get('path')
    ]
    known_model_paths = {c['modelPath'] for c in characters}
    known_accessories = {x for c in characters for x in c.get('accessoryModels', []) or []}
    used_character_ids = {c['id'] for c in characters}

    models_dir = ASSETS_DIR / 'models'
    if models_dir.exists():
        for path in sorted(models_dir.rglob('*')):
            if not path.is_file() or path.suffix.lower() not in MODEL_EXTS or not is_valid_pmx_pmd(path):
                continue
            url = asset_url_from_path(path)
            if url in known_model_paths or url in known_accessories:
                continue
            characters.append({
                'id': slug(path.parent.name + '_' + path.stem, used_character_ids),
                'label': path.stem,
                'modelPath': url,
                'modelUrl': url,
                'assetDir': '/assets/' + path.parent.relative_to(ASSETS_DIR).as_posix() + '/',
                'origin': 'scanned',
                'format': path.suffix.lower().lstrip('.'),
                'missing': False,
            })

    motions: list[dict[str, Any]] = []
    for section in ['motions', 'originalBreathPackage']:
        for item in legacy_motions.get(section, []):
            if item.get('path'):
                motions.append(normalize_motion(item, section))
    known_motion_paths = {m['path'] for m in motions}
    used_motion_ids = {m['id'] for m in motions}
    motions_dir = ASSETS_DIR / 'motions'
    if motions_dir.exists():
        for path in sorted(motions_dir.rglob('*')):
            if not path.is_file() or path.suffix.lower() not in MOTION_EXTS or not is_valid_vmd(path):
                continue
            url = asset_url_from_path(path)
            if url in known_motion_paths:
                continue
            motions.append({
                'id': slug(path.parent.name + '_' + path.stem, used_motion_ids),
                'label': path.stem,
                'title': path.stem,
                'path': url,
                'origin': 'scanned',
                'format': 'vmd',
                'missing': False,
                'optional': False,
            })

    poses = [
        normalize_pose(item)
        for item in legacy_motions.get('poses', [])
        if item.get('path')
    ]
    known_pose_paths = {p['path'] for p in poses}
    used_pose_ids = {p['id'] for p in poses}
    poses_dir = ASSETS_DIR / 'poses'
    if poses_dir.exists():
        for path in sorted(poses_dir.rglob('*')):
            if not path.is_file() or path.suffix.lower() not in POSE_EXTS or not is_valid_vpd(path):
                continue
            url = asset_url_from_path(path)
            if url in known_pose_paths:
                continue
            poses.append({
                'id': slug(path.parent.name + '_' + path.stem, used_pose_ids),
                'label': path.stem,
                'title': path.stem,
                'path': url,
                'origin': 'scanned',
                'format': 'vpd',
                'missing': False,
            })

    default_character_id = legacy_characters.get('defaultCharacterId') or 'hiying'
    if not any(c.get('id') == default_character_id for c in characters) and characters:
        default_character_id = characters[0]['id']

    required_missing = [
        {'type': 'character', 'id': c['id'], 'path': c['modelPath']}
        for c in characters
        if c.get('missing')
    ] + [
        {'type': 'motion', 'id': m['id'], 'path': m['path']}
        for m in motions
        if m.get('missing') and not m.get('optional')
    ] + [
        {'type': 'pose', 'id': p['id'], 'path': p['path']}
        for p in poses
        if p.get('missing')
    ]
    optional_missing = [
        {'type': 'motion', 'id': m['id'], 'path': m['path']}
        for m in motions
        if m.get('missing') and m.get('optional')
    ]

    characters.sort(key=lambda item: (0 if item.get('id') == default_character_id else 1, item.get('origin') != 'manifest', item.get('label', '')))
    motions.sort(key=lambda item: (item.get('origin') != 'manifest', item.get('label', item.get('title', ''))))
    poses.sort(key=lambda item: (item.get('origin') != 'manifest', item.get('label', item.get('title', ''))))

    return {
        'schema': 2,
        'generatedBy': 'scripts/assets/scan_assets.py',
        'runtime': 'PMX + VMD + VPD + MMDAnimationHelper',
        'defaultCharacterId': default_character_id,
        'defaultMotionId': legacy_motions.get('defaultMotionId') or 'breath',
        'defaultPoseId': legacy_motions.get('defaultPoseId') or (poses[0]['id'] if poses else None),
        'characters': characters,
        'motions': motions,
        'poses': poses,
        'missing': required_missing,
        'optionalMissing': optional_missing,
        'summary': {
            'characters': len(characters),
            'motions': len(motions),
            'poses': len(poses),
            'missing': len(required_missing),
            'optionalMissing': len(optional_missing),
        },
    }


def write_outputs() -> dict[str, Any]:
    GENERATED_DIR.mkdir(exist_ok=True)
    manifest = scan_assets()
    assets_out = GENERATED_DIR / 'assets-registry.json'
    characters_out = GENERATED_DIR / 'characters-registry.json'
    resource_out = GENERATED_DIR / 'resource_manifest.json'
    assets_out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    characters_out.write_text(json.dumps({
        'schema': 1,
        'generatedBy': 'scripts/assets/scan_assets.py',
        'defaultCharacterId': manifest['defaultCharacterId'],
        'characters': manifest['characters'],
        'summary': {
            'characters': len(manifest['characters']),
            'missing': len([c for c in manifest['characters'] if c.get('missing')]),
        },
    }, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    resource_out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return {
        'status': 'PASS' if not manifest['missing'] else 'WARN',
        'outputs': [
            str(assets_out.relative_to(ROOT)),
            str(characters_out.relative_to(ROOT)),
            str(resource_out.relative_to(ROOT)),
        ],
        'summary': manifest['summary'],
        'missing': manifest['missing'],
        'optionalMissing': manifest['optionalMissing'],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Scan AgentStage assets and generate registries')
    parser.parse_args()
    report = write_outputs()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report['missing']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
