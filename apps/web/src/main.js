import './styles/style.css';
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
    modelPath: '/assets/models/hiying_pmx/星穹铁道—绯英2.pmx',
    modelUrl: '/assets/models/hiying_pmx/星穹铁道—绯英2.pmx',
    origin: 'fallback',
  },
  {
    id: 'qianyeBlade',
    label: '千冶·刃（含环）',
    modelPath: '/assets/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx',
    modelUrl: '/assets/models/qianye_blade_pmx/星穹铁道—千冶·刃2.pmx',
    origin: 'fallback',
  },
];

const FALLBACK_MOTIONS = [
  { id: 'breath', label: '呼吸', path: '/assets/motions/generated/breath_hiying_compatible.vmd', faceFromVmd: false, lipFromVmd: false, origin: 'fallback' },
  { id: 'idle', label: 'Idle', path: '/assets/motions/generated/builtin_idle.vmd', origin: 'fallback' },
  { id: 'wave', label: '挥手', path: '/assets/motions/generated/builtin_wave.vmd', origin: 'fallback' },
  { id: 'jump', label: '跳', path: '/assets/motions/generated/builtin_jump.vmd', origin: 'fallback' },
  { id: 'peek', label: '凑近看', path: '/assets/motions/generated/builtin_peek.vmd', origin: 'fallback' },
  { id: 'shotenTime', label: '昇天time', path: '/assets/motions/external/shoten_time_mihoyo_yujie.vmd', faceFromVmd: true, lipFromVmd: true, origin: 'fallback' },
  { id: 'goodTea', label: '好茶摇一摇', path: '/assets/motions/external/good_tea_shake_mihoyo_yujie.vmd', faceFromVmd: true, lipFromVmd: true, origin: 'fallback' },
  { id: 'lovermaxHipSway', label: 'lovermax 腰振り', path: '/assets/motions/external/lovermax_tiktok_hip_sway_mihoyo_compatible.vmd', faceFromVmd: true, lipFromVmd: true, origin: 'fallback' },
];

