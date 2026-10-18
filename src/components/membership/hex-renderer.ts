/**
 * WebGL2 renderer for the membership hex-floor hero.
 *
 * The floor is a height field: every hexagonal tile is a solid column whose top height comes
 * from an idle wave plus the visitor's pointer trail. Each pixel marches its camera ray through
 * that field in short steps, asking only "is this point inside a tile?", then refines the first
 * solid sample by bisection (the relief-mapping technique). Tile tops show course thumbnails from
 * a texture atlas; tiles in the pointer trail lift and switch from a navy duotone to full colour.
 * CARSI's own implementation, written for this page.
 */
import { ATLAS_SLOT, atlasLayout, chooseHexMode, TILE_HASH } from './hex-geometry';

/** running: animating · paused: the visitor paused it · static: reduced motion · fallback: no canvas. */
export type HexState = 'running' | 'paused' | 'static' | 'fallback';

export interface HexMotion {
  userPaused: boolean;
  reducedMotion: boolean;
}

export interface HexRendererOptions {
  canvas: HTMLCanvasElement;
  /** Element that receives pointer events (the hero section, so text and buttons still work). */
  pointerTarget: HTMLElement;
  images: readonly string[];
  motion: HexMotion;
  onState: (state: HexState) => void;
}

export interface HexRenderer {
  setMotion(motion: HexMotion): void;
  destroy(): void;
}

const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 outColor;

uniform vec2 uRes;
uniform float uTime;
uniform float uCell;
uniform vec2 uPan;
uniform sampler2D uFlow;
uniform sampler2D uAtlas;
uniform vec2 uGrid;
uniform float uCount;
uniform float uAtlasReady;

const float ROW = 0.8660254;  // vertical spacing of tile rows (sqrt(3) / 2)
const float APO = 0.465;      // tile apothem; centres are 1 apart, so 0.5 would close the seams
const float FLOOR_Z = -0.55;
const float LIFT = 0.42;
const float TILT = 0.52;
const float FOCAL = 1.7;
const vec3 NAVY = vec3(0.024, 0.063, 0.114);
const vec3 WALL = vec3(0.055, 0.122, 0.224);
const vec3 BLUE = vec3(0.165, 0.522, 0.925);
const vec2 E0 = vec2(1.0, 0.0);
const vec2 E1 = vec2(0.5, 0.8660254);
const vec2 E2 = vec2(-0.5, 0.8660254);

vec3 camF; vec3 camU; vec3 camR; vec3 camO; float aspect;

uint tileHash(ivec2 a) {
  uint h = (uint(a.x) * ${TILE_HASH.a}u) ^ (uint(a.y) * ${TILE_HASH.b}u);
  h ^= h >> 13u;
  h *= ${TILE_HASH.c}u;
  h ^= h >> 16u;
  return h;
}

// Axial cell of a world point, by cube rounding (same maths as hex-geometry.ts cellAt).
ivec2 cellOf(vec2 p) {
  float r = p.y / ROW;
  float q = p.x - 0.5 * r;
  vec3 cube = vec3(q, r, -q - r);
  vec3 rounded = floor(cube + 0.5);
  vec3 err = abs(rounded - cube);
  if (err.x > err.y && err.x > err.z) rounded.x = -rounded.y - rounded.z;
  else if (err.y > err.z) rounded.y = -rounded.x - rounded.z;
  return ivec2(rounded.xy);
}

vec2 centreOf(ivec2 a) {
  return vec2(float(a.x) + 0.5 * float(a.y), float(a.y) * ROW);
}

// Distance from the tile centre to the hexagon edge along the worst of the three edge axes.
float hexRadius(vec2 d) {
  return max(abs(dot(d, E0)), max(abs(dot(d, E1)), abs(dot(d, E2))));
}

// The pointer trail lives in screen space: project the tile centre and read the flow there.
float trailAt(vec2 c) {
  vec3 v = vec3(c, 0.0) - camO;
  float depth = dot(v, camF);
  if (depth <= 0.0) return 0.0;
  vec2 s = vec2(dot(v, camR), dot(v, camU)) * FOCAL / depth;
  vec2 uv = vec2(s.x / aspect, s.y) * 0.5 + 0.5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
  return texture(uFlow, uv).r;
}

struct Tile { ivec2 ax; vec2 centre; uint hash; float lift; float top; };

