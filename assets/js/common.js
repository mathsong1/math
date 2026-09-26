/*
 * 공통 레이아웃 + 모듈 화면 틀
 * ─────────────────────────────────────────────
 * 모든 페이지는 <body data-page="모듈id"> 를 갖고,
 * 이 파일이 상단 메뉴·바닥글·모듈 화면(기능 목록 / 입력 / 결과)을 그려 줍니다.
 */
(function () {
  const VERSION = 'Web 5.0';
  const handlers = {}; // handlers['number-theory']['factor'] = { help, placeholder, run }

  const KPHS = {
    VERSION,

    /**
     * 기능 구현 등록
     *  help        : [ [입력 예시, 설명], ... ]  → '입력방법' 목록 (예시를 누르면 바로 계산)
     *  placeholder : 입력칸 안내 문구
     *  example     : 처음 열었을 때 입력칸에 넣어 둘 값
     *  run(text)   : 결과 HTML 문자열을 돌려줌. 오류는 throw new Error('메시지')
     */
    register(moduleId, featureId, impl) {
      // impl = { help, placeholder, example, run }  또는  { ops: [ {id, name, help, placeholder, example, note, run}, … ] }
      // run 은 HTML 문자열 또는 { html, mount(결과칸) } 을 돌려줌
      (handlers[moduleId] ||= {})[featureId] = impl;
    },
    isDone(moduleId, featureId) {
      return !!(handlers[moduleId] && handlers[moduleId][featureId]);
    },
    esc(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    /** 페이지 공통 틀 (상단바, 바닥글, 테마) */
    layout() {
      const page = document.body.dataset.page || 'home';
      const menu = window.KPHS_MENU;
      const nav = menu.map(m =>
        `<a href="${m.page}"${m.id === page ? ' aria-current="page"' : ''}>${m.nav || m.title}</a>`).join('');
      document.body.insertAdjacentHTML('afterbegin', `
        <header class="topbar"><div class="topbar-inner">
          <a class="brand" href="index.html">수학 및 그래프 <small>${VERSION}</small></a>
          <nav aria-label="메뉴">${nav}</nav>
          <button class="theme-btn" id="themeBtn" title="밝게 / 어둡게" aria-label="테마 전환">◐</button>
        </div></header>`);
      document.body.insertAdjacentHTML('beforeend',
        `<footer>대구중등수학교육연구회 · Mathematical Calculation (원본 Java Ver 4.5.0 → ${VERSION})</footer>`);
      KPHS.initTheme();
    },

    initTheme() {
      const root = document.documentElement;
      let saved = null;
      try { saved = localStorage.getItem('kphs-theme'); } catch (e) { /* 저장소 사용 불가 */ }
      if (saved) root.dataset.theme = saved;
      document.getElementById('themeBtn').addEventListener('click', () => {
        const dark = root.dataset.theme
          ? root.dataset.theme === 'dark'
          : matchMedia('(prefers-color-scheme: dark)').matches;
        root.dataset.theme = dark ? 'light' : 'dark';
        try { localStorage.setItem('kphs-theme', root.dataset.theme); } catch (e) { /* 무시 */ }
      });
    },

    /** 메인 허브의 카드 목록 */
    renderHub(el) {
      const menu = window.KPHS_MENU;
      const card = (m, i) => {
        let badge = '';
        if (m.features) {
          const n = m.features.filter(f => KPHS.isDone(m.id, f.id)).length;
          const cls = n === 0 ? '' : n === m.features.length ? 'done' : 'partial';
          badge = `<span class="badge ${cls}">구현 ${n} / ${m.features.length}</span>`;
        } else if (m.id !== 'about') {
          badge = '<span class="badge done">사용 가능</span>';
        }
        return `<a class="card" href="${m.page}" title="${KPHS.esc(m.summary)}">
          <div class="num">${String(i + 1).padStart(2, '0')} · ${m.en}</div>
          <h3>${m.title}</h3><p>${m.summary}</p>${badge ? `<div class="badge-row">${badge}</div>` : ''}</a>`;
      };
      const main = menu.slice(0, 7), sub = menu.slice(7);
      el.innerHTML = `
        <section class="hero">
          <h1>Mathematical Calculation</h1>
          <p>대구중등수학교육연구회 · <span class="clock" id="clock"></span></p>
        </section>
        <div class="section-title">Main Program</div>
        <div class="card-grid">${main.map((m, i) => card(m, i)).join('')}</div>
        <div class="section-title">Sub Program</div>
        <div class="card-grid">${sub.map((m, i) => card(m, i + 7)).join('')}</div>`;
      const clock = document.getElementById('clock');
      const tick = () => {
        clock.textContent = new Date().toLocaleString('ko-KR', {
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit'
        });
      };
      tick(); setInterval(tick, 30000);
    },

    /** 모듈 화면: 왼쪽 기능 목록 + 오른쪽 입력/결과 */
    renderModule(el, moduleId) {
      const mod = window.KPHS_MENU.find(m => m.id === moduleId);
      document.title = `${mod.title} · 수학 및 그래프`;
      el.innerHTML = `
        <div class="page-head">
          <div class="crumb"><a href="index.html">메인</a> › ${mod.title}</div>
          <h1>${mod.title}</h1><p>${mod.summary}</p>
        </div>
        <div class="module">
          <div class="feature-list" role="tablist" aria-label="${mod.title} 기능">
            ${mod.features.map(f => `<button role="tab" data-id="${f.id}">
              ${f.name}<span class="dot${KPHS.isDone(moduleId, f.id) ? ' on' : ''}"></span></button>`).join('')}
          </div>
          <section class="panel" id="panel" role="tabpanel"></section>
        </div>`;

      const panel = el.querySelector('#panel');
      const tabs = [...el.querySelectorAll('.feature-list button')];

      const show = (fid, opId) => {
        const f = mod.features.find(x => x.id === fid) || mod.features[0];
        tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.id === f.id)));
        const impl = handlers[moduleId] && handlers[moduleId][f.id];
        const ops = impl ? (impl.ops || [impl]) : [];
        const op = ops.find(o => o.id === opId) || ops[0];
        panel.innerHTML = `
          <h2>${f.name}</h2>
          <p class="desc">${f.desc}</p>
          ${impl ? '' : `<div class="notice">이 기능은 아직 웹으로 옮기는 중입니다. 원본: <code>${f.java || mod.java}</code></div>`}
          ${ops.length > 1 ? `<label class="field" for="opSel">세부 기능</label>
            <select class="input op-select" id="opSel">${ops.map(o => `<option value="${o.id}"${o === op ? ' selected' : ''}>${o.name}</option>`).join('')}</select>` : ''}
          ${op && op.help ? `<details class="help" open><summary>입력방법</summary>
            ${op.note ? `<p class="note">${op.note}</p>` : ''}
            <ul>${op.help.map(([ex, what]) =>
            `<li><code title="눌러서 입력칸에 넣고 계산">${KPHS.esc(ex)}</code><span>${what}</span></li>`).join('')}</ul>
            <div class="tip">예시를 누르면 입력칸에 들어가고 바로 계산됩니다. Ctrl+Enter로도 계산됩니다.</div></details>` : ''}
          <div class="inp-wrap"${op && op.noInput ? ' hidden' : ''}>
          <label class="field" for="inp">입력</label>
          <textarea class="input" id="inp" spellcheck="false" autocomplete="off" placeholder="${KPHS.esc(op && op.placeholder || '')}"
            ${impl ? '' : 'disabled'}></textarea>
          ${op && op.keys ? `<div class="calc-keys" role="group" aria-label="키패드">${op.keys.map(([lab, ins, cls]) =>
            `<button type="button" class="${cls || ''}" data-ins="${KPHS.esc(ins === undefined ? lab : ins)}">${lab}</button>`).join('')}</div>` : ''}
          <div class="actions">
            <button class="btn primary" id="runBtn" ${impl ? '' : 'disabled'}>계산</button>
            <button class="btn" id="clearBtn">지우기</button>
          </div>
          </div>
          <label class="field">${op && op.noInput ? '' : '결과'}</label>
          <div class="result" id="out" aria-live="polite"></div>
          <div class="source">원본 Java: ${f.java || mod.java}</div>`;
        const inp = panel.querySelector('#inp'), out = panel.querySelector('#out');
        const run = () => {
          try {
            const r = op.run(inp.value.trim());
            if (r && typeof r === 'object') { out.innerHTML = r.html || ''; if (r.mount) r.mount(out); }
            else out.innerHTML = r;
          } catch (e) { out.innerHTML = `<span class="err">${KPHS.esc(e.message)}</span>`; console.debug(e); }
        };
        if (op) {
          const ex = op.example !== undefined ? op.example : (op.help && op.help[0] && op.help[0][0]);
          if (ex !== undefined) { inp.value = ex; run(); }
          panel.querySelector('#runBtn').addEventListener('click', run);
          inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); } });
          panel.querySelectorAll('.calc-keys button').forEach(b => b.addEventListener('click', () => {
            const t = b.dataset.ins, st = inp.selectionStart ?? inp.value.length, en = inp.selectionEnd ?? st;
            if (t === '=') { run(); return; }
            if (t === 'AC') { inp.value = ''; out.innerHTML = ''; inp.focus(); return; }
            if (t === 'BS') { const a = st === en ? Math.max(0, st - 1) : st; inp.value = inp.value.slice(0, a) + inp.value.slice(en); inp.setSelectionRange(a, a); inp.focus(); return; }
            inp.value = inp.value.slice(0, st) + t + inp.value.slice(en);
            const pos = st + t.length - (t.endsWith('()') ? 1 : 0); inp.setSelectionRange(pos, pos); inp.focus();
          }));
          panel.querySelectorAll('.help code').forEach(c => c.addEventListener('click', () => { inp.value = c.textContent; run(); }));
          const sel = panel.querySelector('#opSel');
          if (sel) sel.addEventListener('change', () => show(f.id, sel.value));
        }
        panel.querySelector('#clearBtn').addEventListener('click', () => { inp.value = ''; out.innerHTML = ''; inp.focus(); });
        if (location.hash.slice(1) !== f.id) history.replaceState(null, '', '#' + f.id);
      };

      tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.id)));
      window.addEventListener('hashchange', () => show(location.hash.slice(1)));
      show(location.hash.slice(1));
    }
  };

  window.KPHS = Object.assign(window.KPHS || {}, KPHS);

  document.addEventListener('DOMContentLoaded', () => {
    KPHS.layout();
    const app = document.getElementById('app');
    const page = document.body.dataset.page;
    if (page === 'home') KPHS.renderHub(app);
    else {
      const mod = window.KPHS_MENU.find(m => m.id === page);
      if (mod && mod.features) KPHS.renderModule(app, page);
    }
  });
})();
