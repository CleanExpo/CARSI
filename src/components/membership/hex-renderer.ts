/**
 * WebGL2 renderer for the membership hex-floor hero.
 *
 * Every pixel casts a ray from a tilted camera into a floor of hexagonal prisms and walks the
 * hex grid cell by cell until it hits a tile top, a tile wall or the floor. Each tile top shows
 * a course thumbnail from a texture atlas. A small CPU flow field (pointer trail, fades over
 * about a second) is uploaded every frame; tiles inside it lift towards the viewer and switch
 * from a dim navy duotone to full colour. CARSI's own implementation, written for this page.
 */
import { ATLAS_SLOT, atlasLayout, chooseHexMode, TILE_HASH } from './hex-geometry';

export type HexState = 'running' | 'static' | 'fallback';

export interface HexRendererOptions {
  canvas: HTMLCanvasElement;
  /** Element that receives pointer events (the hero section, so text and buttons still work). */
  pointerTarget: HTMLElement;
  images: readonly string[];
  reducedMotion: boolean;
  onState: (state: HexState) => void;
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

const float SQ3H = 0.8660254;
const float APO = 0.465;     // tile apothem; 0.5 would close the seams
const float FLOOR_Z = -0.55;
const float LIFT = 0.42;
const float TILT = 0.52;
const float FOCAL = 1.7;
const vec3 NAVY = vec3(0.024, 0.063, 0.114);
const vec3 WALL = vec3(0.055, 0.122, 0.224);
const vec3 BLUE = vec3(0.165, 0.522, 0.925);

vec3 gF; vec3 gU; vec3 gR; vec3 gO; float gAspect;

uint tileHash(ivec2 a) {
  uint h = (uint(a.x) * ${TILE_HASH.a}u) ^ (uint(a.y) * ${TILE_HASH.b}u);
  h ^= h >> 13u;
  h *= ${TILE_HASH.c}u;
  h ^= h >> 16u;
  return h;
}

vec2 normal(int k) {
  return k == 0 ? vec2(1.0, 0.0) : (k == 1 ? vec2(0.5, SQ3H) : vec2(-0.5, SQ3H));
}

ivec2 axialStep(int k) {
  return k == 0 ? ivec2(1, 0) : (k == 1 ? ivec2(0, 1) : ivec2(-1, 1));
}

ivec2 cellOf(vec2 p) {
  float r = p.y / SQ3H;
  float q = p.x - 0.5 * r;
  float s = -q - r;
  float rq = floor(q + 0.5);
  float rr = floor(r + 0.5);
  float rs = floor(s + 0.5);
  float dq = abs(rq - q);
  float dr = abs(rr - r);
  float ds = abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return ivec2(int(rq), int(rr));
}

vec2 centreOf(ivec2 a) {
  return vec2(float(a.x) + 0.5 * float(a.y), float(a.y) * SQ3H);
}

float hexDist(vec2 p) {
  return max(abs(p.x), max(abs(dot(p, normal(1))), abs(dot(p, normal(2)))));
}

// Screen-space flow under a world point (the pointer trail lives in screen space).
float flowAt(vec2 c) {
  vec3 v = vec3(c, 0.0) - gO;
  float z = dot(v, gF);
  if (z <= 0.0) return 0.0;
  vec2 s = vec2(dot(v, gR), dot(v, gU)) * FOCAL / z;
  vec2 uv = vec2(s.x / gAspect, s.y) * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture(uFlow, uv).r;
}

float tileTop(vec2 c, uint h, float lift) {
  float phase = float(h & 1023u) / 1023.0 * 6.2831853;
  float idle = 0.045 * sin(uTime * 0.7 + phase) + 0.05 * sin(dot(c, vec2(0.33, 0.21)) - uTime * 0.85);
  return mix(idle, LIFT, lift);
}

vec3 courseImage(vec2 local, uint h) {
  vec2 uv = clamp(local / (2.0 * APO / SQ3H) + 0.5, 0.0, 1.0);
  float idx = float(h % uint(uCount));
  float col = mod(idx, uGrid.x);
  float row = floor(idx / uGrid.x);
  vec2 inSlot = 0.03 + 0.94 * vec2(uv.x, 1.0 - uv.y);
  vec3 img = texture(uAtlas, (vec2(col, row) + inSlot) / uGrid).rgb;
  vec3 placeholder = mix(WALL, BLUE * 0.6, uv.y);
  return mix(placeholder, img, uAtlasReady);
}

void main() {
  gAspect = uRes.x / uRes.y;
  vec2 ndc = vec2((vUv.x * 2.0 - 1.0) * gAspect, vUv.y * 2.0 - 1.0);
  float halfH = 0.5 * uRes.y / uCell;
  gF = vec3(0.0, sin(TILT), -cos(TILT));
  gU = vec3(0.0, cos(TILT), sin(TILT));
  gR = vec3(1.0, 0.0, 0.0);
  gO = vec3(uPan, 0.0) - gF * halfH * FOCAL;
  vec3 rd = normalize(gF * FOCAL + gR * ndc.x + gU * ndc.y);

  float hMax = LIFT + 0.12;
  float t0 = (hMax - gO.z) / rd.z;
  float tFloor = (FLOOR_Z - gO.z) / rd.z;
  vec3 p0 = gO + rd * t0;
  ivec2 ax = cellOf(p0.xy);
  vec2 c = centreOf(ax);

  bool hit = false;
  bool onTop = false;
  float tHit = tFloor;
  vec3 n = vec3(0.0, 0.0, 1.0);
  float lift = 0.0;
  float top = 0.0;
  uint hHit = 0u;

  for (int i = 0; i < 40; i++) {
    uint h = tileHash(ax);
    float f = flowAt(c);
    float l = smoothstep(0.06, 0.85, f);
    float tz = tileTop(c, h, l);

    float tIn = -1.0e9;
    float tOut = 1.0e9;
    vec2 nIn = vec2(0.0);
    bool miss = false;
    for (int k = 0; k < 3; k++) {
      vec2 nk = normal(k);
      float d = dot(rd.xy, nk);
      float o = dot(gO.xy - c, nk);
      if (abs(d) < 1.0e-6) {
        if (abs(o) > APO) miss = true;
        continue;
      }
      float ta = (-APO - o) / d;
      float tb = (APO - o) / d;
      float lo = min(ta, tb);
      if (lo > tIn) { tIn = lo; nIn = -sign(d) * nk; }
      tOut = min(tOut, max(ta, tb));
    }
    float tTop = (tz - gO.z) / rd.z;
    float enter = max(tIn, tTop);
    if (!miss && enter <= min(tOut, tFloor)) {
      hit = true;
      onTop = tTop >= tIn;
      tHit = enter;
      n = onTop ? vec3(0.0, 0.0, 1.0) : vec3(nIn, 0.0);
      lift = l;
      top = tz;
      hHit = h;
      break;
    }

    float tExit = 1.0e9;
    int kExit = -1;
    float sExit = 0.0;
    for (int k = 0; k < 3; k++) {
      vec2 nk = normal(k);
      float d = dot(rd.xy, nk);
      if (abs(d) < 1.0e-6) continue;
      float te = (0.5 * sign(d) - dot(gO.xy - c, nk)) / d;
      if (te < tExit) { tExit = te; kExit = k; sExit = sign(d); }
    }
    if (kExit < 0 || tExit >= tFloor) break;
    c += sExit * normal(kExit);
    ax += int(sExit) * axialStep(kExit);
  }

  vec3 col;
  vec3 light = normalize(vec3(-0.35, 0.45, 0.82));
  if (!hit) {
    col = NAVY * 0.55;
  } else {
    vec3 p = gO + rd * tHit;
    vec2 local = p.xy - centreOf(ax);
    if (onTop) {
      vec3 img = courseImage(local, hHit);
      float lum = dot(img, vec3(0.299, 0.587, 0.114));
      vec3 duo = mix(NAVY * 1.4, BLUE * 0.9, lum) * 0.62;
      col = mix(duo, img * 1.06, lift);
      col *= 0.9 + 0.22 * clamp(top / LIFT, -0.3, 1.0);
      float rim = 1.0 - smoothstep(0.0, 0.03, APO - hexDist(local));
      col += BLUE * rim * (0.22 + 0.55 * lift);
      vec3 refl = reflect(rd, n);
      col += vec3(0.85, 0.92, 1.0) * pow(max(dot(refl, light), 0.0), 60.0) * 0.18 * (1.0 - lift);
    } else {
      float diff = max(dot(n, light), 0.0);
      float ao = clamp((p.z - FLOOR_Z) / max(top - FLOOR_Z, 0.01), 0.0, 1.0);
      col = WALL * (0.35 + 0.75 * diff) * (0.45 + 0.55 * ao) + BLUE * 0.18 * lift;
    }
  }
  float far = smoothstep(0.15, 1.0, vUv.y);
  col = mix(col, NAVY * 0.7, far * 0.45);
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

/** Start the hero. Returns null (after reporting 'fallback') when WebGL2 or the shader fails. */
export function createHexRenderer(opts: HexRendererOptions): { destroy(): void } | null {
  const { canvas, pointerTarget, images, reducedMotion, onState } = opts;
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
  const mode = chooseHexMode({ webgl2: !!gl, reducedMotion });
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

  // Flow field: CPU grid, row 0 at the bottom of the screen (matches vUv).
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
    const done = () => {
      settled += 1;
      if (settled === images.length && !destroyed && actx) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, atlasTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
        atlasReady = 1;
        if (mode === 'static') draw(0);
      }
    };
    img.onload = () => {
      if (actx) {
        const s = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - s) / 2;
        const sy = (img.naturalHeight - s) / 2;
        actx.drawImage(
          img,
          sx,
          sy,
          s,
          s,
          (i % cols) * ATLAS_SLOT,
          Math.floor(i / cols) * ATLAS_SLOT,
          ATLAS_SLOT,
          ATLAS_SLOT
        );
      }
      done();
    };
    img.onerror = () => {
      if (actx) {
        actx.fillStyle = '#0e2a4d';
        actx.fillRect(
          (i % cols) * ATLAS_SLOT,
          Math.floor(i / cols) * ATLAS_SLOT,
          ATLAS_SLOT,
          ATLAS_SLOT
        );
      }
      done();
    };
    img.src = src;
  });

  // Pointer → flow splats (CSS pixels relative to the canvas).
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
  if (mode === 'animate') {
    pointerTarget.addEventListener('pointermove', onMove, { passive: true });
    pointerTarget.addEventListener('pointerleave', onLeave);
  }

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
    const scale = Math.min(
      dpr,
      Math.sqrt(2_400_000 / Math.max(1, canvas.clientWidth * canvas.clientHeight))
    );
    const w = Math.max(1, Math.round(canvas.clientWidth * scale));
    const h = Math.max(1, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return scale;
  }

  let frames = 0;
  const start = performance.now();
  function draw(now: number) {
    const scale = resize();
    const t = mode === 'static' ? 4 : (now - start) / 1000;
    const cssCell = Math.min(150, Math.max(78, canvas.clientWidth / 10));
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.useProgram(program);
    gl!.uniform2f(uni.res, canvas.width, canvas.height);
    gl!.uniform1f(uni.time, t);
    gl!.uniform1f(uni.cell, cssCell * scale);
    gl!.uniform2f(uni.pan, t * 0.11, t * 0.045);
    gl!.uniform1i(uni.flow, 0);
    gl!.uniform1i(uni.atlas, 1);
    gl!.uniform2f(uni.grid, cols, rows);
    gl!.uniform1f(uni.count, images.length);
    gl!.uniform1f(uni.ready, atlasReady);
    gl!.bindVertexArray(vao);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    frames += 1;
    if (frames % 10 === 0 || mode === 'static') {
      canvas.dataset.hexFrames = String(frames);
      let sum = 0;
      for (let k = 0; k < flow.length; k++) sum += flow[k];
      canvas.dataset.hexFlow = sum.toFixed(1);
    }
  }

  let raf = 0;
  let visible = true;
  let prev = performance.now();
  function loop(now: number) {
    raf = 0;
    if (destroyed) return;
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    stepFlow(dt, now);
    draw(now);
    schedule();
  }
  function schedule() {
    if (!raf && visible && !document.hidden && mode === 'animate' && !destroyed) {
      prev = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    schedule();
  });
  io.observe(canvas);
  const onVisibility = () => schedule();
  document.addEventListener('visibilitychange', onVisibility);
  const ro = new ResizeObserver(() => {
    if (mode === 'static') draw(0);
  });
  ro.observe(canvas);
  const onLost = (e: Event) => {
    e.preventDefault();
    destroyed = true;
    onState('fallback');
  };
  canvas.addEventListener('webglcontextlost', onLost);

  if (mode === 'static') {
    draw(0);
    onState('static');
  } else {
    onState('running');
    schedule();
  }

  return {
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