Tile tileAt(vec2 p) {
  Tile t;
  t.ax = cellOf(p);
  t.centre = centreOf(t.ax);
  t.hash = tileHash(t.ax);
  t.lift = smoothstep(0.06, 0.85, trailAt(t.centre));
  float phase = float(t.hash & 1023u) / 1023.0 * 6.2831853;
  float idle = 0.045 * sin(uTime * 0.7 + phase)
             + 0.05 * sin(dot(t.centre, vec2(0.33, 0.21)) - uTime * 0.85);
  t.top = mix(idle, LIFT, t.lift);
  return t;
}

bool solid(vec3 p) {
  Tile t = tileAt(p.xy);
  return p.z <= t.top && hexRadius(p.xy - t.centre) <= APO;
}

vec3 courseImage(vec2 d, uint h) {
  vec2 uv = clamp(d / (2.0 * APO / ROW) + 0.5, 0.0, 1.0);
  float idx = float(h % uint(uCount));
  vec2 slot = vec2(mod(idx, uGrid.x), floor(idx / uGrid.x));
  vec2 inSlot = 0.03 + 0.94 * vec2(uv.x, 1.0 - uv.y);
  vec3 img = texture(uAtlas, (slot + inSlot) / uGrid).rgb;
  return mix(mix(WALL, BLUE * 0.6, uv.y), img, uAtlasReady);
}

