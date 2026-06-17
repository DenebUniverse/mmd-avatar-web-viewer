#!/usr/bin/env python3
from __future__ import annotations

import math
import pathlib
import struct
from dataclasses import dataclass
from typing import Iterable

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'motions' / 'generated'
POSE_OUT = ROOT / 'public' / 'poses' / 'generated'


def sjis_bytes(text: str, size: int) -> bytes:
    raw = text.encode('cp932', errors='replace')[:size]
    return raw + b'\x00' * (size - len(raw))


def quat_from_euler_xyz(x: float, y: float, z: float) -> tuple[float, float, float, float]:
    # Same intrinsic XYZ convention used by THREE.Euler default. VMD stores a quaternion.
    c1 = math.cos(x / 2); c2 = math.cos(y / 2); c3 = math.cos(z / 2)
    s1 = math.sin(x / 2); s2 = math.sin(y / 2); s3 = math.sin(z / 2)
    qx = s1 * c2 * c3 + c1 * s2 * s3
    qy = c1 * s2 * c3 - s1 * c2 * s3
    qz = c1 * c2 * s3 + s1 * s2 * c3
    qw = c1 * c2 * c3 - s1 * s2 * s3
    return (qx, qy, qz, qw)

# Bezier interpolation bytes. MMD's default linear/ease-ish data is commonly safe;
# for our generated motions we mainly need valid VMD clips, not high-authoring fidelity.
INTERP = bytes([
    20, 20, 20, 20, 107, 107, 107, 107, 20, 20, 20, 20, 107, 107, 107, 107,
    20, 20, 20, 20, 107, 107, 107, 107, 20, 20, 20, 20, 107, 107, 107, 107,
    20, 20, 20, 20, 107, 107, 107, 107, 20, 20, 20, 20, 107, 107, 107, 107,
    20, 20, 20, 20, 107, 107, 107, 107, 20, 20, 20, 20, 107, 107, 107, 107,
])


@dataclass
class BoneFrame:
    name: str
    frame: int
    pos: tuple[float, float, float] = (0.0, 0.0, 0.0)
    rot: tuple[float, float, float] = (0.0, 0.0, 0.0)


@dataclass
class MorphFrame:
    name: str
    frame: int
    weight: float


def write_vmd(path: pathlib.Path, bone_frames: Iterable[BoneFrame], morph_frames: Iterable[MorphFrame] = ()) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Keep the last frame for the same bone at the same timestamp. The motion builders
    # start from a default pose and then override selected bones; duplicate keyframes at
    # the same frame are legal-ish but ambiguous, so normalize here.
    bone_map = {}
    for b in bone_frames:
        bone_map[(b.name, b.frame)] = b
    morph_map = {}
    for m in morph_frames:
        morph_map[(m.name, m.frame)] = m
    bones = sorted(bone_map.values(), key=lambda b: (b.frame, b.name))
    morphs = sorted(morph_map.values(), key=lambda m: (m.frame, m.name))
    with path.open('wb') as f:
        f.write(sjis_bytes('Vocaloid Motion Data 0002', 30))
        f.write(sjis_bytes('Hiying PMX VMD', 20))
        f.write(struct.pack('<I', len(bones)))
        for b in bones:
            f.write(sjis_bytes(b.name, 15))
            f.write(struct.pack('<I', b.frame))
            f.write(struct.pack('<3f', *b.pos))
            f.write(struct.pack('<4f', *quat_from_euler_xyz(*b.rot)))
            f.write(INTERP)
        f.write(struct.pack('<I', len(morphs)))
        for m in morphs:
            f.write(sjis_bytes(m.name, 15))
            f.write(struct.pack('<I', m.frame))
            f.write(struct.pack('<f', m.weight))
        # camera, light, self-shadow, IK sections
        f.write(struct.pack('<I', 0))
        f.write(struct.pack('<I', 0))
        f.write(struct.pack('<I', 0))
        f.write(struct.pack('<I', 0))


