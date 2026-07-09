/* =========================================================================
 * KDMP — game.js
 * State inti, loop waktu, aksi pemain, event, riset, SHU, save/load.
 * ========================================================================= */
window.Game = (function () {
  const C = window.CONFIG;
  const E = window.Economy;

  const SAVE_KEY = 'kdmp_save_v1';

  let state = null;
  let timer = null;
  let speed = 0;          // 0 = pause, 1 = normal, 2 = cepat
  const SPEED_MS = { 1: 1400, 2: 500 };
  const listeners = [];

  function on(fn) { listeners.push(fn); }
  function emit(type, payload) { listeners.forEach(fn => fn(type, payload, state)); }

  function defaultState() {
    const stock = {}, prices = {}, supplyAvail = {};
    for (const p in C.products) { stock[p] = 0; prices[p] = C.products[p].base; supplyAvail[p] = 0; }
    return {
      day: 1, year: 1, seasonDay: 1, season: 'Kemarau',
      cash: C.startCash, loan: 0,
      members: C.startMembers,
      trust: C.startTrust, satisfaction: C.startSatisfaction, reputation: 50,
      stock, prices, supplyAvail,
      builtUnits: [{ type: 'kantor', level: 1, plot: 0 }],
      completedResearch: [], activeResearch: null,
      priceIndex: 1.0, supplyShock: 0, demandShock: 0, farmGateDiscount: 0, opHike: 0,
      shuPool: 0, cumulativeProfit: 0, corruption: 0,
      memberFraction: 0, memberMomentum: 0,
      bankruptDays: 0, gameOver: false, victory: false,
      autoBuy: true,
      history: [],           // untuk grafik: {day, netWorth, cash, trust}
      pendingEvent: null,
      log: [],
    };
  }

  function newGame() {
    state = defaultState();
    pushLog('🎉 Koperasi Desa Merah Putih didirikan! Selamat memimpin, Ketua.');
    snapshot();
    emit('init');
    setSpeed(1);
    return state;
  }

  function getState() { return state; }
  function getSpeed() { return speed; }

  function pushLog(msg) {
    state.log.unshift({ day: state.day, year: state.year, msg });
    if (state.log.length > 60) state.log.pop();
  }

  function snapshot() {
    state.history.push({
      day: absoluteDay(), netWorth: Math.round(E.netWorth(state)),
      cash: Math.round(state.cash), trust: Math.round(state.trust),
    });
    if (state.history.length > 120) state.history.shift();
  }

  function absoluteDay() { return (state.year - 1) * (C.seasonLength * 2) + state.day; }

  function coopLevel() {
    const nw = E.netWorth(state);
    let lvl = C.coopLevels[0];
    for (const l of C.coopLevels) if (nw >= l.min) lvl = l;
    return lvl;
  }

  /* ---- Loop waktu ---- */
  function setSpeed(s) {
    speed = s;
    if (timer) { clearInterval(timer); timer = null; }
    if (s > 0 && !state.gameOver && !state.pendingEvent) {
      timer = setInterval(tick, SPEED_MS[s]);
    }
    emit('speed');
  }

  function pause() { setSpeed(0); }

  function tick() {
    if (state.gameOver || state.pendingEvent) return;

    // Auto-buy stok bila diaktifkan
    if (state.autoBuy) autoRestock();

    const log = E.simulateDay(state);
    pushLog(`Hari ${state.day} · Omzet Rp${fmt(log.revenue)} · Op Rp${fmt(log.opCost)} · Terjual: 🌾${fmt(log.sold.beras||0)} 🥬${fmt(log.sold.sayur||0)} 🛒${fmt(log.sold.sembako||0)}`);

    // Progres riset
    if (state.activeResearch) {
      state.activeResearch.daysLeft--;
      if (state.activeResearch.daysLeft <= 0) {
        const rid = state.activeResearch.id;
        state.completedResearch.push(rid);
        const r = C.research[rid];
        if (r.effect.trust) state.trust = E.clamp(state.trust + r.effect.trust, 0, 100);
        pushLog(`🔬 Riset selesai: ${r.name}!`);
        state.activeResearch = null;
        emit('research');
      }
    }

    // Maju hari
    state.day++;
    state.seasonDay++;
    if (state.seasonDay > C.seasonLength) {
      state.seasonDay = 1;
      state.season = state.season === 'Kemarau' ? 'Hujan' : 'Kemarau';
      pushLog(`🌦️ Musim berganti menjadi ${state.season}.`);
      // Akhir tahun tiap 2 musim → RAT + SHU
      if (state.season === 'Kemarau') endOfYear();
    }

    snapshot();
    checkGameOver();
    maybeTriggerEvent();
    emit('tick', log);
  }

  function autoRestock() {
    // Refresh supply supaya autobuy punya stok sumber
    state.supplyAvail = {};
    for (const p in C.products) state.supplyAvail[p] = E.dailySupply(state, p);
    const cap = E.storageCap(state);
    const target = cap * 0.8;
    for (const p in C.products) {
      const cur = E.totalStock(state);
      if (cur >= target) break;
      const perCap = C.perCapitaDemand[p];
      const want = Math.round(state.members * perCap * 2.5);
      E.buyHarvest(state, p, want);
    }
  }

  function endOfYear() {
    const shu = Math.round(state.shuPool);
    state.pendingRAT = shu;
    pushLog(`🏛️ Rapat Anggota Tahunan (Tahun ${state.year}). SHU tersedia: Rp${fmt(shu)}.`);
    state.year++;
    emit('rat', shu);
  }

  // Bagi SHU: fraksi ke anggota (naikkan kepuasan), sisa jadi cadangan (kas)
  function distributeSHU(toMembersFrac) {
    const shu = state.shuPool;
    if (shu <= 0) { state.pendingRAT = null; return; }
    const toMembers = shu * toMembersFrac;
    // Uang ke anggota keluar dari kas; cadangan tetap di kas
    state.cash -= toMembers;
    const satBoost = toMembersFrac * 18;
    const trustBoost = toMembersFrac * 10;
    state.satisfaction = E.clamp(state.satisfaction + satBoost, 0, 100);
    state.trust = E.clamp(state.trust + trustBoost, 0, 100);
    pushLog(`💵 SHU dibagikan: Rp${fmt(Math.round(toMembers))} ke anggota, Rp${fmt(Math.round(shu - toMembers))} ke cadangan.`);
    state.shuPool = 0;
    state.pendingRAT = null;
    emit('change');
  }

  /* ---- Aksi pemain ---- */
  function buy(product, qty) {
    // Pastikan supply hari ini tersedia
    if (!state.supplyAvail[product]) {
      for (const p in C.products) state.supplyAvail[p] = E.dailySupply(state, p);
    }
    const r = E.buyHarvest(state, product, qty);
    if (r.bought > 0) pushLog(`🛒 Beli ${r.bought} ${C.products[product].unit} ${C.products[product].name} (Rp${fmt(r.cost)}).`);
    emit('change');
    return r;
  }

  function setPrice(product, price) {
    state.prices[product] = Math.max(0, Math.round(price));
    emit('change');
  }

  function buildUnit(type) {
    const def = C.units[type];
    if (!def || !def.buildable) return { ok: false, msg: 'Tidak bisa dibangun.' };
    const existing = state.builtUnits.find(u => u.type === type);
    if (existing) {
      // Upgrade
      if (existing.level >= def.maxLevel) return { ok: false, msg: 'Sudah level maksimal.' };
      const cost = Math.round(def.cost * (0.65 + existing.level * 0.35));
      if (state.cash < cost) return { ok: false, msg: 'Kas tidak cukup.' };
      state.cash -= cost;
      existing.level++;
      pushLog(`⬆️ ${def.name} di-upgrade ke level ${existing.level} (Rp${fmt(cost)}).`);
      emit('change'); emit('build');
      return { ok: true };
    }
    if (state.cash < def.cost) return { ok: false, msg: 'Kas tidak cukup.' };
    const plot = nextPlot();
    if (plot === -1) return { ok: false, msg: 'Lahan penuh.' };
    state.cash -= def.cost;
    state.builtUnits.push({ type, level: 1, plot });
    pushLog(`🏗️ Membangun ${def.name} (Rp${fmt(def.cost)}).`);
    emit('change'); emit('build');
    return { ok: true };
  }

  function nextPlot() {
    const used = new Set(state.builtUnits.map(u => u.plot));
    for (let i = 0; i < window.PLOTS.length; i++) if (!used.has(i)) return i;
    return -1;
  }

  function startResearch(rid) {
    const r = C.research[rid];
    if (!r) return { ok: false, msg: 'Riset tidak ada.' };
    if (state.completedResearch.includes(rid)) return { ok: false, msg: 'Sudah diteliti.' };
    if (state.activeResearch) return { ok: false, msg: 'Riset lain sedang berjalan.' };
    for (const req of r.req) if (!state.completedResearch.includes(req)) return { ok: false, msg: 'Prasyarat belum terpenuhi.' };
    if (state.cash < r.cost) return { ok: false, msg: 'Kas tidak cukup.' };
    state.cash -= r.cost;
    state.activeResearch = { id: rid, daysLeft: r.days };
    pushLog(`🔬 Memulai riset: ${r.name} (${r.days} hari).`);
    emit('change');
    return { ok: true };
  }

  function takeLoan(amount) {
    state.loan += amount; state.cash += amount;
    pushLog(`🏦 Mengambil pinjaman Rp${fmt(amount)}.`);
    emit('change');
  }
  function repayLoan(amount) {
    const pay = Math.min(amount, state.loan, state.cash);
    state.loan -= pay; state.cash -= pay;
    pushLog(`💳 Membayar pinjaman Rp${fmt(pay)}.`);
    emit('change');
  }

  function toggleAutoBuy() { state.autoBuy = !state.autoBuy; emit('change'); }

  /* ---- Event ---- */
  function maybeTriggerEvent() {
    if (state.pendingEvent) return;
    if (state.day < 5) return;
    if (Math.random() > 0.14) return; // ~14% per hari
    const pool = C.events.filter(e => !e.season || e.season === state.season);
    const totalW = pool.reduce((a, e) => a + e.weight, 0);
    let r = Math.random() * totalW;
    let chosen = pool[0];
    for (const e of pool) { r -= e.weight; if (r <= 0) { chosen = e; break; } }
    state.pendingEvent = chosen;
    setSpeed(0);
    emit('event', chosen);
  }

  function resolveEvent(choiceIdx) {
    const ev = state.pendingEvent;
    if (!ev) return;
    const ch = ev.choices[choiceIdx];
    applyEffect(ch.apply);
    pushLog(`${ev.emoji} ${ev.title} → ${ch.label}`);
    state.pendingEvent = null;
    emit('change');
    checkGameOver();
    if (!state.gameOver) setSpeed(speed || 1);
  }

  function applyEffect(a) {
    if (!a) return;
    if (a.cash) state.cash += a.cash;
    if (a.trust) state.trust = E.clamp(state.trust + a.trust, 0, 100);
    if (a.satisfaction) state.satisfaction = E.clamp(state.satisfaction + a.satisfaction, 0, 100);
    if (a.reputation) state.reputation = E.clamp(state.reputation + a.reputation * 100, 0, 100);
    if (a.priceShock) { for (const p in state.prices) state.prices[p] = Math.round(state.prices[p] * (1 + a.priceShock)); }
    if (a.supplyShock) state.supplyShock += a.supplyShock;
    if (a.demandShock) state.demandShock += a.demandShock;
    if (a.farmGateCut) state.farmGateDiscount += a.farmGateCut;
    if (a.opHike) state.opHike += a.opHike;
    if (a.corruption) state.corruption += a.corruption;
    if (a.stockLoss) { for (const p in state.stock) state.stock[p] *= (1 - a.stockLoss); }
  }

  /* ---- Game over / menang ---- */
  function checkGameOver() {
    if (state.gameOver) return;
    if (state.cash < C.bankruptcyFloor) {
      state.bankruptDays++;
      if (state.bankruptDays >= C.bankruptcyGraceDays) {
        state.gameOver = true; state.victory = false;
        pushLog('💥 Koperasi bangkrut. Kas negatif terlalu lama.');
        setSpeed(0); emit('gameover', { victory: false, reason: 'Bangkrut — kas negatif berkepanjangan.' });
      }
    } else state.bankruptDays = 0;

    if (state.trust <= C.trustGameOver) {
      state.gameOver = true; state.victory = false;
      pushLog('�� Mosi tidak percaya! Anggota mencabut mandat Anda.');
      setSpeed(0); emit('gameover', { victory: false, reason: 'Kepercayaan warga runtuh (mosi tidak percaya).' });
    }

    if (E.netWorth(state) >= C.coopLevels[C.coopLevels.length - 1].min && !state.victory) {
      state.victory = true; state.gameOver = true;
      pushLog('🏆 Selamat! Koperasi mencapai status Holding Regional!');
      setSpeed(0); emit('gameover', { victory: true, reason: 'Koperasi mencapai Holding Regional!' });
    }
  }

  /* ---- Save / Load ---- */
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); pushLog('💾 Permainan disimpan.'); emit('change'); return true; }
    catch (e) { return false; }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      state = JSON.parse(raw);
      pushLog('📂 Permainan dimuat.');
      emit('init'); setSpeed(0);
      return true;
    } catch (e) { return false; }
  }
  function hasSave() { return !!localStorage.getItem(SAVE_KEY); }

  function fmt(n) { return Math.round(n).toLocaleString('id-ID'); }

  return {
    newGame, getState, getSpeed, setSpeed, pause, on,
    buy, setPrice, buildUnit, startResearch, takeLoan, repayLoan, toggleAutoBuy,
    resolveEvent, distributeSHU, coopLevel, absoluteDay,
    save, load, hasSave, fmt,
  };
})();
