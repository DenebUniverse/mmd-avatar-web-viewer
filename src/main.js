import './style.css';
import * as THREE from 'three';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const canvas = document.querySelector('#avatar');
const statusEl = document.querySelector('#status');
const panel = document.querySelector('#panel');
const stage = document.querySelector('#stage');
const params = new URLSearchParams(location.search);
const obsMode = params.get('obs') === '1';

const FALLBACK_CHARACTERS = [
  {
    id: 'hiying',
    label: '绯英',
    modelPath: '/models/hiying_pmx/星穹铁道—绯英2.pmx',
    modelUrl: '/models/hiying_pmx/星穹铁道—绯英2.pmx',
    origin: 'fallback',
  },
  {
    id: 'qianyeBlade',
    label: '千冶·刃（含环）',
    modelPath: '/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx',
    modelUrl: '/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx',
    origin: 'fallback',
  },
];

const FALLBACK_MOTIONS = [
  { id: 'breath', label: '呼吸', path: '/motions/generated/breath_hiying_compatible.vmd', faceFromVmd: false, lipFromVmd: false, origin: 'fallback' },
  { id: 'idle', label: 'Idle', path: '/motions/generated/builtin_idle.vmd', origin: 'fallback' },
  { id: 'wave', label: '挥手', path: '/motions/generated/builtin_wave.vmd', origin: 'fallback' },
  { id: 'jump', label: '跳', path: '/motions/generated/builtin_jump.vmd', origin: 'fallback' },
  { id: 'peek', label: '凑近看', path: '/motions/generated/builtin_peek.vmd', origin: 'fallback' },
  { id: 'shotenTime', label: '昇天time', path: '/motions/external/shoten_time_mihoyo_yujie.vmd', faceFromVmd: true, lipFromVmd: true, origin: 'fallback' },
  { id: 'goodTea', label: '好茶摇一摇', path: '/motions/external/good_tea_shake_mihoyo_yujie.vmd', faceFromVmd: true, lipFromVmd: true, origin: 'fallback' },
  { id: 'lovermaxHipSway', label: 'lovermax 腰振り', path: '/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd', faceFromVmd: true, lipFromVmd: true, origin: 'fallback' },
];

const FALLBACK_POSES = [
  { id: 'defaultStand', label: '默认站姿', path: '/poses/generated/default_stand.vpd', origin: 'fallback' },
];

let assetManifest = null;
let characterList = [...FALLBACK_CHARACTERS];
let motionList = [...FALLBACK_MOTIONS];
let poseList = [...FALLBACK_POSES];
let CHARACTER_MODELS = Object.fromEntries(characterList.map((item) => [item.id, item]));
let VMD_MOTIONS = Object.fromEntries(motionList.map((item) => [item.id, item.path]));
let VMD_MOTION_META = Object.fromEntries(motionList.map((item) => [item.id, item]));
let POSES = Object.fromEntries(poseList.map((item) => [item.id, item.path]));
let POSE_META = Object.fromEntries(poseList.map((item) => [item.id, item]));
let defaultCharacterId = 'hiying';
let defaultMotionId = 'breath';
let defaultPoseId = 'defaultStand';
let currentCharacterId = defaultCharacterId;
let currentCharacter = CHARACTER_MODELS[currentCharacterId] || characterList[0];

function firstExistingMotionId(...ids) {
  return ids.find((id) => VMD_MOTIONS[id]) || motionList[0]?.id || 'breath';
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeAssetPath(path) {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path)) return path;
  return path.startsWith('/') || path.startsWith('./') ? path : `/${path}`;
}

function normalizeCharacter(item) {
  const modelPath = normalizeAssetPath(item.modelPath || item.modelUrl || item.path);
  return {
    ...item,
    id: item.id,
    label: item.label || item.title || modelPath.split('/').pop() || item.id,
    modelPath,
    modelUrl: modelPath,
    origin: item.origin || 'manifest',
  };
}

function normalizeMotion(item) {
  const path = normalizeAssetPath(item.path || item.url);
  const label = item.label || item.title || path.split('/').pop() || item.id;
  return {
    ...item,
    id: item.id,
    label,
    title: item.title || label,
    path,
    faceFromVmd: Boolean(item.faceFromVmd),
    lipFromVmd: Boolean(item.lipFromVmd),
    origin: item.origin || 'manifest',
  };
}

