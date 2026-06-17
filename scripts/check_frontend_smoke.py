#!/usr/bin/env python3
from __future__ import annotations
import json
import pathlib
import shutil
import subprocess
import tempfile
import textwrap

ROOT = pathlib.Path(__file__).resolve().parents[1]
NODE = shutil.which('node')
if not NODE:
    print('SKIP: node not found; frontend smoke test requires node')
    raise SystemExit(0)

fake_three = r'''
export const SRGBColorSpace = 'srgb';
export class Vector3 { constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); } set(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; return this; } }
export class WebGLRenderer { constructor(opts = {}) { this.domElement = opts.canvas; } setPixelRatio() {} setSize(w, h) { if (this.domElement) { this.domElement.width = w; this.domElement.height = h; } } setClearColor() {} render() {} }
export class Scene { constructor(){ this.children = []; } add(o){ this.children.push(o); } remove(o){ this.children = this.children.filter(x => x !== o); } }
export class PerspectiveCamera { constructor(fov, aspect, near, far) { this.fov = fov; this.aspect = aspect; this.near = near; this.far = far; this.position = new Vector3(); } lookAt() {} updateProjectionMatrix() {} }
export class AmbientLight { constructor(){ this.position = new Vector3(); } }
export class DirectionalLight { constructor(){ this.position = new Vector3(); } }
export class Clock { constructor(){ this.elapsedTime = 0; } getDelta(){ this.elapsedTime += 0.016; return 0.016; } }
export class Box3 { constructor(){ this.min = new Vector3(-4, 0, -1); this.max = new Vector3(4, 20, 1); } setFromObject(){ return this; } getSize(v){ return v.set(this.max.x - this.min.x, this.max.y - this.min.y, this.max.z - this.min.z); } getCenter(v){ return v.set((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2, (this.min.z + this.max.z) / 2); } }
export const MathUtils = { degToRad: (d) => d * Math.PI / 180, lerp: (a,b,t) => a + (b-a)*t };
'''

fake_mmd_loader = r'''
import { Vector3 } from 'three';
function bone(name) { return { name, rotation: { x:0, y:0, z:0, set(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; return this; } } }; }
function material(name, opacity = 1) { return { name, opacity, visible: true, transparent: false, depthWrite: true, alphaTest: 0, map: { colorSpace: null }, needsUpdate: false }; }
export class MMDLoader { load(url, onLoad) { const names = ['センター','グルーブ','左腕','右腕','左ひじ','右ひじ','左手首','右手首','上半身','上半身2','首','頭','左ひざ','右ひざ']; const morphs = ['笑い','喜び','怒り','困る','まばたき','あ','い','う','え','お']; const mesh = { name: '', material: [material('顏'), material('biaoq'), material('裙+'), material('電子寵物蛋表情2', 0)], skeleton: { bones: names.map(bone) }, morphTargetDictionary: Object.fromEntries(morphs.map((m, i) => [m, i])), morphTargetInfluences: new Array(morphs.length).fill(0), position: new Vector3(), rotation: { x:0, y:0, z:0, set(x=0,y=0,z=0){ this.x=x; this.y=y; this.z=z; return this; } }, castShadow: false, receiveShadow: false, traverse(fn) { fn({ geometry: { dispose(){} } }); }, updateMatrixWorld() {} }; setTimeout(() => onLoad(mesh), 10); } loadAnimation(url, mesh, onLoad, onProgress, onError) { if (url.includes('/motions/external/')) { setTimeout(() => onError?.(new Error('mock missing external VMD')), 5); return; } setTimeout(() => onLoad({ name: url, tracks: [] }), 5); } loadVPD(url, isUnicode, onLoad) { setTimeout(() => onLoad({ metadata: { url } }), 5); } }
'''