const FALLBACK_POSES = [
  { id: 'defaultStand', label: '默认站姿', path: '/assets/poses/generated/default_stand.vpd', origin: 'fallback' },
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
  let value = path.startsWith('/') || path.startsWith('./') ? path : `/${path}`;
  value = value.replace(/^\/models\//, '/assets/models/');
  value = value.replace(/^\/motions\//, '/assets/motions/');
  value = value.replace(/^\/poses\//, '/assets/poses/');
  return value;
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
  const candidates = ['/generated/assets-registry.json', '/generated/resource_manifest.json'];
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
  diagnostics.warnings.push('未找到 generated assets registry，已使用内置最小资源列表。');
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
let bindBoneState = null; // 模型加载时缓存的各骨骼 bind 局部变换（过渡目标）
let boneTransition = null; // 动作切换时的 1s 骨骼复位过渡
let motionLoadSeq = 0; // 动作载入代号，用于丢弃过期/被中断的切换
let frontendFaceEnabled = params.get('face') !== 'vmd';
let frontendLipEnabled = params.get('lip') !== 'vmd';

let voiceOutputMode = 'none'; // 'none' | 'machine'
const SpeechRecognitionImpl = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : undefined;
let recognition = null; // 当前 SpeechRecognition 实例
let micRecording = false; // 是否正在录音
let micBaseText = ''; // 开始录音那一刻输入框已有的文本

let lipSource = 'none'; // 'none' | 'user' | 'character' —— 口型驱动来源
let micLipRafId = null; // 麦克风口型 rAF id
let micLipStream = null; // 麦克风口型 MediaStream
let micLipAudioCtx = null; // 麦克风口型 AudioContext

// 句级 TTS 队列：流式朗读助手输出，按句号/换行分句、排队连读。
const ttsQueue = [];
let ttsSpeaking = false;
let ttsPendingBuffer = '';
let ttsFedThisRun = false; // 本轮 run 是否已流式喂入过 delta

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
  // 缓存 bind（rest/T-pose）局部变换，作为动作切换 1s 过渡的目标姿势。
  // 此时模型刚加载、尚未播放任何 VMD，骨骼即处于干净 rest pose。
  bindBoneState = mesh.skeleton.bones.map((b) => (
    b?.position && b?.quaternion
      ? { position: b.position.clone(), quaternion: b.quaternion.clone() }
      : null
  ));
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

// 捕获当前所有骨骼的局部变换，作为过渡起点/采样结果。
function captureBoneState() {
  if (!mesh?.skeleton) return [];
  return mesh.skeleton.bones.map((b) => (
    b?.position && b?.quaternion
      ? { position: b.position.clone(), quaternion: b.quaternion.clone() }
      : null
  ));
}

// 把骨骼瞬间贴到 bind（rest/T-pose）。
function applyBindPose() {
  applyPose(bindBoneState);
}

// 把骨骼瞬间贴到给定姿势。
function applyPose(pose) {
  if (!mesh?.skeleton || !Array.isArray(pose)) return;
  const bonesArr = mesh.skeleton.bones;
  for (let i = 0; i < bonesArr.length; i += 1) {
    const b = pose[i];
    if (!b) continue;
    bonesArr[i].position.copy(b.position);
    bonesArr[i].quaternion.copy(b.quaternion);
  }
  mesh.skeleton.update?.();
}

// 采样某个 AnimationClip 在 timeSec 时刻的骨骼姿势（会移动 skeleton，调用方需自行恢复）。
function sampleClipPose(animation, timeSec = 0) {
  if (!mesh?.skeleton) return [];
  // 骨骼缺少局部变换（如测试桩）时无法采样，回退为空（调用方会跳过过渡）。
  if (!mesh.skeleton.bones.some((b) => b?.position && b?.quaternion)) return [];
  let pose = [];
  try {
    const mixer = new THREE.AnimationMixer(mesh);
    const action = mixer.clipAction(animation);
    action.play();
    mixer.update(Math.max(0, timeSec));
    mesh.skeleton.update?.();
    pose = captureBoneState();
    action.stop();
    mixer.stopAllAction();
    mixer.uncacheRoot(mesh);
  } catch (err) {
    diagnostics.warnings.push(`动作首帧采样失败：${err?.message || err}`);
    return [];
  }
  return pose;
}

// 通用 1s 骨骼平滑过渡：从当前姿势插值到 toPose，完成后回调。
function startPoseTransition(toPose, durationSec, onDone) {
  if (!mesh?.skeleton || !Array.isArray(toPose) || !toPose.some(Boolean)) {
    onDone?.();
    return;
  }
  boneTransition = {
    from: captureBoneState(),
    to: toPose,
    elapsed: 0,
    duration: Math.max(0.001, durationSec),
    onDone: onDone || null,
  };
}

// 在 animate 循环中推进骨骼过渡（仅过渡期、未注册动画时生效）。
function updateBoneTransition(delta) {
  if (!boneTransition || !mesh?.skeleton) return;
  boneTransition.elapsed += delta;
  const t = clamp01(boneTransition.elapsed / boneTransition.duration);
  const ease = t * t * (3 - 2 * t); // smoothstep
  const bonesArr = mesh.skeleton.bones;
  for (let i = 0; i < bonesArr.length; i += 1) {
    const from = boneTransition.from[i];
    const to = boneTransition.to[i];
    if (!from || !to) continue;
    bonesArr[i].position.lerpVectors(from.position, to.position, ease);
    bonesArr[i].quaternion.copy(from.quaternion).slerp(to.quaternion, ease);
  }
  mesh.skeleton.update?.();
  if (t >= 1) {
    const done = boneTransition.onDone;
    boneTransition = null;
    done?.();
  }
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

  // 载入代号：rapid 连点或被中断的 fetch 不能让旧回调污染最新状态（最后一次点击为准）。
  const loadSeq = (motionLoadSeq += 1);
  const isStale = () => loadSeq !== motionLoadSeq;

  // 关键：先停掉旧动画并捕获“当前姿势”，再把骨骼瞬间贴回 bind 姿势，然后才构建 clip。
  // 因为 MMDLoader 构建位置轨道时以“构建时刻骨骼的 position”为基准（basePosition + delta）；
  // 若在上一个动作的弯腿姿势下构建，弯曲量会被烘进新 clip 并逐次累积（腿越来越斜）。
  removeRegisteredMeshFromHelper();
  if (mesh.morphTargetInfluences) mesh.morphTargetInfluences.fill(0);
  mouthTarget = 0;
  mouthValue = 0;
  boneTransition = null;
  const startPose = captureBoneState(); // 旧动作的当前姿势（过渡起点）
  applyBindPose(); // 贴到 bind，保证 clip 基准干净

  loader.loadAnimation(
    url,
    mesh,
    (animation) => {
      if (isStale()) return; // 已有更新的切换请求，丢弃本次
      // 此刻骨骼处于 bind，clip 已基于干净基准构建完成。
      // 采样新动作第 0 帧作为过渡目标；采样会移动骨骼，采完恢复到 bind。
      const motionStartPose = sampleClipPose(animation, 0);
      applyBindPose();

      const playMotion = () => {
        if (isStale()) return; // 过渡期间又有新切换，放弃播放本动作
        mmdHelper.add(mesh, { animation, physics: false });
        mmdMeshRegistered = true;
        currentMotionUrl = url;
        diagnostics.currentMotionUrl = url;
        diagnostics.motionEvents.push({ type: 'load-ok', url, time: Date.now() });
        frontendFaceEnabled = !faceFromVmd;
        frontendLipEnabled = !lipFromVmd;
        setStatus(`VMD 已播放：${motionLabel(url)}。物理暂未启用，当前由 MMDAnimationHelper 驱动骨骼与 morph。`);
      };

      // 阶段 A：1s 从旧姿势自然过渡到 bind（初始状态）。
      // 阶段 B：1s 从 bind 自然过渡到新动作第 0 帧。
      // 完成后注册并播放新动作。
      applyPose(startPose); // 先恢复到旧动作姿势作为阶段 A 起点
      startPoseTransition(bindBoneState, 1.0, () => {
        if (isStale()) return;
        startPoseTransition(motionStartPose, 1.0, playMotion);
      });
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
      boneTransition = null; // 取消可能进行中的动作过渡，避免其 onDone 覆盖姿态
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
    boneTransition = null; // 新模型加载，丢弃旧 mesh 的过渡
    bindBoneState = null;
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
  if (micLipRafId !== null) return; // 已开启，避免重复 rAF 泄漏
  frontendLipEnabled = true;
  setStatus('正在请求麦克风权限…');
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    micLipStream = stream;
    setStatus('麦克风口型已开启。');
    const audioCtx = new AudioContext();
    micLipAudioCtx = audioCtx;
    const src = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      mouthTarget = clamp01((avg - 8) / 70);
      micLipRafId = requestAnimationFrame(tick);
    };
    micLipRafId = requestAnimationFrame(tick);
  }).catch((e) => alert(`麦克风开启失败：${e.message}`));
}

function stopMicLip() {
  if (micLipRafId !== null) {
    cancelAnimationFrame(micLipRafId);
    micLipRafId = null;
  }
  if (micLipStream) {
    for (const track of micLipStream.getTracks()) track.stop();
    micLipStream = null;
  }
  if (micLipAudioCtx) {
    micLipAudioCtx.close?.();
    micLipAudioCtx = null;
  }
  mouthTarget = 0;
}

function clearSpeakingTimer() {
  if (speakingTimer !== null) window.clearInterval(speakingTimer);
  speakingTimer = null;
}

function stopBrowserSpeak() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  ttsQueue.length = 0;
  ttsPendingBuffer = '';
  ttsSpeaking = false;
  clearSpeakingTimer();
  mouthTarget = 0;
}

// 朗读前清洗助手文本：去掉 Markdown / 代码块 / 多余空白，截断超长内容。
function sanitizeForSpeech(text, maxChars = 1000) {
  let value = String(text || '');
  value = value.replace(/```[\s\S]*?```/g, ' '); // 代码块整段
  value = value.replace(/`([^`]*)`/g, '$1'); // 行内代码
  value = value.replace(/!\[[^\]]*\]\([^)]*\)/g, ' '); // 图片
  value = value.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'); // 链接保留文字
  value = value.replace(/^\s{0,3}#{1,6}\s+/gm, ''); // 标题
  value = value.replace(/^\s{0,3}>\s?/gm, ''); // 引用
  value = value.replace(/^\s*[-*+]\s+/gm, ''); // 列表符号
  value = value.replace(/[*_~]/g, ''); // 强调符号
  value = value.replace(/\s+/g, ' ').trim();
  if (value.length > maxChars) value = value.slice(0, maxChars);
  return value;
}

// 口型驱动：朗读期间持续运行随机张合 timer；队列空时复位。
function ensureSpeakingTimer() {
  if (speakingTimer !== null) return;
  frontendLipEnabled = true;
  speakingTimer = window.setInterval(() => {
    mouthTarget = 0.2 + Math.random() * 0.70;
  }, 90);
}

// 把一句文本入队；未在朗读则立即开始。
function enqueueSpeech(text) {
  const clean = sanitizeForSpeech(text);
  if (!clean) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  ttsQueue.push(clean);
  if (!ttsSpeaking) drainTtsQueue();
}

function drainTtsQueue() {
  const synth = window.speechSynthesis;
  if (!ttsQueue.length) {
    ttsSpeaking = false;
    clearSpeakingTimer();
    mouthTarget = 0;
    return;
  }
  ttsSpeaking = true;
  ensureSpeakingTimer();
  const text = ttsQueue.shift();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 1.0;
  utterance.pitch = 1.05;
  utterance.onend = () => drainTtsQueue();
  utterance.onerror = () => drainTtsQueue();
  synth.speak(utterance);
}

// 流式喂入 delta：累积到完整句（句末标点/换行）就逐句入队，残句留 buffer。
function feedStreamingTts(textDelta) {
  ttsFedThisRun = true;
  ttsPendingBuffer += textDelta || '';
  const sentenceRe = /[^。！？!?\n]*[。！？!?\n]/g;
  let match;
  let lastIndex = 0;
  while ((match = sentenceRe.exec(ttsPendingBuffer)) !== null) {
    enqueueSpeech(match[0]);
    lastIndex = sentenceRe.lastIndex;
  }
  if (lastIndex > 0) ttsPendingBuffer = ttsPendingBuffer.slice(lastIndex);
}

// run 结束：把 buffer 里剩余尾句朗读掉。
function flushStreamingTts() {
  if (ttsPendingBuffer.trim()) enqueueSpeech(ttsPendingBuffer);
  ttsPendingBuffer = '';
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (boneTransition) {
    updateBoneTransition(delta);
  } else if (mesh && mmdMeshRegistered) {
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
const chatPanel = requireEl('#chatPanel');
const openChatPanelBtn = requireEl('#openChatPanelBtn');
const collapseChatBtn = requireEl('#collapseChatBtn');
const chatBackBtn = requireEl('#chatBackBtn');
const chatInput = requireEl('#chatInput');
const chatSendBtn = requireEl('#chatSendBtn');
const chatStopBtn = requireEl('#chatStopBtn');
const chatMicBtn = optionalEl('#chatMicBtn');
const chatModeBtn = requireEl('#chatModeBtn');
const chatNewSessionBtn = optionalEl('#chatNewSessionBtn');
const chatSessionList = optionalEl('#chatSessionList');
const chatMessageList = optionalEl('#chatMessageList');
const chatThreadTitle = optionalEl('#chatThreadTitle');
const chatStatusText = optionalEl('#chatStatusText');
const characterSelect = requireEl('#characterSelect');

const AGENT_API_PREFIX = '/api/v1';
const chatState = {
  config: null,
  sessions: [],
  activeSession: null,
  messages: [],
  eventSource: null,
  running: false,
  runId: null,
  streamingMessage: null,
  runStartedAt: null,
  runStatusMessage: '',
  runRetryCount: 0,
  runStatusTimer: null,
  pendingUserMessageId: null,
  permissionMode: 'auto',
  online: false,
  manageMode: false,
  selectedSessionIds: new Set(),
  deleteMode: 'soft', // 'soft' | 'hard'
  showDeleted: false,
};

const PERMISSION_CYCLE = ['plan', 'auto', 'acceptEdits', 'dontAsk'];

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

function setChatPanelCollapsed(collapsed) {
  document.body.classList.toggle('chat-collapsed', collapsed);
  collapseChatBtn.textContent = collapsed ? '‹' : '›';
  collapseChatBtn.setAttribute('aria-expanded', String(!collapsed));
  openChatPanelBtn.setAttribute('aria-expanded', String(!collapsed));
  openChatPanelBtn.style.display = collapsed && !obsMode ? 'block' : '';
  setTimeout(() => {
    resize();
    fitCamera();
  }, 240);
}

function setChatView(view) {
  chatPanel.dataset.view = view === 'messages' ? 'messages' : 'sessions';
}

function getChatView() {
  return chatPanel.dataset.view === 'messages' ? 'messages' : 'sessions';
}

async function agentRequest(path, options = {}) {
  const response = await fetch(`${AGENT_API_PREFIX}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return undefined;
  return response.json();
}

function setChatStatus(text, online = chatState.online) {
  if (chatStatusText) chatStatusText.textContent = text;
  chatState.online = online;
  updateChatControls();
}

function beginRunStatus(message) {
  chatState.runStartedAt = Date.now();
  chatState.runStatusMessage = message || 'Claude Code 正在工作';
  chatState.runRetryCount = 0;
  if (chatState.runStatusTimer) clearInterval(chatState.runStatusTimer);
  chatState.runStatusTimer = setInterval(updateRunStatusDisplay, 1000);
  updateRunStatusDisplay();
}

function updateRunStatusDisplay() {
  if (!chatStatusText || !chatState.running || !chatState.runStartedAt) return;
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - chatState.runStartedAt) / 1000));
  const parts = [chatState.runStatusMessage || 'Claude Code 正在工作'];
  if (chatState.runRetryCount > 0) parts.push(`重试 ${chatState.runRetryCount} 次`);
  parts.push(`已等待 ${formatDuration(elapsedSeconds)}`);
  chatStatusText.textContent = parts.join(' · ');
}

