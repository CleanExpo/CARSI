/* CARSI lesson video — deterministic scene engine.
 * Everything is a pure function of time `t` (seconds) so the renderer can
 * seek frame-by-frame and capture identical output every run. No CSS
 * transitions, no requestAnimationFrame, no wall-clock reads. */
(function () {
  const BRAND = {
    primary: 'hsl(211 85% 54%)',
    primaryDeep: 'hsl(213 70% 16%)',
    primaryMid: 'hsl(207 83% 42%)',
    accent: 'hsl(36 87% 54%)',
    ink: '#0b1f33',
    paper: '#f7fbff',
  };

  // Injected by the renderer before load.
  const DATA = window.__LESSON__;
  const W = 1920, H = 1080;

  // ---- math helpers (Remotion-style) -------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function interp(t, inR, outR, ease) {
    const [i0, i1] = inR, [o0, o1] = outR;
    let p = clamp((t - i0) / (i1 - i0 || 1e-6), 0, 1);
    if (ease) p = ease(p);
    return o0 + (o1 - o0) * p;
  }
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeOutBack = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

  // ---- build DOM scaffold once -------------------------------------------
  const root = document.getElementById('stage');
  root.style.cssText = `position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${BRAND.primaryDeep};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;`;

  root.innerHTML = `
    <canvas id="bg" width="${W}" height="${H}" style="position:absolute;inset:0"></canvas>
    <div id="vignette" style="position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 38%, rgba(0,0,0,0) 40%, rgba(3,12,24,0.55) 100%);"></div>

    <!-- top bar -->
    <div style="position:absolute;top:64px;left:96px;display:flex;align-items:center;gap:18px;">
      <div id="logo" style="display:flex;align-items:center;gap:14px;">
        <div style="width:46px;height:46px;border-radius:12px;background:${BRAND.accent};display:flex;align-items:center;justify-content:center;font-weight:800;color:${BRAND.ink};font-size:24px;letter-spacing:-1px;">C</div>
        <div style="color:#fff;font-weight:700;font-size:26px;letter-spacing:3px;">CARSI</div>
      </div>
    </div>
    <div id="module" style="position:absolute;top:70px;right:96px;color:#bcd6f5;font-size:21px;font-weight:600;letter-spacing:.5px;"></div>

    <!-- scene counter -->
    <div id="counter" style="position:absolute;left:96px;top:188px;color:${BRAND.accent};font-weight:800;font-size:30px;letter-spacing:2px;font-variant-numeric:tabular-nums;"></div>

    <!-- main caption / kinetic text -->
    <div id="caption" style="position:absolute;left:96px;right:96px;top:300px;color:#ffffff;font-weight:700;line-height:1.14;letter-spacing:-1px;"></div>

    <!-- lesson title lower-left -->
    <div style="position:absolute;left:96px;bottom:120px;">
      <div style="color:#7fb0e6;font-size:20px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">Lesson</div>
      <div id="lessonTitle" style="color:#eaf3ff;font-size:34px;font-weight:700;max-width:1100px;"></div>
    </div>

    <!-- progress -->
    <div style="position:absolute;left:96px;right:96px;bottom:72px;height:6px;border-radius:3px;background:rgba(255,255,255,.14);">
      <div id="progress" style="height:100%;width:0;border-radius:3px;background:linear-gradient(90deg, ${BRAND.primary}, ${BRAND.accent});"></div>
    </div>
  `;

  const ctx = document.getElementById('bg').getContext('2d');
  const elCounter = document.getElementById('counter');
  const elCaption = document.getElementById('caption');
  const elModule = document.getElementById('module');
  const elProgress = document.getElementById('progress');
  document.getElementById('lessonTitle').textContent = DATA.lessonTitle;
  elModule.textContent = DATA.moduleTitle;

  const scenes = DATA.scenes; // [{text, start, end, words:[...] }]
  const TOTAL = DATA.total;

  // pre-split words per scene
  scenes.forEach((s) => { s.tokens = s.text.split(/\s+/); });

  // floating geometric accents (deterministic)
  const dots = Array.from({ length: 46 }, (_, i) => ({
    bx: (i * 137.5) % W,
    by: (i * 263.1) % H,
    r: 1.5 + (i % 5),
    sp: 0.06 + (i % 7) * 0.015,
    ph: i * 0.7,
  }));

  function drawBg(t) {
    // base vertical gradient
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a2742');
    g.addColorStop(0.55, '#0b2036');
    g.addColorStop(1, '#081726');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // slow diagonal sheen sweeping across
    const sweep = ((t * 0.06) % 1.6) - 0.3;
    const sg = ctx.createLinearGradient(sweep * W - 400, 0, sweep * W + 400, H);
    sg.addColorStop(0, 'rgba(56,140,225,0)');
    sg.addColorStop(0.5, 'rgba(56,140,225,0.10)');
    sg.addColorStop(1, 'rgba(56,140,225,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, H);

    // subtle grid
    ctx.strokeStyle = 'rgba(120,170,225,0.06)';
    ctx.lineWidth = 1;
    const off = (t * 12) % 80;
    for (let x = -80 + off; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = -80 + off; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // floating dots
    dots.forEach((d) => {
      const y = (d.by + t * 18 * d.sp * 6) % (H + 40) - 20;
      const a = 0.12 + 0.10 * Math.sin(t * d.sp * 3 + d.ph);
      ctx.beginPath();
      ctx.fillStyle = `rgba(150,195,245,${a.toFixed(3)})`;
      ctx.arc(d.bx, y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // accent ring bottom-right
    ctx.save();
    ctx.translate(W - 220, H - 230);
    const rot = t * 0.25;
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(244,178,60,0.18)';
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(0, 0, 150, 0.4, 0.4 + Math.PI * 1.3); ctx.stroke();
    ctx.restore();
  }

  function currentScene(t) {
    for (let i = 0; i < scenes.length; i++) if (t < scenes[i].end) return i;
    return scenes.length - 1;
  }

  function fontSizeFor(text) {
    const n = text.length;
    if (n < 60) return 78;
    if (n < 110) return 64;
    if (n < 170) return 54;
    return 46;
  }

  window.TOTAL = TOTAL;
  window.seek = function (t) {
    t = clamp(t, 0, TOTAL);
    drawBg(t);

    const si = currentScene(t);
    const s = scenes[si];
    const local = t - s.start;
    const dur = s.end - s.start;

    // counter
    elCounter.textContent = `${String(si + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
    const cIn = interp(local, [0, 0.5], [0, 1], easeOutCubic);
    elCounter.style.opacity = cIn;
    elCounter.style.transform = `translateX(${(1 - cIn) * -30}px)`;

    // caption: word-by-word reveal, sized to length
    const fs = fontSizeFor(s.text);
    elCaption.style.fontSize = fs + 'px';
    const revealWindow = Math.min(dur * 0.7, 2.6); // finish reveal partway in
    const perWord = revealWindow / Math.max(s.tokens.length, 1);
    let html = '';
    s.tokens.forEach((w, wi) => {
      const wt = wi * perWord;
      const p = clamp((local - wt) / 0.34, 0, 1);
      const e = easeOutCubic(p);
      const op = e;
      const ty = (1 - e) * 26;
      const clean = w.replace(/[.,;:]$/, '');
      const isKey = clean.length > 6 && /^[A-Za-z][a-z]+$/.test(clean) && (wi * 7 + s.start) % 4 === 0;
      html += `<span style="display:inline-block;opacity:${op.toFixed(3)};transform:translateY(${ty.toFixed(1)}px);color:${isKey ? '#ffd98a' : '#ffffff'};margin-right:.28em;">${escapeHtml(w)}</span>`;
    });
    elCaption.innerHTML = html;

    // scene-out fade near the very end of each scene for a clean cut
    const outP = interp(local, [dur - 0.32, dur], [1, 0], easeInOutCubic);
    elCaption.style.opacity = (dur > 0.7 ? outP : 1);

    // accent underline grows under caption
    // (rendered as box-shadow-free simple bar appended)

    // progress
    elProgress.style.width = (clamp(t / TOTAL, 0, 1) * 100).toFixed(3) + '%';

    return true;
  };

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // signal ready
  window.__READY__ = true;
})();