def default_pose(frame: int) -> list[BoneFrame]:
    return [
        BoneFrame('センター', frame, (0, 0, 0), (0, 0, 0)),
        BoneFrame('グルーブ', frame, (0, 0, 0), (0, 0, 0)),
        BoneFrame('左腕', frame, (0, 0, 0), (0.05, 0.04, -0.72)),
        BoneFrame('右腕', frame, (0, 0, 0), (0.05, -0.04, 0.72)),
        BoneFrame('左ひじ', frame, (0, 0, 0), (0.0, 0.0, -0.34)),
        BoneFrame('右ひじ', frame, (0, 0, 0), (0.0, 0.0, 0.34)),
        BoneFrame('左手首', frame, (0, 0, 0), (0.0, 0.0, -0.03)),
        BoneFrame('右手首', frame, (0, 0, 0), (0.0, 0.0, 0.03)),
        BoneFrame('上半身', frame, (0, 0, 0), (0, 0, 0)),
        BoneFrame('上半身2', frame, (0, 0, 0), (0, 0, 0)),
        BoneFrame('首', frame, (0, 0, 0), (0, 0, 0)),
        BoneFrame('頭', frame, (0, 0, 0), (0, 0, 0)),
        BoneFrame('左ひざ', frame, (0, 0, 0), (0, 0, 0)),
        BoneFrame('右ひざ', frame, (0, 0, 0), (0, 0, 0)),
    ]


def idle_motion() -> list[BoneFrame]:
    out: list[BoneFrame] = []
    for frame, phase in [(0, 0), (30, math.pi / 2), (60, math.pi), (90, math.pi * 1.5), (120, math.pi * 2)]:
        s = math.sin(phase)
        s2 = math.sin(phase * 0.63)
        out += default_pose(frame)
        out += [
            BoneFrame('上半身', frame, rot=(s * 0.018, 0, s2 * 0.012)),
            BoneFrame('上半身2', frame, rot=(s * 0.014, 0, s2 * 0.010)),
            BoneFrame('首', frame, rot=(s2 * 0.015, s * 0.018, 0)),
            BoneFrame('頭', frame, rot=(s * 0.020, s2 * 0.026, s * 0.010)),
            BoneFrame('左腕', frame, rot=(0.05, 0.04, -0.72 + s * 0.018)),
            BoneFrame('右腕', frame, rot=(0.05, -0.04, 0.72 - s * 0.018)),
            BoneFrame('左手首', frame, rot=(0, 0, -0.03 + s * 0.016)),
            BoneFrame('右手首', frame, rot=(0, 0, 0.03 - s * 0.016)),
        ]
    return out


def wave_motion() -> list[BoneFrame]:
    out: list[BoneFrame] = []
    for frame in [0, 90]:
        out += default_pose(frame)
    for frame, w in [(12, 0.35), (24, 0.7), (36, 1.0), (48, 0.7), (60, 1.0), (72, 0.7)]:
        out += default_pose(frame)
        wave = math.sin(frame / 6.0) * 0.35
        out += [
            BoneFrame('右腕', frame, rot=(-0.04, -0.10, -1.42 * w)),
            BoneFrame('右ひじ', frame, rot=(0, 0, (-0.58 * w) + wave)),
            BoneFrame('右手首', frame, rot=(0, 0, wave * 0.72)),
            BoneFrame('上半身2', frame, rot=(0, -0.05 * w, 0.02 * w)),
            BoneFrame('頭', frame, rot=(0.02 * w, -0.04 * w, 0)),
        ]
    return out


def jump_motion() -> list[BoneFrame]:
    out: list[BoneFrame] = []
    keyframes = [(0, 0, 0), (10, -0.32, 0.16), (24, 1.5, 0.0), (36, 2.8, 0.0), (48, 1.5, 0.0), (62, -0.14, 0.10), (78, 0, 0)]
    for frame, y, squat in keyframes:
        out += default_pose(frame)
        arm = math.sin(math.pi * min(frame / 78, 1)) * 0.18
        out += [
            BoneFrame('センター', frame, pos=(0, y, 0)),
            BoneFrame('左腕', frame, rot=(0.05 - arm, 0.04, -0.72 - arm * 0.45)),
            BoneFrame('右腕', frame, rot=(0.05 - arm, -0.04, 0.72 + arm * 0.45)),
            BoneFrame('上半身', frame, rot=(-squat * 0.35, 0, 0)),
            BoneFrame('左ひざ', frame, rot=(squat * 0.75, 0, 0)),
            BoneFrame('右ひざ', frame, rot=(squat * 0.75, 0, 0)),
        ]
    return out


