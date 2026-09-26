/*
 * 계산기 모듈 (원본: BigCalculationUMP_5.java)
 *  일반용: 정수·분수는 BigInt 로 정확하게, 그 밖에는 실수로 계산
 *  과학용: 비트·논리·시프트 연산과 진법 표시
 *  수학용 / 정수론용 / 통계용: 수 하나(또는 둘)를 넣으면 관련 값을 한꺼번에
 */
(function () {
  const K = window.KPHS, { register } = K;
  const N = K.num, E = K.expr;
  const B = (v) => BigInt(v);
  const gcdB = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const Q = (n, d = 1n) => { if (d === 0n) throw new Error('0 으로 나눌 수 없습니다.'); if (d < 0n) { n = -n; d = -d; } const g = gcdB(n, d) || 1n; return { q: [n / g, d / g] }; };
  const toNum = (v) => (v.q ? Number(v.q[0]) / Number(v.q[1]) : v.x);
  const isInt = (v) => v.q && v.q[1] === 1n;
  const F = (x) => ({ x });
  function decToQ(v) { // 입력 리터럴을 정확한 분수로
    if (Number.isInteger(v) && Math.abs(v) < 2 ** 53) return Q(B(v));
    const s = String(v); if (/e/i.test(s)) return F(v);
    const [i, fr = ''] = s.split('.'); return Q(B(i + fr), 10n ** B(fr.length));
  }
  const big = (n) => { const s = n.toString(); return s.length > 80 ? `${s.slice(0, 40)}…${s.slice(-25)} <span class="muted">(${s.replace('-', '').length}자리)</span>` : s; };
  const factB = (n) => { if (n > 20000n) throw new Error('계승은 20000! 까지만 정확히 계산합니다.'); let r = 1n; for (let i = 2n; i <= n; i++) r *= i; return r; };
  const O = {
    c: decToQ,
    add: (a, b) => (a.q && b.q ? Q(a.q[0] * b.q[1] + b.q[0] * a.q[1], a.q[1] * b.q[1]) : F(toNum(a) + toNum(b))),
    sub: (a, b) => (a.q && b.q ? Q(a.q[0] * b.q[1] - b.q[0] * a.q[1], a.q[1] * b.q[1]) : F(toNum(a) - toNum(b))),
    mul: (a, b) => (a.q && b.q ? Q(a.q[0] * b.q[0], a.q[1] * b.q[1]) : F(toNum(a) * toNum(b))),
    div: (a, b) => (a.q && b.q ? Q(a.q[0] * b.q[1], a.q[1] * b.q[0]) : F(toNum(a) / toNum(b))),
    neg: (a) => (a.q ? Q(-a.q[0], a.q[1]) : F(-a.x)),
    pow(a, b) {
      if (a.q && isInt(b)) {
        const e = b.q[0], size = Math.abs(Number(e)) * Math.max(a.q[0].toString().length, a.q[1].toString().length);
        if (size < 200000) return e >= 0n ? Q(a.q[0] ** e, a.q[1] ** e) : Q(a.q[1] ** -e, a.q[0] ** -e);
      }
      if (a.q && b.q && b.q[1] === 2n && a.q[0] >= 0n) { // 제곱근이 유리수인지
        const r = (n) => { const x = B(Math.round(Math.sqrt(Number(n)))); return x * x === n ? x : null; };
        const rn = r(a.q[0]), rd = r(a.q[1]); if (rn !== null && rd !== null) return O.pow(Q(rn, rd), Q(b.q[0]));
      }
      const x = toNum(a), y = toNum(b);
      return F(x < 0 && Number.isInteger(1 / y) && (1 / y) % 2 === 1 ? -Math.pow(-x, y) : Math.pow(x, y));
    },
    fn(name, args) {
      const ints = args.every(isInt), I = args.map(v => (v.q ? v.q[0] : null));
      if (name === 'fact' && ints && I[0] >= 0n) return Q(factB(I[0]));
      if (name === 'P' && ints) { let p = 1n; for (let i = 0n; i < I[1]; i++) p *= I[0] - i; return Q(p); }
      if ((name === 'C' || name === 'H') && ints) { const n = name === 'H' ? I[0] + I[1] - 1n : I[0], r = I[1]; if (r < 0n || r > n) return Q(0n); let p = 1n; for (let i = 0n; i < r; i++) p = p * (n - i) / (i + 1n); return Q(p); }
      if (name === 'mod' && ints) return Q(((I[0] % I[1]) + I[1]) % I[1]);
      if (name === 'div' && ints) { let q = I[0] / I[1]; if ((I[0] % I[1] !== 0n) && ((I[0] < 0n) !== (I[1] < 0n))) q -= 1n; return Q(q); }
      if (name === 'gcd' && ints) return Q(gcdB(I[0], I[1]));
      if (name === 'lcm' && ints) return Q(I[0] / gcdB(I[0], I[1]) * I[1]);
      if (name === 'abs' && args[0].q) return Q(I[0] < 0n ? -I[0] : I[0], args[0].q[1]);
      if (name === 'sqrt' && args[0].q) return O.pow(args[0], Q(1n, 2n));
      return F(E.FN[name](...args.map(toNum)));
    }
  };
  function show(v) {
    if (v.q) {
      const [n, d] = v.q;
      if (d === 1n) return `<p class="calc-val"><b>${big(n)}</b></p>${n.toString().length > 15 ? `<p class="muted">≈ ${N.dec(Number(n), 12)}</p>` : ''}`;
      const ip = n / d, rem = n - ip * d;
      return `<p class="calc-val"><b>${big(n)}/${big(d)}</b>${ip !== 0n ? ` <span class="muted">= ${ip} ${rem < 0n ? '−' : '+'} ${rem < 0n ? -rem : rem}/${d}</span>` : ''}</p><p class="muted">≈ ${N.dec(Number(n) / Number(d), 15)}</p>`;
    }
    const x = v.x; const ex = N.exact(x);
    return `<p class="calc-val"><b>${N.dec(x, 15)}</b></p>${ex !== N.dec(x, 10) && !/^-?[\d.]+$/.test(ex.replace(/<[^>]+>/g, '')) ? `<p class="muted">= ${ex}</p>` : ''}`;
  }
  const KEYS = [['7'], ['8'], ['9'], ['÷', '/', 'op'], ['(', '('], [')', ')'],
    ['4'], ['5'], ['6'], ['×', '*', 'op'], ['xʸ', '^', 'op'], ['√', 'sqrt()'],
    ['1'], ['2'], ['3'], ['−', '-', 'op'], ['n!', '!'], ['π', 'pi'],
    ['0'], ['.'], [',', ', '], ['+', '+', 'op'], ['e', 'e'], ['°', '°'],
    ['sin', 'sin()'], ['cos', 'cos()'], ['tan', 'tan()'], ['ln', 'ln()'], ['log₁₀', 'log10()'], ['1/x', '1/('],
    ['ₙPᵣ', 'P()'], ['ₙCᵣ', 'C()'], ['몫', 'div()'], ['나머지', 'mod()'], ['⌫', 'BS'], ['AC', 'AC'],
    ['=', '=', 'eq']].map(([a, b, c]) => [a, b === undefined ? a : b, c || (/^[\d.]$/.test(a) ? 'num' : '')]);

  register('calculator', 'general', {
    ops: [{
      id: 'calc', name: '일반 계산',
      note: '정수와 분수는 자릿수 제한 없이 정확하게 계산합니다. 각도는 라디안이며, 도(°)로 쓰려면 30° 처럼 붙이세요.',
      keys: KEYS,
      help: [['2^100', ''], ['50!', ''], ['1/3 + 1/6', '분수 그대로'], ['C(100, 50)', '조합'], ['P(10, 3) + mod(-7, 3)', '순열, 나머지'], ['sin(30°) + sqrt(2)', ''], ['(1/2)^10 + 3/4', '분수의 거듭제곱']],
      run(s) {
        if (/i\)?$/.test(s.trim()) && /\di|\bi\b/.test(s)) throw new Error('복소수는 “행렬활용 → 연산 → 복소수 연산”에서 계산하세요.');
        const v = E.evalWith(s, [], O, {});
        return show(v);
      }
    }]
  });

  /* ---------------- 과학용 ---------------- */
  function bitEval(s) {
    const t = s.replace(/\bAND\b/gi, '&').replace(/\bOR\b/gi, '|').replace(/\bXOR\b/gi, '^').replace(/\bNOT\b/gi, '~').replace(/\s+/g, ' ');
    if (!/^[0-9a-fA-FxXbBoO\s&|^~<>+\-*/%()]+$/.test(t)) throw new Error('정수, 0x·0b·0o 표기, & | ^ ~ << >> >>> + − * / % 괄호만 쓸 수 있습니다.');
    const lit = /\b(0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+)\b/g;
    if (/[a-fA-F]/.test(t.replace(lit, ''))) throw new Error('16진수는 0x 를 붙이세요 (예: 0xFF).');
    if (t.includes('>>>')) { const v = new Function(`return (${t.replace(lit, (m) => String(Number(m)))});`)(); return { v: B(v), u32: true }; }
    const v = new Function(`return (${t.replace(lit, '$1n')});`)();
    return { v };
  }
  const baseRows = (v) => {
    const neg = v < 0n, a = neg ? -v : v;
    const rows = [['10진수', v.toString()], ['2진수', (neg ? '-' : '') + a.toString(2).replace(/\B(?=(\d{4})+(?!\d))/g, ' ')], ['8진수', (neg ? '-' : '') + a.toString(8)], ['16진수', (neg ? '-' : '') + a.toString(16).toUpperCase()]];
    if (neg && a <= 2n ** 31n) rows.push(['32비트 2의 보수', ((1n << 32n) + v).toString(2).replace(/\B(?=(\d{4})+(?!\d))/g, ' ')]);
    return rows;
  };
  register('calculator', 'scientific', {
    ops: [{
      id: 'bit', name: '비트 · 논리 · 시프트 연산',
      note: 'AND(&), OR(|), XOR(^), NOT(~), 왼쪽 시프트(&lt;&lt;), 오른쪽 시프트(&gt;&gt;), 부호 없는 시프트(&gt;&gt;&gt;, 32비트). 0x1F, 0b1010, 0o17 표기 가능',
      keys: [['&'], ['|'], ['^'], ['~'], ['<<'], ['>>'], ['>>>'], ['0x'], ['0b'], ['('], [')'], ['⌫', 'BS'], ['AND', ' & '], ['OR', ' | '], ['XOR', ' ^ '], ['NOT', '~'], ['AC', 'AC'], ['=', '=', 'eq']].map(([a, b, c]) => [a, b === undefined ? a : b, c || 'op']),
      help: [['12 & 10', ''], ['0xFF ^ 0b1010', ''], ['5 << 3', ''], ['~5', ''], ['-16 >>> 28', '32비트 부호 없는 시프트'], ['(0xF0 | 0x0F) & 0x3C', '']],
      run(s) {
        const { v } = bitEval(s);
        return `<p class="calc-val"><b>${v}</b></p>` + N.table(baseRows(v));
      }
    }]
  });

  /* ---------------- 수학용 ---------------- */
  register('calculator', 'math', {
    ops: [{
      id: 'mn', name: 'm, n 에 대한 값 한꺼번에',
      help: [['5, 3', 'm = 5, n = 3'], ['10, 4', ''], ['20, 5', '']],
      run(s) {
        const [m, n] = E.nums(s).map(v => { if (!Number.isInteger(v) || v < 0) throw new Error('0 이상의 정수를 입력하세요.'); return v; });
        if (n === undefined) throw new Error('m, n 두 수를 입력하세요.');
        const C = K.comb; if (!C) throw new Error('이산·특수함수 모듈이 필요합니다.');
        let pm = 0n; for (let k = 1; k <= m; k++) pm += C.partK(m, k);
        return N.table([[`중복순열 <sub>${m}</sub>Π<sub>${n}</sub> = mⁿ`, big(B(m) ** B(n))], [`중복조합 <sub>${m}</sub>H<sub>${n}</sub>`, big(C.comb(m + n - 1, n))],
          [`전사함수 개수 T(${m}, ${n})`, big(C.surj(m, n))], [`제2종 스털링 수 S(${m}, ${n})`, big(C.stirling2(m, n))], [`제1종 스털링 수 c(${m}, ${n})`, big(C.stirling1(m, n))],
          [`벨 수 B(${m})`, big(C.bell(m))], [`자연수 분할 p(${m}, ${n})`, C.partK(m, n).toString()], [`분할수 p(${m})`, pm.toString()],
          [`순열 <sub>${m}</sub>P<sub>${n}</sub>`, big(C.perm(m, n))], [`조합 <sub>${m}</sub>C<sub>${n}</sub>`, big(C.comb(m, n))]]);
      }
    }]
  });

  /* ---------------- 정수론용 ---------------- */
  register('calculator', 'number', {
    ops: [{
      id: 'n', name: 'n 에 대한 값 한꺼번에',
      help: [['23', ''], ['100', ''], ['13', '']],
      run(s) {
        const v = E.num(s); if (!Number.isInteger(v) || v < 1) throw new Error('자연수를 입력하세요.');
        const n = B(v), nt = K.nt, C = K.comb;
        const f = nt.factorize(n), phi = nt.phiFrom(n, f), hasPR = n > 1n && nt.hasPrimitiveRoot(n, f);
        let pr = '없음';
        if (hasPR) { const pf = nt.factorize(phi); for (let a = 1n; a < n || n === 2n; a++) { if (nt.gcd(a, n) === 1n && nt.order(a, n, phi, pf) === phi) { pr = a.toString(); break; } if (n === 2n) break; } }
        const sq = B(Math.floor(Math.sqrt(v)));
        const cf = sq * sq === n ? `√${v} = ${sq} (제곱수)` : (() => { const r = nt.quadCF(0n, n, 1n); return `√${v} = ${nt.cfStr(r.a, r.period)}`; })();
        return N.table([['소인수분해', [...f].map(([p, e]) => (e > 1 ? `${p}<sup>${e}</sup>` : p)).join(' × ') || '1'], ['오일러 함수 φ(n)', phi.toString()], ['최소 원시근 lpR(n)', pr],
          ['√n 의 연분수 CoFr(n)', cf], ['교란 수 D(n)', v <= 3000 ? big(C.derange(v)) : '너무 큼'], ['카탈란 수 Cat(n)', v <= 3000 ? big(C.catalan(v)) : '너무 큼'],
          ['감마함수 Γ(n) = (n−1)!', v <= 3000 ? big(C.fact(v - 1)) : N.dec(Math.exp(E.lgamma(v)), 12)]]);
      }
    }]
  });

  /* ---------------- 통계용 ---------------- */
  register('calculator', 'stat', {
    ops: [{
      id: 'quick', name: '분포 값 빨리 구하기',
      note: 'N z  /  chi2 자유도, x  /  t 자유도, x  /  F n₁, n₂, x  /  B n, p, k  →  누적확률 P(X ≤ x)',
      help: [['N 1.96', 'Φ(1.96)'], ['chi2 5, 11.07', ''], ['t 10, 2.228', ''], ['F 3, 10, 3.71', ''], ['B 10, 0.3, 3', '이항분포 P(X ≤ 3), P(X = 3)']],
      run(s) {
        const m = s.trim().match(/^(N|chi2|χ2|χ²|t|F|B)\s+(.*)$/i); if (!m) throw new Error('N, chi2, t, F, B 중 하나로 시작하세요. 예) N 1.96');
        const a = E.nums(m[2]), S = K.stats, d = (x) => N.dec(x, 10), k = m[1].toLowerCase();
        if (k === 'n') return `<p>Φ(${a[0]}) = P(Z ≤ ${a[0]}) = <b>${d(S.normal.cdf(a[0]))}</b></p>`;
        if (k.startsWith('chi') || k.startsWith('χ')) return `<p>P(χ²(${a[0]}) ≤ ${a[1]}) = <b>${d(S.chi2.cdf(a[1], a[0]))}</b></p>`;
        if (k === 't') return `<p>P(T(${a[0]}) ≤ ${a[1]}) = <b>${d(S.tdist.cdf(a[1], a[0]))}</b></p>`;
        if (k === 'f') return `<p>P(F(${a[0]}, ${a[1]}) ≤ ${a[2]}) = <b>${d(S.fdist.cdf(a[2], a[0], a[1]))}</b></p>`;
        return `<p>X ~ B(${a[0]}, ${a[1]}):  P(X ≤ ${a[2]}) = <b>${d(S.binom.cdf(a[2], a[0], a[1]))}</b>,  P(X = ${a[2]}) = ${d(S.binom.pmf(a[2], a[0], a[1]))}</p>`;
      }
    }]
  });
})();