function stopRunStatus(text, online = true) {
  if (chatState.runStatusTimer) clearInterval(chatState.runStatusTimer);
  chatState.runStatusTimer = null;
  chatState.runStartedAt = null;
  chatState.runStatusMessage = '';
  chatState.runRetryCount = 0;
  setChatStatus(text, online);
}

function updateChatControls() {
  const canSend = chatState.online && !chatState.running && Boolean(chatInput.value.trim());
  chatInput.disabled = !chatState.online || chatState.running;
  chatSendBtn.disabled = !canSend;
  chatModeBtn.disabled = !chatState.online || chatState.running;
  chatStopBtn.disabled = !chatState.running;
  chatStopBtn.classList.toggle('visually-hidden', !chatState.running);
  chatSendBtn.classList.toggle('visually-hidden', chatState.running);
}

async function initAgentChat() {
  if (obsMode) return;
  chatInput.disabled = true;
  chatSendBtn.disabled = true;
  setChatStatus('连接中', false);

  try {
    const [runtimeConfig, health, sessions] = await Promise.all([
      agentRequest('/config/public'),
      agentRequest('/health').catch((error) => ({ error: error.message })),
      agentRequest('/sessions'),
    ]);
    if (!runtimeConfig?.apiVersion || !Array.isArray(sessions)) {
      throw new Error('Agent server response is not compatible.');
    }
    chatState.config = runtimeConfig;
    chatState.permissionMode = runtimeConfig.defaultPermissionMode || 'auto';
    chatModeBtn.textContent = permissionLabel(chatState.permissionMode);
    chatState.sessions = sessions;
    renderChatSessions();
    setChatStatus(health?.claudeAvailable ? 'Claude 就绪' : 'Claude 未就绪', true);
  } catch (error) {
    setChatStatus('本地服务未连接', false);
    diagnostics.warnings.push(`Agent server unavailable: ${error?.message || error}`);
  }
}

