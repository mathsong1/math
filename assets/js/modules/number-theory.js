/*
 * 정수론 모듈 (원본: CongruenceNcontiFractionUMP_5.java)
 * ─────────────────────────────────────────────
 * 구현 예시로 '인수분해'와 '원시근' 두 기능을 옮겼습니다.
 * 나머지 기능도 같은 방식으로 KPHS.register(...) 하면 됩니다.
 *
 * 원본과 달라진 점
 *  - 거듭제곱 나머지는 a^k 를 통째로 만들지 않고 modPow(반복 제곱)로 계산 → 큰 법에서도 빠름
 *  - φ(n) 은 1..n 전체 gcd 대신 소인수분해 결과로 계산
 *  - gcd 는 뺄셈 재귀 대신 유클리드 호제법(나머지) 사용 → 스택 오버플로 없음
 *  - 모든 계산을 BigInt 로 하여 int 범위 넘침 없음
 */
(function () {
  const { register } = window.KPHS;

  /* ---------- 기본 도구 ---------- */
  const toBig = (s) => {
    const t = String(s).replace(/[\s_]/g, '');
    if (!/^-?\d+$/.test(t)) throw new Error(`'${s}' 는 정수가 아닙니다.`);
    return BigInt(t);
  };
  const abs = (a) => (a < 0n ? -a : a);
  const gcd = (a, b) => { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a === 0n || b === 0n ? 0n : abs(a / gcd(a, b) * b));
  const modPow = (b, e, m) => {
    let r = 1n; b %= m; if (b < 0n) b += m;
    while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; }
    return r;
  };

  /** 밀러-라빈 소수 판정 (2^64 미만은 확정, 그 이상은 확률적) */
  function isPrime(n) {
    if (n < 2n) return false;
    for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) { if (n === p) return true; if (n % p === 0n) return false; }
    let d = n - 1n, r = 0; while (!(d & 1n)) { d >>= 1n; r++; }
    outer: for (const a of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]) {
      let x = modPow(a, d, n); if (x === 1n || x === n - 1n) continue;
      for (let i = 1; i < r; i++) { x = x * x % n; if (x === n - 1n) continue outer; }
      return false;
    }
    return true;
  }
  /** 폴라드 로 : n 의 약수 하나 */
  function rho(n) {
    if (n % 2n === 0n) return 2n;
    for (let c = 1n; ; c++) {
      let x = 2n, y = 2n, d = 1n, q = 1n, ys = 2n, k = 0;
      const f = (v) => (v * v + c) % n;
      // 브렌트 변형
      let rr = 1, m = 128;
      do {
        x = y; for (let i = 0; i < rr; i++) y = f(y);
        k = 0;
        while (k < rr && d === 1n) {
          ys = y; const lim = Math.min(m, rr - k);
          for (let i = 0; i < lim; i++) { y = f(y); q = q * abs(x - y) % n; }
          d = gcd(q, n); k += m;
        }
        rr *= 2;
      } while (d === 1n && rr < 1 << 22);
      if (d === n) { do { ys = f(ys); d = gcd(abs(x - ys), n); } while (d === 1n); }
      if (d !== n && d !== 1n) return d;
    }
  }
  /** 소인수분해: Map(소수 → 지수)  — 작은 소수는 나눗셈, 큰 수는 폴라드 로 */
  function factorize(n) {
    const f = new Map();
    const add = (p, e = 1) => f.set(p, (f.get(p) || 0) + e);
    if (n < 0n) n = -n;
    for (const p of [2n, 3n]) while (n % p === 0n) { add(p); n /= p; }
    for (let p = 5n, step = 2n; p <= 10000n && p * p <= n; p += step, step = 6n - step) while (n % p === 0n) { add(p); n /= p; }
    const stack = n > 1n ? [n] : [];
    const t0 = Date.now();
    while (stack.length) {
      const m = stack.pop();
      if (m === 1n) continue;
      if (isPrime(m)) { add(m); continue; }
      if (Date.now() - t0 > 8000) { f.set(m, -1); continue; } // 너무 오래 걸리면 남김
      const d = rho(m); stack.push(d, m / d);
    }
    return new Map([...f].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
  }
  const sup = (e) => (e > 1 ? `<sup>${e}</sup>` : '');
  const fmtFactor = (f) => [...f].map(([p, e]) => e === -1 ? `<span title="분해하지 못한 수">[${p}]</span>` : `${p}${sup(e)}`).join(' × ');
  const phiFrom = (n, f) => { let r = n; for (const p of f.keys()) r = r / p * (p - 1n); return r; };

  /** n! 에 들어 있는 소수 p 의 지수 (르장드르 공식) */
  function legendre(n, p) { let e = 0n; for (let q = p; q <= n; q *= p) e += n / q; return e; }

  /* ---------- 인수분해 ---------- */
  register('number-theory', 'factor', {
    help: [
      ['123456789', '소인수분해, 약수의 개수·합, φ(n), 뫼비우스 μ(n)'],
      ['12345!, 103', 'n! 에서 소수 p 의 지수'],
      ['35!', 'n! 의 끝자리 0 의 개수 (5 의 지수)']
    ],
    placeholder: '예) 123456789   또는   12345!, 103',
    example: '123456789',
    run(input) {
      const fact = input.match(/^(\d+)\s*!\s*(?:,\s*(\d+))?$/);
      if (fact) {
        const n = BigInt(fact[1]);
        if (fact[2]) {
          const p = BigInt(fact[2]);
          const fp = factorize(p);
          if (fp.size !== 1 || [...fp.values()][0] !== 1) throw new Error(`p = ${p} : 소수가 아닙니다.`);
          const e = legendre(n, p);
          let steps = [], q = p;
          while (q <= n) { steps.push(`⌊${n}/${q}⌋ = ${n / q}`); q *= p; }
          return `<p>${n}! 에 들어 있는 소수 ${p} 의 지수 = <b>${e}</b></p>
            <p class="mono">${steps.join(' + ')}${steps.length ? ' = ' + e : ''}</p>`;
        }
        const z = legendre(n, 5n);
        return `<p>${n}! 의 끝자리 0 의 개수 = <b>${z}</b> (10 = 2 × 5 이고, 5 의 지수가 2 의 지수보다 작으므로 5 의 지수와 같음)</p>`;
      }

      const n = toBig(input);
      if (n < 2n) throw new Error('2 이상의 자연수를 입력하세요.');
      const t0 = performance.now();
      const f = factorize(n);
      const ms = (performance.now() - t0).toFixed(1);
      if ([...f.values()].includes(-1)) {
        return `<p class="mono">${n} = ${fmtFactor(f)}</p>
          <p class="err">[ ] 안의 수는 시간 안에 더 분해하지 못했습니다.</p>`;
      }
      let d = 1n, s = 1n, mu = 1;
      for (const [p, e] of f) {
        d *= BigInt(e + 1);
        s *= (p ** BigInt(e + 1) - 1n) / (p - 1n);
        mu = e > 1 ? 0 : mu * -1;
      }
      const prime = f.size === 1 && [...f.values()][0] === 1;
      return `<p class="mono">${n} = <b>${fmtFactor(f)}</b></p>
        <table>
          <tr><th>소수 여부</th><td>${prime ? '소수' : '합성수'}</td></tr>
          <tr><th>약수의 개수 τ(n)</th><td>${d}</td></tr>
          <tr><th>약수의 합 σ(n)</th><td>${s}</td></tr>
          <tr><th>오일러 φ(n)</th><td>${phiFrom(n, f)}</td></tr>
          <tr><th>뫼비우스 μ(n)</th><td>${mu}</td></tr>
        </table>
        <p class="source">계산 시간 ${ms} ms</p>`;
    }
  });

  /* ---------- 원시근 / GCD·LCM / 위수 ---------- */
  function hasPrimitiveRoot(n, f) {
    if (n === 1n || n === 2n || n === 4n) return true;
    const ps = [...f.keys()];
    if (ps.length === 1 && ps[0] !== 2n) return true;                      // p^k
    if (ps.length === 2 && ps[0] === 2n && f.get(2n) === 1) return true;   // 2p^k
    return false;
  }
  function order(a, n, phi, phiF) {
    // ord_n(a) 는 φ(n) 의 약수 → φ 에서 소인수를 하나씩 떼어 보며 줄임
    let k = phi;
    for (const p of phiF.keys()) {
      while (k % p === 0n && modPow(a, k / p, n) === 1n) k /= p;
    }
    return k;
  }

  register('number-theory', 'primitive', {
    help: [
      ['84, 126, 210', '수 여러 개 → GCD, LCM'],
      ['23', '자연수 하나 → 원시근 존재 여부, 최소 원시근, 원시근 개수와 목록'],
      ['3 mod 7', 'a mod n → 위수 ordₙ(a) 와 거듭제곱표']
    ],
    placeholder: '예) 84, 126, 210   /   23   /   3 mod 7',
    example: '23',
    run(input) {
      const m = input.match(/^(-?\d+)\s*mod\s*(\d+)$/i);
      if (m) {
        const a = BigInt(m[1]), n = BigInt(m[2]);
        if (n < 2n) throw new Error('법 n 은 2 이상이어야 합니다.');
        if (gcd(a, n) !== 1n) throw new Error(`(${a}, ${n}) ≠ 1 이므로 위수가 정의되지 않습니다.`);
        const f = factorize(n), phi = phiFrom(n, f), phiF = factorize(phi);
        const k = order(a, n, phi, phiF);
        let table = '';
        if (k <= 60n) {
          const head = [], body = [];
          for (let i = 1n; i <= k; i++) { head.push(`<th>${i}</th>`); body.push(`<td>${modPow(a, i, n)}</td>`); }
          table = `<p>법 ${n} 에 관한 ${a} 의 거듭제곱표</p>
            <table><tr><th>k</th>${head.join('')}</tr><tr><th>${a}<sup>k</sup></th>${body.join('')}</tr></table>`;
        }
        return `<p>ord<sub>${n}</sub>(${a}) = <b>${k}</b>, φ(${n}) = ${phi}</p>
          <p>ord = φ 이면 원시근 → ${k === phi ? `a = ${a} : 법 ${n} 에 대한 <b>원시근</b>` : `a = ${a} : 법 ${n} 에 대한 원시근이 아님`}</p>${table}`;
      }

      const nums = input.split(/[,\s]+/).filter(Boolean).map(toBig);
      if (nums.length >= 2) {
        const g = nums.reduce(gcd), l = nums.reduce(lcm);
        return `<table><tr><th>GCD</th><td class="mono">${g}</td></tr><tr><th>LCM</th><td class="mono">${l}</td></tr></table>`;
      }
      const n = nums[0];
      if (n === undefined || n < 2n) throw new Error('2 이상의 자연수를 입력하세요.');
      const f = factorize(n), phi = phiFrom(n, f);
      if (!hasPrimitiveRoot(n, f)) {
        return `<p>φ(${n}) = ${phi}</p><p>n = ${n} : 1, 2, 4, p<sup>k</sup>, 2p<sup>k</sup> (p 는 홀수 소수) 꼴이 아니므로 <b>원시근이 없음</b></p>`;
      }
      const phiF = factorize(phi);
      let g = 0n;
      for (let a = 1n; a < n; a++) {
        if (gcd(a, n) === 1n && order(a, n, phi, phiF) === phi) { g = a; break; }
      }
      const count = phiFrom(phi, phiF);
      let list = '';
      if (n <= 100000n) {
        const roots = [];
        for (let k = 1n; k <= phi; k++) if (gcd(k, phi) === 1n) roots.push(modPow(g, k, n));
        roots.sort((x, y) => (x < y ? -1 : 1));
        list = `<p>원시근 전체 (${phiFrom(phi, phiF)}개): <span class="mono">${roots.slice(0, 500).join(', ')}${roots.length > 500 ? ' …' : ''}</span></p>`;
      }
      return `<table>
          <tr><th>φ(${n})</th><td>${phi}</td></tr>
          <tr><th>최소 원시근</th><td><b>${g}</b></td></tr>
          <tr><th>원시근의 개수 φ(φ(n))</th><td>${count}</td></tr>
        </table>${list}
        <p class="source">원시근 g 가 하나 있으면 gcd(k, φ(n)) = 1 인 k 에 대해 g<sup>k</sup> 가 모두 원시근입니다.</p>`;
    }
  });

  // 다른 모듈에서도 쓸 수 있도록 공개
  window.KPHS.nt = { gcd, lcm, modPow, factorize, phiFrom, isPrime, order, hasPrimitiveRoot, abs, toBig };
})();