fake_mmd_helper = r'''
export class MMDAnimationHelper { constructor(){ this.objects = []; this.updateCount = 0; this.poseCount = 0; } add(obj, params){ this.objects.push({ obj, params }); globalThis.__mmdHelperAdded = (globalThis.__mmdHelperAdded || 0) + 1; } remove(obj){ this.objects = this.objects.filter(x => x.obj !== obj); globalThis.__mmdHelperRemoved = (globalThis.__mmdHelperRemoved || 0) + 1; } update(delta){ this.updateCount += 1; globalThis.__mmdHelperUpdated = (globalThis.__mmdHelperUpdated || 0) + 1; } pose(mesh, vpd, params){ this.poseCount += 1; globalThis.__mmdHelperPose = { vpd, params }; }
}
'''

fake_controls = r'''
import { Vector3 } from 'three';
export class OrbitControls { constructor(camera, domElement) { this.camera = camera; this.domElement = domElement; this.target = new Vector3(); this.enabled = true; this.enableDamping = false; } update() {} }
'''

runner = r'''
class FakeClassList {
  constructor() { this.s = new Set(); }
  toggle(name, force) { if (force === undefined ? !this.s.has(name) : force) this.s.add(name); else this.s.delete(name); }
  add(name) { this.s.add(name); }
  contains(name) { return this.s.has(name); }
}
class FakeEl {
  constructor(id) { this.id = id; this.textContent = ''; this.value = ''; this.style = {}; this.listeners = {}; this.children = []; this.width = 0; this.height = 0; this.classList = new FakeClassList(); }
  appendChild(child) { this.children.push(child); if (!this.value && child.value) this.value = child.value; return child; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  click() { this.listeners.click?.({ type: 'click' }); }
  setAttribute(k, v) { this[k] = v; }
  getBoundingClientRect() { return this.id === 'stage' ? { width: 1500, height: 900 } : { width: 420, height: 900 }; }
}
const ids = ['app','sidebar','panel','collapseBtn','openPanelBtn','stage','avatar','status','characterSelect','motionSelect','poseSelect','playSelectedMotionBtn','reloadManifestBtn','applySelectedPoseBtn','breathBtn','idleBtn','neutralBtn','happyBtn','tsundereBtn','troubledBtn','faceModeBtn','lipModeBtn','jumpBtn','waveBtn','peekBtn','eyedartBtn','breathOriginalBtn','shotenTimeBtn','goodTeaBtn','lovermaxBtn','poseBtn','resetBtn','frameBtn','speakBtn','micBtn','textBox'];
const els = Object.fromEntries(ids.map(id => [id, new FakeEl(id)]));
els.status.textContent = '初始化中…';
els.textBox.value = '测试文本';
globalThis.window = globalThis;
globalThis.document = { body: new FakeEl('body'), querySelector(sel) { return sel.startsWith('#') ? (els[sel.slice(1)] || null) : null; }, createElement(tag) { return new FakeEl(tag); } };
globalThis.location = { search: '' };
globalThis.fetch = async (url) => ({ ok: true, json: async () => ({ schema: 1, defaultCharacterId: 'hiying', defaultMotionId: 'breath', characters: [{ id: 'hiying', label: '绯英', modelPath: '/models/hiying_pmx/星穹铁道—绯英2.pmx', origin: 'manifest' }, { id: 'qianyeBlade', label: '千冶·刃（含环）', modelPath: '/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx', origin: 'manifest' }], motions: [{ id: 'breath', label: '呼吸', path: '/motions/generated/breath_hiying_compatible.vmd', origin: 'manifest' }, { id: 'scannedDance', label: '自动扫描舞蹈', path: '/motions/generated/builtin_wave.vmd', origin: 'scanned' }], poses: [{ id: 'defaultStand', label: '默认站姿', path: '/poses/generated/default_stand.vpd', origin: 'manifest' }], summary: { characters: 2, motions: 2, poses: 1, scannedMotions: 1 } }) });
Object.defineProperty(globalThis, 'navigator', { value: { mediaDevices: { getUserMedia: async () => ({}) } }, configurable: true });
globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 5);
globalThis.alert = (msg) => { throw new Error(msg); };
globalThis.speechSynthesis = { cancel(){}, speak(u){ setTimeout(() => u.onend?.(), 10); } };
globalThis.SpeechSynthesisUtterance = class { constructor(text){ this.text = text; } };
globalThis.AudioContext = class {};
globalThis.addEventListener = () => {};
globalThis.console = console;
await import('./main.js');
await new Promise(r => setTimeout(r, 80));
els.collapseBtn.click();
const collapsed = document.body.classList.contains('panel-collapsed');
els.openPanelBtn.click();
const expanded = !document.body.classList.contains('panel-collapsed');
const diag = globalThis.__avatarDiagnostics || {};
const mats = new Map((diag.materials || []).map(m => [m.name, m]));
const result = {
  booted: globalThis.__mmdAvatarViewerBooted === true,
  frontendReady: globalThis.__mmdAvatarViewerFrontendReady === true,
  loaded: diag.loaded === true,
  stageSized: diag.renderSize?.width === 1500 && diag.renderSize?.height === 900,
  collapsed,
  expanded,
  biaoqHidden: mats.get('biaoq')?.visible === false,
  plusHidden: mats.get('裙+')?.visible === false,
  petExprHidden: mats.get('電子寵物蛋表情2')?.visible === false,
  helperAdded: (globalThis.__mmdHelperAdded || 0) >= 1,
  helperUpdated: (globalThis.__mmdHelperUpdated || 0) >= 1,
  currentMotionIsVmd: String(diag.currentMotionUrl || '').endsWith('breath_hiying_compatible.vmd'),
  characterDefault: diag.characterId === 'hiying',
  characterOptions: els.characterSelect.children.length >= 2,
  motionOptions: els.motionSelect.children.length >= 2,
  poseOptions: els.poseSelect.children.length >= 1,
  status: els.status.textContent
};
const pass = Object.entries(result).filter(([k]) => k !== 'status').every(([, v]) => v === true);
console.log(JSON.stringify({ pass, result }, null, 2));
process.exit(pass ? 0 : 1);
'''