async function refreshAgentSessions() {
  if (!chatState.online) return;
  const query = chatState.showDeleted ? '?includeDeleted=1' : '';
  chatState.sessions = await agentRequest(`/sessions${query}`);
  renderChatSessions();
}

async function createAgentSession({ select = true } = {}) {
  const session = await agentRequest('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      characterId: currentCharacterId,
      actorId: 'actor_main',
      permissionMode: chatState.permissionMode,
    }),
  });
  await refreshAgentSessions();
  if (select) {
    chatState.activeSession = session;
    chatState.messages = session.messages || [];
    renderChatMessages();
    connectAgentEvents(session.id);
    setChatView('messages');
  }
  return session;
}

async function selectAgentSession(sessionId, options = {}) {
  const session = await agentRequest(`/sessions/${encodeURIComponent(sessionId)}`);
  chatState.activeSession = session;
  chatState.messages = session.messages || [];
  chatState.streamingMessage = null;
  chatState.pendingUserMessageId = null;
  connectAgentEvents(session.id);
  renderChatSessions();
  renderChatMessages();
  if (!options.keepListView) setChatView('messages');
}

function connectAgentEvents(sessionId) {
  if (typeof EventSource === 'undefined') return;
  chatState.eventSource?.close();
  const source = new EventSource(`${AGENT_API_PREFIX}/events?sessionId=${encodeURIComponent(sessionId)}`);
  chatState.eventSource = source;
  source.onerror = () => {
    setChatStatus('流式连接异常', chatState.online);
  };

  for (const eventName of [
    'message.created',
    'agent.run.started',
    'message.delta',
    'message.replace',
    'tool.started',
    'tool.input.delta',
    'tool.finished',
    'agent.status',
    'message.completed',
    'agent.run.completed',
    'agent.run.failed',
    'agent.run.cancelled',
  ]) {
    source.addEventListener(eventName, (event) => {
      try {
        handleAgentEvent(JSON.parse(event.data));
      } catch (error) {
        diagnostics.warnings.push(`Agent event parse failed: ${error?.message || error}`);
      }
    });
  }
}

