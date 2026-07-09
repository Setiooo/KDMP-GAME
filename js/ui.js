/* =========================================================================
 * KDMP — ui.js
 * Menyambungkan state game ke DOM: KPI, panel keuangan, kontrol aksi,
 * pasar, unit usaha, riset, event modal, RAT/SHU, log, grafik, game over.
 * ========================================================================= */
window.UI = (function () {
  const C = window.CONFIG;
  const E = window.Economy;
  const G = window.Game;
  const $ = (s) => document.querySelector(s);
  const el = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString('id-ID');
  const rp = (n) => 'Rp\u00a0' + fmt(n);

  let activeTab = 'pasar';

  function init() {
    G.on(handle);
    bindTopControls();
    bindTabs();
    renderPanels();
    refresh();
  }

  function handle(type) {
    if (type === 'event') { showEvent(); }
    if (type === 'rat') { showRAT(); }
    if (type === 'gameover') { showGameOver(arguments[1]); }
    if (type === 'build' || type === 'research' || type === 'init') renderPanels();
    refresh();
  }

  /* ---- Kontrol atas: play/pause/speed/save ---- */
  function bindTopControls() {
    el('btnPause').onclick = () => G.setSpeed(0);
    el('btnPlay').onclick = () => G.setSpeed(1);
    el('btnFast').onclick = () => G.setSpeed(2);
    el('btnSave').onclick = () => G.save();
    el('btnAuto').onclick = () => G.toggleAutoBuy();
  }

  function bindTabs() {
    document.querySelectorAll('.tab').forEach(t => {
      t.onclick = () => { activeTab = t.dataset.tab; renderPanels(); updateTabs(); };
    });
  }
  function updateTabs() {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
    document.querySelectorAll('.tabpanel').forEach(p => p.classList.toggle('active', p.dataset.tab === activeTab));
  }

  /* ---- Refresh KPI & header ---- */
  function refresh() {
    const st = G.getState(); if (!st) return;
    const nw = E.netWorth(st);
    el('kpiCash').textContent = rp(st.cash);
    el('kpiCash').className = 'kpi-value' + (st.cash < 0 ? ' neg' : '');
    el('kpiNet').textContent = rp(nw);
    el('kpiMembers').textContent = fmt(st.members);
    el('kpiSHU').textContent = rp(st.shuPool);

    setGauge('Trust', st.trust);
    setGauge('Sat', st.satisfaction);
    setGauge('Rep', st.reputation);

    el('coopLevel').textContent = G.coopLevel().name;
    el('dateLabel').textContent = `Tahun ${st.year} · Hari ${st.day}`;
    el('seasonLabel').textContent = (st.season === 'Hujan' ? '🌧️ ' : '☀️ ') + st.season;

    const cap = E.storageCap(st), used = E.totalStock(st);
    el('storageBar').style.width = Math.min(100, (used / cap) * 100) + '%';
    el('storageText').textContent = `${fmt(used)} / ${fmt(cap)}`;

    // speed buttons
    const sp = G.getSpeed();
    el('btnPause').classList.toggle('on', sp === 0);
    el('btnPlay').classList.toggle('on', sp === 1);
    el('btnFast').classList.toggle('on', sp === 2);
    el('btnAuto').classList.toggle('on', st.autoBuy);
    el('btnAuto').textContent = st.autoBuy ? '🤖 Auto-Restock: ON' : '🤖 Auto-Restock: OFF';

    // research status
    if (st.activeResearch) {
      const r = C.research[st.activeResearch.id];
      el('researchStatus').textContent = `🔬 ${r.name} — ${st.activeResearch.daysLeft} hari lagi`;
    } else el('researchStatus').textContent = '';

    renderLog();
    drawChart();
    if (activeTab === 'pasar') refreshMarket();
    if (activeTab === 'unit') refreshUnitStates();
  }

  function setGauge(key, val) {
    const bar = el('gauge' + key); const txt = el('gauge' + key + 'Txt');
    if (!bar) return;
    bar.style.width = val + '%';
    txt.textContent = Math.round(val);
    let col = '#46A171';
    if (val < 30) col = '#E56458'; else if (val < 55) col = '#D5803B';
    bar.style.background = col;
  }

  /* ---- Render panel tab ---- */
  function renderPanels() {
    renderMarket();
    renderUnits();
    renderResearch();
    renderFinance();
    updateTabs();
  }

  // Tab Pasar: beli panen + set harga jual
  function renderMarket() {
    const wrap = el('panelPasar'); if (!wrap) return;
    let html = '<div class="section-title">Pasar & Perdagangan</div>';
    for (const p in C.products) {
      const pr = C.products[p];
      html += `
      <div class="prod-card" data-prod="${p}">
        <div class="prod-head"><span class="prod-emoji">${pr.emoji}</span>
          <div><div class="prod-name">${pr.name}</div>
          <div class="prod-sub">Beli: <b id="fg_${p}">-</b>/${pr.unit} · Wajar: Rp${fmt(pr.base)}</div></div>
          <div class="prod-stock">Stok<br><b id="stk_${p}">0</b></div>
        </div>
        <div class="prod-row">
          <label>Harga jual (Rp)</label>
          <input type="range" min="${Math.round(pr.base*0.5)}" max="${Math.round(pr.base*1.8)}" step="100" value="${pr.base}" id="price_${p}">
          <span class="price-val" id="priceval_${p}">${fmt(pr.base)}</span>
        </div>
        <div class="prod-actions">
          <button class="btn buy" data-buy="${p}" data-q="100">Beli 100</button>
          <button class="btn buy" data-buy="${p}" data-q="500">Beli 500</button>
          <button class="btn buy alt" data-buy="${p}" data-q="999999">Beli Maks</button>
        </div>
      </div>`;
    }
    wrap.innerHTML = html;
    for (const p in C.products) {
      const slider = el('price_' + p);
      slider.oninput = () => { el('priceval_' + p).textContent = fmt(slider.value); };
      slider.onchange = () => G.setPrice(p, +slider.value);
    }
    wrap.querySelectorAll('[data-buy]').forEach(b => {
      b.onclick = () => { G.buy(b.dataset.buy, +b.dataset.q); refreshMarket(); };
    });
    refreshMarket();
  }

  function refreshMarket() {
    const st = G.getState(); if (!st) return;
    // refresh supply agar harga tampil
    for (const p in C.products) {
      const fgEl = el('fg_' + p); if (fgEl) fgEl.textContent = 'Rp' + fmt(E.farmGatePrice(st, p));
      const stkEl = el('stk_' + p); if (stkEl) stkEl.textContent = fmt(st.stock[p] || 0);
      const pv = el('priceval_' + p); if (pv) pv.textContent = fmt(st.prices[p]);
      const sl = el('price_' + p); if (sl && document.activeElement !== sl) sl.value = st.prices[p];
    }
  }

  // Tab Unit Usaha
  function renderUnits() {
    const wrap = el('panelUnit'); if (!wrap) return;
    const st = G.getState(); if (!st) return;
    let html = '<div class="section-title">Unit Usaha</div><div class="unit-grid">';
    for (const type in C.units) {
      const def = C.units[type];
      if (!def.buildable) continue;
      const built = st.builtUnits.find(u => u.type === type);
      const lvl = built ? built.level : 0;
      const cost = built ? Math.round(def.cost * (0.65 + lvl * 0.35)) : def.cost;
      const maxed = built && lvl >= def.maxLevel;
      const label = built ? (maxed ? 'Level Maks' : `Upgrade → Lv${lvl + 1}`) : 'Bangun';
      html += `
      <div class="unit-card ${built ? 'built' : ''}">
        <div class="unit-top"><span class="unit-emoji" style="background:${window.Renderer.colorFor(type)}22;color:${window.Renderer.colorFor(type)}">${def.emoji}</span>
          <div class="unit-name">${def.name}${built ? ` <span class=\"lvl\">Lv${lvl}</span>` : ''}</div></div>
        <div class="unit-desc">${def.desc}</div>
        <div class="unit-foot">
          <span class="unit-op">Op: Rp${fmt(def.op)}/hari</span>
          <button class="btn build ${maxed ? 'disabled' : ''}" data-build="${type}" ${maxed ? 'disabled' : ''}>${label}${maxed ? '' : ` · Rp${fmt(cost)}`}</button>
        </div>
      </div>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-build]').forEach(b => {
      b.onclick = () => {
        const r = G.buildUnit(b.dataset.build);
        if (!r.ok) toast(r.msg);
        renderUnits();
      };
    });
  }
  function refreshUnitStates() { /* biaya statis; re-render on build */ }

  // Tab Riset
  function renderResearch() {
    const wrap = el('panelRiset'); if (!wrap) return;
    const st = G.getState(); if (!st) return;
    let html = '<div class="section-title">Riset Teknologi</div><div class="unit-grid">';
    for (const rid in C.research) {
      const r = C.research[rid];
      const done = st.completedResearch.includes(rid);
      const active = st.activeResearch && st.activeResearch.id === rid;
      const locked = r.req.some(q => !st.completedResearch.includes(q));
      let label = 'Teliti · Rp' + fmt(r.cost);
      let cls = '';
      if (done) { label = '✅ Selesai'; cls = 'disabled'; }
      else if (active) { label = `⏳ ${st.activeResearch.daysLeft} hari`; cls = 'disabled'; }
      else if (locked) { label = '🔒 Terkunci'; cls = 'disabled'; }
      const reqTxt = r.req.length ? `<div class="unit-req">Butuh: ${r.req.map(q => C.research[q].name).join(', ')}</div>` : '';
      html += `
      <div class="unit-card ${done ? 'built' : ''}">
        <div class="unit-top"><span class="unit-emoji" style="background:#E5F2FC;color:#2783DE">${r.emoji}</span>
          <div class="unit-name">${r.name}</div></div>
        <div class="unit-desc">${r.desc}</div>${reqTxt}
        <div class="unit-foot"><span class="unit-op">${r.days} hari</span>
          <button class="btn build ${cls}" data-res="${rid}" ${(done||active||locked)?'disabled':''}>${label}</button></div>
      </div>`;
    }
    html += '</div>';
    wrap.innerHTML = html;
    wrap.querySelectorAll('[data-res]').forEach(b => {
      b.onclick = () => { const r = G.startResearch(b.dataset.res); if (!r.ok) toast(r.msg); renderResearch(); refresh(); };
    });
  }

  // Tab Keuangan
  function renderFinance() {
    const wrap = el('panelKeuangan'); if (!wrap) return;
    wrap.innerHTML = `
      <div class="section-title">Keuangan & Pinjaman</div>
      <div class="fin-rows" id="finRows"></div>
      <div class="loan-box">
        <div class="loan-title">Pinjaman</div>
        <div class="loan-actions">
          <button class="btn" data-loan="5000000">Pinjam 5jt</button>
          <button class="btn" data-loan="10000000">Pinjam 10jt</button>
          <button class="btn alt" data-repay="5000000">Bayar 5jt</button>
        </div>
        <div class="loan-note">Bunga ≈ 0,06%/hari. Utang saat ini: <b id="loanNow">-</b></div>
      </div>`;
    wrap.querySelectorAll('[data-loan]').forEach(b => b.onclick = () => { G.takeLoan(+b.dataset.loan); renderFinanceRows(); });
    wrap.querySelectorAll('[data-repay]').forEach(b => b.onclick = () => { G.repayLoan(+b.dataset.repay); renderFinanceRows(); });
    renderFinanceRows();
  }
  function renderFinanceRows() {
    const st = G.getState(); if (!st) return;
    const rows = el('finRows'); if (!rows) return;
    const inv = E.inventoryValue(st), units = E.unitAssetValue(st), nw = E.netWorth(st);
    rows.innerHTML = `
      ${finRow('Kas', rp(st.cash), st.cash < 0)}
      ${finRow('Nilai Inventori', rp(inv))}
      ${finRow('Nilai Aset Unit', rp(units))}
      ${finRow('Hutang', '- ' + rp(st.loan), st.loan > 0)}
      ${finRow('Kekayaan Bersih', rp(nw), false, true)}
      ${finRow('Laba Kumulatif', rp(st.cumulativeProfit))}
      ${finRow('Kolam SHU', rp(st.shuPool))}
      ${finRow('Integritas', st.corruption > 0 ? `⚠️ ${st.corruption} pelanggaran` : '✅ Bersih', st.corruption>0)}
    `;
    const ln = el('loanNow'); if (ln) ln.textContent = rp(st.loan);
  }
  function finRow(k, v, neg, strong) {
    return `<div class="fin-row ${strong?'strong':''}"><span>${k}</span><span class="${neg?'neg':''}">${v}</span></div>`;
  }

  /* ---- Log aktivitas ---- */
  function renderLog() {
    const st = G.getState(); const box = el('logBox'); if (!box) return;
    box.innerHTML = st.log.map(l => `<div class="log-item"><span class="log-day">T${l.year}·H${l.day}</span> ${l.msg}</div>`).join('');
  }

  /* ---- Grafik kekayaan bersih & kepercayaan ---- */
  function drawChart() {
    const st = G.getState(); const cv = el('chart'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    if (cv.width !== rect.width * dpr) { cv.width = rect.width * dpr; cv.height = rect.height * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    const hist = st.history; if (hist.length < 2) return;
    const nws = hist.map(p => p.netWorth);
    const min = Math.min(...nws, 0), max = Math.max(...nws, 1);
    const pad = 6;
    const X = i => pad + (i / (hist.length - 1)) * (w - pad * 2);
    const Y = v => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
    // area net worth
    ctx.beginPath(); ctx.moveTo(X(0), Y(nws[0]));
    hist.forEach((p, i) => ctx.lineTo(X(i), Y(p.netWorth)));
    ctx.lineTo(X(hist.length - 1), h - pad); ctx.lineTo(X(0), h - pad); ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(39,131,222,0.35)'); grad.addColorStop(1, 'rgba(39,131,222,0.02)');
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); hist.forEach((p, i) => i ? ctx.lineTo(X(i), Y(p.netWorth)) : ctx.moveTo(X(i), Y(p.netWorth)));
    ctx.strokeStyle = '#2783DE'; ctx.lineWidth = 2; ctx.stroke();
    // trust line (0..100 scaled)
    const Yt = v => h - pad - (v / 100) * (h - pad * 2);
    ctx.beginPath(); hist.forEach((p, i) => i ? ctx.lineTo(X(i), Yt(p.trust)) : ctx.moveTo(X(i), Yt(p.trust)));
    ctx.strokeStyle = 'rgba(70,161,113,0.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  }

  /* ---- Event modal ---- */
  function showEvent() {
    const st = G.getState(); const ev = st.pendingEvent; if (!ev) return;
    const m = el('modal'); const body = el('modalBody');
    body.innerHTML = `
      <div class="ev-emoji">${ev.emoji}</div>
      <div class="ev-title">${ev.title}</div>
      <div class="ev-text">${ev.text}</div>
      <div class="ev-choices">${ev.choices.map((c, i) => `<button class="btn ev-choice" data-choice="${i}">${c.label}</button>`).join('')}</div>`;
    body.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => { G.resolveEvent(+b.dataset.choice); closeModal(); });
    openModal();
  }

  /* ---- RAT / SHU modal ---- */
  function showRAT() {
    const st = G.getState();
    const shu = st.pendingRAT || 0;
    const m = el('modal'); const body = el('modalBody');
    body.innerHTML = `
      <div class="ev-emoji">🏛️</div>
      <div class="ev-title">Rapat Anggota Tahunan — Tahun ${st.year - 1}</div>
      <div class="ev-text">SHU (Sisa Hasil Usaha) tahun ini: <b>${rp(shu)}</b>.<br>Berapa porsi yang dibagikan ke anggota vs disimpan sebagai cadangan?</div>
      <div class="ev-choices">
        <button class="btn ev-choice" data-shu="0.7">70% ke anggota (kepuasan↑, kas↓)</button>
        <button class="btn ev-choice" data-shu="0.4">40% ke anggota (seimbang)</button>
        <button class="btn ev-choice alt" data-shu="0.1">10% ke anggota (fokus ekspansi)</button>
      </div>`;
    body.querySelectorAll('[data-shu]').forEach(b => b.onclick = () => { G.distributeSHU(+b.dataset.shu); closeModal(); G.setSpeed(1); });
    openModal();
  }

  /* ---- Game over ---- */
  function showGameOver(info) {
    const st = G.getState();
    const m = el('modal'); const body = el('modalBody');
    body.innerHTML = `
      <div class="ev-emoji">${info.victory ? '🏆' : '💔'}</div>
      <div class="ev-title">${info.victory ? 'Kemenangan!' : 'Permainan Berakhir'}</div>
      <div class="ev-text">${info.reason}</div>
      <div class="go-stats">
        <div><span>Bertahan</span><b>${G.absoluteDay()} hari</b></div>
        <div><span>Kekayaan Bersih</span><b>${rp(E.netWorth(st))}</b></div>
        <div><span>Anggota</span><b>${fmt(st.members)}</b></div>
        <div><span>Level</span><b>${G.coopLevel().name}</b></div>
      </div>
      <div class="ev-choices"><button class="btn ev-choice" id="btnRestart">Main Lagi</button></div>`;
    el('btnRestart').onclick = () => { closeModal(); G.newGame(); renderPanels(); refresh(); };
    openModal();
  }

  function openModal() { el('modal').classList.add('show'); }
  function closeModal() { el('modal').classList.remove('show'); }

  /* ---- Toast ---- */
  let toastT;
  function toast(msg) {
    const t = el('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  return { init, refresh };
})();
