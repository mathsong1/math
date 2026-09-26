/*
 * 통계 분포와 특수함수 (Commons Math 의 distribution / special 대신)
 *  정규, t, χ², F, 감마, 이항, 포아송, 기하, 초기하 분포
 *  erf, 불완전 감마 P(a,x), 불완전 베타 I(x;a,b), 베셀 J
 */
(function () {
  const K = (window.KPHS = window.KPHS || {});
  const { lgamma, gamma } = K.expr;

  /* ---------- 불완전 감마 / 베타 ---------- */
  function gammaP(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) { // 급수
      let sum = 1 / a, del = sum, ap = a;
      for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; }
      return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
    }
    return 1 - gammaQcf(a, x);
  }
  function gammaQcf(a, x) { // 연분수
    let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break;
    }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
  const gammaQ = (a, x) => 1 - gammaP(a, x);
  function betacf(a, b, x) {
    const qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
    for (let m = 1; m <= 1000; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break;
    }
    return h;
  }
  function betaI(x, a, b) { // 정규화된 불완전 베타 I_x(a,b)
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  const lbeta = (a, b) => lgamma(a) + lgamma(b) - lgamma(a + b);
  const beta = (a, b) => Math.exp(lbeta(a, b));
  function erf(x) { return x >= 0 ? gammaP(0.5, x * x) : -gammaP(0.5, x * x); }
  const erfc = (x) => (x >= 0 ? gammaQ(0.5, x * x) : 1 + gammaP(0.5, x * x));

  /** 역함수: 단조증가 cdf 를 이분법으로 */
  function invert(cdf, p, lo, hi) {
    if (p <= 0) return lo; if (p >= 1) return hi;
    while (cdf(hi) < p) hi *= 2;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (cdf(m) < p) lo = m; else hi = m; if (hi - lo < 1e-13 * Math.max(1, Math.abs(m))) break; }
    return (lo + hi) / 2;
  }

  /* ---------- 연속 분포 ---------- */
  const normal = {
    pdf: (x, m = 0, s = 1) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)),
    cdf: (x, m = 0, s = 1) => 0.5 * erfc(-(x - m) / (s * Math.SQRT2)),
    inv(p, m = 0, s = 1) {
      if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
      // Acklam 근사 + 뉴턴 보정
      const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239];
      const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
      const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
      const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
      let x; const pl = 0.02425;
      if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
      else if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
      else { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
      for (let i = 0; i < 2; i++) { const e = normal.cdf(x) - p; x -= e / normal.pdf(x); }
      return m + s * x;
    }
  };
  const tdist = {
    pdf: (x, n) => Math.exp(lgamma((n + 1) / 2) - lgamma(n / 2)) / Math.sqrt(n * Math.PI) * (1 + x * x / n) ** (-(n + 1) / 2),
    cdf(x, n) { const ib = betaI(n / (n + x * x), n / 2, 0.5); return x >= 0 ? 1 - ib / 2 : ib / 2; },
    inv(p, n) { if (p === 0.5) return 0; return p > 0.5 ? invert(x => tdist.cdf(x, n), p, 0, 10) : -tdist.inv(1 - p, n); }
  };
  const chi2 = {
    pdf: (x, k) => (x <= 0 ? 0 : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - lgamma(k / 2))),
    cdf: (x, k) => gammaP(k / 2, x / 2),
    inv: (p, k) => invert(x => chi2.cdf(x, k), p, 0, Math.max(10, 3 * k))
  };
  const fdist = {
    pdf: (x, a, b) => (x <= 0 ? 0 : Math.exp(0.5 * (a * Math.log(a * x) + b * Math.log(b) - (a + b) * Math.log(a * x + b)) - Math.log(x) - lbeta(a / 2, b / 2))),
    cdf: (x, a, b) => (x <= 0 ? 0 : betaI(a * x / (a * x + b), a / 2, b / 2)),
    inv: (p, a, b) => invert(x => fdist.cdf(x, a, b), p, 0, 10)
  };
  const gammaDist = { // 모양 k, 척도 θ
    pdf: (x, k, th) => (x <= 0 ? 0 : Math.exp((k - 1) * Math.log(x) - x / th - lgamma(k) - k * Math.log(th))),
    cdf: (x, k, th) => gammaP(k, x / th),
    inv: (p, k, th) => invert(x => gammaDist.cdf(x, k, th), p, 0, Math.max(10, 3 * k * th))
  };

  /* ---------- 이산 분포 ---------- */
  const lchoose = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
  const binom = {
    pmf: (k, n, p) => (k < 0 || k > n ? 0 : p === 0 ? (k === 0 ? 1 : 0) : p === 1 ? (k === n ? 1 : 0) : Math.exp(lchoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p))),
    cdf: (k, n, p) => (k < 0 ? 0 : k >= n ? 1 : 1 - betaI(p, k + 1, n - k))
  };
  const poisson = {
    pmf: (k, m) => (k < 0 ? 0 : Math.exp(k * Math.log(m) - m - lgamma(k + 1))),
    cdf: (k, m) => (k < 0 ? 0 : gammaQ(k + 1, m))
  };
  const geom = { // 첫 성공까지 시행 횟수 X = 1, 2, …
    pmf: (k, p) => (k < 1 ? 0 : (1 - p) ** (k - 1) * p),
    cdf: (k, p) => (k < 1 ? 0 : 1 - (1 - p) ** k)
  };
  const hyper = { // 모집단 N, 성공 K, 뽑는 수 n
    pmf: (k, N, Kk, n) => (k < Math.max(0, n - (N - Kk)) || k > Math.min(n, Kk) ? 0 : Math.exp(lchoose(Kk, k) + lchoose(N - Kk, n - k) - lchoose(N, n))),
    cdf(k, N, Kk, n) { let s = 0; for (let i = 0; i <= k; i++) s += hyper.pmf(i, N, Kk, n); return Math.min(1, s); }
  };

  /* ---------- 베셀 함수 J_α(x) ---------- */
  function besselJ(a, x) {
    if (x === 0) return a === 0 ? 1 : 0;
    if (Math.abs(x) > 25 + a) { // 점근 전개
      const w = x - a * Math.PI / 2 - Math.PI / 4, mu = 4 * a * a;
      const P = 1 - (mu - 1) * (mu - 9) / (2 * (8 * x) ** 2), Q = (mu - 1) / (8 * x) - (mu - 1) * (mu - 9) * (mu - 25) / (6 * (8 * x) ** 3);
      return Math.sqrt(2 / (Math.PI * x)) * (P * Math.cos(w) - Q * Math.sin(w));
    }
    let s = 0;
    for (let m = 0; m < 200; m++) {
      const t = (m % 2 ? -1 : 1) * Math.exp((2 * m + a) * Math.log(Math.abs(x) / 2) - lgamma(m + 1) - lgamma(m + a + 1));
      s += t; if (Math.abs(t) < 1e-17 * Math.abs(s) && m > 5) break;
    }
    return s;
  }

  /* ---------- 기술통계 ---------- */
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const mean = (a) => sum(a) / a.length;
  const variance = (a, sample = true) => { const m = mean(a); return sum(a.map(v => (v - m) ** 2)) / (a.length - (sample ? 1 : 0)); };
  function quantile(a, p) { // 선형 보간 (엑셀 QUARTILE.INC 와 같음)
    const s = a.slice().sort((x, y) => x - y), h = (s.length - 1) * p, lo = Math.floor(h);
    return s[lo] + (h - lo) * ((s[lo + 1] ?? s[lo]) - s[lo]);
  }
  function ranks(a) { // 동점은 평균 순위
    const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rk = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = rk; i = j + 1; }
    return r;
  }

  K.stats = { gammaP, gammaQ, betaI, beta, lbeta, erf, erfc, gamma, lgamma, invert, normal, tdist, chi2, fdist, gammaDist, binom, poisson, geom, hyper, besselJ, sum, mean, variance, quantile, ranks, lchoose };
})();
