/*
 * 공간도형 모듈 (원본: Vector3DSpaceUMP_5.java)
 *  Vector3D, 직선, 평면, Rotation, L·A·V (길이·넓이·부피·각)
 */
(function () {
  const K = window.KPHS, { register } = K;
  const N = K.num, E = K.expr, L = K.la;
  const f = (x) => N.fmt(x), ex = (x) => N.exact(x);
  const V = {
    add: (a, b) => a.map((v, i) => v + b[i]), sub: (a, b) => a.map((v, i) => v - b[i]), mul: (a, k) => a.map(v => v * k),
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(...a), unit: (a) => V.mul(a, 1 / V.len(a))
  };
  const pt = (p, n = '') => `${n}(${p.map(v => f(+v.toPrecision(12))).join(', ')})`;
  const ang = (r) => `${N.dec(r * 180 / Math.PI, 8)}°`;
  const P3 = (s) => E.points(s, 3);
  const names = 'ABCDEFGH';
  const lineStr = (A, u) => `x = ${N.linStr([u[0]], ['t'], A[0])},  y = ${N.linStr([u[1]], ['t'], A[1])},  z = ${N.linStr([u[2]], ['t'], A[2])}`;
  function symStr(A, u) {
    const nz = [0, 1, 2].filter(i => Math.abs(u[i]) > 1e-12), cs = ['x', 'y', 'z'];
    const fixed = [0, 1, 2].filter(i => !nz.includes(i)).map(i => `${cs[i]} = ${f(A[i])}`);
    if (nz.length === 1) return `${fixed.join(', ')}  (${cs[nz[0]]} 는 모든 실수)`;
    const part = (i) => { const t = N.linStr([1], [cs[i]], -A[i]); const top = t.includes(' ') ? `(${t})` : t; return Math.abs(u[i] - 1) < 1e-12 ? top : `${top}/${u[i] < 0 ? `(${f(u[i])})` : f(u[i])}`; };
    return nz.map(part).join(' = ') + (fixed.length ? `,  ${fixed.join(', ')}` : '');
  }
  /** 'ax + by + cz + d = 0' → [a, b, c, d] */
  function planeOf(s) {
    const [l, r = '0'] = s.split('='); const fn = E.compile(`(${l}) - (${r})`, ['x', 'y', 'z']);
    const d = fn(0, 0, 0), a = fn(1, 0, 0) - d, b = fn(0, 1, 0) - d, c = fn(0, 0, 1) - d;
    if (Math.abs(fn(2, 3, 5) - (2 * a + 3 * b + 5 * c + d)) > 1e-9) throw new Error(`평면의 방정식이 아닙니다: ${s}`);
    return [a, b, c, d];
  }
  const planeStr = (p) => {
    let k = p.find(v => Math.abs(v) > 1e-12) < 0 ? -1 : 1;
    if (p.every(v => Math.abs(v - Math.round(v)) < 1e-9)) { const g = p.map(v => Math.abs(Math.round(v))).reduce((a, b) => N.gcd(a, b)); if (g > 1) k /= g; }
    return `${N.linStr([p[0] * k, p[1] * k, p[2] * k], ['x', 'y', 'z'], p[3] * k)} = 0`;
  };
  const planeFrom = (A, n) => [n[0], n[1], n[2], -V.dot(n, A)];

  /* 3D 그림 */
  function draw3(build) {
    return (el) => {
      const box = document.createElement('div'); el.appendChild(box);
      const pl = K.plot3d.create(box); build(pl);
    };
  }
  const seg = (A, B, label, color) => ({ pts: [A, B], label, color });
  const lineIt = (A, u, label, s = 6) => seg(V.add(A, V.mul(V.unit(u), -s)), V.add(A, V.mul(V.unit(u), s)), label);
  function planeIt(p, around, size = 4, label) { // 평면 위 격자
    const n = [p[0], p[1], p[2]], nn = V.dot(n, n), c0 = V.sub(around, V.mul(n, (V.dot(n, around) + p[3]) / nn));
    const t1 = V.unit(Math.abs(n[0]) < 0.9 * Math.sqrt(nn) ? V.cross(n, [1, 0, 0]) : V.cross(n, [0, 1, 0])), t2 = V.unit(V.cross(n, t1));
    const out = [];
    for (let i = -size; i <= size; i += size / 2) { out.push({ pts: [V.add(V.add(c0, V.mul(t1, i)), V.mul(t2, -size)), V.add(V.add(c0, V.mul(t1, i)), V.mul(t2, size))], width: 1, color: '#8a94a6', label: i === -size ? label : undefined }); out.push({ pts: [V.add(V.add(c0, V.mul(t2, i)), V.mul(t1, -size)), V.add(V.add(c0, V.mul(t2, i)), V.mul(t1, size))], width: 1, color: '#8a94a6' }); }
    return out;
  }
  const dots = (arr) => ({ points: true, pts: arr });

  /* ---------------- Vector3D ---------------- */
  register('space', 'vector3d', {
    ops: [
      {
        id: 'two', name: '두 벡터  OA, OB',
        help: [['(1, 2, 3), (4, 5, -3)', ''], ['(1, 0, 0), (0, 1, 0)', '']],
        run(s) {
          const [A, B] = P3(s), c = V.cross(A, B), cos = V.dot(A, B) / (V.len(A) * V.len(B));
          return {
            html: N.table([['OA + OB', pt(V.add(A, B))], ['OA − OB', pt(V.sub(A, B))], ['AB = OB − OA', pt(V.sub(B, A))], ['OA · OB (내적)', f(V.dot(A, B))],
              ['OA × OB (외적)', pt(c)], ['|OA|, |OB|, |AB|', `${N.exactShort(V.len(A))}, ${N.exactShort(V.len(B))}, ${N.exactShort(V.len(V.sub(B, A)))}`], ['∠AOB', `${ang(Math.acos(Math.max(-1, Math.min(1, cos))))} (cos = ${ex(cos)})`],
              ['OA 의 단위벡터', `(${V.unit(A).map(N.exactShort).join(', ')})`], ['OA, OB 에 모두 수직인 단위벡터', V.len(c) > 1e-12 ? `±(${V.unit(c).map(N.exactShort).join(', ')})` : '평행한 두 벡터'], ['평행사변형의 넓이 |OA × OB|', ex(V.len(c))]]),
            mount: draw3(p => p.add(seg([0, 0, 0], A, 'OA')).add(seg([0, 0, 0], B, 'OB')).add(seg([0, 0, 0], c, 'OA × OB')).add(dots([[...A, 'A'], [...B, 'B']])))
          };
        }
      },
      {
        id: 'tri', name: '삼각형의 오심 (공간)',
        help: [['(1, 2, 3), (4, 5, -3), (-5, 2, 6)', ''], ['(2, 0, 0), (0, 2, 0), (0, 0, 2)', '정삼각형']],
        run(s) {
          const [A, B, C] = P3(s), a = V.len(V.sub(B, C)), b = V.len(V.sub(C, A)), c = V.len(V.sub(A, B));
          const n = V.cross(V.sub(B, A), V.sub(C, A)), S = V.len(n) / 2; if (S < 1e-12) throw new Error('세 점이 한 직선 위에 있습니다.');
          const G = V.mul(V.add(V.add(A, B), C), 1 / 3), u = b * b + c * c - a * a, v = c * c + a * a - b * b, w = a * a + b * b - c * c;
          const wO = [a * a * u, b * b * v, c * c * w], sO = wO[0] + wO[1] + wO[2], O = V.mul(V.add(V.add(V.mul(A, wO[0]), V.mul(B, wO[1])), V.mul(C, wO[2])), 1 / sO);
          const H = V.sub(V.add(V.add(A, B), C), V.mul(O, 2)), I = V.mul(V.add(V.add(V.mul(A, a), V.mul(B, b)), V.mul(C, c)), 1 / (a + b + c));
          return {
            html: N.table([['변의 길이 a, b, c', `${N.exactShort(a)}, ${N.exactShort(b)}, ${N.exactShort(c)}`], ['넓이 S = |AB × AC|/2', ex(S)], ['무게중심 G', pt(G)], ['외심 O, 반지름 R', `${pt(O)}, R = ${ex(a * b * c / (4 * S))}`],
              ['수심 H', pt(H)], ['내심 I, 반지름 r', `${pt(I)}, r = ${ex(2 * S / (a + b + c))}`], ['삼각형을 품은 평면', planeStr(planeFrom(A, n))]]),
            mount: draw3(p => p.add({ pts: [A, B, C, A], label: '△ABC' }).add(dots([[...A, 'A'], [...B, 'B'], [...C, 'C'], [...G, 'G'], [...O, 'O'], [...H, 'H'], [...I, 'I']])))
          };
        }
      },
      {
        id: 'tetra', name: '사면체  (무게중심, 외심, 부피)',
        help: [['(1, 2, 3), (4, 5, -3), (-5, 2, 6), (0, -3, 2)', ''], ['(0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)', '']],
        run(s) {
          const [A, B, C, D] = P3(s), vol = Math.abs(V.dot(V.sub(D, A), V.cross(V.sub(B, A), V.sub(C, A)))) / 6;
          if (vol < 1e-12) throw new Error('네 점이 한 평면 위에 있습니다.');
          const G = V.mul(V.add(V.add(A, B), V.add(C, D)), 1 / 4);
          const M = [B, C, D].map(P => V.mul(V.sub(P, A), 2)), rhs = [B, C, D].map(P => V.dot(P, P) - V.dot(A, A)), O = L.mv(L.inv(M), rhs);
          return {
            html: N.table([['부피 V = |AD·(AB × AC)|/6', ex(vol)], ['무게중심 G', pt(G)], ['외심 O (네 꼭짓점에서 같은 거리)', pt(O)], ['외접구 반지름', ex(V.len(V.sub(O, A)))]]),
            mount: draw3(p => p.add({ pts: [A, B, C, A, D, B] }).add({ pts: [C, D] }).add(dots([[...A, 'A'], [...B, 'B'], [...C, 'C'], [...D, 'D'], [...G, 'G'], [...O, 'O']])))
          };
        }
      }
    ]
  });

  /* ---------------- 직선 ---------------- */
  register('space', 'line3d', {
    ops: [
      {
        id: 'two', name: '두 점을 지나는 직선',
        help: [['(1, 2, 3), (4, 5, -3)', ''], ['(1, 0, 2), (1, 3, 2)', '']],
        run(s) { const [A, B] = P3(s), u = V.sub(B, A); return { html: `<p>방향벡터 u = ${pt(u)}</p><p>매개변수 꼴: ${lineStr(A, u)}</p><p>대칭 꼴: <b>${symStr(A, u)}</b></p>`, mount: draw3(p => p.add(lineIt(A, u, '직선')).add(dots([[...A, 'A'], [...B, 'B']]))) }; }
      },
      {
        id: 'dir', name: '한 점과 방향벡터',
        note: '입력: 점 A, 방향벡터 u',
        help: [['(1, 2, 3), (2, -1, 4)', '']],
        run(s) { const [A, u] = P3(s); return { html: `<p>매개변수 꼴: ${lineStr(A, u)}</p><p>대칭 꼴: <b>${symStr(A, u)}</b></p>`, mount: draw3(p => p.add(lineIt(A, u, '직선')).add(dots([[...A, 'A']]))) }; }
      },
      {
        id: 'perp', name: '한 점을 지나고 평면에 수직인 직선',
        note: '입력: 점 ; 평면',
        help: [['(1, 2, 3); 2x - y + z = 4', ''], ['(0, 0, 0); x + y + z = 3', '']],
        run(s) {
          const [a, b] = s.split(';'), A = P3(a)[0], p = planeOf(b), n = p.slice(0, 3), t = -(V.dot(n, A) + p[3]) / V.dot(n, n), H = V.add(A, V.mul(n, t));
          return { html: `<p>방향벡터 = 법선벡터 ${pt(n)}</p><p>직선: <b>${symStr(A, n)}</b></p><p>평면과 만나는 점 (수선의 발): ${pt(H)},  거리 ${ex(Math.abs(t) * V.len(n))}</p>`, mount: draw3(q => { planeIt(p, H).forEach(it => q.add(it)); q.add(lineIt(A, n, '수직선')).add(dots([[...A, 'A'], [...H, 'H']])); }) };
        }
      },
      {
        id: 'foot', name: '점에서 직선에 내린 수선의 발',
        note: '입력: 점 P ; 직선 위의 두 점 A, B',
        help: [['(1, 2, 3); (0, 0, 0), (1, 1, 1)', ''], ['(3, -1, 2); (1, 0, 1), (2, 3, 0)', '']],
        run(s) {
          const [a, b] = s.split(';'), P = P3(a)[0], [A, B] = P3(b), u = V.sub(B, A), t = V.dot(V.sub(P, A), u) / V.dot(u, u), H = V.add(A, V.mul(u, t));
          return { html: `<p>수선의 발 H = <b>${pt(H)}</b></p><p>거리 |PH| = ${ex(V.len(V.sub(P, H)))}</p><p>직선에 대한 대칭점 P′ = ${pt(V.sub(V.mul(H, 2), P))}</p>`, mount: draw3(q => q.add(lineIt(A, u, '직선')).add(seg(P, H, 'PH')).add(dots([[...P, 'P'], [...H, 'H']]))) };
        }
      },
      {
        id: 'rel', name: '두 직선의 위치관계  (평행, 만남, 꼬인 위치)',
        note: '입력: 직선1 의 두 점 ; 직선2 의 두 점',
        help: [['(0, 0, 0), (1, 1, 0); (0, 1, 0), (1, 0, 0)', '만남'], ['(0, 0, 0), (1, 0, 0); (0, 1, 1), (0, 2, 1)', '꼬인 위치'], ['(0, 0, 0), (1, 2, 3); (1, 0, 0), (2, 2, 3)', '평행']],
        run(s) {
          const [p1, p2] = s.split(';').map(P3), [A, B] = p1, [C, D] = p2, u = V.sub(B, A), v = V.sub(D, C), w = V.sub(C, A), n = V.cross(u, v);
          let h, extra = [];
          if (V.len(n) < 1e-12) { const d = V.len(V.cross(w, u)) / V.len(u); h = d < 1e-12 ? '<p><b>일치</b></p>' : `<p><b>평행</b>, 거리 ${ex(d)}</p>`; }
          else {
            const d = Math.abs(V.dot(w, n)) / V.len(n), cos = Math.abs(V.dot(u, v)) / (V.len(u) * V.len(v));
            const M = [[V.dot(u, u), -V.dot(u, v)], [V.dot(u, v), -V.dot(v, v)]], rhs = [V.dot(w, u), V.dot(w, v)], [t, sv] = L.mv(L.inv(M), rhs);
            const P = V.add(A, V.mul(u, t)), Q = V.add(C, V.mul(v, sv));
            h = d < 1e-10 ? `<p><b>한 점에서 만남</b>: 교점 ${pt(P)}</p>` : `<p><b>꼬인 위치</b>: 최단거리 ${ex(d)}  (공통수선의 발 ${pt(P)}, ${pt(Q)})</p>`;
            h += `<p>두 직선이 이루는 각 ${ang(Math.acos(Math.min(1, cos)))}</p>`; extra = [dots([[...P, 'P'], ...(d > 1e-10 ? [[...Q, 'Q']] : [])])];
            if (d > 1e-10) extra.push(seg(P, Q, '공통수선'));
          }
          return { html: h, mount: draw3(q => { q.add(lineIt(A, u, 'ℓ₁')).add(lineIt(C, v, 'ℓ₂')); extra.forEach(it => q.add(it)); }) };
        }
      }
    ]
  });

  /* ---------------- 평면 ---------------- */
  register('space', 'plane3d', {
    ops: [
      {
        id: 'three', name: '세 점을 지나는 평면',
        help: [['(1, 2, 3), (4, 5, -3), (-5, 2, 6)', ''], ['(1, 0, 0), (0, 2, 0), (0, 0, 3)', '절편 1, 2, 3']],
        run(s) {
          const [A, B, C] = P3(s), n = V.cross(V.sub(B, A), V.sub(C, A)); if (V.len(n) < 1e-12) throw new Error('세 점이 한 직선 위에 있어 평면이 하나로 정해지지 않습니다.');
          const p = planeFrom(A, n);
          return { html: `<p>법선벡터 n = AB × AC = ${pt(n)}</p><p>평면: <b>${planeStr(p)}</b></p>`, mount: draw3(q => { planeIt(p, A).forEach(it => q.add(it)); q.add({ pts: [A, B, C, A] }).add(dots([[...A, 'A'], [...B, 'B'], [...C, 'C']])); }) };
        }
      },
      {
        id: 'normal', name: '한 점과 법선벡터',
        help: [['(1, 2, 3), (2, -1, 4)', 'A, n']],
        run(s) { const [A, n] = P3(s), p = planeFrom(A, n); return { html: `<p>평면: <b>${planeStr(p)}</b></p>`, mount: draw3(q => { planeIt(p, A).forEach(it => q.add(it)); q.add(seg(A, V.add(A, n), 'n')).add(dots([[...A, 'A']])); }) }; }
      },
      {
        id: 'ptline', name: '한 점과 한 직선을 포함하는 평면',
        note: '입력: 점 P ; 직선 위 두 점 A, B',
        help: [['(1, 2, 3); (0, 0, 0), (1, 1, 1)', '']],
        run(s) { const [a, b] = s.split(';'), P = P3(a)[0], [A, B] = P3(b), n = V.cross(V.sub(B, A), V.sub(P, A)); if (V.len(n) < 1e-12) throw new Error('점이 직선 위에 있습니다.'); const p = planeFrom(A, n); return { html: `<p>평면: <b>${planeStr(p)}</b></p>`, mount: draw3(q => { planeIt(p, A).forEach(it => q.add(it)); q.add(lineIt(A, V.sub(B, A), '직선')).add(dots([[...P, 'P']])); }) }; }
      },
      {
        id: 'twolines', name: '두 직선을 포함하는 평면  (평행하거나 만나는)',
        note: '입력: 직선1 의 두 점 ; 직선2 의 두 점',
        help: [['(0, 0, 0), (1, 1, 0); (0, 1, 0), (1, 0, 0)', '만나는 두 직선'], ['(0, 0, 0), (1, 2, 3); (1, 0, 0), (2, 2, 3)', '평행한 두 직선']],
        run(s) {
          const [[A, B], [C, D]] = s.split(';').map(P3), u = V.sub(B, A), v = V.sub(D, C);
          let n = V.cross(u, v); if (V.len(n) < 1e-12) n = V.cross(u, V.sub(C, A));
          if (Math.abs(V.dot(n, V.sub(C, A))) > 1e-9 * V.len(n)) throw new Error('두 직선이 꼬인 위치에 있어 둘을 모두 포함하는 평면이 없습니다.');
          const p = planeFrom(A, n); return { html: `<p>평면: <b>${planeStr(p)}</b></p>`, mount: draw3(q => { planeIt(p, A).forEach(it => q.add(it)); q.add(lineIt(A, u, 'ℓ₁')).add(lineIt(C, v, 'ℓ₂')); }) };
        }
      },
      {
        id: 'dist', name: '점과 평면  (거리, 수선의 발, 대칭점)',
        note: '입력: 점 ; 평면',
        help: [['(1, 2, 3); 2x - y + 2z - 3 = 0', ''], ['(0, 0, 0); x + y + z = 3', '']],
        run(s) {
          const [a, b] = s.split(';'), P = P3(a)[0], p = planeOf(b), n = p.slice(0, 3), t = (V.dot(n, P) + p[3]) / V.dot(n, n), H = V.sub(P, V.mul(n, t));
          return { html: `<p>거리 = |ax₀ + by₀ + cz₀ + d|/√(a² + b² + c²) = <b>${ex(Math.abs(t) * V.len(n))}</b></p><p>수선의 발 H = ${pt(H)},  대칭점 P′ = ${pt(V.sub(P, V.mul(n, 2 * t)))}</p><p>P 를 지나고 평행한 평면: ${planeStr(planeFrom(P, n))}</p>`, mount: draw3(q => { planeIt(p, H).forEach(it => q.add(it)); q.add(seg(P, H, 'PH')).add(dots([[...P, 'P'], [...H, 'H']])); }) };
        }
      },
      {
        id: 'two', name: '두 평면  (교선, 사잇각)',
        note: '입력: 평면1 ; 평면2',
        help: [['x + y + z = 1; 2x - y + z = 3', ''], ['x + 2y - z = 1; 2x + 4y - 2z = 5', '평행']],
        run(s) {
          const [p, q] = s.split(';').map(planeOf), n1 = p.slice(0, 3), n2 = q.slice(0, 3), u = V.cross(n1, n2);
          const cos = Math.abs(V.dot(n1, n2)) / (V.len(n1) * V.len(n2));
          if (V.len(u) < 1e-12) { const k = V.len(n2) / V.len(n1) * Math.sign(V.dot(n1, n2)); const d = Math.abs(p[3] * k - q[3]) / V.len(n2); return `<p><b>${d < 1e-12 ? '일치' : '평행'}</b>${d < 1e-12 ? '' : `, 거리 ${ex(d)}`}</p>`; }
          // 교선 위의 한 점: 두 평면 + (u·X = 0)
          const A = L.mv(L.inv([n1, n2, u]), [-p[3], -q[3], 0]);
          return { html: `<p>교선: <b>${symStr(A, u)}</b>  (방향 n₁ × n₂ = ${pt(u)})</p><p>사잇각 ${ang(Math.acos(Math.min(1, cos)))}  (cos = ${ex(cos)})</p>`, mount: draw3(r => { planeIt(p, A, 3, 'π₁').forEach(it => r.add(it)); planeIt(q, A, 3, 'π₂').forEach(it => r.add({ ...it, color: '#c08a4a' })); r.add(lineIt(A, u, '교선', 4)); }) };
        }
      },
      {
        id: 'threeplanes', name: '세 평면의 교점',
        help: [['x + y + z = 6; 2x - y + z = 3; x + 2y - z = 2', '']],
        run(s) { const ps = s.split(';').map(planeOf); if (ps.length !== 3) throw new Error('평면 세 개를 ; 로 나눠 입력하세요.'); const M = ps.map(p => p.slice(0, 3)); if (Math.abs(L.det(M)) < 1e-12) return '<p>법선벡터들이 일차종속이라 한 점에서 만나지 않습니다 (직선을 공유하거나 만나지 않음).</p>'; const X = L.mv(L.inv(M), ps.map(p => -p[3])); return `<p>교점: <b>${pt(X)}</b></p>`; }
      },
      {
        id: 'lp', name: '직선과 평면  (교점, 사잇각)',
        note: '입력: 직선 위 두 점 ; 평면',
        help: [['(0, 0, 0), (1, 2, 3); x + y + z = 6', ''], ['(1, 0, 0), (2, 1, 0); z = 1', '평행']],
        run(s) {
          const [a, b] = s.split(';'), [A, B] = P3(a), p = planeOf(b), u = V.sub(B, A), n = p.slice(0, 3), den = V.dot(n, u);
          const sin = Math.abs(den) / (V.len(n) * V.len(u));
          if (Math.abs(den) < 1e-12) return `<p><b>${Math.abs(V.dot(n, A) + p[3]) < 1e-12 ? '직선이 평면 위에 있음' : '평행'}</b></p>`;
          const t = -(V.dot(n, A) + p[3]) / den, P = V.add(A, V.mul(u, t));
          return { html: `<p>교점: <b>${pt(P)}</b></p><p>직선과 평면이 이루는 각 θ: sin θ = |n·u|/(|n||u|) = ${ex(sin)} → ${ang(Math.asin(Math.min(1, sin)))}</p>`, mount: draw3(q => { planeIt(p, P).forEach(it => q.add(it)); q.add(lineIt(A, u, '직선')).add(dots([[...P, 'P']])); }) };
        }
      }
    ]
  });

  /* ---------------- Rotation ---------------- */
  function rotMat(axis, th) { // 로드리게스
    const [x, y, z] = V.unit(axis), c = Math.cos(th), s = Math.sin(th), C = 1 - c;
    return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]];
  }
  const rotate = (P, center, axis, th) => V.add(L.mv(rotMat(axis, th), V.sub(P, center)), center);
  function rotIn(s) { const parts = s.split(';').map(t => t.trim()); if (parts.length < 4) throw new Error('점 ; 중심 ; 회전축 ; 각도(°) 를 ; 로 나눠 입력하세요.'); return { obj: parts[0], C: P3(parts[1])[0], u: P3(parts[2])[0], th: E.num(parts[3]) * Math.PI / 180 }; }
  register('space', 'rotation', {
    ops: [
      {
        id: 'point', name: '점의 회전  (중심 P, 축 u, 각 θ)',
        note: '입력: 점 ; 중심 ; 회전축 ; 각도(°)  — 축 방향에서 보아 시계 반대 방향',
        help: [['(2, 0, 0); (0, 0, 0); (0, 1, 0); 180', '→ (−2, 0, 0)'], ['(2, 0, 0); (0, 0, 0); (1, 1, 0); 180', '→ (0, 2, 0)'], ['(3, 0, 0); (0, 1, 0); (1, 1, 0); 180', '→ (−1, 4, 0)'], ['(1, 0, 0); (0, 0, 0); (1, 1, 1); 120', '']],
        run(s) {
          const { obj, C, u, th } = rotIn(s), Ps = P3(obj), R = rotMat(u, th), Ts = Ps.map(P => rotate(P, C, u, th));
          return { html: Ps.map((P, i) => `<p>${pt(P)} → <b>${pt(Ts[i])}</b></p>`).join('') + `<h4>회전행렬 R</h4>${L.html(L.clean(R))}`, mount: draw3(q => q.add(lineIt(C, u, '회전축', 3)).add(dots([...Ps.map((P, i) => [...P, names[i]]), ...Ts.map((P, i) => [...P, names[i] + "′"]), [...C, '중심']]))) };
        }
      },
      {
        id: 'line', name: '직선 · 평면의 회전',
        note: '직선: 두 점 ; 중심 ; 축 ; 각도.   평면: 평면식 ; 중심 ; 축 ; 각도',
        help: [['(1, 0, 0), (1, 1, 0); (0, 0, 0); (0, 0, 1); 90', '직선'], ['z = 1; (0, 0, 0); (1, 0, 0); 90', '평면 z = 1 을 x 축으로 90°']],
        run(s) {
          const { obj, C, u, th } = rotIn(s);
          if (obj.includes('=')) {
            const p = planeOf(obj), n = p.slice(0, 3), A = V.mul(n, -p[3] / V.dot(n, n)), A2 = rotate(A, C, u, th), n2 = L.mv(rotMat(u, th), n), p2 = planeFrom(A2, n2);
            return { html: `<p>${planeStr(p)}  →  <b>${planeStr(p2.map(v => +v.toPrecision(12)))}</b></p>`, mount: draw3(q => { planeIt(p, A, 2, '처음').forEach(it => q.add(it)); planeIt(p2, A2, 2, '회전 후').forEach(it => q.add({ ...it, color: '#c08a4a' })); q.add(lineIt(C, u, '회전축', 3)); }) };
          }
          const [A, B] = P3(obj), A2 = rotate(A, C, u, th), B2 = rotate(B, C, u, th), d = V.sub(B2, A2);
          return { html: `<p>처음 직선: ${symStr(A, V.sub(B, A))}</p><p>회전 후: <b>${symStr(A2.map(v => +v.toPrecision(12)), d.map(v => +v.toPrecision(12)))}</b></p>`, mount: draw3(q => q.add(lineIt(A, V.sub(B, A), '처음', 3)).add(lineIt(A2, d, '회전 후', 3)).add(lineIt(C, u, '회전축', 3))) };
        }
      },
      {
        id: 'trans', name: '평행이동',
        help: [['(1, 2, 3); (2, -1, 0)', '점 A 를 벡터만큼']],
        run(s) { const [a, b] = s.split(';'), A = P3(a), T = P3(b)[0]; return A.map(P => `<p>${pt(P)} → <b>${pt(V.add(P, T))}</b></p>`).join(''); }
      },
      {
        id: 'quat', name: '사원수로 나타내기',
        note: '입력: 회전축 ; 각도(°)  →  q = cos(θ/2) + sin(θ/2)(xi + yj + zk),  회전: P′ = qPq*',
        help: [['(0, 0, 1); 90', ''], ['(1, 1, 1); 120', '']],
        run(s) {
          const [a, b] = s.split(';'), u = V.unit(P3(a)[0]), th = E.num(b) * Math.PI / 180, c = Math.cos(th / 2), sn = Math.sin(th / 2);
          const q = [c, ...V.mul(u, sn)];
          return `<p>q = <b>${N.exactShort(q[0])} + ${N.exactShort(q[1])}i + ${N.exactShort(q[2])}j + ${N.exactShort(q[3])}k</b>`.replace(/\+ -/g, '− ') + `</p><p>|q| = 1,  q* = ${N.exactShort(q[0])} − (${q.slice(1).map(N.exactShort).join(', ')})·(i, j, k)</p><h4>같은 회전행렬</h4>${L.html(L.clean(rotMat(u, th)))}`;
        }
      },
      {
        id: 'axes', name: '좌표축 회전으로 도형 식 바꾸기  (z 축 기준)',
        note: '입력: f(x, y, z) = 0 ; 각도(°)  →  x = X cosθ − Y sinθ, y = X sinθ + Y cosθ 를 대입',
        help: [['x^2 + 6xy + y^2 + 4 = 0; 45', 'X² 와 Y² 만 남는 각'], ['x^2 - y^2 = 1; 45', '']],
        run(s) {
          const [src, a] = s.split(';'), th = E.num(a) * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);
          const { P2, p2str } = K.geom2 || {};
          if (!P2) throw new Error('평면도형 모듈이 필요합니다.');
          const lin = (p, q) => new Map([['1,0', p], ['0,1', q]]);
          const [l, r = '0'] = src.split('='); const res = E.evalWith(`(${l}) - (${r})`, ['x', 'y'], P2, { x: lin(c, -sn), y: lin(sn, c) });
          return `<p>θ = ${N.dec(th * 180 / Math.PI)}°:  x = X cosθ − Y sinθ, y = X sinθ + Y cosθ</p><p>새 식: <b>${p2str(res).replace(/x/g, 'X').replace(/y/g, 'Y')} = 0</b></p>`;
        }
      }
    ]
  });

  /* ---------------- L·A·V ---------------- */
  register('space', 'lav', {
    ops: [
      {
        id: 'auto', name: '길이 · 넓이 · 부피  (점의 개수로 자동)',
        note: '점 1개 → 벡터의 길이.  2개 → 거리.  3개 → 삼각형 넓이.  4개 → 사면체 부피',
        help: [['(1, 2, 3)', ''], ['(1, 2, 3), (4, 5, -3)', ''], ['(1, 2, 3), (4, 5, -3), (-5, 2, 6)', ''], ['(1, 2, 3), (4, 5, -3), (-5, 2, 6), (0, -3, 2)', '']],
        run(s) {
          const P = P3(s);
          if (P.length === 1) return `<p>|OA| = √(${P[0].map(v => f(v) + '²').join(' + ')}) = <b>${ex(V.len(P[0]))}</b></p>`;
          if (P.length === 2) return `<p>|AB| = <b>${ex(V.len(V.sub(P[1], P[0])))}</b></p>`;
          const [A, B, C, D] = P, n = V.cross(V.sub(B, A), V.sub(C, A));
          if (P.length === 3) return `<p>삼각형 ABC 의 넓이 = |AB × AC|/2 = <b>${ex(V.len(n) / 2)}</b></p><p>${V.len(n) < 1e-12 ? '세 점이 한 직선 위에 있습니다 (일차종속).' : '세 점이 한 직선 위에 있지 않습니다.'}</p>`;
          const vol = Math.abs(V.dot(V.sub(D, A), n)) / 6;
          return `<p>사면체 ABCD 의 부피 = |AD · (AB × AC)|/6 = <b>${ex(vol)}</b></p><p>평행육면체 부피 = ${ex(vol * 6)}</p><p>${vol < 1e-12 ? '네 점이 한 평면 위에 있습니다.' : '네 점이 한 평면 위에 있지 않습니다.'}</p>`;
        }
      },
      {
        id: 'angle', name: '각  (두 직선, 두 평면, 직선과 평면)',
        note: '방향벡터 두 개 → 두 직선의 각.  평면식 두 개 → 두 평면의 각.  방향벡터 ; 평면식 → 직선과 평면의 각',
        help: [['(1, 2, 3), (4, 5, -3)', '두 방향벡터'], ['x + y + z = 1; 2x - y + z = 3', '두 평면'], ['(1, 2, 3); x + y + z = 6', '직선과 평면']],
        run(s) {
          const parts = s.split(';').map(t => t.trim());
          if (parts.length === 1) { const [u, v] = P3(s), c = Math.abs(V.dot(u, v)) / (V.len(u) * V.len(v)); return `<p>cos θ = |u·v|/(|u||v|) = ${ex(c)} → <b>${ang(Math.acos(Math.min(1, c)))}</b></p>`; }
          if (parts[0].includes('=')) { const [p, q] = parts.map(planeOf), c = Math.abs(V.dot(p.slice(0, 3), q.slice(0, 3))) / (V.len(p.slice(0, 3)) * V.len(q.slice(0, 3))); return `<p>두 평면의 각: cos θ = ${ex(c)} → <b>${ang(Math.acos(Math.min(1, c)))}</b></p>`; }
          const u = P3(parts[0])[0], n = planeOf(parts[1]).slice(0, 3), sn = Math.abs(V.dot(u, n)) / (V.len(u) * V.len(n));
          return `<p>직선과 평면의 각: sin θ = |u·n|/(|u||n|) = ${ex(sn)} → <b>${ang(Math.asin(Math.min(1, sn)))}</b></p>`;
        }
      }
    ]
  });
})();