/* =====================================================================
 * 이산대수 · 연분수 · 부정방정식
 * ===================================================================== */
(function () {
  const K = window.KPHS, { register } = K;
  const { gcd, modPow, factorize, phiFrom, isPrime, order, abs } = K.nt;
  const B = (v) => BigInt(v);
  const mod = (a, m) => ((a % m) + m) % m;
  const esc = K.esc;

  /** 확장 유클리드: [g, x, y]  (ax + by = g) + 풀이 과정 */
  function egcd(a, b, steps) {
    let [r0, r1, s0, s1, t0, t1] = [a, b, 1n, 0n, 0n, 1n];
    while (r1 !== 0n) {
      const q = r0 / r1;
      if (steps) steps.push(`${r0} = ${q} × ${r1} + ${r0 - q * r1}`);
      [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; [t0, t1] = [t1, t0 - q * t1];
    }
    return [r0, s0, t0];
  }
  function inverse(a, m) { const [g, x] = egcd(mod(a, m), m); if (g !== 1n) return null; return mod(x, m); }

  /** '... ≡ ... (mod m)' 나누기 */
  function parseCong(s) {
    const mm = s.match(/\(?\s*mod\s*([0-9]+)\s*\)?\s*$/i);
    if (!mm) throw new Error('끝에 (mod m) 을 붙여 주세요.  예) 3x ≡ 5 (mod 7)');
    const m = B(mm[1]); const body = s.slice(0, mm.index).trim();
    const sp = body.split(/≡|==|=/);
    if (sp.length !== 2) throw new Error('≡ (또는 =) 기호로 양변을 나눠 주세요.');
    return { lhs: sp[0].trim(), rhs: sp[1].trim(), m };
  }
  /** 정수 계수 다항식 → BigInt 계수 */
  function intPoly(src) {
    const c = K.expr.poly(src);
    if (c.some(v => !Number.isInteger(v))) throw new Error('계수가 정수인 다항식이어야 합니다.');
    return c.map(B);
  }
  const evalPolyMod = (c, x, m) => { let r = 0n; for (let i = c.length - 1; i >= 0; i--) r = (r * x + c[i]) % m; return mod(r, m); };
  function primRoot(p) {
    const phi = phiFrom(p, factorize(p)), pf = factorize(phi);
    for (let a = 2n; a < p; a++) if (gcd(a, p) === 1n && order(a, p, phi, pf) === phi) return a;
    return p === 2n ? 1n : null;
  }
  /** 이산로그: g^k ≡ h (mod m) 의 최소 k (아기걸음-거인걸음) */
  function dlog(g, h, m, n) {
    const s = BigInt(Math.ceil(Math.sqrt(Number(n)))), table = new Map();
    let e = 1n;
    for (let j = 0n; j < s; j++) { if (!table.has(e)) table.set(e, j); e = e * g % m; }
    const factor = modPow(inverse(g, m), s, m); let y = mod(h, m);
    for (let i = 0n; i <= s; i++) { if (table.has(y)) return i * s + table.get(y); y = y * factor % m; }
    return null;
  }
  /** 정수식을 mod m 으로 계산 (지수·계승은 정확한 값으로) */
  function evalMod(src, m) {
    const LIM = 4000; // 정확한 값을 유지할 최대 자릿수
    const mk = (ex, md) => ({ ex: ex !== null && ex.toString().length < LIM ? ex : null, md: mod(md, m) });
    const need = (a, what) => { if (a.ex === null) throw new Error(`${what}이(가) 너무 커서 정확히 계산할 수 없습니다.`); return a.ex; };
    const O = {
      c: (v) => { if (!Number.isInteger(v)) throw new Error('정수만 사용할 수 있습니다.'); return mk(B(v), B(v)); },
      add: (a, b) => mk(a.ex !== null && b.ex !== null ? a.ex + b.ex : null, a.md + b.md),
      sub: (a, b) => mk(a.ex !== null && b.ex !== null ? a.ex - b.ex : null, a.md - b.md),
      mul: (a, b) => mk(a.ex !== null && b.ex !== null ? a.ex * b.ex : null, a.md * b.md),
      neg: (a) => mk(a.ex !== null ? -a.ex : null, -a.md),
      div: () => { throw new Error('나눗셈 대신 역원을 쓰세요.'); },
      pow: (a, b) => {
        const e = need(b, '지수'); if (e < 0n) throw new Error('지수는 0 이상이어야 합니다.');
        return mk(a.ex !== null && e < 20000n ? a.ex ** e : null, modPow(a.md, e, m));
      },
      fn: (name, args) => {
        if (name !== 'fact') throw new Error(`${name}( ) 은 여기서 쓸 수 없습니다.`);
        const n = need(args[0], '계승할 수'); if (n > 10000000n) throw new Error('계승은 1000만 이하만 계산합니다.');
        let r = 1n, ex = n <= 1000n ? 1n : null;
        for (let i = 2n; i <= n; i++) { r = r * i % m; if (ex !== null) ex *= i; if (r === 0n && ex === null) break; }
        return mk(ex, r);
      }
    };
    return K.expr.evalWith(src, [], O, {});
  }

  /* ---------------- 이산대수 ---------------- */
  register('number-theory', 'dlog', {
    ops: [
      {
        id: 'linear', name: '일차 합동식  ax ≡ b (mod n)',
        help: [['1296x ≡ 1105 (mod 2413)', '해 x (mod n)'], ['6x ≡ 4 (mod 10)', 'gcd 가 b 를 나누면 해가 여러 개'], ['1245x ≡ 999 (mod 1603)', '1245x − 1603y = 999 와 같음']],
        run(s) {
          const { lhs, rhs, m } = parseCong(s);
          const c = intPoly(lhs); if (c.length > 2) throw new Error('일차식이어야 합니다. 고차식은 “다항 합동식”을 쓰세요.');
          const a = mod(c[1] || 0n, m), b = mod(intPoly(rhs)[0] - c[0], m);
          const steps = []; const [g, x] = egcd(a, m, steps);
          let h = `<p>${a}x ≡ ${b} (mod ${m}),  gcd(${a}, ${m}) = ${g}</p>`;
          if (b % g !== 0n) return h + `<p>${g} ∤ ${b} 이므로 <b>해가 없습니다.</b></p>`;
          const m1 = m / g, x0 = mod(x * (b / g), m1);
          h += `<h4>유클리드 호제법</h4><div class="steps">${steps.join('\n')}</div>`;
          h += `<p>${a}·(${x}) ≡ ${g} (mod ${m}) 이므로 x ≡ ${x}·${b / g} ≡ <b>${x0} (mod ${m1})</b></p>`;
          if (g > 1n) {
            const all = []; for (let k = 0n; k < g && k < 50n; k++) all.push(x0 + k * m1);
            h += `<p>법 ${m} 에서 해는 ${g}개: ${all.join(', ')}${g > 50n ? ' …' : ''}</p>`;
          }
          return h;
        }
      },
      {
        id: 'poly', name: '다항 합동식  f(x) ≡ c (mod m)',
        help: [['x^3 + 2x^2 - 1 ≡ 7 (mod 23)', '0 ≤ x < m 에서 모든 해'], ['4x^5 - 3x^4 + x^2 + 7 ≡ 7 (mod 23)', ''], ['x^2 ≡ 3 (mod 11)', '제곱잉여']],
        run(s) {
          const { lhs, rhs, m } = parseCong(s);
          if (m > 2000000n) throw new Error('법이 너무 큽니다 (200만 이하).');
          const c = intPoly(lhs), r = intPoly(rhs); c[0] -= r[0];
          const sol = []; for (let x = 0n; x < m; x++) if (evalPolyMod(c, x, m) === 0n) sol.push(x);
          return `<p>f(x) − c = ${K.num.polyStr(c.map(Number))} ≡ 0 (mod ${m})</p>` +
            (sol.length ? `<p>해 (${sol.length}개): <b>x ≡ ${sol.slice(0, 200).join(', ')}</b>${sol.length > 200 ? ' …' : ''} (mod ${m})</p>` : '<p><b>해가 없습니다.</b></p>');
        }
      },
      {
        id: 'power', name: '거듭제곱 합동식  a·xⁿ ≡ b (mod m)',
        help: [['5x^7 ≡ 3 (mod 11)', '지수(Ind)를 이용한 풀이'], ['x^2 ≡ 3 (mod 13)', '르장드르 기호와 제곱근'], ['5x^7 ≡ 3 (mod 12)', '원시근이 없는 법 (직접 대입)']],
        run(s) {
          const { lhs, rhs, m } = parseCong(s);
          const mm = lhs.replace(/\s/g, '').match(/^(-?\d*)\*?x\^(\d+)$/);
          if (!mm) throw new Error('a·x^n 꼴로 입력하세요. 예) 5x^7 ≡ 3 (mod 11)');
          const a = B(mm[1] === '' ? 1 : mm[1] === '-' ? -1 : mm[1]), n = B(mm[2]), b = mod(intPoly(rhs)[0], m);
          const sol = []; if (m <= 2000000n) for (let x = 0n; x < m; x++) if (mod(a * modPow(x, n, m), m) === b) sol.push(x);
          let h = `<p>${a}·x<sup>${n}</sup> ≡ ${b} (mod ${m})</p>`;
          h += sol.length ? `<p>해: <b>x ≡ ${sol.slice(0, 100).join(', ')}</b> (mod ${m})</p>` : '<p><b>해가 없습니다.</b></p>';
          if (isPrime(m) && m > 2n && mod(a, m) !== 0n && b !== 0n) {
            const g = primRoot(m), p1 = m - 1n;
            const ia = dlog(g, mod(a, m), m, p1), ib = dlog(g, b, m, p1);
            h += `<h4>지수(Ind)를 이용한 풀이 — 원시근 g = ${g}</h4>
              <div class="steps">Ind ${a} + ${n}·Ind x ≡ Ind ${b}  (mod ${p1})
${ia} + ${n}·Ind x ≡ ${ib}  (mod ${p1})
${n}·Ind x ≡ ${mod(ib - ia, p1)}  (mod ${p1})</div>`;
            if (n === 2n && mod(a, m) === 1n) {
              const L = modPow(b, (m - 1n) / 2n, m) === 1n ? 1 : -1;
              h += `<p>르장드르 기호 (${b}/${m}) = ${b}<sup>(${m}-1)/2</sup> mod ${m} = <b>${L}</b> → ${L === 1 ? '제곱잉여 (해가 있음)' : '제곱비잉여 (해가 없음)'}</p>`;
            }
          } else if (!isPrime(m)) h += `<p class="muted">법 ${m} 이 소수가 아니어서 0 ≤ x < ${m} 을 직접 대입해 구했습니다.</p>`;
          return h;
        }
      },
      {
        id: 'exp', name: '지수 합동식  a·bˣ ≡ c (mod p)',
        help: [['7·3^x ≡ 13 (mod 17)', 'Ind 를 이용한 풀이'], ['7·4^x ≡ 13 (mod 17)', '해가 없는 경우'], ['3^x ≡ 13 (mod 17)', ''], ['2^x ≡ 3 (mod 1000003)', '큰 법 (아기걸음-거인걸음)']],
        run(s) {
          const { lhs, rhs, m } = parseCong(s);
          const mm = lhs.replace(/[\s·*]/g, '').match(/^(-?\d*)(\d+)\^x$/) || lhs.replace(/\s/g, '').match(/^(-?\d+)[·*](\d+)\^x$/);
          const m2 = lhs.replace(/\s/g, '').match(/^(?:(-?\d+)[·*])?(\d+)\^x$/);
          if (!m2) throw new Error('a·b^x 꼴로 입력하세요. 예) 7·4^x ≡ 13 (mod 17)');
          void mm;
          const a = B(m2[1] || 1), b = B(m2[2]), c = mod(intPoly(rhs)[0], m);
          const ai = inverse(a, m); if (ai === null) throw new Error(`gcd(${a}, ${m}) ≠ 1 입니다.`);
          const target = c * ai % m;
          const phi = phiFrom(m, factorize(m)), ordb = order(mod(b, m), m, phi, factorize(phi));
          const k = dlog(mod(b, m), target, m, ordb);
          let h = `<p>${a}·${b}<sup>x</sup> ≡ ${c} (mod ${m})  ⇒  ${b}<sup>x</sup> ≡ ${target} (mod ${m})</p>`;
          if (k === null) return h + '<p><b>해가 없습니다.</b></p>';
          h += `<p>해: <b>x ≡ ${k} (mod ${ordb})</b>  (ord<sub>${m}</sub>(${b}) = ${ordb})</p>`;
          if (isPrime(m)) {
            const g = primRoot(m), p1 = m - 1n;
            const i7 = dlog(g, mod(a, m), m, p1), i4 = dlog(g, mod(b, m), m, p1), i13 = dlog(g, c, m, p1);
            h += `<h4>지수(Ind)를 이용한 풀이 — 원시근 g = ${g}</h4><div class="steps">Ind ${a} + x·Ind ${b} ≡ Ind ${c}  (mod ${p1})
${i7} + ${i4}x ≡ ${i13}  (mod ${p1})
${i4}x ≡ ${mod(i13 - i7, p1)}  (mod ${p1})</div>`;
          }
          return h;
        }
      },
      {
        id: 'value', name: '큰 수의 나머지  (계승·거듭제곱)',
        help: [['4·25! + 12 (mod 131)', '계승이 들어간 식'], ['3·25^53 + 12 (mod 131)', '거듭제곱'], ['7^2023 (mod 100)', '끝 두 자리'], ['2^(10^18) (mod 1000000007)', '아주 큰 지수']],
        run(s) {
          const mm = s.match(/\(?\s*mod\s*(\d+)\s*\)?\s*$/i);
          if (!mm) throw new Error('끝에 (mod m) 을 붙여 주세요.');
          const m = B(mm[1]), body = s.slice(0, mm.index).replace(/^\s*x\s*[=≡]\s*/, '');
          const r = evalMod(body, m);
          return `<p>${esc(body)} ≡ <b>${r.md}</b> (mod ${m})</p>` + (r.ex !== null && r.ex.toString().length < 200 ? `<p class="muted">실제 값: ${r.ex}</p>` : '');
        }
      },
      {
        id: 'crt', name: '중국인 나머지 정리  (연립 합동식)',
        help: [['x ≡ 3 (mod 5), x ≡ 4 (mod 7), x ≡ 5 (mod 11)', '서로소인 법'], ['x ≡ 3 (mod 8), x ≡ 11 (mod 20), x ≡ 1 (mod 15)', '서로소가 아닌 법도 가능']],
        run(s) {
          const eqs = [...s.matchAll(/(-?\d+)\s*\(?\s*mod\s*(\d+)\s*\)?/gi)].map(m => [B(m[1]), B(m[2])]);
          if (eqs.length < 2) throw new Error('x ≡ a (mod m) 를 두 개 이상 쉼표로 이어 쓰세요.');
          let [r, M] = [mod(eqs[0][0], eqs[0][1]), eqs[0][1]];
          const steps = [`x ≡ ${r} (mod ${M})  →  x = ${r} + ${M}t`];
          for (let i = 1; i < eqs.length; i++) {
            const [a, m] = eqs[i], g = gcd(M, m);
            if (mod(a - r, g) !== 0n) return `<div class="steps">${steps.join('\n')}</div><p>${M}t ≡ ${mod(a - r, m)} (mod ${m}) 에서 ${g} ∤ ${mod(a - r, m)} 이므로 <b>해가 없습니다.</b></p>`;
            const m1 = m / g, t = mod(((a - r) / g) * inverse(mod(M / g, m1), m1), m1);
            steps.push(`${r} + ${M}t ≡ ${a} (mod ${m})  →  ${M}t ≡ ${mod(a - r, m)} (mod ${m})${g > 1n ? `,  gcd = ${g}` : ''}  →  t ≡ ${t} (mod ${m1})`);
            r = r + M * t; M = M * m1; r = mod(r, M);
            steps.push(`x = ${r} + ${M}t`);
          }
          return `<div class="steps">${steps.join('\n')}</div><p>해: <b>x ≡ ${r} (mod ${M})</b></p>`;
        }
      }
    ]
  });

  /* ---------------- 연분수 ---------------- */
  const cfStr = (a, period) => {
    if (period) return `[${a[0]}; ${a.slice(1, a.length - period).map(String).concat(`<span style="text-decoration:overline">${a.slice(a.length - period).join(', ')}</span>`).join(', ')}]`;
    return `[${a[0]}${a.length > 1 ? '; ' + a.slice(1).join(', ') : ''}]`;
  };
  function convergents(a) {
    let [p0, p1, q0, q1] = [1n, 0n, 0n, 1n]; const out = [];
    a.forEach(x => { [p0, p1] = [x * p0 + p1, p0]; [q0, q1] = [x * q0 + q1, q0]; out.push([p0, q0]); });
    return out;
  }
  const convTable = (a, cs, n = 20) => K.num.table(a.slice(0, n).map((x, i) => [i, x, cs[i][0], cs[i][1], K.num.dec(Number(cs[i][0]) / Number(cs[i][1]), 12)]), ['k', 'a<sub>k</sub>', 'p<sub>k</sub>', 'q<sub>k</sub>', 'p<sub>k</sub>/q<sub>k</sub>']);
  function fracCF(p, q, steps) {
    const a = []; if (q < 0n) { p = -p; q = -q; }
    while (q !== 0n) {
      let t = p / q; if (p < 0n && p % q !== 0n) t -= 1n; // 내림
      if (steps) steps.push(`${p} = ${t} × ${q} + ${p - t * q}`);
      a.push(t); [p, q] = [q, p - t * q];
    }
    return a;
  }
  const isqrt = (n) => { if (n < 2n) return n; let x = B(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; };
  /** (P + √D)/Q 의 순환 연분수 */
  function quadCF(P, D, Q) {
    if (mod(D - P * P, abs(Q)) !== 0n) { P *= abs(Q); D *= Q * Q; Q *= abs(Q); }
    const r = isqrt(D); if (r * r === D) return null;
    const seen = new Map(), a = [];
    for (let i = 0; i < 2000; i++) {
      const key = `${P},${Q}`;
      if (seen.has(key)) { const st = seen.get(key); return { a, period: a.length - st }; }
      seen.set(key, a.length);
      const t = Q > 0n ? floorDiv(P + r, Q) : floorDiv(P + r + 1n, Q);
      a.push(t); P = t * Q - P; Q = (D - P * P) / Q;
    }
    return { a, period: 0 };
  }
  const floorDiv = (a, b) => { let q = a / b; if ((a % b !== 0n) && ((a < 0n) !== (b < 0n))) q -= 1n; return q; };
  /** 'sqrt(13)', '(1+sqrt(5))/2', '(3 - 2√7)/5' → {a, b, d, c} */
  function parseQuad(s) {
    const t = s.replace(/\s/g, '').replace(/√\(?(\d+)\)?/g, 'sqrt($1)');
    const m = t.match(/^\(?([+-]?\d+)?([+-]?\d*)\*?sqrt\((\d+)\)\)?(?:\/(\d+))?$/);
    if (!m) return null;
    let bStr = m[2]; if (bStr === '' || bStr === '+') bStr = '1'; if (bStr === '-') bStr = '-1';
    return { a: B(m[1] || 0), b: B(bStr), d: B(m[3]), c: B(m[4] || 1) };
  }

  register('number-theory', 'cfrac', {
    ops: [
      {
        id: 'toFrac', name: '연분수 → 분수',
        help: [['[2; 3, 4, 1, 2, 5]', '근사분수 표와 값'], ['[1; 2, 2, 2, 2, 2, 2, 2]', '√2 의 근사']],
        run(s) {
          const a = s.replace(/[\[\]]/g, '').split(/[;,\s]+/).filter(Boolean).map(x => K.nt.toBig(x));
          const cs = convergents(a), [p, q] = cs[cs.length - 1], g = gcd(p, q);
          return `<p>${cfStr(a)} = <b>${p / g}/${q / g}</b> ≈ ${K.num.dec(Number(p) / Number(q), 12)}</p><h4>근사분수</h4>${convTable(a, cs, 40)}`;
        }
      },
      {
        id: 'fromFrac', name: '분수 → 연분수',
        help: [['153/41', '유클리드 호제법으로 전개'], ['-43/19', '음수']],
        run(s) {
          const m = s.replace(/\s/g, '').match(/^(-?\d+)\/(-?\d+)$/); if (!m) throw new Error('p/q 꼴로 입력하세요.');
          const steps = [], a = fracCF(B(m[1]), B(m[2]), steps), cs = convergents(a);
          return `<p>${m[1]}/${m[2]} = <b>${cfStr(a)}</b></p><div class="steps">${steps.join('\n')}</div><h4>근사분수</h4>${convTable(a, cs)}`;
        }
      },
      {
        id: 'fromDec', name: '소수 → 연분수',
        help: [['3.141592', '유한소수를 정확한 분수로 바꾸어 전개'], ['0.3125', '']],
        run(s) {
          const m = s.trim().match(/^(-?)(\d*)\.?(\d*)$/); if (!m) throw new Error('소수를 입력하세요. 예) 3.141592');
          const den = 10n ** B(m[3].length), num = B((m[1] || '') + (m[2] || '0') + m[3]), g = gcd(num, den);
          const a = fracCF(num / g, den / g), cs = convergents(a);
          return `<p>${s} = ${num / g}/${den / g} = <b>${cfStr(a)}</b></p><h4>근사분수</h4>${convTable(a, cs)}`;
        }
      },
      {
        id: 'quad', name: '무리수 (a + b√d)/c → 순환 연분수',
        help: [['sqrt(13)', '√13'], ['(1 + sqrt(5))/2', '황금비'], ['(3 - 2sqrt(7))/5', ''], ['√61', '주기가 긴 예']],
        run(s) {
          const q = parseQuad(s); if (!q) throw new Error('(a + b·sqrt(d))/c 꼴로 입력하세요. 예) (1 + sqrt(5))/2');
          let { a, b, d, c } = q; if (c === 0n || b === 0n) throw new Error('b, c 는 0 이 아니어야 합니다.');
          let P = a, D = b * b * d, Q = c;
          if (b < 0n) { P = -a; Q = -c; } // (a - √D)/c = (-a + √D)/(-c)
          const res = quadCF(P, D, Q);
          if (!res) throw new Error(`${d} 는 제곱수입니다. 유리수이므로 “분수 → 연분수”를 쓰세요.`);
          const cs = convergents(res.a);
          const val = (Number(a) + Number(b) * Math.sqrt(Number(d))) / Number(c);
          return `<p>${esc(s)} ≈ ${K.num.dec(val, 12)} = <b>${cfStr(res.a, res.period)}</b></p><p>주기: ${res.period}</p><h4>근사분수</h4>${convTable(res.a.concat(res.a.slice(res.a.length - res.period)).slice(0, 20), convergents(res.a.concat(res.a.slice(res.a.length - res.period))).slice(0, 20))}`;
          void cs;
        }
      },
      {
        id: 'real', name: '실수 (초월수) → 연분수',
        note: '컴퓨터의 배정도 실수로 계산하므로 앞쪽 12~15개 항까지만 정확합니다.',
        help: [['pi', 'π = [3; 7, 15, 1, 292, …]'], ['e', ''], ['2pi/5', ''], ['exp(2)', ''], ['sin(1)', ''], ['log10(7)', '']],
        run(s) {
          let x = K.expr.num(s); const a = []; const x0 = x;
          for (let i = 0; i < 18; i++) { const t = Math.floor(x); a.push(B(t)); const f = x - t; if (f < 1e-9) break; x = 1 / f; }
          const cs = convergents(a);
          // 정확한 항까지만
          let ok = a.length; for (let i = 0; i < cs.length; i++) { if (Math.abs(Number(cs[i][0]) / Number(cs[i][1]) - x0) < 1e-15 * Math.max(1, Math.abs(x0))) { ok = i + 1; break; } }
          const aa = a.slice(0, Math.min(ok + 1, a.length));
          return `<p>${esc(s)} ≈ ${K.num.dec(x0, 15)}</p><p>= <b>${cfStr(aa)}${aa.length >= 12 ? ' …' : ''}</b></p><h4>근사분수</h4>${convTable(aa, convergents(aa))}`;
        }
      }
    ]
  });

  /* ---------------- 부정방정식 ---------------- */
  /** 'a·x + b·y + … = c' 의 계수 (정수) */
  function linCoefs(lhs, rhs, names) {
    const f = K.expr.compile(`(${lhs}) - (${rhs})`, names), z = names.map(() => 0);
    const c0 = f(...z), co = names.map((_, i) => { const v = z.slice(); v[i] = 1; return f(...v) - c0; });
    // 일차식인지 확인
    const v2 = names.map((_, i) => i + 2);
    if (Math.abs(f(...v2) - (c0 + co.reduce((s, a, i) => s + a * v2[i], 0))) > 1e-9) throw new Error('일차식이어야 합니다.');
    if ([c0, ...co].some(v => !Number.isInteger(Math.round(v * 1e9) / 1e9))) throw new Error('계수는 정수여야 합니다.');
    return { co: co.map(v => B(Math.round(v))), c: B(Math.round(-c0)) };
  }
  function pellFund(d) { // x² - d y² = ±1 의 최소해
    const r = quadCF(0n, d, 1n); if (!r) return null;
    const per = r.period, a = r.a.slice();
    const need = per % 2 === 0 ? per : 2 * per;
    const full = [a[0]]; for (let i = 0; full.length <= need; i++) full.push(a[1 + (i % per)]);
    const cs = convergents(full);
    const neg = per % 2 === 1 ? cs[per - 1] : null, pos = cs[need - 1];
    return { per, pos, neg, cf: r };
  }

  register('number-theory', 'diophantine', {
    ops: [
      {
        id: 'linear2', name: '일차 부정방정식  ax + by = c',
        help: [['3x + 5y = 13', '일반해'], ['1245x - 1603y = 999', ''], ['6x + 9y = 7', '해가 없는 경우']],
        run(s) {
          const [l, r] = s.split('='); if (r === undefined) throw new Error('= 로 양변을 나눠 주세요.');
          const { co: [a, b], c } = linCoefs(l, r, ['x', 'y']);
          const steps = []; const [g, x0, y0] = egcd(abs(a), abs(b), steps);
          let h = `<p>${K.num.linStr([Number(a), Number(b)], ['x', 'y'])} = ${c},  gcd(${abs(a)}, ${abs(b)}) = ${g}</p>`;
          if (c % g !== 0n) return h + `<p>${g} ∤ ${c} 이므로 <b>정수해가 없습니다.</b></p>`;
          const sx = a < 0n ? -1n : 1n, sy = b < 0n ? -1n : 1n;
          let px = sx * x0 * (c / g), py = sy * y0 * (c / g);
          const dx = b / g, dy = a / g;
          // 보기 좋게 x 를 0 ≤ x < |dx| 로
          const k = floorDiv(px, abs(dx)); px -= k * abs(dx); py += k * abs(dx) * dy / dx;
          h += `<div class="steps">${steps.join('\n')}</div>`;
          h += `<p>특수해: (x, y) = (${px}, ${py})</p><p>일반해: <b>x = ${px} ${dx >= 0n ? '+' : '−'} ${abs(dx)}t,  y = ${py} ${dy >= 0n ? '−' : '+'} ${abs(dy)}t</b>  (t 는 정수)</p>`;
          return h;
        }
      },
      {
        id: 'linearN', name: '다변수 일차 합동식  (mod m, 미지수 6개까지)',
        help: [['3x + 5y + 12z ≡ 13 (mod 17)', '해의 개수와 몇 개의 해'], ['2x + 4y ≡ 6 (mod 8)', '']],
        run(s) {
          const { lhs, rhs, m } = parseCong(s);
          const names = ['x', 'y', 'z', 'u', 'v', 'w'].filter(v => new RegExp(v).test(lhs));
          const { co, c } = linCoefs(lhs, rhs, names);
          const g = co.reduce((acc, a) => gcd(acc, a), m);
          let h = `<p>${K.num.linStr(co.map(Number), names)} ≡ ${mod(c, m)} (mod ${m}),  gcd(계수들, ${m}) = ${g}</p>`;
          if (mod(c, g) !== 0n) return h + '<p><b>해가 없습니다.</b></p>';
          const count = g * m ** B(names.length - 1);
          h += `<p>법 ${m} 에서 해의 개수: <b>${count}</b></p>`;
          const list = []; const n = names.length, M = Number(m);
          if (M ** n <= 3e6) {
            const v = new Array(n).fill(0);
            const rec = (i) => { if (list.length >= 30) return; if (i === n) { if (mod(co.reduce((s2, a, j) => s2 + a * B(v[j]), 0n) - c, m) === 0n) list.push(`(${v.join(', ')})`); return; } for (let t = 0; t < M; t++) { v[i] = t; rec(i + 1); } };
            rec(0);
            h += `<p>해 (${names.join(', ')}) 의 예: ${list.join(', ')}${BigInt(list.length) < count ? ' …' : ''}</p>`;
          }
          return h;
        }
      },
      {
        id: 'pell', name: '펠 방정식  x² − dy² = c',
        help: [['x^2 - 13y^2 = 1', '최소해와 해 목록 (연분수 이용)'], ['x^2 - 61y^2 = 1', '최소해가 매우 큰 예'], ['x^2 - 13y^2 = -1', ''], ['x^2 - 3y^2 = 13', 'c ≠ ±1']],
        run(s) {
          const t = s.replace(/\s/g, '').replace(/²/g, '^2');
          const m = t.match(/^x\^2-(\d*)\*?y\^2=(-?\d+)$/); if (!m) throw new Error('x^2 - d y^2 = c 꼴로 입력하세요.');
          const d = B(m[1] || 1), c = B(m[2]);
          const f = pellFund(d); if (!f) throw new Error(`d = ${d} 는 제곱수입니다. 제곱수가 아닌 양의 정수여야 합니다.`);
          const [x1, y1] = f.pos;
          let h = `<p>√${d} = ${cfStr(f.cf.a, f.cf.period)},  주기 ${f.per} (${f.per % 2 ? '홀수' : '짝수'})</p>`;
          h += `<p>x² − ${d}y² = 1 의 최소해: <b>(${x1}, ${y1})</b></p>`;
          if (f.neg) h += `<p>x² − ${d}y² = −1 의 최소해: <b>(${f.neg[0]}, ${f.neg[1]})</b></p>`; else h += `<p>주기가 짝수이므로 x² − ${d}y² = −1 은 해가 없습니다.</p>`;
          const gen = (x0, y0, cnt = 6) => { const out = []; let [x, y] = [x0, y0]; for (let i = 0; i < cnt; i++) { out.push(`(${x}, ${y})`); [x, y] = [x * x1 + d * y * y1, x * y1 + y * x1]; } return out; };
          if (c === 1n) h += `<h4>해 (xₙ + yₙ√${d} = (${x1} + ${y1}√${d})ⁿ)</h4><div class="steps">${gen(x1, y1).join('\n')}</div>`;
          else if (c === -1n && f.neg) { const [a, b] = f.neg; h += `<h4>x² − ${d}y² = −1 의 해</h4><div class="steps">${gen(a, b).join('\n')}</div>`; }
          else if (c !== 1n && c !== -1n) {
            // 기본해 찾기: 0 ≤ y ≤ 한계 (Nagell)
            const ac = abs(c), lim = c > 0n ? Number(y1) * Math.sqrt(Number(ac) / (2 * (Number(x1) + 1))) : Number(y1) * Math.sqrt(Number(ac) / (2 * (Number(x1) - 1)));
            if (!isFinite(lim) || lim > 5e6) return h + '<p class="muted">기본해 탐색 범위가 너무 커서 생략했습니다.</p>';
            const fund = [];
            for (let y = 0n; y <= B(Math.ceil(lim)); y++) { const X2 = c + d * y * y; if (X2 < 0n) continue; const x = isqrt(X2); if (x * x === X2) { fund.push([x, y]); if (x !== 0n) fund.push([-x, y]); } }
            if (!fund.length) return h + `<p>x² − ${d}y² = ${c} 은 <b>정수해가 없습니다.</b></p>`;
            h += `<h4>x² − ${d}y² = ${c} 의 해</h4><p>기본해: ${fund.map(([x, y]) => `(${x}, ${y})`).join(', ')}</p>`;
            h += `<p>각 기본해 (p, q) 와 (${x1}, ${y1}) 로 (x, y) = (p·${x1} + ${d}q·${y1}, p·${y1} + q·${x1}) 를 되풀이하면 모든 양의 해가 나옵니다.</p>`;
            h += `<div class="steps">${fund.filter(([x]) => x > 0n).map(([x, y]) => gen(x, y, 4).join(', ')).join('\n')}</div>`;
          }
          return h;
        }
      },
      {
        id: 'pelllike', name: '펠형 방정식  x² + bxy + cy² = d',
        help: [['x^2 + 3xy - y^2 = 3', '범위 안의 정수해 (|x|, |y| ≤ 3000)'], ['x^2 + xy - y^2 = 1', '피보나치 수와 관련'], ['x^2 + 3xy - y^2 = 3, 10000', '끝에 범위를 붙일 수 있음']],
        run(s) {
          const [eq, lim0] = s.split(','); const L = lim0 ? Number(lim0) : 3000;
          const [l, r] = eq.split('='); if (r === undefined) throw new Error('= 로 양변을 나눠 주세요.');
          // x² + bxy + cy² 계수 추출
          const f = K.expr.compile(l, ['x', 'y']);
          const b = f(1, 1) - f(1, 0) - f(0, 1), c = f(0, 1), a = f(1, 0), d = K.expr.num(r);
          if (a !== 1 || ![b, c, d].every(Number.isInteger)) throw new Error('x² + bxy + cy² = d (b, c, d 정수) 꼴이어야 합니다.');
          const D = b * b - 4 * c;
          if (D <= 0 || Number.isInteger(Math.sqrt(D))) throw new Error(`판별식 b² − 4c = ${D} 가 제곱수가 아닌 양수여야 합니다.`);
          const sol = [];
          for (let y = -L; y <= L; y++) {
            const disc = B(D) * B(y) * B(y) + 4n * B(d); if (disc < 0n) continue;
            const rt = isqrt(disc); if (rt * rt !== disc) continue;
            for (const sg of [1n, -1n]) { const num = -B(b) * B(y) + sg * rt; if (num % 2n === 0n) { const x = num / 2n; if (abs(x) <= B(L) && !sol.some(p => p[0] === x && p[1] === B(y))) sol.push([x, B(y)]); } if (rt === 0n) break; }
          }
          const pos = sol.filter(([x, y]) => x >= 0n && y >= 0n);
          return `<p>x² ${b >= 0 ? '+' : '−'} ${Math.abs(b)}xy ${c >= 0 ? '+' : '−'} ${Math.abs(c)}y² = ${d},  D = b² − 4c = ${D}</p>
            <p>(2x + ${b}y)² − ${D}y² = ${4 * d} 로 바꾸어 풀었습니다.</p>
            <p>|x|, |y| ≤ ${L} 에서 해 ${sol.length}개${pos.length ? `, 그중 x, y ≥ 0 인 해:` : ''}</p>
            ${pos.length ? `<div class="steps">${pos.sort((p, q) => (p[1] < q[1] ? -1 : 1)).slice(0, 60).map(([x, y]) => `(${x}, ${y})`).join(', ')}</div>` : sol.length ? '' : '<p><b>범위 안에 해가 없습니다.</b></p>'}`;
        }
      }
    ]
  });

  Object.assign(K.nt, { egcd, inverse, convergents, fracCF, quadCF, cfStr, pellFund, primRoot, dlog, isqrt });
})();
