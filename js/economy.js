/* =========================================================================
 * KDMP — economy.js
 * Mesin simulasi ekonomi: agregasi modifier unit/riset, supply-demand,
 * penjualan, biaya, susut, dinamika sosial (kepercayaan/kepuasan/anggota).
 * ========================================================================= */
window.Economy = (function () {
  const C = window.CONFIG;

  // Kumpulkan semua modifier aktif dari unit usaha + riset
  function collectModifiers(state) {
    const m = {
      storage: 1200, salesCap: 200, demand: 0, perishCut: 0, logisticsCut: 0,
      berasMargin: 0, valueAdd: 0, interestIncome: 0, loyalty: 0, adminEff: 0,
      reputation: 0, supply: 0, forecast: 0, opExtra: 0,
    };
    for (const u of state.builtUnits) {
      const def = C.units[u.type];
      if (!def || !def.effect) continue;
      const lvl = u.level || 1;
      for (const [k, v] of Object.entries(def.effect)) {
        if (m[k] === undefined) m[k] = 0;
        m[k] += v * lvl;
      }
      m.opExtra += def.op * lvl;
    }
    for (const rid of state.completedResearch) {
      const def = C.research[rid];
      if (!def || !def.effect) continue;
      for (const [k, v] of Object.entries(def.effect)) {
        if (m[k] === undefined) m[k] = 0;
        m[k] += v;
      }
    }
    return m;
  }

  // Total kapasitas gudang
  function storageCap(state) { return collectModifiers(state).storage; }

  // Total stok saat ini
  function totalStock(state) {
    return Object.values(state.stock).reduce((a, b) => a + b, 0);
  }

  // Nilai inventori (untuk aset)
  function inventoryValue(state) {
    let v = 0;
    for (const p in state.stock) v += state.stock[p] * C.products[p].farmGate;
    return v;
  }

  // Nilai aset unit usaha (untuk net worth)
  function unitAssetValue(state) {
    let v = 0;
    for (const u of state.builtUnits) {
      const def = C.units[u.type];
      if (def) v += def.cost * (u.level || 1) * 0.7;
    }
    return v;
  }

  function netWorth(state) {
    return state.cash + inventoryValue(state) + unitAssetValue(state) - state.loan;
  }

  // Harga beli gabah (farm gate) hari ini per produk
  function farmGatePrice(state, product) {
    const base = C.products[product].farmGate;
    const seasonMul = state.season === 'Kemarau' ? 0.95 : 1.08; // hujan lebih mahal
    return Math.round(base * seasonMul * state.priceIndex * (1 - state.farmGateDiscount));
  }

  // Supply harian yang tersedia untuk dibeli
  function dailySupply(state, product) {
    const m = collectModifiers(state);
    const seasonMul = state.season === 'Kemarau' ? 1.15 : 0.85;
    const perCap = C.perCapitaDemand[product];
    let base = state.members * perCap * 2.2 * seasonMul;
    base *= (1 + m.supply + state.supplyShock);
    return Math.max(0, Math.round(base));
  }

  // Beli hasil panen: qty dibatasi supply, kas, dan kapasitas gudang
  function buyHarvest(state, product, qty) {
    const price = farmGatePrice(state, product);
    const cap = storageCap(state);
    const room = cap - totalStock(state);
    const affordable = Math.floor(state.cash / price);
    const buy = Math.max(0, Math.min(qty, room, affordable, state.supplyAvail[product] || 0));
    if (buy <= 0) return { bought: 0, cost: 0 };
    const cost = buy * price;
    state.cash -= cost;
    state.stock[product] = (state.stock[product] || 0) + buy;
    state.supplyAvail[product] -= buy;
    return { bought: buy, cost };
  }

  // Harga jual efektif (mempertimbangkan value-add & margin penggilingan)
  function sellPrice(state, product) {
    return Math.round(state.prices[product] * state.priceIndex);
  }

  // Referensi "harga wajar" untuk menilai keadilan harga
  function fairPrice(product) { return C.products[product].base; }

  /* --- Simulasi satu hari --- */
  function simulateDay(state) {
    const m = collectModifiers(state);
    const log = { revenue: 0, cogsDecay: 0, sold: {}, unmet: 0, opCost: 0, interest: 0, interestIncome: 0 };

    // 1) Refresh supply yang tersedia untuk dibeli hari ini
    state.supplyAvail = {};
    for (const p in C.products) state.supplyAvail[p] = dailySupply(state, p);

    // 2) Permintaan & penjualan per produk
    let totalDemand = 0, totalUnmet = 0, fairnessScore = 0, fairnessN = 0;
    for (const p in C.products) {
      const price = sellPrice(state, p);
      const fair = fairPrice(p);
      // Elastisitas: harga di atas wajar menekan permintaan
      const ratio = price / fair;
      const elasticity = 1.6;
      let priceFactor = Math.pow(Math.max(0.2, 2 - ratio), elasticity);
      priceFactor = Math.max(0.05, Math.min(2.2, priceFactor));
      const trustFactor = 0.4 + 0.6 * (state.trust / 100);
      const demandMul = 1 + m.demand + state.demandShock;
      const perCap = C.perCapitaDemand[p];
      let demand = state.members * perCap * priceFactor * trustFactor * demandMul;
      demand = Math.max(0, Math.round(demand));

      const stock = state.stock[p] || 0;
      const sold = Math.min(demand, stock);
      let unitPrice = price;
      if (p === 'beras') unitPrice = Math.round(unitPrice * (1 + m.berasMargin));
      unitPrice = Math.round(unitPrice * (1 + m.valueAdd));
      const rev = sold * unitPrice;

      state.stock[p] = stock - sold;
      log.revenue += rev;
      log.sold[p] = sold;
      totalDemand += demand;
      totalUnmet += Math.max(0, demand - stock);

      // Keadilan harga (untuk trust)
      fairnessScore += (2 - ratio);
      fairnessN++;
    }
    log.unmet = totalUnmet;

    // 3) Susut / pembusukan stok
    const perishMul = Math.max(0.15, 1 - m.perishCut);
    for (const p in C.products) {
      const decay = (state.stock[p] || 0) * C.products[p].perish * perishMul;
      state.stock[p] = Math.max(0, (state.stock[p] || 0) - decay);
      log.cogsDecay += decay * C.products[p].farmGate;
    }

    // 4) Biaya operasional
    const adminEff = Math.min(0.6, m.adminEff);
    let op = (60000 + m.opExtra) * (1 - adminEff);
    op *= (1 - m.logisticsCut * 0.4);
    op += state.opHike;
    op *= state.priceIndex;
    log.opCost = Math.round(op);
    state.cash -= log.opCost;

    // 5) Bunga pinjaman & pendapatan bunga simpan pinjam
    if (state.loan > 0) {
      log.interest = Math.round(state.loan * 0.0006); // ~0.06%/hari
      state.cash -= log.interest;
    }
    if (m.interestIncome > 0) {
      log.interestIncome = Math.round(m.interestIncome * (state.members / 22));
      state.cash += log.interestIncome;
      state.shuPool += log.interestIncome * 0.3;
    }

    // 6) Akumulasi laba (untuk SHU)
    const dayProfit = log.revenue - log.opCost - log.interest - log.cogsDecay + log.interestIncome;
    state.shuPool += Math.max(0, dayProfit * 0.25);
    state.cumulativeProfit += dayProfit;

    // 7) Dinamika sosial
    const fairness = fairnessN ? fairnessScore / fairnessN : 1; // >1 murah, <1 mahal
    const unmetRatio = totalDemand > 0 ? totalUnmet / totalDemand : 0;

    let dTrust = (fairness - 1) * 3.2 - unmetRatio * 4 + m.reputation * 2;
    let dSat = (fairness - 1) * 2.4 - unmetRatio * 5 + m.loyalty * 3 + m.reputation * 1.5;
    // regresi ke rata-rata ringan
    dTrust += (55 - state.trust) * 0.015;
    dSat += (55 - state.satisfaction) * 0.015;

    state.trust = clamp(state.trust + dTrust, 0, 100);
    state.satisfaction = clamp(state.satisfaction + dSat, 0, 100);
    state.reputation = clamp(state.reputation + m.reputation * 0.1, 0, 100);

    // 8) Pertumbuhan / penyusutan anggota (mingguan halus)
    const health = (state.trust + state.satisfaction) / 2;
    if (health > 68) state.memberMomentum += 0.06;
    else if (health < 42) state.memberMomentum -= 0.08;
    else state.memberMomentum *= 0.9;
    state.memberMomentum = clamp(state.memberMomentum, -1.5, 1.5);
    state.memberFraction += state.memberMomentum;
    while (state.memberFraction >= 1) { state.members++; state.memberFraction -= 1; }
    while (state.memberFraction <= -1 && state.members > 3) { state.members--; state.memberFraction += 1; }

    // 9) Peluruhan shock sementara
    state.supplyShock *= 0.85; if (Math.abs(state.supplyShock) < 0.01) state.supplyShock = 0;
    state.demandShock *= 0.85; if (Math.abs(state.demandShock) < 0.01) state.demandShock = 0;
    state.farmGateDiscount *= 0.8; if (state.farmGateDiscount < 0.01) state.farmGateDiscount = 0;

    return log;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  return {
    collectModifiers, storageCap, totalStock, inventoryValue, unitAssetValue,
    netWorth, farmGatePrice, dailySupply, buyHarvest, sellPrice, fairPrice,
    simulateDay, clamp,
  };
})();
