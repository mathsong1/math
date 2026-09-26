/*
 * 이산통계 모듈 (원본: StasticsUMP_5.java)
 *  통계값, 신뢰구간, 회귀분석, 비모수추론, 통계표
 */
(function () {
  const K = window.KPHS, { register } = K;
  const N = K.num, E = K.expr, S = K.stats, L = K.la;
  const d = (x, k = 6) => N.dec(x, k);
  const pct = (c) => `${d(c * 100, 6)}%`;

  /** '1, 2, 3; 0.95' → { data, rest:[…] } */
  function dataAnd(s, restNames = []) {
    const parts = s.split(';').map(t => t.trim()).filter(Boolean);
    const data = E.nums(parts[0]);
    const rest = parts.slice(1).map(E.num);
    if (restNames.length && rest.length < restNames.length) throw new Error(`자료 뒤에 ; 를 쓰고 ${restNames.join(', ')} 을(를) 입력하세요.`);
    return { data, rest };
  }
  const conf = (c) => { if (!(c > 0 && c < 1)) throw new Error('신뢰도는 0 과 1 사이 (예: 0.95) 입니다.'); return c; };
  const pv = (p) => (p < 1e-4 ? p.toExponential(3) : d(p, 5));
  const verdict = (p, a) => (p < a ? `<span class="ok">유의수준 ${a} 에서 귀무가설 기각</span>` : `유의수준 ${a} 에서 귀무가설 채택 (기각 못함)`);
  function pmfPlot(pairs, label) { // 이산분포 막대
    return (el) => {
      const box = document.createElement('div'); el.appendChild(box);
      const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]);
      const pl = K.plot.create(box, { view: [Math.min(...xs) - 1, Math.max(...xs) + 1, -Math.max(...ys) * 0.08, Math.max(...ys) * 1.15] });
      pairs.forEach(([x, y]) => pl.add({ type: 'poly', pts: [[x, 0], [x, y]], width: 6, color: K.plot.PALETTE[0] }));
      pl.add({ type: 'points', pts: [], label });
    };
  }
  function pdfPlot(f, a, b, label, shade) {
    return (el) => {
      const box = document.createElement('div'); el.appendChild(box);
      let mx = 0; for (let i = 0; i <= 200; i++) { const v = f(a + (b - a) * i / 200); if (isFinite(v)) mx = Math.max(mx, v); }
      const pl = K.plot.create(box, { view: [a, b, -mx * 0.08, mx * 1.15] });
      if (shade) pl.add({ type: 'area', f, a: Math.max(a, shade[0]), b: Math.min(b, shade[1]) });
      pl.add({ type: 'fx', f, label });
    };
  }

  /* ---------------- 통계값 ---------------- */
  function summary(x, w) { // w: 도수 (선택)
    if (w) { const ex = []; x.forEach((v, i) => { for (let k = 0; k < w[i]; k++) ex.push(v); }); x = ex; }
    const n = x.length; if (n < 1) throw new Error('자료를 입력하세요.');
    const m = S.mean(x), s = x.slice().sort((a, b) => a - b);
    const vp = S.variance(x, false), vs = n > 1 ? S.variance(x, true) : NaN;
    const q1 = S.quantile(x, 0.25), q2 = S.quantile(x, 0.5), q3 = S.quantile(x, 0.75);
    const freq = new Map(); x.forEach(v => freq.set(v, (freq.get(v) || 0) + 1));
    const maxF = Math.max(...freq.values()), modes = [...freq].filter(([, f]) => f === maxF).map(([v]) => v);
    const m3 = S.mean(x.map(v => (v - m) ** 3)), m4 = S.mean(x.map(v => (v - m) ** 4));
    const rows = [['자료 수 n', n], ['합 Σx', d(S.sum(x))], ['평균 x̄', N.fmt2(m)],
      ['분산 (모집단, ÷n)', N.fmt2(vp)], ['표준편차 (모집단)', d(Math.sqrt(vp), 8)],
      ['분산 s² (표본, ÷(n−1))', n > 1 ? N.fmt2(vs) : '−'], ['표준편차 s (표본)', n > 1 ? d(Math.sqrt(vs), 8) : '−'],
      ['최솟값 / 최댓값', `${d(s[0])} / ${d(s[n - 1])}`], ['범위', d(s[n - 1] - s[0])],
      ['Q1 / 중앙값 / Q3', `${d(q1)} / ${d(q2)} / ${d(q3)}`], ['사분위범위 IQR', d(q3 - q1)],
      ['최빈값', maxF > 1 ? `${modes.map(v => d(v)).join(', ')} (${maxF}회)` : '없음'],
      ['변동계수 CV', m ? pct(Math.sqrt(n > 1 ? vs : vp) / Math.abs(m)) : '−'],
      ['왜도 / 첨도', vp > 0 ? `${d(m3 / vp ** 1.5, 5)} / ${d(m4 / vp ** 2 - 3, 5)}` : '−']];
    const ftab = N.table([...freq].sort((a, b) => a[0] - b[0]).slice(0, 40).map(([v, f]) => [d(v), f, d(f / n, 4)]), ['값', '도수', '상대도수']);
    return { html: N.table(rows) + `<h4>도수분포</h4>${ftab}`, mount: pmfPlot([...freq].sort((a, b) => a[0] - b[0]).map(([v, f]) => [v, f]), '도수') };
  }
  register('statistics', 'summary', {
    ops: [
      { id: 'raw', name: '자료 입력', help: [['3, 5, 7, 7, 9, 10, 12', ''], ['72 85 90 66 78 95 88 70 84 91', '빈칸으로 나눠도 됨']], run: (s) => summary(E.nums(s)) },
      {
        id: 'freq', name: '도수분포표 입력  (값, 도수)',
        help: [['(10, 3), (20, 5), (30, 8), (40, 4)', '계급값과 도수'], ['(1, 2) (2, 5) (3, 9) (4, 3) (5, 1)', '']],
        run(s) { const pts = E.points(s, 2); return summary(pts.map(p => p[0]), pts.map(p => { if (!Number.isInteger(p[1]) || p[1] < 0) throw new Error('도수는 0 이상의 정수'); return p[1]; })); }
      },
      {
        id: 'two', name: '두 변량  (공분산, 상관계수)',
        help: [['(1, 2), (2, 4), (3, 5), (4, 4), (5, 5)', '(x, y) 쌍']],
        run(s) {
          const pts = E.points(s, 2), x = pts.map(p => p[0]), y = pts.map(p => p[1]), n = x.length;
          const mx = S.mean(x), my = S.mean(y), sxy = S.sum(x.map((v, i) => (v - mx) * (y[i] - my)));
          const sxx = S.sum(x.map(v => (v - mx) ** 2)), syy = S.sum(y.map(v => (v - my) ** 2)), r = sxy / Math.sqrt(sxx * syy);
          return N.table([['n', n], ['x̄, ȳ', `${d(mx)}, ${d(my)}`], ['공분산 (÷n)', N.fmt2(sxy / n)], ['공분산 (÷(n−1))', N.fmt2(sxy / (n - 1))], ['상관계수 r', d(r, 8)], ['결정계수 r²', d(r * r, 8)]]);
        }
      }
    ]
  });

  /* ---------------- 신뢰구간 ---------------- */
  register('statistics', 'ci', {
    ops: [
      {
        id: 'meanZ', name: '모평균  (σ 를 알 때, Z)',
        note: '입력: 표본평균 x̄, 모표준편차 σ, 표본 크기 n, 신뢰도',
        help: [['52.3, 4, 36, 0.95', ''], ['170, 6, 100, 0.99', '']],
        run(s) {
          const [xb, sg, n, c] = E.nums(s); conf(c);
          const z = S.normal.inv(1 - (1 - c) / 2), e = z * sg / Math.sqrt(n);
          return `<p>z<sub>α/2</sub> = z<sub>${d((1 - c) / 2, 4)}</sub> = ${d(z, 6)},  오차 한계 = z·σ/√n = ${d(e, 6)}</p><p>${pct(c)} 신뢰구간: <b>${d(xb - e, 8)} ≤ μ ≤ ${d(xb + e, 8)}</b></p>`;
        }
      },
      {
        id: 'meanT', name: '모평균  (σ 를 모를 때, t)',
        note: '입력: 자료 ; 신뢰도   또는   x̄, s, n, 신뢰도',
        help: [['12.1, 11.8, 12.5, 12.0, 11.6, 12.3, 12.2; 0.95', '자료로'], ['25.4, 3.2, 16, 0.95', '요약값으로']],
        run(s) {
          let xb, sd, n, c;
          if (s.includes(';')) { const { data, rest } = dataAnd(s, ['신뢰도']); n = data.length; xb = S.mean(data); sd = Math.sqrt(S.variance(data)); c = rest[0]; }
          else [xb, sd, n, c] = E.nums(s);
          conf(c); const t = S.tdist.inv(1 - (1 - c) / 2, n - 1), e = t * sd / Math.sqrt(n);
          return `<p>x̄ = ${d(xb, 8)}, s = ${d(sd, 8)}, n = ${n}, 자유도 ${n - 1}</p><p>t<sub>α/2</sub>(${n - 1}) = ${d(t, 6)},  오차 한계 = t·s/√n = ${d(e, 6)}</p><p>${pct(c)} 신뢰구간: <b>${d(xb - e, 8)} ≤ μ ≤ ${d(xb + e, 8)}</b></p>`;
        }
      },
      {
        id: 'prop', name: '모비율',
        note: '입력: 성공 횟수 x, 시행 횟수 n, 신뢰도',
        help: [['120, 400, 0.95', ''], ['37, 50, 0.99', '']],
        run(s) {
          const [x, n, c] = E.nums(s); conf(c); const p = x / n, z = S.normal.inv(1 - (1 - c) / 2), e = z * Math.sqrt(p * (1 - p) / n);
          return `<p>p̂ = ${x}/${n} = ${d(p, 8)},  z = ${d(z, 6)},  오차 한계 = z√(p̂(1−p̂)/n) = ${d(e, 6)}</p><p>${pct(c)} 신뢰구간: <b>${d(p - e, 6)} ≤ p ≤ ${d(p + e, 6)}</b></p>${n * p < 5 || n * (1 - p) < 5 ? '<p class="err">np̂, n(1−p̂) 가 5 미만이라 정규근사가 부정확합니다.</p>' : ''}`;
        }
      },
      {
        id: 'var', name: '모분산  (χ²)',
        note: '입력: 자료 ; 신뢰도   또는   s², n, 신뢰도',
        help: [['4.2, 4.8, 5.1, 3.9, 4.5, 5.0, 4.4; 0.95', ''], ['2.5, 20, 0.95', 's² = 2.5, n = 20']],
        run(s) {
          let s2, n, c;
          if (s.includes(';')) { const { data, rest } = dataAnd(s, ['신뢰도']); n = data.length; s2 = S.variance(data); c = rest[0]; } else [s2, n, c] = E.nums(s);
          conf(c); const a = (1 - c) / 2, lo = S.chi2.inv(1 - a, n - 1), hi = S.chi2.inv(a, n - 1);
          return `<p>s² = ${d(s2, 8)}, n = ${n},  χ²<sub>${d(a, 4)}</sub>(${n - 1}) = ${d(lo, 6)},  χ²<sub>${d(1 - a, 4)}</sub>(${n - 1}) = ${d(hi, 6)}</p>
            <p>${pct(c)} 신뢰구간: <b>${d((n - 1) * s2 / lo, 8)} ≤ σ² ≤ ${d((n - 1) * s2 / hi, 8)}</b></p><p>σ: ${d(Math.sqrt((n - 1) * s2 / lo), 8)} ≤ σ ≤ ${d(Math.sqrt((n - 1) * s2 / hi), 8)}</p>`;
        }
      },
      {
        id: 'ratio', name: '두 모분산의 비  (F)',
        note: '입력: 자료1 | 자료2 ; 신뢰도',
        help: [['20, 22, 19, 24, 25, 21 | 18, 30, 25, 29, 15, 22, 27; 0.95', '']],
        run(s) {
          const [body, cs] = s.split(';'), [a, b] = body.split('|').map(E.nums); const c = conf(E.num(cs));
          const s1 = S.variance(a), s2 = S.variance(b), n1 = a.length - 1, n2 = b.length - 1, al = (1 - c) / 2;
          const fU = S.fdist.inv(1 - al, n1, n2), fL = S.fdist.inv(al, n1, n2), r = s1 / s2;
          return `<p>s₁² = ${d(s1)}, s₂² = ${d(s2)}, s₁²/s₂² = ${d(r)},  F<sub>${d(al, 3)}</sub>(${n1}, ${n2}) = ${d(fU)}, F<sub>${d(1 - al, 3)}</sub>(${n1}, ${n2}) = ${d(fL)}</p>
            <p>${pct(c)} 신뢰구간: <b>${d(r / fU)} ≤ σ₁²/σ₂² ≤ ${d(r / fL)}</b></p><p class="muted">구간에 1 이 ${r / fU <= 1 && 1 <= r / fL ? '들어 있으므로 두 분산이 같다고 볼 수 있습니다.' : '없으므로 두 분산이 다르다고 볼 수 있습니다.'}</p>`;
        }
      },
      {
        id: 'diff', name: '두 모평균의 차  (t 검정)',
        note: '입력: 자료1 | 자료2 ; 신뢰도  (웰치 방법, 등분산 가정 안 함)',
        help: [['85, 90, 78, 92, 88, 76, 95 | 80, 72, 84, 70, 79, 75; 0.95', '']],
        run(s) {
          const [body, cs] = s.split(';'), [a, b] = body.split('|').map(E.nums); const c = conf(E.num(cs ?? '0.95'));
          const m1 = S.mean(a), m2 = S.mean(b), v1 = S.variance(a) / a.length, v2 = S.variance(b) / b.length, se = Math.sqrt(v1 + v2);
          const df = (v1 + v2) ** 2 / (v1 * v1 / (a.length - 1) + v2 * v2 / (b.length - 1));
          const t = (m1 - m2) / se, p = 2 * (1 - S.tdist.cdf(Math.abs(t), df)), tc = S.tdist.inv(1 - (1 - c) / 2, df);
          return `<p>x̄₁ = ${d(m1)}, x̄₂ = ${d(m2)}, 차 = ${d(m1 - m2)}, 표준오차 = ${d(se)}, 자유도 ≈ ${d(df, 5)}</p>
            <p>${pct(c)} 신뢰구간: <b>${d(m1 - m2 - tc * se)} ≤ μ₁ − μ₂ ≤ ${d(m1 - m2 + tc * se)}</b></p>
            <p>H₀: μ₁ = μ₂ 검정 — t = ${d(t)}, p-값 = ${pv(p)} → ${verdict(p, +(1 - c).toFixed(6))}</p>`;
        }
      },
      {
        id: 'size', name: '표본 크기 정하기',
        note: '입력: σ, 허용 오차 d, 신뢰도  → n ≥ (z·σ/d)²  (체비쇼프 부등식 기준도 함께)',
        help: [['5, 1, 0.95', ''], ['12, 2, 0.99', '']],
        run(s) {
          const [sg, e, c] = E.nums(s); conf(c); const z = S.normal.inv(1 - (1 - c) / 2), n = (z * sg / e) ** 2, nc = sg * sg / ((1 - c) * e * e);
          return `<p>정규분포 기준: n ≥ (${d(z, 5)}×${d(sg)}/${d(e)})² = ${d(n, 6)} → <b>n = ${Math.ceil(n - 1e-9)}</b></p><p>모집단 분포를 모를 때 (체비쇼프): n ≥ σ²/(α·d²) = ${d(nc, 6)} → <b>n = ${Math.ceil(nc - 1e-9)}</b></p>`;
        }
      },
      {
        id: 'testT', name: '모평균 가설검정  (t)',
        note: '입력: 자료 ; μ₀ ; 유의수준',
        help: [['12.1, 11.8, 12.5, 12.0, 11.6, 12.3, 12.2; 12.5; 0.05', 'H₀: μ = 12.5']],
        run(s) {
          const { data, rest: [mu0, al] } = dataAnd(s, ['μ₀', '유의수준']); const n = data.length, m = S.mean(data), sd = Math.sqrt(S.variance(data));
          const t = (m - mu0) / (sd / Math.sqrt(n)), p2 = 2 * (1 - S.tdist.cdf(Math.abs(t), n - 1));
          return `<p>x̄ = ${d(m)}, s = ${d(sd)}, n = ${n},  t = (x̄ − μ₀)/(s/√n) = <b>${d(t)}</b></p>
            <p>양측 p-값 = ${pv(p2)},  한쪽 p-값 = ${pv(p2 / 2)}</p><p>양측검정: ${verdict(p2, al)}</p>`;
        }
      }
    ]
  });

  /* ---------------- 회귀분석 ---------------- */
  function regress(pts, deg, xf = (x) => x, yf = (y) => y) {
    const X = pts.map(([x]) => [...Array(deg + 1).keys()].map(k => xf(x) ** k)), y = pts.map(([, v]) => yf(v));
    const Xt = L.T(X), XtX = L.mul(Xt, X), beta = L.mv(L.inv(XtX), L.mv(Xt, y));
    const yh = X.map(r => L.dot(r, beta)), n = pts.length, p = deg + 1, ym = S.mean(y);
    const sse = S.sum(y.map((v, i) => (v - yh[i]) ** 2)), sst = S.sum(y.map(v => (v - ym) ** 2)), ssr = sst - sse;
    const mse = sse / (n - p), cov = L.scale(L.inv(XtX), mse), se = beta.map((_, i) => Math.sqrt(cov[i][i]));
    const F = (ssr / (p - 1)) / mse, pF = 1 - S.fdist.cdf(F, p - 1, n - p);
    return { beta, se, sse, sst, ssr, mse, r2: 1 - sse / sst, F, pF, n, p, cov, yh };
  }
  const coefTable = (R, names) => N.table(R.beta.map((b, i) => {
    const t = b / R.se[i], p = 2 * (1 - S.tdist.cdf(Math.abs(t), R.n - R.p));
    return [names[i], d(b, 8), d(R.se[i], 6), d(t, 5), pv(p)];
  }), ['계수', '추정값', '표준오차', 't', 'p-값']);
  const anova = (R) => N.table([['회귀', d(R.ssr), R.p - 1, d(R.ssr / (R.p - 1)), d(R.F, 5), pv(R.pF)], ['잔차', d(R.sse), R.n - R.p, d(R.mse), '', ''], ['합계', d(R.sst), R.n - 1, '', '', '']], ['요인', '제곱합', '자유도', '평균제곱', 'F', 'p-값']);
  const scatterMount = (pts, f, label) => (el) => {
    const box = document.createElement('div'); el.appendChild(box);
    const v = K.plot.autoView([pts], 0.2);
    K.plot.create(box, { view: v }).add({ type: 'points', pts: pts.map(p => [p[0], p[1]]), label: '자료' }).add({ type: 'fx', f, label });
  };
  function withPredict(s) { const [a, b] = s.split(';'); return { pts: E.points(a, 2), x0: b !== undefined ? E.num(b.replace(/x\s*=/, '')) : null }; }

  register('statistics', 'regression', {
    ops: [
      {
        id: 'linear', name: '회귀직선  y = a + bx',
        note: '입력: (x, y) 점들   ; x 값 을 붙이면 그 점에서 예측값과 구간',
        help: [['(1, 2), (2, 4), (3, 5), (4, 4), (5, 5)', ''], ['(20, 65), (25, 70), (30, 72), (35, 80), (40, 83), (45, 88); 50', 'x = 50 예측']],
        run(s) {
          const { pts, x0 } = withPredict(s); if (pts.length < 3) throw new Error('점이 3개 이상 필요합니다.');
          const R = regress(pts, 1), [a, b] = R.beta, r = Math.sign(b) * Math.sqrt(R.r2);
          let h = `<p>회귀직선: <b>ŷ = ${d(a, 8)} ${b < 0 ? '−' : '+'} ${d(Math.abs(b), 8)}x</b></p><p>상관계수 r = ${d(r, 6)},  결정계수 R² = ${d(R.r2, 6)},  추정 표준오차 = ${d(Math.sqrt(R.mse), 6)}</p>`;
          h += `<h4>계수 검정 (H₀: 계수 = 0)</h4>${coefTable(R, ['a (절편)', 'b (기울기)'])}<h4>분산분석</h4>${anova(R)}`;
          if (x0 !== null) {
            const xm = S.mean(pts.map(p => p[0])), sxx = S.sum(pts.map(p => (p[0] - xm) ** 2)), yh = a + b * x0, t = S.tdist.inv(0.975, R.n - 2);
            const eM = t * Math.sqrt(R.mse * (1 / R.n + (x0 - xm) ** 2 / sxx)), eP = t * Math.sqrt(R.mse * (1 + 1 / R.n + (x0 - xm) ** 2 / sxx));
            h += `<h4>x = ${d(x0)} 에서 예측</h4><p>ŷ = <b>${d(yh, 8)}</b></p><p>평균 반응의 95% 신뢰구간: ${d(yh - eM)} ~ ${d(yh + eM)}</p><p>개별 값의 95% 예측구간: ${d(yh - eP)} ~ ${d(yh + eP)}</p>`;
          }
          return { html: h, mount: scatterMount(pts, x => a + b * x, 'ŷ = a + bx') };
        }
      },
      {
        id: 'quad', name: '이차 회귀곡선  y = a + bx + cx²',
        help: [['(0, 3), (1, 2), (2, 4), (3, 4)', ''], ['(1, 1.2), (2, 3.9), (3, 9.1), (4, 16.3), (5, 24.8), (6, 36.1)', '']],
        run(s) {
          const { pts } = withPredict(s); if (pts.length < 4) throw new Error('점이 4개 이상 필요합니다.');
          const R = regress(pts, 2), [a, b, c] = R.beta;
          return { html: `<p>회귀곡선: <b>ŷ = ${N.polyStr([a, b, c].map(v => +v.toPrecision(8)))}</b></p><p>결정계수 R² = ${d(R.r2, 6)}</p><h4>계수 검정</h4>${coefTable(R, ['a', 'b', 'c'])}<h4>분산분석</h4>${anova(R)}`, mount: scatterMount(pts, x => a + b * x + c * x * x, '이차 회귀') };
        }
      },
      {
        id: 'exp', name: '지수 회귀  y = a·e^(bx)',
        note: 'ln y = ln a + bx 로 바꾸어 직선 회귀 (y > 0)',
        help: [['(0, 2.1), (1, 3.4), (2, 5.8), (3, 9.9), (4, 16.2)', '']],
        run(s) {
          const { pts } = withPredict(s); if (pts.some(p => p[1] <= 0)) throw new Error('y 가 모두 양수여야 합니다.');
          const R = regress(pts, 1, x => x, Math.log), a = Math.exp(R.beta[0]), b = R.beta[1];
          return { html: `<p>회귀곡선: <b>ŷ = ${d(a, 8)}·e<sup>${d(b, 8)}x</sup></b></p><p>ln y 에 대한 결정계수 R² = ${d(R.r2, 6)}</p><p class="muted">두 배가 되는 x 간격: ln2 / b = ${d(Math.LN2 / b, 6)}</p>`, mount: scatterMount(pts, x => a * Math.exp(b * x), '지수 회귀') };
        }
      }
    ]
  });

  /* ---------------- 비모수추론 ---------------- */
  function signedRankDist(n) { // W+ 의 분포 (정확)
    const max = n * (n + 1) / 2, c = new Array(max + 1).fill(0); c[0] = 1;
    for (let k = 1; k <= n; k++) for (let w = max; w >= k; w--) c[w] += c[w - k];
    const tot = 2 ** n; return c.map(v => v / tot);
  }
  function rankSumDist(n1, n2) { // 작은 표본 순위합 W 의 분포 (동점 없음, 정확)
    const N2 = n1 + n2, dp = Array.from({ length: n1 + 1 }, () => new Map()); dp[0].set(0, 1);
    for (let r = 1; r <= N2; r++) for (let k = Math.min(r, n1); k >= 1; k--) for (const [w, c] of dp[k - 1]) dp[k].set(w + r, (dp[k].get(w + r) || 0) + c);
    const tot = [...dp[n1].values()].reduce((a, b) => a + b, 0); const m = new Map(); for (const [w, c] of dp[n1]) m.set(w, c / tot); return m;
  }
  register('statistics', 'nonparam', {
    ops: [
      {
        id: 'sign', name: '부호검정',
        note: '입력: 자료 ; 중앙값 m₀ ; 유의수준 (m₀ 와 같은 값은 버림)',
        help: [['12, 15, 9, 20, 17, 14, 22, 11, 18, 16; 13; 0.05', 'H₀: 중앙값 = 13']],
        run(s) {
          const { data, rest: [m0, al = 0.05] } = dataAnd(s, ['m₀']); const pos = data.filter(v => v > m0).length, neg = data.filter(v => v < m0).length, n = pos + neg, k = Math.min(pos, neg);
          const p = Math.min(1, 2 * S.binom.cdf(k, n, 0.5));
          return `<p>(+) ${pos}개, (−) ${neg}개, n = ${n}</p><p>X ~ B(${n}, 0.5) 에서 양측 p-값 = 2·P(X ≤ ${k}) = <b>${pv(p)}</b></p><p>${verdict(p, al)}</p>`;
        }
      },
      {
        id: 'wsr', name: '윌콕슨 부호순위검정',
        note: '입력: 자료 ; m₀ ; 유의수준    또는   짝지은 자료  x들 | y들 ; 유의수준',
        help: [['12, 15, 9, 20, 17, 14, 22, 11, 18, 16; 13; 0.05', '한 표본'], ['140, 132, 128, 150, 145, 138, 142 | 135, 130, 129, 141, 139, 136, 137; 0.05', '짝지은 두 표본 (전·후)']],
        run(s) {
          let diffs, al;
          if (s.includes('|')) { const [body, a2] = s.split(';'); const [x, y] = body.split('|').map(E.nums); if (x.length !== y.length) throw new Error('짝지은 자료의 개수가 같아야 합니다.'); diffs = x.map((v, i) => v - y[i]); al = a2 ? E.num(a2) : 0.05; }
          else { const { data, rest: [m0, a2 = 0.05] } = dataAnd(s, ['m₀']); diffs = data.map(v => v - m0); al = a2; }
          diffs = diffs.filter(v => Math.abs(v) > 1e-12); const n = diffs.length, rk = S.ranks(diffs.map(Math.abs));
          const Wp = S.sum(rk.filter((_, i) => diffs[i] > 0)), Wm = S.sum(rk.filter((_, i) => diffs[i] < 0)), W = Math.min(Wp, Wm);
          let p, how;
          if (n <= 25) { const dist = signedRankDist(n); let c = 0; for (let w = 0; w <= Math.floor(W + 1e-9); w++) c += dist[w]; p = Math.min(1, 2 * c); how = '정확한 분포'; }
          else { const mu = n * (n + 1) / 4, sg = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24), z = (W - mu + 0.5) / sg; p = 2 * S.normal.cdf(z); how = `정규근사 z = ${d(z, 5)}`; }
          return N.table(diffs.map((v, i) => [d(v), d(rk[i]), v > 0 ? '+' : '−']), ['차이', '|차이| 순위', '부호']) +
            `<p>W⁺ = ${d(Wp)}, W⁻ = ${d(Wm)}, n = ${n}</p><p>양측 p-값 = <b>${pv(p)}</b> (${how})</p><p>${verdict(p, al)}</p>`;
        }
      },
      {
        id: 'wrs', name: '윌콕슨 순위합검정  (만-휘트니)',
        note: '입력: 자료1 | 자료2 ; 유의수준',
        help: [['85, 90, 78, 92, 88, 76, 95 | 80, 72, 84, 70, 79, 75; 0.05', ''], ['1.8, 2.3, 2.1, 2.9 | 3.1, 2.7, 3.5, 3.3, 2.8; 0.05', '']],
        run(s) {
          const [body, a2] = s.split(';'), al = a2 ? E.num(a2) : 0.05; let [x, y] = body.split('|').map(E.nums);
          const all = [...x, ...y], rk = S.ranks(all), n1 = x.length, n2 = y.length;
          const W1 = S.sum(rk.slice(0, n1)), U = W1 - n1 * (n1 + 1) / 2;
          const ties = new Set(all).size < all.length;
          let p, how;
          if (!ties && n1 + n2 <= 30) {
            const dist = rankSumDist(n1, n2), mu = n1 * (n1 + n2 + 1) / 2; let c = 0;
            for (const [w, pr] of dist) if (Math.abs(w - mu) >= Math.abs(W1 - mu) - 1e-9) c += pr;
            p = Math.min(1, c); how = '정확한 분포';
          } else {
            const mu = n1 * (n1 + n2 + 1) / 2, sg = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12), z = (W1 - mu) / sg; p = 2 * (1 - S.normal.cdf(Math.abs(z))); how = `정규근사 z = ${d(z, 5)}`;
          }
          return `<p>n₁ = ${n1}, n₂ = ${n2},  첫 표본의 순위합 W = <b>${d(W1)}</b>,  U = ${d(U)}</p><p>양측 p-값 = <b>${pv(p)}</b> (${how})</p><p>${verdict(p, al)}</p>`;
        }
      }
    ]
  });

  /* ---------------- 통계표 ---------------- */
  const alphas = [0.1, 0.05, 0.025, 0.01, 0.005];
  register('statistics', 'tables', {
    ops: [
      {
        id: 'normal', name: '정규분포',
        note: 'z 하나 → Φ(z).   μ, σ, x → P(X ≤ x).   μ, σ, a, b → P(a ≤ X ≤ b)',
        help: [['1.96', 'Φ(1.96)'], ['70, 10, 85', 'X ~ N(70, 10²), P(X ≤ 85)'], ['70, 10, 60, 85', 'P(60 ≤ X ≤ 85)']],
        run(s) {
          const a = E.nums(s); let mu = 0, sg = 1, lo = -Infinity, hi;
          if (a.length === 1) hi = a[0]; else if (a.length === 3) [mu, sg, hi] = a; else if (a.length === 4) [mu, sg, lo, hi] = a; else throw new Error('1개, 3개, 또는 4개의 수를 입력하세요.');
          const P = S.normal.cdf(hi, mu, sg) - (isFinite(lo) ? S.normal.cdf(lo, mu, sg) : 0);
          const zs = (v) => d((v - mu) / sg, 6);
          const h = a.length === 1 ? `<p>Φ(${d(hi)}) = P(Z ≤ ${d(hi)}) = <b>${d(P, 8)}</b></p><p>P(Z > ${d(hi)}) = ${d(1 - P, 8)},  P(|Z| ≤ ${d(Math.abs(hi))}) = ${d(2 * S.normal.cdf(Math.abs(hi)) - 1, 8)}</p>`
            : `<p>X ~ N(${d(mu)}, ${d(sg)}²),  ${isFinite(lo) ? `P(${d(lo)} ≤ X ≤ ${d(hi)}) = P(${zs(lo)} ≤ Z ≤ ${zs(hi)})` : `P(X ≤ ${d(hi)}) = P(Z ≤ ${zs(hi)})`} = <b>${d(P, 8)}</b></p>`;
          return { html: h, mount: pdfPlot(x => S.normal.pdf(x, mu, sg), mu - 4 * sg, mu + 4 * sg, `N(${d(mu)}, ${d(sg)}²)`, [isFinite(lo) ? lo : mu - 5 * sg, hi]) };
        }
      },
      {
        id: 'normInv', name: '정규분포 역  (확률 → z)',
        help: [['0.975', ''], ['0.95', ''], ['0.995', '']],
        run(s) { const p = E.num(s); const z = S.normal.inv(p); return `<p>P(Z ≤ z) = ${d(p)} 인 z = <b>${d(z, 8)}</b></p><p>양측: P(|Z| ≤ ${d(Math.abs(z), 6)}) = ${d(2 * S.normal.cdf(Math.abs(z)) - 1, 6)}</p>`; }
      },
      {
        id: 'ztable', name: '표준정규분포표  (0.00 ~ 3.49)',
        help: [['0', '표 전체']],
        run() {
          const rows = []; for (let z = 0; z < 3.5; z += 0.1) rows.push([z.toFixed(1), ...[...Array(10).keys()].map(k => S.normal.cdf(z + k / 100).toFixed(4))]);
          return `<p class="muted">P(Z ≤ z), 행 = 소수 첫째 자리, 열 = 둘째 자리</p>` + N.table(rows, ['z', ...[...Array(10).keys()].map(k => '.0' + k)]);
        }
      },
      {
        id: 'chi2', name: 'χ² 분포',
        note: '자유도 → 임계값 표.   자유도, x → P(X ≤ x)',
        help: [['5', ''], ['5, 11.07', 'P(χ²(5) ≤ 11.07)'], ['1-30', '자유도 1~30 표']],
        run(s) {
          const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
          if (m) { const rows = []; for (let k = +m[1]; k <= +m[2]; k++) rows.push([k, ...alphas.map(a => d(S.chi2.inv(1 - a, k), 5)), ...alphas.slice().reverse().map(a => d(S.chi2.inv(a, k), 5))]); return `<p class="muted">P(X > c) = α 인 c</p>` + N.table(rows, ['자유도', ...alphas.map(a => `α=${a}`), ...alphas.slice().reverse().map(a => `α=${1 - a}`)]); }
          const [k, x] = E.nums(s);
          let h = N.table(alphas.map(a => [`α = ${a}`, d(S.chi2.inv(1 - a, k), 6), d(S.chi2.inv(a, k), 6)]), ['위험률', `χ²<sub>α</sub>(${k}) (오른쪽)`, `χ²<sub>1−α</sub>(${k}) (왼쪽)`]);
          if (x !== undefined) h = `<p>P(χ²(${k}) ≤ ${d(x)}) = <b>${d(S.chi2.cdf(x, k), 8)}</b>,  P(X > ${d(x)}) = ${d(1 - S.chi2.cdf(x, k), 8)}</p>` + h;
          return { html: h, mount: pdfPlot(t => S.chi2.pdf(t, k), 0, Math.max(10, k + 5 * Math.sqrt(2 * k)), `χ²(${k})`, x !== undefined ? [0, x] : null) };
        }
      },
      {
        id: 't', name: 't 분포',
        note: '자유도 → 임계값 표.   자유도, t → P(T ≤ t)',
        help: [['10', ''], ['10, 2.228', ''], ['1-30', '자유도 1~30 표']],
        run(s) {
          const m = s.match(/^(\d+)\s*-\s*(\d+)$/);
          if (m) { const rows = []; for (let k = +m[1]; k <= +m[2]; k++) rows.push([k, ...alphas.map(a => d(S.tdist.inv(1 - a, k), 5))]); rows.push(['∞', ...alphas.map(a => d(S.normal.inv(1 - a), 5))]); return `<p class="muted">P(T > t) = α 인 t</p>` + N.table(rows, ['자유도', ...alphas.map(a => `α=${a}`)]); }
          const [k, x] = E.nums(s);
          let h = N.table(alphas.map(a => [`α = ${a}`, d(S.tdist.inv(1 - a, k), 6)]), ['위험률 (한쪽)', `t<sub>α</sub>(${k})`]);
          if (x !== undefined) h = `<p>P(T ≤ ${d(x)}) = <b>${d(S.tdist.cdf(x, k), 8)}</b>,  P(T > ${d(x)}) = ${d(1 - S.tdist.cdf(x, k), 8)}</p>` + h;
          return { html: h, mount: pdfPlot(t => S.tdist.pdf(t, k), -5, 5, `t(${k})`, x !== undefined ? [-5, x] : null) };
        }
      },
      {
        id: 'f', name: 'F 분포',
        note: 'n₁, n₂ → 임계값.   n₁, n₂, x → P(F ≤ x)',
        help: [['3, 10', ''], ['3, 10, 3.71', ''], ['5, 20', '']],
        run(s) {
          const [a, b, x] = E.nums(s);
          let h = N.table(alphas.map(al => [`α = ${al}`, d(S.fdist.inv(1 - al, a, b), 6)]), ['위험률', `F<sub>α</sub>(${a}, ${b})`]);
          if (x !== undefined) h = `<p>P(F(${a}, ${b}) ≤ ${d(x)}) = <b>${d(S.fdist.cdf(x, a, b), 8)}</b>,  P(F > ${d(x)}) = ${d(1 - S.fdist.cdf(x, a, b), 8)}</p>` + h;
          return { html: h, mount: pdfPlot(t => S.fdist.pdf(t, a, b), 0, Math.max(5, S.fdist.inv(0.995, a, b)), `F(${a}, ${b})`, x !== undefined ? [0, x] : null) };
        }
      },
      {
        id: 'binom', name: '이항분포  B(n, p)',
        note: 'n, p → 분포표.   n, p, k → P(X = k), P(X ≤ k)',
        help: [['10, 0.3', ''], ['10, 0.3, 3', ''], ['100, 0.5, 55', '']],
        run(s) {
          const [n, p, k] = E.nums(s); if (!Number.isInteger(n) || p < 0 || p > 1) throw new Error('n 은 자연수, 0 ≤ p ≤ 1');
          const lo = n > 60 ? Math.max(0, Math.floor(n * p - 4 * Math.sqrt(n * p * (1 - p)))) : 0, hi = n > 60 ? Math.min(n, Math.ceil(n * p + 4 * Math.sqrt(n * p * (1 - p)))) : n;
          const rows = []; for (let i = lo; i <= hi; i++) rows.push([i, d(S.binom.pmf(i, n, p), 6), d(S.binom.cdf(i, n, p), 6)]);
          let h = `<p>E(X) = np = ${d(n * p)},  V(X) = np(1−p) = ${d(n * p * (1 - p))}</p>`;
          if (k !== undefined) h = `<p>P(X = ${k}) = <sub>${n}</sub>C<sub>${k}</sub>·${d(p)}<sup>${k}</sup>·${d(1 - p)}<sup>${n - k}</sup> = <b>${d(S.binom.pmf(k, n, p), 8)}</b>,  P(X ≤ ${k}) = <b>${d(S.binom.cdf(k, n, p), 8)}</b></p>` + h;
          return { html: h + N.table(rows, ['k', 'P(X = k)', 'P(X ≤ k)']), mount: pmfPlot(rows.map(r => [r[0], +r[1]]), `B(${n}, ${d(p)})`) };
        }
      },
      {
        id: 'poisson', name: '포아송분포  P(m)',
        note: 'm → 분포표.   m, k → P(X = k), P(X ≤ k)',
        help: [['3', ''], ['3, 2', ''], ['12.5, 10', '']],
        run(s) {
          const [m, k] = E.nums(s); const hi = Math.ceil(m + 5 * Math.sqrt(m) + 3), rows = [];
          for (let i = 0; i <= hi; i++) rows.push([i, d(S.poisson.pmf(i, m), 6), d(S.poisson.cdf(i, m), 6)]);
          let h = `<p>E(X) = V(X) = m = ${d(m)}</p>`;
          if (k !== undefined) h = `<p>P(X = ${k}) = e<sup>−${d(m)}</sup>·${d(m)}<sup>${k}</sup>/${k}! = <b>${d(S.poisson.pmf(k, m), 8)}</b>,  P(X ≤ ${k}) = <b>${d(S.poisson.cdf(k, m), 8)}</b></p>` + h;
          return { html: h + N.table(rows, ['k', 'P(X = k)', 'P(X ≤ k)']), mount: pmfPlot(rows.map(r => [r[0], +r[1]]), `P(${d(m)})`) };
        }
      },
      {
        id: 'geom', name: '기하분포  (첫 성공까지 시행 횟수)',
        help: [['0.2', ''], ['0.2, 5', 'P(X = 5)']],
        run(s) {
          const [p, k] = E.nums(s); const rows = []; for (let i = 1; i <= Math.min(40, Math.ceil(Math.log(0.001) / Math.log(1 - p)) + 1); i++) rows.push([i, d(S.geom.pmf(i, p), 6), d(S.geom.cdf(i, p), 6)]);
          let h = `<p>P(X = k) = (1−p)<sup>k−1</sup>p,  E(X) = 1/p = ${d(1 / p)},  V(X) = (1−p)/p² = ${d((1 - p) / p / p)}</p>`;
          if (k !== undefined) h = `<p>P(X = ${k}) = <b>${d(S.geom.pmf(k, p), 8)}</b>,  P(X ≤ ${k}) = <b>${d(S.geom.cdf(k, p), 8)}</b></p>` + h;
          return { html: h + N.table(rows, ['k', 'P(X = k)', 'P(X ≤ k)']), mount: pmfPlot(rows.map(r => [r[0], +r[1]]), `Geo(${d(p)})`) };
        }
      },
      {
        id: 'hyper', name: '초기하분포  (N 개 중 성공 K 개, n 개 뽑기)',
        help: [['50, 5, 10', 'N = 50, K = 5, n = 10'], ['50, 5, 10, 2', 'P(X = 2)']],
        run(s) {
          const [Nn, Kk, n, k] = E.nums(s); const rows = [];
          for (let i = Math.max(0, n - (Nn - Kk)); i <= Math.min(n, Kk); i++) rows.push([i, d(S.hyper.pmf(i, Nn, Kk, n), 6), d(S.hyper.cdf(i, Nn, Kk, n), 6)]);
          let h = `<p>E(X) = nK/N = ${d(n * Kk / Nn)},  V(X) = ${d(n * Kk / Nn * (1 - Kk / Nn) * (Nn - n) / (Nn - 1))}</p>`;
          if (k !== undefined) h = `<p>P(X = ${k}) = <sub>${Kk}</sub>C<sub>${k}</sub>·<sub>${Nn - Kk}</sub>C<sub>${n - k}</sub>/<sub>${Nn}</sub>C<sub>${n}</sub> = <b>${d(S.hyper.pmf(k, Nn, Kk, n), 8)}</b></p>` + h;
          return { html: h + N.table(rows, ['k', 'P(X = k)', 'P(X ≤ k)']), mount: pmfPlot(rows.map(r => [r[0], +r[1]]), '초기하분포') };
        }
      },
      {
        id: 'gamma', name: '감마분포  Γ(k, θ)',
        note: 'k(모양), θ(척도), x → P(X ≤ x)',
        help: [['2, 1, 2', ''], ['3, 2, 5', '']],
        run(s) {
          const [k, th, x] = E.nums(s);
          return { html: `<p>X ~ Γ(${d(k)}, ${d(th)}),  E(X) = kθ = ${d(k * th)},  V(X) = kθ² = ${d(k * th * th)}</p>${x !== undefined ? `<p>P(X ≤ ${d(x)}) = <b>${d(S.gammaDist.cdf(x, k, th), 8)}</b></p>` : ''}`, mount: pdfPlot(t => S.gammaDist.pdf(t, k, th), 0, k * th + 5 * Math.sqrt(k) * th, `Γ(${d(k)}, ${d(th)})`, x !== undefined ? [0, x] : null) };
        }
      }
    ]
  });
})();