function handleAgentEvent(event) {
  const payload = event.payload || {};
  if (event.type === 'message.created' && payload.message) {
    upsertChatMessage(payload.message);
  } else if (event.type === 'agent.run.started') {
    chatState.running = true;
    chatState.runId = payload.runId;
    chatState.streamingMessage = {
      id: `streaming-${payload.runId}`,
      role: 'assistant',
      text: '',
      createdAt: new Date().toISOString(),
      status: 'streaming',
      toolCalls: [],
    };
    if (voiceOutputMode === 'machine') stopBrowserSpeak(); // 开新一轮前清掉上一轮残留朗读
    ttsFedThisRun = false;
    beginRunStatus('Claude Code 正在工作');
  } else if (event.type === 'message.delta') {
    ensureStreamingMessage(payload.messageId);
    chatState.streamingMessage.text += payload.text || '';
    if (voiceOutputMode === 'machine') feedStreamingTts(payload.text || '');
  } else if (event.type === 'message.replace') {
    ensureStreamingMessage(payload.messageId);
    chatState.streamingMessage.text = payload.text || '';
  } else if (event.type === 'tool.started') {
    ensureStreamingMessage();
    chatState.streamingMessage.toolCalls = upsertToolCall(chatState.streamingMessage.toolCalls || [], payload.tool);
  } else if (event.type === 'tool.input.delta') {
    ensureStreamingMessage();
    chatState.streamingMessage.toolCalls = (chatState.streamingMessage.toolCalls || []).map((tool) =>
      tool.id === payload.toolId ? { ...tool, inputText: `${tool.inputText || ''}${payload.partialJson || ''}` } : tool,
    );
  } else if (event.type === 'tool.finished') {
    ensureStreamingMessage();
    chatState.streamingMessage.toolCalls = (chatState.streamingMessage.toolCalls || []).map((tool) =>
      tool.id === payload.toolId
        ? { ...tool, result: payload.result, isError: payload.isError, status: payload.isError ? 'error' : 'completed' }
        : tool,
    );
  } else if (event.type === 'agent.status') {
    chatState.runStatusMessage = payload.phase === 'api_retry'
      ? `Claude Code: api_retry${payload.message ? ` (${payload.message})` : ''}`
      : payload.message || '运行中';
    chatState.runRetryCount = Math.max(chatState.runRetryCount, Number(payload.retryCount) || 0);
    updateRunStatusDisplay();
  } else if (event.type === 'agent.run.completed') {
    finishAgentRun(payload.session, payload.message, '完成');
  } else if (event.type === 'agent.run.failed') {
    finishAgentRun(payload.session, payload.message, payload.error || '运行失败');
  } else if (event.type === 'agent.run.cancelled') {
    finishAgentRun(payload.session, payload.message, '已停止');
  }
  renderChatMessages();
  updateChatControls();
}

function ensureStreamingMessage(messageId) {
  if (chatState.streamingMessage) {
    if (messageId) chatState.streamingMessage.id = messageId;
    return;
  }
  chatState.streamingMessage = {
    id: messageId || `streaming-${Date.now()}`,
    role: 'assistant',
    text: '',
    createdAt: new Date().toISOString(),
    status: 'streaming',
    toolCalls: [],
  };
}

function finishAgentRun(session, message, statusText) {
  chatState.running = false;
  chatState.runId = null;
  chatState.streamingMessage = null;
  chatState.pendingUserMessageId = null;
  if (session) {
    chatState.activeSession = session;
    chatState.messages = session.messages || [];
  } else if (message) {
    upsertChatMessage(message);
  }
  stopRunStatus(statusText, true);
  if (voiceOutputMode === 'machine' && statusText === '完成') {
    if (ttsFedThisRun) {
      flushStreamingTts(); // 流式路径：把残余尾句读完
    } else {
      // 兜底：本轮没有 delta（非流式回退），用全量文本朗读
      const speech = sanitizeForSpeech(pickAssistantText(session, message));
      if (speech) enqueueSpeech(speech);
    }
  }
  void refreshAgentSessions();
}

// 取一轮 run 完成后的助手文本：优先用回传 message，否则取最后一条非流式 assistant 消息。
function pickAssistantText(session, message) {
  if (message?.role === 'assistant' && message.text) return message.text;
  if (message?.text && message.role !== 'user') return message.text;
  const messages = session?.messages || chatState.messages || [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (item.role === 'assistant' && item.status !== 'streaming' && item.text) return item.text;
  }
  return '';
}

function upsertChatMessage(message) {
  if (message.role === 'user' && message.clientMessageId) {
    const pendingIndex = chatState.messages.findIndex((item) => item.clientMessageId === message.clientMessageId);
    if (pendingIndex !== -1) {
      chatState.messages[pendingIndex] = { ...chatState.messages[pendingIndex], ...message };
      chatState.pendingUserMessageId = null;
      return;
    }
  }
  const index = chatState.messages.findIndex((item) => item.id === message.id);
  if (index === -1) chatState.messages.push(message);
  else chatState.messages[index] = { ...chatState.messages[index], ...message };
}

function upsertToolCall(tools, incoming) {
  if (!incoming) return tools;
  const index = tools.findIndex((tool) => tool.id === incoming.id);
  if (index === -1) return [...tools, incoming];
  return tools.map((tool, toolIndex) => (toolIndex === index ? { ...tool, ...incoming } : tool));
}

