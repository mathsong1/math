/*
 * 행렬 계산 (Apache Commons Math 의 RealMatrix 대신)
 *  행렬은 2차원 배열 [[1,2],[3,4]]
 *  parse('1 2; 3 4')  또는 줄바꿈으로 행 구분
 *  det, inv, rref(rank), lu, qr, gramSchmidt, eigSym, eig(복소 고유값), svd, pinv, solve, lstsq, pow
 */
(function () {
  const K = (window.KPHS = window.KPHS || {});
  const { num, splitTop } = K.expr;
  const TOL = 1e-10;

  const zeros = (m, n) => Array.from({ length: m }, () => new Array(n).fill(0));
  const eye = (n) => { const I = zeros(n, n); for (let i = 0; i < n; i++) I[i][i] = 1; return I; };
  const clone = (A) => A.map(r => r.slice());
  const T = (A) => A[0].map((_, j) => A.map(r => r[j]));
  const add = (A, B) => { same(A, B); return A.map((r, i) => r.map((v, j) => v + B[i][j])); };
  const sub = (A, B) => { same(A, B); return A.map((r, i) => r.map((v, j) => v - B[i][j])); };
  const scale = (A, k) => A.map(r => r.map(v => v * k));
  function same(A, B) { if (A.length !== B.length || A[0].length !== B[0].length) throw new Error(`크기가 다른 행렬입니다 (${size(A)} 와 ${size(B)}).`); }
  const size = (A) => `${A.length}×${A[0].length}`;
  function mul(A, B) {
    if (A[0].length !== B.length) throw new Error(`곱할 수 없습니다: ${size(A)} × ${size(B)} (앞 행렬의 열 수 = 뒤 행렬의 행 수 이어야 함)`);
    const C = zeros(A.length, B[0].length);
    for (let i = 0; i < A.length; i++) for (let k = 0; k < B.length; k++) { const a = A[i][k]; if (a) for (let j = 0; j < B[0].length; j++) C[i][j] += a * B[k][j]; }
    return C;
  }
  const mv = (A, v) => A.map(r => r.reduce((s, a, j) => s + a * v[j], 0));
  const dot = (u, v) => u.reduce((s, a, i) => s + a * v[i], 0);
  const norm = (v) => Math.sqrt(dot(v, v));
  const col = (A, j) => A.map(r => r[j]);
  const clean = (A) => A.map(r => r.map(v => (Math.abs(v) < 1e-11 ? 0 : v)));

  /** '1 2 3; 4 5 6' / 줄바꿈 / '[1,2],[3,4]' → 행렬 */
  function parse(text) {
    let s = String(text).trim();
    if (!s) throw new Error('행렬을 입력하세요.');
    let rows;
    if (/^\[/.test(s) && /\]\s*[,;]?\s*\[/.test(s)) rows = [...s.matchAll(/\[([^\[\]]*)\]/g)].map(m => m[1]);
    else rows = s.split(/\s*(?:;|\n)\s*/).filter(Boolean);
    const M = rows.map(r => {
      const parts = r.includes(',') ? splitTop(r, ',') : r.trim().split(/\s+/);
      return parts.map(num);
    });
    const n = M[0].length;
    M.forEach((r, i) => { if (r.length !== n) throw new Error(`${i + 1}행의 성분 개수(${r.length})가 1행(${n})과 다릅니다.`); });
    return M;
  }

  function lu(A) {
    const n = A.length; if (n !== A[0].length) throw new Error('정사각행렬이어야 합니다.');
    const U = clone(A), L = eye(n), perm = [...Array(n).keys()]; let sign = 1;
    for (let k = 0; k < n; k++) {
      let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(U[i][k]) > Math.abs(U[p][k])) p = i;
      if (p !== k) {
        [U[p], U[k]] = [U[k], U[p]]; [perm[p], perm[k]] = [perm[k], perm[p]]; sign = -sign;
        for (let j = 0; j < k; j++) [L[p][j], L[k][j]] = [L[k][j], L[p][j]];
      }
      if (Math.abs(U[k][k]) < 1e-14) continue;
      for (let i = k + 1; i < n; i++) {
        const f = U[i][k] / U[k][k]; L[i][k] = f;
        for (let j = k; j < n; j++) U[i][j] -= f * U[k][j];
      }
    }
    const P = zeros(n, n); perm.forEach((pi, i) => (P[i][pi] = 1));
    return { L, U, P, perm, sign };
  }
  function det(A) {
    const n = A.length; if (n !== A[0].length) throw new Error('행렬식은 정사각행렬에서만 구할 수 있습니다.');
    const { U, sign } = lu(A); let d = sign; for (let i = 0; i < n; i++) d *= U[i][i]; return d;
  }
  function rref(A) {
    const R = clone(A), m = R.length, n = R[0].length, piv = []; let r = 0;
    const scaleMax = Math.max(1, ...A.flat().map(Math.abs));
    for (let c = 0; c < n && r < m; c++) {
      let p = r; for (let i = r + 1; i < m; i++) if (Math.abs(R[i][c]) > Math.abs(R[p][c])) p = i;
      if (Math.abs(R[p][c]) < TOL * scaleMax) continue;
      [R[p], R[r]] = [R[r], R[p]];
      const d = R[r][c]; for (let j = 0; j < n; j++) R[r][j] /= d;
      for (let i = 0; i < m; i++) if (i !== r) { const f = R[i][c]; if (f) for (let j = 0; j < n; j++) R[i][j] -= f * R[r][j]; }
      piv.push(c); r++;
    }
    return { R: clean(R), rank: r, pivots: piv };
  }
  function inv(A) {
    const n = A.length; if (n !== A[0].length) throw new Error('역행렬은 정사각행렬에서만 구할 수 있습니다.');
    const aug = A.map((r, i) => [...r, ...eye(n)[i]]);
    const { R, rank } = rref(aug);
    if (rank < n || R.slice(0, n).some((r, i) => Math.abs(r[i] - 1) > 1e-9)) throw new Error('행렬식이 0 이므로 역행렬이 없습니다.');
    return R.map(r => r.slice(n));
  }
  /** 영공간의 기저 (rref 이용) */
  function nullspace(A, tol = 1e-8) {
    const { R, pivots } = rref(A.map(r => r.map(v => (Math.abs(v) < tol ? 0 : v))));
    const n = A[0].length, free = [...Array(n).keys()].filter(j => !pivots.includes(j));
    return free.map(f => {
      const v = new Array(n).fill(0); v[f] = 1;
      pivots.forEach((p, i) => (v[p] = -R[i][f]));
      return v;
    });
  }
  /** Householder QR: A (m×n) = Q (m×m) R (m×n) */
  function qr(A) {
    const m = A.length, n = A[0].length; let R = clone(A), Q = eye(m);
    for (let k = 0; k < Math.min(m - 1, n); k++) {
      const x = R.slice(k).map(r => r[k]); const a = -Math.sign(x[0] || 1) * norm(x);
      const v = x.slice(); v[0] -= a; const vn = norm(v); if (vn < 1e-15) continue;
      for (let i = 0; i < v.length; i++) v[i] /= vn;
      for (let j = 0; j < n; j++) { let s = 0; for (let i = k; i < m; i++) s += v[i - k] * R[i][j]; for (let i = k; i < m; i++) R[i][j] -= 2 * v[i - k] * s; }
      for (let i = 0; i < m; i++) { let s = 0; for (let l = k; l < m; l++) s += Q[i][l] * v[l - k]; for (let l = k; l < m; l++) Q[i][l] -= 2 * s * v[l - k]; }
    }
    // R 의 대각을 양수로
    for (let i = 0; i < Math.min(m, n); i++) if (R[i][i] < 0) { R[i] = R[i].map(v => -v); for (let r = 0; r < m; r++) Q[r][i] = -Q[r][i]; }
    return { Q: clean(Q), R: clean(R) };
  }
  /** 그람-슈미트: 행벡터들 → 정규직교 행벡터들 */
  function gramSchmidt(vs) {
    const us = [], es = [];
    vs.forEach(v => {
      let u = v.slice();
      us.forEach(w => { const c = dot(v, w) / dot(w, w); u = u.map((x, i) => x - c * w[i]); });
      if (norm(u) < 1e-10) throw new Error('일차종속인 벡터가 있어 직교화할 수 없습니다.');
      us.push(u); es.push(u.map(x => x / norm(u)));
    });
    return { u: us.map(r => r.map(v => (Math.abs(v) < 1e-12 ? 0 : v))), e: clean(es) };
  }
  /** 대칭행렬 고유분해 (야코비 방법) → 고유값 내림차순, 열이 고유벡터 */
  function eigSym(A) {
    const n = A.length; let a = clone(A), V = eye(n);
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] ** 2;
      if (off < 1e-22) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
      }
    }
    const idx = [...Array(n).keys()].sort((i, j) => a[j][j] - a[i][i]);
    const values = idx.map(i => a[i][i]);
    const vecs = idx.map(i => { let v = col(V, i); const k = v.find(x => Math.abs(x) > 1e-9); if (k < 0) v = v.map(x => -x); return v; });
    return { values, vectors: clean(T(vecs)) };
  }
  /** 일반 실행렬의 고유값 (헤센베르크 + QR, 복소수 포함) → [{re, im}] */
  function eigenvalues(A0) {
    const n = A0.length; if (n !== A0[0].length) throw new Error('고유값은 정사각행렬에서만 구할 수 있습니다.');
    const a = clone(A0);
    // 헤센베르크 변환
    for (let m = 1; m < n - 1; m++) {
      let x = 0, i = m;
      for (let j = m; j < n; j++) if (Math.abs(a[j][m - 1]) > Math.abs(x)) { x = a[j][m - 1]; i = j; }
      if (i !== m) { for (let j = m - 1; j < n; j++) [a[i][j], a[m][j]] = [a[m][j], a[i][j]]; for (let j = 0; j < n; j++) [a[j][i], a[j][m]] = [a[j][m], a[j][i]]; }
      if (x) for (i = m + 1; i < n; i++) { let y = a[i][m - 1]; if (y) { y /= x; a[i][m - 1] = y; for (let j = m; j < n; j++) a[i][j] -= y * a[m][j]; for (let j = 0; j < n; j++) a[j][m] += y * a[j][i]; } }
    }
    for (let i = 2; i < n; i++) for (let j = 0; j < i - 1; j++) a[i][j] = 0;
    // hqr (Numerical Recipes)
    const wr = new Array(n).fill(0), wi = new Array(n).fill(0);
    let nn = n - 1, t = 0, anorm = 0;
    for (let i = 0; i < n; i++) for (let j = Math.max(i - 1, 0); j < n; j++) anorm += Math.abs(a[i][j]);
    while (nn >= 0) {
      let its = 0, l;
      do {
        for (l = nn; l >= 1; l--) { const s = Math.abs(a[l - 1][l - 1]) + Math.abs(a[l][l]); if (Math.abs(a[l][l - 1]) + (s || anorm) === (s || anorm)) { a[l][l - 1] = 0; break; } }
        const x = a[nn][nn];
        if (l === nn) { wr[nn] = x + t; wi[nn--] = 0; }
        else {
          const y = a[nn - 1][nn - 1], w = a[nn][nn - 1] * a[nn - 1][nn];
          if (l === nn - 1) {
            const p = 0.5 * (y - x), q = p * p + w, z = Math.sqrt(Math.abs(q)); let xx = x + t;
            if (q >= 0) { const zz = p + (p >= 0 ? z : -z); wr[nn - 1] = wr[nn] = xx + zz; if (zz) wr[nn] = xx - w / zz; wi[nn - 1] = wi[nn] = 0; }
            else { wr[nn - 1] = wr[nn] = xx + p; wi[nn - 1] = -(wi[nn] = z); }
            nn -= 2;
          } else {
            if (its === 60) throw new Error('고유값 계산이 수렴하지 않습니다.');
            let xx = x, yy = y, ww = w;
            if (its === 10 || its === 20) { t += xx; for (let i = 0; i <= nn; i++) a[i][i] -= xx; const s = Math.abs(a[nn][nn - 1]) + Math.abs(a[nn - 1][nn - 2]); yy = xx = 0.75 * s; ww = -0.4375 * s * s; }
            ++its;
            let m, p, q, r, z;
            for (m = nn - 2; m >= l; m--) {
              z = a[m][m]; r = xx - z; const s0 = yy - z;
              p = (r * s0 - ww) / a[m + 1][m] + a[m][m + 1]; q = a[m + 1][m + 1] - z - r - s0; r = a[m + 2][m + 1];
              const s = Math.abs(p) + Math.abs(q) + Math.abs(r); p /= s; q /= s; r /= s;
              if (m === l) break;
              const u = Math.abs(a[m][m - 1]) * (Math.abs(q) + Math.abs(r)), v = Math.abs(p) * (Math.abs(a[m - 1][m - 1]) + Math.abs(z) + Math.abs(a[m + 1][m + 1]));
              if (u + v === v) break;
            }
            for (let i = m + 2; i <= nn; i++) { a[i][i - 2] = 0; if (i !== m + 2) a[i][i - 3] = 0; }
            for (let k = m; k <= nn - 1; k++) {
              if (k !== m) { p = a[k][k - 1]; q = a[k + 1][k - 1]; r = 0; if (k !== nn - 1) r = a[k + 2][k - 1]; xx = Math.abs(p) + Math.abs(q) + Math.abs(r); if (xx) { p /= xx; q /= xx; r /= xx; } }
              const s = Math.sign(p || 1) * Math.sqrt(p * p + q * q + r * r);
              if (s) {
                if (k === m) { if (l !== m) a[k][k - 1] = -a[k][k - 1]; } else a[k][k - 1] = -s * xx;
                p += s; xx = p / s; yy = q / s; z = r / s; q /= p; r /= p;
                for (let j = k; j <= nn; j++) { p = a[k][j] + q * a[k + 1][j]; if (k !== nn - 1) { p += r * a[k + 2][j]; a[k + 2][j] -= p * z; } a[k + 1][j] -= p * yy; a[k][j] -= p * xx; }
                const mmin = nn < k + 3 ? nn : k + 3;
                for (let i = l; i <= mmin; i++) { p = xx * a[i][k] + yy * a[i][k + 1]; if (k !== nn - 1) { p += z * a[i][k + 2]; a[i][k + 2] -= p * r; } a[i][k + 1] -= p * q; a[i][k] -= p; }
              }
            }
          }
        }
      } while (l < nn - 1);
    }
    const res = wr.map((re, i) => ({ re: Math.abs(re) < 1e-12 ? 0 : re, im: Math.abs(wi[i]) < 1e-12 ? 0 : wi[i] }));
    return res.sort((p, q) => q.re - p.re || q.im - p.im);
  }
  /** 고유값 + (실수 고유값에 대한) 고유벡터 */
  function eig(A) {
    const n = A.length;
    const sym = A.every((r, i) => r.every((v, j) => Math.abs(v - A[j][i]) < 1e-12));
    if (sym) { const e = eigSym(A); return { sym, values: e.values.map(re => ({ re, im: 0 })), vectors: e.vectors }; }
    const vals = eigenvalues(A);
    const vecs = [];
    const seen = [];
    vals.forEach(v => {
      if (v.im !== 0) return;
      if (seen.some(s => Math.abs(s - v.re) < 1e-7)) return; seen.push(v.re);
      const M = A.map((r, i) => r.map((x, j) => x - (i === j ? v.re : 0)));
      nullspace(M, 1e-7 * Math.max(1, Math.abs(v.re))).forEach(u => {
        const k = u.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
        vecs.push({ value: v.re, vec: u.map(x => x / k) }); // 가장 큰 성분을 1 로
      });
    });
    return { sym, values: vals, eigvecs: vecs, n };
  }
  /** SVD (단측 야코비): A = U Σ Vᵀ */
  function svd(A0) {
    let A = clone(A0), flip = false;
    if (A.length < A[0].length) { A = T(A); flip = true; }
    const m = A.length, n = A[0].length; let U = clone(A), V = eye(n);
    for (let sweep = 0; sweep < 80; sweep++) {
      let conv = true;
      for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) {
        let al = 0, be = 0, ga = 0;
        for (let k = 0; k < m; k++) { al += U[k][i] ** 2; be += U[k][j] ** 2; ga += U[k][i] * U[k][j]; }
        if (Math.abs(ga) < 1e-15 * Math.sqrt(al * be) || !ga) continue;
        conv = false;
        const z = (be - al) / (2 * ga), t = Math.sign(z || 1) / (Math.abs(z) + Math.sqrt(1 + z * z)), c = 1 / Math.sqrt(1 + t * t), s = c * t;
        for (let k = 0; k < m; k++) { const x = U[k][i], y = U[k][j]; U[k][i] = c * x - s * y; U[k][j] = s * x + c * y; }
        for (let k = 0; k < n; k++) { const x = V[k][i], y = V[k][j]; V[k][i] = c * x - s * y; V[k][j] = s * x + c * y; }
      }
      if (conv) break;
    }
    const S = [...Array(n).keys()].map(j => norm(col(U, j)));
    const idx = [...Array(n).keys()].sort((a, b) => S[b] - S[a]);
    const Ss = idx.map(i => S[i]);
    const Uc = idx.map(i => col(U, i).map(x => (S[i] > 1e-14 ? x / S[i] : 0)));
    const Vc = idx.map(i => col(V, i));
    let res = { U: T(Uc), S: Ss, V: T(Vc) };
    if (flip) res = { U: res.V, S: res.S, V: res.U };
    return res;
  }
  function pinv(A) {
    const { U, S, V } = svd(A), tol = 1e-10 * Math.max(...S);
    const Sinv = S.map(s => (s > tol ? 1 / s : 0));
    // A⁺ = V Σ⁺ Uᵀ
    const n = V.length, m = U.length;
    const R = zeros(n, m);
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { let s = 0; for (let k = 0; k < S.length; k++) s += V[i][k] * Sinv[k] * U[j][k]; R[i][j] = s; }
    return R;
  }
  function pow(A, k) {
    if (A.length !== A[0].length) throw new Error('거듭제곱은 정사각행렬에서만 가능합니다.');
    let R = eye(A.length), B = clone(A);
    if (k < 0) { B = inv(B); k = -k; }
    while (k > 0) { if (k & 1) R = mul(R, B); B = mul(B, B); k >>= 1; }
    return R;
  }

  /** 행렬을 괄호 달린 표로 */
  function html(A, f = K.num.fmt) {
    if (!Array.isArray(A[0])) A = A.map(v => [v]);
    return `<span class="matw"><table class="mat"><tbody>${A.map(r => `<tr>${r.map(v => `<td>${f(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></span>`;
  }
  const cstr = (z) => {
    const f = K.num.fmt;
    if (!z.im) return f(z.re);
    const re = Math.abs(z.re) < 1e-12 ? '' : f(z.re);
    const im = Math.abs(Math.abs(z.im) - 1) < 1e-12 ? '' : f(Math.abs(z.im));
    return `${re}${re ? (z.im < 0 ? ' - ' : ' + ') : z.im < 0 ? '-' : ''}${im}i`;
  };

  K.la = { zeros, eye, clone, T, add, sub, scale, mul, mv, dot, norm, col, clean, parse, lu, det, rref, inv, nullspace, qr, gramSchmidt, eigSym, eigenvalues, eig, svd, pinv, pow, html, cstr, size };
})();
