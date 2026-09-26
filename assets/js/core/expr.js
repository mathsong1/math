/*
 * 수식 해석기
 * ─────────────────────────────────────────────
 *  - 사칙연산, 거듭제곱(^), 괄호, 계승(!), 암묵적 곱셈(2x, 2pi, 3(x+1), x sin(x))
 *  - 상수 pi, π, e,  √ 기호
 *  - 함수: sin cos tan sec csc cot asin acos atan sinh cosh tanh asinh acosh atanh
 *          exp ln log(자연로그) log10 log2 sqrt cbrt abs floor ceil round sign gamma
 *          log(x, 밑)  pow(a, b)  min max  atan2  nroot(x, n)
 *  KPHS.expr.compile('x^2 + 2x', ['x'])  → (x) => number
 *  KPHS.expr.num('2sqrt(3)/5')           → 0.6928...
 */
(function () {
  const K = (window.KPHS = window.KPHS || {});

  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    x -= 1; let a = c[0]; const t = x + g + 0.5;
    for (let i = 1; i < 9; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function gamma(x) {
    if (Number.isInteger(x)) {
      if (x <= 0) return NaN;
      if (x < 171) { let r = 1; for (let i = 2; i < x; i++) r *= i; return r; }
    }
    if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
    return Math.exp(lgamma(x));
  }
  function factorial(n) {
    if (n < 0) return NaN;
    return Number.isInteger(n) ? gamma(n + 1) : gamma(n + 1);
  }

  const FN = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x), cot: x => 1 / Math.tan(x),
    asin: Math.asin, acos: Math.acos, atan: Math.atan, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    exp: Math.exp, ln: Math.log, log10: Math.log10, log2: Math.log2,
    log: (x, b) => (b === undefined ? Math.log(x) : Math.log(x) / Math.log(b)),
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round,
    sign: Math.sign, gamma, lgamma, fact: factorial, pow: Math.pow, min: Math.min, max: Math.max, atan2: Math.atan2,
    nroot: (x, n) => (x < 0 && n % 2 === 1 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n)),
    rad: x => x * Math.PI / 180, deg: x => x * 180 / Math.PI,
    P: (n, r) => { let p = 1; for (let i = 0; i < r; i++) p *= n - i; return p; },
    C: (n, r) => { let p = 1; for (let i = 0; i < r; i++) p = p * (n - i) / (i + 1); return Math.round(p); },
    H: (n, r) => FN.C(n + r - 1, r),
    mod: (a, b) => ((a % b) + b) % b, div: (a, b) => Math.floor(a / b),
    gcd: (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; },
    lcm: (a, b) => Math.abs(a * b) / FN.gcd(a, b)
  };
  const CONST = { pi: Math.PI, 'π': Math.PI, e: Math.E };

  /* ---------- 토큰 ---------- */
  function tokenize(src) {
    const s = String(src).replace(/\*\*/g, '^').replace(/[×·∙]/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/°/g, '*(pi/180)');
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        const m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
        // 1e5 는 숫자, 2e 는 2·e
        let t = m[0];
        if (m[2] && !/^[eE][+-]?\d+$/.test(m[2])) t = m[1];
        out.push({ t: 'num', v: parseFloat(t) }); i += t.length; continue;
      }
      if (c === '√') { out.push({ t: 'id', v: 'sqrt' }); i++; continue; }
      if (c === 'π') { out.push({ t: 'id', v: 'π' }); i++; continue; }
      if (/[A-Za-zα-ωΑ-Ωθ_]/.test(c)) {
        const m = s.slice(i).match(/^[A-Za-zα-ωΑ-Ωθ_][A-Za-z0-9α-ωΑ-Ωθ_]*/);
        out.push({ t: 'id', v: m[0] }); i += m[0].length; continue;
      }
      if ('+-*/^(),!'.includes(c)) { out.push({ t: c }); i++; continue; }
      if (c === '[' || c === '{') { out.push({ t: '(' }); i++; continue; }
      if (c === ']' || c === '}') { out.push({ t: ')' }); i++; continue; }
      throw new Error(`수식에 알 수 없는 기호 '${c}' 가 있습니다.`);
    }
    return out;
  }

  /* 식별자 쪼개기: 'xy' → x·y, '2pix' → 2·pi·x (변수 목록 기준) */
  function splitId(id, vars) {
    if (FN[id] || CONST[id] !== undefined || vars.includes(id)) return [id];
    const names = [...vars, 'pi', 'π', 'e'].sort((a, b) => b.length - a.length);
    const res = []; let rest = id;
    outer: while (rest) {
      for (const f of Object.keys(FN).sort((a, b) => b.length - a.length)) {
        if (rest.startsWith(f) && rest.length > f.length) { res.push(f); rest = rest.slice(f.length); continue outer; }
        if (rest === f) { res.push(f); rest = ''; continue outer; }
      }
      for (const n of names) if (rest.startsWith(n)) { res.push(n); rest = rest.slice(n.length); continue outer; }
      throw new Error(`'${id}' 를 알 수 없습니다. 사용할 수 있는 변수: ${vars.join(', ') || '(없음)'}`);
    }
    return res;
  }

  /* ---------- 파서 (재귀 하강) → JS 코드 문자열 ---------- */
  function parse(src, vars, calls = false) {
    let toks = [];
    for (const tk of tokenize(src)) {
      if (tk.t === 'id') splitId(tk.v, vars).forEach(v => toks.push({ t: 'id', v }));
      else toks.push(tk);
    }
    // 암묵적 곱셈 삽입
    const withMul = [];
    toks.forEach((tk, i) => {
      const prev = withMul[withMul.length - 1];
      const prevEnds = prev && (prev.t === 'num' || prev.t === ')' || prev.t === '!' || (prev.t === 'id' && !FN[prev.v]));
      const curStarts = tk.t === 'num' || tk.t === '(' || tk.t === 'id';
      const fnPow = prev && prev.t === 'num' && withMul[withMul.length - 2]?.t === '^' &&
        withMul[withMul.length - 3]?.t === 'id' && FN[withMul[withMul.length - 3].v]; // sin^2(x)
      if (prevEnds && curStarts && !fnPow) withMul.push({ t: '*' });
      withMul.push(tk);
    });
    toks = withMul;
    let p = 0;
    const peek = () => toks[p], eat = (t) => {
      const tk = toks[p];
      if (!tk || tk.t !== t) throw new Error(`수식 형식이 올바르지 않습니다${tk ? ` ('${tk.v ?? tk.t}' 근처)` : ' (식이 덜 끝남)'}.`);
      p++; return tk;
    };
    function expr() {
      let a = term();
      while (peek() && (peek().t === '+' || peek().t === '-')) { const op = toks[p++].t; const b = term(); a = calls ? `O.${op === '+' ? 'add' : 'sub'}(${a},${b})` : `(${a}${op}${b})`; }
      return a;
    }
    function term() {
      let a = unary();
      while (peek() && (peek().t === '*' || peek().t === '/')) { const op = toks[p++].t; const b = unary(); a = calls ? `O.${op === '*' ? 'mul' : 'div'}(${a},${b})` : `(${a}${op}${b})`; }
      return a;
    }
    function unary() {
      if (peek() && peek().t === '-') { p++; const u = unary(); return calls ? `O.neg(${u})` : `(-${u})`; }
      if (peek() && peek().t === '+') { p++; return unary(); }
      return power();
    }
    function power() {
      const b = postfix();
      if (peek() && peek().t === '^') { p++; const e = unary(); return calls ? `O.pow(${b},${e})` : `P(${b},${e})`; }
      return b;
    }
    function postfix() {
      let a = atom();
      while (peek() && peek().t === '!') { p++; a = calls ? `O.fn('fact',[${a}])` : `F.fact(${a})`; }
      return a;
    }
    function atom() {
      const tk = peek();
      if (!tk) throw new Error('수식이 덜 끝났습니다.');
      if (tk.t === 'num') { p++; return calls ? `O.c(${tk.v})` : String(tk.v); }
      if (tk.t === '(') { p++; const a = expr(); eat(')'); return a; }
      if (tk.t === 'id') {
        p++;
        if (FN[tk.v]) {
          // sin x, sin^2 x 도 허용
          let powExp = null;
          if (peek() && peek().t === '^') { p++; powExp = postfix(); }
          let args;
          if (peek() && peek().t === '(') {
            p++; args = [expr()];
            while (peek() && peek().t === ',') { p++; args.push(expr()); }
            eat(')');
          } else args = [power()];
          const call = calls ? `O.fn('${tk.v}',[${args.join(',')}])` : `F.${tk.v}(${args.join(',')})`;
          return powExp ? (calls ? `O.pow(${call},${powExp})` : `P(${call},${powExp})`) : call;
        }
        if (CONST[tk.v] !== undefined) return calls ? `O.c(C['${tk.v}'])` : `C['${tk.v}']`;
        if (vars.includes(tk.v)) return `V['${tk.v}']`;
        throw new Error(`'${tk.v}' 를 알 수 없습니다.`);
      }
      throw new Error(`수식 형식이 올바르지 않습니다 ('${tk.t}' 근처).`);
    }
    if (!toks.length) throw new Error('수식을 입력하세요.');
    const code = expr();
    if (p < toks.length) throw new Error(`수식 형식이 올바르지 않습니다 ('${toks[p].v ?? toks[p].t}' 근처).`);
    return code;
  }

  const P = (a, b) => (a < 0 && !Number.isInteger(b) && Number.isInteger(1 / b) && (1 / b) % 2 === 1)
    ? -Math.pow(-a, b) : Math.pow(a, b); // (-8)^(1/3) = -2

  function compile(src, vars = []) {
    const code = parse(src, vars);
    const fn = new Function('F', 'C', 'P', 'V', `return ${code};`);
    const f = (...args) => {
      const V = {}; vars.forEach((v, i) => (V[v] = args[i]));
      return fn(FN, CONST, P, V);
    };
    f.src = src; f.vars = vars;
    return f;
  }
  function num(src) {
    const s = String(src).trim();
    if (s === '') throw new Error('값이 비어 있습니다.');
    const v = compile(s, [])();
    if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`'${s}' 의 값을 계산할 수 없습니다.`);
    return v;
  }
  /** 괄호 밖의 쉼표·세미콜론으로 나누기 */
  function splitTop(s, seps = ',;') {
    const out = []; let depth = 0, cur = '';
    for (const c of String(s)) {
      if ('([{'.includes(c)) depth++;
      if (')]}'.includes(c)) depth--;
      if (depth === 0 && seps.includes(c)) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out.map(x => x.trim()).filter(x => x !== '');
  }
  /** '1, 2/3, sqrt(2)' → [1, 0.666, 1.414]  (쉼표·공백 구분) */
  function nums(s) {
    const parts = splitTop(s, ',;');
    const res = [];
    parts.forEach(p => {
      // 쉼표 없이 공백으로 나열된 숫자도 허용: '1 2 3'
      if (/^[-+]?[\d.]+(\s+[-+]?[\d.]+)+$/.test(p)) p.split(/\s+/).forEach(q => res.push(num(q)));
      else res.push(num(p));
    });
    return res;
  }
  /** '(1,2), (3,4)' 또는 'A(1,2) B(3,4)' → [[1,2],[3,4]] */
  function points(s, dim) {
    const found = [...String(s).matchAll(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)].map(m => nums(m[1]));
    let pts = found;
    if (!pts.length) { const a = nums(s); pts = []; for (let i = 0; i < a.length; i += dim) pts.push(a.slice(i, i + dim)); }
    pts.forEach(p => { if (dim && p.length !== dim) throw new Error(`좌표는 ${dim}개 성분이어야 합니다: (${p.join(', ')})`); });
    return pts;
  }

  /** 연산을 직접 정의해서 계산 (다항식 등) */
  function evalWith(src, vars, O, V) {
    const code = parse(src, vars, true);
    return new Function('O', 'C', 'V', `return ${code};`)(O, CONST, V);
  }

  /* ---------- 다항식: 계수 배열 [a0, a1, …] (낮은 차수부터) ---------- */
  const pTrim = (a) => { const r = a.slice(); while (r.length > 1 && Math.abs(r[r.length - 1]) < 1e-13) r.pop(); return r; };
  const PO = {
    c: (v) => [v],
    add: (a, b) => pTrim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] || 0) + (b[i] || 0))),
    sub: (a, b) => pTrim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] || 0) - (b[i] || 0))),
    neg: (a) => a.map(v => -v),
    mul: (a, b) => { const r = new Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y))); return pTrim(r); },
    div: (a, b) => { if (b.length !== 1) throw new Error('다항식을 다항식으로 나누는 식은 다항식이 아닙니다.'); return a.map(v => v / b[0]); },
    pow: (a, e) => {
      if (e.length !== 1 || !Number.isInteger(e[0]) || e[0] < 0) {
        if (a.length === 1 && e.length === 1) return [P(a[0], e[0])];
        throw new Error('다항식의 지수는 0 이상의 정수여야 합니다.');
      }
      let r = [1]; for (let i = 0; i < e[0]; i++) r = PO.mul(r, a); return r;
    },
    fn: (name, args) => {
      if (args.some(a => a.length !== 1)) throw new Error(`${name}( ) 안에 변수가 있으면 다항식이 아닙니다.`);
      return [FN[name](...args.map(a => a[0]))];
    }
  };
  /** 'x^3 + 2x^2 - 1' → [-1, 0, 2, 1] */
  function poly(src, v = 'x') {
    const s = String(src).replace(/^\s*[a-zA-Z]\s*\(\s*[a-zA-Z]\s*\)\s*=/, '').replace(/^\s*y\s*=/, '');
    return evalWith(s, [v], PO, { [v]: [0, 1] });
  }

  K.expr = { evalWith, poly, PO, compile, num, nums, points, splitTop, FN, gamma, lgamma, factorial };
})();