async function sendAgentPrompt() {
  const text = chatInput.value.trim();
  if (!text || chatState.running) return;
  if (micRecording) stopMic();
  const shouldCreateSession = getChatView() !== 'messages' || !chatState.activeSession;
  const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const localMessage = {
    id: `local-${Date.now()}`,
    clientMessageId,
    role: 'user',
    text,
    createdAt: new Date().toISOString(),
    status: 'completed',
  };

  chatInput.value = '';
  if (shouldCreateSession) {
    chatState.eventSource?.close();
    chatState.eventSource = null;
    chatState.activeSession = null;
    chatState.messages = [];
  }
  chatState.messages.push(localMessage);
  chatState.pendingUserMessageId = localMessage.id;
  chatState.running = true;
  chatState.streamingMessage = {
    id: `streaming-${Date.now()}`,
    role: 'assistant',
    text: '',
    createdAt: new Date().toISOString(),
    status: 'streaming',
    toolCalls: [],
  };
  setChatView('messages');
  beginRunStatus(shouldCreateSession ? '创建会话' : '发送中');
  renderChatMessages();
  updateChatControls();

  try {
    if (shouldCreateSession) {
      const pendingMessages = [...chatState.messages];
      const pendingStreamingMessage = chatState.streamingMessage;
      await createAgentSession({ select: true });
      chatState.messages = pendingMessages;
      chatState.streamingMessage = pendingStreamingMessage;
      renderChatMessages();
    }
    chatState.runStatusMessage = '发送中';
    updateRunStatusDisplay();

    const result = await agentRequest(`/sessions/${encodeURIComponent(chatState.activeSession.id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: text,
        clientMessageId,
        characterId: currentCharacterId,
        actorId: 'actor_main',
        permissionMode: chatState.permissionMode,
      }),
    });
    chatState.runId = result.runId;
    chatState.runStatusMessage = 'Claude Code 正在工作';
    updateRunStatusDisplay();
  } catch (error) {
    chatState.running = false;
    chatState.streamingMessage = null;
    chatState.pendingUserMessageId = null;
    stopRunStatus(error?.message || '发送失败', chatState.online);
    renderChatMessages();
    updateChatControls();
  }
}

async function cancelAgentRun() {
  if (!chatState.runId) return;
  stopBrowserSpeak();
  try {
    await agentRequest(`/runs/${encodeURIComponent(chatState.runId)}/cancel`, { method: 'POST' });
    setChatStatus('正在停止', true);
  } catch (error) {
    setChatStatus(error?.message || '停止失败', true);
  }
}

function toggleMic() {
  if (!SpeechRecognitionImpl) return;
  if (micRecording) stopMic();
  else startMic();
}

function startMic() {
  if (!SpeechRecognitionImpl || micRecording) return;
  try {
    recognition = new SpeechRecognitionImpl();
  } catch (error) {
    setChatStatus(`语音输入初始化失败：${error?.message || error}`, chatState.online);
    return;
  }
  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = true;
  micBaseText = chatInput.value ? `${chatInput.value} ` : '';

  recognition.onresult = (event) => {
    let finalText = '';
    let interim = '';
    for (let i = 0; i < event.results.length; i += 1) {
      const seg = event.results[i];
      if (seg.isFinal) finalText += seg[0].transcript;
      else interim += seg[0].transcript;
    }
    chatInput.value = `${micBaseText}${finalText}${interim}`.trimStart();
    updateChatControls();
  };
  recognition.onerror = () => stopMic();
  recognition.onend = () => stopMic();

  try {
    recognition.start();
  } catch (error) {
    setChatStatus(`语音输入开启失败：${error?.message || error}`, chatState.online);
    recognition = null;
    return;
  }
  micRecording = true;
  chatMicBtn?.classList.add('recording');
  chatMicBtn?.setAttribute('aria-pressed', 'true');
}

function stopMic() {
  micRecording = false;
  chatMicBtn?.classList.remove('recording');
  chatMicBtn?.setAttribute('aria-pressed', 'false');
  if (recognition) {
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    try {
      recognition.stop();
    } catch {
      /* noop */
    }
    recognition = null;
  }
}

function renderChatSessions() {
  if (!chatSessionList) return;
  clearElement(chatSessionList);
  if (!chatState.sessions.length) {
    const text = document.createElement('div');
    text.className = 'chat-empty-text';
    text.textContent = chatState.online ? '还没有任务。发送第一条消息会创建会话。' : '本地 Agent 服务未连接。';
    chatSessionList.appendChild(text);
    return;
  }
  for (const session of chatState.sessions) {
    const manage = chatState.manageMode;
    const item = document.createElement('div');
    const selected = chatState.selectedSessionIds.has(session.id);
    item.className = `chat-session-item${chatState.activeSession?.id === session.id ? ' active' : ''}${session.deleted ? ' deleted' : ''}${selected ? ' selected' : ''}`;

    if (manage) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'chat-session-check';
      checkbox.checked = selected;
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) chatState.selectedSessionIds.add(session.id);
        else chatState.selectedSessionIds.delete(session.id);
        renderChatSessions();
      });
      item.appendChild(checkbox);
    }

    const name = document.createElement('span');
    name.className = 'chat-session-name';
    name.textContent = `${session.deleted ? '🗑 ' : ''}${session.title || '新会话'}`;
    const time = document.createElement('span');
    time.className = 'chat-session-time';
    time.textContent = session.running ? '运行中' : formatShortTime(session.updatedAt);
    item.appendChild(name);
    item.appendChild(time);

    if (manage && session.deleted) {
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'chat-session-restore';
      restore.textContent = '恢复';
      restore.addEventListener('click', (event) => {
        event.stopPropagation();
        void restoreSession(session.id);
      });
      item.appendChild(restore);
    }

    item.addEventListener('click', () => {
      if (chatState.manageMode) {
        if (chatState.selectedSessionIds.has(session.id)) chatState.selectedSessionIds.delete(session.id);
        else chatState.selectedSessionIds.add(session.id);
        renderChatSessions();
      } else if (!session.deleted) {
        void selectAgentSession(session.id);
      }
    });
    chatSessionList.appendChild(item);
  }
}

function renderChatMessages() {
  if (!chatMessageList) return;
  clearElement(chatMessageList);
  if (chatThreadTitle) chatThreadTitle.textContent = chatState.activeSession?.title || '新任务';
  const visible = [...chatState.messages, ...(chatState.streamingMessage ? [chatState.streamingMessage] : [])];
  if (!visible.length) {
    const text = document.createElement('div');
    text.className = 'chat-empty-text';
    text.textContent = '向 Claude Code 发送任务，输出和工具调用会显示在这里。';
    chatMessageList.appendChild(text);
    return;
  }
  for (const message of visible) {
    appendMessageBubble(chatMessageList, message);
  }
  chatMessageList.scrollTop = chatMessageList.scrollHeight || 0;
}

function appendMessageBubble(container, message) {
  const bubble = document.createElement('article');
  bubble.className = `chat-bubble ${message.role}${message.status === 'error' ? ' error' : ''}`;
  const text = message.error || message.text || (message.status === 'streaming' ? '...' : '');
  for (const paragraph of splitParagraphs(text)) {
    const p = document.createElement('p');
    p.textContent = paragraph;
    bubble.appendChild(p);
  }
  if (message.toolCalls?.length) {
    for (const tool of message.toolCalls) bubble.appendChild(renderToolCard(tool));
  }
  container.appendChild(bubble);

  if (message.role === 'user') {
    const meta = document.createElement('div');
    meta.className = 'chat-message-meta';
    meta.textContent = formatShortTime(message.createdAt);
    container.appendChild(meta);
  } else if (message.status === 'streaming') {
    const status = document.createElement('div');
    status.className = 'chat-run-status';
    status.textContent = '运行中';
    container.appendChild(status);
  }
}

function renderToolCard(tool) {
  const card = document.createElement('div');
  card.className = 'chat-tool-card';
  const title = document.createElement('strong');
  title.textContent = `${tool.name || 'tool'} · ${tool.status || 'running'}`;
  card.appendChild(title);
  const input = tool.inputText || (tool.input === undefined ? '' : JSON.stringify(tool.input, null, 2));
  if (input) {
    const pre = document.createElement('pre');
    pre.textContent = input;
    card.appendChild(pre);
  }
  if (tool.result) {
    const pre = document.createElement('pre');
    pre.textContent = tool.result;
    card.appendChild(pre);
  }
  return card;
}

function clearElement(el) {
  if (typeof el.replaceChildren === 'function') el.replaceChildren();
  else el.innerHTML = '';
}

function splitParagraphs(text) {
  const parts = String(text || '').split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return parts.length ? parts : [''];
}

function formatShortTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, '0')}s`;
}

function permissionLabel(mode) {
  const labels = {
    plan: '只规划⌄',
    acceptEdits: '自动编辑⌄',
    auto: '自动判断⌄',
    dontAsk: '拒绝提权⌄',
    bypassPermissions: '跳过权限⌄',
  };
  return labels[mode] || `${mode}⌄`;
}

// 点击权限按钮循环切换四档（plan → auto → acceptEdits → dontAsk）。
function cyclePermissionMode() {
  if (!chatState.online || chatState.running) return;
  const idx = PERMISSION_CYCLE.indexOf(chatState.permissionMode);
  const next = PERMISSION_CYCLE[(idx + 1) % PERMISSION_CYCLE.length];
  chatState.permissionMode = next;
  chatModeBtn.textContent = permissionLabel(next);
  if (chatState.activeSession) {
    void agentRequest(`/sessions/${encodeURIComponent(chatState.activeSession.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ permissionMode: next }),
    }).catch(() => {});
  }
}

// ---- 会话批量管理 ----
function setManageMode(on) {
  chatState.manageMode = on;
  if (!on) chatState.selectedSessionIds.clear();
  const bar = optionalEl('#chatManageBar');
  if (bar) bar.classList.toggle('visually-hidden', !on);
  renderChatSessions();
}

function toggleManageMode() {
  setManageMode(!chatState.manageMode);
}

function toggleDeleteMode() {
  chatState.deleteMode = chatState.deleteMode === 'soft' ? 'hard' : 'soft';
  const btn = optionalEl('#chatManageMode');
  if (btn) btn.textContent = chatState.deleteMode === 'soft' ? '软删除' : '完全删除';
}

function toggleSelectAllSessions() {
  const all = chatState.sessions;
  if (chatState.selectedSessionIds.size === all.length) {
    chatState.selectedSessionIds.clear();
  } else {
    chatState.selectedSessionIds = new Set(all.map((s) => s.id));
  }
  renderChatSessions();
}

async function renameSelectedSession() {
  const ids = [...chatState.selectedSessionIds];
  if (ids.length !== 1) {
    setChatStatus('请只选择一个会话来重命名。', chatState.online);
    return;
  }
  const session = chatState.sessions.find((s) => s.id === ids[0]);
  const title = window.prompt('重命名会话：', session?.title || '');
  if (title === null) return;
  const trimmed = title.trim();
  if (!trimmed) return;
  try {
    await agentRequest(`/sessions/${encodeURIComponent(ids[0])}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: trimmed }),
    });
    await refreshAgentSessions();
  } catch (error) {
    setChatStatus(error?.message || '重命名失败', chatState.online);
  }
}

