#!/usr/bin/env python3
from __future__ import annotations
import json
import pathlib
import struct
from dataclasses import dataclass

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODEL_MANIFEST = ROOT / 'public/models/avatar_manifest.json'
VMD_MANIFEST = ROOT / 'public/motions/vmd_manifest.json'


def decode_pmx_text(data: bytes, encoding: int) -> str:
    return data.decode('utf-16-le' if encoding == 0 else 'utf-8', 'replace')


class PMXReader:
    def __init__(self, path: pathlib.Path):
        self.path = path
        self.data = path.read_bytes()
        self.o = 0
        if self.data[:4] != b'PMX ':
            raise ValueError(f'{path} is not a PMX file')
        self.o = 8
        header_size = self.data[self.o]
        self.o += 1
        header = list(self.data[self.o:self.o + header_size])
        self.o += header_size
        self.encoding = header[0]
        self.add_uv = header[1]
        self.vertex_index_size = header[2]
        self.texture_index_size = header[3]
        self.material_index_size = header[4]
        self.bone_index_size = header[5]
        self.morph_index_size = header[6]
        self.rigid_index_size = header[7]

    def read(self, fmt: str):
        value = struct.unpack_from(fmt, self.data, self.o)
        self.o += struct.calcsize(fmt)
        return value[0] if len(value) == 1 else value

    def text(self) -> str:
        n = self.read('<i')
        value = decode_pmx_text(self.data[self.o:self.o + n], self.encoding)
        self.o += n
        return value

    def idx(self, size: int, signed: bool = True) -> int:
        fmt = {1: 'b', 2: 'h', 4: 'i'}[size] if signed else {1: 'B', 2: 'H', 4: 'I'}[size]
        return self.read('<' + fmt)

    def floats(self, n: int):
        values = struct.unpack_from('<' + 'f' * n, self.data, self.o)
        self.o += 4 * n
        return values

    def skip_vertices(self):
        model_names = [self.text() for _ in range(4)]
        vertex_count = self.read('<i')
        for _ in range(vertex_count):
            self.o += 3 * 4 + 3 * 4 + 2 * 4 + self.add_uv * 4 * 4
            deform_type = self.read('<B')
            if deform_type == 0:
                self.o += self.bone_index_size
            elif deform_type == 1:
                self.o += self.bone_index_size * 2 + 4
            elif deform_type == 2:
                self.o += self.bone_index_size * 4 + 4 * 4
            elif deform_type == 3:
                self.o += self.bone_index_size * 2 + 4 + 3 * 4 * 3
            elif deform_type == 4:
                self.o += self.bone_index_size * 4 + 4 * 4
            else:
                raise ValueError(f'unsupported PMX deform type {deform_type}')
            self.o += 4
        return model_names, vertex_count

    def skip_materials(self):
        model_names, vertex_count = self.skip_vertices()
        index_count = self.read('<i')
        self.o += index_count * self.vertex_index_size
        texture_count = self.read('<i')
        textures = [self.text() for _ in range(texture_count)]
        material_count = self.read('<i')
        materials = []
        for _ in range(material_count):
            name = self.text()
            _english_name = self.text()
            self.o += 4 * 4 + 3 * 4 + 4 + 3 * 4 + 1 + 4 * 4 + 4
            self.o += self.texture_index_size
            self.o += self.texture_index_size
            self.o += 1
            toon_flag = self.read('<B')
            self.o += self.texture_index_size if toon_flag == 0 else 1
            _memo = self.text()
            self.o += 4
            materials.append(name)
        return model_names, vertex_count, textures, materials

    def parse(self):
        model_names, vertex_count, textures, materials = self.skip_materials()
        bone_count = self.read('<i')
        bones = []
        for _ in range(bone_count):
            name = self.text()
            _english_name = self.text()
            self.o += 3 * 4
            self.o += self.bone_index_size
            self.o += 4
            flags = self.read('<H')
            if flags & 0x0001:
                self.o += self.bone_index_size
            else:
                self.o += 3 * 4
            if flags & (0x0100 | 0x0200):
                self.o += self.bone_index_size + 4
            if flags & 0x0400:
                self.o += 3 * 4
            if flags & 0x0800:
                self.o += 3 * 4 * 2
            if flags & 0x2000:
                self.o += 4
            if flags & 0x0020:
                self.o += self.bone_index_size + 4 + 4
                link_count = self.read('<i')
                for _ in range(link_count):
                    self.o += self.bone_index_size
                    has_limit = self.read('<B')
                    if has_limit:
                        self.o += 3 * 4 * 2
            bones.append(name)

        morph_count = self.read('<i')
        morphs = []
        for _ in range(morph_count):
            name = self.text()
            _english_name = self.text()
            self.o += 1
            morph_type = self.read('<B')
            offset_count = self.read('<i')
            morphs.append(name)
            for _ in range(offset_count):
                if morph_type == 0:
                    self.o += self.morph_index_size + 4
                elif morph_type == 1:
                    self.o += self.vertex_index_size + 3 * 4
                elif morph_type == 2:
                    self.o += self.bone_index_size + 3 * 4 + 4 * 4
                elif 3 <= morph_type <= 7:
                    self.o += self.vertex_index_size + 4 * 4
                elif morph_type == 8:
                    self.o += self.material_index_size + 1 + 4 * 4 + 3 * 4 + 4 + 3 * 4 + 4 * 4 + 4 + 4 * 4 + 4 * 4 + 4 * 4
                elif morph_type == 9:
                    self.o += self.morph_index_size + 4
                elif morph_type == 10:
                    self.o += self.rigid_index_size + 1 + 3 * 4 + 3 * 4
                else:
                    raise ValueError(f'unsupported PMX morph type {morph_type} for {name}')
        return {
            'modelNames': model_names,
            'vertexCount': vertex_count,
            'textureCount': len(textures),
            'materialCount': len(materials),
            'boneCount': len(bones),
            'morphCount': len(morphs),
            'textures': textures,
            'materials': materials,
            'bones': bones,
            'morphs': morphs,
        }


