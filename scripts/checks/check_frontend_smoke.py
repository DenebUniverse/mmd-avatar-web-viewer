#!/usr/bin/env python3
from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
NODE = shutil.which('node')
if not NODE:
    print('SKIP: node not found; frontend smoke test requires node')
    raise SystemExit(0)

main_src = ROOT / 'apps/web/src/main.js'
style_src = ROOT / 'apps/web/src/styles/style.css'

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
function material(name, opacity = 1) { return { name, opacity, visible: true, transparent: false, depthWrite: true, alphaTest: 0, map: { colorSpace: null }, needsUpdate: false }; }
export class MMDLoader { load(url, onLoad) { const morphs = ['笑い','喜び','怒り','困る','まばたき','あ','い','う','え','お']; const mesh = { name: '', material: [material('顏'), material('biaoq'), material('裙+'), material('電子寵物蛋表情2', 0)], skeleton: { bones: ['センター','頭','左腕','右腕'].map(name => ({ name })) }, morphTargetDictionary: Object.fromEntries(morphs.map((m, i) => [m, i])), morphTargetInfluences: new Array(morphs.length).fill(0), position: new Vector3(), rotation: { set(){} }, traverse(fn) { fn({ geometry: { dispose(){} } }); } }; setTimeout(() => onLoad(mesh), 5); } loadAnimation(url, mesh, onLoad) { setTimeout(() => onLoad({ name: url, tracks: [] }), 5); } loadVPD(url, isUnicode, onLoad) { setTimeout(() => onLoad({ metadata: { url } }), 5); } }
'''

fake_mmd_helper = r'''
export class MMDAnimationHelper { add(){ globalThis.__mmdHelperAdded = true; } remove(){ globalThis.__mmdHelperRemoved = true; } update(){ globalThis.__mmdHelperUpdated = true; } pose(){ globalThis.__mmdHelperPose = true; } }
'''

fake_controls = r'''
import { Vector3 } from 'three';
export class OrbitControls { constructor(){ this.target = new Vector3(); this.enabled = true; this.enableDamping = false; } update(){} }
'''

runner = r'''
class FakeClassList { constructor() { this.s = new Set(); } toggle(n, f) { if (f === undefined ? !this.s.has(n) : f) this.s.add(n); else this.s.delete(n); } add(n){ this.s.add(n); } contains(n){ return this.s.has(n); } }
class FakeEl { constructor(id) { this.id = id; this.textContent = ''; this.value = ''; this.style = {}; this.listeners = {}; this.children = []; this.dataset = {}; this.classList = new FakeClassList(); } appendChild(c){ this.children.push(c); if (!this.value && c.value) this.value = c.value; return c; } addEventListener(t, fn){ this.listeners[t] = fn; } click(){ this.listeners.click?.({ type: 'click' }); } setAttribute(k, v){ this[k] = v; } getBoundingClientRect(){ return this.id === 'stage' ? { width: 1200, height: 760 } : { width: 380, height: 760 }; } }
const ids = ['app','sidebar','panel','collapseBtn','openPanelBtn','openChatPanelBtn','stage','avatar','status','characterSelect','motionSelect','poseSelect','playSelectedMotionBtn','reloadManifestBtn','applySelectedPoseBtn','breathBtn','idleBtn','neutralBtn','happyBtn','tsundereBtn','troubledBtn','faceModeBtn','lipModeBtn','jumpBtn','waveBtn','peekBtn','eyedartBtn','breathOriginalBtn','shotenTimeBtn','goodTeaBtn','lovermaxBtn','poseBtn','resetBtn','frameBtn','speakBtn','micBtn','textBox','chatPanel','collapseChatBtn','chatBackBtn','chatInput','chatSendBtn','chatStopBtn','chatAttachBtn','chatModeBtn'];
const els = Object.fromEntries(ids.map(id => [id, new FakeEl(id)]));
const sessionItems = [new FakeEl('session1'), new FakeEl('session2')];
els.status.textContent = '初始化中…';
globalThis.window = globalThis;
globalThis.document = { body: new FakeEl('body'), querySelector(sel) { return sel.startsWith('#') ? (els[sel.slice(1)] || null) : null; }, querySelectorAll(sel) { return sel === '[data-chat-session]' ? sessionItems : []; }, createElement(tag) { return new FakeEl(tag); } };
globalThis.location = { search: '' };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ schema: 2, defaultCharacterId: 'hiying', defaultMotionId: 'breath', characters: [{ id: 'hiying', label: '绯英', modelPath: '/assets/models/hiying_pmx/星穹铁道—绯英2.pmx', origin: 'manifest' }, { id: 'qianyeBlade', label: '千冶·刃（含环）', modelPath: '/assets/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx', origin: 'manifest' }], motions: [{ id: 'breath', label: '呼吸', path: '/assets/motions/generated/breath_hiying_compatible.vmd', origin: 'manifest' }, { id: 'wave', label: '挥手', path: '/assets/motions/generated/builtin_wave.vmd', origin: 'manifest' }], poses: [{ id: 'defaultStand', label: '默认站姿', path: '/assets/poses/generated/default_stand.vpd', origin: 'manifest' }], summary: { characters: 2, motions: 2, poses: 1 } }) });
Object.defineProperty(globalThis, 'navigator', { value: { mediaDevices: { getUserMedia: async () => ({}) } }, configurable: true });
globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 5);
globalThis.speechSynthesis = { cancel(){}, speak(u){ setTimeout(() => u.onend?.(), 10); } };
globalThis.SpeechSynthesisUtterance = class { constructor(text){ this.text = text; } };
globalThis.AudioContext = class {};
globalThis.addEventListener = () => {};
await import('./main.js');
await new Promise(r => setTimeout(r, 80));
els.collapseBtn.click();
const collapsed = document.body.classList.contains('panel-collapsed');
els.openPanelBtn.click();
els.collapseChatBtn.click();
const chatCollapsed = document.body.classList.contains('chat-collapsed');
els.openChatPanelBtn.click();
sessionItems[0].click();
const messagesView = els.chatPanel.dataset.view === 'messages';
els.chatBackBtn.click();
const sessionsView = els.chatPanel.dataset.view === 'sessions';
const diag = globalThis.__avatarDiagnostics || {};
const result = {
  booted: globalThis.__mmdAvatarViewerBooted === true,
  ready: globalThis.__mmdAvatarViewerFrontendReady === true,
  loaded: diag.loaded === true,
  renderSized: diag.renderSize?.width === 1200 && diag.renderSize?.height === 760,
  characterDefault: diag.characterId === 'hiying',
  characterOptions: els.characterSelect.children.length === 2,
  motionOptions: els.motionSelect.children.length === 2,
  poseOptions: els.poseSelect.children.length === 1,
  collapsed,
  chatCollapsed,
  messagesView,
  sessionsView,
  helperAdded: globalThis.__mmdHelperAdded === true,
  helperUpdated: globalThis.__mmdHelperUpdated === true
};
const pass = Object.values(result).every(Boolean);
console.log(JSON.stringify({ pass, result }, null, 2));
process.exit(pass ? 0 : 1);
'''

with tempfile.TemporaryDirectory(prefix='agentstage-smoke-') as td:
    tmp = pathlib.Path(td)
    (tmp / 'node_modules/three/examples/jsm/loaders').mkdir(parents=True)
    (tmp / 'node_modules/three/examples/jsm/controls').mkdir(parents=True)
    (tmp / 'node_modules/three/examples/jsm/animation').mkdir(parents=True)
    (tmp / 'node_modules/three/package.json').write_text(json.dumps({'type': 'module', 'exports': {'./examples/jsm/loaders/MMDLoader.js': './examples/jsm/loaders/MMDLoader.js', './examples/jsm/controls/OrbitControls.js': './examples/jsm/controls/OrbitControls.js', './examples/jsm/animation/MMDAnimationHelper.js': './examples/jsm/animation/MMDAnimationHelper.js', '.': './index.js'}}), encoding='utf-8')
    (tmp / 'node_modules/three/index.js').write_text(fake_three, encoding='utf-8')
    (tmp / 'node_modules/three/examples/jsm/loaders/MMDLoader.js').write_text(fake_mmd_loader, encoding='utf-8')
    (tmp / 'node_modules/three/examples/jsm/controls/OrbitControls.js').write_text(fake_controls, encoding='utf-8')
    (tmp / 'node_modules/three/examples/jsm/animation/MMDAnimationHelper.js').write_text(fake_mmd_helper, encoding='utf-8')
    (tmp / 'styles').mkdir()
    main_text = main_src.read_text(encoding='utf-8').replace("import './styles/style.css';\n", '')
    (tmp / 'main.js').write_text(main_text, encoding='utf-8')
    shutil.copy2(style_src, tmp / 'styles/style.css')
    (tmp / 'package.json').write_text(json.dumps({'type': 'module'}), encoding='utf-8')
    (tmp / 'runner.mjs').write_text(runner, encoding='utf-8')
    proc = subprocess.run([NODE, 'runner.mjs'], cwd=tmp, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(proc.stdout)
    if proc.returncode != 0:
        print(proc.stderr)
        raise SystemExit(proc.returncode)
