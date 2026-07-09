/* =========================================================================
 * KDMP — Koperasi Desa Merah Putih
 * config.js — Data statis game: produk, unit usaha, riset, event, dsb.
 * ========================================================================= */
window.CONFIG = {
  // Rendering isometrik
  tileW: 72,
  tileH: 36,
  gridSize: 9,

  // Ekonomi awal
  startCash: 18_000_000,
  startMembers: 22,
  startTrust: 62,
  startSatisfaction: 60,
  seasonLength: 24,        // hari per musim
  bankruptcyFloor: -6_000_000,
  bankruptcyGraceDays: 4,
  trustGameOver: 12,

  // Produk yang diperdagangkan koperasi
  products: {
    beras:   { name: 'Beras',   emoji: '🌾', unit: 'kg',    base: 12500, farmGate: 9200,  perish: 0.004, color: '#EAC26B' },
    sayur:   { name: 'Sayur',   emoji: '🥬', unit: 'kg',    base: 8000,  farmGate: 4800,  perish: 0.055, color: '#72BC8F' },
    sembako: { name: 'Sembako', emoji: '🛒', unit: 'paket', base: 26000, farmGate: 18500, perish: 0.002, color: '#DE9255' },
  },

  // Permintaan harian per anggota (dikali populasi)
  perCapitaDemand: { beras: 0.9, sayur: 1.1, sembako: 0.35 },

  // Unit usaha yang bisa dibangun (menempati plot di peta)
  units: {
    kantor: {
      name: 'Kantor Koperasi', emoji: '🏛️', desc: 'Pusat administrasi koperasi. Titik awal permainan.',
      cost: 0, op: 40000, buildable: false, maxLevel: 3,
      effect: { adminEff: 0.04 },
    },
    toko: {
      name: 'Toko Sembako', emoji: '🏪', desc: 'Retail utama. Menaikkan kapasitas penjualan & jangkauan warga.',
      cost: 4_500_000, op: 90000, buildable: true, maxLevel: 4,
      effect: { salesCap: 260, demand: 0.10 },
    },
    gudang: {
      name: 'Gudang Pangan', emoji: '🏬', desc: 'Menambah kapasitas penyimpanan stok.',
      cost: 3_200_000, op: 55000, buildable: true, maxLevel: 4,
      effect: { storage: 1400 },
    },
    penggilingan: {
      name: 'Penggilingan Padi', emoji: '⚙️', desc: 'Mengolah gabah jadi beras. Menaikkan margin beras.',
      cost: 5_800_000, op: 120000, buildable: true, maxLevel: 3,
      effect: { berasMargin: 0.12 },
    },
    coldstorage: {
      name: 'Cold Storage', emoji: '❄️', desc: 'Memperlambat pembusukan barang perishable.',
      cost: 6_500_000, op: 140000, buildable: true, maxLevel: 3,
      effect: { perishCut: 0.5 },
    },
    logistik: {
      name: 'Armada Logistik', emoji: '🚚', desc: 'Menekan biaya logistik & memperluas distribusi.',
      cost: 4_800_000, op: 85000, buildable: true, maxLevel: 3,
      effect: { logisticsCut: 0.25, demand: 0.06 },
    },
    simpanpinjam: {
      name: 'Unit Simpan Pinjam', emoji: '🏦', desc: 'Pendapatan bunga + menaikkan loyalitas anggota.',
      cost: 5_200_000, op: 70000, buildable: true, maxLevel: 4,
      effect: { interestIncome: 65000, loyalty: 0.05 },
    },
    marketplace: {
      name: 'Marketplace Desa', emoji: '📱', desc: 'Kanal online. Menaikkan permintaan secara signifikan.',
      cost: 7_500_000, op: 100000, buildable: true, maxLevel: 3,
      effect: { demand: 0.22 },
    },
    umkm: {
      name: 'UMKM Center', emoji: '🧺', desc: 'Mengolah hasil panen jadi produk kemasan bernilai tambah.',
      cost: 6_800_000, op: 110000, buildable: true, maxLevel: 3,
      effect: { valueAdd: 0.10, reputation: 0.03 },
    },
  },

  // Pohon riset teknologi
  research: {
    erp:      { name: 'ERP Koperasi',        emoji: '💻', cost: 3_000_000, days: 20, req: [],      effect: { adminEff: 0.10 }, desc: 'Efisiensi administrasi & biaya operasional turun.' },
    digipay:  { name: 'Digital Payment',      emoji: '💳', cost: 2_400_000, days: 15, req: [],      effect: { demand: 0.08 },   desc: 'Transaksi lebih mudah, permintaan naik.' },
    iot:      { name: 'IoT Gudang',           emoji: '📡', cost: 4_200_000, days: 25, req: ['erp'], effect: { perishCut: 0.3 }, desc: 'Monitoring gudang, susut berkurang.' },
    aidemand: { name: 'AI Prediksi Permintaan',emoji: '🤖', cost: 5_500_000, days: 30, req: ['erp'], effect: { forecast: 1 },   desc: 'Rekomendasi stok & harga otomatis.' },
    smartfarm:{ name: 'Smart Farming',        emoji: '🌱', cost: 4_800_000, days: 28, req: [],      effect: { supply: 0.20 },   desc: 'Hasil panen mitra petani meningkat.' },
    blockchain:{name: 'Blockchain Transparansi',emoji:'🔗', cost: 6_500_000, days: 35, req: ['aidemand'], effect: { trust: 8, reputation: 0.05 }, desc: 'Transparansi penuh, kepercayaan melonjak.' },
  },

  // Event dinamis (dipilih acak dengan bobot)
  events: [
    {
      id: 'pupuk_naik', title: 'Harga Pupuk Naik', emoji: '📈', weight: 10,
      text: 'Harga pupuk nasional melonjak. Petani mitra menuntut harga beli gabah lebih tinggi.',
      choices: [
        { label: 'Serap kenaikan (beban koperasi)', apply: { cash: -1_800_000, trust: +5 } },
        { label: 'Teruskan ke harga jual', apply: { priceShock: 0.08, trust: -6 } },
        { label: 'Cari pemasok baru (berisiko)', apply: { supplyShock: -0.15, cash: -400000 } },
      ],
    },
    {
      id: 'audit', title: 'Audit Koperasi', emoji: '🔍', weight: 8,
      text: 'Pengawas melakukan audit tahunan atas pembukuan koperasi.',
      choices: [
        { label: 'Transparan sepenuhnya', apply: { trust: +8, reputation: +0.05 } },
        { label: 'Percepat dengan "pelicin"', apply: { cash: -1_200_000, trust: -10, corruption: 1 } },
      ],
    },
    {
      id: 'korupsi', title: 'Godaan Dana Bantuan', emoji: '💰', weight: 6,
      text: 'Ada celah untuk menyelewengkan dana bantuan pemerintah. Menggiurkan, tapi berisiko.',
      choices: [
        { label: 'Tolak, jaga integritas', apply: { trust: +6, satisfaction: +3 } },
        { label: 'Ambil diam-diam', apply: { cash: +4_000_000, trust: -18, corruption: 1 } },
      ],
    },
    {
      id: 'minimarket', title: 'Pesaing Minimarket', emoji: '🏬', weight: 9,
      text: 'Waralaba minimarket membuka gerai di desa dan menawarkan harga miring.',
      choices: [
        { label: 'Perang harga', apply: { priceShock: -0.10, cash: -800000 } },
        { label: 'Diferensiasi (kualitas & layanan)', apply: { reputation: +0.06, cash: -1_500_000 } },
        { label: 'Lobi aparat desa', apply: { cash: -2_000_000, demandShock: -0.05 } },
      ],
    },
    {
      id: 'banjir', title: 'Banjir Melanda', emoji: '🌊', weight: 7, season: 'Hujan',
      text: 'Hujan deras menyebabkan banjir. Jalan rusak dan sebagian stok gudang terancam.',
      choices: [
        { label: 'Klaim asuransi + perbaikan', apply: { cash: -1_500_000, stockLoss: 0.10 } },
        { label: 'Gotong royong dengan warga', apply: { stockLoss: 0.22, trust: +7 } },
      ],
    },
    {
      id: 'panenraya', title: 'Panen Raya!', emoji: '🌾', weight: 9, season: 'Kemarau',
      text: 'Cuaca mendukung, panen melimpah. Harga gabah turun, peluang menimbun stok murah.',
      choices: [
        { label: 'Borong stok murah', apply: { supplyShock: +0.35, farmGateCut: 0.18 } },
        { label: 'Beli secukupnya', apply: { supplyShock: +0.15 } },
      ],
    },
    {
      id: 'subsidi', title: 'Bantuan Pemerintah', emoji: '🎁', weight: 7,
      text: 'Program KDMP menyalurkan dana stimulan untuk koperasi yang aktif.',
      choices: [
        { label: 'Terima untuk modal usaha', apply: { cash: +3_500_000, trust: +3 } },
        { label: 'Terima & bagi ke anggota', apply: { cash: +1_500_000, satisfaction: +8, trust: +6 } },
      ],
    },
    {
      id: 'kebakaran', title: 'Kebakaran Gudang', emoji: '🔥', weight: 5,
      text: 'Korsleting listrik memicu kebakaran kecil di area gudang.',
      choices: [
        { label: 'Padamkan & tanggung kerugian', apply: { cash: -1_000_000, stockLoss: 0.15 } },
        { label: 'Andalkan asuransi (premi naik)', apply: { cash: -600000, stockLoss: 0.08, opHike: 20000 } },
      ],
    },
    {
      id: 'demo', title: 'Keluhan Anggota', emoji: '📢', weight: 6,
      text: 'Sekelompok anggota memprotes harga yang dianggap terlalu tinggi.',
      choices: [
        { label: 'Turunkan harga & minta maaf', apply: { priceShock: -0.07, satisfaction: +6 } },
        { label: 'Jelaskan lewat musyawarah', apply: { satisfaction: +2, trust: +2 } },
      ],
    },
    {
      id: 'inflasi', title: 'Inflasi Nasional', emoji: '💸', weight: 6,
      text: 'Inflasi naik. Biaya operasional dan harga bahan pokok ikut terkerek.',
      choices: [
        { label: 'Efisiensi operasional', apply: { opHike: 15000, satisfaction: -2 } },
        { label: 'Sesuaikan harga jual', apply: { priceShock: 0.05, trust: -3 } },
      ],
    },
  ],

  // Level koperasi berdasarkan kekayaan bersih (net worth)
  coopLevels: [
    { name: 'Koperasi Rintisan',   min: 0 },
    { name: 'Koperasi Berkembang', min: 30_000_000 },
    { name: 'Koperasi Sehat',      min: 75_000_000 },
    { name: 'Koperasi Maju',       min: 150_000_000 },
    { name: 'Holding Regional',    min: 300_000_000 },
  ],
};