function normalizePose(item) {
  const path = normalizeAssetPath(item.path || item.url);
  const label = item.label || item.title || path.split('/').pop() || item.id;
  return {
    ...item,
    id: item.id,
    label,
    title: item.title || label,
    path,
    origin: item.origin || 'manifest',
  };
}

function applyResourceManifest(manifest) {
  assetManifest = manifest || null;
  const characters = asArray(manifest?.characters).map(normalizeCharacter).filter((item) => item.id && item.modelPath);
  const motions = asArray(manifest?.motions).map(normalizeMotion).filter((item) => item.id && item.path);
  const poses = asArray(manifest?.poses).map(normalizePose).filter((item) => item.id && item.path);

  characterList = characters.length ? characters : [...FALLBACK_CHARACTERS];
  motionList = motions.length ? motions : [...FALLBACK_MOTIONS];
  poseList = poses.length ? poses : [...FALLBACK_POSES];

  defaultCharacterId = manifest?.defaultCharacterId || 'hiying';
  if (!characterList.some((item) => item.id === defaultCharacterId)) defaultCharacterId = characterList[0]?.id || 'hiying';
  defaultMotionId = manifest?.defaultMotionId || firstExistingMotionId('breath', 'idle');
  if (!motionList.some((item) => item.id === defaultMotionId)) defaultMotionId = motionList[0]?.id || 'breath';
  defaultPoseId = manifest?.defaultPoseId || poseList[0]?.id || 'defaultStand';
  if (!poseList.some((item) => item.id === defaultPoseId)) defaultPoseId = poseList[0]?.id || 'defaultStand';

  CHARACTER_MODELS = Object.fromEntries(characterList.map((item) => [item.id, item]));
  VMD_MOTIONS = Object.fromEntries(motionList.map((item) => [item.id, item.path]));
  VMD_MOTION_META = Object.fromEntries(motionList.map((item) => [item.id, item]));
  POSES = Object.fromEntries(poseList.map((item) => [item.id, item.path]));
  POSE_META = Object.fromEntries(poseList.map((item) => [item.id, item]));

  currentCharacterId = resolveInitialCharacterId();
  currentCharacter = CHARACTER_MODELS[currentCharacterId] || characterList[0];
  diagnostics.assets = manifest?.summary || { characters: characterList.length, motions: motionList.length, poses: poseList.length };
}

async function loadResourceManifest() {
  const candidates = ['./resource_manifest.json', '/resource_manifest.json'];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const manifest = await res.json();
      applyResourceManifest(manifest);
      diagnostics.resourceManifestUrl = url;
      return manifest;
    } catch (err) {
      diagnostics.warnings.push(`资源索引读取失败 ${url}: ${err?.message || err}`);
    }
  }
  applyResourceManifest(null);
  diagnostics.warnings.push('未找到 resource_manifest.json，已使用内置最小资源列表。');
  return null;
}

function resolveInitialCharacterId() {
  const requested = params.get('character') || params.get('role');
  return CHARACTER_MODELS[requested] ? requested : defaultCharacterId;
}

function resolveInitialModelUrl() {
  const explicitModel = params.get('model');
  if (explicitModel) return explicitModel;
  const id = resolveInitialCharacterId();
  return CHARACTER_MODELS[id]?.modelUrl || CHARACTER_MODELS[id]?.modelPath || characterList[0]?.modelPath;
}

let mesh = null;
let bones = new Map();
let materialsByName = new Map();
let framing = params.get('framing') === 'bust' ? 'bust' : 'full';
let emotionMode = ['happy', 'tsundere', 'troubled'].includes(params.get('emotion') || '') ? params.get('emotion') : 'neutral';
let mouthTarget = 0;
let mouthValue = 0;
let speakingTimer = null;
let currentMotionUrl = null;
let currentPoseUrl = null;
let mmdMeshRegistered = false;
let frontendFaceEnabled = params.get('face') !== 'vmd';
let frontendLipEnabled = params.get('lip') !== 'vmd';

const diagnostics = {
  mode: 'pmx-vmd-vpd-mmd-animation-helper',
  loaded: false,
  modelUrl: null,
  characterId: currentCharacterId,
  characterLabel: currentCharacter.label,
  currentMotionUrl: null,
  currentPoseUrl: null,
  materials: [],
  morphs: [],
  bones: [],
  warnings: [],
  motionEvents: [],
};
window.__avatarDiagnostics = diagnostics;
window.__mmdAvatarViewerModuleStarted = true;
window.__mmdAvatarViewerBooted = false;

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text;
  if (obsMode && mesh) statusEl.style.display = 'none';
}

