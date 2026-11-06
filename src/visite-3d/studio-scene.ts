import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CUT_RANGE } from './cut-range';
import type { ZoneId } from './zones';

// La maquette 3D du studio, en three.js impératif, hors de React.
//
// Portée depuis le plan autonome livré par Théo (index.html + machines.glb) :
// murs, mobilier, cuisine et cabines sont générés ici ; seules les quatre
// machines StyleShoots viennent d'un fichier, les modèles constructeur.
//
// Le module ne touche jamais au DOM hors du conteneur qu'on lui donne, ne
// connaît aucune langue et ne porte aucun libellé : les noms de zones, le format
// des longueurs et les couleurs lui sont passés. C'est ce qui permet de
// l'importer dynamiquement côté client, le rendu serveur n'en voyant rien —
// WebGL n'existe pas sous Node.

export type StudioView = '3d' | 'plan';
export type MeasureStep = 'off' | 'first' | 'second';

export interface StudioSceneOptions {
  /** Le conteneur, dimensionné par la page : la scène en prend toute la place. */
  stage: HTMLElement;
  zones: readonly {
    id: ZoneId;
    pos: readonly [number, number];
    label: string;
    movable?: boolean;
  }[];
  modelUrl: string;
  formatMeters: (m: number) => string;
  colors: { background: string; ink: string; accent: string };
  onZoneSelect: (id: ZoneId) => void;
  onMeasureStep: (step: MeasureStep) => void;
  onError: (error: unknown) => void;
}

export interface StudioScene {
  setView: (view: StudioView) => number;
  setFreeStage: (on: boolean) => void;
  setMeasuring: (on: boolean) => void;
  clearMeasures: () => void;
  setCut: (height: number) => void;
  setActiveZone: (id: ZoneId) => void;
  dispose: () => void;
}

// Contour intérieur relevé sur le scan Polycam (m). Mur extérieur droit continu,
// sans décroché derrière le cyclo et la Live.
const W = {
  L: -6.1,
  R: 6.1,
  T: -9.65,
  B: 9.57,
  NX: -3.86,
  NZ: 4.71,
  RX: 6.1,
  RZ: 3.51,
};
const COTES = [
  { a: [W.L, W.T], b: [W.R, W.T], v: 12.42, o: [0, -1] },
  { a: [W.L, W.T], b: [W.L, W.NZ], v: 14.32, o: [-1, 0] },
  { a: [W.L, W.NZ], b: [W.NX, W.NZ], v: 2.34, o: [0, 1] },
  { a: [W.NX, W.NZ], b: [W.NX, W.B], v: 4.81, o: [-1, 0] },
  { a: [W.NX, W.B], b: [W.RX, W.B], v: 9.89, o: [0, 1] },
  { a: [W.R, W.T], b: [W.R, W.RZ], v: 13.16, o: [1, 0] },
  { a: [W.RX, W.RZ], b: [W.RX, W.B], v: 6.34, o: [1, 0] },
] as const;

// Machines StyleShoots : modèles constructeur, positions relevées sur le scan.
const MACHINES: Record<string, { pos: [number, number, number]; ry: number }> =
  {
    Live: { pos: [3.01, 0, -2.5], ry: -Math.PI / 2 },
    Vertical: { pos: [-4.8, 0, -7.61], ry: 0 },
    Horizontal: { pos: [4.92, 0, -7.95], ry: Math.PI / 2 },
    Eclipse: { pos: [-0.165, 0, -8.445], ry: 0 },
  };

// Sous toiture (scan : 5,40 à 5,70 m) ; sous poutres ≈ 4,90 m.
const H = 5.6;

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) | 0;
    return ((s ^ (s >>> 7)) >>> 0) / 4294967296;
  };
}

// Textures procédurales (canvas) : aucune image externe.
function canvasTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  { srgb = true, rx = 1, ry = 1 } = {},
) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  n: number,
  base: string,
  amp: number,
  size: number,
  seed = 1,
) {
  const r = rnd(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const v = Math.floor((r() - 0.5) * amp);
    const c = v > 0 ? 255 : 0;
    ctx.fillStyle = `rgba(${c},${c},${c},${Math.abs(v) / 255})`;
    const s = size * (0.4 + r());
    ctx.beginPath();
    ctx.arc(r() * w, r() * h, s, 0, 7);
    ctx.fill();
  }
}

function makeTextures() {
  return {
    // Résine époxy blanche : légères nuances et traces.
    floor: canvasTex(
      1024,
      1024,
      (g, w, h) => {
        noise(g, w, h, 2200, '#eceae6', 4, 30, 3);
        const r = rnd(9);
        g.strokeStyle = 'rgba(0,0,0,.02)';
        for (let i = 0; i < 40; i++) {
          g.lineWidth = 1 + r() * 2;
          g.beginPath();
          const x = r() * w;
          const y = r() * h;
          g.moveTo(x, y);
          g.bezierCurveTo(
            x + r() * 120,
            y + r() * 40,
            x + r() * 200,
            y - r() * 60,
            x + r() * 260,
            y + r() * 30,
          );
          g.stroke();
        }
      },
      { rx: 3, ry: 5 },
    ),
    floorRough: canvasTex(
      512,
      512,
      (g, w, h) => noise(g, w, h, 900, '#444444', 30, 24, 5),
      { srgb: false, rx: 3, ry: 5 },
    ),
    // Bardage nervuré horizontal (carte de relief).
    ribs: canvasTex(
      16,
      256,
      (g, w, h) => {
        for (let y = 0; y < h; y++) {
          const p = (y % 32) / 32;
          const v =
            p < 0.18
              ? 255
              : p < 0.3
                ? 80
                : p < 0.82
                  ? 150
                  : p < 0.94
                    ? 60
                    : 150;
          g.fillStyle = `rgb(${v},${v},${v})`;
          g.fillRect(0, y, w, 1);
        }
      },
      { srgb: false, rx: 20, ry: 6 },
    ),
    fabric: canvasTex(
      256,
      256,
      (g, w, h) => {
        noise(g, w, h, 4000, '#808080', 90, 2.2, 11);
      },
      { srgb: false, rx: 6, ry: 6 },
    ),
    wood: canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = '#b48a5c';
      g.fillRect(0, 0, w, h);
      const r = rnd(4);
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = `rgba(${r() < 0.5 ? 90 : 210},${r() < 0.5 ? 60 : 150},40,${0.08 + r() * 0.12})`;
        g.lineWidth = 1 + r() * 3;
        g.beginPath();
        const y = r() * h;
        g.moveTo(0, y);
        for (let x = 0; x <= w; x += 32)
          g.lineTo(x, y + Math.sin(x / 60 + i) * 4);
        g.stroke();
      }
    }),
    cowhide: canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#f2efe8';
      g.fillRect(0, 0, w, h);
      const r = rnd(21);
      g.fillStyle = '#1d1b19';
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        const cx = r() * w;
        const cy = r() * h;
        const rad = 40 + r() * 90;
        for (let a = 0; a <= 6.3; a += 0.35) {
          const rr = rad * (0.6 + r() * 0.5);
          g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        g.fill();
      }
    }),
    blocks: canvasTex(
      512,
      512,
      (g, w, h) => {
        noise(g, w, h, 1800, '#f6f6f4', 4, 6, 17);
        g.strokeStyle = 'rgba(0,0,0,.07)';
        g.lineWidth = 2;
        for (let y = 0; y <= h; y += 64) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(w, y);
          g.stroke();
          const off = (y / 64) % 2 ? 64 : 0;
          for (let x = off; x <= w; x += 128) {
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x, y + 64);
            g.stroke();
          }
        }
      },
      { rx: 3, ry: 7 },
    ),
    charred: canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = '#1b1a19';
      g.fillRect(0, 0, w, h);
      const r = rnd(31);
      for (let i = 0; i < 220; i++) {
        const v = r() < 0.5 ? 58 : 6;
        g.strokeStyle = `rgba(${v},${v - 2},${v - 4},${0.25 + r() * 0.4})`;
        g.lineWidth = 1 + r() * 3;
        g.beginPath();
        const x = r() * w;
        g.moveTo(x, 0);
        for (let y = 0; y <= h; y += 40)
          g.lineTo(x + Math.sin(y / 50 + i) * 3, y);
        g.stroke();
      }
    }),
    concrete: canvasTex(
      256,
      256,
      (g, w, h) => noise(g, w, h, 1600, '#cfcbc4', 6, 5, 23),
      { rx: 2, ry: 1 },
    ),
    marble: canvasTex(
      512,
      256,
      (g, w, h) => {
        g.fillStyle = '#ecebe7';
        g.fillRect(0, 0, w, h);
        const r = rnd(41);
        g.strokeStyle = 'rgba(120,120,120,.18)';
        for (let i = 0; i < 25; i++) {
          g.lineWidth = 0.5 + r() * 1.5;
          g.beginPath();
          let x = r() * w;
          let y = r() * h;
          g.moveTo(x, y);
          for (let k = 0; k < 8; k++) {
            x += r() * 80 - 20;
            y += r() * 40 - 20;
            g.lineTo(x, y);
          }
          g.stroke();
        }
      },
      { rx: 4, ry: 1 },
    ),
    rug: canvasTex(
      256,
      256,
      (g, w, h) => noise(g, w, h, 3000, '#1c1c1c', 25, 2, 13),
      { rx: 4, ry: 3 },
    ),
    sectional: canvasTex(
      64,
      512,
      (g, w, h) => {
        g.fillStyle = '#f1f1ef';
        g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 56) {
          g.fillStyle = '#c9c9c6';
          g.fillRect(0, y, w, 3);
          g.fillStyle = '#ffffff';
          g.fillRect(0, y + 3, w, 2);
          g.fillStyle = 'rgba(0,0,0,.05)';
          for (let k = 8; k < 64; k += 14) g.fillRect(0, y + k, w, 1);
        }
      },
      { rx: 6, ry: 1 },
    ),
  };
}

