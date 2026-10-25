/*
 * 이산·특수함수 모듈 (원본: MultiCaseFunctionUMP_5.java, RookPolynomial_New.java)
 *  진법변환, 지수로그, 삼각쌍곡, 이산함수, 특수함수
 */
(function () {
  const K = window.KPHS, { register } = K;
  const N = K.num, E = K.expr, S = K.stats;
  const B = (v) => BigInt(v);
  const esc = K.esc;

  /* ---------- 정수 조합 함수 (BigInt) ---------- */
  const fact = (n) => { let r = 1n; for (let i = 2n; i <= B(n); i++) r *= i; return r; };
  const perm = (n, r) => { n = B(n); r = B(r); if (r < 0n || r > n) return 0n; let p = 1n; for (let i = 0n; i < r; i++) p *= n - i; return p; };
  const comb = (n, r) => { n = B(n); r = B(r); if (r < 0n) return 0n; if (n >= 0n && r > n) return 0n; if (n >= 0n && r > n - r) r = n - r; let p = 1n; for (let i = 0n; i < r; i++) p = p * (n - i) / (i + 1n); return p; };
  function stirling2(n, k) { // S(n, k)
    const row = [1n]; for (let i = 1; i <= n; i++) { row.push(0n); for (let j = i; j >= 1; j--) row[j] = B(j) * row[j] + row[j - 1]; row[0] = 0n; }
    return row[k] ?? 0n;
  }
  function stirling1(n, k) { // 부호 없는 제1종 c(n, k)
    const row = [1n]; for (let i = 1; i <= n; i++) { row.push(0n); for (let j = i; j >= 1; j--) row[j] = B(i - 1) * row[j] + row[j - 1]; row[0] = 0n; }
    return row[k] ?? 0n;
  }
  function partK(n, k) { // n 을 정확히 k 개의 양의 정수로 분할
    const p = Array.from({ length: n + 1 }, () => new Array(k + 1).fill(0n)); p[0][0] = 1n;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= Math.min(i, k); j++) p[i][j] = p[i - 1][j - 1] + (i - j >= 0 ? p[i - j][j] : 0n);
    return p[n][k];
  }
  const bell = (n) => { let s = 0n; for (let k = 0; k <= n; k++) s += stirling2(n, k); return s; };
  const derange = (n) => { let a = 1n, b = 0n; if (n === 0) return 1n; for (let i = 2; i <= n; i++) [a, b] = [b, B(i - 1) * (a + b)]; return b; };
  const catalan = (n) => comb(2 * n, n) / B(n + 1);
  const surj = (n, r) => fact(r) * stirling2(n, r);
  const dfact = (n) => { let r = 1n; for (let i = B(n); i > 1n; i -= 2n) r *= i; return r; };
  const toInt = (v, name = '값') => { if (!Number.isInteger(v)) throw new Error(`${name}은(는) 정수여야 합니다.`); return v; };
  const two = (s) => { const a = E.nums(s); if (a.length < 2) throw new Error('n, r 두 수를 쉼표로 입력하세요.'); return a.map(v => toInt(v)); };
  const big = (v) => { const s = v.toString(); return s.length > 60 ? `${s.slice(0, 30)}…${s.slice(-20)} <span class="muted">(${s.length}자리)</span>` : s; };

  /* ---------------- 진법변환 ---------------- */
  const DIG = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function parseBase(str, base) { // → 분수 [num, den] (BigInt)
    const s = str.toUpperCase().replace(/\s/g, ''); const neg = s.startsWith('-');
    const [ip, fp = ''] = s.replace('-', '').split('.');
    let num = 0n, den = 1n;
    for (const c of ip + fp) { const d = DIG.indexOf(c); if (d < 0 || d >= base) throw new Error(`'${c}' 는 ${base}진법의 숫자가 아닙니다.`); num = num * B(base) + B(d); }
    den = B(base) ** B(fp.length);
    return [neg ? -num : num, den];
  }
  function toBase([num, den], base, maxFrac = 30) {
    const neg = num < 0n; if (neg) num = -num;
    let ip = num / den, r = num % den, s = ip === 0n ? '0' : '';
    while (ip > 0n) { s = DIG[Number(ip % B(base))] + s; ip /= B(base); }
    if (r === 0n) return (neg ? '-' : '') + s;
    let f = ''; const seen = new Map();
    while (r !== 0n && f.length < maxFrac) {
      if (seen.has(r)) { const st = seen.get(r); return `${neg ? '-' : ''}${s}.${f.slice(0, st)}<span style="text-decoration:overline">${f.slice(st)}</span>`; }
      seen.set(r, f.length); r *= B(base); f += DIG[Number(r / den)]; r %= den;
    }
    return `${neg ? '-' : ''}${s}.${f}${r !== 0n ? '…' : ''}`;
  }
  /** 진법 변환 풀이: m진수 → 10진수 (자리값의 합), 10진수 → n진수 (정수부는 나눗셈, 소수부는 곱셈) */
  function baseSteps(x, bm, bn, [num, den]) {
    const s = x.toUpperCase().replace(/[\s-]/g, ''), [ip, fp = ''] = s.split('.'), parts = [];
    if (bm !== 10) {
      const terms = [...ip].map((c, i) => `${DIG.indexOf(c)}×${bm}<sup>${ip.length - 1 - i}</sup>`).concat([...fp].map((c, i) => `${DIG.indexOf(c)}×${bm}<sup>−${i + 1}</sup>`));
      parts.push([`${bm}진수 → 10진수: 각 자리 숫자 × 자리값(${bm}<sup>k</sup>) 의 합`, `${K.sumTerms(terms, ' + ', 10)} = ${toBase([num, den], 10)}`]);
    }
    if (bn !== 10) {
      const neg = num < 0n, n0 = neg ? -num : num; let q = n0 / den; const div = [];
      if (q === 0n) div.push('정수부가 0');
      while (q > 0n && div.length < 16) { div.push(`${q} ÷ ${bn} = ${q / B(bn)} … ${DIG[Number(q % B(bn))]}`); q /= B(bn); }
      parts.push([`정수부: ${bn} 로 계속 나누고 나머지를 아래에서 위로 읽기`, div]);
      let r = n0 % den;
      if (r !== 0n) {
        const mul = [];
        for (let i = 0; i < 8 && r !== 0n; i++) { const t = r * B(bn); mul.push(`${N.fmt(Number(r) / Number(den))} × ${bn} = ${N.fmt(Number(t) / Number(den))}  → ${DIG[Number(t / den)]}`); r = t % den; }
        parts.push([`소수부: ${bn} 를 계속 곱하고 정수부분을 위에서 아래로 읽기`, r !== 0n ? [...mul, '…'] : mul]);
      }
    }
    parts.push(['결과', `${toBase([num, den], bn)}<sub>(${bn})</sub>`]);
    return K.solve(parts);
  }
  function cantor(n) { // n = Σ a_k·k!
    const parts = []; let k = 1n; while (fact(k + 1n) <= n) k++;
    for (; k >= 1n; k--) { const f = fact(k), a = n / f; n %= f; if (a) parts.push(`${a}·${k}!`); }
    return parts.join(' + ') || '0';
  }

  register('functions', 'base', {
    ops: [
      {
        id: 'conv', name: 'm진수 → n진수',
        note: '입력: 수, 원래 진법, 바꿀 진법 (2~36진법, 소수점 가능, 순환하면 윗줄로 표시)',
        help: [['1345.34, 8, 16', '8진수 1345.34 를 16진수로'], ['255, 10, 2', ''], ['FF.8, 16, 10', ''], ['0.1, 10, 2', '순환소수'], ['ZZ, 36, 10', '']],
        run(s) {
          const [x, m, n] = E.splitTop(s, ',');
          const bm = toInt(E.num(m), '진법'), bn = toInt(E.num(n), '진법');
          if (bm < 2 || bm > 36 || bn < 2 || bn > 36) throw new Error('진법은 2 ~ 36 이어야 합니다.');
          const fr = parseBase(x, bm), g = K.nt.gcd(fr[0], fr[1]);
          return `<p>${esc(x.toUpperCase())}<sub>(${bm})</sub> = ${toBase(fr, 10)}<sub>(10)</sub>${fr[1] > 1n ? ` = ${fr[0] / g}/${fr[1] / g}` : ''}</p><p>= <b>${toBase(fr, bn)}<sub>(${bn})</sub></b></p>` + baseSteps(x, bm, bn, fr);
        }
      },
      {
        id: 'all', name: '여러 진법으로 한꺼번에',
        help: [['2024', '2, 3, 5, 8, 12, 16, 36진법'], ['0.625', '']],
        run(s) {
          const fr = parseBase(s, 10);
          return N.table([2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 20, 36].map(b => [`${b}진법`, toBase(fr, b, 24)]));
        }
      },
      {
        id: 'cantor', name: '칸토어 전개 (계승 진법)',
        help: [['1234', 'n = Σ aₖ·k!  (0 ≤ aₖ ≤ k)'], ['1000000', '']],
        run(s) {
          let n = K.nt.toBig(s.trim()); const n0 = n, lines = []; let k = 1n; while (fact(k + 1n) <= n) k++;
          lines.push(`${k}! = ${fact(k)} ≤ ${n} < ${k + 1n}! = ${fact(k + 1n)}  → ${k}! 부터 시작`);
          for (; k >= 1n; k--) { const f = fact(k), a = n / f; lines.push(`${n} ÷ ${k}! (${f}) = ${a} … ${n % f}   → a<sub>${k}</sub> = ${a}`); n %= f; }
          return `<p>${n0} = <b>${cantor(n0)}</b></p>` + K.solve([['가장 큰 k! 로 나누고, 나머지를 다음 (k−1)! 로 나누기를 되풀이', lines]]);
        }
      }
    ]
  });

  /* ---------------- 지수로그 ---------------- */
  function isqrtBig(n) { if (n < 2n) return n; let x = B(Math.floor(Math.sqrt(Number(n)))) + 1n; for (;;) { const y = (x + n / x) >> 1n; if (y >= x) break; x = y; } while (x * x > n) x--; return x; }
  function inrootBig(n, k) { // ⌊ n^(1/k) ⌋
    if (n < 2n) return n; const est = Math.pow(Number(n), 1 / k);
    let x = isFinite(est) ? B(Math.ceil(est * (1 + 1e-9))) + 1n : 1n << B(Math.ceil(n.toString(2).length / k) + 1); // 참값보다 크게 시작
    for (;;) { const y = ((B(k) - 1n) * x + n / x ** (B(k) - 1n)) / B(k); if (y >= x) break; x = y; }
    while (x ** B(k) > n) x--; while ((x + 1n) ** B(k) <= n) x++; return x;
  }
  const digitsStr = (intPart, fracDigits, d) => { const s = fracDigits.toString().padStart(d, '0'); return `${intPart}.${s.replace(/(\d{5})/g, '$1 ').trim()}`; };
  function expand(coefs, names, n) { // (Σ cᵢ·xᵢ)^n 전개
    const terms = [];
    const rec = (i, left, ks) => {
      if (i === coefs.length - 1) { ks = [...ks, left]; let c = fact(n); ks.forEach(k => (c /= fact(k))); ks.forEach((k, j) => (c *= coefs[j] ** B(k))); if (c) terms.push({ c, ks }); return; }
      for (let k = left; k >= 0; k--) rec(i + 1, left - k, [...ks, k]);
    };
    rec(0, n, []);
    return terms.map((t, i) => {
      const mono = t.ks.map((k, j) => (k === 0 ? '' : k === 1 ? names[j] : `${names[j]}<sup>${k}</sup>`)).join('');
      const a = t.c < 0n ? -t.c : t.c, cs = a === 1n && mono ? '' : a.toString();
      return (i === 0 ? (t.c < 0n ? '-' : '') : t.c < 0n ? ' - ' : ' + ') + cs + mono;
    }).join('');
  }

  register('functions', 'explog', {
    ops: [
      {
        id: 'value', name: '식의 값',
        note: 'exp, pow(x, m) 또는 m^x, sqrt, cbrt, log(자연로그), log(x, m), log10, 계승(!) 을 쓸 수 있습니다. π 는 pi 로.',
        help: [['exp(2)', ''], ['2^(1/3)', ''], ['log(8, 2)', 'log₂8'], ['ln(2pi/3)', ''], ['sqrt(12)', '√ 꼴로도 표시'], ['2.5e/5', '']],
        run(s) {
          const v = E.num(s);
          return `<p>${esc(s)} = <b>${N.dec(v, 15)}</b></p>${N.exact(v) !== N.dec(v, 10) ? `<p>= ${N.exact(v)}</p>` : ''}`;
        }
      },
      {
        id: 'bigpow', name: '큰 정수의 거듭제곱  mⁿ (정확한 값)',
        help: [['2, 100', '2¹⁰⁰'], ['7, 77', ''], ['12345, 12', '']],
        run(s) { const [m, n] = two(s); if (n < 0 || n > 100000) throw new Error('지수는 0 ~ 100000'); const v = B(m) ** B(n); return `<p>${m}<sup>${n}</sup> = </p><div class="steps">${v}</div><p class="muted">${v.toString().replace('-', '').length}자리</p>` + (Math.abs(m) > 1 ? K.solve([
          ['자릿수 = ⌊n·log₁₀|m|⌋ + 1', `${n} × log₁₀${Math.abs(m)} = ${n} × ${N.dec(Math.log10(Math.abs(m)), 10)} = ${N.dec(n * Math.log10(Math.abs(m)), 10)}  → ⌊ ⌋ + 1 = ${Math.floor(n * Math.log10(Math.abs(m)) + 1e-12) + 1}`],
          ['맨 앞자리 수 = 10<sup>(소수부분)</sup>', `10<sup>${N.dec(n * Math.log10(Math.abs(m)) % 1, 8)}</sup> = ${N.dec(10 ** (n * Math.log10(Math.abs(m)) % 1), 8)}  → 앞자리 ${v.toString().replace('-', '').slice(0, 3)}…`]
        ]) : ''); }
      },
      {
        id: 'root', name: '제곱근 · n제곱근 (자릿수 지정)',
        help: [['2, 2, 50', '√2 를 소수 50자리까지'], ['10, 3, 40', '∛10'], ['5, 2, 100', '']],
        run(s) {
          const [x, k, d] = two(s); const dd = d ?? 30;
          if (x < 0 || k < 2) throw new Error('x ≥ 0, n ≥ 2 이어야 합니다.');
          const r = inrootBig(B(x) * 10n ** B(dd * k), k), ip = r / 10n ** B(dd), fp = r % 10n ** B(dd);
          const r0 = inrootBig(B(x), k);
          return `<p>${k === 2 ? '√' : `<sup>${k}</sup>√`}${x} = </p><div class="steps">${digitsStr(ip, fp, dd)}</div>` + K.solve([
            ['정수부분', `${r0}<sup>${k}</sup> = ${r0 ** B(k)} ≤ ${x} < ${r0 + 1n}<sup>${k}</sup> = ${(r0 + 1n) ** B(k)}  → 정수부분 ${r0}`],
            [`소수 ${dd}자리까지: x × 10<sup>${k}×${dd}</sup> 의 정수 ${k}제곱근을 구한 뒤 10<sup>${dd}</sup> 로 나눔`, `⌊ <sup>${k}</sup>√(${x} × 10<sup>${dd * k}</sup>) ⌋ = ${big(r)}`],
            [`뉴턴 방법  y ← ((${k}−1)y + N / y<sup>${k - 1}</sup>) / ${k}  으로 정수 근을 구함`, k === 2 ? 'y ← (y + N/y) / 2 를 값이 줄지 않을 때까지 되풀이' : `y ← (${k - 1}y + N/y<sup>${k - 1}</sup>) / ${k} 를 값이 줄지 않을 때까지 되풀이`]
          ]);
        }
      },
      {
        id: 'dfact', name: '이중계승  m!!',
        help: [['10', '10·8·6·4·2'], ['15', '15·13·…·1']],
        run(s) {
          const m = toInt(E.num(s)), fs = []; for (let i = m; i > 1; i -= 2) fs.push(i);
          return `<p>${m}!! = <b>${big(dfact(m))}</b></p>` + K.solve([[`m!! = m × (m−2) × (m−4) × … (${m % 2 ? '홀수만' : '짝수만'} 곱함)`, `${m}!! = ${K.sumTerms(fs.map(String), ' × ', 12) || '1'} = ${big(dfact(m))}${m % 2 === 0 && m > 0 ? `\n= 2<sup>${m / 2}</sup> × ${m / 2}!  (짝수일 때)` : ''}`]]);
        }
      },
      {
        id: 'gbinom', name: '일반화 이항계수  ₓCₖ (x 실수)',
        help: [['1/2, 3', '(1/2)(−1/2)(−3/2)/3!'], ['-2, 4', ''], ['7, 3', '']],
        run(s) {
          const [x, k] = E.nums(s); toInt(k, 'k'); let v = 1; for (let i = 0; i < k; i++) v *= (x - i) / (i + 1);
          const num = [...Array(k).keys()].map(i => `(${N.fmt(x - i)})`);
          return `<p><sub>${N.fmt(x)}</sub>C<sub>${k}</sub> = x(x−1)…(x−k+1)/k! = <b>${N.fmt2(v)}</b></p>` + K.solve([
            ['x(x−1)…(x−k+1) / k! 에 대입', `${K.sumTerms(num, '', 10) || '1'} / ${k}! = ${N.fmt(num.length ? [...Array(k).keys()].reduce((p, i) => p * (x - i), 1) : 1)} / ${fact(k)} = ${N.fmt2(v)}`]
          ]);
        }
      },
      {
        id: 'binexp', name: '이항·삼항 전개  (ax + by)ⁿ, (ax + by + cz)ⁿ',
        note: '입력: 계수들, 지수 n  (계수 2개면 이항, 3개면 삼항)',
        help: [['2, 3, 5', '(2x + 3y)⁵'], ['1, -1, 7', '(x − y)⁷'], ['1, 2, 3, 3', '(x + 2y + 3z)³']],
        run(s) {
          const a = E.nums(s).map(v => toInt(v)); const n = a.pop();
          if (a.length < 2 || a.length > 3) throw new Error('계수 2개 또는 3개와 지수 n 을 입력하세요.');
          if (n < 0 || n > 40) throw new Error('n 은 0 ~ 40');
          const names = ['x', 'y', 'z'].slice(0, a.length);
          const base = N.linStr(a, names);
          const tri = a.length === 3, few = [];
          if (!tri) for (let r = 0; r <= Math.min(n, 3); r++) few.push(`r = ${r}: <sub>${n}</sub>C<sub>${r}</sub>·(${a[0]}x)<sup>${n - r}</sup>(${a[1]}y)<sup>${r}</sup> = ${comb(n, r)} × ${B(a[0]) ** B(n - r)} × ${B(a[1]) ** B(r)} = ${comb(n, r) * B(a[0]) ** B(n - r) * B(a[1]) ** B(r)}`);
          return `<p>(${base})<sup>${n}</sup> =</p><div class="steps" style="white-space:normal">${expand(a.map(B), names, n)}</div>` + K.solve([
            [tri ? '다항정리: 일반항 = n!/(p! q! r!) · (ax)<sup>p</sup>(by)<sup>q</sup>(cz)<sup>r</sup>  (p + q + r = n)' : '이항정리: 일반항 = <sub>n</sub>C<sub>r</sub> (ax)<sup>n−r</sup>(by)<sup>r</sup>', tri ? `예) p = ${n}, q = 0, r = 0: ${n}!/(${n}!·0!·0!) × ${a[0]}<sup>${n}</sup> = ${B(a[0]) ** B(n)}` : (n > 3 ? [...few, '…'] : few)],
            ['계수의 합 (x = y = z = 1 대입)', `(${a.join(' + ').replace(/\+ -/g, '− ')})<sup>${n}</sup> = ${a.reduce((p, q) => p + q, 0)}<sup>${n}</sup> = ${B(a.reduce((p, q) => p + q, 0)) ** B(n)}`]
          ]);
        }
      }
    ]
  });

  /* ---------------- 삼각쌍곡 ---------------- */
  /** 분수·근호 꼴은 괄호로 감싸서 표시 */
  const par = (v) => { const t = N.exactShort(v); return /[\/√π]/.test(t) ? `(${t})` : t; };
  const angleIn = (s) => {
    const t = s.trim(); const m = t.match(/^(.*?)\s*(°|deg|도)$/);
    return m ? E.num(m[1]) * Math.PI / 180 : E.num(t);
  };
  register('functions', 'trig', {
    ops: [
      {
        id: 'trig', name: '삼각함수 값',
        note: 'x 는 라디안입니다. 도(°)로 넣으려면 30° 처럼 쓰세요. π 는 pi.',
        help: [['pi/6', ''], ['30°', ''], ['2', ''], ['3pi/4', '']],
        run(s) {
          const x = angleIn(s);
          const rows = [['x', `${N.exact(x)} rad = ${N.dec(x * 180 / Math.PI, 10)}°`],
            ['sin x', N.exact(Math.sin(x))], ['cos x', N.exact(Math.cos(x))],
            ['tan x', Math.abs(Math.cos(x)) < 1e-12 ? '정의 안 됨' : N.exact(Math.tan(x))],
            ['csc x', Math.abs(Math.sin(x)) < 1e-12 ? '정의 안 됨' : N.exact(1 / Math.sin(x))],
            ['sec x', Math.abs(Math.cos(x)) < 1e-12 ? '정의 안 됨' : N.exact(1 / Math.cos(x))],
            ['cot x', Math.abs(Math.sin(x)) < 1e-12 ? '정의 안 됨' : N.exact(Math.cos(x) / Math.sin(x))]];
          const deg = x * 180 / Math.PI, ref = ((deg % 360) + 360) % 360, q = Math.floor(ref / 90) + 1, base = [ref, 180 - ref, ref - 180, 360 - ref][q - 1];
          return N.table(rows) + `<h4>미분</h4><p>(sin x)′ = cos x = ${N.dec(Math.cos(x))},  (cos x)′ = −sin x = ${N.dec(-Math.sin(x))},  (tan x)′ = sec²x = ${N.dec(1 / Math.cos(x) ** 2)}</p>` + K.solve([
            ['라디안 ↔ 도:  1 rad = 180°/π', `${N.exact(x)} × 180/π = ${N.dec(deg, 10)}°`],
            ['일반각을 0° ~ 360° 로 옮기고 사분면 확인', `${N.dec(deg, 8)}° → ${N.dec(ref, 8)}°  (제${Math.min(q, 4)}사분면${ref % 90 === 0 ? ', 축 위' : ''}),  기준각 ${N.dec(base, 8)}°\n부호: sin ${Math.sin(x) >= -1e-12 ? '+' : '−'},  cos ${Math.cos(x) >= -1e-12 ? '+' : '−'},  tan ${Math.tan(x) >= -1e-12 ? '+' : '−'}  (올 사 탄 코)`],
            ['tan = sin/cos,  csc = 1/sin,  sec = 1/cos,  cot = cos/sin', [`tan x = ${par(Math.sin(x))} / ${par(Math.cos(x))} = ${rows[3][1]}`, `csc x = 1 / ${par(Math.sin(x))} = ${rows[4][1]},   sec x = 1 / ${par(Math.cos(x))} = ${rows[5][1]}`]],
            ['확인  sin²x + cos²x = 1', `${N.dec(Math.sin(x) ** 2, 10)} + ${N.dec(Math.cos(x) ** 2, 10)} = ${N.dec(Math.sin(x) ** 2 + Math.cos(x) ** 2, 10)}`]
          ]);
        }
      },
      {
        id: 'hyp', name: '쌍곡함수 값',
        help: [['1', ''], ['ln(10)', ''], ['-0.5', '']],
        run(s) {
          const x = E.num(s);
          return N.table([['sinh x = (eˣ − e⁻ˣ)/2', N.dec(Math.sinh(x), 12)], ['cosh x = (eˣ + e⁻ˣ)/2', N.dec(Math.cosh(x), 12)], ['tanh x', N.dec(Math.tanh(x), 12)],
            ['csch x', x === 0 ? '정의 안 됨' : N.dec(1 / Math.sinh(x), 12)], ['sech x', N.dec(1 / Math.cosh(x), 12)], ['coth x', x === 0 ? '정의 안 됨' : N.dec(1 / Math.tanh(x), 12)],
            ['cosh²x − sinh²x', N.dec(Math.cosh(x) ** 2 - Math.sinh(x) ** 2, 10)]]) +
            `<h4>미분</h4><p>(sinh x)′ = cosh x,  (cosh x)′ = sinh x,  (tanh x)′ = sech²x = ${N.dec(1 / Math.cosh(x) ** 2)}</p>` + K.solve([
              ['eˣ 와 e⁻ˣ 구하기', `e<sup>${N.dec(x, 8)}</sup> = ${N.dec(Math.exp(x), 12)},   e<sup>${N.dec(-x, 8)}</sup> = ${N.dec(Math.exp(-x), 12)}`],
              ['정의에 대입', [`sinh x = (${N.dec(Math.exp(x), 10)} − ${N.dec(Math.exp(-x), 10)}) / 2 = ${N.dec(Math.sinh(x), 12)}`, `cosh x = (${N.dec(Math.exp(x), 10)} + ${N.dec(Math.exp(-x), 10)}) / 2 = ${N.dec(Math.cosh(x), 12)}`, `tanh x = sinh x / cosh x = ${N.dec(Math.sinh(x), 10)} / ${N.dec(Math.cosh(x), 10)} = ${N.dec(Math.tanh(x), 12)}`]]
            ]);
        }
      },
      {
        id: 'inv', name: '역함수 값',
        help: [['0.5', ''], ['sqrt(3)/2', ''], ['2', '']],
        run(s) {
          const x = E.num(s), f = (v) => (Number.isNaN(v) ? '정의 안 됨' : `${N.exact(v)} = ${N.dec(v * 180 / Math.PI, 8)}°`), h = (v) => (Number.isNaN(v) ? '정의 안 됨' : N.dec(v, 12));
          return N.table([['sin⁻¹ x', f(Math.asin(x))], ['cos⁻¹ x', f(Math.acos(x))], ['tan⁻¹ x', f(Math.atan(x))],
            ['sinh⁻¹ x = ln(x + √(x²+1))', h(Math.asinh(x))], ['cosh⁻¹ x = ln(x + √(x²−1))', h(Math.acosh(x))], ['tanh⁻¹ x = ½ln((1+x)/(1−x))', h(Math.atanh(x))]]) + K.solve([
            ['정의역 확인', `sin⁻¹, cos⁻¹: −1 ≤ x ≤ 1 ${Math.abs(x) <= 1 ? '✓' : '✗ (정의 안 됨)'},   cosh⁻¹: x ≥ 1 ${x >= 1 ? '✓' : '✗'},   tanh⁻¹: −1 < x < 1 ${Math.abs(x) < 1 ? '✓' : '✗'}`],
            ['치역(주값): sin⁻¹ ∈ [−π/2, π/2],  cos⁻¹ ∈ [0, π],  tan⁻¹ ∈ (−π/2, π/2)', Math.abs(x) <= 1 ? `sin(${N.exactShort(Math.asin(x))}) = ${N.fmt(x)},  cos(${N.exactShort(Math.acos(x))}) = ${N.fmt(x)},  tan(${N.exactShort(Math.atan(x))}) = ${N.fmt(x)}` : `tan(${N.exactShort(Math.atan(x))}) = ${N.fmt(x)}`],
            ['로그 공식에 대입', [`sinh⁻¹ x = ln(${N.dec(x, 8)} + √(${N.dec(x * x, 8)} + 1)) = ln(${N.dec(x + Math.sqrt(x * x + 1), 10)}) = ${N.dec(Math.asinh(x), 12)}`,
              ...(x >= 1 ? [`cosh⁻¹ x = ln(${N.dec(x, 8)} + √(${N.dec(x * x, 8)} − 1)) = ln(${N.dec(x + Math.sqrt(x * x - 1), 10)}) = ${N.dec(Math.acosh(x), 12)}`] : []),
              ...(Math.abs(x) < 1 ? [`tanh⁻¹ x = ½ ln(${N.dec(1 + x, 8)} / ${N.dec(1 - x, 8)}) = ½ × ${N.dec(Math.log((1 + x) / (1 - x)), 10)} = ${N.dec(Math.atanh(x), 12)}`] : [])]]
          ]);
        }
      },
      {
        id: 'sum', name: '덧셈정리 확인  (α, β)',
        help: [['pi/4, pi/6', 'sin(α ± β), cos(α ± β), tan(α ± β)'], ['45°, 30°', '']],
        run(s) {
          const [a, b] = E.splitTop(s, ',').map(angleIn);
          const sa = Math.sin(a), ca = Math.cos(a), sb = Math.sin(b), cb = Math.cos(b);
          return N.table([
            ['sin(α+β) = sinα cosβ + cosα sinβ', N.exact(sa * cb + ca * sb)], ['sin(α−β) = sinα cosβ − cosα sinβ', N.exact(sa * cb - ca * sb)],
            ['cos(α+β) = cosα cosβ − sinα sinβ', N.exact(ca * cb - sa * sb)], ['cos(α−β) = cosα cosβ + sinα sinβ', N.exact(ca * cb + sa * sb)],
            ['tan(α+β) = (tanα + tanβ)/(1 − tanα tanβ)', N.exact(Math.tan(a + b))], ['sin 2α = 2 sinα cosα', N.exact(2 * sa * ca)], ['cos 2α = cos²α − sin²α', N.exact(ca * ca - sa * sa)]]) + K.solve([
            ['각각의 값', `sinα = ${N.exactShort(sa)},  cosα = ${N.exactShort(ca)},  sinβ = ${N.exactShort(sb)},  cosβ = ${N.exactShort(cb)}`],
            ['덧셈정리에 대입', [
              `sin(α+β) = ${par(sa)}×${par(cb)} + ${par(ca)}×${par(sb)} = ${N.exactShort(sa * cb)} + ${N.exactShort(ca * sb)} = ${N.exactShort(sa * cb + ca * sb)}`,
              `sin(α−β) = ${N.exactShort(sa * cb)} − ${N.exactShort(ca * sb)} = ${N.exactShort(sa * cb - ca * sb)}`,
              `cos(α+β) = ${par(ca)}×${par(cb)} − ${par(sa)}×${par(sb)} = ${N.exactShort(ca * cb)} − ${N.exactShort(sa * sb)} = ${N.exactShort(ca * cb - sa * sb)}`,
              `cos(α−β) = ${N.exactShort(ca * cb)} + ${N.exactShort(sa * sb)} = ${N.exactShort(ca * cb + sa * sb)}`,
              `tan(α+β) = (${par(Math.tan(a))} + ${par(Math.tan(b))}) / (1 − ${par(Math.tan(a))}×${par(Math.tan(b))}) = ${N.exactShort(Math.tan(a + b))}`]]
          ]);
        }
      }
    ]
  });

  /* ---------------- 이산함수 ---------------- */
  const disc = (id, name, help, f, note) => ({ id, name, help, note, run: (s) => f(s) });
  const prodStr = (from, cnt) => K.sumTerms([...Array(Math.max(0, cnt)).keys()].map(i => String(from - i)), ' × ', 10) || '1';
  /** 점화식 표: 행 0..n, 열 0..r  (f(i, j) 값) */
  const triRows = (n, r, f, max = 10) => [...Array(Math.min(n, max) + 1).keys()].map(i => `n=${i}: ${[...Array(Math.min(i, r) + 1).keys()].map(j => big(f(i, j))).join('  ')}`).concat(n > max ? ['…'] : []);
  /** n 을 정확히 k 개로 분할한 목록 (작은 n 용) */
  function partsList(n, k) {
    const out = [];
    const rec = (left, cnt, max, acc) => { if (out.length >= 30) return; if (cnt === 0) { if (left === 0) out.push(acc.join('+')); return; } for (let v = Math.min(max, left - (cnt - 1)); v >= 1; v--) rec(left - v, cnt - 1, v, [...acc, v]); };
    rec(n, k, n, []);
    return out.length ? out.join(',  ') + (out.length >= 30 ? ' …' : '') : '없음';
  }
  register('functions', 'discrete', {
    ops: [
      disc('P', '순열  nPr', [['10, 3', ''], ['52, 5', '']], s => { const [n, r] = two(s); return `<p><sub>${n}</sub>P<sub>${r}</sub> = ${n}!/(${n}−${r})! = <b>${big(perm(n, r))}</b></p>` + K.solve([['서로 다른 n 개에서 r 개를 골라 줄 세우기: n 부터 1 씩 줄이며 r 개 곱함', `<sub>${n}</sub>P<sub>${r}</sub> = ${prodStr(n, r)} = ${big(perm(n, r))}`]]); }),
      disc('C', '조합  nCr', [['10, 3', ''], ['100, 50', ''], ['-5, 3', 'n 이 음수인 일반화']], s => { const [n, r] = two(s); const rr = n >= 0 && r > n - r ? n - r : r; return `<p><sub>${n}</sub>C<sub>${r}</sub> = <b>${big(comb(n, r))}</b></p>` + K.solve([
        ...(rr !== r ? [['<sub>n</sub>C<sub>r</sub> = <sub>n</sub>C<sub>n−r</sub> 로 계산을 줄임', `<sub>${n}</sub>C<sub>${r}</sub> = <sub>${n}</sub>C<sub>${rr}</sub>`]] : []),
        ['<sub>n</sub>C<sub>r</sub> = <sub>n</sub>P<sub>r</sub> / r!  (뽑은 r 개의 순서를 지움)', `(${prodStr(n, rr)}) / (${prodStr(rr, rr)}) = ${big(perm(n, rr) || [...Array(rr).keys()].reduce((p, i) => p * (B(n) - B(i)), 1n))} / ${big(fact(rr))} = ${big(comb(n, r))}`]]); }),
      disc('Pi', '중복순열  nΠr = nʳ', [['3, 5', '']], s => { const [n, r] = two(s); return `<p><sub>${n}</sub>Π<sub>${r}</sub> = ${n}<sup>${r}</sup> = <b>${big(B(n) ** B(r))}</b></p>` + K.solve([['r 자리 각각에 n 가지씩 (곱의 법칙)', `${K.sumTerms(Array(r).fill(String(n)), ' × ', 10)} = ${n}<sup>${r}</sup> = ${big(B(n) ** B(r))}`]]); }),
      disc('H', '중복조합  nHr = ₙ₊ᵣ₋₁Cᵣ', [['3, 5', '']], s => { const [n, r] = two(s); return `<p><sub>${n}</sub>H<sub>${r}</sub> = <sub>${n + r - 1}</sub>C<sub>${r}</sub> = <b>${big(comb(n + r - 1, r))}</b></p>` + K.solve([
        ['칸막이 방법: r 개의 ○ 와 (n−1) 개의 | 를 줄 세우는 방법', `○ ${r}개 + | ${n - 1}개 = ${n + r - 1}자리 중 ○ 자리 ${r}개 고르기 → <sub>${n + r - 1}</sub>C<sub>${r}</sub>`],
        ['조합 계산', `(${prodStr(n + r - 1, r)}) / ${r}! = ${big(perm(n + r - 1, r))} / ${big(fact(r))} = ${big(comb(n + r - 1, r))}`]]); }),
      disc('T', '전사함수 개수  T(n, r)', [['5, 3', '원소 5개 → 3개 위로']], s => { const [n, r] = two(s); const ks = [...Array(r + 1).keys()]; return `<p>T(${n}, ${r}) = ${r}!·S(${n}, ${r}) = <b>${big(surj(n, r))}</b></p>` + K.solve([
        ['포함배제: 공역 중 k 개를 빼놓는 함수를 빼고 더함', `T = Σ (−1)<sup>k</sup> <sub>${r}</sub>C<sub>k</sub> (${r} − k)<sup>${n}</sup>`],
        ['대입', `${K.sumTerms(ks.map(k => `${k % 2 ? '−' : '+'} ${comb(r, k)}×${r - k}<sup>${n}</sup>`), ' ', 8).replace(/^\+ /, '')}\n= ${K.sumTerms(ks.map(k => `${k % 2 ? '−' : '+'} ${big(comb(r, k) * B(r - k) ** B(n))}`), ' ', 8).replace(/^\+ /, '')} = ${big(surj(n, r))}`],
        ['또는 r!·S(n, r)', `${r}! × S(${n}, ${r}) = ${fact(r)} × ${big(stirling2(n, r))} = ${big(surj(n, r))}`]]); }),
      disc('s1', '제1종 스털링 수  s(n, r)', [['7, 3', '']], s => { const [n, r] = two(s); const c = stirling1(n, r); return `<p>부호 없는 c(${n}, ${r}) = <b>${big(c)}</b>,  부호 있는 s(${n}, ${r}) = ${(n - r) % 2 ? '-' : ''}${big(c)}</p><p class="muted">n 개를 r 개의 원순열로 나누는 방법의 수</p>` + K.solve([
        ['점화식  c(n, k) = c(n−1, k−1) + (n−1)·c(n−1, k)   (n 번째 원소가 혼자 원을 이루거나, 앞 n−1 개 중 하나의 뒤에 끼어듦)', triRows(n, r, stirling1)],
        ['마지막 단계', n >= 1 ? `c(${n}, ${r}) = c(${n - 1}, ${r - 1}) + ${n - 1}×c(${n - 1}, ${r}) = ${big(stirling1(n - 1, r - 1))} + ${n - 1}×${big(stirling1(n - 1, r))} = ${big(c)}` : 'c(0, 0) = 1']]); }),
      disc('S2', '제2종 스털링 수  S(n, r)', [['7, 3', ''], ['10, 4', '']], s => { const [n, r] = two(s); return `<p>S(${n}, ${r}) = <b>${big(stirling2(n, r))}</b></p><p class="muted">n 개를 빈 곳 없이 r 개의 묶음으로 나누는 방법의 수</p>` + K.solve([
        ['점화식  S(n, k) = S(n−1, k−1) + k·S(n−1, k)   (n 번째 원소가 혼자 묶음이 되거나, 기존 k 묶음 중 하나에 들어감)', triRows(n, r, stirling2)],
        ['마지막 단계', n >= 1 ? `S(${n}, ${r}) = S(${n - 1}, ${r - 1}) + ${r}×S(${n - 1}, ${r}) = ${big(stirling2(n - 1, r - 1))} + ${r}×${big(stirling2(n - 1, r))} = ${big(stirling2(n, r))}` : 'S(0, 0) = 1']]) + N.table([...Array(Math.min(n, 12) + 1).keys()].slice(1).map(k => [`S(${n}, ${k})`, big(stirling2(n, k))])); }),
      disc('p', '자연수 분할  p(n, r)', [['10, 3', '10 을 정확히 3 개로'], ['50, 5', '']], s => { const [n, r] = two(s); return `<p>p(${n}, ${r}) = <b>${partK(n, r)}</b></p>` + K.solve([
        ['점화식  p(n, k) = p(n−1, k−1) + p(n−k, k)   (가장 작은 부분이 1 인 경우 + 모든 부분이 2 이상인 경우(각각 1 씩 뺌))', n >= r && r >= 1 ? `p(${n}, ${r}) = p(${n - 1}, ${r - 1}) + p(${n - r}, ${r}) = ${partK(n - 1, r - 1)} + ${partK(n - r, r)} = ${partK(n, r)}` : `n < k 이면 p(n, k) = 0`],
        ...(n <= 12 ? [['직접 나열', partsList(n, r)]] : [])]); }),
      disc('Pr', '분할의 합  Σₖ₌₁ʳ p(n, k)', [['10, 3', '3 개 이하로 분할'], ['100, 100', 'p(100)']], s => { const [n, r] = two(s); let t = 0n; for (let k = 1; k <= r; k++) t += partK(n, k); return `<p>Σ<sub>k=1</sub><sup>${r}</sup> p(${n}, k) = <b>${t}</b></p>` + K.solve([['k = 1 부터 r 까지 p(n, k) 를 더함', `${K.sumTerms([...Array(r).keys()].map(k => String(partK(n, k + 1))), ' + ', 12)} = ${t}`]]); }),
      disc('cat', '카탈란 수  C(n)', [['10', ''], ['30', '']], s => { const n = toInt(E.num(s)); return `<p>C(${n}) = <sub>${2 * n}</sub>C<sub>${n}</sub>/(${n}+1) = <b>${big(catalan(n))}</b></p><p class="muted">${[...Array(Math.min(n + 1, 16)).keys()].map(k => catalan(k)).join(', ')}${n >= 16 ? ', …' : ''}</p>` + K.solve([['C(n) = <sub>2n</sub>C<sub>n</sub> / (n + 1)', `<sub>${2 * n}</sub>C<sub>${n}</sub> = ${big(comb(2 * n, n))}\nC(${n}) = ${big(comb(2 * n, n))} / ${n + 1} = ${big(catalan(n))}`], ['같은 뜻의 점화식  C(n+1) = Σ C(i)·C(n−i)', n >= 1 ? `C(${n}) = ${K.sumTerms([...Array(n).keys()].map(i => `${catalan(i)}×${catalan(n - 1 - i)}`), ' + ', 8)} = ${big(catalan(n))}` : 'C(0) = 1']]); }),
      disc('catE', '확장 카탈란 수  C(n, r) = (n+r−1)!/(n! r!)  (gcd(n, r) = 1)', [['3, 5', ''], ['2, 7', '']], s => { const [n, r] = two(s); if (K.nt.gcd(B(n), B(r)) !== 1n) throw new Error('gcd(n, r) = 1 이어야 합니다.'); return `<p>C(${n}, ${r}) = <sub>${n + r}</sub>C<sub>${n}</sub>/(${n + r}) = <b>${comb(n + r, n) / B(n + r)}</b></p>` + K.solve([['gcd(n, r) = 1 이므로 <sub>n+r</sub>C<sub>n</sub> / (n + r)', `<sub>${n + r}</sub>C<sub>${n}</sub> = ${comb(n + r, n)},   ${comb(n + r, n)} / ${n + r} = ${comb(n + r, n) / B(n + r)}`]]); }),
      disc('bell', '벨 수  B(n)', [['10', ''], ['10, 4', '4 개 이하 묶음 Σ S(n, k)']], s => { const a = E.nums(s).map(v => toInt(v)); const n = a[0], r = a[1] ?? n; let t = 0n; for (let k = 0; k <= r; k++) t += stirling2(n, k); return `<p>${r === n ? `B(${n})` : `Σ<sub>k≤${r}</sub> S(${n}, k)`} = <b>${big(t)}</b></p>` + K.solve([['벨 수 = 묶음 개수별 제2종 스털링 수의 합  Σ S(n, k)', `${K.sumTerms([...Array(r + 1).keys()].map(k => big(stirling2(n, k))), ' + ', 12)} = ${big(t)}`]]); }),
      disc('D', '교란 수  D(n)', [['5', ''], ['20', '']], s => { const n = toInt(E.num(s)); const d = derange(n); return `<p>D(${n}) = ${n}!·Σ(−1)<sup>k</sup>/k! = <b>${big(d)}</b></p><p>D(n)/n! ≈ ${n <= 170 ? N.dec(Number(d) / Number(fact(n)), 12) : '1/e'}  (1/e ≈ 0.367879441171)</p>` + K.solve([
        ['점화식  D(n) = (n − 1)(D(n−1) + D(n−2)),  D(1) = 0, D(2) = 1', [...Array(Math.min(n, 12) + 1).keys()].slice(3).map(k => `D(${k}) = ${k - 1}×(${derange(k - 1)} + ${derange(k - 2)}) = ${derange(k)}`).concat(n > 12 ? ['…'] : [])],
        ['포함배제 공식  D(n) = n! Σ (−1)<sup>k</sup>/k!', n <= 10 ? `${n}! × (${[...Array(n + 1).keys()].map(k => `${k % 2 ? '−' : '+'} 1/${k}!`).join(' ').replace(/^\+ /, '')}) = ${d}` : 'n 이 크면 D(n) ≈ n!/e 에 가장 가까운 정수']]); }),
      disc('multi', '다항계수  n!/(r₁!·r₂!·…·rₖ!)', [['10, 3, 3, 4', 'MultiP(10; 3, 3, 4)']], s => { const [n, ...rs] = E.nums(s).map(v => toInt(v)); if (rs.reduce((a, b) => a + b, 0) !== n) throw new Error(`r 들의 합이 n (${n}) 이어야 합니다.`); let c = fact(n); rs.forEach(r => (c /= fact(r))); return `<p>(${n}; ${rs.join(', ')}) = ${n}!/(${rs.map(r => r + '!').join('·')}) = <b>${big(c)}</b></p>` + K.solve([
        ['같은 것이 있는 순열: 전체 n! 을 같은 것끼리의 순서 r! 로 나눔', `${n}! / (${rs.map(r => r + '!').join(' × ')}) = ${big(fact(n))} / (${rs.map(r => String(fact(r))).join(' × ')}) = ${big(fact(n))} / ${big(rs.reduce((p, r) => p * fact(r), 1n))} = ${big(c)}`],
        ['조합으로 보면', `${rs.map((r, i) => `<sub>${n - rs.slice(0, i).reduce((a, b) => a + b, 0)}</sub>C<sub>${r}</sub>`).join(' × ')} = ${rs.map((r, i) => big(comb(n - rs.slice(0, i).reduce((a, b) => a + b, 0), r))).join(' × ')} = ${big(c)}`]]); }),
      {
        id: 'rook', name: '루크 다항식  r(B, x)  (체스판에서 칸 고르기)',
        note: '입력: 행 수, 열 수 (7 이하). 아래 판에서 칸을 눌러 판 B 에 넣거나 뺄 수 있습니다.',
        help: [['4, 4', '4×4 전체'], ['3, 5', '']],
        run(s) {
          const [m, n] = two(s); if (m < 1 || n < 1 || m > 8 || n > 8) throw new Error('행·열은 1 ~ 8');
          const on = Array.from({ length: m }, () => new Array(n).fill(true));
          const calc = () => { // r_k: 서로 공격하지 않게 k 개 놓는 방법 수 (행별 DP, 열 비트마스크)
            let dp = new Map([[0, [1n]]]);
            for (let i = 0; i < m; i++) {
              const nd = new Map();
              const put = (mask, arr) => { const cur = nd.get(mask) || []; arr.forEach((v, k) => (cur[k] = (cur[k] || 0n) + v)); nd.set(mask, cur); };
              for (const [mask, arr] of dp) {
                put(mask, arr);
                for (let j = 0; j < n; j++) if (on[i][j] && !(mask >> j & 1)) put(mask | (1 << j), [0n, ...arr]);
              }
              dp = nd;
            }
            const r = []; for (const arr of dp.values()) arr.forEach((v, k) => (r[k] = (r[k] || 0n) + (v || 0n)));
            return r.map(v => v || 0n);
          };
          const render = (el) => {
            const r = calc();
            const poly = r.map((v, k) => (v === 0n ? '' : `${k === 0 ? v : (v === 1n ? '' : v)}${k === 0 ? '' : k === 1 ? 'x' : `x<sup>${k}</sup>`}`)).filter(Boolean).join(' + ');
            el.querySelector('.rook-res').innerHTML = `<p>r(B, x) = <b>${poly}</b></p>` + N.table(r.map((v, k) => [`r<sub>${k}</sub> (루크 ${k}개)`, v.toString()]));
          };
          return {
            html: `<div class="rook" style="display:grid;grid-template-columns:repeat(${n}, 38px);gap:3px;margin-bottom:10px">${on.map((row, i) => row.map((_, j) => `<button type="button" data-i="${i}" data-j="${j}" style="width:38px;height:38px;border:1px solid var(--line);border-radius:4px;cursor:pointer;background:${(i + j) % 2 ? 'var(--accent)' : 'var(--accent-soft)'}" aria-label="${i + 1}행 ${j + 1}열"></button>`).join('')).join('')}</div><p class="muted">색칠된 칸이 판 B 입니다. 눌러서 빼거나 넣으세요.</p><div class="rook-res"></div>`,
            mount(el) {
              el.querySelectorAll('.rook button').forEach(b => b.addEventListener('click', () => {
                const i = +b.dataset.i, j = +b.dataset.j; on[i][j] = !on[i][j];
                b.style.background = on[i][j] ? ((i + j) % 2 ? 'var(--accent)' : 'var(--accent-soft)') : 'var(--surface)'; render(el);
              }));
              render(el);
            }
          };
        }
      }
    ]
  });

  /* ---------------- 특수함수 ---------------- */
  const miniPlot = (f, a, b, label) => ({
    mount(el) {
      const box = document.createElement('div'); el.appendChild(box);
      const pts = []; for (let i = 0; i <= 200; i++) { const x = a + (b - a) * i / 200; pts.push([x, f(x)]); }
      K.plot.create(box, { view: K.plot.autoView([pts]) }).add({ type: 'fx', f, label });
    }
  });
  register('functions', 'special', {
    ops: [
      {
        id: 'gamma', name: '감마함수  Γ(a), 불완전 감마 P(a, x)',
        note: 'Γ(n+1) = n!,  Γ(1/2) = √π,  P(a, x) = γ(a, x)/Γ(a),  γ(a, x) = ∫₀ˣ t^(a−1) e^(−t) dt',
        help: [['5', 'Γ(5) = 4!'], ['0.5', 'Γ(1/2) = √π'], ['2.5, 3', 'Γ(2.5), P(2.5, 3)'], ['171.5', '아주 큰 값은 log Γ']],
        run(s) {
          const [a, x] = E.nums(s); const g = E.gamma(a), lg = E.lgamma(a);
          let h = `<p>Γ(${N.fmt(a)}) = <b>${isFinite(g) ? N.exact(g) : '너무 큼'}</b></p><p>ln Γ(${N.fmt(a)}) = ${N.dec(lg, 12)}</p>`;
          if (x !== undefined) h += `<p>P(${N.fmt(a)}, ${N.fmt(x)}) = <b>${N.dec(S.gammaP(a, x), 12)}</b>,  Q = 1 − P = ${N.dec(S.gammaQ(a, x), 12)}</p><p>γ(${N.fmt(a)}, ${N.fmt(x)}) = ${N.dec(S.gammaP(a, x) * g, 12)}</p>`;
          const half = Math.abs(a * 2 - Math.round(a * 2)) < 1e-12 && Math.round(a * 2) % 2 === 1 && a > 0;
          const parts = [];
          if (Number.isInteger(a) && a >= 1 && a <= 30) parts.push(['자연수 n 에서  Γ(n) = (n − 1)!', `Γ(${a}) = ${a - 1}! = ${prodStr(a - 1, a - 1)} = ${fact(a - 1)}`]);
          else if (half && a < 30) { const k = a - 0.5, fs = [...Array(k).keys()].map(i => `${N.fmt(k - 0.5 - i)}`); parts.push(['Γ(x + 1) = x·Γ(x) 를 되풀이해 Γ(1/2) = √π 까지 내려감', `Γ(${N.fmt(a)}) = ${fs.length ? fs.join(' × ') + ' × ' : ''}Γ(1/2) = (${N.fmt(g / Math.sqrt(Math.PI))})√π = ${N.dec(g, 12)}`]); }
          else if (a > 0 && isFinite(g)) parts.push(['Γ(x + 1) = x·Γ(x) 로 0 < x ≤ 1 구간 값과 연결', `Γ(${N.fmt(a)}) = ${N.dec(g, 12)},  ln Γ 은 스털링 근사(란초스 근사)로 계산`]);
          if (x !== undefined) parts.push(['불완전 감마 P(a, x) = γ(a, x) / Γ(a)  (급수 또는 연분수로 계산)', `γ(${N.fmt(a)}, ${N.fmt(x)}) / Γ(${N.fmt(a)}) = ${N.dec(S.gammaP(a, x) * g, 10)} / ${N.dec(g, 10)} = ${N.dec(S.gammaP(a, x), 12)}`]);
          if (parts.length) h += K.solve(parts);
          return { html: h, ...miniPlot(t => E.gamma(t), -4.5, 5, 'y = Γ(x)') };
        }
      },
      {
        id: 'beta', name: '베타함수  B(a, b), 불완전 베타 I(x; a, b)',
        note: 'B(a, b) = Γ(a)Γ(b)/Γ(a+b),  I(x; a, b) = B(x; a, b)/B(a, b)  (0 ≤ x ≤ 1)',
        help: [['2, 3', 'B(2, 3) = 1/12'], ['0.5, 0.5', 'B(½, ½) = π'], ['2, 3, 0.4', 'I(0.4; 2, 3)']],
        run(s) {
          const [a, b, x] = E.nums(s); const v = S.beta(a, b);
          let h = `<p>B(${N.fmt(a)}, ${N.fmt(b)}) = <b>${N.exact(v)}</b></p><p>ln B = ${N.dec(S.lbeta(a, b), 12)}</p>`;
          if (x !== undefined) { const I = S.betaI(x, a, b); h += `<p>I(${N.fmt(x)}; ${N.fmt(a)}, ${N.fmt(b)}) = <b>${N.dec(I, 12)}</b>,  B(x; a, b) = ${N.dec(I * v, 12)}</p>`; }
          return h + K.solve([
            ['B(a, b) = Γ(a)Γ(b) / Γ(a + b)', `Γ(${N.fmt(a)}) × Γ(${N.fmt(b)}) / Γ(${N.fmt(a + b)}) = ${N.exactShort(E.gamma(a))} × ${N.exactShort(E.gamma(b))} / ${N.exactShort(E.gamma(a + b))} = ${N.exactShort(v)}`],
            ...(x !== undefined ? [['I(x; a, b) = B(x; a, b) / B(a, b)', `${N.dec(S.betaI(x, a, b) * v, 10)} / ${N.dec(v, 10)} = ${N.dec(S.betaI(x, a, b), 12)}`]] : [])
          ]);
        }
      },
      {
        id: 'erf', name: '오차함수  erf(x)',
        note: 'erf(x) = (2/√π) ∫₀ˣ e^(−t²) dt',
        help: [['1', ''], ['0.5', ''], ['2', '']],
        run(s) {
          const x = E.num(s);
          const terms = [], sums = []; let sum = 0, fk = 1;
          for (let n = 0; n < 8; n++) { if (n) fk *= n; const t = (n % 2 ? -1 : 1) * x ** (2 * n + 1) / (fk * (2 * n + 1)); sum += t; terms.push(`${n % 2 ? '−' : '+'} ${N.dec(Math.abs(t), 8)}`); sums.push(N.dec(2 / Math.sqrt(Math.PI) * sum, 10)); }
          const solve = K.solve([
            ['e<sup>−t²</sup> 의 테일러 급수를 항별 적분  erf(x) = (2/√π) Σ (−1)ⁿ x<sup>2n+1</sup> / (n!(2n+1))', `(2/√π) × (${terms.join(' ').replace(/^\+ /, '')} …)`],
            ['항을 더해 갈 때의 값', sums.map((v, i) => `${i + 1}항까지: ${v}`).join('\n') + `\n→ erf(${N.fmt(x)}) = ${N.dec(S.erf(x), 14)}${Math.abs(x) > 2 ? '  (x 가 크면 급수 대신 연분수·근사식으로 계산)' : ''}`],
            ['정규분포와의 관계  P(|Z| ≤ z) = erf(z/√2)', `P(|Z| ≤ ${N.dec(x * Math.SQRT2, 8)}) = erf(${N.fmt(x)}) = ${N.dec(S.erf(x), 10)}`]
          ]);
          return { html: `<p>erf(${N.fmt(x)}) = <b>${N.dec(S.erf(x), 14)}</b></p><p>erfc(${N.fmt(x)}) = 1 − erf = ${N.dec(S.erfc(x), 14)}</p><p class="muted">표준정규분포와의 관계: P(|Z| ≤ x√2) = erf(x)</p>` + solve, ...miniPlot(S.erf, -3, 3, 'y = erf(x)') };
        }
      },
      {
        id: 'bessel', name: '베셀 함수  Jα(x)',
        note: 'Jα(x) = Σ (−1)ᵐ (x/2)^(2m+α) / (m! Γ(m+α+1)),  α ≥ 0',
        help: [['0, 1', 'J₀(1)'], ['1, 2.5', 'J₁(2.5)'], ['2.5, 3', '']],
        run(s) {
          const [a, x] = E.nums(s); if (a < 0) throw new Error('α ≥ 0 이어야 합니다.');
          const tl = []; let sum = 0;
          for (let m = 0; m < 8; m++) { const t = (m % 2 ? -1 : 1) * (x / 2) ** (2 * m + a) / (E.gamma(m + 1) * E.gamma(m + a + 1)); sum += t; tl.push(`m=${m}: ${t < 0 ? '−' : '+'}${N.dec(Math.abs(t), 8)}  → 합 ${N.dec(sum, 10)}`); }
          return { html: `<p>J<sub>${N.fmt(a)}</sub>(${N.fmt(x)}) = <b>${N.dec(S.besselJ(a, x), 12)}</b></p>` + K.solve([
            ['급수  J<sub>α</sub>(x) = Σ (−1)<sup>m</sup> (x/2)<sup>2m+α</sup> / (m! Γ(m+α+1)) 의 항을 차례로 더함', tl.concat([`→ J<sub>${N.fmt(a)}</sub>(${N.fmt(x)}) = ${N.dec(S.besselJ(a, x), 12)}${Math.abs(x) > 12 ? '  (x 가 크면 점근식으로 계산)' : ''}`])]
          ]), ...miniPlot(t => S.besselJ(a, t), 0, 20, `y = J${N.fmt(a)}(x)`) };
        }
      }
    ]
  });

  K.comb = { fact, perm, comb, stirling1, stirling2, partK, bell, derange, catalan, surj, dfact };
})();