function reportRuntimeError(prefix, error) {
  const message = error?.message || error?.reason?.message || error?.reason || error || '未知错误';
  console.error(prefix, error);
  diagnostics.warnings.push(String(message));
  setStatus(`${prefix}：${message}`);
}

window.addEventListener('error', (event) => {
  reportRuntimeError('前端运行错误', event?.error || event?.message || event);
});

window.addEventListener('unhandledrejection', (event) => {
  reportRuntimeError('异步加载错误', event);
});

function getRenderSize() {
  const rect = stage?.getBoundingClientRect?.();
  const width = Math.max(1, Math.floor(rect?.width || window.innerWidth || 1));
  const height = Math.max(1, Math.floor(rect?.height || window.innerHeight || 1));
  return { width, height };
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const initialSize = getRenderSize();
renderer.setSize(initialSize.width, initialSize.height, false);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(27, initialSize.width / initialSize.height, 0.1, 100);
camera.position.set(0, 13, 52);
camera.lookAt(0, 12, 0);

scene.add(new THREE.AmbientLight(0xffffff, 1.35));
const key = new THREE.DirectionalLight(0xffffff, 0.55);
key.position.set(0.8, 1.8, 2.2);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9bbcff, 0.32);
rim.position.set(-1.4, 1.2, -1.0);
scene.add(rim);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = !obsMode;
controls.target.set(0, 12, 0);
controls.enableDamping = true;

const loader = new MMDLoader();
const mmdHelper = new MMDAnimationHelper({
  afterglow: 0.0,
  resetPhysicsOnLoop: true,
});
const clock = new THREE.Clock();