function makeMaterials(TX: ReturnType<typeof makeTextures>, clip: THREE.Plane) {
  const std = (o: THREE.MeshStandardMaterialParameters) =>
    new THREE.MeshStandardMaterial(o);
  const MAT = {
    plaster: std({ color: 0xffffff, map: TX.blocks, roughness: 0.9 }),
    floor: new THREE.MeshPhysicalMaterial({
      color: 0xd3d8dc,
      map: TX.floor,
      roughness: 0.28,
      roughnessMap: TX.floorRough,
      clearcoat: 0.6,
      clearcoatRoughness: 0.18,
    }),
    cyclo: std({ color: 0xffffff, roughness: 0.97 }),
    black: std({ color: 0x1b1b1c, roughness: 0.6 }),
    blackSatin: std({ color: 0x222224, roughness: 0.35, metalness: 0.1 }),
    felt: std({
      color: 0x141414,
      roughness: 1,
      bumpMap: TX.fabric,
      bumpScale: 0.6,
    }),
    steel: std({ color: 0x8e9196, roughness: 0.35, metalness: 0.8 }),
    chrome: std({ color: 0xe6e8ea, roughness: 0.12, metalness: 1 }),
    tube: std({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.2,
    }),
    bulb: std({ color: 0xfff6e0, emissive: 0xffe9b8, emissiveIntensity: 2.5 }),
    mirror: std({
      color: 0xdfe5e8,
      roughness: 0.08,
      metalness: 0.85,
      emissive: 0x5a6064,
      emissiveIntensity: 0.6,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.03,
      transmission: 0.9,
      thickness: 0.02,
      transparent: true,
      opacity: 0.5,
    }),
    rug: std({
      color: 0xffffff,
      map: TX.rug,
      roughness: 1,
      bumpMap: TX.fabric,
      bumpScale: 0.8,
    }),
    cowhide: std({ color: 0xffffff, map: TX.cowhide, roughness: 0.85 }),
    wood: std({ color: 0xffffff, map: TX.wood, roughness: 0.55 }),
    whiteLam: std({ color: 0xf6f6f4, roughness: 0.35 }),
    leaf: std({ color: 0x4d7a3a, roughness: 0.7 }),
    red: std({ color: 0xb3261e, roughness: 0.4, metalness: 0.2 }),
    exit: std({
      color: 0x1f9d55,
      emissive: 0x1f9d55,
      emissiveIntensity: 1.2,
    }),
    sectional: std({
      color: 0xffffff,
      map: TX.sectional,
      roughness: 0.5,
      metalness: 0.2,
    }),
    charred: std({ color: 0xffffff, map: TX.charred, roughness: 0.75 }),
    concreteFront: std({ color: 0xffffff, map: TX.concrete, roughness: 0.8 }),
    marble: std({ color: 0xffffff, map: TX.marble, roughness: 0.25 }),
    beam: std({ color: 0xd2cbbf, roughness: 0.95 }),
    roof: std({
      color: 0xc9cdd1,
      emissive: 0x2a2c2e,
      roughness: 0.6,
      metalness: 0.3,
      bumpMap: TX.ribs,
      bumpScale: 3,
      side: THREE.BackSide,
    }),
    sky: std({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 1.4 }),
    sofa: std({
      color: 0xd5d1ca,
      roughness: 1,
      bumpMap: TX.fabric,
      bumpScale: 1,
    }),
    ovenGlass: std({ color: 0x0b0b0c, roughness: 0.08, metalness: 0.4 }),
    machineV: std({
      vertexColors: true,
      roughness: 0.42,
      metalness: 0.2,
      flatShading: true,
    }),
    lampGlow: std({
      color: 0xffffff,
      emissive: 0xfff4ee,
      emissiveIntensity: 0.55,
      roughness: 0.6,
      flatShading: true,
    }),
  };
  for (const m of Object.values(MAT)) {
    m.clippingPlanes = [clip];
    if (m !== MAT.roof) m.side = THREE.DoubleSide;
  }
  return MAT;
}

