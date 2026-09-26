/*
 * 행렬활용 모듈 (원본: MatrixProcessUMP_5.java)
 *  행렬은 행을 ; (또는 줄바꿈) 으로, 성분을 쉼표나 빈칸으로 나눕니다.  예) 1 2; 3 4
 *  두 행렬은 | 로 나눕니다.  예) 1 2; 3 4 | 5 6; 7 8
 */
(function () {
  const K = window.KPHS, { register } = K;
  const N = K.num, E = K.expr, L = K.la;
  const M = (A) => L.html(A);
  const f = (x) => N.fmt(x);
  const parseM = (s) => (/\(/.test(s) && !/sqrt|sin|cos|log|exp/.test(s) ? E.points(s) : L.parse(s));
  function split2(s, need = 2) {
    const parts = s.split('|').map(t => t.trim());
    if (parts.length < need) throw new Error(`| 로 나누어 ${need}개를 입력하세요.`);
    return parts;
  }
  const sq = (A, what = '') => { if (A.length !== A[0].length) throw new Error(`${what}정사각행렬이어야 합니다 (지금 ${L.size(A)}).`); };
  const eqRow = (...items) => `<div class="eq">${items.join('')}</div>`;

  /* ---------- 복소수 ---------- */
  const C = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
    div: (a, b) => { const d = b[0] ** 2 + b[1] ** 2; if (!d) throw new Error('0 으로 나눌 수 없습니다.'); return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; },
    abs: (a) => Math.hypot(a[0], a[1]), arg: (a) => Math.atan2(a[1], a[0]),
    exp: (a) => [Math.exp(a[0]) * Math.cos(a[1]), Math.exp(a[0]) * Math.sin(a[1])],
    log: (a) => [Math.log(C.abs(a)), C.arg(a)],
    sin: (a) => [Math.sin(a[0]) * Math.cosh(a[1]), Math.cos(a[0]) * Math.sinh(a[1])],
    cos: (a) => [Math.cos(a[0]) * Math.cosh(a[1]), -Math.sin(a[0]) * Math.sinh(a[1])],
    pow: (a, b) => (C.abs(a) === 0 ? [0, 0] : C.exp(C.mul(b, C.log(a)))),
    str: (a) => L.cstr({ re: Math.abs(a[0]) < 1e-12 ? 0 : a[0], im: Math.abs(a[1]) < 1e-12 ? 0 : a[1] })
  };
  /** 'a + bi' 를 i 를 변수로 한 식으로 계산해 [a, b] */
  function cparse(s) {
    const t = s.trim(); if (!t) throw new Error('복소수를 입력하세요.');
    const fr = E.compile(t, ['i']), re = fr(0), im = fr(1) - re;
    if (Math.abs(fr(2) - (re + 2 * im)) > 1e-9) throw new Error(`'${t}' 는 a + bi 꼴이 아닙니다.`);
    return [re, im];
  }
  /* ---------- 사원수 ---------- */
  function qparse(s) {
    const fr = E.compile(s.trim(), ['i', 'j', 'k']), a = fr(0, 0, 0);
    const q = [a, fr(1, 0, 0) - a, fr(0, 1, 0) - a, fr(0, 0, 1) - a];
    if (Math.abs(fr(1, 1, 1) - q.reduce((x, y) => x + y, 0)) > 1e-9) throw new Error(`'${s}' 는 a + bi + cj + dk 꼴이 아닙니다.`);
    return q;
  }
  const Q = {
    mul: ([a1, b1, c1, d1], [a2, b2, c2, d2]) => [a1 * a2 - b1 * b2 - c1 * c2 - d1 * d2, a1 * b2 + b1 * a2 + c1 * d2 - d1 * c2, a1 * c2 - b1 * d2 + c1 * a2 + d1 * b2, a1 * d2 + b1 * c2 - c1 * b2 + d1 * a2],
    conj: (q) => [q[0], -q[1], -q[2], -q[3]], norm: (q) => Math.hypot(...q),
    inv: (q) => { const n2 = q.reduce((s, v) => s + v * v, 0); if (!n2) throw new Error('0 사원수는 역원이 없습니다.'); return Q.conj(q).map(v => v / n2); },
    str: (q) => { const parts = []; ['', 'i', 'j', 'k'].forEach((u, t) => { const v = q[t]; if (Math.abs(v) < 1e-12) return; const a = Math.abs(v), s = u && Math.abs(a - 1) < 1e-12 ? '' : f(a); parts.push({ neg: v < 0, s: s + u }); }); return parts.length ? parts.map((p, i) => (i ? (p.neg ? ' − ' : ' + ') : p.neg ? '−' : '') + p.s).join('') : '0'; }
  };

  register('matrix', 'ops', {
    ops: [
      {
        id: 'mat', name: '행렬 연산  A, B',
        note: '행은 ; 로, 성분은 쉼표·빈칸으로. 두 행렬은 | 로 나눕니다. 분수·제곱근도 됩니다 (1/2, sqrt(3)).',
        help: [['2 1 3; 0 4 -2; 5 -2 -1 | 3 -1 4; 4 3 2; -4 0 1', '3×3 과 3×3'], ['1 2; 3 4 | 1/2 sqrt(3); 0 1', ''], ['2 1 3; 0 4 -2; 5 -2 -1 | 3 -1 4 2; 4 3 2 -1; -4 0 1 3', 'AB 만 정의됨']],
        run(s) {
          const [a, b] = split2(s); const A = parseM(a), B = parseM(b);
          const out = [eqRow('A = ', M(A), ' , B = ', M(B))];
          const tryOp = (name, fn) => { try { out.push(eqRow(name + ' = ', M(fn()))); } catch (e) { out.push(`<p class="muted">${name}: ${e.message}</p>`); } };
          tryOp('A + B', () => L.add(A, B)); tryOp('A − B', () => L.sub(A, B)); tryOp('AB', () => L.mul(A, B)); tryOp('BA', () => L.mul(B, A));
          out.push(eqRow('Aᵀ = ', M(L.T(A)), ' , Bᵀ = ', M(L.T(B))));
          if (A.length === A[0].length) out.push(`<p>tr(A) = ${f(A.reduce((t, r, i) => t + r[i], 0))},  det(A) = ${f(L.det(A))}</p>`);
          if (B.length === B[0].length) out.push(`<p>tr(B) = ${f(B.reduce((t, r, i) => t + r[i], 0))},  det(B) = ${f(L.det(B))}</p>`);
          return out.join('');
        }
      },
      {
        id: 'complex', name: '복소수 연산  x, y',
        help: [['3 + 4i, 1 - 2i', ''], ['2i, -1 + i', ''], ['1 + i, 1 + i', '']],
        run(s) {
          const [x, y] = E.splitTop(s, ',').map(cparse); if (!y) throw new Error('복소수 두 개를 쉼표로 입력하세요.');
          const rows = [['x + y', C.str(C.add(x, y))], ['x − y', C.str(C.sub(x, y))], ['xy', C.str(C.mul(x, y))], ['x / y', C.str(C.div(x, y))],
            ['|x|, |y|', `${N.exact(C.abs(x))}, ${N.exact(C.abs(y))}`], ['x 의 켤레', C.str([x[0], -x[1]])],
            ['x 의 극형식', `${N.dec(C.abs(x), 8)}·(cos θ + i sin θ),  θ = ${N.exact(C.arg(x))} = ${N.dec(C.arg(x) * 180 / Math.PI, 8)}°`],
            ['ln x', C.str(C.log(x))], ['eˣ', C.str(C.exp(x))], ['sin x', C.str(C.sin(x))], ['cos x', C.str(C.cos(x))], ['xʸ (주값)', C.str(C.pow(x, y))]];
          return eqRow('x = ' + C.str(x) + ' ↔ ', M([[x[0], -x[1]], [x[1], x[0]]]), ' , y = ' + C.str(y) + ' ↔ ', M([[y[0], -y[1]], [y[1], y[0]]])) + N.table(rows);
        }
      },
      {
        id: 'quat', name: '사원수 연산  x, y',
        help: [['1 + 2i + 3j + 4k, 2 - i + j + 3k', ''], ['i, j', 'ij = k, ji = −k']],
        run(s) {
          const [x, y] = E.splitTop(s, ',').map(qparse); if (!y) throw new Error('사원수 두 개를 쉼표로 입력하세요.');
          const add = x.map((v, i) => v + y[i]), sub = x.map((v, i) => v - y[i]);
          return N.table([['x', Q.str(x)], ['y', Q.str(y)], ['x + y', Q.str(add)], ['x − y', Q.str(sub)], ['xy', Q.str(Q.mul(x, y))], ['yx', Q.str(Q.mul(y, x))],
            ['x / y = x·y⁻¹', Q.str(Q.mul(x, Q.inv(y)))], ['|x|', N.exact(Q.norm(x))], ['x⁻¹', Q.str(Q.inv(x))], ['x 의 켤레 x*', Q.str(Q.conj(x))],
            ['x 의 실수부 / 벡터부', `${f(x[0])} / (${f(x[1])}, ${f(x[2])}, ${f(x[3])})`]]) + '<p class="muted">사원수의 곱은 교환법칙이 성립하지 않습니다 (xy ≠ yx).</p>';
        }
      },
      {
        id: 'vec', name: 'n차원 벡터  (합, 내적, 각, 부피)',
        help: [['(1, 2, 3), (4, 5, 6)', ''], ['(1, 0, 2, 1), (2, 1, 0, 3), (0, 1, 1, 1)', '벡터 3개의 부피 (일차독립 판정)'], ['(1, 2, 0), (0, 1, 3), (2, 0, 1)', 'n개의 n차원 벡터 → 평행육면체, 단체의 부피']],
        run(s) {
          const V = E.points(s); const n = V[0].length; if (V.some(v => v.length !== n)) throw new Error('모든 벡터의 차원이 같아야 합니다.');
          let h = '';
          if (V.length >= 2) {
            const [u, v] = V, dot = L.dot(u, v), cos = dot / (L.norm(u) * L.norm(v));
            h += N.table([['x₁ + x₂', N.vec(u.map((a, i) => a + v[i]))], ['x₁ − x₂', N.vec(u.map((a, i) => a - v[i]))], ['x₁ · x₂ (내적)', f(dot)],
              ['|x₁|, |x₂|', `${N.exact(L.norm(u))}, ${N.exact(L.norm(v))}`], ['사잇각 θ', `${N.dec(Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI, 8)}°  (cos θ = ${N.exact(cos)})`],
              ...(n === 3 ? [['x₁ × x₂ (외적)', N.vec([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]])]] : [])]);
          }
          const G = L.mul(V, L.T(V)), vol = Math.sqrt(Math.max(0, L.det(G)));
          h += `<p>${V.length}개 벡터가 만드는 평행체의 부피 √det(AAᵀ) = <b>${N.exact(vol)}</b> → ${vol < 1e-10 ? '일차종속' : '일차독립'}</p>`;
          if (V.length === n) { const dt = L.det(V); let nf = 1; for (let i = 2; i <= n; i++) nf *= i; h += `<p>det = ${f(dt)},  ${n}-단체의 부피 |det|/${n}! = ${N.exact(Math.abs(dt) / nf)}</p>`; }
          return h;
        }
      }
    ]
  });

  /* ---------------- 방정식 ---------------- */
  const VARS = ['x', 'y', 'z', 'w', 'u', 'v'];
  function eqSystem(s) { // '3x + 5y - 2z = 2, x - 2y + z = 1' → A, b, names
    const eqs = E.splitTop(s, ',;\n').filter(t => t.includes('='));
    const names = VARS.filter(v => eqs.some(e => new RegExp(`(^|[^a-z])${v}([^a-z]|$)`).test(e.replace(/sqrt|exp|sin|cos|tan|log/g, ''))));
    const A = [], b = [];
    eqs.forEach(e => {
      const [l, r] = e.split('='); const fn = E.compile(`(${l}) - (${r})`, names), z = names.map(() => 0), c0 = fn(...z);
      A.push(names.map((_, i) => { const v = z.slice(); v[i] = 1; return fn(...v) - c0; })); b.push(-c0);
      const t = names.map((_, i) => i + 1.5); if (Math.abs(fn(...t) - (c0 + A[A.length - 1].reduce((sm, a, i) => sm + a * t[i], 0))) > 1e-8) throw new Error(`일차식이 아닙니다: ${e}`);
    });
    return { A, b, names };
  }
  function solveReport(A, b, names) {
    const aug = A.map((r, i) => [...r, b[i]]), { R, rank, pivots } = L.rref(aug), n = A[0].length, rA = L.rref(A).rank;
    let h = eqRow('[A | B] = ', M(aug), ' → 기약 행사다리꼴 ', M(R)) + `<p>rank A = ${rA}, rank [A|B] = ${rank}</p>`;
    if (rank > rA) return h + '<p><b>해가 없습니다</b> (모순 방정식). 최소제곱해를 보려면 “최소제곱해”를 쓰세요.</p>';
    if (rA === n) return h + `<p><b>해가 하나</b>: ${names.map((v, i) => `${v} = ${N.exact(R[pivots.indexOf(i)][n])}`).join(',  ')}</p>`;
    const free = [...Array(n).keys()].filter(j => !pivots.includes(j));
    const params = ['s', 't', 'r', 'p', 'q', 'm'];
    const expr = names.map((v, j) => {
      if (free.includes(j)) return `${v} = ${params[free.indexOf(j)]}`;
      const row = R[pivots.indexOf(j)];
      return `${v} = ${N.linStr(free.map(fj => -row[fj]), free.map((_, k) => params[k]), row[n])}`;
    });
    const xmin = L.mv(L.pinv(A), b);
    return h + `<p><b>해가 무수히 많습니다</b> (매개변수 ${free.length}개):</p><div class="steps">${expr.join('\n')}</div><p>원점에 가장 가까운 해: (${xmin.map(v => N.exactShort(v)).join(', ')})</p>`;
  }
  register('matrix', 'solve', {
    ops: [
      {
        id: 'eqs', name: '연립일차방정식  (식으로)',
        help: [['3x + 5y - 2z = 2, x - 2y + z = 1, y - z = 3', '해가 하나'], ['x - 3y = 2', '부정 (해가 무수히 많음)'], ['x + y = 1, x + y = 2', '불능'], ['x + 2y + 3z + w = 1, 2x + y - z + w = 2, x - y + 2z - w = 0', '']],
        run(s) { const { A, b, names } = eqSystem(s); return solveReport(A, b, names); }
      },
      {
        id: 'mat', name: '연립방정식  AX = B  (행렬로)',
        help: [['3 5 -2; 1 -2 1; 0 1 -1 | 2; 1; 3', ''], ['1 1 1; 1 2 3; 2 3 4 | 6; 14; 20', '']],
        run(s) { const [a, b] = split2(s); const A = parseM(a), B = parseM(b).flat(); if (B.length !== A.length) throw new Error('B 의 성분 수가 A 의 행 수와 같아야 합니다.'); return solveReport(A, B, VARS.concat(['x7', 'x8', 'x9', 'x10']).slice(0, A[0].length).map((v, i) => (A[0].length > 6 ? `x${i + 1}` : v))); }
      },
      {
        id: 'lstsq', name: '최소제곱해  (m > n)',
        note: 'Ax = b 의 해가 없을 때 |Ax − b| 를 가장 작게 하는 x = (AᵀA)⁻¹Aᵀb',
        help: [['1 1; 0 1; 0 0 | 0; 1; 1', ''], ['1 0; 1 1; 1 2; 1 3 | 3; 2; 4; 4', '직선 맞춤']],
        run(s) {
          const [a, b] = split2(s); const A = parseM(a), bb = parseM(b).flat(); const x = L.mv(L.pinv(A), bb), r = L.mv(A, x).map((v, i) => v - bb[i]);
          return eqRow('AᵀA = ', M(L.mul(L.T(A), A)), ' , Aᵀb = ', M(L.mv(L.T(A), bb))) + `<p>최소제곱해 x = <b>(${x.map(v => N.exactShort(v)).join(', ')})</b></p><p>Ax = (${L.mv(A, x).map(v => f(v)).join(', ')}),  오차 |Ax − b| = ${N.exact(L.norm(r))}</p>`;
        }
      },
      {
        id: 'fit', name: '최소제곱 근사 다항식',
        note: '입력: (x, y) 점들 ; 차수',
        help: [['(0, 3), (1, 2), (2, 4), (3, 4); 2', 'y = a + bx + cx²'], ['(0, 3), (1, 2), (2, 4), (3, 4); 1', '직선']],
        run(s) {
          const [p, dg] = s.split(';'); const pts = E.points(p, 2), deg = dg ? Math.round(E.num(dg)) : 1;
          const A = pts.map(([x]) => [...Array(deg + 1).keys()].map(k => x ** k)), b = pts.map(q => q[1]), c = L.mv(L.pinv(A), b);
          const fn = (x) => c.reduce((t, a, k) => t + a * x ** k, 0);
          return { html: `<p>y = <b>${N.polyStr(c.map(v => +v.toPrecision(10)))}</b></p>` + eqRow('A = ', M(A), ' , b = ', M(b)), mount: (el) => { const box = document.createElement('div'); el.appendChild(box); K.plot.create(box, { view: K.plot.autoView([pts], 0.25) }).add({ type: 'points', pts, label: '자료' }).add({ type: 'fx', f: fn, label: '근사 다항식' }); } };
        }
      }
    ]
  });

  /* ---------------- 대각화 ---------------- */
  function quadCoefs(src) { // 이차식 → A(대칭), b, c  (f = XᵀAX + 2bᵀX + c)
    const names = ['x', 'y', 'z', 'w'].filter(v => new RegExp(v).test(src.replace(/exp|sqrt/g, '')));
    const fn = E.compile(src.split('=')[0], names), n = names.length, z = new Array(n).fill(0), f0 = fn(...z);
    const e = (i, s = 1) => { const v = z.slice(); v[i] = s; return v; };
    const A = L.zeros(n, n), b = new Array(n);
    for (let i = 0; i < n; i++) { A[i][i] = (fn(...e(i)) + fn(...e(i, -1)) - 2 * f0) / 2; b[i] = (fn(...e(i)) - fn(...e(i, -1))) / 4; }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = z.slice(); v[i] = 1; v[j] = 1; const cij = fn(...v) - fn(...e(i)) - fn(...e(j)) + f0; A[i][j] = A[j][i] = cij / 2; }
    return { A: L.clean(A), b, c: f0, names };
  }
  register('matrix', 'diag', {
    ops: [
      {
        id: 'sym', name: '대칭행렬의 대각화  A = PDPᵀ',
        help: [['2 1; 1 2', ''], ['2 -1 0; -1 2 -1; 0 -1 2', ''], ['4 1 1; 1 4 1; 1 1 4', '중복 고유값']],
        run(s) {
          const A = parseM(s); sq(A); if (!A.every((r, i) => r.every((v, j) => Math.abs(v - A[j][i]) < 1e-12))) throw new Error('대칭행렬이 아닙니다. “일반 행렬의 대각화”를 쓰세요.');
          const { values, vectors: P } = L.eigSym(A), D = values.map((v, i) => values.map((_, j) => (i === j ? v : 0)));
          return `<p>고유값: ${values.map(v => N.exactShort(v)).join(', ')}</p>` + eqRow('P = ', M(P), ' , D = ', M(D)) + eqRow('PᵀAP = ', M(L.clean(L.mul(L.mul(L.T(P), A), P)))) + '<p class="muted">P 의 열이 정규직교 고유벡터입니다 (Pᵀ = P⁻¹).</p>';
        }
      },
      {
        id: 'gen', name: '일반 행렬의 대각화  A = PDP⁻¹',
        help: [['4 1; 2 3', ''], ['1 2 3; 0 4 5; 0 0 6', ''], ['1 1; 0 1', '대각화 불가 (조르당)'], ['0 -1; 1 0', '복소 고유값']],
        run(s) {
          const A = parseM(s); sq(A); const e = L.eig(A), n = A.length;
          let h = `<p>고유값: ${e.values.map(z => L.cstr(z)).join(', ')}</p>`;
          if (e.values.some(z => z.im)) return h + '<p>복소수 고유값이 있어 실수 범위에서 대각화할 수 없습니다.</p>';
          const vecs = e.sym ? L.T(e.vectors) : e.eigvecs.map(v => v.vec), vals = e.sym ? e.values.map(z => z.re) : e.eigvecs.map(v => v.value);
          if (vecs.length < n) return h + `<p><b>대각화할 수 없습니다</b>: 일차독립인 고유벡터가 ${vecs.length}개뿐입니다 (${n}개 필요).</p>`;
          const P = L.T(vecs), D = vals.map((v, i) => vals.map((_, j) => (i === j ? v : 0)));
          return h + eqRow('P = ', M(P), ' , D = ', M(D), ' , P⁻¹ = ', M(L.inv(P))) + eqRow('P⁻¹AP = ', M(L.clean(L.mul(L.mul(L.inv(P), A), P))));
        }
      },
      {
        id: 'qr', name: 'QR 분해  (벡터의 직교화)',
        note: '벡터들을 행으로 입력하면 Aᵀ (벡터가 열) 를 QR 분해합니다.',
        help: [['1 2 3 0; 1 0 3 -1; 0 1 1 3', 'x₁, x₂, x₃'], ['1 1 0; 1 0 1; 0 1 1', '']],
        run(s) {
          const V = parseM(s), At = L.T(V), { Q, R } = L.qr(At), k = V.length;
          const Qr = Q.map(r => r.slice(0, k)), Rr = R.slice(0, k);
          const vol = Math.abs(Rr.reduce((p, r, i) => p * r[i], 1));
          return eqRow('Aᵀ = ', M(At), ' = Q R') + eqRow('Q = ', M(Qr), ' , R = ', M(Rr)) + `<p>부피 √det(AAᵀ) = |r₁₁·r₂₂·…| = <b>${N.exact(vol)}</b></p><p class="muted">Q 의 열이 정규직교 벡터입니다.</p>`;
        }
      },
      {
        id: 'gs', name: '그람-슈미트 직교화',
        help: [['1 2 3 0; 1 0 3 -1; 0 1 1 3', ''], ['1 1 0; 1 0 1; 0 1 1', '']],
        run(s) {
          const V = parseM(s), { u, e } = L.gramSchmidt(V);
          return `<div class="steps">${u.map((r, i) => `u${i + 1} = ${N.vec(r)}`).join('\n')}</div><h4>정규화 eᵢ = uᵢ/|uᵢ|</h4><div class="steps">${e.map((r, i) => `e${i + 1} = (${r.map(v => N.exact(v).replace(/ <span.*<\/span>/, '')).join(', ')})`).join('\n')}</div>`;
        }
      },
      {
        id: 'quadform', name: '이차식의 표준화',
        note: '이차식을 그대로 입력하세요 (x, y 또는 x, y, z). f = XᵀAX + 2bᵀX + c',
        help: [['x^2 + 6xy + 2y^2 + 2x + 4y + 5', '문서의 예'], ['5x^2 - 4xy + 8y^2 - 36 = 0', '타원'], ['x^2 + 6xy + y^2 - 8x + 8y + 12', ''], ['2x^2 + 2y^2 + 2z^2 + 2xy + 2yz + 2xz - 4', '3변수']],
        run(s) {
          const { A, b, c, names } = quadCoefs(s), n = A.length;
          const e = L.eigSym(A); let h = eqRow('A = ', M(A), ' , b = ', M(b), ` , c = ${f(c)}`);
          let cc = c, center = null;
          if (Math.abs(L.det(A)) > 1e-12) { center = L.mv(L.inv(A), b.map(v => -v)); cc = c + L.dot(b, center); h += `<p>평행이동: 중심 (${center.map(v => N.exactShort(v)).join(', ')}) 으로 옮기면 상수항 c′ = c + bᵀx₀ = ${N.exact(cc)}</p>`; }
          else h += '<p class="muted">det A = 0 이라 중심이 없습니다 (포물선형). 회전만 합니다.</p>';
          const U = ['X', 'Y', 'Z', 'W'].slice(0, n);
          const terms = e.values.map((l, i) => (Math.abs(l) < 1e-12 ? '' : `${N.exact(l).replace(/ <span.*<\/span>/, '')}${U[i]}²`)).filter(Boolean).join(' + ').replace(/\+ -/g, '− ');
          h += eqRow('회전 P = ', M(e.vectors)) + `<p>표준형: <b>${terms}${center ? (Math.abs(cc) > 1e-12 ? ` ${cc < 0 ? '−' : '+'} ${N.exact(Math.abs(cc)).replace(/ <span.*<\/span>/, '')}` : '') : ''} = 0</b>${!center ? ' (+ 일차항)' : ''}</p>`;
          if (n === 2 && center) {
            const [l1, l2] = e.values; const kind = l1 * l2 > 0 ? (l1 * cc < 0 ? '타원' : cc === 0 ? '한 점' : '공집합 (허타원)') : l1 * l2 < 0 ? (Math.abs(cc) < 1e-12 ? '두 직선' : '쌍곡선') : '포물선';
            h += `<p>도형: <b>${kind}</b></p>`;
            const F = E.compile(s.split('=')[0], names);
            return { html: h, mount: (el) => { const box = document.createElement('div'); el.appendChild(box); const cx = center[0], cy = center[1], r = Math.max(4, 2 * Math.sqrt(Math.abs(cc / Math.min(Math.abs(l1), Math.abs(l2)) || 1))); K.plot.create(box, { view: [cx - r, cx + r, cy - r, cy + r], equal: true }).add({ type: 'implicit', F: (x, y) => F(x, y), label: '원래 곡선' }).add({ type: 'points', pts: [[cx, cy, '중심']] }); } };
          }
          return h;
        }
      }
    ]
  });

  /* ---------------- 선형변환 ---------------- */
  const rowsAsCols = (s) => L.T(parseM(s)); // 벡터를 행으로 입력 → 열로
  register('matrix', 'linear', {
    ops: [
      {
        id: 'image', name: '선형변환의 상  T(u) = Au',
        help: [['7 -19; -6 17 | 3, 1', 'A 와 u'], ['1 2 0; 0 1 1 | 1, -1, 2', '']],
        run(s) { const [a, u] = split2(s); const A = parseM(a), v = E.nums(u); return eqRow('T(u) = ', M(A), M(v), ' = ', M(L.mv(A, v))); }
      },
      {
        id: 'find', name: '선형변환 구하기  T(uᵢ) = vᵢ',
        note: '입력: u₁; u₂; … | v₁; v₂; …  (각 벡터를 한 행으로)',
        help: [['1 1 1; 1 1 0; 1 0 0 | 1 0; 2 -1; 4 3', 'T : R³ → R²'], ['3 1; 5 2 | 1 -2 -5; 2 1 -3', 'T : R² → R³']],
        run(s) {
          const [a, b] = split2(s); const U = rowsAsCols(a), V = rowsAsCols(b); sq(U, 'u 벡터들로 만든 행렬이 ');
          const A = L.mul(V, L.inv(U));
          return eqRow('A = [v₁ v₂ …][u₁ u₂ …]⁻¹ = ', M(V), M(L.inv(U)), ' = ', M(A)) + `<p>T(X) = AX</p>`;
        }
      },
      {
        id: 'coord', name: '기저 B 에 대한 좌표',
        note: '입력: b₁; b₂; b₃ | v  →  v = a·b₁ + b·b₂ + c·b₃ 의 (a, b, c)',
        help: [['1 0 0; 1 -1 0; 1 -2 1 | 6, 3, 2', '(6, 3, 2) 를 기저 B 로'], ['1 1; 1 -1 | 3, 1', '']],
        run(s) { const [a, b] = split2(s); const Bm = rowsAsCols(a), v = E.nums(b); sq(Bm, '기저 행렬이 '); const c = L.mv(L.inv(Bm), v); return eqRow('[v]<sub>B</sub> = B⁻¹v = ', M(L.inv(Bm)), M(v), ' = ', M(c)) + `<p>v = ${N.linStr(c, c.map((_, i) => `·b${i + 1}`)).replace(/(^|[-+] )·/g, '$11·')}</p>`; }
      },
      {
        id: 'trans', name: '전이행렬  (기저 B → 기저 C)',
        note: '입력: b₁; b₂; … | c₁; c₂; …   →  P = C⁻¹B  ([v]_C = P[v]_B)',
        help: [['1 0 0; 1 -1 0; 1 -2 1 | 1 0 0; 1 1 0; 1 0 1', 'P₂ 의 기저 (1, 1−x, (1−x)²) → (1, 1+x, 1+x²)']],
        run(s) { const [a, b] = split2(s); const Bm = rowsAsCols(a), Cm = rowsAsCols(b); const P = L.mul(L.inv(Cm), Bm); return eqRow('P<sub>C←B</sub> = C⁻¹B = ', M(P)) + eqRow('P<sub>B←C</sub> = ', M(L.inv(P))); }
      },
      {
        id: 'tb', name: '기저 B 에 대한 T 의 행렬  [T]_B',
        note: '입력: b₁; b₂; … | A   →  [T]_B = B⁻¹AB',
        help: [['1 -1 0; -2 1 1; 1 1 1 | 2 2 0; 1 1 2; 1 1 2', '']],
        run(s) { const [a, b] = split2(s); const Bm = rowsAsCols(a), A = parseM(b); const D = L.mul(L.mul(L.inv(Bm), A), Bm); return eqRow('[T]<sub>B</sub> = B⁻¹AB = ', M(D)); }
      },
      {
        id: 'tbc', name: '두 기저 B, C 에 대한 T 의 행렬  [T]_{B,C}',
        note: '입력: c₁; c₂; … | T(b₁); T(b₂); …   →  C⁻¹[T(b₁) T(b₂) …]',
        help: [['1 0 -1; -1 2 2; 0 1 2 | 1 -2 -5; 2 1 -3', '문서의 예 (T : R² → R³)']],
        run(s) { const [a, b] = split2(s); const Cm = rowsAsCols(a), TB = rowsAsCols(b); return eqRow('[T]<sub>B,C</sub> = C⁻¹[T(b₁) T(b₂)] = ', M(L.mul(L.inv(Cm), TB))); }
      }
    ]
  });

  /* ---------------- 기타 ---------------- */
  function seq(p, q, a0, a1, n) { // BigInt 점화식
    let [x, y] = [BigInt(a0), BigInt(a1)]; if (n === 0) return x; for (let i = 1; i < n; i++) [x, y] = [y, BigInt(p) * y + BigInt(q) * x]; return y;
  }
  const NAMED = [['피보나치', 1, 1, 0, 1], ['루카스', 1, 1, 2, 1], ['펠', 2, 1, 0, 1], ['펠-루카스', 2, 1, 2, 2], ['페르마', 3, -2, 0, 1], ['페르마-루카스', 3, -2, 2, 3], ['야콥스탈', 1, 2, 0, 1], ['야콥스탈-루카스', 1, 2, 2, 1]];
  register('matrix', 'etc', {
    ops: [
      {
        id: 'det', name: '행렬식',
        help: [['2 1 3; 0 4 -2; 5 -2 -1', ''], ['1 2; 3 4', ''], ['1 2 3; 4 5 6; 7 8 9', '0 인 경우']],
        run(s) {
          const A = parseM(s); sq(A); const d = L.det(A); let h = eqRow('det ', M(A), ` = <b>${N.exact(d)}</b>`);
          if (A.length === 3) { const [a, b, c] = A[0]; h += `<p class="muted">1행 전개: ${f(a)}·(${f(A[1][1])}·${f(A[2][2])} − ${f(A[1][2])}·${f(A[2][1])}) − ${f(b)}·(${f(A[1][0])}·${f(A[2][2])} − ${f(A[1][2])}·${f(A[2][0])}) + ${f(c)}·(${f(A[1][0])}·${f(A[2][1])} − ${f(A[1][1])}·${f(A[2][0])})</p>`; }
          return h;
        }
      },
      { id: 'inv', name: '역행렬', help: [['2 1 3; 0 4 -2; 5 -2 -1', ''], ['1 2; 3 4', '']], run(s) { const A = parseM(s); sq(A); const I = L.inv(A); return eqRow('A⁻¹ = ', M(I)) + eqRow('AA⁻¹ = ', M(L.clean(L.mul(A, I)))); } },
      {
        id: 'rank', name: 'rank 와 기약 행사다리꼴',
        help: [['1 2 3; 2 4 6; 1 0 1', ''], ['1 2 1 0; 2 4 0 2; 1 2 2 -1', '']],
        run(s) { const A = parseM(s), { R, rank, pivots } = L.rref(A), ns = L.nullspace(A); return eqRow('rref(A) = ', M(R)) + `<p>rank A = <b>${rank}</b>,  피벗 열: ${pivots.map(p => p + 1).join(', ')}</p><p>영공간의 기저: ${ns.length ? ns.map(v => N.vec(v)).join(', ') : '{0}'} (nullity ${ns.length})</p>`; }
      },
      {
        id: 'lu', name: 'LU 분해와 pivot  PA = LU',
        help: [['2 1 3; 0 4 -2; 5 -2 -1', ''], ['0 2; 1 3', '행 교환이 필요한 예']],
        run(s) { const A = parseM(s); sq(A); const { L: Lm, U, P } = L.lu(A); return eqRow('P = ', M(P), ' , L = ', M(Lm), ' , U = ', M(L.clean(U))) + '<p class="muted">P 는 행을 바꾼 순서를 나타내는 순열행렬(pivot)입니다.</p>'; }
      },
      {
        id: 'eig', name: '고유값과 고유벡터',
        help: [['4 1; 2 3', ''], ['2 0 0; 1 2 0; 0 1 3', ''], ['0 -1; 1 0', '복소 고유값'], ['1 2 3; 4 5 6; 7 8 10', '']],
        run(s) {
          const A = parseM(s); sq(A); const e = L.eig(A), n = A.length;
          const cp = []; // 특성다항식 계수 (파데예프-르베리에)
          let Mk = L.zeros(n, n), c = 1; cp.push(1);
          for (let k = 1; k <= n; k++) { Mk = L.add(L.mul(A, Mk), L.scale(L.eye(n), c)); const AM = L.mul(A, Mk); c = -AM.reduce((t, r, i) => t + r[i], 0) / k; cp.push(c); }
          let h = `<p>특성다항식 det(λI − A) = ${N.polyStr(cp.slice().reverse().map(v => +v.toPrecision(12)), 'λ')}</p><p>고유값: <b>${e.values.map(z => (z.im ? L.cstr(z) : N.exact(z.re))).join(',  ')}</b></p>`;
          const vs = e.sym ? e.values.map((z, i) => ({ value: z.re, vec: L.col(e.vectors, i) })) : e.eigvecs;
          if (vs.length) h += N.table(vs.map(v => [N.exact(v.value), N.vec(v.vec.map(x => +x.toPrecision(10)))]), ['고유값 λ', '고유벡터']);
          return h;
        }
      },
      {
        id: 'maxmin', name: '이차형식의 최대·최소  (|x| = 1)',
        note: '대칭행렬 A 에 대해 |x| = 1 에서 f(x) = xᵀAx 의 최댓값·최솟값 = 가장 큰·작은 고유값',
        help: [['3 1; 1 3', ''], ['2 1 0; 1 2 1; 0 1 2', '']],
        run(s) { const A = parseM(s); sq(A); const { values, vectors } = L.eigSym(A), n = values.length; return `<p>최댓값 <b>${N.exact(values[0])}</b>, x = ${N.vec(L.col(vectors, 0))}</p><p>최솟값 <b>${N.exact(values[n - 1])}</b>, x = ${N.vec(L.col(vectors, n - 1))}</p>`; }
      },
      {
        id: 'pow', name: '거듭제곱  A², A³, A⁴, Aⁿ',
        help: [['1 1; 1 0 | 10', ''], ['2 1; 0 1 | 5', ''], ['0.5 0.5; 0.2 0.8 | 50', '마르코프 행렬']],
        run(s) { const [a, k] = split2(s); const A = parseM(a), n = Math.round(E.num(k)); sq(A); return eqRow('A² = ', M(L.pow(A, 2)), ' A³ = ', M(L.pow(A, 3)), ' A⁴ = ', M(L.pow(A, 4))) + eqRow(`A<sup>${n}</sup> = `, M(L.pow(A, n))); }
      },
      {
        id: 'rec', name: '점화식  aₙ₊₂ = p·aₙ₊₁ + q·aₙ',
        note: '입력: p, q, n  (a₀ = 0, a₁ = 1)   또는   p, q, n, a₀, a₁',
        help: [['1, 1, 20', '피보나치 a₂₀'], ['2, 1, 10', '펠 수열'], ['1, 1, 100, 2, 1', '루카스 수 L₁₀₀']],
        run(s) {
          const [p, q, n, a0 = 0, a1 = 1] = E.nums(s).map(Math.round);
          const D = p * p + 4 * q, r1 = (p + Math.sqrt(D)) / 2, r2 = (p - Math.sqrt(D)) / 2;
          let h = eqRow('[aₙ₊₁; aₙ] = ', M([[p, q], [1, 0]]), `<sup>n</sup> [a₁; a₀]`) + `<p>a<sub>${n}</sub> = <b>${seq(p, q, a0, a1, n)}</b></p>`;
          if (D > 0) { const A = (a1 - a0 * r2) / (r1 - r2), Bc = (a0 * r1 - a1) / (r1 - r2); const ex = (v) => N.exact(v).replace(/ <span.*<\/span>/, ''); h += `<p>비네 공식: aₙ = ${ex(A)}·(${ex(r1)})ⁿ ${Bc < 0 ? '−' : '+'} ${ex(Math.abs(Bc))}·(${ex(r2)})ⁿ</p>`; }
          h += `<p class="muted">a₀ … a₁₅: ${[...Array(16).keys()].map(k => seq(p, q, a0, a1, k)).join(', ')}</p>`;
          return h;
        }
      },
      {
        id: 'named', name: '이름 있는 수열의 n 번째 항',
        help: [['20', ''], ['50', '']],
        run(s) { const n = Math.round(E.num(s)); return N.table(NAMED.map(([nm, p, q, a0, a1]) => [nm, `p=${p}, q=${q}`, seq(p, q, a0, a1, n).toString(), [...Array(8).keys()].map(k => seq(p, q, a0, a1, k)).join(', ') + ', …']), ['수열', '점화식', `${n}번째 항`, '처음 몇 항']); }
      }
    ]
  });

  K.cx = { C, cparse, Q, qparse };
})();
