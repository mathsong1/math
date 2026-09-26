/*
 * 평면도형 모듈 (원본: Vector2DSpaceUMP_5.java)
 *  평면벡터, 직선, 도형, 다항함수, 특수 다항식
 */
(function () {
  const K = window.KPHS, { register } = K;
  const N = K.num, E = K.expr, L = K.la;
  const f = (x) => N.fmt(x), ex = (x) => N.exact(x), vec = (v) => N.vec(v);
  const pt = (p, name) => `${name ? name : ''}(${f(p[0])}, ${f(p[1])})`;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1], cross = (a, b) => a[0] * b[1] - a[1] * b[0], len = (a) => Math.hypot(a[0], a[1]);
  const deg = (r) => `${N.dec(r * 180 / Math.PI, 8)}°`;
  const names = 'ABCDEFGHIJKLMNOP';

  /** 그림 붙이기 */
  function drawer(build, equal = true) {
    return (el) => {
      const box = document.createElement('div'); el.appendChild(box);
      const items = [], pts = [];
      const api = {
        add(it) { items.push(it); if (it.pts) it.pts.forEach(p => pts.push(p)); if (it.view) it.view.forEach(p => pts.push(p)); return api; }
      };
      build(api);
      const pl = K.plot.create(box, { view: K.plot.autoView([pts], 0.25), equal });
      items.forEach(it => pl.add(it));
    };
  }
  const circlePts = (c, r) => [[c[0] - r, c[1] - r], [c[0] + r, c[1] + r]];
  const circle = (c, r, label, color) => ({ type: 'param', x: t => c[0] + r * Math.cos(t), y: t => c[1] + r * Math.sin(t), t: [0, 2 * Math.PI], label, color, view: circlePts(c, r), width: 1.5 });

  /* ---------------- 평면벡터 ---------------- */
  function centers(A, B, C) {
    const a = len(sub(B, C)), b = len(sub(C, A)), c = len(sub(A, B));
    const G = mul(add(add(A, B), C), 1 / 3);
    const D = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    if (Math.abs(D) < 1e-12) throw new Error('세 점이 한 직선 위에 있어 삼각형이 아닙니다.');
    const s2 = (P) => P[0] ** 2 + P[1] ** 2;
    const O = [(s2(A) * (B[1] - C[1]) + s2(B) * (C[1] - A[1]) + s2(C) * (A[1] - B[1])) / D, (s2(A) * (C[0] - B[0]) + s2(B) * (A[0] - C[0]) + s2(C) * (B[0] - A[0])) / D];
    const H = sub(mul(add(add(A, B), C), 1), mul(O, 2));
    const I = mul(add(add(mul(A, a), mul(B, b)), mul(C, c)), 1 / (a + b + c));
    const S = Math.abs(cross(sub(B, A), sub(C, A))) / 2, R = a * b * c / (4 * S), r = 2 * S / (a + b + c);
    const Ja = mul(add(add(mul(A, -a), mul(B, b)), mul(C, c)), 1 / (-a + b + c));
    const Jb = mul(add(add(mul(A, a), mul(B, -b)), mul(C, c)), 1 / (a - b + c));
    const Jc = mul(add(add(mul(A, a), mul(B, b)), mul(C, -c)), 1 / (a + b - c));
    return { a, b, c, G, O, H, I, S, R, r, Ja, Jb, Jc };
  }
  register('plane', 'vector', {
    ops: [
      {
        id: 'two', name: '두 벡터  OA, OB',
        help: [['(1, 2), (-2, 5)', 'A(1, 2), B(−2, 5)'], ['(3, 4), (4, -3)', '수직인 두 벡터']],
        run(s) {
          const [A, B] = E.points(s, 2); const AB = sub(B, A), th = Math.acos(Math.max(-1, Math.min(1, dot(A, B) / (len(A) * len(B)))));
          const proj = mul(B, dot(A, B) / dot(B, B));
          return {
            html: N.table([['OA + OB', vec(add(A, B))], ['OA − OB', vec(sub(A, B))], ['AB = OB − OA', vec(AB)], ['OA · OB (내적)', f(dot(A, B))],
              ['|OA|, |OB|, |AB|', `${N.exactShort(len(A))}, ${N.exactShort(len(B))}, ${N.exactShort(len(AB))}`], ['∠AOB', `${deg(th)} (cos = ${ex(Math.cos(th))})`],
              ['AB 방향 단위벡터', `(${N.exactShort(AB[0] / len(AB))}, ${N.exactShort(AB[1] / len(AB))})`], ['AB 에 수직인 벡터', vec([AB[1], -AB[0]])],
              ['OA 의 OB 위로의 정사영', vec(proj)], ['삼각형 OAB 의 넓이', ex(Math.abs(cross(A, B)) / 2)]]),
            mount: drawer(p => p.add({ type: 'poly', pts: [[0, 0], A] }).add({ type: 'poly', pts: [[0, 0], B] }).add({ type: 'poly', pts: [A, B], dash: [5, 4] }).add({ type: 'points', pts: [[0, 0, 'O'], [...A, 'A'], [...B, 'B']] }))
          };
        }
      },
      {
        id: 'divide', name: '내분점 · 외분점',
        note: '입력: A, B ; m, n',
        help: [['(1, 2), (7, 5); 2, 1', 'AB 를 2 : 1 로'], ['(-1, 3), (5, -3); 1, 3', '']],
        run(s) {
          const [p, r] = s.split(';'); const [A, B] = E.points(p, 2), [m, n] = E.nums(r);
          const P = mul(add(mul(A, n), mul(B, m)), 1 / (m + n)), Q = m !== n ? mul(sub(mul(B, m), mul(A, n)), 1 / (m - n)) : null, M = mul(add(A, B), 0.5);
          return { html: `<p>내분점 P = (nA + mB)/(m + n) = <b>${pt(P)}</b></p><p>외분점 Q = (mB − nA)/(m − n) = <b>${Q ? pt(Q) : '없음 (m = n)'}</b></p><p>중점 M = ${pt(M)}</p>`, mount: drawer(d => { d.add({ type: 'poly', pts: Q ? [A, B, Q] : [A, B] }).add({ type: 'points', pts: [[...A, 'A'], [...B, 'B'], [...P, 'P'], ...(Q ? [[...Q, 'Q']] : [])] }); }) };
        }
      },
      {
        id: 'tri', name: '삼각형의 오심  (무게중심, 외심, 수심, 내심, 방심)',
        help: [['(1, 2), (-2, 5), (0, -3)', ''], ['(0, 0), (6, 0), (2, 4)', ''], ['(0, 0), (4, 0), (0, 3)', '직각삼각형']],
        run(s) {
          const [A, B, C] = E.points(s, 2); const c = centers(A, B, C);
          const ang = (P, Q, R) => Math.acos(dot(sub(Q, P), sub(R, P)) / (len(sub(Q, P)) * len(sub(R, P))));
          return {
            html: N.table([['변의 길이 a = BC, b = CA, c = AB', `${N.exactShort(c.a)}, ${N.exactShort(c.b)}, ${N.exactShort(c.c)}`], ['각 A, B, C', `${deg(ang(A, B, C))}, ${deg(ang(B, C, A))}, ${deg(ang(C, A, B))}`],
              ['넓이 S', ex(c.S)], ['무게중심 G', pt(c.G)], ['외심 O, 외접원 반지름 R', `${pt(c.O)},  R = ${ex(c.R)}`], ['수심 H', pt(c.H)],
              ['내심 I, 내접원 반지름 r', `${pt(c.I)},  r = ${ex(c.r)}`], ['방심 J<sub>A</sub>, J<sub>B</sub>, J<sub>C</sub>', `${pt(c.Ja)}, ${pt(c.Jb)}, ${pt(c.Jc)}`],
              ['오일러 직선', `O, G, H 는 한 직선 위, OG : GH = 1 : 2`]]),
            mount: drawer(d => d.add({ type: 'poly', pts: [A, B, C], close: true, fill: true }).add(circle(c.O, c.R, '외접원')).add(circle(c.I, c.r, '내접원'))
              .add({ type: 'poly', pts: [c.O, c.H], dash: [4, 4], label: '오일러 직선' })
              .add({ type: 'points', pts: [[...A, 'A'], [...B, 'B'], [...C, 'C'], [...c.G, 'G'], [...c.O, 'O'], [...c.H, 'H'], [...c.I, 'I']] }))
          };
        }
      }
    ]
  });

  /* ---------------- 직선 ---------------- */
  /** 'ax + by + c = 0' 또는 'y = 2x + 1' → [a, b, c] */
  function lineOf(s) {
    const [l, r = '0'] = s.split('='); const fn = E.compile(`(${l}) - (${r})`, ['x', 'y']);
    const c = fn(0, 0), a = fn(1, 0) - c, b = fn(0, 1) - c;
    if (Math.abs(fn(2, 3) - (2 * a + 3 * b + c)) > 1e-9) throw new Error(`직선의 방정식이 아닙니다: ${s}`);
    if (!a && !b) throw new Error('x, y 가 없습니다.');
    return [a, b, c];
  }
  const lineStr = ([a, b, c]) => {
    let k = [a, b, c].find(v => Math.abs(v) > 1e-12) < 0 ? -1 : 1; // 첫 계수를 양수로
    if ([a, b, c].every(v => Math.abs(v - Math.round(v)) < 1e-9)) { const g = [a, b, c].map(v => Math.abs(Math.round(v))).reduce((p, q) => N.gcd(p, q)); if (g > 1) k /= g; } // 정수 계수는 약분
    return `${N.linStr([a * k, b * k], ['x', 'y'], c * k)} = 0`;
  };
  const slopeStr = ([a, b, c]) => (Math.abs(b) < 1e-12 ? `x = ${f(-c / a)}` : `y = ${N.linStr([-a / b], ['x'], -c / b)}`);
  const lineItem = ([a, b, c], label, color) => (Math.abs(b) > 1e-12 ? { type: 'fx', f: x => (-a * x - c) / b, label, color } : { type: 'implicit', F: (x) => a * x + c, label, color });
  const meet = ([a1, b1, c1], [a2, b2, c2]) => { const d = a1 * b2 - a2 * b1; return Math.abs(d) < 1e-12 ? null : [(b1 * c2 - b2 * c1) / d, (c1 * a2 - c2 * a1) / d]; };
  register('plane', 'line', {
    ops: [
      {
        id: 'two', name: '두 점을 지나는 직선',
        help: [['(1, 2), (-2, 5)', ''], ['(3, 1), (3, 7)', 'y 축에 평행']],
        run(s) {
          const [A, B] = E.points(s, 2), d = sub(B, A), ln = [d[1], -d[0], d[0] * A[1] - d[1] * A[0]];
          return { html: `<p>${lineStr(ln)}</p><p>${slopeStr(ln)}${Math.abs(d[0]) > 1e-12 ? `  (기울기 ${f(d[1] / d[0])})` : ''}</p><p>매개변수 꼴: x = ${N.linStr([d[0]], ['t'], A[0])},  y = ${N.linStr([d[1]], ['t'], A[1])}  (t 는 실수)</p>`, mount: drawer(p => p.add({ ...lineItem(ln), view: [A, B] }).add({ type: 'points', pts: [[...A, 'A'], [...B, 'B']] })) };
        }
      },
      {
        id: 'meet', name: '두 직선의 교점 · 사잇각 · 각의 이등분선',
        note: '입력: 직선1 ; 직선2  (ax + by + c = 0 또는 y = mx + k 꼴)',
        help: [['2x - y + 1 = 0; x + 3y - 2 = 0', ''], ['y = 2x + 1; y = 2x - 3', '평행'], ['y = x; y = -x + 4', '수직']],
        run(s) {
          const [l1, l2] = s.split(';').map(lineOf); const P = meet(l1, l2);
          const n1 = Math.hypot(l1[0], l1[1]), n2 = Math.hypot(l2[0], l2[1]);
          const cos = Math.abs(l1[0] * l2[0] + l1[1] * l2[1]) / (n1 * n2), th = Math.acos(Math.min(1, cos));
          let h = `<p>ℓ₁: ${lineStr(l1)},  ℓ₂: ${lineStr(l2)}</p>`;
          if (!P) { const dist = Math.abs(l1[2] / n1 - (l2[2] / n2) * Math.sign(l1[0] * l2[0] + l1[1] * l2[1] || 1)); h += `<p><b>두 직선은 평행</b>${dist < 1e-12 ? ' (일치)' : `, 거리 ${ex(dist)}`}</p>`; return { html: h, mount: drawer(p => p.add(lineItem(l1, 'ℓ₁')).add(lineItem(l2, 'ℓ₂')).add({ type: 'points', pts: [], view: [[-5, -5], [5, 5]] })) }; }
          const b1 = [l1[0] / n1 - l2[0] / n2, l1[1] / n1 - l2[1] / n2, l1[2] / n1 - l2[2] / n2], b2 = [l1[0] / n1 + l2[0] / n2, l1[1] / n1 + l2[1] / n2, l1[2] / n1 + l2[2] / n2];
          h += `<p>교점: <b>${pt(P)}</b></p><p>사잇각 θ = ${deg(th)}  (cos θ = ${ex(cos)})${Math.abs(cos) < 1e-12 ? ' → 수직' : ''}</p><p>각의 이등분선: ${lineStr(b1.map(v => +v.toPrecision(12)))},  ${lineStr(b2.map(v => +v.toPrecision(12)))}</p>`;
          return { html: h, mount: drawer(p => p.add(lineItem(l1, 'ℓ₁')).add(lineItem(l2, 'ℓ₂')).add({ ...lineItem(b1, '이등분선'), dash: [5, 4], width: 1 }).add({ ...lineItem(b2), dash: [5, 4], width: 1 }).add({ type: 'points', pts: [[...P, 'P']], view: [[P[0] - 5, P[1] - 5], [P[0] + 5, P[1] + 5]] })) };
        }
      },
      {
        id: 'seg', name: '직선 AB 와 CD, 선분의 교차',
        help: [['(0, 0), (4, 4), (0, 4), (4, 0)', 'A, B, C, D'], ['(0, 0), (2, 1), (3, 0), (5, 2)', '']],
        run(s) {
          const [A, B, C, D] = E.points(s, 2); const l1 = [B[1] - A[1], A[0] - B[0], 0], l2 = [D[1] - C[1], C[0] - D[0], 0];
          l1[2] = -(l1[0] * A[0] + l1[1] * A[1]); l2[2] = -(l2[0] * C[0] + l2[1] * C[1]);
          const P = meet(l1, l2);
          const on = (P0, Q0, R0) => Math.min(Q0[0], R0[0]) - 1e-9 <= P0[0] && P0[0] <= Math.max(Q0[0], R0[0]) + 1e-9 && Math.min(Q0[1], R0[1]) - 1e-9 <= P0[1] && P0[1] <= Math.max(Q0[1], R0[1]) + 1e-9;
          return { html: `<p>직선 AB: ${lineStr(l1)},  직선 CD: ${lineStr(l2)}</p><p>직선의 교점: <b>${P ? pt(P) : '없음 (평행)'}</b></p><p>선분 AB 와 CD: <b>${P && on(P, A, B) && on(P, C, D) ? '만남' : '만나지 않음'}</b></p>`, mount: drawer(d => d.add({ type: 'poly', pts: [A, B] }).add({ type: 'poly', pts: [C, D] }).add({ type: 'points', pts: [[...A, 'A'], [...B, 'B'], [...C, 'C'], [...D, 'D'], ...(P ? [[...P, 'P']] : [])] })) };
        }
      },
      {
        id: 'dist', name: '점과 직선  (거리, 수선의 발, 대칭점, 평행선·수선)',
        note: '입력: 점 ; 직선',
        help: [['(1, 2); 3x + 4y - 5 = 0', ''], ['(4, -1); y = 2x + 1', '']],
        run(s) {
          const [p, l] = s.split(';'); const P = E.points(p, 2)[0], ln = lineOf(l), [a, b, c] = ln, n2 = a * a + b * b;
          const t = (a * P[0] + b * P[1] + c) / n2, H = [P[0] - a * t, P[1] - b * t], R = [P[0] - 2 * a * t, P[1] - 2 * b * t];
          const par = [a, b, -(a * P[0] + b * P[1])], per = [b, -a, -(b * P[0] - a * P[1])];
          return {
            html: `<p>거리 d = |ax₀ + by₀ + c|/√(a² + b²) = <b>${ex(Math.abs(a * P[0] + b * P[1] + c) / Math.sqrt(n2))}</b></p><p>수선의 발 H = ${pt(H)},  직선에 대한 대칭점 P′ = ${pt(R)}</p><p>P 를 지나고 평행한 직선: ${lineStr(par)}</p><p>P 를 지나고 수직인 직선: ${lineStr(per)}</p><p>위치: 점 P 는 직선의 ${Math.abs(t) < 1e-12 ? '위' : t > 0 ? '(ax + by + c > 0) 쪽' : '(ax + by + c < 0) 쪽'}에 있습니다.</p>`,
            mount: drawer(d => d.add(lineItem(ln, '직선')).add({ type: 'poly', pts: [P, R], dash: [4, 4] }).add({ type: 'points', pts: [[...P, 'P'], [...H, 'H'], [...R, "P′"]] }))
          };
        }
      }
    ]
  });

  /* ---------------- 도형 ---------------- */
  // 두 변수 다항식 (x, y) : Map 'i,j' → 계수
  const P2 = {
    c: (v) => new Map([['0,0', v]]),
    add: (a, b) => { const r = new Map(a); b.forEach((v, k) => r.set(k, (r.get(k) || 0) + v)); return r; },
    sub: (a, b) => { const r = new Map(a); b.forEach((v, k) => r.set(k, (r.get(k) || 0) - v)); return r; },
    neg: (a) => new Map([...a].map(([k, v]) => [k, -v])),
    mul: (a, b) => { const r = new Map(); a.forEach((v, k) => b.forEach((w, q) => { const [i, j] = k.split(',').map(Number), [p, s] = q.split(',').map(Number); const key = `${i + p},${j + s}`; r.set(key, (r.get(key) || 0) + v * w); })); return r; },
    div: (a, b) => { if (b.size !== 1 || !b.has('0,0')) throw new Error('다항식이 아닌 식은 전개하지 못합니다.'); return new Map([...a].map(([k, v]) => [k, v / b.get('0,0')])); },
    pow: (a, e) => { const n = e.get('0,0'); if (e.size > 1 || !Number.isInteger(n) || n < 0) throw new Error('지수는 0 이상의 정수여야 합니다.'); let r = P2.c(1); for (let i = 0; i < n; i++) r = P2.mul(r, a); return r; },
    fn: (name, args) => { if (args.some(a => a.size > 1 || (a.size === 1 && !a.has('0,0')))) throw new Error('다항식이 아닌 식은 전개하지 못합니다.'); return P2.c(E.FN[name](...args.map(a => a.get('0,0') || 0))); }
  };
  function p2str(m) {
    const terms = [...m].filter(([, v]) => Math.abs(v) > 1e-12).map(([k, v]) => { const [i, j] = k.split(',').map(Number); return { i, j, v }; })
      .sort((a, b) => (b.i + b.j) - (a.i + a.j) || b.i - a.i);
    if (!terms.length) return '0';
    return terms.map((t, n) => {
      const mono = (t.i ? (t.i > 1 ? `x<sup>${t.i}</sup>` : 'x') : '') + (t.j ? (t.j > 1 ? `y<sup>${t.j}</sup>` : 'y') : '');
      const a = Math.abs(t.v); let cs = mono && Math.abs(a - 1) < 1e-12 ? '' : f(+a.toPrecision(12)); if (mono && cs.includes('/')) cs = `(${cs})`;
      return (n ? (t.v < 0 ? ' − ' : ' + ') : t.v < 0 ? '−' : '') + cs + mono;
    }).join('');
  }
  function transform(src, sx, sy) { // x → sx, y → sy (둘 다 P2) 대입해서 전개
    const [l, r = '0'] = src.split('=');
    return E.evalWith(`(${l}) - (${r})`, ['x', 'y'], P2, { x: sx, y: sy });
  }
  const X1 = new Map([['1,0', 1]]), Y1 = new Map([['0,1', 1]]);
  const lin2 = (a, b, c) => new Map([['1,0', a], ['0,1', b], ['0,0', c]]);

  register('plane', 'figure', {
    ops: [
      {
        id: 'poly', name: '다각형의 넓이 · 둘레 · 점의 내부 판정',
        note: '입력: 꼭짓점들 (순서대로) ; 판정할 점 (선택)',
        help: [['(0, 0), (4, 0), (4, 3), (0, 3); (1, 1)', ''], ['(1, 2), (-2, 5), (0, -3), (3, 0), (4, 4); (5, 5)', '오각형']],
        run(s) {
          const [p, q] = s.split(';'); const V = E.points(p, 2); let A2 = 0, per = 0;
          V.forEach((P, i) => { const Q = V[(i + 1) % V.length]; A2 += cross(P, Q); per += len(sub(Q, P)); });
          let h = `<p>넓이 (신발끈 공식) = |Σ(xᵢyᵢ₊₁ − xᵢ₊₁yᵢ)|/2 = <b>${ex(Math.abs(A2) / 2)}</b></p><p>둘레 = ${ex(per)},  꼭짓점 ${A2 > 0 ? '시계 반대 방향' : '시계 방향'} 순서</p>`;
          let P = null;
          if (q) {
            P = E.points(q, 2)[0]; let inside = false;
            for (let i = 0, j = V.length - 1; i < V.length; j = i++) { const [xi, yi] = V[i], [xj, yj] = V[j]; if ((yi > P[1]) !== (yj > P[1]) && P[0] < (xj - xi) * (P[1] - yi) / (yj - yi) + xi) inside = !inside; }
            const onEdge = V.some((A, i) => { const B = V[(i + 1) % V.length]; return Math.abs(cross(sub(B, A), sub(P, A))) < 1e-9 && dot(sub(P, A), sub(P, B)) <= 1e-9; });
            h += `<p>점 ${pt(P, 'P')} 는 다각형의 <b>${onEdge ? '변 위' : inside ? '내부' : '외부'}</b>에 있습니다.</p>`;
          }
          return { html: h, mount: drawer(d => d.add({ type: 'poly', pts: V, close: true, fill: true }).add({ type: 'points', pts: [...V.map((v, i) => [...v, names[i]]), ...(P ? [[...P, 'P']] : [])] })) };
        }
      },
      {
        id: 'move', name: '도형의 이동  (평행이동, 대칭, 회전)',
        note: '입력: f(x, y) = 0 ; 이동.  이동은  평행 a, b  /  x축  /  y축  /  원점  /  y=x  /  회전 θ(도)  /  대칭 직선식',
        help: [['x^2/4 + y^2 = 1; 평행 2, -1', '타원을 (2, −1) 만큼'], ['y = x^2 - 2x; x축', ''], ['y = x^2 - 2x; y=x', '역함수 그래프'], ['x^2 - y^2 = 1; 회전 45', '쌍곡선을 45° 회전'], ['(x-1)^2 + (y-2)^2 = 4; 대칭 x + y = 0', '직선에 대한 대칭']],
        run(s) {
          const [src, mv] = s.split(';').map(t => t.trim()); if (!mv) throw new Error('; 뒤에 이동 방법을 쓰세요.');
          let sx, sy, desc; const m = mv.replace(/\s/g, '');
          if (/^평행/.test(m)) { const [a, b] = E.nums(mv.replace('평행', '')); sx = lin2(1, 0, -a); sy = lin2(0, 1, -b); desc = `(${f(a)}, ${f(b)}) 만큼 평행이동: x 대신 ${N.linStr([1], ['x'], -a)}, y 대신 ${N.linStr([1], ['y'], -b)}`; }
          else if (m === 'x축') { sx = X1; sy = lin2(0, -1, 0); desc = 'y 대신 −y'; }
          else if (m === 'y축') { sx = lin2(-1, 0, 0); sy = Y1; desc = 'x 대신 −x'; }
          else if (m === '원점') { sx = lin2(-1, 0, 0); sy = lin2(0, -1, 0); desc = 'x 대신 −x, y 대신 −y'; }
          else if (m === 'y=x') { sx = Y1; sy = X1; desc = 'x 와 y 를 바꿈'; }
          else if (/^회전/.test(m)) { const t = E.num(mv.replace('회전', '')) * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t); sx = lin2(c, sn, 0); sy = lin2(-sn, c, 0); desc = `원점 중심 ${N.dec(t * 180 / Math.PI)}° 회전: x 대신 x cosθ + y sinθ, y 대신 −x sinθ + y cosθ`; }
          else if (/^대칭/.test(m)) {
            const [a, b, c] = lineOf(mv.replace('대칭', '')), n2 = a * a + b * b; // 반사 (x, y) → (x, y) − 2(ax+by+c)/(a²+b²)·(a, b)
            sx = lin2(1 - 2 * a * a / n2, -2 * a * b / n2, -2 * a * c / n2); sy = lin2(-2 * a * b / n2, 1 - 2 * b * b / n2, -2 * b * c / n2); desc = `직선 ${lineStr([a, b, c])} 에 대한 대칭`;
          } else throw new Error('이동 방법을 알 수 없습니다: 평행 a, b / x축 / y축 / 원점 / y=x / 회전 θ / 대칭 직선');
          const before = transform(src, X1, Y1), after = transform(src, sx, sy);
          const F0 = (x, y) => [...before].reduce((t, [k, v]) => { const [i, j] = k.split(',').map(Number); return t + v * x ** i * y ** j; }, 0);
          const F1 = (x, y) => [...after].reduce((t, [k, v]) => { const [i, j] = k.split(',').map(Number); return t + v * x ** i * y ** j; }, 0);
          return { html: `<p>${desc}</p><p>처음: ${p2str(before)} = 0</p><p>이동 후: <b>${p2str(after)} = 0</b></p>`, mount: drawer(d => d.add({ type: 'implicit', F: F0, label: '처음 도형' }).add({ type: 'implicit', F: F1, label: '이동한 도형' }).add({ type: 'points', pts: [], view: [[-6, -6], [6, 6]] })) };
        }
      },
      {
        id: 'locus', name: '자취  (원, 지름원, 아폴로니우스 원)',
        note: '점 ; 거리 → 원.   두 점 → 지름원.   두 점 ; m:n → 거리의 비가 m:n 인 점의 자취',
        help: [['(1, 2); 3', 'A 에서 거리 3'], ['(1, 2), (5, 4)', 'AB 가 지름인 원'], ['(0, 0), (6, 0); 2:1', 'PA : PB = 2 : 1']],
        run(s) {
          const [p, q] = s.split(';'); const P = E.points(p, 2); let c, r, h;
          if (P.length === 1) { c = P[0]; r = E.num(q); h = `A 에서 거리가 ${f(r)} 인 점의 자취`; }
          else if (!q) { c = mul(add(P[0], P[1]), 0.5); r = len(sub(P[1], P[0])) / 2; h = '∠APB = 90° 인 점 P 의 자취 (AB 가 지름인 원)'; }
          else {
            const [m, n] = q.split(':').map(E.num); if (m === n) { const M = mul(add(P[0], P[1]), 0.5), d = sub(P[1], P[0]); const ln = [d[0], d[1], -dot(d, M)]; return `<p>m = n 이면 수직이등분선: <b>${lineStr(ln)}</b></p>`; }
            const k = m / n, [A, B] = P; c = mul(sub(mul(B, k * k), A), 1 / (k * k - 1)); r = k * len(sub(B, A)) / Math.abs(k * k - 1); h = `PA : PB = ${f(m)} : ${f(n)} 인 점의 자취 (아폴로니우스 원)`;
          }
          const eq = `(x ${c[0] < 0 ? '+' : '−'} ${f(Math.abs(c[0]))})² + (y ${c[1] < 0 ? '+' : '−'} ${f(Math.abs(c[1]))})² = ${f(r * r)}`;
          return { html: `<p>${h}</p><p><b>${eq}</b></p><p>중심 ${pt(c)}, 반지름 ${ex(r)}</p>`, mount: drawer(d => d.add(circle(c, r, '자취')).add({ type: 'points', pts: P.map((v, i) => [...v, names[i]]).concat([[...c, '중심']]) })) };
        }
      }
    ]
  });

  /* ---------------- 다항함수 ---------------- */
  const Pn = {
    val: (c, x) => c.reduceRight((t, a) => t * x + a, 0),
    der: (c) => c.slice(1).map((a, i) => a * (i + 1)),
    int: (c) => [0, ...c.map((a, i) => a / (i + 1))],
    mul: (a, b) => E.PO.mul(a, b), add: (a, b) => E.PO.add(a, b), sub: (a, b) => E.PO.sub(a, b),
    div(a, b) { // 몫, 나머지
      a = a.slice(); const q = new Array(Math.max(1, a.length - b.length + 1)).fill(0), lb = b[b.length - 1];
      for (let i = a.length - b.length; i >= 0; i--) { const k = a[i + b.length - 1] / lb; q[i] = k; for (let j = 0; j < b.length; j++) a[i + j] -= k * b[j]; }
      const r = a.slice(0, Math.max(1, b.length - 1)); return { q: E.PO.add(q, [0]), r: E.PO.add(r, [0]) };
    },
    roots(c) { // 모든 근 (동반행렬의 고유값)
      c = E.PO.add(c, [0]); const n = c.length - 1; if (n < 1) return [];
      if (n === 1) return [{ re: -c[0] / c[1], im: 0 }];
      const Cm = L.zeros(n, n); for (let i = 1; i < n; i++) Cm[i][i - 1] = 1; for (let i = 0; i < n; i++) Cm[i][n - 1] = -c[i] / c[n];
      return L.eigenvalues(Cm).map(z => ({ re: polish(c, z.re, z.im), im: Math.abs(z.im) < 1e-9 ? 0 : z.im }));
    }
  };
  function polish(c, x, im) { if (Math.abs(im) > 1e-9) return x; const d = Pn.der(c); for (let i = 0; i < 30; i++) { const fx = Pn.val(c, x), dx = Pn.val(d, x); if (!dx) break; const nx = x - fx / dx; if (Math.abs(nx - x) < 1e-15 * Math.max(1, Math.abs(x))) { x = nx; break; } x = nx; } return x; }
  const ps = (c, v = 'x') => N.polyStr(c.map(a => +a.toPrecision(12)), v);
  function polyIn(s) { const [a, ...rest] = s.split(';'); const c = E.poly(a); return { c, rest: rest.map(t => t.trim()) }; }
  const fplot = (c, extra = [], range) => (el) => {
    const box = document.createElement('div'); el.appendChild(box);
    const rs = Pn.roots(c).filter(z => !z.im).map(z => z.re), cr = Pn.roots(Pn.der(c)).filter(z => !z.im).map(z => z.re);
    let xs = [...rs, ...cr, ...(range || [])]; if (!xs.length) xs = [-3, 3];
    let a = Math.min(...xs), b = Math.max(...xs); const w = Math.max(2, (b - a) * 0.35); a -= w; b += w;
    const pts = []; for (let i = 0; i <= 100; i++) { const x = a + (b - a) * i / 100; pts.push([x, Pn.val(c, x)]); }
    const v = K.plot.autoView([pts], 0.1); v[0] = a; v[1] = b;
    const pl = K.plot.create(box, { view: v }); extra.forEach(it => { if (it.under) pl.add(it); });
    pl.add({ type: 'fx', f: x => Pn.val(c, x), label: 'y = f(x)' }); extra.forEach(it => { if (!it.under) pl.add(it); });
  };
  function synthetic(c, a) { // 조립제법 표
    const d = c.slice().reverse(), row2 = [''], row3 = [d[0]];
    for (let i = 1; i < d.length; i++) { row2.push(f(row3[i - 1] * a)); row3.push(d[i] + row3[i - 1] * a); }
    return N.table([d.map(f), row2, row3.map(f)].map((r, i) => [i === 0 ? f(a) + ' |' : '', ...r]));
  }
  register('plane', 'poly', {
    ops: [
      {
        id: 'value', name: '함수값과 조립제법  f(α), f(x) ÷ (x − α)',
        note: '입력: f(x) ; α',
        help: [['x^4 + 2.54x^2 + 3x - 1.098; 2.13', ''], ['2x^3 - 3x^2 + 4x - 5; 2', '']],
        run(s) {
          const { c, rest: [a0] } = polyIn(s); const a = E.num(a0), { q, r } = Pn.div(c, [-a, 1]);
          return { html: `<p>f(x) = ${ps(c)}</p><p>f(${f(a)}) = <b>${N.fmt2(Pn.val(c, a))}</b></p><h4>조립제법</h4>${synthetic(c, a)}<p>f(x) = (x ${a < 0 ? '+' : '−'} ${f(Math.abs(a))})(${ps(q)}) ${r[0] < 0 ? '−' : '+'} ${f(Math.abs(r[0]))}</p>`, mount: fplot(c, [{ type: 'points', pts: [[a, Pn.val(c, a), `(${f(a)}, f(${f(a)}))`]] }], [a]) };
        }
      },
      {
        id: 'div2', name: '(x − α)(x − β) 로 나눈 몫과 나머지',
        note: '입력: f(x) ; α, β',
        help: [['x^4 + 2x^3 - x + 5; 1, 2', ''], ['x^5 - 1; 1, -1', '']],
        run(s) { const { c, rest: [p] } = polyIn(s); const [a, b] = E.nums(p), g = Pn.mul([-a, 1], [-b, 1]), { q, r } = Pn.div(c, g); return `<p>(x − α)(x − β) = ${ps(g)}</p><p>몫: <b>${ps(q)}</b></p><p>나머지: <b>${ps(r)}</b></p><p class="muted">나머지 R(x) = px + q 는 R(α) = f(α), R(β) = f(β) 를 만족합니다: f(${f(a)}) = ${f(Pn.val(c, a))}, f(${f(b)}) = ${f(Pn.val(c, b))}</p>`; }
      },
      {
        id: 'taylor', name: '(x − α) 의 내림차순으로 정리',
        note: '입력: f(x) ; α   → 조립제법을 되풀이',
        help: [['x^3 - 2x^2 + 3x - 4; 1', ''], ['x^4; 2', '']],
        run(s) {
          const { c, rest: [p] } = polyIn(s); const a = E.num(p); let cur = c.slice(); const co = [];
          while (cur.length > 1 || co.length === 0) { const { q, r } = Pn.div(cur, [-a, 1]); co.push(r[0]); cur = q; if (cur.length === 1) { co.push(cur[0]); break; } }
          return `<p>f(x) = ${ps(c)}</p><p>= <b>${ps(co, `(x ${a < 0 ? '+' : '−'} ${f(Math.abs(a))})`)}</b></p><p class="muted">계수는 f⁽ᵏ⁾(α)/k! 입니다.</p>`;
        }
      },
      {
        id: 'ops', name: '두 다항식의 합 · 차 · 곱 · 나눗셈',
        note: '입력: f(x) ; g(x)',
        help: [['x^3 - 2x + 1; x^2 + x - 1', ''], ['2x^4 - 3x^3 + x - 7; x^2 - 2', '']],
        run(s) { const { c, rest: [g0] } = polyIn(s); const g = E.poly(g0), { q, r } = Pn.div(c, g); return N.table([['f(x)', ps(c)], ['g(x)', ps(g)], ['f + g', ps(Pn.add(c, g))], ['f − g', ps(Pn.sub(c, g))], ['f · g', ps(Pn.mul(c, g))], ['f ÷ g 의 몫', ps(q)], ['f ÷ g 의 나머지', ps(r)]]); }
      },
      {
        id: 'point', name: '한 점에서  (미분계수, 접선, 법선, 곡률)',
        note: '입력: f(x) ; α',
        help: [['x^3 - 3x + 1; 2', ''], ['x^2; 0', '곡률 반지름 1/2']],
        run(s) {
          const { c, rest: [p] } = polyIn(s); const a = E.num(p), y = Pn.val(c, a), d1 = Pn.val(Pn.der(c), a), d2 = Pn.val(Pn.der(Pn.der(c)), a);
          const kappa = Math.abs(d2) / (1 + d1 * d1) ** 1.5, R = 1 / kappa;
          const cc = d2 ? [a - d1 * (1 + d1 * d1) / d2, y + (1 + d1 * d1) / d2] : null;
          const tan = [d1, -1, y - d1 * a], nor = Math.abs(d1) > 1e-12 ? [1, d1, -a - d1 * y] : [1, 0, -a];
          return {
            html: N.table([['f(x)', ps(c)], ["f′(x)", ps(Pn.der(c))], ["f″(x)", ps(Pn.der(Pn.der(c)))], [`f(${f(a)}), f′(${f(a)}), f″(${f(a)})`, `${f(y)}, ${f(d1)}, ${f(d2)}`],
              ['접선', slopeStr(tan)], ['법선', slopeStr(nor)], ['곡률 κ = |f″|/(1 + f′²)^(3/2)', ex(kappa)], ['곡률 반지름 R', d2 ? ex(R) : '∞ (직선처럼 곧음)'], ['곡률 중심', cc ? pt(cc) : '−']]),
            mount: fplot(c, [lineItem(tan, '접선'), { ...lineItem(nor, '법선'), dash: [5, 4] }, ...(cc ? [circle(cc, R, '곡률원')] : []), { type: 'points', pts: [[a, y, 'P']] }], [a])
          };
        }
      },
      {
        id: 'roots', name: '근 · 극값 · 최대최소  [a, b]',
        note: '입력: f(x) ; a, b   (a, b 를 빼면 모든 근)',
        help: [['x^3 - 3x + 1; -3, 3', ''], ['x^4 - 4x^2 + 2; -3, 3', ''], ['x^5 - x - 1', '모든 근 (복소수 포함)']],
        run(s) {
          const { c, rest: [p] } = polyIn(s); const all = Pn.roots(c);
          let h = `<p>f(x) = ${ps(c)}</p><p>모든 근: ${all.map(z => (z.im ? L.cstr({ re: +z.re.toPrecision(10), im: +z.im.toPrecision(10) }) : ex(z.re))).join(',  ')}</p>`;
          if (!p) return { html: h, mount: fplot(c) };
          const [a, b] = E.nums(p), fn = (x) => Pn.val(c, x), rs = all.filter(z => !z.im && z.re >= a - 1e-12 && z.re <= b + 1e-12).map(z => z.re).sort((u, v) => u - v);
          const crit = Pn.roots(Pn.der(c)).filter(z => !z.im && z.re > a && z.re < b).map(z => z.re).sort((u, v) => u - v);
          const d2 = Pn.der(Pn.der(c)), kinds = crit.map(x => { const v = Pn.val(d2, x); return v < -1e-9 ? '극대' : v > 1e-9 ? '극소' : '정류점'; });
          const cand = [a, b, ...crit].map(x => [x, fn(x)]), mx = cand.reduce((m, q) => (q[1] > m[1] ? q : m)), mn = cand.reduce((m, q) => (q[1] < m[1] ? q : m));
          h += `<p>[${f(a)}, ${f(b)}] 의 근: <b>${rs.length ? rs.map(N.exactShort).join(', ') : '없음'}</b></p>`;
          h += N.table(crit.map((x, i) => [kinds[i], `x = ${ex(x)}`, `f(x) = ${ex(fn(x))}`]), ['f′(x) = 0', 'x', '값']);
          h += `<p>최댓값 <b>${ex(mx[1])}</b> (x = ${ex(mx[0])}),  최솟값 <b>${ex(mn[1])}</b> (x = ${ex(mn[0])})</p>`;
          return { html: h, mount: fplot(c, [{ type: 'points', pts: [...rs.map(x => [x, 0]), ...crit.map((x, i) => [x, fn(x), kinds[i]])] }], [a, b]) };
        }
      },
      {
        id: 'integral', name: '적분 응용  [a, b]  (정적분, 넓이, 회전체 부피, 모멘트)',
        note: '입력: f(x) ; a, b',
        help: [['x^2 - 1; 0, 2', ''], ['4 - x^2; -2, 2', ''], ['x^3 - 3x; -2, 2', '']],
        run(s) {
          const { c, rest: [p] } = polyIn(s); const [a, b] = E.nums(p), F = Pn.int(c), I = Pn.val(F, b) - Pn.val(F, a);
          const rs = Pn.roots(c).filter(z => !z.im && z.re > a && z.re < b).map(z => z.re).sort((u, v) => u - v), cuts = [a, ...rs, b];
          let area = 0; for (let i = 0; i + 1 < cuts.length; i++) area += Math.abs(Pn.val(F, cuts[i + 1]) - Pn.val(F, cuts[i]));
          const c2 = Pn.int(Pn.mul(c, c)), xf = Pn.int(Pn.mul([0, 1], c));
          const Vx = Math.PI * (Pn.val(c2, b) - Pn.val(c2, a)), Vy = 2 * Math.PI * Math.abs(Pn.val(xf, b) - Pn.val(xf, a));
          const Mx = (Pn.val(c2, b) - Pn.val(c2, a)) / 2, My = Pn.val(xf, b) - Pn.val(xf, a);
          return {
            html: `<p>F(x) = ∫f(x)dx = ${ps(F)} + C</p>` + N.table([['정적분 ∫ₐᵇ f(x)dx = F(b) − F(a)', ex(I)], ['x 축과 둘러싸인 넓이 ∫|f(x)|dx', ex(area)], ['x 축 회전체 부피 π∫f²dx', ex(Vx)],
              ['y 축 회전체 부피 2π∫|x·f(x)|dx', ex(Vy)], ['모멘트 Mx = ½∫f²dx, My = ∫x·f dx', `${ex(Mx)}, ${ex(My)}`], ['무게중심 (My/I, Mx/I)', Math.abs(I) > 1e-12 ? pt([My / I, Mx / I]) : '−']]) + (rs.length ? `<p class="muted">[${f(a)}, ${f(b)}] 안에서 x 축과 ${rs.map(N.exactShort).join(', ')} 에서 만나 부호가 바뀌므로 넓이는 구간을 나누어 계산했습니다.</p>` : ''),
            mount: fplot(c, [{ type: 'area', f: x => Pn.val(c, x), a, b, under: true }], [a, b])
          };
        }
      }
    ]
  });

  /* ---------------- 특수 다항식 ---------------- */
  const rec2 = (n, p0, p1, step) => { let [a, b] = [p0, p1]; if (n === 0) return a; for (let k = 1; k < n; k++) [a, b] = [b, step(a, b, k)]; return b; };
  const X = [0, 1], sc = (c, k) => c.map(v => v * k);
  const binomN = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };
  function bernNums(n) { const b = [1]; for (let m = 1; m <= n; m++) { let s = 0; for (let k = 0; k < m; k++) s += binomN(m + 1, k) * b[k]; b.push(-s / (m + 1)); } return b; }
  const FAM = {
    T: { name: '체비쇼프 1종 Tₙ(x)', make: n => rec2(n, [1], X, (a, b) => Pn.sub(Pn.mul([0, 2], b), a)) },
    U: { name: '체비쇼프 2종 Uₙ(x)', make: n => rec2(n, [1], [0, 2], (a, b) => Pn.sub(Pn.mul([0, 2], b), a)) },
    B: { name: '베르누이 Bₙ(x)', make: n => { const b = bernNums(n); const c = new Array(n + 1).fill(0); for (let k = 0; k <= n; k++) c[n - k] = binomN(n, k) * b[k]; return c; } },
    E: { name: '오일러 Eₙ(x)', make: n => { const Es = [[1]]; for (let m = 1; m <= n; m++) { let s = new Array(m + 1).fill(0); s[m] = 1; for (let k = 0; k < m; k++) s = Pn.sub(s, sc(Es[k], binomN(m, k) / 2)); Es.push(s); } return Es[n]; } },
    H: { name: '에르미트 Hₙ(x)', make: n => rec2(n, [1], [0, 2], (a, b, k) => Pn.sub(Pn.mul([0, 2], b), sc(a, 2 * k))) },
    P: { name: '르장드르 Pₙ(x)', make: n => rec2(n, [1], X, (a, b, k) => sc(Pn.sub(Pn.mul([0, 2 * k + 1], b), sc(a, k)), 1 / (k + 1))) },
    L: { name: '라게르 Lₙ(x)', make: n => rec2(n, [1], [1, -1], (a, b, k) => sc(Pn.sub(Pn.mul([2 * k + 1, -1], b), sc(a, k)), 1 / (k + 1))) },
    J: { name: '야코비 Pₙ^(a,b)(x)', params: 2, make: (n, al, be) => { let s = [0]; for (let k = 0; k <= n; k++) { let t = [binomN(n + al, n - k) * binomN(n + be, k)]; for (let i = 0; i < k; i++) t = Pn.mul(t, [-0.5, 0.5]); for (let i = 0; i < n - k; i++) t = Pn.mul(t, [0.5, 0.5]); s = Pn.add(s, t); } return s; } },
    Bell: { name: '벨 (투샤르) Bₙ(x) = Σ S(n,k)xᵏ', make: n => { let row = [1]; for (let i = 1; i <= n; i++) { const nr = new Array(i + 1).fill(0); for (let j = 1; j <= i; j++) nr[j] = j * (row[j] || 0) + (row[j - 1] || 0); row = nr; } return row; } },
    Fe: { name: '페르마 ℱₙ(x)', make: n => rec2(n, [0], [1], (a, b) => Pn.sub(Pn.mul([0, 3], b), sc(a, 2))) },
    FeL: { name: '페르마-루카스 fₙ(x)', make: n => rec2(n, [2], [0, 3], (a, b) => Pn.sub(Pn.mul([0, 3], b), sc(a, 2))) },
    Pe: { name: '펠 Pₙ(x)', make: n => rec2(n, [0], [1], (a, b) => Pn.add(Pn.mul([0, 2], b), a)) },
    PeL: { name: '펠-루카스 Qₙ(x)', make: n => rec2(n, [2], [0, 2], (a, b) => Pn.add(Pn.mul([0, 2], b), a)) },
    Fi: { name: '피보나치 Fₙ(x)', make: n => rec2(n, [0], [1], (a, b) => Pn.add(Pn.mul(X, b), a)) },
    Lu: { name: '루카스 Lₙ(x)', make: n => rec2(n, [2], X, (a, b) => Pn.add(Pn.mul(X, b), a)) },
    Ja: { name: '야콥스탈 Jₙ(x)', make: n => rec2(n, [0], [1], (a, b) => Pn.add(b, Pn.mul([0, 2], a))) },
    JaL: { name: '야콥스탈-루카스 jₙ(x)', make: n => rec2(n, [2], [1], (a, b) => Pn.add(b, Pn.mul([0, 2], a))) }
  };
  register('plane', 'specialpoly', {
    ops: Object.entries(FAM).map(([id, fam]) => ({
      id, name: fam.name,
      note: fam.params ? '입력: n, a, b, x   (a, b > −1 인 정수)' : '입력: n, x   (x 를 빼면 다항식만)',
      help: fam.params ? [['10, 2, 1, 3', 'P₁₀^(2,1)(3)'], ['3, 0, 0, 0.5', 'a = b = 0 이면 르장드르']] : [['10, 3', 'n = 10, x = 3'], ['5', 'n = 5'], ['6, 0.5', '']],
      run(s) {
        const a = E.nums(s); const n = a[0]; if (!Number.isInteger(n) || n < 0 || n > 40) throw new Error('n 은 0 ~ 40 인 정수');
        const c = fam.params ? fam.make(n, a[1], a[2]) : fam.make(n), x = fam.params ? a[3] : a[1];
        const list = [...Array(Math.min(n, 6) + 1).keys()].map(k => `${k}: ${ps(fam.params ? fam.make(k, a[1], a[2]) : fam.make(k))}`);
        return {
          html: `<p>n = ${n}:  <b>${ps(c)}</b></p>${x !== undefined ? `<p>x = ${f(x)} 일 때 값: <b>${N.fmt2(Pn.val(c, x))}</b>,  x = 1 일 때: ${f(Pn.val(c, 1))}</p>` : ''}<h4>처음 몇 개</h4><div class="steps">${list.join('\n')}</div>`,
          mount: (el) => { const box = document.createElement('div'); el.appendChild(box); const r = ['T', 'U', 'P', 'J'].includes(id) ? [-1.1, 1.1] : [-2, 2]; const pts = []; for (let i = 0; i <= 100; i++) { const t = r[0] + (r[1] - r[0]) * i / 100; pts.push([t, Pn.val(c, t)]); } const v = K.plot.autoView([pts], 0.1); v[0] = r[0]; v[1] = r[1]; K.plot.create(box, { view: v }).add({ type: 'fx', f: t => Pn.val(c, t), label: fam.name.replace(/ .*$/, '') + ` n=${n}` }); }
        };
      }
    }))
  });

  K.geom2 = { lineOf, lineStr, centers, Pn, P2, p2str };
})();