async function deleteSelectedSessions() {
  const ids = [...chatState.selectedSessionIds];
  if (!ids.length) {
    setChatStatus('请先勾选要删除的会话。', chatState.online);
    return;
  }
  const hard = chatState.deleteMode === 'hard';
  const confirmText = hard
    ? `完全删除 ${ids.length} 个会话（不可恢复）？`
    : `软删除 ${ids.length} 个会话（可在“显示已删除”中恢复）？`;
  if (!window.confirm(confirmText)) return;
  try {
    for (const id of ids) {
      if (hard) {
        await agentRequest(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } else {
        await agentRequest(`/sessions/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ deleted: true }),
        });
      }
    }
    chatState.selectedSessionIds.clear();
    await refreshAgentSessions();
  } catch (error) {
    setChatStatus(error?.message || '删除失败', chatState.online);
  }
}

async function restoreSession(id) {
  try {
    await agentRequest(`/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ deleted: false }),
    });
    await refreshAgentSessions();
  } catch (error) {
    setChatStatus(error?.message || '恢复失败', chatState.online);
  }
}

function loadMotionById(id, options = {}) {
  const meta = VMD_MOTION_META[id];
  const url = VMD_MOTIONS[id];
  if (!url) {
    setStatus(`未找到 VMD 动作：${id}`);
    return;
  }
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
  loadPose(url);
}