def sjis_text(raw: bytes) -> str:
    return raw.rstrip(b'\x00').decode('cp932', 'replace')


def parse_vmd(path: pathlib.Path):
    data = path.read_bytes()
    if data[:30].rstrip(b'\x00') != b'Vocaloid Motion Data 0002':
        raise ValueError(f'{path} is not a VMD 0002 file')
    off = 50
    bone_count = struct.unpack_from('<I', data, off)[0]
    off += 4
    bones = []
    for _ in range(bone_count):
        bones.append(sjis_text(data[off:off + 15]))
        off += 15 + 4 + 12 + 16 + 64
    morph_count = struct.unpack_from('<I', data, off)[0]
    off += 4
    morphs = []
    for _ in range(morph_count):
        morphs.append(sjis_text(data[off:off + 15]))
        off += 15 + 4 + 4
    return {
        'boneFrameCount': bone_count,
        'morphFrameCount': morph_count,
        'bones': sorted(set(bones)),
        'morphs': sorted(set(morphs)),
    }


def main():
    models = json.loads(MODEL_MANIFEST.read_text(encoding='utf-8'))['characters']
    motions = json.loads(VMD_MANIFEST.read_text(encoding='utf-8'))['motions']
    required_motion_ids = {'breath', 'idle', 'wave', 'jump', 'peek', 'shotenTime', 'goodTea', 'lovermaxHipSway'}
    fail = []
    report = []
    for model in models:
        rel_model = model['modelPath'].lstrip('/')
        pmx_path = ROOT / 'public' / rel_model if rel_model.startswith('models/') else ROOT / rel_model
        if not pmx_path.exists():
            fail.append(f"missing model {model['id']}: {pmx_path}")
            continue
        info = PMXReader(pmx_path).parse()
        bone_set = set(info['bones'])
        morph_set = set(info['morphs'])
        model_report = {
            'characterId': model['id'],
            'label': model['label'],
            'modelPath': model['modelPath'],
            'boneCount': info['boneCount'],
            'morphCount': info['morphCount'],
            'motions': [],
        }
        for motion in motions:
            if motion.get('id') not in required_motion_ids:
                continue
            vmd_path = ROOT / 'public' / motion['path'].lstrip('/')
            if not vmd_path.exists():
                fail.append(f"missing VMD {motion['id']}: {vmd_path}")
                continue
            vmd = parse_vmd(vmd_path)
            missing_bones = sorted(set(vmd['bones']) - bone_set)
            missing_morphs = sorted(set(vmd['morphs']) - morph_set)
            ok = not missing_bones and not missing_morphs
            if not ok:
                fail.append(f"{model['id']} incompatible with {motion['id']}: missing bones={missing_bones}, morphs={missing_morphs}")
            model_report['motions'].append({
                'id': motion['id'],
                'path': motion['path'],
                'boneFrameCount': vmd['boneFrameCount'],
                'morphFrameCount': vmd['morphFrameCount'],
                'requiredBones': len(vmd['bones']),
                'requiredMorphs': len(vmd['morphs']),
                'missingBones': missing_bones,
                'missingMorphs': missing_morphs,
                'compatibleByName': ok,
            })
        report.append(model_report)

    if fail:
        print('FAIL character/action compatibility')
        for item in fail:
            print(' -', item)
        raise SystemExit(1)

    print(json.dumps({
        'status': 'PASS',
        'note': 'PMX/VMD compatibility was checked by exact bone and morph names. This verifies loadability and naming compatibility; visual clipping still requires browser preview.',
        'characters': report,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
