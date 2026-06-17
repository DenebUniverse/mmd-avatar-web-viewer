#!/usr/bin/env python3
from __future__ import annotations
import pathlib, struct, json, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / 'public/models/hiying_pmx'
PMX = MODEL_DIR / '星穹铁道—绯英2.pmx'
REQUIRED = ['颜.png','髪.png','衣.png','衣N.png','bq.png','黑.jpg','电子宠物蛋.png','toon3.png','toon4.png','颜赤.tga']

class PMXReader:
    def __init__(self, path):
        self.data = pathlib.Path(path).read_bytes(); self.o = 0
        if self.data[:4] != b'PMX ': raise SystemExit('FAIL: not a PMX file')
        self.o = 8
        h = self.data[self.o]; self.o += 1
        hdr = list(self.data[self.o:self.o+h]); self.o += h
        self.encoding = hdr[0]; self.add_uv = hdr[1]
        self.vi_size, self.tex_i_size, self.mat_i_size, self.bone_i_size, self.morph_i_size, self.rigid_i_size = hdr[2:8]
    def read(self, fmt):
        v = struct.unpack_from(fmt, self.data, self.o)
        self.o += struct.calcsize(fmt)
        return v[0] if len(v)==1 else v
    def text(self):
        n = self.read('<i'); b = self.data[self.o:self.o+n]; self.o += n
        return b.decode('utf-16-le' if self.encoding==0 else 'utf-8', 'replace')
    def idx(self, size, signed=True):
        fmt = {1:'b',2:'h',4:'i'}[size] if signed else {1:'B',2:'H',4:'I'}[size]
        return self.read('<'+fmt)
    def floats(self,n):
        v=struct.unpack_from('<'+'f'*n,self.data,self.o); self.o+=4*n; return v
    def parse_materials(self):
        names=[self.text() for _ in range(4)]
        vc=self.read('<i')
        for _ in range(vc):
            self.o += 3*4 + 3*4 + 2*4 + self.add_uv*4*4
            dt=self.read('<B')
            if dt==0: self.o += self.bone_i_size
            elif dt==1: self.o += self.bone_i_size*2 + 4
            elif dt==2: self.o += self.bone_i_size*4 + 4*4
            elif dt==3: self.o += self.bone_i_size*2 + 4 + 3*4*3
            elif dt==4: self.o += self.bone_i_size*4 + 4*4
            else: raise SystemExit(f'FAIL: unsupported deform {dt}')
            self.o += 4
        ic=self.read('<i'); self.o += ic*self.vi_size
        tc=self.read('<i'); textures=[self.text() for _ in range(tc)]
        mc=self.read('<i'); mats=[]
        for i in range(mc):
            m={}
            m['name']=self.text(); m['englishName']=self.text()
            m['diffuse']=self.floats(4); self.o += 3*4 + 4 # specular + strength
            self.o += 3*4 # ambient
            self.o += 1 + 4*4 + 4 # flags edgeColor edgeSize
            m['textureIndex']=self.idx(self.tex_i_size); m['sphereTextureIndex']=self.idx(self.tex_i_size); m['sphereMode']=self.read('<B')
            toon=self.read('<B')
            if toon==0: self.o += self.tex_i_size
            else: self.o += 1
            m['memo']=self.text(); m['surfaceCount']=self.read('<i')
            m['texture']=textures[m['textureIndex']] if 0 <= m['textureIndex'] < len(textures) else None
            mats.append(m)
        return names, textures, mats

def main():
    failures=[]
    if not PMX.exists(): failures.append(f'missing official PMX: {PMX}')
    for name in REQUIRED:
        if not (MODEL_DIR/name).exists(): failures.append(f'missing texture: {name}')
    if failures:
        print('FAIL official package')
        for f in failures: print(' -', f)
        raise SystemExit(1)

    names, textures, mats = PMXReader(PMX).parse_materials()
    if len(mats) != 49: failures.append(f'expected 49 PMX materials, got {len(mats)}')
    mat_names=[m['name'] for m in mats]
    for must in ['顏','髪','上衣','裙','biaoq','電子寵物蛋表情1']:
        if must not in mat_names: failures.append(f'missing material {must}')
    if failures:
        print('FAIL official PMX structure')
        for f in failures: print(' -', f)
        raise SystemExit(1)

    neutral_skips = [m['name'] for m in mats if m['name']=='biaoq' or m['name'].endswith('+') or m['diffuse'][3] <= 0.001]
    print(json.dumps({
        'status':'PASS',
        'modelNames': names[:2],
        'textures': textures,
        'materialCount': len(mats),
        'neutralRuntimeSkips': neutral_skips,
    }, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