void main() {
  aspect = uRes.x / uRes.y;
  vec2 ndc = vec2((vUv.x * 2.0 - 1.0) * aspect, vUv.y * 2.0 - 1.0);
  camF = vec3(0.0, sin(TILT), -cos(TILT));
  camU = vec3(0.0, cos(TILT), sin(TILT));
  camR = vec3(1.0, 0.0, 0.0);
  camO = vec3(uPan, 0.0) - camF * (0.5 * uRes.y / uCell) * FOCAL;
  vec3 dir = normalize(camF * FOCAL + camR * ndc.x + camU * ndc.y);

  // March from just above the highest possible tile down to the floor.
  float tStart = (LIFT + 0.12 - camO.z) / dir.z;
  float tEnd = (FLOOR_Z - camO.z) / dir.z;
  float stride = min(0.18 / max(length(dir.xy), 1.0e-3), 0.07 / abs(dir.z));
  float lo = tStart;
  float hi = tEnd;
  bool found = false;
  for (int i = 0; i < 64; i++) {
    float t = min(lo + stride, tEnd);
    if (solid(camO + dir * t)) { hi = t; found = true; break; }
    if (t >= tEnd) break;
    lo = t;
  }

  vec3 col = NAVY * 0.55;
  if (found) {
    for (int i = 0; i < 8; i++) {
      float mid = 0.5 * (lo + hi);
      if (solid(camO + dir * mid)) hi = mid; else lo = mid;
    }
    vec3 p = camO + dir * hi;
    Tile tile = tileAt(p.xy);
    vec2 d = p.xy - tile.centre;
    float belowTop = tile.top - p.z;
    float insideEdge = APO - hexRadius(d);
    vec3 light = normalize(vec3(-0.35, 0.45, 0.82));
    if (belowTop <= insideEdge) {
      vec3 img = courseImage(d, tile.hash);
      float lum = dot(img, vec3(0.299, 0.587, 0.114));
      vec3 duo = mix(NAVY * 1.4, BLUE * 0.9, lum) * 0.62;
      col = mix(duo, img * 1.06, tile.lift);
      col *= 0.9 + 0.22 * clamp(tile.top / LIFT, -0.3, 1.0);
      col += BLUE * (1.0 - smoothstep(0.0, 0.03, insideEdge)) * (0.22 + 0.55 * tile.lift);
      vec3 refl = reflect(dir, vec3(0.0, 0.0, 1.0));
      col += vec3(0.85, 0.92, 1.0) * pow(max(dot(refl, light), 0.0), 60.0) * 0.18 * (1.0 - tile.lift);
    } else {
      float a0 = dot(d, E0);
      float a1 = dot(d, E1);
      float a2 = dot(d, E2);
      vec2 side = abs(a0) >= abs(a1) && abs(a0) >= abs(a2) ? E0 * sign(a0)
                : (abs(a1) >= abs(a2) ? E1 * sign(a1) : E2 * sign(a2));
      float diff = max(dot(vec3(side, 0.0), light), 0.0);
      float ao = clamp((p.z - FLOOR_Z) / max(tile.top - FLOOR_Z, 0.01), 0.0, 1.0);
      col = WALL * (0.35 + 0.75 * diff) * (0.45 + 0.55 * ao) + BLUE * 0.18 * tile.lift;
    }
  }
  col = mix(col, NAVY * 0.7, smoothstep(0.15, 1.0, vUv.y) * 0.45);
  outColor = vec4(col, 1.0);
}`;

const FLOW_W = 64;
const FLOW_H = 36;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function stateFor(m: HexMotion): Exclude<HexState, 'fallback'> {
  if (m.reducedMotion) return 'static';
  return m.userPaused ? 'paused' : 'running';
}

/** Start the hero. Returns null (after reporting 'fallback') when WebGL2 or the shader fails. */
export function createHexRenderer(opts: HexRendererOptions): HexRenderer | null {
  const { canvas, pointerTarget, images, onState } = opts;
  let motion = opts.motion;
  const gl = canvas.getContext?.('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  // The reason is kept on the canvas so a fallback is never mistaken for a working floor.
  const fallback = (reason: string) => {
    canvas.dataset.hexFallback = reason;
    onState('fallback');
    return null;
  };
  const mode = chooseHexMode({ webgl2: !!gl, reducedMotion: motion.reducedMotion });
  if (!gl || mode === 'fallback') return fallback('no-webgl2');

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return fallback(vs ? 'fragment-shader' : 'vertex-shader');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return fallback('link');
  gl.useProgram(program);
  const u = (name: string) => gl.getUniformLocation(program, name);
  const uni = {
    res: u('uRes'),
    time: u('uTime'),
    cell: u('uCell'),
    pan: u('uPan'),
    flow: u('uFlow'),
    atlas: u('uAtlas'),
    grid: u('uGrid'),
    count: u('uCount'),
    ready: u('uAtlasReady'),
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  function texture(unit: number): WebGLTexture | null {
    const t = gl!.createTexture();
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    return t;
  }

  // Pointer trail: CPU grid, row 0 at the bottom of the screen (matches vUv).
  const flow = new Float32Array(FLOW_W * FLOW_H);
  const scratch = new Float32Array(FLOW_W * FLOW_H);
  const flowBytes = new Uint8Array(FLOW_W * FLOW_H);
  const flowTex = texture(0);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, FLOW_W, FLOW_H, 0, gl.RED, gl.UNSIGNED_BYTE, flowBytes);

  // Course atlas: placeholder pixel until every image has settled.
  const { cols, rows } = atlasLayout(images.length);
  const atlasTex = texture(1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([10, 30, 60, 255])
  );
  let atlasReady = 0;
  let destroyed = false;
  const atlas = document.createElement('canvas');
  atlas.width = cols * ATLAS_SLOT;
  atlas.height = rows * ATLAS_SLOT;
  const actx = atlas.getContext('2d');
  let settled = 0;
  images.forEach((src, i) => {
    const img = new Image();
    img.decoding = 'async';
    const x = (i % cols) * ATLAS_SLOT;
    const y = Math.floor(i / cols) * ATLAS_SLOT;
    const done = () => {
      settled += 1;
      if (settled === images.length && !destroyed && actx) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, atlasTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
        atlasReady = 1;
        if (stateFor(motion) !== 'running') draw();
      }
    };
    img.onload = () => {
      if (actx) {
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - s) / 2;
        const sy = (img.naturalHeight - s) / 2;
        actx.drawImage(img, sx, sy, s, s, x, y, ATLAS_SLOT, ATLAS_SLOT);
      }
      done();
    };
    img.onerror = () => {
      if (actx) {
        actx.fillStyle = '#0e2a4d';
        actx.fillRect(x, y, ATLAS_SLOT, ATLAS_SLOT);
      }
      done();
    };
    img.src = src;
  });

  // Pointer → trail splats (CSS pixels relative to the canvas).
  let pointer: { x: number; y: number } | null = null;
  let last: { x: number; y: number } | null = null;
  let lastInput = -1e9;
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    lastInput = performance.now();
  };
  const onLeave = () => {
    pointer = null;
    last = null;
  };
  pointerTarget.addEventListener('pointermove', onMove, { passive: true });
  pointerTarget.addEventListener('pointerleave', onLeave);

  function splat(x: number, y: number, strength: number) {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const gx = (x / w) * FLOW_W;
    const gy = (1 - y / h) * FLOW_H;
    const rad = 3.2;
    const x0 = Math.max(0, Math.floor(gx - rad * 2));
    const x1 = Math.min(FLOW_W - 1, Math.ceil(gx + rad * 2));
    const y0 = Math.max(0, Math.floor(gy - rad * 2));
    const y1 = Math.min(FLOW_H - 1, Math.ceil(gy + rad * 2));
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const d2 = (i + 0.5 - gx) ** 2 + (j + 0.5 - gy) ** 2;
        const k = j * FLOW_W + i;
        flow[k] = Math.min(1.4, flow[k] + strength * Math.exp(-d2 / (rad * rad)));
      }
    }
  }

  function stepFlow(dt: number, now: number) {
    if (pointer) {
      const speed = last ? Math.hypot(pointer.x - last.x, pointer.y - last.y) : 0;
      splat(pointer.x, pointer.y, Math.min(0.9, 0.18 + speed * 0.012));
      last = pointer;
    } else if (now - lastInput > 2500) {
      // Idle (and touch) visitors still see the effect: a slow ghost pointer wanders the floor.
      const t = now / 1000;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      splat(
        w * (0.5 + 0.38 * Math.sin(t * 0.37)),
        h * (0.62 + 0.25 * Math.sin(t * 0.53 + 1.3)),
        0.16
      );
    }
    const decay = Math.pow(0.978, dt * 60); // a stroke stays visible for about two seconds
    for (let j = 0; j < FLOW_H; j++) {
      for (let i = 0; i < FLOW_W; i++) {
        const k = j * FLOW_W + i;
        const l = flow[i > 0 ? k - 1 : k];
        const r = flow[i < FLOW_W - 1 ? k + 1 : k];
        const b = flow[j > 0 ? k - FLOW_W : k];
        const t = flow[j < FLOW_H - 1 ? k + FLOW_W : k];
        scratch[k] = (flow[k] * 0.8 + (l + r + b + t) * 0.05) * decay;
      }
    }
    flow.set(scratch);
    for (let k = 0; k < flow.length; k++) flowBytes[k] = Math.min(255, flow[k] * 255);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, flowTex);
    gl!.texSubImage2D(
      gl!.TEXTURE_2D,
      0,
      0,
      0,
      FLOW_W,
      FLOW_H,
      gl!.RED,
      gl!.UNSIGNED_BYTE,
      flowBytes
    );
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const budget = Math.sqrt(2_400_000 / Math.max(1, canvas.clientWidth * canvas.clientHeight));
    const scale = Math.min(dpr, budget);
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return scale;
  }

  // Scene clock: advances only while running, so pausing freezes the floor exactly where it is.
  let clock = 0;
  let frames = 0;
  function draw() {
    if (destroyed) return;
    const scale = resize();
    const cssCell = Math.min(150, Math.max(78, canvas.clientWidth / 10));
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.useProgram(program);
    gl!.uniform2f(uni.res, canvas.width, canvas.height);
    gl!.uniform1f(uni.time, clock);
    gl!.uniform1f(uni.cell, cssCell * scale);
    gl!.uniform2f(uni.pan, clock * 0.11, clock * 0.045);
    gl!.uniform1i(uni.flow, 0);
    gl!.uniform1i(uni.atlas, 1);
    gl!.uniform2f(uni.grid, cols, rows);
    gl!.uniform1f(uni.count, images.length);
    gl!.uniform1f(uni.ready, atlasReady);
    gl!.bindVertexArray(vao);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    frames += 1;
    canvas.dataset.hexFrames = String(frames);
    if (frames % 10 === 0 || stateFor(motion) !== 'running') {
      let sum = 0;
      for (let k = 0; k < flow.length; k++) sum += flow[k];
      canvas.dataset.hexFlow = sum.toFixed(1);
    }
  }

  let raf = 0;
  let visible = true;
  let prev = 0;
  function loop(now: number) {
    raf = 0;
    if (destroyed || stateFor(motion) !== 'running') return;
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    clock += dt;
    stepFlow(dt, now);
    draw();
    schedule();
  }
  function schedule() {
    if (raf || destroyed || !visible || document.hidden || stateFor(motion) !== 'running') return;
    prev = performance.now();
    raf = requestAnimationFrame(loop);
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    schedule();
  });
  io.observe(canvas);
  const onVisibility = () => schedule();
  document.addEventListener('visibilitychange', onVisibility);
  const ro = new ResizeObserver(() => {
    if (stateFor(motion) !== 'running') draw();
  });
  ro.observe(canvas);
  const onLost = (e: Event) => {
    e.preventDefault();
    destroyed = true;
    fallback('context-lost');
  };
  canvas.addEventListener('webglcontextlost', onLost);

  function apply() {
    const state = stateFor(motion);
    if (state !== 'running') {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      draw();
    }
    onState(state);
    schedule();
  }
  apply();

  return {
    setMotion(next) {
      if (destroyed) return;
      motion = next;
      apply();
    },
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      pointerTarget.removeEventListener('pointermove', onMove);
      pointerTarget.removeEventListener('pointerleave', onLeave);
      gl.deleteTexture(flowTex);
      gl.deleteTexture(atlasTex);
      gl.deleteBuffer(buf);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