function resize() {
  const { width, height } = getRenderSize();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  diagnostics.renderSize = { width, height, aspect: camera.aspect };
  fitCamera();
}
window.addEventListener('resize', resize);

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function setMorph(names, value) {
  if (!mesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
  const v = clamp01(value);
  for (const name of names) {
    const idx = mesh.morphTargetDictionary[name];
    if (idx !== undefined) mesh.morphTargetInfluences[idx] = v;
  }
}

function resetFacial() {
  setMorph(['笑い', '喜び', '怒り', '困る', 'まばたき', 'あ', 'い', 'う', 'え', 'お'], 0);
}

function setMouth(v) {
  v = clamp01(v);
  mouthValue = v;
  setMorph(['あ'], v);
  setMorph(['い'], v * 0.25);
  setMorph(['う'], v * 0.18);
  setMorph(['え'], v * 0.10);
  setMorph(['お'], v * 0.12);
}

function applyEmotion() {
  setMorph(['笑い', '喜び', '怒り', '困る'], 0);
  if (emotionMode === 'happy') {
    setMorph(['笑い'], 0.82);
    setMorph(['喜び'], 0.35);
  } else if (emotionMode === 'tsundere') {
    setMorph(['怒り'], 0.62);
    setMorph(['笑い'], 0.10);
  } else if (emotionMode === 'troubled') {
    setMorph(['困る'], 0.75);
  }
}

function setEmotion(mode) {
  frontendFaceEnabled = true;
  emotionMode = mode;
  applyEmotion();
  const label = mode === 'happy' ? '开心' : mode === 'tsundere' ? '傲娇' : mode === 'troubled' ? '困' : '默认';
  setStatus(`前端表情层：${label}。如播放带表情的 VMD，请切换“VMD 表情”。`);
}

function prepareMaterials(mmdMesh) {
  const materials = Array.isArray(mmdMesh.material) ? mmdMesh.material : [mmdMesh.material];
  materialsByName = new Map();

  for (const mat of materials) {
    if (!mat) continue;
    materialsByName.set(mat.name || '', mat);

    if (mat.map) {
      mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.transparent = true;
      mat.alphaTest = Math.max(mat.alphaTest || 0, 0.02);
    }

    const neutralHidden = mat.name === 'biaoq'
      || mat.name.endsWith('+')
      || mat.name === '電子寵物蛋表情2'
      || mat.name === '電子寵物蛋表情3'
      || mat.name === '電子寵物蛋表情4'
      || mat.name === '電子寵物蛋空白'
      || mat.opacity <= 0.001;
    if (neutralHidden) {
      mat.visible = false;
      mat.transparent = true;
      mat.opacity = 0;
      mat.depthWrite = false;
    }

    mat.needsUpdate = true;
  }

  diagnostics.materials = materials.map(m => ({
    name: m.name,
    visible: m.visible !== false,
    transparent: Boolean(m.transparent),
    opacity: m.opacity,
    hasMap: Boolean(m.map),
  }));
}

function buildBoneMap() {
  bones = new Map();
  if (!mesh?.skeleton) return;
  for (const b of mesh.skeleton.bones) bones.set(b.name, b);
  diagnostics.bones = Array.from(bones.keys());
}

function fitCamera() {
  if (!mesh) return;
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const targetY = framing === 'bust' ? box.min.y + size.y * 0.68 : center.y;
  const vertical = framing === 'bust' ? size.y * 0.50 : size.y;
  const horizontal = framing === 'bust' ? size.x * 0.72 : size.x;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distY = (vertical * 0.5) / Math.tan(fov * 0.5);
  const distX = (horizontal * 0.5) / Math.tan(fov * 0.5) / Math.max(camera.aspect, 0.1);
  const dist = Math.max(distY, distX) * (framing === 'bust' ? 1.35 : 1.18);

  camera.position.set(center.x, targetY, center.z + dist);
  camera.lookAt(center.x, targetY, center.z);
  controls.target.set(center.x, targetY, center.z);
  camera.near = 0.1;
  camera.far = dist + 200;
  camera.updateProjectionMatrix();
}

function removeRegisteredMeshFromHelper() {
  if (!mesh || !mmdMeshRegistered) return;
  try {
    mmdHelper.remove(mesh);
  } catch (err) {
    diagnostics.warnings.push(`MMDAnimationHelper.remove 失败：${err?.message || err}`);
  }
  mmdMeshRegistered = false;
}

function resolveInitialMotion() {
  const vmd = params.get('vmd');
  if (vmd) return vmd;

  const motion = params.get('motion');
  if (motion && VMD_MOTIONS[motion]) return VMD_MOTIONS[motion];

  const action = params.get('action');
  if (action && VMD_MOTIONS[action]) return VMD_MOTIONS[action];

  return VMD_MOTIONS.breath;
}

function getCharacterByModelUrl(url) {
  return Object.values(CHARACTER_MODELS).find((item) => item.modelUrl === url);
}

function syncCharacterSelect() {
  const select = optionalEl('#characterSelect');
  if (!select) return;
  if (currentCharacterId === 'custom') {
    select.value = 'custom';
    select.disabled = true;
  } else {
    select.value = currentCharacterId;
  }
}

function motionLabel(url) {
  const pair = Object.entries(VMD_MOTIONS).find(([, value]) => value === url);
  return pair ? pair[0] : url;
}

function loadMotion(url, options = {}) {
  if (!mesh) {
    setStatus('模型尚未加载，不能切换 VMD。');
    return;
  }

  const { fallbackToIdle = true, faceFromVmd = false, lipFromVmd = false } = options;
  setStatus(`正在加载 VMD：${url}`);
  diagnostics.motionEvents.push({ type: 'load-start', url, time: Date.now() });

  loader.loadAnimation(
    url,
    mesh,
    (animation) => {
      removeRegisteredMeshFromHelper();
      mmdHelper.add(mesh, {
        animation,
        physics: false,
      });
      mmdMeshRegistered = true;
      currentMotionUrl = url;
      diagnostics.currentMotionUrl = url;
      diagnostics.motionEvents.push({ type: 'load-ok', url, time: Date.now() });
      frontendFaceEnabled = !faceFromVmd;
      frontendLipEnabled = !lipFromVmd;
      setStatus(`VMD 已播放：${motionLabel(url)}。物理暂未启用，当前由 MMDAnimationHelper 驱动骨骼与 morph。`);
    },
    undefined,
    (err) => {
      const message = err?.message || err || '未知错误';
      diagnostics.warnings.push(`VMD 加载失败 ${url}: ${message}`);
      diagnostics.motionEvents.push({ type: 'load-error', url, message: String(message), time: Date.now() });
      if (fallbackToIdle && url !== VMD_MOTIONS.breath) {
        setStatus(`VMD 加载失败：${url}。已切换到标准骨骼兼容呼吸 VMD。错误：${message}`);
        loadMotion(VMD_MOTIONS.breath, { fallbackToIdle: false });
      } else {
        setStatus(`VMD 加载失败：${url}。错误：${message}`);
      }
    }
  );
}

function loadPose(url) {
  if (!mesh) {
    setStatus('模型尚未加载，不能加载 VPD。');
    return;
  }
  setStatus(`正在加载 VPD 姿态：${url}`);
  loader.loadVPD(
    url,
    false,
    (vpd) => {
      removeRegisteredMeshFromHelper();
      mmdHelper.pose(mesh, vpd, {
        resetPose: true,
        ik: true,
        grant: true,
      });
      currentPoseUrl = url;
      currentMotionUrl = null;
      diagnostics.currentPoseUrl = url;
      diagnostics.currentMotionUrl = null;
      setStatus(`VPD 姿态已应用：${url}`);
    },
    undefined,
    (err) => {
      setStatus(`VPD 加载失败：${url}。${err?.message || err}`);
    }
  );
}

function loadModel(url, options = {}) {
  const matchedCharacter = getCharacterByModelUrl(url);
  currentCharacterId = options.characterId || matchedCharacter?.id || (params.get('model') ? 'custom' : currentCharacterId);
  currentCharacter = CHARACTER_MODELS[currentCharacterId] || { id: 'custom', label: '自定义 PMX', modelUrl: url };
  diagnostics.characterId = currentCharacterId;
  diagnostics.characterLabel = currentCharacter.label;
  diagnostics.modelUrl = url;
  syncCharacterSelect();

  setStatus(`正在加载角色 PMX：${currentCharacter.label} · ${url}`);
  loader.load(url, (loadedMesh) => {
    if (mesh) {
      removeRegisteredMeshFromHelper();
      scene.remove(mesh);
      mesh.traverse?.((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
      });
    }
    mesh = loadedMesh;
    mesh.name = currentCharacter.label;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    prepareMaterials(mesh);
    buildBoneMap();

    diagnostics.loaded = true;
    diagnostics.morphs = Object.keys(mesh.morphTargetDictionary || {});
    scene.add(mesh);

    fitCamera();
    loadMotion(options.motionUrl || resolveInitialMotion(), {
      faceFromVmd: options.faceFromVmd ?? (params.get('face') === 'vmd'),
      lipFromVmd: options.lipFromVmd ?? (params.get('lip') === 'vmd'),
    });

    if (obsMode) statusEl.style.display = 'none';
  }, undefined, (err) => {
    console.error(err);
    diagnostics.loaded = false;
    diagnostics.warnings.push(String(err?.message || err));
    setStatus(`角色 PMX 加载失败：${currentCharacter.label}。${err?.message || err}`);
  });
}

function startMicLipSync() {
  frontendLipEnabled = true;
  setStatus('正在请求麦克风权限…');
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    setStatus('麦克风口型已开启。');
    const audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      mouthTarget = clamp01((avg - 8) / 70);
      requestAnimationFrame(tick);
    };
    tick();
  }).catch((e) => alert(`麦克风开启失败：${e.message}`));
}