function bindUi() {
  bindClick('#hideBtn', () => setPanelCollapsed(true), false);
  bindClick('#collapseBtn', () => setPanelCollapsed(!document.body.classList.contains('panel-collapsed')));
  bindClick('#openPanelBtn', () => setPanelCollapsed(false));
  bindClick('#collapseChatBtn', () => setChatPanelCollapsed(!document.body.classList.contains('chat-collapsed')));
  bindClick('#openChatPanelBtn', () => setChatPanelCollapsed(false));
  bindClick('#chatBackBtn', () => setChatView('sessions'));
  bindClick('#chatSendBtn', () => void sendAgentPrompt());
  bindClick('#chatStopBtn', () => void cancelAgentRun());
  if (chatMicBtn) {
    if (SpeechRecognitionImpl) {
      chatMicBtn.addEventListener('click', toggleMic);
      chatMicBtn.setAttribute('aria-pressed', 'false');
    } else {
      chatMicBtn.disabled = true;
      chatMicBtn.title = '当前浏览器不支持语音输入';
    }
  }
  const voiceSelect = optionalEl('#voiceSelect');
  if (voiceSelect) {
    voiceOutputMode = voiceSelect.value === 'machine' ? 'machine' : 'none';
    voiceSelect.addEventListener('change', () => {
      voiceOutputMode = voiceSelect.value === 'machine' ? 'machine' : 'none';
      if (voiceOutputMode === 'none') stopBrowserSpeak();
      else setStatus('语音输出：机器（助手输出边生成边朗读）。');
    });
  }
  const lipSourceSelect = optionalEl('#lipSourceSelect');
  if (lipSourceSelect) {
    lipSource = lipSourceSelect.value || 'none';
    lipSourceSelect.addEventListener('change', () => {
      lipSource = lipSourceSelect.value || 'none';
      if (lipSource === 'user') {
        startMicLipSync(); // 麦克风音量驱动口型
        setStatus('口型来源：用户（麦克风声音驱动）。');
      } else if (lipSource === 'character') {
        stopMicLip();
        frontendLipEnabled = true; // 由 ChatPanel TTS 的 mouthTarget 驱动
        setStatus('口型来源：角色（ChatPanel 输出 TTS 驱动）。');
      } else {
        stopMicLip();
        frontendLipEnabled = false; // 保留 VMD 口型
        mouthTarget = 0;
        setStatus('口型来源：无（保留 VMD 口型）。');
      }
    });
  }
  bindClick('#chatNewSessionBtn', () => void createAgentSession({ select: true }), false);
  bindClick('#chatModeBtn', cyclePermissionMode);
  bindClick('#chatManageBtn', toggleManageMode, false);
  bindClick('#chatManageDone', () => setManageMode(false), false);
  bindClick('#chatManageSelectAll', toggleSelectAllSessions, false);
  bindClick('#chatManageRename', () => void renameSelectedSession(), false);
  bindClick('#chatManageDelete', () => void deleteSelectedSessions(), false);
  bindClick('#chatManageMode', toggleDeleteMode, false);
  const showDeleted = optionalEl('#chatShowDeleted');
  if (showDeleted) {
    showDeleted.addEventListener('change', () => {
      chatState.showDeleted = showDeleted.checked;
      void refreshAgentSessions();
    });
  }
  chatInput.addEventListener('input', updateChatControls);
  chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendAgentPrompt();
    }
  });
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
  bindClick('#poseBtn', () => loadPoseById(defaultPoseId));
  bindClick('#neutralBtn', () => setEmotion('neutral'));
  bindClick('#happyBtn', () => setEmotion('happy'));
  bindClick('#tsundereBtn', () => setEmotion('tsundere'));
  bindClick('#troubledBtn', () => setEmotion('troubled'));
  bindClick('#faceModeBtn', () => {
    frontendFaceEnabled = !frontendFaceEnabled;
    setStatus(`表情控制：${frontendFaceEnabled ? '前端按钮覆盖 VMD 表情' : '保留 VMD 表情'}`);
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

  for (const item of document.querySelectorAll('[data-chat-session]')) {
    item.addEventListener('click', () => setChatView('messages'));
  }

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
    openChatPanelBtn.style.display = 'none';
    chatPanel.style.display = 'none';
    statusEl.style.display = 'none';
    document.body.classList.add('obs-mode');
    document.body.classList.add('panel-collapsed');
    document.body.classList.add('chat-collapsed');
  }

  bindUi();
  void initAgentChat();
  await loadResourceManifest();
  populateCharacterSelect();

  const modelUrl = resolveInitialModelUrl();
  loadModel(modelUrl, { characterId: getCharacterByModelUrl(modelUrl)?.id || currentCharacterId });
  resize();
  window.__mmdAvatarViewerBooted = true;
  window.__mmdAvatarViewerFrontendReady = true;
}

bootstrap().catch((err) => reportRuntimeError('启动失败', err));
