/*
 * 그래프 (캔버스)
 *  KPHS.plot.create(el, { view:[xmin,xmax,ymin,ymax], equal:true })
 *    .add({ type:'fx', f, color, label })            y = f(x)
 *    .add({ type:'param', x, y, t:[t0,t1] })         매개변수 곡선
 *    .add({ type:'polar', r, t:[0, 2π] })            극좌표 r = r(θ)
 *    .add({ type:'implicit', F })                    F(x, y) = 0
 *    .add({ type:'points', pts:[[x,y,'A']] })        점 (이름표 선택)
 *    .add({ type:'poly', pts, close:true, fill })    꺾은선 / 다각형
 *  마우스 끌기: 이동, 휠·버튼: 확대/축소, 좌표 표시
 *  KPHS.plot3d.create(el).add({ pts:[[x,y,z],…], color })  끌어서 회전
 */
(function () {
  const K = (window.KPHS = window.KPHS || {});
  const PALETTE = ['#2456c7', '#d0342c', '#1d8a4e', '#b8680a', '#7b3fb8', '#0e8a8a', '#c43d86'];
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;

  function niceStep(range, target = 8) {
    const raw = range / target, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  const tickLabel = (v, step) => {
    if (Math.abs(v) < step / 1e6) return '0';
    const d = Math.max(0, -Math.floor(Math.log10(step)));
    return v.toFixed(Math.min(d, 8));
  };

  function create(el, opt = {}) {
    el.innerHTML = `<div class="plot">
      <canvas></canvas>
      <div class="plot-bar">
        <span class="plot-coord"></span>
        <span class="plot-legend"></span>
        <span class="plot-btns"><button type="button" data-z="0.7" title="확대">＋</button><button type="button" data-z="1.4" title="축소">－</button><button type="button" data-z="0" title="처음 보기">⟲</button></span>
      </div></div>`;
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
    const coord = el.querySelector('.plot-coord'), legend = el.querySelector('.plot-legend');
    const items = [];
    let [x0, x1, y0, y1] = opt.view || [-10, 10, -10, 10];
    const home = [x0, x1, y0, y1];
    let W = 0, H = 0, dpr = 1;

    const X = (x) => (x - x0) / (x1 - x0) * W, Y = (y) => H - (y - y0) / (y1 - y0) * H;
    const IX = (px) => x0 + px / W * (x1 - x0), IY = (py) => y0 + (H - py) / H * (y1 - y0);

    function fitEqual() {
      if (!opt.equal || !W) return;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = (x1 - x0) / W, sy = (y1 - y0) / H, s = Math.max(sx, sy);
      x0 = cx - s * W / 2; x1 = cx + s * W / 2; y0 = cy - s * H / 2; y1 = cy + s * H / 2;
    }
    function resize() {
      dpr = window.devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); fitEqual(); draw();
    }
    function grid() {
      const fg = css('--text', '#1c2230'), muted = css('--muted', '#5f6b7d'), line = css('--line', '#d9dee6');
      ctx.fillStyle = css('--surface', '#fff'); ctx.fillRect(0, 0, W, H);
      const sx = niceStep(x1 - x0, W / 70), sy = niceStep(y1 - y0, H / 50);
      ctx.lineWidth = 1; ctx.strokeStyle = line; ctx.globalAlpha = 0.7; ctx.beginPath();
      for (let x = Math.ceil(x0 / sx) * sx; x <= x1; x += sx) { ctx.moveTo(Math.round(X(x)) + .5, 0); ctx.lineTo(Math.round(X(x)) + .5, H); }
      for (let y = Math.ceil(y0 / sy) * sy; y <= y1; y += sy) { ctx.moveTo(0, Math.round(Y(y)) + .5); ctx.lineTo(W, Math.round(Y(y)) + .5); }
      ctx.stroke(); ctx.globalAlpha = 1;
      // 축
      const ax = Math.min(Math.max(Y(0), 0), H), ay = Math.min(Math.max(X(0), 0), W);
      ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(0, ax); ctx.lineTo(W, ax); ctx.moveTo(ay, 0); ctx.lineTo(ay, H); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let x = Math.ceil(x0 / sx) * sx; x <= x1; x += sx) if (Math.abs(x) > sx / 2) ctx.fillText(tickLabel(x, sx), X(x), Math.min(ax + 3, H - 14));
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let y = Math.ceil(y0 / sy) * sy; y <= y1; y += sy) if (Math.abs(y) > sy / 2) ctx.fillText(tickLabel(y, sy), Math.max(ay - 4, 30), Y(y));
      ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.fillText('x', W - 12, ax - 8); ctx.fillText('y', ay + 6, 10);
    }
    function path(pts) { // 불연속(점근선)에서 선을 끊음
      ctx.beginPath(); let pen = false, prev = null;
      for (const [x, y] of pts) {
        const ok = isFinite(x) && isFinite(y);
        const px = X(x), py = Y(y);
        const jump = prev && Math.abs(py - prev[1]) > H * 3;
        if (!ok || jump || Math.abs(py) > 1e6) { pen = false; prev = null; continue; }
        if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
        prev = [px, py];
      }
      ctx.stroke();
    }
    function sampleFx(f) {
      const pts = [], n = Math.max(400, W * 2);
      for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; let y; try { y = f(x); } catch (e) { y = NaN; } pts.push([x, y]); }
      // 점근선 판정: 부호가 바뀌고 크기가 큰 경우 끊기
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1][1], b = pts[i][1];
        if (a * b < 0 && Math.abs(a - b) > (y1 - y0) * 2) pts[i] = [pts[i][0], NaN];
      }
      return pts;
    }
    function sampleParam(fx, fy, t0, t1, n = 2000) {
      const pts = []; for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n; pts.push([fx(t), fy(t)]); } return pts;
    }
    function implicit(F) { // 마칭 스퀘어
      const n = 220, m = Math.round(n * H / W) || n, dx = (x1 - x0) / n, dy = (y1 - y0) / m, v = [];
      for (let j = 0; j <= m; j++) { v[j] = []; for (let i = 0; i <= n; i++) v[j][i] = F(x0 + i * dx, y0 + j * dy); }
      ctx.beginPath();
      const lerp = (a, b) => a / (a - b);
      for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
        const a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], d = v[j + 1][i];
        if (![a, b, c, d].every(isFinite)) continue;
        const e = [];
        if (a * b < 0) e.push([i + lerp(a, b), j]);
        if (b * c < 0) e.push([i + 1, j + lerp(b, c)]);
        if (c * d < 0) e.push([i + 1 - lerp(c, d), j + 1]);
        if (d * a < 0) e.push([i, j + 1 - lerp(d, a)]);
        for (let k = 0; k + 1 < e.length; k += 2) {
          ctx.moveTo(X(x0 + e[k][0] * dx), Y(y0 + e[k][1] * dy)); ctx.lineTo(X(x0 + e[k + 1][0] * dx), Y(y0 + e[k + 1][1] * dy));
        }
      }
      ctx.stroke();
    }
    function draw() {
      if (!W) return;
      grid();
      items.forEach((it, i) => {
        const color = it.color || PALETTE[i % PALETTE.length];
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = it.width || 2; ctx.setLineDash(it.dash || []);
        try {
          if (it.type === 'fx') path(sampleFx(it.f));
          else if (it.type === 'param') path(sampleParam(it.x, it.y, it.t[0], it.t[1], it.n));
          else if (it.type === 'polar') path(sampleParam(t => it.r(t) * Math.cos(t), t => it.r(t) * Math.sin(t), it.t[0], it.t[1], it.n));
          else if (it.type === 'implicit') implicit(it.F);
          else if (it.type === 'poly') {
            ctx.beginPath(); it.pts.forEach(([x, y], k) => (k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
            if (it.close) ctx.closePath();
            if (it.fill) { ctx.globalAlpha = 0.15; ctx.fill(); ctx.globalAlpha = 1; }
            ctx.stroke();
          } else if (it.type === 'area') { // x축과 f 사이 칠하기
            ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.moveTo(X(it.a), Y(0));
            for (let k = 0; k <= 300; k++) { const x = it.a + (it.b - it.a) * k / 300; ctx.lineTo(X(x), Y(it.f(x))); }
            ctx.lineTo(X(it.b), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
          } else if (it.type === 'points') {
            ctx.setLineDash([]); ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
            it.pts.forEach(([x, y, name]) => {
              ctx.beginPath(); ctx.arc(X(x), Y(y), it.r || 4, 0, 7); ctx.fill();
              if (name) ctx.fillText(name, X(x) + 6, Y(y) - 4);
            });
          }
        } catch (e) { /* 그릴 수 없는 곡선은 건너뜀 */ }
      });
      ctx.setLineDash([]);
      legend.innerHTML = items.filter(it => it.label).map((it) => {
        const c = it.color || PALETTE[items.indexOf(it) % PALETTE.length];
        return `<span><i style="background:${c}"></i>${it.label}</span>`;
      }).join('');
    }

    // 상호작용
    let drag = null;
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, v: [x0, x1, y0, y1] }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      coord.textContent = `(${K.num.dec(IX(px), 4)}, ${K.num.dec(IY(py), 4)})`;
      if (!drag) return;
      const dx = (e.clientX - drag.x) / W * (drag.v[1] - drag.v[0]), dy = (e.clientY - drag.y) / H * (drag.v[3] - drag.v[2]);
      [x0, x1, y0, y1] = [drag.v[0] - dx, drag.v[1] - dx, drag.v[2] + dy, drag.v[3] + dy]; draw();
    });
    cv.addEventListener('pointerup', () => (drag = null));
    const zoom = (k, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2) => {
      if (!k) { [x0, x1, y0, y1] = home; fitEqual(); draw(); return; }
      x0 = cx + (x0 - cx) * k; x1 = cx + (x1 - cx) * k; y0 = cy + (y0 - cy) * k; y1 = cy + (y1 - cy) * k; draw();
    };
    cv.addEventListener('wheel', e => {
      e.preventDefault(); const r = cv.getBoundingClientRect();
      zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, IX(e.clientX - r.left), IY(e.clientY - r.top));
    }, { passive: false });
    el.querySelectorAll('.plot-btns button').forEach(b => b.addEventListener('click', () => zoom(+b.dataset.z)));
    new ResizeObserver(resize).observe(cv);
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', draw);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const api = {
      add(it) { items.push(it); draw(); return api; },
      clear() { items.length = 0; draw(); return api; },
      view(v) { [x0, x1, y0, y1] = v; home.splice(0, 4, ...v); fitEqual(); draw(); return api; },
      redraw: draw
    };
    return api;
  }

  /** 곡선들이 들어갈 보기 범위 자동 계산 */
  function autoView(ptsList, pad = 0.12, equal = false) {
    let xs = [], ys = [];
    ptsList.forEach(pts => pts.forEach(([x, y]) => { if (isFinite(x) && isFinite(y)) { xs.push(x); ys.push(y); } }));
    if (!xs.length) return [-10, 10, -10, 10];
    const q = (a, p) => { const s = a.slice().sort((u, v) => u - v); return s[Math.floor((s.length - 1) * p)]; };
    let a = q(xs, 0.005), b = q(xs, 0.995), c = q(ys, 0.005), d = q(ys, 0.995);
    if (b - a < 1e-9) { a -= 1; b += 1; } if (d - c < 1e-9) { c -= 1; d += 1; }
    const px = (b - a) * pad, py = (d - c) * pad;
    return [a - px, b + px, c - py, d + py];
  }

  /* ---------- 3D 곡선 ---------- */
  function create3d(el) {
    el.innerHTML = `<div class="plot"><canvas></canvas><div class="plot-bar"><span class="plot-coord">끌어서 회전 · 휠로 확대</span><span class="plot-legend"></span>
      <span class="plot-btns"><button type="button" data-v="xy">xy</button><button type="button" data-v="yz">yz</button><button type="button" data-v="xz">xz</button><button type="button" data-v="iso">⟲</button></span></div></div>`;
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), legend = el.querySelector('.plot-legend');
    const items = []; let W = 0, H = 0, yaw = -0.6, pitch = 0.45, zoomK = 1, R = 1;
    const proj = ([x, y, z]) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const x1 = cy * x - sy * y, y1 = sy * x + cy * y;
      const y2 = cp * y1 - sp * z, z2 = sp * y1 + cp * z;
      const s = Math.min(W, H) * 0.38 * zoomK / R, persp = 1 / (1 + y2 / (R * 6));
      return [W / 2 + x1 * s * persp, H / 2 - z2 * s * persp, y2];
    };
    function draw() {
      if (!W) return;
      ctx.fillStyle = css('--surface', '#fff'); ctx.fillRect(0, 0, W, H);
      const muted = css('--muted', '#5f6b7d'), line = css('--line', '#d9dee6');
      // 바닥 격자 (z = 0)
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath();
      const g = R, st = niceStep(2 * g, 8);
      for (let v = -Math.floor(g / st) * st; v <= g; v += st) {
        let a = proj([v, -g, 0]), b = proj([v, g, 0]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        a = proj([-g, v, 0]); b = proj([g, v, 0]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
      // 축
      [['x', [g * 1.15, 0, 0]], ['y', [0, g * 1.15, 0]], ['z', [0, 0, g * 1.15]]].forEach(([n, p]) => {
        const o = proj([0, 0, 0]), q = proj(p);
        ctx.strokeStyle = muted; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        ctx.fillStyle = muted; ctx.font = '12px system-ui'; ctx.fillText(n, q[0] + 4, q[1]);
      });
      items.forEach((it, i) => {
        ctx.strokeStyle = ctx.fillStyle = it.color || PALETTE[i % PALETTE.length]; ctx.lineWidth = it.width || 2;
        if (it.points) { it.pts.forEach(p => { const q = proj(p); ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 7); ctx.fill(); if (p[3]) ctx.fillText(p[3], q[0] + 6, q[1] - 4); }); return; }
        ctx.beginPath(); let pen = false;
        it.pts.forEach(p => { if (!p.every(isFinite)) { pen = false; return; } const q = proj(p); if (pen) ctx.lineTo(q[0], q[1]); else { ctx.moveTo(q[0], q[1]); pen = true; } });
        ctx.stroke();
      });
      legend.innerHTML = items.filter(it => it.label).map((it) => `<span><i style="background:${it.color || PALETTE[items.indexOf(it) % PALETTE.length]}"></i>${it.label}</span>`).join('');
    }
    function resize() { const d = window.devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); draw(); }
    let drag = null;
    cv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, yaw, pitch]; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!drag) return; yaw = drag[2] - (e.clientX - drag[0]) * 0.01; pitch = Math.max(-1.5, Math.min(1.5, drag[3] + (e.clientY - drag[1]) * 0.01)); draw(); });
    cv.addEventListener('pointerup', () => (drag = null));
    cv.addEventListener('wheel', e => { e.preventDefault(); zoomK *= e.deltaY > 0 ? 0.9 : 1.1; draw(); }, { passive: false });
    el.querySelectorAll('.plot-btns button').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.v; zoomK = 1;
      if (v === 'xy') { yaw = 0; pitch = Math.PI / 2 - 0.001; } else if (v === 'xz') { yaw = 0; pitch = 0; } else if (v === 'yz') { yaw = -Math.PI / 2; pitch = 0; } else { yaw = -0.6; pitch = 0.45; }
      draw();
    }));
    new ResizeObserver(resize).observe(cv);
    const api = {
      add(it) { items.push(it); R = Math.max(1e-9, ...items.flatMap(t => t.pts.flatMap(p => p.slice(0, 3).filter(isFinite).map(Math.abs)))); draw(); return api; },
      redraw: draw
    };
    return api;
  }

  K.plot = { create, autoView, PALETTE };
  K.plot3d = { create: create3d };
})();