export function createStudioScene(opts: StudioSceneOptions): StudioScene {
  const { stage } = opts;
  const fmt = opts.formatMeters;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.78;
  // `touch-none` : sans lui, glisser un doigt sur la maquette fait défiler la
  // page au lieu de la faire tourner.
  renderer.domElement.className = 'block touch-none';
  stage.prepend(renderer.domElement);

  const labelsEl = document.createElement('div');
  labelsEl.className = 'pointer-events-none absolute inset-0 z-[1]';
  stage.appendChild(labelsEl);
  const labelR = new CSS2DRenderer({ element: labelsEl });

  const scene = new THREE.Scene();
  const persp = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 300);
  let cam: THREE.Camera = persp;
  const controls = new OrbitControls(persp, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 3;
  controls.maxDistance = 60;

  // Rendu à la demande : une image seulement quand la vue bouge.
  let dirty = true;
  const invalidate = () => {
    dirty = true;
  };
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.6);
  const maq = new THREE.Group();
  scene.add(maq);
  const maqMeshes: THREE.Object3D[] = [];

  const TX = makeTextures();
  const MAT = makeMaterials(TX, clip);

  // Groupe de destination des objets : la maquette, ou le mobilier amovible
  // que le mode plateau libre masque.
  let target: THREE.Object3D = maq;
  const movable = new THREE.Group();
  maq.add(movable);

  interface AddOpts {
    rx?: number;
    ry?: number;
    rz?: number;
    cast?: boolean;
    to?: THREE.Object3D;
    r2?: number;
    seg?: number;
  }
  function add(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    opt: AddOpts = {},
  ) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (opt.ry) m.rotation.y = opt.ry;
    if (opt.rx) m.rotation.x = opt.rx;
    if (opt.rz) m.rotation.z = opt.rz;
    m.castShadow = opt.cast !== false;
    m.receiveShadow = true;
    (opt.to || target).add(m);
    maqMeshes.push(m);
    return m;
  }
  const box = (
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    h: number,
    mat: THREE.Material,
    y0 = 0,
    opt?: AddOpts,
  ) =>
    add(
      new THREE.BoxGeometry(x1 - x0, h, z1 - z0),
      mat,
      (x0 + x1) / 2,
      y0 + h / 2,
      (z0 + z1) / 2,
      opt,
    );
  const rbox = (
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    h: number,
    mat: THREE.Material,
    y0 = 0,
    r = 0.04,
    opt?: AddOpts,
  ) =>
    add(
      new RoundedBoxGeometry(
        x1 - x0,
        h,
        z1 - z0,
        3,
        Math.min(r, h / 2 - 0.001),
      ),
      mat,
      (x0 + x1) / 2,
      y0 + h / 2,
      (z0 + z1) / 2,
      opt,
    );
  const cyl = (
    r: number,
    h: number,
    mat: THREE.Material,
    x: number,
    y0: number,
    z: number,
    opt?: AddOpts,
  ) =>
    add(
      new THREE.CylinderGeometry(r, opt?.r2 ?? r, h, opt?.seg || 20),
      mat,
      x,
      y0 + h / 2,
      z,
      opt,
    );
  // Éléments arasés à la hauteur de coupe.
  const tall: { m: THREE.Mesh; y0: number; h: number }[] = [];

  // ---- Maquette (cotes issues du scan et du relevé Polycam)
  const outline: [number, number][] = [
    [W.L, W.T],
    [W.R, W.T],
    [W.R, W.RZ],
    [W.RX, W.RZ],
    [W.RX, W.B],
    [W.NX, W.B],
    [W.NX, W.NZ],
    [W.L, W.NZ],
  ];
  const floorShape = new THREE.Shape(
    outline.map(([x, z]) => new THREE.Vector2(x, -z)),
  );
  {
    const fg = new THREE.ShapeGeometry(floorShape);
    // UV en mètres / 4 pour la texture du sol.
    const uv = fg.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
    TX.floor.repeat.set(1, 1);
    TX.floorRough.repeat.set(1, 1);
    add(fg, MAT.floor, 0, 0, 0, { rx: -Math.PI / 2, cast: false });
  }

  // Murs : un seul anneau continu (contour intérieur + décalage extérieur de
  // 20 cm), parpaings peints en blanc.
  {
    const t = 0.2;
    const pts = outline
      .filter((p, k) => {
        const q = outline[(k + 1) % outline.length];
        return Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.05;
      })
      .filter((p, k, a) => {
        const pr = a[(k - 1 + a.length) % a.length];
        const nx = a[(k + 1) % a.length];
        return (
          Math.abs(
            (p[0] - pr[0]) * (nx[1] - p[1]) - (p[1] - pr[1]) * (nx[0] - p[0]),
          ) > 1e-6
        );
      });
    const n = pts.length;
    const outer: [number, number][] = [];
    for (let k = 0; k < n; k++) {
      const pr = pts[(k - 1 + n) % n];
      const p = pts[k];
      const nx = pts[(k + 1) % n];
      const e1 = [p[0] - pr[0], p[1] - pr[1]];
      const e2 = [nx[0] - p[0], nx[1] - p[1]];
      const l1 = Math.hypot(e1[0], e1[1]);
      const l2 = Math.hypot(e2[0], e2[1]);
      const n1 = [e1[1] / l1, -e1[0] / l1];
      const n2 = [e2[1] / l2, -e2[0] / l2];
      outer.push([p[0] + t * (n1[0] + n2[0]), p[1] + t * (n1[1] + n2[1])]);
    }
    const sh = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
    sh.holes.push(
      new THREE.Path(pts.map(([x, z]) => new THREE.Vector2(x, -z))),
    );
    const wg = new THREE.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false });
    wg.rotateX(-Math.PI / 2);
    wg.translate(0, -H / 2, 0);
    const uv = wg.attributes.uv;
    for (let k = 0; k < uv.count; k++)
      uv.setXY(k, uv.getX(k) / 2, uv.getY(k) / 2);
    tall.push({ m: add(wg, MAT.plaster, 0, H / 2, 0), y0: 0, h: H });
  }

  // Toiture : poutres béton, bac acier nervuré (visible par-dessous seulement),
  // lanterneaux.
  for (let z = -7.6; z < 9.6; z += 4.3) {
    const x0 = z > W.NZ ? W.NX : W.L;
    box(x0, W.R, z - 0.2, z + 0.2, 0.7, MAT.beam, H - 0.7, { cast: false });
  }
  {
    const rg = new THREE.ShapeGeometry(floorShape);
    const ru = rg.attributes.uv;
    for (let k = 0; k < ru.count; k++)
      ru.setXY(k, ru.getX(k) / 2, ru.getY(k) / 2);
    add(rg, MAT.roof, 0, H, 0, { rx: -Math.PI / 2, cast: false });
  }
  for (const x of [-2.6, 2.0])
    for (const z of [-5.4, -1.1, 3.2])
      box(x - 0.7, x + 0.7, z - 1.2, z + 1.2, 0.02, MAT.sky, H - 0.03, {
        cast: false,
      });
  // Tubes fluorescents au plafond.
  for (const x of [-3.6, 0, 3.6])
    for (let z = -8.5; z < 9; z += 3.2) {
      if (x < W.NX + 0.3 && z > W.NZ) continue;
      add(new THREE.BoxGeometry(0.08, 0.05, 1.5), MAT.tube, x, 4.72, z, {
        cast: false,
      });
    }

  // Cyclorama : parois + gorges arrondies (r = 0,6 m) ; 5 m de profondeur,
  // 6 m de large, 5 m de haut.
  {
    const CY = { x0: 0.9, x1: 5.9, z0: 3.45, z1: 9.45, h: 5.0, r: 0.6 };
    box(CY.x0, CY.x1, CY.z1, CY.z1 + 0.08, CY.h, MAT.cyclo);
    box(CY.x1, CY.x1 + 0.08, CY.z0, CY.z1 + 0.08, CY.h, MAT.cyclo);
    box(CY.x0, CY.x1, CY.z0, CY.z1, 0.015, MAT.cyclo, 0, { cast: false });
    const cove = new THREE.Shape();
    const r = CY.r;
    cove.moveTo(0, 0);
    cove.lineTo(r, 0);
    cove.absarc(r, r, r, -Math.PI / 2, Math.PI, true);
    cove.lineTo(0, 0);
    const ext = (len: number) =>
      new THREE.ExtrudeGeometry(cove, {
        depth: len,
        bevelEnabled: false,
        curveSegments: 20,
      });
    add(ext(CY.x1 - CY.x0), MAT.cyclo, CY.x0, 0.015, CY.z1, {
      ry: Math.PI / 2,
    });
    add(ext(CY.z1 - CY.z0), MAT.cyclo, CY.x1, 0.015, CY.z1, { ry: Math.PI });
  }
  // Éclairage du cyclo : deux flashs sur pied avec boîte à lumière, un trépied
  // caméra. Masqués en mode plateau libre.
  target = movable;
  for (const [x, z] of [
    [1.4, 4.6],
    [1.3, 8.4],
  ]) {
    // Boîtes à lumière orientées vers le cyclo.
    const rot = Math.atan2(3.6 - x, 6.4 - z);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    target.add(g);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.09;
      add(
        new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6),
        MAT.chrome,
        Math.cos(a) * 0.22,
        0.27,
        Math.sin(a) * 0.22,
        { to: g, rz: Math.cos(a) * 0.6, rx: -Math.sin(a) * 0.6 },
      );
    }
    add(
      new THREE.CylinderGeometry(0.014, 0.014, 1.25, 8),
      MAT.chrome,
      0,
      1.12,
      0,
      {
        to: g,
      },
    );
    add(
      new THREE.CylinderGeometry(0.06, 0.06, 0.2, 16),
      MAT.blackSatin,
      0,
      1.75,
      0,
      { to: g, rx: Math.PI / 2 },
    );
    add(
      new THREE.CylinderGeometry(0.35, 0.07, 0.32, 8, 1, true),
      MAT.felt,
      0,
      1.75,
      0.26,
      { to: g, rx: Math.PI / 2 },
    );
    add(new THREE.CircleGeometry(0.35, 8), MAT.cyclo, 0, 1.75, 0.42, {
      to: g,
      cast: false,
    });
  }
  {
    const g = new THREE.Group();
    g.position.set(0.3, 0, 6.3);
    target.add(g);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.09 + 0.5;
      add(
        new THREE.CylinderGeometry(0.015, 0.01, 1.45, 6),
        MAT.blackSatin,
        Math.cos(a) * 0.22,
        0.7,
        Math.sin(a) * 0.22,
        { to: g, rz: Math.cos(a) * 0.3, rx: -Math.sin(a) * 0.3 },
      );
    }
    add(
      new RoundedBoxGeometry(0.16, 0.12, 0.1, 2, 0.02),
      MAT.black,
      0,
      1.48,
      0,
      {
        to: g,
      },
    );
    add(
      new THREE.CylinderGeometry(0.04, 0.04, 0.12, 16),
      MAT.black,
      0,
      1.48,
      0.1,
      {
        to: g,
        rx: Math.PI / 2,
      },
    );
  }
  target = maq;

  // Cloison noire entre Vertical et Eclipse ; casiers à paniers ouverts des deux
  // côtés à son extrémité, perpendiculaires.
  rbox(-1.8, -1.2, W.T + 0.05, -5.8, 2.7, MAT.felt, 0, 0.03);
  add(new THREE.CircleGeometry(0.42, 40), MAT.whiteLam, -1.19, 1.0, -7.0, {
    ry: Math.PI / 2,
    cast: false,
  });
  {
    const x0 = -1.2;
    const x1 = 0.15;
    const z0 = -6.22;
    const z1 = -5.82;
    const h = 1.15;
    const xm = (x0 + x1) / 2;
    box(x0, x0 + 0.03, z0, z1, h, MAT.felt);
    box(x1 - 0.03, x1, z0, z1, h, MAT.felt);
    box(xm - 0.015, xm + 0.015, z0, z1, h, MAT.felt);
    for (let k = 0; k < 5; k++)
      box(x0, x1, z0, z1, 0.025, MAT.felt, (k * (h - 0.025)) / 4);
    // Vert clair (deux rangées du bas), vert foncé, gris foncé (haut).
    const cols = [0x9db8b0, 0x2f4a40, 0x3a3c3e];
    for (let row = 0; row < 4; row++)
      for (let c = 0; c < 2; c++)
        for (let b = 0; b < 2; b++) {
          const xc = x0 + 0.06 + c * 0.68 + b * 0.31;
          const y = 0.03 + row * 0.28;
          rbox(
            xc,
            xc + 0.27,
            z0 + 0.04,
            z1 - 0.04,
            0.22,
            new THREE.MeshStandardMaterial({
              color: cols[row >= 2 ? 0 : row === 1 ? 1 : 2],
              roughness: 0.85,
              clippingPlanes: [clip],
            }),
            y,
            0.03,
          );
        }
    cyl(0.008, 0.3, MAT.steel, -0.95, h, -6.02);
    add(
      new THREE.SphereGeometry(0.09, 16, 8, 0, 6.3, 0, 1.6),
      MAT.bulb,
      -0.95,
      h + 0.3,
      -6.02,
      { cast: false },
    );
  }
  {
    const g = new THREE.Group();
    g.position.set(0.45, 0, -7.05);
    maq.add(g);
    add(new THREE.BoxGeometry(0.38, 0.03, 0.3), MAT.black, 0, 0.75, 0, {
      to: g,
    });
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      add(
        new THREE.BoxGeometry(0.03, 0.78, 0.03),
        MAT.black,
        a * 0.14,
        0.38,
        b * 0.11,
        { to: g, rz: a * 0.15, rx: -b * 0.15 },
      );
  }

  // Armoire longue entre Horizontal et Live, perpendiculaire au mur ; miroir
  // sur sa face avant.
  rbox(3.7, 6.05, -5.55, -4.9, 2.6, MAT.felt, 0, 0.02);
  box(3.68, 3.7, -5.42, -5.03, 1.5, MAT.whiteLam, 0.25);
  box(3.675, 3.69, -5.38, -5.07, 1.4, MAT.mirror, 0.3);
  // Rideau noir côté Live.
  for (let i = 0; i < 9; i++)
    box(3.75 + i * 0.25, 3.88 + i * 0.25, -4.9, -4.88, 2.45, MAT.felt, 0.05);

  // Loges : double cabine d'essayage à rideaux, deux postes maquillage dos à
  // dos autour d'un miroir double face.
  {
    const X0 = 4.95;
    const X1 = 6.0;
    const Z0 = -0.7;
    const Z1 = 2.1;
    const HH = 2.35;
    const ZM = 0.7;
    box(X0, X1, Z0, Z0 + 0.04, HH, MAT.felt);
    box(X0, X1, Z1 - 0.04, Z1, HH, MAT.felt);
    box(X0, X1, ZM - 0.02, ZM + 0.02, HH, MAT.felt);
    box(X0 - 0.02, X1, Z0, Z1, 0.04, MAT.felt, HH);
    box(X1 - 0.03, X1, Z0, Z1, HH, MAT.felt);
    box(X0, X0 + 0.06, Z0, Z0 + 0.12, HH, MAT.felt);
    box(X0, X0 + 0.06, Z1 - 0.12, Z1, HH, MAT.felt);
    box(X0, X0 + 0.06, ZM - 0.08, ZM + 0.08, HH, MAT.felt);
    cyl(
      0.012,
      Z1 - Z0,
      MAT.chrome,
      X0 + 0.05,
      HH - 0.08 - (Z1 - Z0) / 2,
      (Z0 + Z1) / 2,
      {
        rx: Math.PI / 2,
      },
    );
    for (const [za, zb, open] of [
      [Z0 + 0.12, ZM - 0.08, 1.0],
      [ZM + 0.08, Z1 - 0.12, 0.22],
    ]) {
      const len = (zb - za) * open;
      const n = Math.ceil(len / 0.09);
      for (let i = 0; i < n; i++) {
        const zz = za + i * (len / n) + 0.04;
        box(
          X0 + 0.02 + (i % 2) * 0.05,
          X0 + 0.05 + (i % 2) * 0.05,
          zz - 0.05,
          zz + 0.05,
          HH - 0.12,
          MAT.felt,
          0.03,
        );
      }
    }
    // Intérieur des cabines : parois et plafond blancs, banc sur toute la
    // largeur du fond, patère noire, spot encastré.
    for (const [za, zb] of [
      [Z0 + 0.04, ZM - 0.02],
      [ZM + 0.02, Z1 - 0.04],
    ]) {
      box(X1 - 0.045, X1 - 0.03, za, zb, HH, MAT.whiteLam, 0, { cast: false });
      box(X0 + 0.06, X1 - 0.045, za, za + 0.012, HH, MAT.whiteLam, 0, {
        cast: false,
      });
      box(X0 + 0.06, X1 - 0.045, zb - 0.012, zb, HH, MAT.whiteLam, 0, {
        cast: false,
      });
      box(X0 + 0.06, X1 - 0.045, za, zb, 0.012, MAT.whiteLam, HH - 0.012, {
        cast: false,
      });
      box(X1 - 0.43, X1 - 0.045, za + 0.012, zb - 0.012, 0.45, MAT.whiteLam, 0);
      add(
        new THREE.CylinderGeometry(0.035, 0.035, 0.01, 20),
        MAT.bulb,
        (X0 + X1) / 2,
        HH - 0.02,
        (za + zb) / 2,
        { cast: false },
      );
      const hz = zb - 0.02;
      add(
        new THREE.CylinderGeometry(0.03, 0.03, 0.01, 16),
        MAT.black,
        X0 + 0.45,
        1.7,
        hz,
        { rx: Math.PI / 2, cast: false },
      );
      box(X0 + 0.45, X0 + 0.55, hz - 0.04, hz - 0.03, 0.008, MAT.black, 1.696, {
        cast: false,
      });
      add(
        new THREE.CylinderGeometry(0.018, 0.018, 0.01, 16),
        MAT.black,
        X0 + 0.56,
        1.7,
        hz - 0.04,
        { rx: Math.PI / 2, cast: false },
      );
    }
    // Miroir central double face et deux bureaux noirs.
    box(3.5, X0, ZM - 0.03, ZM + 0.03, 2.0, MAT.felt, 0);
    box(3.56, X0 - 0.04, ZM - 0.035, ZM + 0.035, 1.0, MAT.mirror, 0.95);
    for (const s of [-1, 1]) {
      const za = s < 0 ? ZM - 0.5 : ZM + 0.03;
      const zb = s < 0 ? ZM - 0.03 : ZM + 0.5;
      rbox(3.6, 4.85, za, zb, 0.05, MAT.felt, 0.74, 0.005);
      box(3.6, 4.85, za, zb, 0.02, MAT.felt, 0.5);
      for (const x of [3.62, 4.2, 4.83])
        box(x - 0.02, x, za, zb, 0.24, MAT.felt, 0.5);
      box(3.6, 3.65, za, zb, 0.74, MAT.felt, 0);
      box(4.8, 4.85, za, zb, 0.74, MAT.felt, 0);
      // Miroir lumineux posé sur le bureau.
      const zf = s < 0 ? ZM - 0.09 : ZM + 0.09;
      box(3.95, 4.55, zf - 0.015, zf + 0.015, 0.45, MAT.black, 0.79);
      box(
        4.0,
        4.5,
        zf + s * 0.016 - 0.002,
        zf + s * 0.016 + 0.002,
        0.38,
        MAT.mirror,
        0.83,
      );
      for (let i = 0; i < 4; i++)
        add(
          new THREE.SphereGeometry(0.022, 12, 8),
          MAT.bulb,
          4.03 + i * 0.147,
          1.2,
          zf + s * 0.03,
          { cast: false },
        );
      for (let i = 0; i < 4; i++) {
        add(
          new THREE.SphereGeometry(0.022, 12, 8),
          MAT.bulb,
          3.98,
          0.86 + i * 0.1,
          zf + s * 0.03,
          { cast: false },
        );
        add(
          new THREE.SphereGeometry(0.022, 12, 8),
          MAT.bulb,
          4.52,
          0.86 + i * 0.1,
          zf + s * 0.03,
          { cast: false },
        );
      }
    }
    // Assises : tabouret à roulettes et chaise transparente de chaque côté.
    const stool = (x: number, z: number) => {
      cyl(0.02, 0.42, MAT.chrome, x, 0.08, z);
      add(
        new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24),
        MAT.black,
        x,
        0.54,
        z,
      );
      for (let k = 0; k < 5; k++) {
        const a = k * 1.2566;
        add(
          new THREE.BoxGeometry(0.26, 0.025, 0.03),
          MAT.black,
          x + Math.cos(a) * 0.13,
          0.06,
          z + Math.sin(a) * 0.13,
          { ry: -a },
        );
      }
    };
    const ghost = (x: number, z: number, ry: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      maq.add(g);
      add(
        new RoundedBoxGeometry(0.42, 0.03, 0.42, 2, 0.01),
        MAT.glass,
        0,
        0.45,
        0,
        {
          to: g,
        },
      );
      add(
        new RoundedBoxGeometry(0.4, 0.38, 0.03, 2, 0.01),
        MAT.glass,
        0,
        0.68,
        -0.2,
        { to: g, rx: -0.1 },
      );
      for (const [a, b] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        add(
          new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6),
          MAT.glass,
          a * 0.18,
          0.225,
          b * 0.18,
          { to: g },
        );
    };
    stool(4.0, ZM - 0.85);
    ghost(4.45, ZM - 0.75, 0);
    stool(4.4, ZM + 0.85);
    ghost(3.95, ZM + 0.8, Math.PI);
  }

  target = movable;
  // Espace lounge : tapis noir, canapé d'angle bouclette, fauteuils vache,
  // table basse, plante.
  box(-3.95, -0.9, -3.15, -1.25, 0.012, MAT.rug, 0, { cast: false });
  // Canapé d'angle HAY Mags : volumes bas et arrondis, dossier et accoudoir à
  // même hauteur.
  {
    const R = 0.11;
    rbox(-3.7, -0.95, -3.82, -3.08, 0.24, MAT.sofa, 0, 0.06);
    rbox(-3.7, -2.82, -3.08, -2.3, 0.24, MAT.sofa, 0, 0.06);
    for (const [a, b] of [
      [-3.7, -2.82],
      [-2.8, -1.89],
      [-1.87, -0.95],
    ])
      rbox(a, b, -3.82, -3.08, 0.18, MAT.sofa, 0.22, R);
    rbox(-3.7, -2.82, -3.06, -2.3, 0.18, MAT.sofa, 0.22, R);
    for (const [a, b] of [
      [-3.7, -2.32],
      [-2.3, -0.7],
    ])
      rbox(a, b, -4.07, -3.8, 0.68, MAT.sofa, 0, R);
    rbox(-0.95, -0.7, -3.82, -3.08, 0.6, MAT.sofa, 0, R);
  }
  // Table basse : deux modules blancs à structure chromée.
  for (const x0 of [-2.65, -2.12]) {
    box(x0, x0 + 0.5, -2.55, -1.95, 0.02, MAT.whiteLam, 0.4);
    box(x0, x0 + 0.5, -2.55, -1.95, 0.012, MAT.whiteLam, 0.08);
    const legs = [
      [x0 + 0.01, -2.54],
      [x0 + 0.49, -2.54],
      [x0 + 0.01, -1.96],
      [x0 + 0.49, -1.96],
    ];
    for (const [x, z] of legs) cyl(0.011, 0.42, MAT.chrome, x, 0, z);
    for (const y of [0.08, 0.4])
      for (const [x, z] of legs)
        add(new THREE.SphereGeometry(0.02, 12, 8), MAT.chrome, x, y, z, {
          cast: false,
        });
    box(x0, x0 + 0.5, -2.555, -2.545, 0.012, MAT.chrome, 0.38);
    box(x0, x0 + 0.5, -1.955, -1.945, 0.012, MAT.chrome, 0.38);
  }
  // Fauteuils Poliform Kay : structure acier noir fine, assise et dossier
  // inclinés en peau de vache ; repose-pieds.
  for (const [x, z, ry] of [
    [-3.15, -1.45, Math.PI - 0.35],
    [-1.15, -1.45, Math.PI + 0.35],
  ]) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    target.add(g);
    for (const sx of [-0.3, 0.3]) {
      add(new THREE.BoxGeometry(0.02, 0.02, 0.78), MAT.black, sx, 0.012, 0.02, {
        to: g,
      });
      add(new THREE.BoxGeometry(0.02, 0.5, 0.02), MAT.black, sx, 0.2, 0.22, {
        to: g,
        rx: -0.75,
      });
      add(new THREE.BoxGeometry(0.02, 0.62, 0.02), MAT.black, sx, 0.26, -0.2, {
        to: g,
        rx: 0.7,
      });
      add(new THREE.BoxGeometry(0.02, 0.02, 0.55), MAT.black, sx, 0.34, 0.06, {
        to: g,
        rx: -0.18,
      });
      add(new THREE.BoxGeometry(0.02, 0.66, 0.02), MAT.black, sx, 0.62, -0.3, {
        to: g,
        rx: -0.42,
      });
    }
    add(
      new RoundedBoxGeometry(0.62, 0.035, 0.56, 2, 0.012),
      MAT.cowhide,
      0,
      0.37,
      0.06,
      { to: g, rx: -0.18 },
    );
    add(
      new RoundedBoxGeometry(0.62, 0.66, 0.035, 2, 0.012),
      MAT.cowhide,
      0,
      0.66,
      -0.31,
      { to: g, rx: -0.42 },
    );
  }
  {
    const g = new THREE.Group();
    g.position.set(-1.05, 0, -2.3);
    g.rotation.y = Math.PI + 0.35;
    target.add(g);
    add(
      new RoundedBoxGeometry(0.58, 0.035, 0.45, 2, 0.012),
      MAT.cowhide,
      0,
      0.36,
      0,
      { to: g },
    );
    for (const sx of [-0.27, 0.27]) {
      add(new THREE.BoxGeometry(0.02, 0.02, 0.5), MAT.black, sx, 0.012, 0, {
        to: g,
      });
      add(new THREE.BoxGeometry(0.02, 0.4, 0.02), MAT.black, sx, 0.18, 0, {
        to: g,
        rx: 0.6,
      });
      add(new THREE.BoxGeometry(0.02, 0.4, 0.02), MAT.black, sx, 0.18, 0, {
        to: g,
        rx: -0.6,
      });
    }
  }
  {
    const px = -2.35;
    const pz = -2.2;
    const y0 = 0.42;
    box(px - 0.14, px + 0.14, pz - 0.1, pz + 0.1, 0.04, MAT.black, y0);
    const r = rnd(3);
    for (let b = 0; b < 2; b++) {
      const bx = px + (r() - 0.5) * 0.08;
      const bz = pz + (r() - 0.5) * 0.06;
      const bh = 0.55 + r() * 0.25;
      add(
        new THREE.CylinderGeometry(0.008, 0.012, bh, 6),
        MAT.wood,
        bx,
        y0 + 0.04 + bh / 2,
        bz,
      );
      for (let i = 0; i < 26; i++) {
        const y = 0.25 + r() * (bh - 0.2);
        const a = r() * 6.3;
        const d = 0.05 + r() * 0.22;
        const lf = add(
          new THREE.SphereGeometry(0.05, 8, 6),
          MAT.leaf,
          bx + Math.cos(a) * d,
          y0 + 0.04 + y,
          bz + Math.sin(a) * d,
        );
        lf.scale.set(0.35, 0.12, 1);
        lf.rotation.set(r() * 1.2 - 0.6, a, r() * 0.8 - 0.4);
      }
    }
  }

  target = maq;
  // Cuisine : bas en façades béton clair, plan marbre, crédence noire, hauts et
  // colonnes en bois brûlé.
  rbox(-6.1, -5.5, 0.35, 3.45, 0.86, MAT.concreteFront, 0, 0.01);
  box(-6.1, -5.46, 0.33, 3.47, 0.04, MAT.marble, 0.86);
  for (let z = 0.35; z < 3.45; z += 0.6)
    box(-5.495, -5.49, z + 0.005, z + 0.595, 0.8, MAT.concreteFront, 0.03);
  // Évier côté droit, près des toilettes.
  box(-5.95, -5.65, 0.65, 1.2, 0.01, MAT.black, 0.901, { cast: false });
  cyl(0.012, 0.32, MAT.black, -6.0, 0.9, 0.93);
  box(-6.1, -6.08, 0.35, 3.45, 0.6, MAT.black, 0.9);
  box(-6.08, -5.9, 0.4, 3.4, 0.02, MAT.wood, 1.2);
  rbox(-6.1, -5.75, 0.35, 3.45, 0.8, MAT.charred, 1.5, 0.01);
  rbox(-6.1, -5.45, -2.3, -1.0, 2.3, MAT.charred, 0, 0.01);
  box(-5.445, -5.44, -2.2, -1.7, 0.45, MAT.ovenGlass, 1.0);
  box(-5.445, -5.44, -1.6, -1.1, 2.05, MAT.blackSatin, 0.0);
  // Grande table et chaises : mobilier amovible.
  target = movable;
  rbox(-3.75, -2.85, 0.65, 3.15, 0.035, MAT.whiteLam, 0.72, 0.01);
  for (const [x, z] of [
    [-3.72, 0.68],
    [-2.88, 0.68],
    [-3.72, 3.12],
    [-2.88, 3.12],
  ])
    box(x - 0.025, x + 0.025, z - 0.025, z + 0.025, 0.72, MAT.whiteLam);
  for (const z of [1.1, 1.9, 2.7])
    for (const [x, s] of [
      [-4.0, 1],
      [-2.6, -1],
    ]) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      target.add(g);
      const cm = (z + x) % 2 > -0.5 ? MAT.wood : MAT.black;
      add(new RoundedBoxGeometry(0.42, 0.035, 0.42, 2, 0.015), cm, 0, 0.45, 0, {
        to: g,
      });
      add(new RoundedBoxGeometry(0.42, 0.3, 0.03, 2, 0.012), cm, 0, 0.68, 0.2, {
        to: g,
        rx: 0.12,
      });
      for (const [lx, lz] of [
        [-0.18, -0.18],
        [0.18, -0.18],
        [-0.18, 0.18],
        [0.18, 0.18],
      ])
        add(
          new THREE.CylinderGeometry(0.015, 0.012, 0.45, 8),
          cm,
          lx,
          0.225,
          lz,
          {
            to: g,
          },
        );
    }

  // Portant à vêtements, masqué en mode plateau libre.
  {
    const g = new THREE.Group();
    g.position.set(-3.0, 0, -7.4);
    g.rotation.y = Math.PI / 2;
    movable.add(g);
    for (const sx of [-0.75, 0.75]) {
      add(
        new THREE.CylinderGeometry(0.015, 0.015, 1.6, 8),
        MAT.chrome,
        sx,
        0.85,
        0,
        {
          to: g,
        },
      );
      add(new THREE.BoxGeometry(0.03, 0.03, 0.5), MAT.chrome, sx, 0.06, 0, {
        to: g,
      });
    }
    add(
      new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8),
      MAT.chrome,
      0,
      1.65,
      0,
      {
        to: g,
        rz: Math.PI / 2,
      },
    );
    const n = 12;
    const r = rnd(n);
    for (let i = 0; i < n; i++) {
      const c = [0x111111, 0x2b2b2b, 0xe8e4dc, 0x6b6f76, 0x3c4a5c][
        Math.floor(r() * 5)
      ];
      const gh = 0.7 + r() * 0.4;
      const gm = add(
        new THREE.BoxGeometry(0.025, gh, 0.48),
        new THREE.MeshStandardMaterial({
          color: c,
          roughness: 0.95,
          clippingPlanes: [clip],
        }),
        -0.65 + i * (1.3 / n),
        1.58 - gh / 2,
        0,
        { to: g },
      );
      gm.rotation.y = (r() - 0.5) * 0.35;
      gm.scale.z = 0.85 + r() * 0.3;
    }
  }
  target = maq;

  // Seconde entrée (mur du décroché, à côté de la porte sectionnelle) : porte
  // blanche, bloc secours, extincteur.
  box(-5.62, -4.58, W.NZ - 0.035, W.NZ, 2.15, MAT.whiteLam, 0, { cast: false });
  box(-5.66, -4.54, W.NZ - 0.03, W.NZ, 0.05, MAT.steel, 2.15);
  box(-4.75, -4.7, W.NZ - 0.07, W.NZ - 0.035, 0.18, MAT.chrome, 1.0);
  box(-5.25, -4.95, W.NZ - 0.05, W.NZ - 0.01, 0.12, MAT.exit, 2.3, {
    cast: false,
  });
  cyl(0.08, 0.5, MAT.red, -3.98, 0.25, W.NZ + 0.25);
  // Grand miroir Fiam Caadre 195 × 195 cm et placard blanc contre le mur du
  // fond, près de la porte sectionnelle.
  rbox(-3.84, -3.25, W.B - 0.6, W.B - 0.02, 2.2, MAT.whiteLam, 0, 0.01);
  {
    const g = new THREE.Group();
    g.position.set(-2.2, 0, W.B - 0.14);
    g.rotation.x = 0.06;
    maq.add(g);
    add(
      new RoundedBoxGeometry(1.95, 1.95, 0.12, 8, 0.06),
      MAT.chrome,
      0,
      0.98,
      0,
      {
        to: g,
      },
    );
    add(
      new RoundedBoxGeometry(1.77, 1.77, 0.02, 4, 0.008),
      MAT.mirror,
      0,
      0.98,
      -0.055,
      { to: g },
    );
  }
  // Entrée principale : porte noire entre les colonnes et la Vertical, bloc
  // secours au-dessus, extincteur à côté.
  box(W.L, W.L + 0.035, -3.45, -2.5, 2.15, MAT.blackSatin, 0, { cast: false });
  box(W.L, W.L + 0.03, -3.5, -2.45, 0.05, MAT.black, 2.15);
  box(W.L + 0.035, W.L + 0.06, -2.68, -2.55, 0.02, MAT.chrome, 1.0);
  box(W.L, W.L + 0.05, -3.1, -2.85, 0.12, MAT.exit, 2.35, { cast: false });
  cyl(0.08, 0.5, MAT.red, W.L + 0.12, 0.3, -3.85);
  // Toilettes : porte noire entre linéaire de cuisine et colonnes.
  box(W.L, W.L + 0.035, -0.85, 0.05, 2.1, MAT.blackSatin, 0, { cast: false });
  box(W.L, W.L + 0.03, -0.9, 0.1, 0.05, MAT.black, 2.1);
  box(W.L + 0.035, W.L + 0.06, -0.75, -0.62, 0.02, MAT.chrome, 1.0);
  // Faces extérieures des portes, visibles depuis l'extérieur du bâtiment.
  box(-5.62, -4.58, W.NZ + 0.2, W.NZ + 0.235, 2.15, MAT.whiteLam, 0, {
    cast: false,
  });
  box(-5.66, -4.54, W.NZ + 0.2, W.NZ + 0.23, 0.05, MAT.steel, 2.15);
  box(-4.75, -4.7, W.NZ + 0.235, W.NZ + 0.26, 0.04, MAT.chrome, 1.0);
  for (const x of [-5.66, -4.58])
    box(x, x + 0.04, W.NZ + 0.2, W.NZ + 0.24, 2.2, MAT.steel, 0, {
      cast: false,
    });
  box(W.NX - 0.25, W.NX - 0.2, 5.2, 8.6, 4.2, MAT.sectional, 0, {
    cast: false,
  });
  box(W.NX - 0.29, W.NX - 0.2, 5.1, 5.2, 4.35, MAT.steel);
  box(W.NX - 0.29, W.NX - 0.2, 8.6, 8.7, 4.35, MAT.steel);
  box(W.NX - 0.29, W.NX - 0.2, 5.1, 8.7, 0.1, MAT.steel, 4.25);
  // Porte sectionnelle : entrée du matériel et des véhicules (≈ 3,40 × 4,20 m).
  box(W.NX - 0.04, W.NX + 0.02, 5.2, 8.6, 4.2, MAT.sectional, 0, {
    cast: false,
  });
  box(W.NX - 0.1, W.NX - 0.02, 5.1, 5.2, 4.35, MAT.steel);
  box(W.NX - 0.1, W.NX - 0.02, 8.6, 8.7, 4.35, MAT.steel);
  box(W.NX - 0.12, W.NX - 0.02, 5.1, 8.7, 0.1, MAT.steel, 4.25);
  box(W.NX + 0.02, W.NX + 0.05, 6.7, 7.1, 0.04, MAT.steel, 1.0);

  // iPad de la Live : sur bras, côté droit de la colonne caméra vu depuis
  // l'opérateur, écran tourné vers lui.
  {
    const g = new THREE.Group();
    g.position.set(0.42, 1.12, -2.3);
    maq.add(g);
    add(new THREE.BoxGeometry(0.06, 0.08, 0.012), MAT.black, 0, 0, 0.006, {
      to: g,
    });
    add(new THREE.BoxGeometry(0.035, 0.035, 0.17), MAT.black, 0, 0, 0.095, {
      to: g,
    });
    const hg = new THREE.Group();
    hg.position.set(-0.01, 0.02, 0.2);
    hg.rotation.y = 0.35;
    g.add(hg);
    const tab = add(
      new RoundedBoxGeometry(0.016, 0.2, 0.27, 2, 0.006),
      MAT.black,
      0,
      0,
      0,
      { to: hg },
    );
    tab.rotation.z = -0.3;
    const sc = add(
      new THREE.BoxGeometry(0.002, 0.17, 0.24),
      MAT.ovenGlass,
      -0.009,
      0,
      0,
      { to: hg, cast: false },
    );
    sc.rotation.z = -0.3;
  }
  // Toit de la cabine Live, fermée au-dessus.
  box(3.9, 5.62, -4.1, -0.9, 0.05, MAT.whiteLam, 2.36);

  // Éclairage : environnement + lumière zénithale avec ombres douces.
  const pm = new THREE.PMREMGenerator(renderer);
  const envMap = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 0.4;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c6, 0.7));
  const sun = new THREE.DirectionalLight(0xfffaf2, 1.9);
  sun.position.set(5, 26, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -12,
    right: 12,
    top: 12,
    bottom: -12,
    near: 1,
    far: 60,
  });
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.06;
  sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xeef3ff, 0.6);
  fill.position.set(-10, 12, -6);
  scene.add(fill);

  // L'exposition du rendu assombrit le fond : on la compense, comme le fichier
  // d'origine, pour que le blanc du site reste blanc.
  scene.background = new THREE.Color(opts.colors.background).multiplyScalar(
    1.22,
  );

  // ---- Machines StyleShoots (modèles constructeur)
  const loader = new GLTFLoader();
  let disposed = false;
  loader
    .loadAsync(opts.modelUrl)
    .then((g) => {
      if (disposed) return;
      g.scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const key = Object.keys(MACHINES).find(
          (k) => o.name.startsWith(k) || o.parent?.name?.startsWith(k),
        );
        const M = key ? MACHINES[key] : undefined;
        if (!M) return;
        o.geometry.computeVertexNormals();
        if (o.name.endsWith('_glow')) o.material = MAT.lampGlow;
        else {
          // Couleurs de sommets stockées en sRGB dans le fichier.
          const ca = o.geometry.attributes.color;
          if (ca) {
            const n = ca.count;
            const f = new Float32Array(n * 3);
            const c = new THREE.Color();
            for (let k = 0; k < n; k++) {
              c.setRGB(
                ca.getX(k),
                ca.getY(k),
                ca.getZ(k),
              ).convertSRGBToLinear();
              f[k * 3] = c.r;
              f[k * 3 + 1] = c.g;
              f[k * 3 + 2] = c.b;
            }
            o.geometry.setAttribute('color', new THREE.BufferAttribute(f, 3));
          }
          o.material = MAT.machineV;
        }
        o.castShadow = true;
        o.receiveShadow = true;
        const w = new THREE.Group();
        w.position.set(...M.pos);
        w.rotation.y = M.ry;
        // Le clone garde la transformation du nœud (quantification).
        const c = o.clone();
        w.add(c);
        maq.add(w);
        maqMeshes.push(c);
      });
      invalidate();
    })
    .catch(opts.onError);

  // ---- Cotes
  const coteGroup = new THREE.Group();
  scene.add(coteGroup);
  {
    const mat = new THREE.LineBasicMaterial({ color: opts.colors.ink });
    for (const c of COTES) {
      const off = 0.7;
      const t = 0.25;
      const y = 0.02;
      const ox = c.o[0] * off;
      const oz = c.o[1] * off;
      const A = new THREE.Vector3(c.a[0] + ox, y, c.a[1] + oz);
      const B = new THREE.Vector3(c.b[0] + ox, y, c.b[1] + oz);
      const tick = new THREE.Vector3(c.o[0] * t, 0, c.o[1] * t);
      const pts = [
        A,
        B,
        A.clone().sub(tick),
        A.clone().add(tick),
        B.clone().sub(tick),
        B.clone().add(tick),
        new THREE.Vector3(c.a[0], y, c.a[1]),
        A.clone().add(tick),
        new THREE.Vector3(c.b[0], y, c.b[1]),
        B.clone().add(tick),
      ];
      coteGroup.add(
        new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(pts),
          mat,
        ),
      );
      const el = document.createElement('div');
      el.className =
        'whitespace-nowrap bg-background px-1 font-mono text-[11px] tabular-nums text-foreground';
      el.textContent = fmt(c.v);
      const lab = new CSS2DObject(el);
      lab.position.copy(A).add(B).multiplyScalar(0.5);
      coteGroup.add(lab);
    }
  }

  // ---- Zones
  const pins = new Map<ZoneId, HTMLButtonElement>();
  for (const z of opts.zones) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = z.label;
    // L'état choisi passe par l'inversion orange, comme la sélection partout
    // ailleurs sur le site ; `data-active` et non une classe ajoutée, pour que
    // tout le dessin reste écrit ici, en un seul endroit.
    el.className =
      'pointer-events-auto flex cursor-pointer items-center gap-1.5 whitespace-nowrap border border-foreground bg-background py-0.5 pr-1.5 pl-1 font-mono text-[10.5px] uppercase tracking-widest text-foreground before:size-1.5 before:bg-primary before:content-[""] hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[active]:border-primary data-[active]:bg-primary data-[active]:text-primary-foreground data-[active]:before:bg-primary-foreground';
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      opts.onZoneSelect(z.id);
    });
    const o = new CSS2DObject(el);
    o.position.set(z.pos[0], 1.2, z.pos[1]);
    scene.add(o);
    pins.set(z.id, el);
  }
  const movableZones = opts.zones.filter((z) => z.movable).map((z) => z.id);

  // ---- Coupe
  const setCut = (v: number) => {
    clip.constant = v;
    for (const t of tall) {
      // Tranche 1 cm sous le plan de coupe : à égalité, la tranche et le plan
      // scintillent.
      const vis = Math.max(0, Math.min(t.h, v - 0.01 - t.y0));
      t.m.visible = vis > 0.001;
      if (t.m.visible) {
        t.m.scale.y = vis / t.h;
        t.m.position.y = t.y0 + vis / 2;
      }
    }
    invalidate();
  };
  setCut(CUT_RANGE.initial);

  // ---- Post-traitement : occlusion ambiante (GTAO)
  // MSAA 4× sur la cible du post-traitement : sans lui, les arêtes et les
  // tranches de murs crénelaient, l'antialias du renderer ne s'appliquant pas
  // à une cible hors écran.
  const msaaTarget = new THREE.WebGLRenderTarget(800, 600, {
    type: THREE.HalfFloatType,
    samples: Math.min(4, renderer.capabilities.maxSamples || 4),
  });
  const composer = new EffectComposer(renderer, msaaTarget);
  const renderPass = new RenderPass(scene, persp);
  composer.addPass(renderPass);
  const gtao = new GTAOPass(
    scene,
    persp,
    stage.clientWidth || 800,
    stage.clientHeight || 600,
  );
  gtao.updateGtaoMaterial({
    radius: 0.6,
    distanceExponent: 1.6,
    thickness: 1.5,
    scale: 1.15,
    samples: 12,
  });
  gtao.blendIntensity = 0.9;
  gtao.normalMaterial.clippingPlanes = [clip];
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  const bindCamera = (
    c: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  ) => {
    renderPass.camera = c;
    gtao.camera = c;
    for (const m of [
      gtao.gtaoMaterial,
      gtao.pdMaterial,
      gtao.depthRenderMaterial,
    ])
      if (m.defines && 'PERSPECTIVE_CAMERA' in m.defines) {
        m.defines.PERSPECTIVE_CAMERA =
          c instanceof THREE.PerspectiveCamera ? 1 : 0;
        m.needsUpdate = true;
      }
    const gm = gtao.gtaoMaterial;
    gm.uniforms.cameraNear.value = c.near;
    gm.uniforms.cameraFar.value = c.far;
  };

  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    labelR.setSize(w, h);
    composer.setSize(w, h);
    persp.aspect = w / h;
    persp.updateProjectionMatrix();
    // Tout le plan et ses cotes tiennent à l'écran, quelle que soit sa forme.
    const a = w / h;
    const hh = Math.max(12.6, 8.8 / a);
    ortho.left = -hh * a;
    ortho.right = hh * a;
    ortho.top = hh;
    ortho.bottom = -hh;
    ortho.updateProjectionMatrix();
    invalidate();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);

  // ---- Vues
  // Le cadrage d'origine visait un écran paysage plein cadre ; une colonne
  // plus haute que large garde la maquette entière en reculant la caméra.
  const resetPersp = () => {
    const a = stage.clientWidth / (stage.clientHeight || 1);
    const k = a < 1.1 ? Math.min(1.7, (1.1 / a) ** 0.8) : 1;
    persp.position.set(17 * k, 17 * k, 22 * k);
    controls.target.set(0, 0.5, 0.5);
  };
  let cut: number = CUT_RANGE.initial;
  const setView = (view: StudioView) => {
    if (view === 'plan') {
      cam = ortho;
      controls.object = ortho;
      controls.enableRotate = false;
      ortho.position.set(0, 40, 0.9);
      ortho.up.set(0, 0, -1);
      controls.target.set(0, 0, 0.9);
      ortho.zoom = 1;
      // Au-dessus des machines, des colonnes et des cabines.
      if (cut < 3.2 || cut > 3.6) cut = 3.2;
    } else {
      cam = persp;
      controls.object = persp;
      controls.enableRotate = true;
      persp.up.set(0, 1, 0);
      resetPersp();
    }
    setCut(cut);
    resize();
    controls.update();
    return cut;
  };

  // ---- Mesure
  let measuring = false;
  let pending: { p: THREE.Vector3; m: THREE.Mesh } | null = null;
  const mGroup = new THREE.Group();
  scene.add(mGroup);
  const dotGeo = new THREE.SphereGeometry(0.06, 16, 12);
  const accent = new THREE.Color(opts.colors.accent);
  const dot = (p: THREE.Vector3) => {
    invalidate();
    const m = new THREE.Mesh(
      dotGeo,
      new THREE.MeshBasicMaterial({ color: accent, depthTest: false }),
    );
    m.renderOrder = 10;
    m.position.copy(p);
    mGroup.add(m);
    return m;
  };
  const setMeasuring = (on: boolean) => {
    measuring = on;
    if (!on && pending) {
      mGroup.remove(pending.m);
      pending = null;
      invalidate();
    }
    opts.onMeasureStep(on ? 'first' : 'off');
  };
  const clearMeasures = () => {
    mGroup.clear();
    pending = null;
    invalidate();
    if (measuring) opts.onMeasureStep('first');
  };

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down: [number, number] | null = null;
  const onDown = (e: PointerEvent) => {
    down = [e.clientX, e.clientY];
  };
  const onUp = (e: PointerEvent) => {
    if (
      !down ||
      Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 ||
      !measuring
    )
      return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(maqMeshes, false).find((h) => {
      if (h.point.y > clip.constant) return false;
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (!o.visible) return false;
        o = o.parent;
      }
      return true;
    });
    if (!hit) return;
    const p = hit.point.clone();
    if (!pending) {
      pending = { p, m: dot(p) };
      opts.onMeasureStep('second');
      return;
    }
    dot(p);
    const a = pending.p;
    pending = null;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([a, p]),
      new THREE.LineBasicMaterial({ color: accent, depthTest: false }),
    );
    line.renderOrder = 9;
    mGroup.add(line);
    const el = document.createElement('div');
    el.className =
      'whitespace-nowrap bg-primary px-1.5 py-0.5 font-mono text-xs tabular-nums text-primary-foreground';
    el.textContent = fmt(a.distanceTo(p));
    const lab = new CSS2DObject(el);
    lab.position.copy(a).add(p).multiplyScalar(0.5);
    mGroup.add(lab);
    invalidate();
    opts.onMeasureStep('first');
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  // ---- Plateau libre : masque le mobilier déplaçable pendant les shootings.
  const setFreeStage = (on: boolean) => {
    movable.visible = !on;
    for (const id of movableZones) {
      const pin = pins.get(id);
      if (pin) pin.hidden = on;
    }
    invalidate();
  };

  const setActiveZone = (id: ZoneId) => {
    for (const [zid, el] of pins) el.toggleAttribute('data-active', zid === id);
  };

  // ---- Rendu
  resetPersp();
  resize();
  controls.update();
  controls.addEventListener('change', invalidate);
  renderer.setAnimationLoop(() => {
    controls.update();
    if (!dirty) return;
    dirty = false;
    if (renderPass.camera !== cam)
      bindCamera(cam as THREE.PerspectiveCamera | THREE.OrthographicCamera);
    composer.render();
    labelR.render(scene, cam);
  });

  const dispose = () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    renderer.domElement.removeEventListener('pointerdown', onDown);
    renderer.domElement.removeEventListener('pointerup', onUp);
    controls.dispose();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose();
      }
    });
    for (const t of Object.values(TX)) t.dispose();
    envMap.dispose();
    composer.dispose();
    msaaTarget.dispose();
    gtao.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    labelsEl.remove();
  };

  return {
    setView,
    setFreeStage,
    setMeasuring,
    clearMeasures,
    setCut: (v) => {
      cut = v;
      setCut(v);
    },
    setActiveZone,
    dispose,
  };
}
