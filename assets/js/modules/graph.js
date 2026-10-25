/*
 * Graph 모듈 (원본: GraphTransformation1·2UMP, GraphPlaneCurveUMP_5, GraphNRootUMP,
 *              GraphNPolynomialUMP, Graph3DCurve1xyzUMP, ExampleOfAffineTransform, ExampleOfNTPSTapButtonUMP)
 *  그래프는 마우스로 끌어 이동, 휠·버튼으로 확대/축소할 수 있습니다.
 */
(function () {
  const K = window.KPHS, { register } = K;
  const N = K.num, E = K.expr, L = K.la;
  const f = (x) => N.fmt(x), d = (x) => N.dec(x, 8);
  const plotIn = (el, opt) => { const box = document.createElement('div'); el.appendChild(box); return K.plot.create(box, opt); };
  const fx = (src) => E.compile(src.replace(/^\s*(y|f\(x\))\s*=/, ''), ['x']);
  const fp = (v) => { const t = f(v); return /^-|\//.test(t) ? `(${t})` : t; }; // 곱셈식 안에서 괄호

  /* ---------- 공통: 이동 변환 ---------- */
  /** '평행 a, b' / 'x축' / 'y축' / '원점' / 'y=x' / 'y=-x' / '회전 θ' / '확대 k' / '점 a, b' / 'x=a' / 'y=b' → {map, desc} */
  function parseMove(m) {
    const t = m.replace(/\s/g, '');
    if (/^평행/.test(t)) { const [a, b] = E.nums(m.replace('평행', '')); return { map: ([x, y]) => [x + a, y + b], desc: `x 축으로 ${f(a)}, y 축으로 ${f(b)} 만큼 평행이동`, eq: (s) => `y − (${f(b)}) = ${s.replace(/x/g, `(x − (${f(a)}))`)}` }; }
    if (t === 'x축') return { map: ([x, y]) => [x, -y], desc: 'x 축에 대칭', eq: (s) => `y = −(${s})` };
    if (t === 'y축') return { map: ([x, y]) => [-x, y], desc: 'y 축에 대칭', eq: (s) => `y = ${s.replace(/x/g, '(−x)')}` };
    if (t === '원점') return { map: ([x, y]) => [-x, -y], desc: '원점에 대칭', eq: (s) => `y = −(${s.replace(/x/g, '(−x)')})` };
    if (t === 'y=x') return { map: ([x, y]) => [y, x], desc: '직선 y = x 에 대칭 (역함수)', eq: (s) => `x = ${s.replace(/x/g, 'y')}` };
    if (t === 'y=-x') return { map: ([x, y]) => [-y, -x], desc: '직선 y = −x 에 대칭', eq: (s) => `−x = ${s.replace(/x/g, '(−y)')}` };
    if (/^회전/.test(t)) { const th = E.num(m.replace('회전', '').replace('°', '')) * Math.PI / 180, c = Math.cos(th), s = Math.sin(th); return { map: ([x, y]) => [x * c - y * s, x * s + y * c], desc: `원점을 중심으로 ${N.dec(th * 180 / Math.PI)}° 회전`, rot: th }; }
    if (/^확대/.test(t)) { const [a, b = a] = E.nums(m.replace('확대', '')); return { map: ([x, y]) => [x * a, y * b], desc: `x 방향 ${f(a)}배, y 방향 ${f(b)}배 확대` }; }
    if (/^점/.test(t)) { const [a, b] = E.nums(m.replace('점', '').replace(/[()]/g, '')); return { map: ([x, y]) => [2 * a - x, 2 * b - y], desc: `점 (${f(a)}, ${f(b)}) 에 대칭` }; }
    if (/^x=/.test(t)) { const a = E.num(t.slice(2)); return { map: ([x, y]) => [2 * a - x, y], desc: `직선 x = ${f(a)} 에 대칭` }; }
    if (/^y=/.test(t)) { const b = E.num(t.slice(2)); return { map: ([x, y]) => [x, 2 * b - y], desc: `직선 y = ${f(b)} 에 대칭` }; }
    throw new Error('이동: 평행 a, b / x축 / y축 / 원점 / y=x / y=-x / 회전 θ / 확대 k / 점 a, b / x=a / y=b');
  }
  const moveHelp = 'f(x) ; 이동  — 이동은 평행 a, b · x축 · y축 · 원점 · y=x · y=-x · 회전 θ(도) · 확대 k (또는 kx, ky)';
  /** 이동 종류별 식 바꾸는 규칙 */
  const MOVE_RULE = {
    평행: '(a, b) 평행이동: x 대신 x − a, y 대신 y − b',
    x축: 'x 축 대칭: y 대신 −y',
    y축: 'y 축 대칭: x 대신 −x',
    원점: '원점 대칭: x 대신 −x, y 대신 −y',
    'y=x': 'y = x 대칭: x 와 y 를 바꿈 (역함수)',
    'y=-x': 'y = −x 대칭: x 대신 −y, y 대신 −x',
    회전: 'θ 회전: 점 (x, y) → (x cosθ − y sinθ, x sinθ + y cosθ),  식에는 −θ 회전한 좌표를 대입',
    확대: '(kx, ky) 배 확대: x 대신 x/kx, y 대신 y/ky',
    점: '점 (a, b) 대칭: x 대신 2a − x, y 대신 2b − y',
    'x=': '직선 x = a 대칭: x 대신 2a − x',
    'y=': '직선 y = b 대칭: y 대신 2b − y'
  };

  /* ---------------- 평면곡선1  y = f(x) 와 이동 ---------------- */
  register('graph', 'curve1', {
    ops: [
      {
        id: 'fx', name: 'y = f(x) 그래프와 이동',
        note: moveHelp + '.  이동 없이 함수만 넣어도 됩니다. 함수 여러 개는 | 로 나눔',
        help: [['sin(x); 평행 pi/2, 1', ''], ['x^2 - 2x; y=x', '역함수 관계'], ['exp(x); x축', ''], ['x^3 - 3x; 회전 45', '좌표축과 함께 회전'], ['log(x); 확대 2, 1', ''], ['sin(x) | cos(x) | tan(x)', '여러 함수']],
        run(s) {
          const [fs, mv] = s.split(';').map(t => t && t.trim());
          const list = fs.split('|').map(t => t.trim()).filter(Boolean), fns = list.map(fx);
          const move = mv ? parseMove(mv) : null;
          let h = `<p>${list.map((t, i) => `y<sub>${i + 1}</sub> = ${K.esc(t)}`).join(',  ')}</p>`;
          if (move) h += `<p>${move.desc}${move.eq && list.length === 1 ? ` → <b>${K.esc(move.eq(list[0].replace(/^\s*y\s*=/, '')))}</b>` : ''}</p>`;
          if (move) h += K.solve([
            ['이동한 그래프 위의 점 (x, y) 를 거꾸로 옮기면 처음 그래프 위에 있음', MOVE_RULE[mv.replace(/\s/g, '').replace(/[\d.,\-−°]+$/, '').replace(/^(평행|회전|확대|점).*/, '$1')] || move.desc],
            ...(move.eq && list.length === 1 ? [['y = f(x) 에 대입', K.esc(move.eq(list[0].replace(/^\s*y\s*=/, '')))]] : []),
            ['예: 그래프 위의 한 점이 옮겨지는 곳', (() => { const x0 = 1, y0 = fns[0](x0), q = move.map([x0, y0]); return isFinite(y0) ? `(${d(x0)}, ${d(y0)}) → (${d(q[0])}, ${d(q[1])})` : '−'; })()]
          ]);
          return {
            html: h, mount(el) {
              const pl = plotIn(el, { view: [-10, 10, -7, 7], equal: true });
              fns.forEach((g, i) => pl.add({ type: 'fx', f: g, label: list.length > 1 ? `y${i + 1} = ${list[i]}` : `y = ${list[i]}` }));
              if (move) {
                fns.forEach((g) => pl.add({ type: 'param', x: t => move.map([t, g(t)])[0], y: t => move.map([t, g(t)])[1], t: [-30, 30], n: 6000, label: '이동한 그래프', color: '#d0342c' }));
                if (move.rot !== undefined) { const r = move.rot; pl.add({ type: 'param', x: t => t * Math.cos(r), y: t => t * Math.sin(r), t: [-40, 40], dash: [6, 4], width: 1, color: '#8a94a6', label: '회전한 좌표축' }).add({ type: 'param', x: t => -t * Math.sin(r), y: t => t * Math.cos(r), t: [-40, 40], dash: [6, 4], width: 1, color: '#8a94a6' }); }
              }
            }
          };
        }
      },
      {
        id: 'family', name: '계수를 바꾸며 비교  y = a·f(b(x − c)) + d',
        note: '입력: f(x) ; a, b, c, d',
        help: [['sin(x); 2, 1, 0, 0', '진폭 2배'], ['sin(x); 1, 2, 0, 0', '주기 절반'], ['x^2; 1, 1, 2, -3', '꼭짓점 (2, −3)'], ['sqrt(x); -1, 1, 0, 2', '']],
        run(s) {
          const [src, p] = s.split(';'); const g = fx(src.trim()), [a, b, c, dd] = E.nums(p);
          return { html: `<p>y = ${f(a)}·f(${f(b)}(x − ${f(c)})) + ${f(dd)}</p><p class="muted">a: 세로 확대·대칭, b: 가로 확대(주기 1/|b| 배), c: 가로 평행이동, d: 세로 평행이동</p>` + K.solve([
            ['y = f(x) 에서 차례로 바꾸기', [
              `① x 대신 ${f(b)}x : 가로로 1/${f(Math.abs(b))} 배${b < 0 ? ', y 축 대칭' : ''}`,
              `② x 대신 x − ${f(c)} : x 축 방향으로 ${f(c)} 만큼 평행이동`,
              `③ 전체에 ${f(a)} 곱하기 : 세로로 ${f(Math.abs(a))} 배${a < 0 ? ', x 축 대칭' : ''}`,
              `④ ${f(dd)} 더하기 : y 축 방향으로 ${f(dd)} 만큼 평행이동`]],
            ['점이 옮겨지는 규칙', `(x, y) → (x/${fp(b)} + ${fp(c)}, ${fp(a)}·y + ${fp(dd)})`]
          ]), mount(el) { plotIn(el, { view: [-10, 10, -7, 7], equal: true }).add({ type: 'fx', f: g, label: `y = ${src.trim()}` }).add({ type: 'fx', f: x => a * g(b * (x - c)) + dd, label: '바꾼 그래프' }); } };
        }
      }
    ]
  });

  /* ---------------- 평면곡선2  음함수 · 극좌표 와 이동 ---------------- */
  register('graph', 'curve2', {
    ops: [
      {
        id: 'implicit', name: '음함수  F(x, y) = 0 과 이동',
        note: '입력: 식 ; 이동  (이동은 평행 a, b · x축 · y축 · 원점 · y=x · 회전 θ · 점 a, b · x=a · y=b)',
        help: [['x^2/9 + y^2/4 = 1; 회전 30', '타원 회전'], ['x^2 - y^2 = 1; 평행 2, 1', '쌍곡선'], ['y^2 = 4x; x=3', '포물선을 직선 x = 3 에 대칭'], ['x^3 + y^3 = 3xy', '데카르트의 엽선'], ['(x^2 + y^2)^2 = 8(x^2 - y^2)', '렘니스케이트']],
        run(s) {
          const [src, mv] = s.split(';').map(t => t && t.trim()); const [l, r = '0'] = src.split('=');
          const F = E.compile(`(${l}) - (${r})`, ['x', 'y']); const move = mv ? parseMove(mv) : null;
          // 이동 후 도형: 점 P 가 이동 후 도형 위 ⇔ 역변환(P) 가 처음 도형 위.  역변환은 수치적으로 (선형이므로 두 점으로)
          let G = null;
          if (move) {
            const o = move.map([0, 0]), ex = V2(move.map([1, 0]), o), ey = V2(move.map([0, 1]), o), det = ex[0] * ey[1] - ex[1] * ey[0];
            G = (x, y) => { const px = x - o[0], py = y - o[1]; return F((px * ey[1] - py * ey[0]) / det, (ex[0] * py - ex[1] * px) / det); };
          }
          const key = mv ? mv.replace(/\s/g, '').replace(/[\d.,\-−°]+$/, '').replace(/^(평행|회전|확대|점).*/, '$1').replace(/^([xy]=).*/, '$1') : '';
          return { html: `<p>${K.esc(src)}${move ? `  →  ${move.desc}` : ''}</p>` + (move ? K.solve([
            ['F(x, y) = 0 꼴로', `${K.esc(l.trim())} − (${K.esc(r.trim())}) = 0`],
            ['이동한 곡선 위의 점을 거꾸로 옮겨 F 에 대입', MOVE_RULE[key] || move.desc],
            ['예: 점이 옮겨지는 곳', `(1, 0) → (${move.map([1, 0]).map(d).join(', ')}),  (0, 1) → (${move.map([0, 1]).map(d).join(', ')})`]
          ]) : ''), mount(el) { const pl = plotIn(el, { view: [-8, 8, -6, 6], equal: true }).add({ type: 'implicit', F, label: '처음 곡선' }); if (G) pl.add({ type: 'implicit', F: G, label: '이동한 곡선', color: '#d0342c' }); } };
        }
      },
      {
        id: 'polar', name: '극좌표  r = f(θ)',
        note: '입력: r(θ) ; θ 범위 (기본 0 ~ 2π).  θ 대신 t 를 써도 됩니다.',
        help: [['1 + cos(θ)', '카디오이드'], ['2sin(3θ)', '장미곡선'], ['θ/4; 0, 6pi', '아르키메데스 나선'], ['1/(1 - 0.5cos(θ))', '이심률 0.5 타원'], ['sqrt(4cos(2θ))', '렘니스케이트']],
        run(s) {
          const [src, rg] = s.split(';'); const r = E.compile(src.replace(/θ/g, 't').replace(/^\s*r\s*=/, ''), ['t']); const [t0, t1] = rg ? E.nums(rg) : [0, 2 * Math.PI];
          const pts = []; for (let i = 0; i <= 400; i++) { const t = t0 + (t1 - t0) * i / 400, v = r(t); pts.push([v * Math.cos(t), v * Math.sin(t)]); }
          const area = 0.5 * N.integrate(t => { const v = r(t); return isFinite(v) ? v * v : 0; }, t0, t1);
          return { html: `<p>r = ${K.esc(src)},  ${d(t0)} ≤ θ ≤ ${d(t1)}</p><p>휩쓴 넓이 ½∫r²dθ = ${N.exact(area)}</p>` + K.solve([
            ['극좌표 → 직교좌표  x = r cos θ,  y = r sin θ', [0, 1, 2, 3].map(k => { const t = t0 + (t1 - t0) * k / 4, v = r(t); return `θ = ${d(t)}: r = ${d(v)} → (${d(v * Math.cos(t))}, ${d(v * Math.sin(t))})`; })],
            ['부채꼴 넓이를 모음  S = ½∫ r² dθ', `½ ∫<sub>${d(t0)}</sub><sup>${d(t1)}</sup> (${K.esc(src.trim())})² dθ = ${N.exactShort(area)}  (수치적분)`]
          ]), mount(el) { plotIn(el, { view: K.plot.autoView([pts], 0.15), equal: true }).add({ type: 'polar', r, t: [t0, t1], n: 3000, label: `r = ${src.trim()}` }); } };
        }
      }
    ]
  });
  const V2 = (a, b) => [a[0] - b[0], a[1] - b[1]];

  /* ---------------- 평면곡선3  매개변수 곡선 모음 ---------------- */
  const CURVES = [
    ['hypo', '하이포사이클로이드 (Hypocycloid)', 'a, n', [4, 4], (a, n) => [t => a / n * ((n - 1) * Math.cos(t) + Math.cos((n - 1) * t)), t => a / n * ((n - 1) * Math.sin(t) - Math.sin((n - 1) * t))], 'x = a/n[(n−1)cosθ + cos(n−1)θ], y = a/n[(n−1)sinθ − sin(n−1)θ].  n = 4 이면 성망형(아스트로이드)', (a, n) => [0, 2 * Math.PI * (Number.isInteger(n) ? 1 : 10)]],
    ['epi', '에피사이클로이드 (Epicycloid)', 'b, n', [1, 3], (b, n) => [t => b * ((n + 1) * Math.cos(t) - Math.cos((n + 1) * t)), t => b * ((n + 1) * Math.sin(t) - Math.sin((n + 1) * t))], 'x = b[(n+1)cosθ − cos(n+1)θ], y = b[(n+1)sinθ − sin(n+1)θ].  n = 1 카디오이드, n = 2 네프로이드', (b, n) => [0, 2 * Math.PI * (Number.isInteger(n) ? 1 : 10)]],
    ['folium', '엽선 (Folium)', 'a, b', [1, 1], (a, b) => [t => Math.cos(t) ** 2 * (4 * b * Math.sin(t) ** 2 - a), t => Math.cos(t) * Math.sin(t) * (4 * b * Math.sin(t) ** 2 - a)], 'x = cos²θ(4b sin²θ − a), y = cosθ sinθ(4b sin²θ − a).  0 &lt; a &lt; 4b 세잎, b ≥ 4a 한 잎'],
    ['rose', '장미곡선 (Rose)', 'a, n', [2, 3], (a, n) => [t => a * Math.cos(n * t) * Math.cos(t), t => a * Math.cos(n * t) * Math.sin(t)], 'r = a cos(nθ).  n 홀수 → 잎 n 개, n 짝수 → 잎 2n 개, n 이 유리수이면 겹친 닫힌 곡선', (a, n) => [0, 2 * Math.PI * (Number.isInteger(n) ? 1 : 12)]],
    ['cycloid', '사이클로이드 · 트로코이드 (Cycloid)', 'a, b', [1, 1], (a, b) => [t => a * t - b * Math.sin(t), t => a - b * Math.cos(t)], 'x = aθ − b sinθ, y = a − b cosθ.  a = b 사이클로이드 (한 아치의 넓이 3πa², 길이 8a), a > b 단축, a &lt; b 장축 트로코이드', () => [0, 6 * Math.PI]],
    ['fish', '물고기 곡선 (Fish Curve)', 'a', [2], (a) => [t => a * Math.cos(t) - a / Math.SQRT2 * Math.sin(t) ** 2, t => a * Math.cos(t) * Math.sin(t)], 'x = a cosθ − (a/√2)sin²θ, y = a cosθ sinθ'],
    ['cissoid', '디오클레스의 질주선 (Cissoid)', 'a', [1], (a) => [t => 2 * a * Math.sin(t) ** 2, t => 2 * a * Math.sin(t) ** 2 * Math.tan(t)], 'x = 2a sin²θ, y = 2a sin²θ tanθ.  점근선 x = 2a', () => [-1.35, 1.35]],
    ['lissajous', '리사주 곡선 (Lissajous)', 'a, b, n', [3, 2, 1.5], (a, b, n) => [t => a * Math.cos(n * t), t => b * Math.sin(t)], 'x = a cos(nθ), y = b sinθ.  n 이 유리수이면 닫힌 곡선', (a, b, n) => [0, 2 * Math.PI * (Number.isInteger(n) ? 1 : Number.isInteger(2 * n) ? 2 : 10)]],
    ['logspiral', '로그 나선 (Logarithmic Spiral)', 'a, b', [0.5, 0.15], (a, b) => [t => a * Math.exp(b * t) * Math.cos(t), t => a * Math.exp(b * t) * Math.sin(t)], 'r = a·e^(bθ).  모든 반지름과 일정한 각을 이룸 (등각나선)', () => [-4 * Math.PI, 4 * Math.PI]],
    ['archi', '아르키메데스 나선 · 페르마 나선', 'a, n', [0.5, 1], (a, n) => [t => a * Math.pow(t, 1 / n) * Math.cos(t), t => a * Math.pow(t, 1 / n) * Math.sin(t)], 'r = a·θ^(1/n).  n = 1 아르키메데스, n = 2 페르마 나선', () => [0, 6 * Math.PI]],
    ['epispiral', '에피 나선 (Epispiral)', 'a, n', [1, 3], (a, n) => [t => a / Math.cos(n * t) * Math.cos(t), t => a / Math.cos(n * t) * Math.sin(t)], 'r = a·sec(nθ)', (a, n) => [0, 2 * Math.PI]],
    ['limacon', '리마송 (Limaçon)', 'a, b', [2, 1], (a, b) => [t => (b + a * Math.cos(t)) * Math.cos(t), t => (b + a * Math.cos(t)) * Math.sin(t)], 'r = b + a cosθ.  a = b 카디오이드, b &lt; a 안쪽 고리, a &lt; b &lt; 2a 보조개형, 2b = a 삼등분선']
  ];
  register('graph', 'curve3', {
    ops: [...CURVES.map(([id, name, params, def, make, desc, range]) => ({
      id, name, note: `매개변수 ${params} (기본값 ${def.join(', ')}).  ${desc}`,
      help: [[def.join(', '), '기본값'], ...(id === 'hypo' ? [['3, 3', '델토이드'], ['5, 2.5', '']] : id === 'rose' ? [['2, 4', ''], ['2, 2.5', '']] : id === 'epi' ? [['1, 1', '카디오이드'], ['1, 2', '네프로이드']] : id === 'cycloid' ? [['1, 0.5', '단축 트로코이드'], ['1, 2', '장축 트로코이드']] : id === 'limacon' ? [['1, 1', '카디오이드'], ['2, 3', '보조개형']] : id === 'lissajous' ? [['3, 3, 2', ''], ['3, 2, 5/4', '']] : [])],
      run(s) {
        const p = s.trim() ? E.nums(s) : def; const ps = def.map((v, i) => (p[i] === undefined ? v : p[i]));
        const [X, Y] = make(...ps), [t0, t1] = range ? range(...ps) : [0, 2 * Math.PI];
        const pts = []; for (let i = 0; i <= 600; i++) { const t = t0 + (t1 - t0) * i / 600; pts.push([X(t), Y(t)]); }
        let len = 0; for (let i = 1; i < pts.length; i++) { const dl = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (isFinite(dl) && dl < 5) len += dl; }
        return { html: `<p><b>${name}</b>  (${params.split(', ').map((q, i) => `${q} = ${f(ps[i])}`).join(', ')})</p><p class="muted">${desc}</p><p>그린 구간 θ ∈ [${d(t0)}, ${d(t1)}],  곡선의 길이 ≈ ${d(len)}</p>` + K.solve([
          ['매개변수에 값을 넣어 점 찍기', [0, 1, 2, 3].map(k => { const t = t0 + (t1 - t0) * k / 4; return `θ = ${d(t)}: (${d(X(t))}, ${d(Y(t))})`; })],
          ['곡선의 길이  L = ∫ √(x′(θ)² + y′(θ)²) dθ', `짧은 선분 600개의 길이를 더해 근사 → L ≈ ${d(len)}`]
        ]), mount(el) { plotIn(el, { view: K.plot.autoView([pts], 0.12), equal: true }).add({ type: 'param', x: X, y: Y, t: [t0, t1], n: 5000, label: name.replace(/ \(.*/, '') }); } };
      }
    })), {
      id: 'custom', name: '직접 입력  x(t), y(t)',
      note: '입력: x(t) , y(t) ; t 시작, t 끝',
      help: [['cos(3t), sin(2t); 0, 2pi', ''], ['t - sin(t), 1 - cos(t); 0, 4pi', '사이클로이드'], ['cos(t)^3, sin(t)^3; 0, 2pi', '아스트로이드']],
      run(s) {
        const [xy, rg] = s.split(';'), [xs, ys] = E.splitTop(xy, ','), X = E.compile(xs, ['t']), Y = E.compile(ys, ['t']), [t0, t1] = rg ? E.nums(rg) : [0, 2 * Math.PI];
        const pts = []; for (let i = 0; i <= 600; i++) { const t = t0 + (t1 - t0) * i / 600; pts.push([X(t), Y(t)]); }
        return { html: `<p>x = ${K.esc(xs)}, y = ${K.esc(ys)},  ${d(t0)} ≤ t ≤ ${d(t1)}</p>`, mount(el) { plotIn(el, { view: K.plot.autoView([pts], 0.12), equal: true }).add({ type: 'param', x: X, y: Y, t: [t0, t1], n: 4000, label: '곡선' }); } };
      }
    }]
  });

  /* ---------------- 그래프 교점 ---------------- */
  register('graph', 'intersect', {
    ops: [{
      id: 'two', name: '두 그래프의 교점  f(x) = g(x)',
      note: '입력: f(x) ; g(x) ; 범위 a, b (기본 −10 ~ 10)',
      help: [['sin(x); cos(2x); -pi, pi', '접하는 점 포함'], ['sqrt(x); x', ''], ['x^3 - 3x; x - 1', ''], ['exp(x); x + 2', ''], ['2sin(x); 1/cos(x); -3, 3', '']],
      run(s) {
        const [a, b, rg] = s.split(';').map(t => t && t.trim()); if (!b) throw new Error('f(x) ; g(x) 를 입력하세요.');
        const F = fx(a), G = fx(b), [x0, x1] = rg ? E.nums(rg) : [-10, 10], h = (x) => F(x) - G(x);
        const rs = N.roots(h, x0, x1, 8000).filter(x => isFinite(F(x)) && isFinite(G(x)) && Math.abs(h(x)) < 1e-7 * Math.max(1, Math.abs(F(x))));
        return {
          html: `<p>f(x) = ${K.esc(a)},  g(x) = ${K.esc(b)},  [${d(x0)}, ${d(x1)}]</p>` + (rs.length ? N.table(rs.map((x, i) => [i + 1, N.exact(x), N.exact(F(x))]), ['#', 'x', 'y']) : '<p><b>교점이 없습니다.</b></p>') + K.solve([
            ['교점의 x 좌표는 h(x) = f(x) − g(x) = 0 의 근', `h(x) = (${K.esc(a)}) − (${K.esc(b)})`],
            ['구간을 잘게 나누어 h 의 부호가 바뀌거나 0 에 닿는 곳을 찾고, 이분법·뉴턴법으로 좁힘', rs.length ? rs.slice(0, 8).map((x, i) => `P${i + 1}: h(${d(x - 0.01)}) = ${d(h(x - 0.01))},  h(${d(x + 0.01)}) = ${d(h(x + 0.01))}  →  x ≈ ${d(x)}`) : '부호가 바뀌는 곳이 없음'],
            ['y 좌표는 f 에 대입 (g 에 대입해도 같음)', rs.slice(0, 8).map((x, i) => `P${i + 1}: f(${d(x)}) = ${d(F(x))},  g(${d(x)}) = ${d(G(x))}`).join('\n') || '−']
          ]),
          mount(el) { const pts = []; for (let i = 0; i <= 200; i++) { const x = x0 + (x1 - x0) * i / 200; pts.push([x, F(x)], [x, G(x)]); } const v = K.plot.autoView([pts], 0.1); v[0] = x0; v[1] = x1; plotIn(el, { view: v }).add({ type: 'fx', f: F, label: `f(x) = ${a}` }).add({ type: 'fx', f: G, label: `g(x) = ${b}` }).add({ type: 'points', pts: rs.map((x, i) => [x, F(x), `P${i + 1}`]) }); }
        };
      }
    }]
  });

  /* ---------------- 정함수 개형 ---------------- */
  register('graph', 'polyshape', {
    ops: [{
      id: 'shape', name: 'f, f′, f″ 를 함께 그려 증감·오목볼록 보기',
      note: '입력: f(x) ; 범위 a, b (기본 −10 ~ 10).  다항함수는 정확한 도함수, 그 밖의 함수는 수치 미분',
      help: [['x^3 - 3x^2 - 9x + 5', ''], ['x^4 - 4x^3; -2, 5', ''], ['x·exp(-x); -1, 6', ''], ['sin(x) + x/2; -7, 7', '']],
      run(s) {
        const [src, rg] = s.split(';'); const [a, b] = rg ? E.nums(rg) : [-10, 10];
        let F, D1, D2, poly = null;
        try { poly = E.poly(src); } catch (e) { poly = null; }
        if (poly && poly.length > 1) { const der = (c) => c.slice(1).map((v, i) => v * (i + 1)); const val = (c) => (x) => c.reduceRight((t, v) => t * x + v, 0); F = val(poly); D1 = val(der(poly)); D2 = val(der(der(poly))); }
        else { F = fx(src); D1 = (x) => N.deriv(F, x); D2 = (x) => N.deriv(F, x, 2); }
        const r0 = N.roots(F, a, b), r1 = N.roots(D1, a, b, 3000), r2 = N.roots(D2, a, b, 3000);
        const kind = (x) => { const v = D2(x); return v < -1e-7 ? '극대' : v > 1e-7 ? '극소' : '정류점'; };
        const cuts = [a, ...r1, b], inc = [];
        for (let i = 0; i + 1 < cuts.length; i++) { const m = (cuts[i] + cuts[i + 1]) / 2; inc.push(`[${d(cuts[i])}, ${d(cuts[i + 1])}] ${D1(m) > 0 ? '증가 ↗' : '감소 ↘'}`); }
        const cuts2 = [a, ...r2, b], conc = [];
        for (let i = 0; i + 1 < cuts2.length; i++) { const m = (cuts2[i] + cuts2[i + 1]) / 2; conc.push(`[${d(cuts2[i])}, ${d(cuts2[i + 1])}] ${D2(m) > 0 ? '아래로 볼록 ∪' : '위로 볼록 ∩'}`); }
        const polyTxt = poly && poly.length > 1 ? `<p>f(x) = ${N.polyStr(poly)},  f′(x) = ${N.polyStr(poly.slice(1).map((v, i) => v * (i + 1)))},  f″(x) = ${N.polyStr(poly.slice(2).map((v, i) => v * (i + 2) * (i + 1)))}</p>` : `<p>f(x) = ${K.esc(src)}</p>`;
        return {
          html: polyTxt + N.table([['x 절편 (f = 0)', r0.map(N.exact).join(', ') || '없음'], ['극값 (f′ = 0)', r1.map(x => `${kind(x)} (${N.exact(x)}, ${N.exact(F(x))})`).join(',  ') || '없음'], ['변곡점 (f″ = 0)', r2.filter(x => D2(x - 1e-4) * D2(x + 1e-4) < 0).map(x => `(${N.exact(x)}, ${N.exact(F(x))})`).join(',  ') || '없음'],
            ['증가·감소', inc.join('<br>')], ['오목·볼록', conc.join('<br>')]]) + K.solve([
              ['도함수 구하기', poly && poly.length > 1 ? `f′(x) = ${N.polyStr(poly.slice(1).map((v, i) => v * (i + 1)))},   f″(x) = ${N.polyStr(poly.slice(2).map((v, i) => v * (i + 2) * (i + 1)))}` : 'f′, f″ 는 수치 미분 (f(x+h) − f(x−h))/(2h) 로 계산'],
              ['f′(x) = 0 → 극값 후보,  f″ 의 부호로 판정 (f″ < 0 극대, f″ > 0 극소)', r1.length ? r1.map(x => `x = ${d(x)}: f″ = ${d(D2(x))} → ${kind(x)},  f = ${d(F(x))}`) : 'f′ = 0 인 점 없음'],
              ['증감표: f′ 의 부호 (구간 가운데 값으로 확인)', inc.map((t, i) => `${t}   (f′(${d((cuts[i] + cuts[i + 1]) / 2)}) = ${d(D1((cuts[i] + cuts[i + 1]) / 2))})`)],
              ['f″(x) = 0 이고 좌우 부호가 바뀌면 변곡점', r2.length ? r2.map(x => `x = ${d(x)}: f″(${d(x - 1e-4)}) ${D2(x - 1e-4) > 0 ? '> 0' : '< 0'},  f″(${d(x + 1e-4)}) ${D2(x + 1e-4) > 0 ? '> 0' : '< 0'} → ${D2(x - 1e-4) * D2(x + 1e-4) < 0 ? '변곡점' : '변곡점 아님'}`) : 'f″ = 0 인 점 없음']
            ]),
          mount(el) { const pts = []; for (let i = 0; i <= 200; i++) { const x = a + (b - a) * i / 200; pts.push([x, F(x)]); } const v = K.plot.autoView([pts], 0.15); v[0] = a; v[1] = b; plotIn(el, { view: v }).add({ type: 'fx', f: F, label: 'f(x)', width: 2.5 }).add({ type: 'fx', f: D1, label: "f′(x)", dash: [6, 4] }).add({ type: 'fx', f: D2, label: "f″(x)", dash: [2, 3] }).add({ type: 'points', pts: [...r1.map(x => [x, F(x), kind(x)]), ...r0.map(x => [x, 0])] }); }
        };
      }
    }]
  });

  /* ---------------- 공간곡선 ---------------- */
  function rot3(axis, th) { const n = Math.hypot(...axis), [x, y, z] = axis.map(v => v / n), c = Math.cos(th), s = Math.sin(th), C = 1 - c; return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]]; }
  register('graph', 'curve3d', {
    ops: [{
      id: 'curve', name: '3차원 매개변수 곡선과 이동',
      note: '입력: x(t), y(t), z(t) ; t 시작, t 끝 ; 이동.  이동은  평행 a, b, c  /  점 a, b, c (점대칭)  /  회전 P ; 축 ; 각  (예: 회전 0,0,0 ; 1,0,0 ; 90)',
      help: [['3sin(t), 3cos(t), t/2; 0, 6pi', '나선 (Helix)'], ['0, 3sin(t), 5cos(t); 0, 2pi', 'yz 평면의 타원'], ['t, t, 3cos(t); -6, 6', '평면 y = x 위의 곡선'], ['3sin(t), 3cos(t), t/2; 0, 4pi; 평행 2, 0, 3', '평행이동'], ['cos(t), sin(t), 0; 0, 2pi; 회전 0,0,0 ; 1,0,0 ; 60', '원을 x 축으로 60° 회전'], ['(2 + cos(5t))cos(2t), (2 + cos(5t))sin(2t), sin(5t); 0, 2pi', '토러스 매듭']],
        run(s) {
          const parts = s.split(';').map(t => t.trim()); const [xs, ys, zs] = E.splitTop(parts[0], ','); if (!zs) throw new Error('x(t), y(t), z(t) 세 식을 쉼표로 입력하세요.');
          const X = E.compile(xs, ['t']), Y = E.compile(ys, ['t']), Z = E.compile(zs, ['t']); const [t0, t1] = parts[1] ? E.nums(parts[1]) : [0, 2 * Math.PI];
          const pts = []; for (let i = 0; i <= 1500; i++) { const t = t0 + (t1 - t0) * i / 1500; pts.push([X(t), Y(t), Z(t)]); }
          let moved = null, desc = '';
          const mv = parts.slice(2).join(';').trim();
          if (mv) {
            if (/^평행/.test(mv)) { const [a, b, c] = E.nums(mv.replace('평행', '')); moved = pts.map(([x, y, z]) => [x + a, y + b, z + c]); desc = `(${f(a)}, ${f(b)}, ${f(c)}) 만큼 평행이동`; }
            else if (/^점/.test(mv)) { const [a, b, c] = E.nums(mv.replace('점', '')); moved = pts.map(([x, y, z]) => [2 * a - x, 2 * b - y, 2 * c - z]); desc = `점 (${f(a)}, ${f(b)}, ${f(c)}) 에 대칭`; }
            else if (/^회전/.test(mv)) { const [P, ax, an] = mv.replace('회전', '').split(';'); const C = E.nums(P), u = E.nums(ax), th = E.num(an) * Math.PI / 180, R = rot3(u, th); moved = pts.map(p => L.mv(R, p.map((v, i) => v - C[i])).map((v, i) => v + C[i])); desc = `점 (${C.map(f).join(', ')}) 중심, 축 (${u.map(f).join(', ')}) 으로 ${d(th * 180 / Math.PI)}° 회전`; }
            else throw new Error('이동은 평행 a, b, c / 점 a, b, c / 회전 P ; 축 ; 각');
          }
          let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(...pts[i].map((v, k) => v - pts[i - 1][k]));
          return { html: `<p>x = ${K.esc(xs)}, y = ${K.esc(ys)}, z = ${K.esc(zs)},  ${d(t0)} ≤ t ≤ ${d(t1)}</p><p>곡선의 길이 ≈ ${d(len)}</p>${desc ? `<p>${desc}</p>` : ''}` + K.solve([
            ['t 에 값을 넣어 점 찍기', [0, 1, 2, 3].map(k => { const t = t0 + (t1 - t0) * k / 4; return `t = ${d(t)}: (${d(X(t))}, ${d(Y(t))}, ${d(Z(t))})${moved ? `  → 이동 후 (${moved[k * 375].map(d).join(', ')})` : ''}`; })],
            ['곡선의 길이  L = ∫ √(x′² + y′² + z′²) dt', `짧은 선분 1500개의 길이를 더해 근사 → L ≈ ${d(len)}${desc ? '  (이동해도 길이는 그대로)' : ''}`]
          ]), mount(el) { const box = document.createElement('div'); el.appendChild(box); const pl = K.plot3d.create(box).add({ pts, label: '곡선' }); if (moved) pl.add({ pts: moved, label: '이동한 곡선', color: '#d0342c' }); } };
        }
    }]
  });

  /* ---------------- Affine 변환 ---------------- */
  const SHAPES = {
    F: [[0, 0], [0, 3], [2, 3], [2, 2.5], [0.5, 2.5], [0.5, 1.7], [1.5, 1.7], [1.5, 1.2], [0.5, 1.2], [0.5, 0], [0, 0]],
    사각형: [[0, 0], [2, 0], [2, 1], [0, 1], [0, 0]],
    삼각형: [[0, 0], [2, 0], [0.5, 1.5], [0, 0]],
    원: [...Array(61).keys()].map(i => [1 + Math.cos(i * Math.PI / 30), 1 + Math.sin(i * Math.PI / 30)])
  };
  function affineOf(s) { // 변환들을 → 로 이어 쓰면 합성
    let M = [[1, 0], [0, 1]], T = [0, 0]; const descs = [], steps = [];
    s.split(/→|->|>/).map(t => t.trim()).filter(Boolean).forEach(step => {
      let A = [[1, 0], [0, 1]], b = [0, 0]; const t = step.replace(/\s+/g, ' ');
      if (/^회전/.test(t)) { const th = E.num(t.replace('회전', '').replace('°', '')) * Math.PI / 180; A = [[Math.cos(th), -Math.sin(th)], [Math.sin(th), Math.cos(th)]]; descs.push(`회전 ${d(th * 180 / Math.PI)}°`); }
      else if (/^확대/.test(t)) { const [a, c = a] = E.nums(t.replace('확대', '')); A = [[a, 0], [0, c]]; descs.push(`확대 (${f(a)}, ${f(c)})`); }
      else if (/^전단/.test(t)) { const [a, c = 0] = E.nums(t.replace('전단', '')); A = [[1, a], [c, 1]]; descs.push(`전단 (${f(a)}, ${f(c)})`); }
      else if (/^이동/.test(t)) { b = E.nums(t.replace('이동', '')); descs.push(`이동 (${b.map(f).join(', ')})`); }
      else if (/^대칭/.test(t)) { const w = t.replace('대칭', '').trim(); A = w === 'x축' ? [[1, 0], [0, -1]] : w === 'y축' ? [[-1, 0], [0, 1]] : w === '원점' ? [[-1, 0], [0, -1]] : [[0, 1], [1, 0]]; descs.push(`대칭 ${w || 'y=x'}`); }
      else if (/^행렬/.test(t)) { const [m, v] = t.replace('행렬', '').split('|'); A = L.parse(m); if (v) b = E.nums(v); descs.push('행렬 지정'); }
      else throw new Error(`알 수 없는 변환: ${step}`);
      T = L.mv(A, T).map((v, i) => v + b[i]); M = L.mul(A, M);
      steps.push(`<div class="eq">${descs[descs.length - 1]}:  A = ${L.html(L.clean(A))}, b = (${b.map(f).join(', ')})  →  지금까지 M = ${L.html(L.clean(M))}, T = (${T.map(v => f(+v.toPrecision(12))).join(', ')})</div>`);
    });
    return { M, T, desc: descs.join(' → '), steps };
  }
  register('graph', 'affine', {
    ops: Object.keys(SHAPES).map(shape => ({
      id: shape, name: `도형: ${shape === 'F' ? '글자 F' : shape}`,
      note: '변환: 회전 θ · 확대 sx, sy · 전단 kx, ky · 이동 a, b · 대칭 x축/y축/원점/y=x · 행렬 a b; c d | e, f.  → 로 이어 쓰면 차례로 합성',
      help: [['회전 30', ''], ['확대 1, 0.5', ''], ['전단 1, 0.5', ''], ['이동 3, 2', ''], ['회전 90 → 이동 4, 0', '합성 변환'], ['행렬 1 2; 0 1 | 1, 1', '행렬로 직접']],
      run(s) {
        const { M, T, desc, steps } = affineOf(s), P = SHAPES[shape], Q = P.map(p => L.mv(M, p).map((v, i) => v + T[i]));
        const det = L.det(M), p1 = P[1], q1 = Q[1];
        return {
          html: `<p>${desc}</p><div class="eq">X′ = ${L.html(L.clean(M))} X + ${L.html(T.map(v => [v]))}</div><p>det = ${f(det)} → 넓이 ${N.dec(Math.abs(det))}배${det < 0 ? ', 방향이 뒤집힘 (거울상)' : ''}</p>` + K.solve([
            ['각 변환을 X′ = AX + b 로 쓰고 차례로 합성:  M ← A·M,  T ← A·T + b', steps.join('')],
            ['꼭짓점 하나에 적용해 보기', `(${p1.map(f).join(', ')}) → (${fp(+M[0][0].toPrecision(10))}·${fp(p1[0])} + ${fp(+M[0][1].toPrecision(10))}·${fp(p1[1])} + ${fp(+T[0].toPrecision(10))}, ${fp(+M[1][0].toPrecision(10))}·${fp(p1[0])} + ${fp(+M[1][1].toPrecision(10))}·${fp(p1[1])} + ${fp(+T[1].toPrecision(10))}) = (${q1.map(v => d(v)).join(', ')})`],
            ['넓이의 배율 = |det M|', `det M = ${fp(+M[0][0].toPrecision(10))}·${fp(+M[1][1].toPrecision(10))} − ${fp(+M[0][1].toPrecision(10))}·${fp(+M[1][0].toPrecision(10))} = ${d(det)}${det < 0 ? '  (음수 → 방향이 뒤집힘)' : ''}`]
          ]),
          mount(el) { const all = [...P, ...Q]; plotIn(el, { view: K.plot.autoView([all], 0.3), equal: true }).add({ type: 'poly', pts: P, fill: true, label: '처음 도형' }).add({ type: 'poly', pts: Q, fill: true, label: '변환한 도형', color: '#d0342c' }).add({ type: 'points', pts: [[...P[0], 'O'], [...Q[0], "O′"]] }); }
        };
      }
    }))
  });

  /* ---------------- 문제풀이 예 ---------------- */
  const TABS = [['in', '정수론'], ['high', 'Matrix (행렬)'], ['multi', '벡터공간']];
  register('graph', 'examples', {
    ops: TABS.map(([key, name]) => ({
      id: key, name, noInput: true, example: '1',
      run() {
        const D = window.KPHS_EXAMPLES && window.KPHS_EXAMPLES[key]; if (!D) throw new Error('문제풀이 자료를 불러오지 못했습니다.');
        let cur = 0;
        return {
          html: `<div class="ex-grid">${D.titles.map((t, i) => `<button type="button" data-i="${i}">${i + 1}. ${K.esc(t)}</button>`).join('')}</div><article class="ex-body"></article>`,
          mount(el) {
            const body = el.querySelector('.ex-body'), btns = [...el.querySelectorAll('.ex-grid button')];
            const show = (i) => { cur = i; btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); body.innerHTML = D.html[i]; };
            btns.forEach(b => b.addEventListener('click', () => { show(+b.dataset.i); body.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
            show(cur);
          }
        };
      }
    }))
  });
})();
