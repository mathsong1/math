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

  /* ---------- 풀이 과정 도우미 ---------- */
  const fp = (v) => { const t = f(v); return /^-|\//.test(t) ? `(${t})` : t; }; // 곱셈식 안에서 괄호
  /**
   * 가우스(-조던) 소거를 하며 행 연산을 기록
   *  ncols: 피벗을 찾을 열 수 (첨가행렬이면 A 의 열 수),  full: true 면 기약 행사다리꼴까지
   *  → { steps: [{op, M}], R }
   */
  function gaussSteps(A0, ncols = A0[0].length, full = true) {
    const A = A0.map(r => r.slice()), m = A.length, steps = []; let row = 0;
    const snap = () => L.clean(A.map(r => r.map(v => (Math.abs(v - Math.round(v)) < 1e-10 ? Math.round(v) : v))));
    for (let c = 0; c < ncols && row < m; c++) {
      let p = -1; for (let i = row; i < m; i++) if (Math.abs(A[i][c]) > 1e-10) { p = i; break; }
      if (p < 0) continue;
      if (p !== row) { [A[p], A[row]] = [A[row], A[p]]; steps.push({ op: `R${row + 1} ↔ R${p + 1}`, M: snap() }); }
      const pv = A[row][c];
      if (full && Math.abs(pv - 1) > 1e-12) { A[row] = A[row].map(v => v / pv); steps.push({ op: `R${row + 1} ← R${row + 1} ÷ ${fp(pv)}`, M: snap() }); }
      const ops = [];
      for (let i = full ? 0 : row + 1; i < m; i++) {
        if (i === row || Math.abs(A[i][c]) < 1e-12) continue;
        const k = A[i][c] / A[row][c];
        A[i] = A[i].map((v, j) => v - k * A[row][j]);
        ops.push(`R${i + 1} ← R${i + 1} ${k < 0 ? '+' : '−'} ${Math.abs(Math.abs(k) - 1) < 1e-12 ? '' : fp(Math.abs(k))}R${row + 1}`);
      }
      if (ops.length) steps.push({ op: ops.join(',  '), M: snap() });
      row++;
    }
    return { steps, R: snap() };
  }
  /** 행 연산 기록 → 풀이 줄 (행렬 그림 포함) */
  const stepsHtml = (st, max = 14) => (st.length ? st.slice(0, max).map(s => eqRow(`${s.op}  →  `, M(s.M))).join('') + (st.length > max ? '<p>…</p>' : '') : '<p>이미 원하는 꼴입니다.</p>');
  /** 특성다항식 det(λI − A) 계수 (높은 차수부터), 파데예프-르베리에 */
  function charPoly(A) {
    const n = A.length, cp = [1]; let Mk = L.zeros(n, n), c = 1;
    for (let k = 1; k <= n; k++) { Mk = L.add(L.mul(A, Mk), L.scale(L.eye(n), c)); const AM = L.mul(A, Mk); c = -AM.reduce((t, r, i) => t + r[i], 0) / k; cp.push(c); }
    return cp.map(v => +v.toPrecision(12));
  }
  const cpStr = (A) => N.polyStr(charPoly(A).slice().reverse(), 'λ');
  /** 특성방정식을 성분으로 쓴 줄 */
  function charLines(A) {
    const n = A.length, tr = A.reduce((t, r, i) => t + r[i], 0);
    if (n === 2) return [`det(λI − A) = (λ − ${fp(A[0][0])})(λ − ${fp(A[1][1])}) − ${fp(A[0][1])}·${fp(A[1][0])}`, `= λ² − (tr A)λ + det A = λ² − ${fp(tr)}λ + ${fp(L.det(A))}`, `= ${cpStr(A)}`];
    return [`det(λI − A) = λ<sup>${n}</sup> − (tr A)λ<sup>${n - 1}</sup> + … + (−1)<sup>${n}</sup>det A,   tr A = ${f(tr)},  det A = ${f(L.det(A))}`, `= ${cpStr(A)}`];
  }
  /** 실수 고유값마다 (A − λI)v = 0 을 풀어 고유벡터 구하는 풀이 (HTML) */
  function eigvecLines(A, vals) {
    const out = [], seen = [];
    vals.forEach(l => {
      if (seen.some(s => Math.abs(s - l) < 1e-8)) return; seen.push(l);
      const B = A.map((r, i) => r.map((v, j) => v - (i === j ? l : 0))), ns = L.nullspace(B, 1e-7), { R } = gaussSteps(B);
      out.push(eqRow(`λ = ${N.exactShort(l)}:  A − λI = `, M(L.clean(B)), ' → ', M(R), ` → 고유벡터 ${ns.length ? ns.map(v => N.vec(v.map(x => +x.toPrecision(10)))).join(', ') : '(없음)'}${ns.length > 1 ? `  (${ns.length}개)` : ''}`));
    });
    return out.join('');
  }
  /** 행렬식 풀이: 2×2 는 ad − bc, 3×3 은 1행 여인수 전개, 그 이상은 위삼각형으로 소거 */
  function detLines(A) {
    const n = A.length;
    if (n === 1) return `det = ${f(A[0][0])}`;
    if (n === 2) return `ad − bc = ${fp(A[0][0])}·${fp(A[1][1])} − ${fp(A[0][1])}·${fp(A[1][0])} = ${f(A[0][0] * A[1][1])} − ${fp(A[0][1] * A[1][0])} = ${f(L.det(A))}`;
    if (n === 3) {
      const m = (i, j) => A.filter((_, r) => r !== i).map(r => r.filter((_, c) => c !== j)), d2 = (B) => B[0][0] * B[1][1] - B[0][1] * B[1][0];
      return [`1행 여인수 전개: a₁₁M₁₁ − a₁₂M₁₂ + a₁₃M₁₃`,
        A[0].map((a, j) => `${j ? (j % 2 ? ' − ' : ' + ') : ''}${fp(a)}·(${fp(m(0, j)[0][0])}·${fp(m(0, j)[1][1])} − ${fp(m(0, j)[0][1])}·${fp(m(0, j)[1][0])})`).join(''),
        `= ${A[0].map((a, j) => `${j ? (j % 2 ? ' − ' : ' + ') : ''}${fp(a)}·${fp(d2(m(0, j)))}`).join('')} = ${f(L.det(A))}`];
    }
    const { steps, R } = gaussSteps(A, n, false), swaps = steps.filter(s => s.op.includes('↔')).length;
    return stepsHtml(steps) + `<p>위삼각행렬의 대각성분 곱 × (−1)<sup>행 교환 ${swaps}번</sup> = ${R.map((r, i) => fp(r[i])).join('·')}${swaps % 2 ? ' × (−1)' : ''} = ${f(L.det(A))}</p>`;
  }
  /** 행렬곱 성분 계산 줄 (작은 행렬) */
  const prodLines = (A, B, name = 'AB', max = 9) => {
    const out = []; if (A[0].length !== B.length) return out;
    for (let i = 0; i < A.length; i++) for (let j = 0; j < B[0].length; j++) if (out.length < max) out.push(`(${name})<sub>${i + 1}${j + 1}</sub> = ${A[i].map((a, k) => `${fp(a)}·${fp(B[k][j])}`).join(' + ')} = ${f(A[i].reduce((t, a, k) => t + a * B[k][j], 0))}`);
    if (A.length * B[0].length > max) out.push('…');
    return out;
  };

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
          const parts = [];
          if (A.length === B.length && A[0].length === B[0].length) parts.push(['A ± B: 같은 자리 성분끼리 더하고 뺌', `(A + B)<sub>11</sub> = ${fp(A[0][0])} + ${fp(B[0][0])} = ${f(A[0][0] + B[0][0])},   (A − B)<sub>11</sub> = ${fp(A[0][0])} − ${fp(B[0][0])} = ${f(A[0][0] - B[0][0])}, …`]);
          if (A[0].length === B.length) parts.push([`AB: (AB)<sub>ij</sub> = (A 의 i행)·(B 의 j열)   (${L.size(A)} × ${L.size(B)} → ${A.length}×${B[0].length})`, prodLines(A, B)]);
          else parts.push(['AB', `A 의 열 수 ${A[0].length} ≠ B 의 행 수 ${B.length} → 정의되지 않음`]);
          if (B[0].length === A.length) parts.push(['BA (일반적으로 AB ≠ BA)', prodLines(B, A, 'BA', 4)]);
          if (A.length === A[0].length && A.length <= 3) parts.push(['det(A)', detLines(A)]);
          out.push(K.solve(parts));
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
          const [a, b] = x, [c, d] = y, dd = c * c + d * d;
          return eqRow('x = ' + C.str(x) + ' ↔ ', M([[x[0], -x[1]], [x[1], x[0]]]), ' , y = ' + C.str(y) + ' ↔ ', M([[y[0], -y[1]], [y[1], y[0]]])) + N.table(rows) + K.solve([
            ['덧셈·뺄셈: 실수부끼리, 허수부끼리', `x + y = (${f(a)} + ${fp(c)}) + (${f(b)} + ${fp(d)})i = ${C.str(C.add(x, y))}`],
            ['곱셈: (a + bi)(c + di) = (ac − bd) + (ad + bc)i   (i² = −1)', `(${fp(a)}·${fp(c)} − ${fp(b)}·${fp(d)}) + (${fp(a)}·${fp(d)} + ${fp(b)}·${fp(c)})i = ${C.str(C.mul(x, y))}`],
            ['나눗셈: 분자·분모에 분모의 켤레 (c − di) 를 곱함', `x / y = (${C.str(x)})(${C.str([c, -d])}) / (${fp(c)}² + ${fp(d)}²) = (${C.str(C.mul(x, [c, -d]))}) / ${f(dd)} = ${C.str(C.div(x, y))}`],
            ['절댓값과 편각  |x| = √(a² + b²),  θ = arg x', `|x| = √(${fp(a)}² + ${fp(b)}²) = √${f(a * a + b * b)} = ${N.exactShort(C.abs(x))},   θ = atan2(${f(b)}, ${f(a)}) = ${N.exactShort(C.arg(x))}`],
            ['eˣ = eᵃ(cos b + i sin b) (오일러 공식),  ln x = ln|x| + iθ', [`e<sup>${f(a)}</sup>(cos ${f(b)} + i sin ${f(b)}) = ${C.str(C.exp(x))}`, `ln ${N.dec(C.abs(x), 8)} + ${N.dec(C.arg(x), 8)}i = ${C.str(C.log(x))}`]],
            ['xʸ = e<sup>y·ln x</sup> (주값)', `y·ln x = ${C.str(C.mul(y, C.log(x)))}  →  e<sup>(…)</sup> = ${C.str(C.pow(x, y))}`]
          ]);
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
            ['x 의 실수부 / 벡터부', `${f(x[0])} / (${f(x[1])}, ${f(x[2])}, ${f(x[3])})`]]) + '<p class="muted">사원수의 곱은 교환법칙이 성립하지 않습니다 (xy ≠ yx).</p>' + K.solve([
            ['곱셈 규칙', 'i² = j² = k² = ijk = −1,   ij = k, jk = i, ki = j,   ji = −k, kj = −i, ik = −j'],
            ['실수부 a, 벡터부 v 로 쓰면  xy = (a₁a₂ − v₁·v₂) + (a₁v₂ + a₂v₁ + v₁×v₂)', (() => {
              const [a1, ...v1] = x, [a2, ...v2] = y, dt = L.dot(v1, v2), cr = [v1[1] * v2[2] - v1[2] * v2[1], v1[2] * v2[0] - v1[0] * v2[2], v1[0] * v2[1] - v1[1] * v2[0]];
              return [`실수부: ${fp(a1)}·${fp(a2)} − (${N.vec(v1)}·${N.vec(v2)}) = ${f(a1 * a2)} − ${fp(dt)} = ${f(a1 * a2 - dt)}`, `벡터부: ${fp(a1)}${N.vec(v2)} + ${fp(a2)}${N.vec(v1)} + ${N.vec(cr)} = ${N.vec(Q.mul(x, y).slice(1))}`, `→ xy = ${Q.str(Q.mul(x, y))},   yx 는 외적의 부호만 바뀜 → ${Q.str(Q.mul(y, x))}`];
            })()],
            ['역원  x⁻¹ = x* / |x|²', `|x|² = ${x.map(v => `${fp(v)}²`).join(' + ')} = ${f(x.reduce((t, v) => t + v * v, 0))}  →  x⁻¹ = (${Q.str(Q.conj(x))}) / ${f(x.reduce((t, v) => t + v * v, 0))} = ${Q.str(Q.inv(x))}`]
          ]);
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
          const parts = [];
          if (V.length >= 2) {
            const [u, v] = V, dot = L.dot(u, v);
            parts.push(['내적  x₁·x₂ = Σ aᵢbᵢ', `${u.map((a, i) => `${fp(a)}·${fp(v[i])}`).join(' + ')} = ${f(dot)}`]);
            parts.push(['크기  |x| = √(Σ aᵢ²)', [`|x₁| = √(${u.map(a => `${fp(a)}²`).join(' + ')}) = √${f(L.dot(u, u))} = ${N.exactShort(L.norm(u))}`, `|x₂| = √(${v.map(a => `${fp(a)}²`).join(' + ')}) = √${f(L.dot(v, v))} = ${N.exactShort(L.norm(v))}`]]);
            parts.push(['사잇각  cos θ = x₁·x₂ / (|x₁||x₂|)', `cos θ = ${f(dot)} / (${N.exactShort(L.norm(u))} × ${N.exactShort(L.norm(v))}) = ${N.exactShort(dot / (L.norm(u) * L.norm(v)))}  →  θ = ${N.dec(Math.acos(Math.max(-1, Math.min(1, dot / (L.norm(u) * L.norm(v))))) * 180 / Math.PI, 8)}°`]);
            if (n === 3) parts.push(['외적  x₁ × x₂ = (a₂b₃ − a₃b₂, a₃b₁ − a₁b₃, a₁b₂ − a₂b₁)', `(${fp(u[1])}·${fp(v[2])} − ${fp(u[2])}·${fp(v[1])}, ${fp(u[2])}·${fp(v[0])} − ${fp(u[0])}·${fp(v[2])}, ${fp(u[0])}·${fp(v[1])} − ${fp(u[1])}·${fp(v[0])}) = ${N.vec([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]])}`]);
          }
          parts.push(['부피: 그람 행렬 G = AAᵀ (성분 = 벡터끼리의 내적) 의 행렬식의 제곱근', eqRow('G = ', M(L.clean(G)), `  →  det G = ${f(L.det(G))},  √det G = ${N.exactShort(vol)}${vol < 1e-10 ? '  (0 이므로 일차종속)' : ''}`)]);
          return h + K.solve(parts);
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
    const gs = gaussSteps(aug, n), parts = [
      ['첨가행렬 [A | B] 만들기', eqRow('[A | B] = ', M(aug))],
      ['가우스-조던 소거 (행 바꾸기, 상수배, 다른 행의 상수배 더하기)', stepsHtml(gs.steps)],
      ['계수 비교', `rank A = ${rA},  rank [A|B] = ${rank},  미지수 ${n}개  →  ${rank > rA ? 'rank A < rank [A|B] → 불능 (해 없음)' : rA === n ? 'rank = 미지수 개수 → 해가 하나' : `rank < 미지수 개수 → 부정 (자유변수 ${n - rA}개)`}`]
    ];
    if (rank > rA) return h + '<p><b>해가 없습니다</b> (모순 방정식). 최소제곱해를 보려면 “최소제곱해”를 쓰세요.</p>' + K.solve(parts);
    if (rA === n) return h + `<p><b>해가 하나</b>: ${names.map((v, i) => `${v} = ${N.exact(R[pivots.indexOf(i)][n])}`).join(',  ')}</p>` + K.solve([...parts,
      ['각 행을 읽으면', names.map((v, i) => `${v} = ${N.exactShort(R[pivots.indexOf(i)][n])}`)],
      ['검산 (첫 식에 대입)', `${A[0].map((a, j) => `${fp(a)}·${fp(R[pivots.indexOf(j)][n])}`).join(' + ')} = ${f(A[0].reduce((t, a, j) => t + a * R[pivots.indexOf(j)][n], 0))}  (우변 ${f(b[0])})`]]);
    const free = [...Array(n).keys()].filter(j => !pivots.includes(j));
    const params = ['s', 't', 'r', 'p', 'q', 'm'];
    const expr = names.map((v, j) => {
      if (free.includes(j)) return `${v} = ${params[free.indexOf(j)]}`;
      const row = R[pivots.indexOf(j)];
      return `${v} = ${N.linStr(free.map(fj => -row[fj]), free.map((_, k) => params[k]), row[n])}`;
    });
    const xmin = L.mv(L.pinv(A), b);
    return h + `<p><b>해가 무수히 많습니다</b> (매개변수 ${free.length}개):</p><div class="steps">${expr.join('\n')}</div><p>원점에 가장 가까운 해: (${xmin.map(v => N.exactShort(v)).join(', ')})</p>` + K.solve([...parts,
      ['피벗이 없는 열의 변수를 매개변수로 두고 나머지를 나타냄', `자유변수: ${free.map((j, k) => `${names[j]} = ${params[k]}`).join(', ')}\n${expr.join('\n')}`]]);
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
          const AtA = L.mul(L.T(A), A), Atb = L.mv(L.T(A), bb), gs = gaussSteps(AtA.map((row, i) => [...row, Atb[i]]), AtA.length);
          return eqRow('AᵀA = ', M(AtA), ' , Aᵀb = ', M(Atb)) + `<p>최소제곱해 x = <b>(${x.map(v => N.exactShort(v)).join(', ')})</b></p><p>Ax = (${L.mv(A, x).map(v => f(v)).join(', ')}),  오차 |Ax − b| = ${N.exact(L.norm(r))}</p>` + K.solve([
            ['정규방정식  AᵀA x = Aᵀb   (오차 Ax − b 가 A 의 열공간과 수직)', eqRow('AᵀA = ', M(AtA), ' , Aᵀb = ', M(Atb))],
            ['[AᵀA | Aᵀb] 를 가우스-조던 소거', stepsHtml(gs.steps)],
            ['오차', `|Ax − b| = √(${r.map(v => `${fp(+v.toPrecision(10))}²`).join(' + ')}) = ${N.exactShort(L.norm(r))}`]
          ]);
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
          const AtA = L.mul(L.T(A), A), Atb = L.mv(L.T(A), b);
          const solve = K.solve([
            [`y = c₀ + c₁x${deg > 1 ? ' + … + c' + deg + 'x' + '<sup>' + deg + '</sup>' : ''} 에 점을 대입 → A c = b  (A 의 각 행 = 1, x, x², …)`, eqRow('A = ', M(A), ' , b = ', M(b))],
            ['정규방정식  AᵀA c = Aᵀb', eqRow('AᵀA = ', M(L.clean(AtA)), ' , Aᵀb = ', M(L.clean([Atb]).flat()))],
            ['가우스-조던 소거로 풀기', stepsHtml(gaussSteps(AtA.map((row, i) => [...row, Atb[i]]), AtA.length).steps)],
            ['결과', `c = (${c.map(v => N.exactShort(+v.toPrecision(10))).join(', ')})  →  y = ${N.polyStr(c.map(v => +v.toPrecision(10)))}`]
          ]);
          return { html: `<p>y = <b>${N.polyStr(c.map(v => +v.toPrecision(10)))}</b></p>` + eqRow('A = ', M(A), ' , b = ', M(b)) + solve, mount: (el) => { const box = document.createElement('div'); el.appendChild(box); K.plot.create(box, { view: K.plot.autoView([pts], 0.25) }).add({ type: 'points', pts, label: '자료' }).add({ type: 'fx', f: fn, label: '근사 다항식' }); } };
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
  /** 그람-슈미트 과정 줄 */
  function gsLines(V) {
    const us = [], out = [];
    V.forEach((x, k) => {
      let u = x.slice(); const terms = [];
      us.forEach((ui, i) => { const uu = L.dot(ui, ui); if (uu < 1e-12) return; const c = L.dot(x, ui) / uu; terms.push(`(${f(L.dot(x, ui))}/${f(uu)})u${i + 1}`); u = u.map((v, j) => v - c * ui[j]); });
      u = u.map(v => (Math.abs(v) < 1e-12 ? 0 : v)); us.push(u);
      out.push(`u${k + 1} = x${k + 1}${terms.length ? ' − ' + terms.join(' − ') : ''} = ${N.vec(u)},   |u${k + 1}| = ${N.exactShort(L.norm(u))}`);
    });
    return out;
  }
  register('matrix', 'diag', {
    ops: [
      {
        id: 'sym', name: '대칭행렬의 대각화  A = PDPᵀ',
        help: [['2 1; 1 2', ''], ['2 -1 0; -1 2 -1; 0 -1 2', ''], ['4 1 1; 1 4 1; 1 1 4', '중복 고유값']],
        run(s) {
          const A = parseM(s); sq(A); if (!A.every((r, i) => r.every((v, j) => Math.abs(v - A[j][i]) < 1e-12))) throw new Error('대칭행렬이 아닙니다. “일반 행렬의 대각화”를 쓰세요.');
          const { values, vectors: P } = L.eigSym(A), D = values.map((v, i) => values.map((_, j) => (i === j ? v : 0)));
          return `<p>고유값: ${values.map(v => N.exactShort(v)).join(', ')}</p>` + eqRow('P = ', M(P), ' , D = ', M(D)) + eqRow('PᵀAP = ', M(L.clean(L.mul(L.mul(L.T(P), A), P)))) + '<p class="muted">P 의 열이 정규직교 고유벡터입니다 (Pᵀ = P⁻¹).</p>' + K.solve([
            ['특성방정식 det(λI − A) = 0', charLines(A)],
            ['고유값', values.map(v => N.exactShort(v)).join(', ')],
            ['각 고유값에서 (A − λI)v = 0 풀기', eigvecLines(A, values)],
            ['정규화 (크기 1) 해서 열로 세우면 P, 대칭행렬의 고유벡터는 서로 수직', `중복 고유값의 고유공간은 그람-슈미트로 직교화 → P 는 직교행렬 (PᵀP = I),  PᵀAP = D`]
          ]);
        }
      },
      {
        id: 'gen', name: '일반 행렬의 대각화  A = PDP⁻¹',
        help: [['4 1; 2 3', ''], ['1 2 3; 0 4 5; 0 0 6', ''], ['1 1; 0 1', '대각화 불가 (조르당)'], ['0 -1; 1 0', '복소 고유값']],
        run(s) {
          const A = parseM(s); sq(A); const e = L.eig(A), n = A.length;
          let h = `<p>고유값: ${e.values.map(z => L.cstr(z)).join(', ')}</p>`;
          const parts = [['특성방정식 det(λI − A) = 0', charLines(A)], ['고유값', e.values.map(z => L.cstr(z)).join(', ')]];
          if (e.values.some(z => z.im)) return h + '<p>복소수 고유값이 있어 실수 범위에서 대각화할 수 없습니다.</p>' + K.solve(parts);
          const vecs = e.sym ? L.T(e.vectors) : e.eigvecs.map(v => v.vec), vals = e.sym ? e.values.map(z => z.re) : e.eigvecs.map(v => v.value);
          parts.push(['각 고유값에서 (A − λI)v = 0 풀기', eigvecLines(A, e.values.map(z => z.re))]);
          if (vecs.length < n) return h + `<p><b>대각화할 수 없습니다</b>: 일차독립인 고유벡터가 ${vecs.length}개뿐입니다 (${n}개 필요).</p>` + K.solve([...parts, ['판정', `일차독립인 고유벡터 ${vecs.length}개 < ${n}  (중복 고유값의 고유공간 차원이 중복도보다 작음) → 대각화 불가`]]);
          const P = L.T(vecs), D = vals.map((v, i) => vals.map((_, j) => (i === j ? v : 0)));
          return h + eqRow('P = ', M(P), ' , D = ', M(D), ' , P⁻¹ = ', M(L.inv(P))) + eqRow('P⁻¹AP = ', M(L.clean(L.mul(L.mul(L.inv(P), A), P)))) + K.solve([...parts,
            ['고유벡터를 열로 세워 P, 고유값을 같은 순서로 대각에 놓아 D', eqRow('P = ', M(P), ' , D = ', M(D))],
            ['확인  AP = PD  ⇔  P⁻¹AP = D', eqRow('AP = ', M(L.clean(L.mul(A, P))), ' = PD = ', M(L.clean(L.mul(P, D))))]]);
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
          return eqRow('Aᵀ = ', M(At), ' = Q R') + eqRow('Q = ', M(Qr), ' , R = ', M(Rr)) + `<p>부피 √det(AAᵀ) = |r₁₁·r₂₂·…| = <b>${N.exact(vol)}</b></p><p class="muted">Q 의 열이 정규직교 벡터입니다.</p>` + K.solve([
            ['그람-슈미트로 열벡터를 정규직교화 → Q', gsLines(V)],
            ['R = QᵀAᵀ  (rᵢⱼ = eᵢ·xⱼ,  위삼각행렬)', eqRow('R = ', M(Rr))],
            ['부피 = |R 의 대각성분 곱|', `${Rr.map((r, i) => fp(+r[i].toPrecision(10))).join(' × ')} → ${N.exactShort(vol)}`]
          ]);
        }
      },
      {
        id: 'gs', name: '그람-슈미트 직교화',
        help: [['1 2 3 0; 1 0 3 -1; 0 1 1 3', ''], ['1 1 0; 1 0 1; 0 1 1', '']],
        run(s) {
          const V = parseM(s), { u, e } = L.gramSchmidt(V);
          return `<div class="steps">${u.map((r, i) => `u${i + 1} = ${N.vec(r)}`).join('\n')}</div><h4>정규화 eᵢ = uᵢ/|uᵢ|</h4><div class="steps">${e.map((r, i) => `e${i + 1} = (${r.map(v => N.exact(v).replace(/ <span.*<\/span>/, '')).join(', ')})`).join('\n')}</div>` + K.solve([
            ['uₖ = xₖ − Σ (xₖ·uᵢ)/(uᵢ·uᵢ) uᵢ   (앞의 벡터 방향 성분을 뺌)', gsLines(V)],
            ['확인: 서로 내적이 0', u.flatMap((a, i) => u.slice(i + 1).map((b, j) => `u${i + 1}·u${i + j + 2} = ${f(+L.dot(a, b).toFixed(10))}`)).join(',  ') || '벡터가 하나']
          ]);
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
          const qparts = [
            ['이차식을 행렬로  f = XᵀAX + 2bᵀX + c   (A 의 대각 = 제곱항 계수, 비대각 = 곱항 계수의 절반)', eqRow('A = ', M(A), ' , b = ', M(b), ` , c = ${f(c)}`)],
            ...(center ? [['평행이동: 중심 x₀ 는 Ax₀ = −b 의 해 (일차항을 없앰)', `x₀ = (${center.map(v => N.exactShort(v)).join(', ')}),   c′ = c + bᵀx₀ = ${f(c)} + ${fp(L.dot(b, center))} = ${N.exactShort(cc)}`]] : []),
            ['회전: A 의 고유값 λᵢ 와 정규직교 고유벡터로 곱항을 없앰', [...charLines(A), `λ = ${e.values.map(v => N.exactShort(v)).join(', ')}`]],
            ['표준형  Σ λᵢ Xᵢ² + c′ = 0', `${terms}${center && Math.abs(cc) > 1e-12 ? ` ${cc < 0 ? '−' : '+'} ${N.exactShort(Math.abs(cc))}` : ''} = 0`]
          ];
          h += K.solve(qparts);
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
        run(s) { const [a, u] = split2(s); const A = parseM(a), v = E.nums(u); return eqRow('T(u) = ', M(A), M(v), ' = ', M(L.mv(A, v))) + K.solve([['각 성분 = A 의 행 · u', A.map((r, i) => `${i + 1}번째: ${r.map((x, j) => `${fp(x)}·${fp(v[j])}`).join(' + ')} = ${f(L.dot(r, v))}`)]]); }
      },
      {
        id: 'find', name: '선형변환 구하기  T(uᵢ) = vᵢ',
        note: '입력: u₁; u₂; … | v₁; v₂; …  (각 벡터를 한 행으로)',
        help: [['1 1 1; 1 1 0; 1 0 0 | 1 0; 2 -1; 4 3', 'T : R³ → R²'], ['3 1; 5 2 | 1 -2 -5; 2 1 -3', 'T : R² → R³']],
        run(s) {
          const [a, b] = split2(s); const U = rowsAsCols(a), V = rowsAsCols(b); sq(U, 'u 벡터들로 만든 행렬이 ');
          const A = L.mul(V, L.inv(U));
          return eqRow('A = [v₁ v₂ …][u₁ u₂ …]⁻¹ = ', M(V), M(L.inv(U)), ' = ', M(A)) + `<p>T(X) = AX</p>` + K.solve([
            ['조건을 행렬로: A[u₁ u₂ …] = [v₁ v₂ …]  →  A = V U⁻¹', eqRow('U = ', M(U), ' , V = ', M(V))],
            ['U⁻¹ 구하기 ([U | I] 를 가우스-조던 소거)', stepsHtml(gaussSteps(U.map((r, i) => [...r, ...L.eye(U.length)[i]]), U.length).steps, 8) + eqRow('U⁻¹ = ', M(L.inv(U)))],
            ['A = V U⁻¹', prodLines(V, L.inv(U), 'A', 6)]
          ]);
        }
      },
      {
        id: 'coord', name: '기저 B 에 대한 좌표',
        note: '입력: b₁; b₂; b₃ | v  →  v = a·b₁ + b·b₂ + c·b₃ 의 (a, b, c)',
        help: [['1 0 0; 1 -1 0; 1 -2 1 | 6, 3, 2', '(6, 3, 2) 를 기저 B 로'], ['1 1; 1 -1 | 3, 1', '']],
        run(s) { const [a, b] = split2(s); const Bm = rowsAsCols(a), v = E.nums(b); sq(Bm, '기저 행렬이 '); const c = L.mv(L.inv(Bm), v); return eqRow('[v]<sub>B</sub> = B⁻¹v = ', M(L.inv(Bm)), M(v), ' = ', M(c)) + `<p>v = ${N.linStr(c, c.map((_, i) => `·b${i + 1}`)).replace(/(^|[-+] )·/g, '$11·')}</p>` + K.solve([
          ['v = c₁b₁ + c₂b₂ + … 를 연립방정식 [b₁ b₂ …] c = v 로', eqRow('[B | v] = ', M(Bm.map((r, i) => [...r, v[i]])))],
          ['가우스-조던 소거', stepsHtml(gaussSteps(Bm.map((r, i) => [...r, v[i]]), Bm.length).steps)],
          ['검산', `${c.map((ci, i) => `${fp(+ci.toPrecision(10))}·b${i + 1}`).join(' + ')} = ${N.vec(L.mv(Bm, c).map(x => +x.toPrecision(10)))}`]]); }
      },
      {
        id: 'trans', name: '전이행렬  (기저 B → 기저 C)',
        note: '입력: b₁; b₂; … | c₁; c₂; …   →  P = C⁻¹B  ([v]_C = P[v]_B)',
        help: [['1 0 0; 1 -1 0; 1 -2 1 | 1 0 0; 1 1 0; 1 0 1', 'P₂ 의 기저 (1, 1−x, (1−x)²) → (1, 1+x, 1+x²)']],
        run(s) { const [a, b] = split2(s); const Bm = rowsAsCols(a), Cm = rowsAsCols(b); const P = L.mul(L.inv(Cm), Bm); return eqRow('P<sub>C←B</sub> = C⁻¹B = ', M(P)) + eqRow('P<sub>B←C</sub> = ', M(L.inv(P))) + K.solve([
          ['각 bⱼ 를 기저 C 로 나타낸 좌표가 P 의 j열  →  C·P = B', eqRow('B = ', M(Bm), ' , C = ', M(Cm))],
          ['[C | B] 를 가우스-조던 소거하면 오른쪽이 C⁻¹B', stepsHtml(gaussSteps(Cm.map((r, i) => [...r, ...Bm[i]]), Cm.length).steps, 8)],
          ['반대 방향은 역행렬', 'P<sub>B←C</sub> = (P<sub>C←B</sub>)⁻¹']]); }
      },
      {
        id: 'tb', name: '기저 B 에 대한 T 의 행렬  [T]_B',
        note: '입력: b₁; b₂; … | A   →  [T]_B = B⁻¹AB',
        help: [['1 -1 0; -2 1 1; 1 1 1 | 2 2 0; 1 1 2; 1 1 2', '']],
        run(s) { const [a, b] = split2(s); const Bm = rowsAsCols(a), A = parseM(b); const D = L.mul(L.mul(L.inv(Bm), A), Bm); return eqRow('[T]<sub>B</sub> = B⁻¹AB = ', M(D)) + K.solve([
          ['기저 B 를 열로 세운 행렬과 역행렬', eqRow('B = ', M(Bm), ' , B⁻¹ = ', M(L.clean(L.inv(Bm))))],
          ['AB 먼저 계산 (각 열 = T(bⱼ))', eqRow('AB = ', M(L.clean(L.mul(A, Bm))))],
          ['B⁻¹(AB): T(bⱼ) 를 기저 B 의 좌표로 바꿈', eqRow('[T]<sub>B</sub> = ', M(L.clean(D)))]]); }
      },
      {
        id: 'tbc', name: '두 기저 B, C 에 대한 T 의 행렬  [T]_{B,C}',
        note: '입력: c₁; c₂; … | T(b₁); T(b₂); …   →  C⁻¹[T(b₁) T(b₂) …]',
        help: [['1 0 -1; -1 2 2; 0 1 2 | 1 -2 -5; 2 1 -3', '문서의 예 (T : R² → R³)']],
        run(s) { const [a, b] = split2(s); const Cm = rowsAsCols(a), TB = rowsAsCols(b); return eqRow('[T]<sub>B,C</sub> = C⁻¹[T(b₁) T(b₂)] = ', M(L.mul(L.inv(Cm), TB))) + K.solve([
          ['각 T(bⱼ) 를 기저 C 의 좌표로: C·x = T(bⱼ) 를 한꺼번에 풂', eqRow('[C | T(b₁) T(b₂) …] = ', M(Cm.map((r, i) => [...r, ...TB[i]])))],
          ['가우스-조던 소거 → 오른쪽 블록이 답', stepsHtml(gaussSteps(Cm.map((r, i) => [...r, ...TB[i]]), Cm.length).steps, 8)]]); }
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
          const parts = [[A.length === 2 ? '2×2 행렬식  ad − bc' : A.length === 3 ? '3×3 행렬식: 1행으로 여인수 전개' : '행 소거로 위삼각행렬을 만든 뒤 대각성분을 곱함', detLines(A)]];
          if (A.length === 3) parts.push(['사뤼스 법칙으로 확인', `(${[[0, 0, 1, 1, 2, 2], [0, 1, 1, 2, 2, 0], [0, 2, 1, 0, 2, 1]].map(([a, b, c, d2, e2, g]) => `${fp(A[a][b])}·${fp(A[c][d2])}·${fp(A[e2][g])}`).join(' + ')}) − (${[[0, 2, 1, 1, 2, 0], [0, 0, 1, 2, 2, 1], [0, 1, 1, 0, 2, 2]].map(([a, b, c, d2, e2, g]) => `${fp(A[a][b])}·${fp(A[c][d2])}·${fp(A[e2][g])}`).join(' + ')}) = ${f(d)}`]);
          return h + K.solve(parts);
        }
      },
      { id: 'inv', name: '역행렬', help: [['2 1 3; 0 4 -2; 5 -2 -1', ''], ['1 2; 3 4', '']], run(s) {
        const A = parseM(s); sq(A); const n = A.length, d = L.det(A), parts = [['역행렬이 있을 조건 det A ≠ 0', detLines(A)]];
        if (Math.abs(d) < 1e-12) return '<p><b>역행렬이 없습니다</b> (det A = 0).</p>' + K.solve(parts);
        const I = L.inv(A);
        if (n === 2) parts.push(['2×2 공식  A⁻¹ = (1/det A)[d −b; −c a]', eqRow(`A⁻¹ = 1/${fp(d)} × `, M([[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]]), ' = ', M(I))]);
        parts.push(['[A | I] 를 가우스-조던 소거하면 [I | A⁻¹]', stepsHtml(gaussSteps(A.map((r, i) => [...r, ...L.eye(n)[i]]), n).steps)]);
        return eqRow('A⁻¹ = ', M(I)) + eqRow('AA⁻¹ = ', M(L.clean(L.mul(A, I)))) + K.solve(parts);
      } },
      {
        id: 'rank', name: 'rank 와 기약 행사다리꼴',
        help: [['1 2 3; 2 4 6; 1 0 1', ''], ['1 2 1 0; 2 4 0 2; 1 2 2 -1', '']],
        run(s) {
          const A = parseM(s), { R, rank, pivots } = L.rref(A), ns = L.nullspace(A);
          return eqRow('rref(A) = ', M(R)) + `<p>rank A = <b>${rank}</b>,  피벗 열: ${pivots.map(p => p + 1).join(', ')}</p><p>영공간의 기저: ${ns.length ? ns.map(v => N.vec(v)).join(', ') : '{0}'} (nullity ${ns.length})</p>` + K.solve([
            ['가우스-조던 소거', stepsHtml(gaussSteps(A).steps)],
            ['rank = 0 이 아닌 행(피벗)의 개수', `피벗 ${rank}개 → rank A = ${rank}`],
            ['영공간: Ax = 0 에서 피벗 없는 열의 변수를 자유변수로', `nullity = 열 수 − rank = ${A[0].length} − ${rank} = ${ns.length}  (차원 정리)`]
          ]);
        }
      },
      {
        id: 'lu', name: 'LU 분해와 pivot  PA = LU',
        help: [['2 1 3; 0 4 -2; 5 -2 -1', ''], ['0 2; 1 3', '행 교환이 필요한 예']],
        run(s) {
          const A = parseM(s); sq(A); const { L: Lm, U, P } = L.lu(A);
          const PA = L.mul(P, A), n = A.length, lines = [];
          for (let c = 0; c < n - 1; c++) for (let i = c + 1; i < n; i++) if (Math.abs(Lm[i][c]) > 1e-12) lines.push(`l<sub>${i + 1}${c + 1}</sub> = ${f(Lm[i][c])}:  R${i + 1} ← R${i + 1} − ${fp(Lm[i][c])}R${c + 1}`);
          return eqRow('P = ', M(P), ' , L = ', M(Lm), ' , U = ', M(L.clean(U))) + '<p class="muted">P 는 행을 바꾼 순서를 나타내는 순열행렬(pivot)입니다.</p>' + K.solve([
            ['피벗이 0 이 되지 않도록 (부분 피벗: 열에서 절댓값이 가장 큰 수) 행을 바꿈 → PA', eqRow('PA = ', M(PA))],
            ['PA 를 소거해 위삼각행렬 U 를 만들고, 쓴 배수를 L 의 같은 자리에 적음', lines.length ? lines : '소거할 것이 없음'],
            ['확인  LU = PA', eqRow('LU = ', M(L.clean(L.mul(Lm, U))))]
          ]);
        }
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
          const real = e.values.filter(z => !z.im).map(z => z.re);
          return h + K.solve([
            ['특성방정식 det(λI − A) = 0', charLines(A)],
            ['근 구하기 → 고유값', `λ = ${e.values.map(z => (z.im ? L.cstr(z) : N.exactShort(z.re))).join(',  ')}\n확인: 고유값의 합 = tr A = ${f(A.reduce((t, r, i) => t + r[i], 0))},  곱 = det A = ${f(L.det(A))}`],
            ...(real.length ? [['각 고유값에서 (A − λI)v = 0 의 해가 고유벡터', eigvecLines(A, real)]] : [])
          ]);
        }
      },
      {
        id: 'maxmin', name: '이차형식의 최대·최소  (|x| = 1)',
        note: '대칭행렬 A 에 대해 |x| = 1 에서 f(x) = xᵀAx 의 최댓값·최솟값 = 가장 큰·작은 고유값',
        help: [['3 1; 1 3', ''], ['2 1 0; 1 2 1; 0 1 2', '']],
        run(s) {
          const A = parseM(s); sq(A); const { values, vectors } = L.eigSym(A), n = values.length;
          return `<p>최댓값 <b>${N.exact(values[0])}</b>, x = ${N.vec(L.col(vectors, 0))}</p><p>최솟값 <b>${N.exact(values[n - 1])}</b>, x = ${N.vec(L.col(vectors, n - 1))}</p>` + K.solve([
            ['고유값 구하기', [...charLines(A), `λ = ${values.map(v => N.exactShort(v)).join(', ')}`]],
            ['단위 고유벡터 x 에서 f(x) = xᵀAx = xᵀ(λx) = λ|x|² = λ', `대칭행렬은 직교대각화되므로 |x| = 1 에서 λ<sub>min</sub> ≤ xᵀAx ≤ λ<sub>max</sub>\n최댓값 = ${N.exactShort(values[0])},  최솟값 = ${N.exactShort(values[n - 1])}`],
            ['그때의 x (단위 고유벡터)', eigvecLines(A, [values[0], values[n - 1]])]
          ]);
        }
      },
      {
        id: 'pow', name: '거듭제곱  A², A³, A⁴, Aⁿ',
        help: [['1 1; 1 0 | 10', ''], ['2 1; 0 1 | 5', ''], ['0.5 0.5; 0.2 0.8 | 50', '마르코프 행렬']],
        run(s) {
          const [a, k] = split2(s); const A = parseM(a), n = Math.round(E.num(k)); sq(A);
          const bits = n.toString(2), sq2 = []; let P = A;
          for (let i = 0; i < bits.length; i++) { sq2.push(eqRow(`A<sup>${2 ** i}</sup> = `, M(L.clean(P)))); P = L.mul(P, P); }
          return eqRow('A² = ', M(L.pow(A, 2)), ' A³ = ', M(L.pow(A, 3)), ' A⁴ = ', M(L.pow(A, 4))) + eqRow(`A<sup>${n}</sup> = `, M(L.pow(A, n))) + K.solve([
            ['A² = A·A', prodLines(A, A, 'A²', 4)],
            [`반복제곱: ${n} = ${bits}₍₂₎ = ${[...bits].reverse().map((b, i) => (b === '1' ? 2 ** i : 0)).filter(Boolean).reverse().join(' + ')}`, sq2.slice(0, 8).join('') + (sq2.length > 8 ? '<p>…</p>' : '')],
            ['해당하는 거듭제곱을 곱함', `A<sup>${n}</sup> = ${[...bits].reverse().map((b, i) => (b === '1' ? `A<sup>${2 ** i}</sup>` : '')).filter(Boolean).reverse().join(' · ')}`]
          ]);
        }
      },
      {
        id: 'rec', name: '점화식  aₙ₊₂ = p·aₙ₊₁ + q·aₙ',
        note: '입력: p, q, n  (a₀ = 0, a₁ = 1)   또는   p, q, n, a₀, a₁',
        help: [['1, 1, 20', '피보나치 a₂₀'], ['2, 1, 10', '펠 수열'], ['1, 1, 100, 2, 1', '루카스 수 L₁₀₀']],
        run(s) {
          const [p, q, n, a0 = 0, a1 = 1] = E.nums(s).map(Math.round);
          const D = p * p + 4 * q, r1 = (p + Math.sqrt(D)) / 2, r2 = (p - Math.sqrt(D)) / 2;
          let h = eqRow('[aₙ₊₁; aₙ] = ', M([[p, q], [1, 0]]), `<sup>n</sup> [a₁; a₀]`) + `<p>a<sub>${n}</sub> = <b>${seq(p, q, a0, a1, n)}</b></p>`;
          const ex = (v) => N.exact(v).replace(/ <span.*<\/span>/, '');
          const rparts = [['특성방정식  r² = p·r + q  →  r² − ' + p + 'r − ' + `(${q}) = 0`, `판별식 D = p² + 4q = ${p}² + 4×(${q}) = ${D}${D > 0 ? `  →  r = (${p} ± √${D})/2 = ${ex(r1)}, ${ex(r2)}` : D === 0 ? `  →  중근 r = ${p}/2 = ${ex(p / 2)}` : '  →  복소수 근'}`]];
          if (D > 0) {
            const A = (a1 - a0 * r2) / (r1 - r2), Bc = (a0 * r1 - a1) / (r1 - r2);
            h += `<p>비네 공식: aₙ = ${ex(A)}·(${ex(r1)})ⁿ ${Bc < 0 ? '−' : '+'} ${ex(Math.abs(Bc))}·(${ex(r2)})ⁿ</p>`;
            rparts.push(['일반항  aₙ = α·r₁ⁿ + β·r₂ⁿ 에 초항 대입', [`n = 0: α + β = ${a0}`, `n = 1: α·${ex(r1)} + β·${ex(r2)} = ${a1}`, `→ α = (a₁ − a₀r₂)/(r₁ − r₂) = ${ex(A)},   β = (a₀r₁ − a₁)/(r₁ − r₂) = ${ex(Bc)}`]]);
          }
          rparts.push(['행렬로 보면  [aₙ₊₁; aₙ] = M [aₙ; aₙ₋₁],  M = [p q; 1 0]', `M 의 고유값 = 특성방정식의 근,  aₙ 은 Mⁿ 을 반복제곱으로 계산\n처음 몇 항: ${[...Array(8).keys()].map(k2 => seq(p, q, a0, a1, k2)).join(', ')}, …`]);
          h += K.solve(rparts);
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
