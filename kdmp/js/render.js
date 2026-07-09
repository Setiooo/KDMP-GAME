/* =========================================================================
 * KDMP — render.js (v2, upgraded visuals)
 * Desa 2.5D isometrik: tanah bertekstur, pohon, air beriak, sawah, jalan,
 * bangunan detail (atap, pintu, jendela, cerobong), warga berjalan, asap,
 * awan, matahari/bulan, dan cuaca musiman.
 * ========================================================================= */

window.PLOTS = [
  { x: 4, y: 4 }, // 0 kantor (pusat)
  { x: 3, y: 3 }, { x: 5, y: 3 }, { x: 3, y: 5 }, { x: 5, y: 5 },
  { x: 2, y: 4 }, { x: 6, y: 4 }, { x: 4, y: 2 }, { x: 4, y: 6 },
  { x: 2, y: 2 }, { x: 6, y: 6 }, { x: 6, y: 2 }, { x: 2, y: 6 },
];

window.Renderer = (function () {
  const C = window.CONFIG;
  let canvas, ctx, dpr = 1;
  let anim = 0;
  let origin = { x: 0, y: 0 };
  let rain = [], clouds = [], villagers = [], decor = [];
  let W = 0, H = 0;

  // ---- Seeded RNG supaya dekorasi stabil (tidak berkedip) ----
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let terrain = [];
  function buildTerrain() {
    const n = C.gridSize;
    const rnd = mulberry(1337);
    terrain = [];
    for (let y = 0; y < n; y++) {
      const row = [];
      for (let x = 0; x < n; x++) {
        let t = 'grass';
        if (x === 0 || y === 0 || x === n - 1 || y === n - 1) t = 'field';
        if (x === 4 || y === 4) t = 'road';
        if ((x === 0 && y === n - 1) || (x === 1 && y === n - 1) || (x === 0 && y === n - 2)) t = 'water';
        row.push(t);
      }
      terrain.push(row);
    }
    // Dekorasi (pohon/semak/bunga) di tile grass yang bukan plot bangunan
    decor = [];
    const plotSet = new Set(window.PLOTS.map(p => p.x + ',' + p.y));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (terrain[y][x] !== 'grass') continue;
        if (plotSet.has(x + ',' + y)) continue;
        const r = rnd();
        if (r < 0.28) decor.push({ x, y, kind: 'tree', s: 0.8 + rnd() * 0.5, o: rnd() * 6 });
        else if (r < 0.42) decor.push({ x, y, kind: 'bush', s: 0.8 + rnd() * 0.4 });
        else if (r < 0.6) decor.push({ x, y, kind: 'flower', c: ['#E56458', '#EAC26B', '#BF8EDA', '#fff'][(rnd() * 4) | 0] });
      }
    }
  }

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    buildTerrain();
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 90; i++) rain.push(newDrop());
    for (let i = 0; i < 4; i++) clouds.push({ x: Math.random(), y: 0.08 + Math.random() * 0.22, s: 0.00006 + Math.random() * 0.00008, w: 60 + Math.random() * 70 });
    buildVillagers();
    requestAnimationFrame(loop);
  }

  // Warga berjalan di sepanjang jalan (salib di x=4 dan y=4)
  function buildVillagers() {
    villagers = [];
    const n = C.gridSize;
    const rnd = mulberry(77);
    for (let i = 0; i < 10; i++) {
      const horiz = rnd() < 0.5;
      villagers.push({
        horiz,
        pos: rnd() * (n - 1),
        fixed: 4,
        spd: 0.004 + rnd() * 0.006,
        dir: rnd() < 0.5 ? 1 : -1,
        c: ['#E56458', '#2783DE', '#46A171', '#D5803B', '#BF8EDA'][(rnd() * 5) | 0],
      });
    }
  }

  function newDrop() { return { x: Math.random(), y: Math.random(), s: 0.006 + Math.random() * 0.012 }; }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.max(1, W * dpr);
    canvas.height = Math.max(1, H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = C.gridSize;
    origin.x = W / 2;
    origin.y = H / 2 - (n * C.tileH) / 2 + 30;
  }

  function iso(x, y) {
    return { x: origin.x + (x - y) * (C.tileW / 2), y: origin.y + (x + y) * (C.tileH / 2) };
  }

  function loop() { anim++; draw(); requestAnimationFrame(loop); }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return `rgb(${r},${g},${b})`;
  }

  const TERRAIN_COLOR = { grass: '#8FC97A', field: '#E4C86B', road: '#CBB894', water: '#5FB0D6' };

  function tileDiamond(px, py, hw, hh) {
    ctx.beginPath();
    ctx.moveTo(px, py - hh);
    ctx.lineTo(px + hw, py);
    ctx.lineTo(px, py + hh);
    ctx.lineTo(px - hw, py);
    ctx.closePath();
  }

  function drawTile(x, y, color) {
    const p = iso(x, y);
    const hw = C.tileW / 2, hh = C.tileH / 2;
    tileDiamond(p.x, p.y, hw, hh);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawGrassTexture(x, y) {
    const p = iso(x, y);
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = '#4f8f4a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const ox = ((x * 7 + y * 3 + i * 13) % 9) - 4;
      const bx = p.x + ox * 3, by = p.y + ((i - 1) * 5);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 2, by - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 2, by - 4); ctx.stroke();
    }
    ctx.restore();
  }

  function drawFieldRows(x, y, hujan) {
    const p = iso(x, y);
    ctx.save();
    ctx.strokeStyle = hujan ? 'rgba(70,140,70,0.55)' : 'rgba(150,110,30,0.35)';
    ctx.lineWidth = 2;
    const sway = Math.sin(anim / 26 + x + y) * 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x - C.tileW / 2 + 8, p.y + i * 5);
      ctx.lineTo(p.x + sway, p.y + i * 5 + C.tileH / 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWater(x, y) {
    const p = iso(x, y);
    const hw = C.tileW / 2, hh = C.tileH / 2;
    const w = Math.sin((anim / 28) + x + y) * 14;
    tileDiamond(p.x, p.y, hw, hh);
    ctx.fillStyle = shade(TERRAIN_COLOR.water, w);
    ctx.fill();
    // kilau air
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const yy = p.y - 4 + i * 8 + Math.sin(anim / 20 + i + x) * 2;
      ctx.beginPath(); ctx.moveTo(p.x - hw + 6, yy); ctx.lineTo(p.x - hw / 3, yy); ctx.stroke();
    }
    ctx.restore();
  }

  function drawTree(d) {
    const p = iso(d.x, d.y);
    const sway = Math.sin(anim / 30 + d.o) * 1.5;
    const s = d.s;
    // bayangan
    ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, 11 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // batang
    ctx.fillStyle = '#8a5a34';
    ctx.fillRect(p.x - 2, p.y - 14 * s, 4, 14 * s);
    // daun (3 gumpalan)
    const greens = ['#3f8f4a', '#4CA65A', '#5DBB68'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = greens[i];
      ctx.beginPath();
      ctx.arc(p.x + sway + (i - 1) * 6 * s, p.y - 20 * s - i * 3, 9 * s - i, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBush(d) {
    const p = iso(d.x, d.y);
    ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 9 * d.s, 4 * d.s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#4CA65A';
    ctx.beginPath(); ctx.arc(p.x - 3, p.y - 4, 5 * d.s, 0, Math.PI * 2);
    ctx.arc(p.x + 3, p.y - 4, 5 * d.s, 0, Math.PI * 2);
    ctx.arc(p.x, p.y - 7, 5.5 * d.s, 0, Math.PI * 2); ctx.fill();
  }

  function drawFlower(d) {
    const p = iso(d.x, d.y);
    ctx.fillStyle = '#4f8f4a'; ctx.fillRect(p.x - 0.5, p.y - 6, 1, 6);
    ctx.fillStyle = d.c;
    ctx.beginPath(); ctx.arc(p.x, p.y - 7, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#EAC26B';
    ctx.beginPath(); ctx.arc(p.x, p.y - 7, 1, 0, Math.PI * 2); ctx.fill();
  }

  function drawBuilding(x, y, color, def, level, active) {
    const p = iso(x, y);
    const hw = C.tileW / 2 * 0.6, hh = C.tileH / 2 * 0.6;
    const height = 28 + (level - 1) * 13;
    const bob = active ? Math.sin(anim / 24 + x + y) * 1.0 : 0;
    const baseY = p.y + 2 + bob;

    // bayangan
    ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, hw * 1.25, hh * 1.0, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    // dinding kiri
    ctx.fillStyle = shade(color, -38);
    ctx.beginPath();
    ctx.moveTo(p.x - hw, baseY); ctx.lineTo(p.x - hw, baseY - height);
    ctx.lineTo(p.x, baseY - height + hh); ctx.lineTo(p.x, baseY + hh);
    ctx.closePath(); ctx.fill();
    // dinding kanan
    ctx.fillStyle = shade(color, -16);
    ctx.beginPath();
    ctx.moveTo(p.x + hw, baseY); ctx.lineTo(p.x + hw, baseY - height);
    ctx.lineTo(p.x, baseY - height + hh); ctx.lineTo(p.x, baseY + hh);
    ctx.closePath(); ctx.fill();

    // pintu (dinding kanan) & jendela (dinding kiri)
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.moveTo(p.x + hw * 0.35, baseY + hh * 0.15);
    ctx.lineTo(p.x + hw * 0.35, baseY - height * 0.42);
    ctx.lineTo(p.x + hw * 0.02, baseY - height * 0.42 + hh * 0.32);
    ctx.lineTo(p.x + hw * 0.02, baseY + hh * 0.47);
    ctx.closePath(); ctx.fill();
    const lit = active ? 'rgba(255,229,150,0.9)' : 'rgba(210,230,245,0.75)';
    ctx.fillStyle = lit;
    for (let r = 0; r < (level > 2 ? 2 : 1); r++) {
      ctx.beginPath();
      const wy = baseY - height * 0.55 - r * height * 0.3;
      ctx.moveTo(p.x - hw * 0.62, wy);
      ctx.lineTo(p.x - hw * 0.62, wy - hh * 0.5);
      ctx.lineTo(p.x - hw * 0.2, wy - hh * 0.5 + hh * 0.42);
      ctx.lineTo(p.x - hw * 0.2, wy + hh * 0.42);
      ctx.closePath(); ctx.fill();
    }

    // atap runcing
    const roofH = 12 + level * 2;
    const apex = baseY - height - roofH;
    ctx.fillStyle = shade(color, 30);
    ctx.beginPath();
    ctx.moveTo(p.x, apex);
    ctx.lineTo(p.x + hw + 4, baseY - height);
    ctx.lineTo(p.x, baseY - height + hh);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(color, 12);
    ctx.beginPath();
    ctx.moveTo(p.x, apex);
    ctx.lineTo(p.x - hw - 4, baseY - height);
    ctx.lineTo(p.x, baseY - height + hh);
    ctx.closePath(); ctx.fill();

    // cerobong + asap untuk unit produksi tertentu
    const smoky = ['penggilingan', 'umkm', 'coldstorage'].includes(def.key);
    if (smoky) {
      const cx = p.x + hw * 0.5, cy = baseY - height - roofH * 0.3;
      ctx.fillStyle = shade(color, -30);
      ctx.fillRect(cx - 2, cy - 8, 4, 10);
      if (active) {
        for (let i = 0; i < 3; i++) {
          const t = (anim / 40 + i * 0.5) % 1;
          ctx.save(); ctx.globalAlpha = (1 - t) * 0.4; ctx.fillStyle = '#c9c9c9';
          ctx.beginPath(); ctx.arc(cx + Math.sin(t * 6 + i) * 3, cy - 8 - t * 20, 2 + t * 4, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
    }

    // papan emoji
    ctx.font = '15px "Segoe UI Emoji", "Noto Color Emoji", system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.emoji, p.x, baseY - height + hh + 1);

    // badge level
    if (level > 1) {
      ctx.fillStyle = '#46A171';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - 12, baseY + hh + 2, 24, 12, 6) : ctx.rect(p.x - 12, baseY + hh + 2, 24, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px system-ui';
      ctx.fillText('Lv' + level, p.x, baseY + hh + 8);
    }
  }

  function drawVillager(v) {
    v.pos += v.spd * v.dir * (window.Game && window.Game.getSpeed() > 0 ? (window.Game.getSpeed() === 2 ? 2.4 : 1.4) : 0.5);
    const n = C.gridSize;
    if (v.pos > n - 1) { v.pos = n - 1; v.dir = -1; }
    if (v.pos < 0) { v.pos = 0; v.dir = 1; }
    const gx = v.horiz ? v.pos : v.fixed;
    const gy = v.horiz ? v.fixed : v.pos;
    const p = iso(gx, gy);
    const step = Math.sin(anim / 6 + v.pos * 4) * 1.2;
    ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // badan
    ctx.fillStyle = v.c;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - 2.2, p.y - 9 + Math.abs(step) * 0.2, 4.4, 8, 2) : ctx.rect(p.x - 2.2, p.y - 9, 4.4, 8); ctx.fill();
    // kepala
    ctx.fillStyle = '#F1C79B';
    ctx.beginPath(); ctx.arc(p.x, p.y - 11, 2.4, 0, Math.PI * 2); ctx.fill();
  }

  function drawSky(hujan) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (hujan) { g.addColorStop(0, '#93A9B8'); g.addColorStop(1, '#C2CFD4'); }
    else { g.addColorStop(0, '#BEE6F5'); g.addColorStop(0.6, '#DCF1E8'); g.addColorStop(1, '#EAF6DC'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // matahari / bulan
    ctx.save();
    ctx.globalAlpha = hujan ? 0.25 : 0.9;
    const sx = W * 0.82, sy = H * 0.16;
    const sun = ctx.createRadialGradient(sx, sy, 4, sx, sy, 42);
    sun.addColorStop(0, hujan ? '#dfe6ea' : '#FFE9A8');
    sun.addColorStop(1, 'rgba(255,233,168,0)');
    ctx.fillStyle = sun; ctx.beginPath(); ctx.arc(sx, sy, 42, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = hujan ? 0.4 : 1;
    ctx.fillStyle = hujan ? '#eef2f4' : '#FFD766';
    ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // awan
    for (const c of clouds) {
      c.x += c.s * (1 + (window.Game && window.Game.getSpeed()) || 0);
      if (c.x > 1.2) c.x = -0.2;
      const px = c.x * W, py = c.y * H;
      ctx.save(); ctx.globalAlpha = hujan ? 0.6 : 0.85; ctx.fillStyle = hujan ? '#e4eaed' : '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, c.w * 0.35, 0, Math.PI * 2);
      ctx.arc(px + c.w * 0.4, py + 4, c.w * 0.28, 0, Math.PI * 2);
      ctx.arc(px - c.w * 0.4, py + 5, c.w * 0.26, 0, Math.PI * 2);
      ctx.fill(); ctx.restore();
    }
  }

  function draw() {
    if (!ctx) return;
    const st = window.Game && window.Game.getState && window.Game.getState();
    const hujan = st && st.season === 'Hujan';
    ctx.clearRect(0, 0, W, H);
    drawSky(hujan);

    const n = C.gridSize;
    const plotMap = {};
    if (st) for (const u of st.builtUnits) {
      const pl = window.PLOTS[u.plot];
      if (pl) plotMap[pl.x + ',' + pl.y] = u;
    }

    // tanah
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const t = terrain[y][x];
        if (t === 'water') { drawWater(x, y); continue; }
        let color = TERRAIN_COLOR[t];
        if (t === 'field' && hujan) color = '#A7C46A';
        drawTile(x, y, color);
        if (t === 'grass') drawGrassTexture(x, y);
        if (t === 'field') drawFieldRows(x, y, hujan);
      }
    }

    // objek depth-sorted (dekorasi + bangunan + warga) berdasarkan (x+y)
    const objs = [];
    for (const d of decor) objs.push({ depth: d.x + d.y - 0.3, type: 'decor', d });
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const u = plotMap[x + ',' + y];
      if (u) objs.push({ depth: x + y, type: 'build', x, y, u });
    }
    for (const v of villagers) {
      const gx = v.horiz ? v.pos : v.fixed, gy = v.horiz ? v.fixed : v.pos;
      objs.push({ depth: gx + gy + 0.1, type: 'villager', v });
    }
    objs.sort((a, b) => a.depth - b.depth);
    for (const o of objs) {
      if (o.type === 'decor') {
        if (o.d.kind === 'tree') drawTree(o.d);
        else if (o.d.kind === 'bush') drawBush(o.d);
        else drawFlower(o.d);
      } else if (o.type === 'build') {
        const def = Object.assign({ key: o.u.type }, C.units[o.u.type]);
        drawBuilding(o.x, o.y, colorFor(o.u.type), def, o.u.level || 1, window.Game.getSpeed() > 0);
      } else {
        drawVillager(o.v);
      }
    }

    // hujan
    if (hujan) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
      const boost = (window.Game && window.Game.getSpeed() > 0) ? 3 : 1;
      for (const d of rain) {
        d.y += d.s * boost;
        if (d.y > 1) { d.y = 0; d.x = Math.random(); }
        const px = d.x * W, py = d.y * H;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 2, py + 9); ctx.stroke();
      }
    }
  }

  const UNIT_COLORS = {
    kantor: '#E56458', toko: '#D5803B', gudang: '#B79268', penggilingan: '#8A8681',
    coldstorage: '#5E9FE8', logistik: '#46A171', simpanpinjam: '#2783DE',
    marketplace: '#BF8EDA', umkm: '#DF84A8',
  };
  function colorFor(type) { return UNIT_COLORS[type] || '#8FA0AE'; }

  return { init, colorFor };
})();