def peek_motion() -> list[BoneFrame]:
    out: list[BoneFrame] = []
    for frame, e in [(0, 0), (24, 0.5), (42, 1.0), (66, 0.5), (84, 0)]:
        out += default_pose(frame)
        out += [
            BoneFrame('センター', frame, pos=(0, 0, e * 1.8)),
            BoneFrame('上半身', frame, rot=(-0.11 * e, 0, 0)),
            BoneFrame('上半身2', frame, rot=(-0.14 * e, 0, 0)),
            BoneFrame('首', frame, rot=(-0.08 * e, 0, 0)),
            BoneFrame('頭', frame, rot=(-0.10 * e, 0, 0)),
        ]
    return out


def breath_hiying_compatible_motion() -> tuple[list[BoneFrame], list[MorphFrame]]:
    """Looping breathing/eyedart-like motion using only standard bones/morphs in Hiying PMX.

    The uploaded 呼吸モーション package targets extra 会話仕様/多段化 bones such as
    呼吸, 呼吸親1, 上半身親4/親5, etc. Those bones are not present in the official Hiying
    PMX. This compatible clip keeps the intent (gentle breathing, tiny head/shoulder
    motion, blinking) but writes keyframes to standard MMD bones so it visibly works
    without modifying the PMX.
    """
    bones: list[BoneFrame] = []
    morphs: list[MorphFrame] = []
    # 4-second seamless loop at 30fps.
    for frame, phase in [(0, 0), (20, math.pi / 3), (40, math.pi * 2 / 3), (60, math.pi), (80, math.pi * 4 / 3), (100, math.pi * 5 / 3), (120, math.pi * 2)]:
        s = math.sin(phase)
        s2 = math.sin(phase * 0.5 + 0.4)
        bones += default_pose(frame)
        bones += [
            BoneFrame('上半身', frame, rot=(0.012 * s, 0.002 * s2, 0.003 * s2)),
            BoneFrame('上半身2', frame, rot=(0.018 * s, 0.003 * s2, 0.004 * s2)),
            BoneFrame('首', frame, rot=(-0.006 * s, 0.008 * s2, 0.002 * s)),
            BoneFrame('頭', frame, rot=(-0.010 * s, 0.014 * s2, 0.004 * s2)),
            BoneFrame('左肩', frame, rot=(0.000, 0.000, -0.006 * s)),
            BoneFrame('右肩', frame, rot=(0.000, 0.000, 0.006 * s)),
            BoneFrame('左腕', frame, rot=(0.05 + 0.006 * s, 0.04, -0.72 + 0.012 * s)),
            BoneFrame('右腕', frame, rot=(0.05 + 0.006 * s, -0.04, 0.72 - 0.012 * s)),
            BoneFrame('左手首', frame, rot=(0, 0, -0.03 + 0.009 * s2)),
            BoneFrame('右手首', frame, rot=(0, 0, 0.03 - 0.009 * s2)),
        ]
    # soft blink in the loop. PMX MMD morph name is commonly まばたき.
    for frame, weight in [(0, 0.0), (72, 0.0), (76, 0.85), (80, 0.0), (120, 0.0)]:
        morphs.append(MorphFrame('まばたき', frame, weight))
    return bones, morphs


def write_default_vpd(path: pathlib.Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames = default_pose(0)
    lines = ['Vocaloid Pose Data file', '', 'HiyingOfficialPMX.osm;', f'{len(frames)};']
    for i, b in enumerate(frames):
        qx, qy, qz, qw = quat_from_euler_xyz(*b.rot)
        lines += [
            f'Bone{i}{{{b.name}',
            f'{b.pos[0]:.6f},{b.pos[1]:.6f},{b.pos[2]:.6f};',
            f'{qx:.6f},{qy:.6f},{qz:.6f},{qw:.6f};',
            '}',
        ]
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def main() -> None:
    motions = {
        'builtin_idle.vmd': (idle_motion(), []),
        'builtin_wave.vmd': (wave_motion(), []),
        'builtin_jump.vmd': (jump_motion(), []),
        'builtin_peek.vmd': (peek_motion(), []),
    }
    breath_bones, breath_morphs = breath_hiying_compatible_motion()
    motions['breath_hiying_compatible.vmd'] = (breath_bones, breath_morphs)
    for filename, (bone_frames, morph_frames) in motions.items():
        write_vmd(OUT / filename, bone_frames, morph_frames)
    write_default_vpd(POSE_OUT / 'default_stand.vpd')
    print(f'Generated {len(motions)} VMD clips in {OUT}')
    print(f'Generated VPD pose in {POSE_OUT}')


if __name__ == '__main__':
    main()