with tempfile.TemporaryDirectory(prefix='hiying-node-smoke-') as td:
    t = pathlib.Path(td)
    (t / 'node_modules/three/examples/jsm/loaders').mkdir(parents=True)
    (t / 'node_modules/three/examples/jsm/controls').mkdir(parents=True)
    (t / 'node_modules/three/examples/jsm/animation').mkdir(parents=True)
    (t / 'node_modules/three/package.json').write_text(json.dumps({'type': 'module', 'exports': {'./examples/jsm/loaders/MMDLoader.js': './examples/jsm/loaders/MMDLoader.js', './examples/jsm/controls/OrbitControls.js': './examples/jsm/controls/OrbitControls.js', './examples/jsm/animation/MMDAnimationHelper.js': './examples/jsm/animation/MMDAnimationHelper.js', '.': './index.js'}}), encoding='utf-8')
    (t / 'node_modules/three/index.js').write_text(fake_three, encoding='utf-8')
    (t / 'node_modules/three/examples/jsm/loaders/MMDLoader.js').write_text(fake_mmd_loader, encoding='utf-8')
    (t / 'node_modules/three/examples/jsm/controls/OrbitControls.js').write_text(fake_controls, encoding='utf-8')
    (t / 'node_modules/three/examples/jsm/animation/MMDAnimationHelper.js').write_text(fake_mmd_helper, encoding='utf-8')
    (t / 'package.json').write_text('{"type":"module"}', encoding='utf-8')
    main = (ROOT / 'dist/main.js').read_text(encoding='utf-8')
    (t / 'main.js').write_text(main, encoding='utf-8')
    (t / 'runner.mjs').write_text(runner, encoding='utf-8')
    proc = subprocess.run([NODE, 'runner.mjs'], cwd=t, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20)
    print(proc.stdout.strip())
    if proc.returncode != 0:
        print(proc.stderr.strip())
        raise SystemExit('FAIL: frontend smoke test failed')
    print('PASS: frontend smoke test passed')