function browserSpeak(text) {
  if (!text.trim()) return;
  frontendLipEnabled = true;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 1.0;
  utterance.pitch = 1.05;

  if (speakingTimer !== null) window.clearInterval(speakingTimer);
  speakingTimer = window.setInterval(() => {
    mouthTarget = 0.2 + Math.random() * 0.70;
  }, 90);

  utterance.onend = () => {
    if (speakingTimer !== null) window.clearInterval(speakingTimer);
    speakingTimer = null;
    mouthTarget = 0;
    setStatus('浏览器 TTS 播放结束。');
  };
  synth.cancel();
  synth.speak(utterance);
  setStatus('浏览器 TTS 播放中。');
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (mesh && mmdMeshRegistered) {
    mmdHelper.update(delta);
  }

  if (mesh && frontendFaceEnabled) {
    applyEmotion();
  }

  if (mesh && frontendLipEnabled) {
    mouthValue = THREE.MathUtils.lerp(mouthValue, mouthTarget, 0.35);
    setMouth(mouthValue);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

function requireEl(selector) {
  const el = document.querySelector(selector);
  if (!el) {
    const message = `页面缺少必要元素：${selector}。请检查 index.html 与 main.js 是否同一版本。`;
    console.error(message);
    setStatus(message);
    diagnostics.warnings.push(message);
    throw new Error(message);
  }
  return el;
}

function optionalEl(selector) {
  return document.querySelector(selector);
}

function bindClick(selector, handler, required = true) {
  const el = required ? requireEl(selector) : optionalEl(selector);
  if (el) el.addEventListener('click', handler);
  return el;
}

const sidebar = requireEl('#sidebar');
const openPanelBtn = requireEl('#openPanelBtn');
const collapseBtn = requireEl('#collapseBtn');
const characterSelect = requireEl('#characterSelect');
const motionSelect = requireEl('#motionSelect');
const poseSelect = requireEl('#poseSelect');

function clearSelect(select) {
  if (typeof select.replaceChildren === 'function') {
    select.replaceChildren();
  } else if (Array.isArray(select.children)) {
    select.children.length = 0;
  } else {
    select.innerHTML = '';
  }
  select.value = '';
}

function appendOption(select, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
  return option;
}

function populateCharacterSelect() {
  clearSelect(characterSelect);
  for (const character of characterList) {
    const originLabel = character.origin === 'scanned' ? ' · 扫描' : '';
    appendOption(characterSelect, character.id, `${character.label}${originLabel}`);
  }
  syncCharacterSelect();
}

function populateMotionSelect() {
  clearSelect(motionSelect);
  for (const motion of motionList) {
    const originLabel = motion.origin === 'scanned' ? ' · 扫描' : '';
    appendOption(motionSelect, motion.id, `${motion.label || motion.title || motion.id}${originLabel}`);
  }
  const selectedId = Object.entries(VMD_MOTIONS).find(([, path]) => path === currentMotionUrl)?.[0] || defaultMotionId;
  motionSelect.value = VMD_MOTIONS[selectedId] ? selectedId : motionList[0]?.id || '';
}

function populatePoseSelect() {
  clearSelect(poseSelect);
  for (const pose of poseList) {
    const originLabel = pose.origin === 'scanned' ? ' · 扫描' : '';
    appendOption(poseSelect, pose.id, `${pose.label || pose.title || pose.id}${originLabel}`);
  }
  poseSelect.value = POSES[defaultPoseId] ? defaultPoseId : poseList[0]?.id || '';
}

function setPanelCollapsed(collapsed) {
  document.body.classList.toggle('panel-collapsed', collapsed);
  collapseBtn.textContent = collapsed ? '›' : '‹';
  collapseBtn.setAttribute('aria-expanded', String(!collapsed));
  openPanelBtn.setAttribute('aria-expanded', String(!collapsed));
  openPanelBtn.style.display = collapsed && !obsMode ? 'block' : '';
  setTimeout(() => {
    resize();
    fitCamera();
  }, 240);
}

function loadMotionById(id, options = {}) {
  const meta = VMD_MOTION_META[id];
  const url = VMD_MOTIONS[id];
  if (!url) {
    setStatus(`未找到 VMD 动作：${id}`);
    return;
  }
  motionSelect.value = id;
  loadMotion(url, {
    faceFromVmd: options.faceFromVmd ?? meta?.faceFromVmd ?? false,
    lipFromVmd: options.lipFromVmd ?? meta?.lipFromVmd ?? false,
    fallbackToIdle: options.fallbackToIdle ?? true,
  });
}

function loadPoseById(id) {
  const url = POSES[id];
  if (!url) {
    setStatus(`未找到 VPD 姿态：${id}`);
    return;
  }
  poseSelect.value = id;
  loadPose(url);
}

async function refreshResourceManifest() {
  await loadResourceManifest();
  populateCharacterSelect();
  populateMotionSelect();
  populatePoseSelect();
  setStatus(`资源索引已读取：${characterList.length} 个角色、${motionList.length} 个 VMD、${poseList.length} 个 VPD。`);
}

function bindUi() {
  bindClick('#hideBtn', () => setPanelCollapsed(true), false);
  bindClick('#collapseBtn', () => setPanelCollapsed(!document.body.classList.contains('panel-collapsed')));
  bindClick('#openPanelBtn', () => setPanelCollapsed(false));
  bindClick('#breathBtn', () => loadMotionById(firstExistingMotionId('breath', defaultMotionId)));
  bindClick('#idleBtn', () => loadMotionById(firstExistingMotionId('idle', defaultMotionId)));
  bindClick('#jumpBtn', () => loadMotionById(firstExistingMotionId('jump', defaultMotionId)));
  bindClick('#waveBtn', () => loadMotionById(firstExistingMotionId('wave', defaultMotionId)));
  bindClick('#peekBtn', () => loadMotionById(firstExistingMotionId('peek', defaultMotionId)));
  bindClick('#eyedartBtn', () => loadMotionById(firstExistingMotionId('eyedartBreath', defaultMotionId)));
  bindClick('#shotenTimeBtn', () => loadMotionById(firstExistingMotionId('shotenTime', defaultMotionId), { faceFromVmd: true, lipFromVmd: true }));
  bindClick('#goodTeaBtn', () => loadMotionById(firstExistingMotionId('goodTea', defaultMotionId), { faceFromVmd: true, lipFromVmd: true }));
  bindClick('#lovermaxBtn', () => loadMotionById(firstExistingMotionId('lovermaxHipSway', defaultMotionId), { faceFromVmd: true, lipFromVmd: true }));
  bindClick('#breathOriginalBtn', () => loadMotionById(firstExistingMotionId('breathMultistageOriginal', 'breathConversationOriginal', defaultMotionId)));
  bindClick('#playSelectedMotionBtn', () => loadMotionById(motionSelect.value || defaultMotionId));
  bindClick('#reloadManifestBtn', refreshResourceManifest);
  bindClick('#applySelectedPoseBtn', () => loadPoseById(poseSelect.value || defaultPoseId));
  bindClick('#poseBtn', () => loadPoseById(defaultPoseId));
  bindClick('#neutralBtn', () => setEmotion('neutral'));
  bindClick('#happyBtn', () => setEmotion('happy'));
  bindClick('#tsundereBtn', () => setEmotion('tsundere'));
  bindClick('#troubledBtn', () => setEmotion('troubled'));
  bindClick('#faceModeBtn', () => {
    frontendFaceEnabled = !frontendFaceEnabled;
    setStatus(`表情控制：${frontendFaceEnabled ? '前端按钮覆盖 VMD 表情' : '保留 VMD 表情'}`);
  });
  bindClick('#lipModeBtn', () => {
    frontendLipEnabled = !frontendLipEnabled;
    mouthTarget = 0;
    setStatus(`口型控制：${frontendLipEnabled ? '前端/TTS/麦克风覆盖 VMD 口型' : '保留 VMD 口型'}`);
  });
  bindClick('#resetBtn', () => {
    resetFacial();
    loadMotionById(firstExistingMotionId('breath', defaultMotionId));
    fitCamera();
    setStatus('已重置：切换到默认 VMD 动作。');
  });
  bindClick('#frameBtn', () => {
    framing = framing === 'full' ? 'bust' : 'full';
    fitCamera();
    setStatus(`镜头：${framing === 'full' ? '全身' : '半身'}`);
  });
  bindClick('#speakBtn', () => {
    browserSpeak(requireEl('#textBox').value);
  });
  bindClick('#micBtn', startMicLipSync);

  characterSelect.addEventListener('change', () => {
    const next = CHARACTER_MODELS[characterSelect.value] || CHARACTER_MODELS[defaultCharacterId] || characterList[0];
    if (!next) return;
    resetFacial();
    loadModel(next.modelUrl || next.modelPath, {
      characterId: next.id,
      motionUrl: currentMotionUrl || VMD_MOTIONS[defaultMotionId] || motionList[0]?.path,
      faceFromVmd: !frontendFaceEnabled,
      lipFromVmd: !frontendLipEnabled,
    });
  });
}

async function bootstrap() {
  if (obsMode) {
    panel.style.display = 'none';
    sidebar.style.display = 'none';
    openPanelBtn.style.display = 'none';
    statusEl.style.display = 'none';
    document.body.classList.add('obs-mode');
    document.body.classList.add('panel-collapsed');
  }

  bindUi();
  await loadResourceManifest();
  populateCharacterSelect();
  populateMotionSelect();
  populatePoseSelect();

  const modelUrl = resolveInitialModelUrl();
  loadModel(modelUrl, { characterId: getCharacterByModelUrl(modelUrl)?.id || currentCharacterId });
  resize();
  window.__mmdAvatarViewerBooted = true;
  window.__mmdAvatarViewerFrontendReady = true;
}

bootstrap().catch((err) => reportRuntimeError('启动失败', err));
