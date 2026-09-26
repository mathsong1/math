/*
 * 수 표시 · 수치해석 도구
 *  fmt(x)      : 보기 좋은 숫자 (정수, 분수, 소수)
 *  frac(x)     : 근사 분수 [p, q] (없으면 null)
 *  sqrtForm(x) : a√b / c 꼴이 있으면 문자열
 *  deriv, integrate, roots, extrema : 미적분 · 방정식
 */
(function () {
  const K = (window.KPHS = window.KPHS || {});
  const EPS = 1e-9;

  function frac(x, maxDen = 10000) {
    if (!isFinite(x)) return null;
    if (Number.isInteger(x)) return [x, 1];
    // 연분수로 가장 가까운 분수 찾기
    let h0 = 1, h1 = 0, k0 = 0, k1 = 1, v = Math.abs(x);
    for (let i = 0; i < 40; i++) {
      const a = Math.floor(v);
      [h0, h1] = [a * h0 + h1, h0];
      [k0, k1] = [a * k0 + k1, k0];
      if (k0 > maxDen) return null;
      if (Math.abs(h0 / k0 - Math.abs(x)) < 1e-11 * Math.max(1, Math.abs(x))) return [Math.sign(x) * h0, k0];
      const r = v - a; if (r < 1e-15) break; v = 1 / r;
    }
    return null;
  }
  function trim(s) { return s.includes('.') && !s.includes('e') ? s.replace(/0+$/, '').replace(/\.$/, '') : s; }
  function dec(x, d = 8) {
    if (!isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : '정의 안 됨';
    if (Math.abs(x) < 1e-12) return '0';
    const ax = Math.abs(x);
    if (ax >= 1e15 || ax < 1e-6) return x.toExponential(d - 1).replace(/\.?0+e/, 'e').replace(/e\+?(-?\d+)/, "×10<sup>$1</sup>");
    return trim(x.toFixed(Math.max(0, d - Math.max(0, Math.floor(Math.log10(ax)) + 1) + 1)));
  }
  /** 기본 표시: 정수 → 정수, 분모 작은 분수 → a/b, 그 외 → 소수 */
  function fmt(x, opt = {}) {
    if (typeof x === 'bigint') return x.toString();
    if (x === undefined || x === null || Number.isNaN(x)) return '정의 안 됨';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (Math.abs(x) >= 1e15) return dec(x, opt.digits || 10);
    const r = Math.round(x);
    if (Math.abs(x - r) < 1e-9 * Math.max(1, Math.abs(x))) return String(r === 0 ? 0 : r);
    if (opt.frac !== false) {
      const f = frac(x, opt.maxDen || 1000);
      if (f) return `${f[0]}/${f[1]}`;
    }
    return dec(x, opt.digits || 8);
  }
  /** 분수 + 소수 같이: '2/3 (≈ 0.66666667)' */
  function fmt2(x) {
    const a = fmt(x), b = dec(x, 10);
    if (Math.abs(x * 1e4 - Math.round(x * 1e4)) < 1e-7 * Math.max(1, Math.abs(x * 1e4))) return b; // 짧은 소수는 그대로
    return a === b || /^-?\d+$/.test(a) ? a : `${a} <span class="muted">(≈ ${b})</span>`;
  }
  /** a√b/c 꼴 찾기 (b ≤ 1000) */
  function sqrtForm(x) {
    if (Math.abs(x) < EPS) return null;
    const sq = x * x, f = frac(sq, 10000);
    if (!f || f[1] > 10000) return null;
    let [p, q] = f; // x² = p/q → |x| = √(pq)/q
    let n = p * q, out = 1;
    for (let k = 2; k * k <= n; k++) while (n % (k * k) === 0) { out *= k; n /= k * k; }
    if (n === 1) return null;
    const g = gcd(out, q); const num = out / g, den = q / g;
    if (n > 2000 || den > 1000 || num > 1000) return null; // 너무 복잡한 꼴은 소수로
    const s = x < 0 ? '-' : '';
    return `${s}${num === 1 ? '' : num}√${n}${den === 1 ? '' : '/' + den}`;
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
  /** 정확한 꼴이 있으면 같이 보여 줌: '0.69282 = 2√3/5' */
  function exact(x) {
    const f = fmt(x);
    if (/^-?\d+(\/\d+)?$/.test(f)) return f;
    const approx = ` <span class="muted">(≈ ${dec(x, 10)})</span>`;
    if (Math.abs(x) > 1e6 || Math.abs(x) < 1e-6) return dec(x, 10);
    const s = sqrtForm(x);
    if (s) return s + approx;
    const pi = frac(x / Math.PI, 100);
    if (pi) return `${pi[0] === 1 ? '' : pi[0] === -1 ? '-' : pi[0]}π${pi[1] === 1 ? '' : '/' + pi[1]}` + approx;
    const sp = frac(x * x / Math.PI, 100); // √π 의 유리수배
    if (sp) { const r = sqrtForm(Math.sign(x) * Math.sqrt(sp[0] / sp[1])) || fmt(Math.sign(x) * Math.sqrt(sp[0] / sp[1])); if (/^-?[\d√/]+$/.test(r)) return `${r === '1' ? '' : r === '-1' ? '-' : r}√π`.replace(/(\d+)\/(\d+)√π/, '$1√π/$2').replace(/^(-?)1√π/, '$1√π') + approx; }
    return dec(x, 10);
  }

  /* ---------- 다항식 / 식 문자열 ---------- */
  /** 계수 [a0, a1, …] (낮은 차수부터) → 'x^3 - 2x + 1' */
  function polyStr(c, v = 'x', html = true) {
    const terms = [];
    for (let i = c.length - 1; i >= 0; i--) {
      const a = c[i];
      if (Math.abs(a) < 1e-12) continue;
      const s = fmt(Math.abs(a));
      const coef = (Math.abs(Math.abs(a) - 1) < 1e-12 && i > 0) ? '' : (s.includes('/') && i > 0 ? `(${s})` : s);
      const pw = i === 0 ? '' : i === 1 ? v : html ? `${v}<sup>${i}</sup>` : `${v}^${i}`;
      terms.push({ neg: a < 0, s: coef + pw });
    }
    if (!terms.length) return '0';
    return terms.map((t, i) => (i === 0 ? (t.neg ? '-' : '') + t.s : (t.neg ? ' - ' : ' + ') + t.s)).join('');
  }
  /** a·x + b·y + … 꼴 (1차식) */
  function linStr(coefs, names, constant) {
    const parts = [];
    coefs.forEach((a, i) => {
      if (Math.abs(a) < 1e-12) return;
      const s = fmt(Math.abs(a));
      parts.push({ neg: a < 0, s: (Math.abs(Math.abs(a) - 1) < 1e-12 ? '' : s) + names[i] });
    });
    if (constant !== undefined && Math.abs(constant) > 1e-12) parts.push({ neg: constant < 0, s: fmt(Math.abs(constant)) });
    if (!parts.length) return '0';
    return parts.map((t, i) => (i === 0 ? (t.neg ? '-' : '') + t.s : (t.neg ? ' - ' : ' + ') + t.s)).join('');
  }

  /* ---------- 미적분 ---------- */
  function deriv(f, x, n = 1) {
    const h = 1e-4 * Math.max(1, Math.abs(x));
    if (n === 1) return (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);
    if (n === 2) return (-f(x + 2 * h) + 16 * f(x + h) - 30 * f(x) + 16 * f(x - h) - f(x - 2 * h)) / (12 * h * h);
    return deriv(t => deriv(f, t, n - 1), x);
  }
  function integrate(f, a, b, tol = 1e-10) {
    if (a === b) return 0;
    if (a > b) return -integrate(f, b, a, tol);
    // 가우스-르장드르 15점을 구간 나누어 적용 (적응형)
    const xg = [0, 0.2011940939974345, 0.3941513470775634, 0.5709721726085388, 0.7244177313601701, 0.8482065834104272, 0.9372733924007060, 0.9879925180204854];
    const wg = [0.2025782419255613, 0.1984314853271116, 0.1861610000155622, 0.1662692058169939, 0.1395706779261543, 0.1071592204671719, 0.0703660474881081, 0.0307532419961173];
    const gl = (lo, hi) => {
      const c = (lo + hi) / 2, h = (hi - lo) / 2; let s = wg[0] * f(c);
      for (let i = 1; i < 8; i++) s += wg[i] * (f(c - h * xg[i]) + f(c + h * xg[i]));
      return s * h;
    };
    const rec = (lo, hi, whole, depth) => {
      const m = (lo + hi) / 2, l = gl(lo, m), r = gl(m, hi);
      if (depth > 18 || Math.abs(l + r - whole) < tol * Math.max(1, Math.abs(whole))) return l + r;
      return rec(lo, m, l, depth + 1) + rec(m, hi, r, depth + 1);
    };
    return rec(a, b, gl(a, b), 0);
  }
  function bisect(f, a, b) {
    let fa = f(a);
    for (let i = 0; i < 200; i++) {
      const m = (a + b) / 2, fm = f(m);
      if (fm === 0 || (b - a) / 2 < 1e-14 * Math.max(1, Math.abs(m))) return m;
      if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
    }
    return (a + b) / 2;
  }
  /** [a, b] 에서 f(x) = 0 의 근 (부호 변화 + 극소값이 0 에 닿는 중근) */
  function roots(f, a, b, n = 4000) {
    const out = [];
    const h = (b - a) / n;
    let x0 = a, y0 = f(a);
    const push = (r) => { if (!out.some(q => Math.abs(q - r) < 1e-7 * Math.max(1, Math.abs(r)))) out.push(r); };
    if (Math.abs(y0) < 1e-12) push(a);
    for (let i = 1; i <= n; i++) {
      const x1 = a + i * h, y1 = f(x1);
      if (!isFinite(y0) || !isFinite(y1)) { x0 = x1; y0 = y1; continue; }
      if (Math.abs(y1) < 1e-12) push(x1);
      else if (y0 * y1 < 0) {
        const r = bisect(f, x0, x1);
        if (Math.abs(f(r)) < 1e-6 * Math.max(1, Math.abs(y0), Math.abs(y1))) push(r); // 점근선 제외
      }
      x0 = x1; y0 = y1;
    }
    // 중근: |f| 의 극소가 0 에 가까운 곳
    for (let i = 1; i < n; i++) {
      const xm = a + i * h, y_ = Math.abs(f(xm - h)), y = Math.abs(f(xm)), y2 = Math.abs(f(xm + h));
      if (y <= y_ && y <= y2 && y < 1e-6) {
        let lo = xm - h, hi = xm + h;
        for (let k = 0; k < 100; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1; }
        const r = (lo + hi) / 2; if (Math.abs(f(r)) < 1e-9) push(r);
      }
    }
    return out.sort((p, q) => p - q);
  }
  /** [a, b] 에서 극값 (f' = 0) 과 최대·최소 */
  function extrema(f, a, b) {
    const d = x => deriv(f, x);
    const crit = roots(d, a, b, 2000).filter(x => x > a + 1e-9 && x < b - 1e-9);
    const list = crit.map(x => {
      const d2 = deriv(f, x, 2);
      return { x, y: f(x), kind: d2 < -1e-7 ? '극대' : d2 > 1e-7 ? '극소' : '변곡(정류)' };
    });
    const cand = [{ x: a, y: f(a) }, { x: b, y: f(b) }, ...list];
    const max = cand.reduce((m, c) => (c.y > m.y ? c : m)), min = cand.reduce((m, c) => (c.y < m.y ? c : m));
    return { list, max, min };
  }
  /** exact() 에서 근삿값 괄호를 뺀 짧은 꼴 (좌표 안에 쓰기) */
  const exactShort = (x) => exact(x).replace(/ <span class="muted">.*<\/span>$/, '');
  function round(x, d = 10) { const r = Number(x.toPrecision(d)); return Math.abs(r) < 1e-12 ? 0 : r; }

  /** 결과 표 만들기: rows = [[이름, 값], …] */
  function table(rows, head) {
    return `<div class="tbl"><table>${head ? `<tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>` : ''}${rows.map(r =>
      `<tr>${r.map((c, i) => (i === 0 && !head ? `<th>${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</table></div>`;
  }
  const vec = (v) => `(${v.map(x => fmt(x)).join(', ')})`;

  K.num = { frac, fmt, fmt2, dec, exact, exactShort, sqrtForm, gcd, polyStr, linStr, deriv, integrate, roots, extrema, bisect, round, table, vec };
})();
