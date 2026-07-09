# 🏪 KDMP — Koperasi Desa Merah Putih

**Game simulasi ekonomi desa berbasis koperasi.** Anda berperan sebagai **Ketua Koperasi Desa Merah Putih** — bangun koperasi kecil bermodal terbatas menjadi pusat ekonomi desa yang sehat, transparan, dan berkelanjutan.

> Profit bukan satu-satunya kemenangan. Jaga **kepercayaan warga**, **kepuasan anggota**, dan **keberlanjutan usaha** — atau hadapi mosi tidak percaya!

Dibangun dengan **HTML + CSS + JavaScript murni** (tanpa framework, tanpa build step). Cukup buka `index.html` di browser, atau host langsung di **GitHub Pages**.

![Genre](https://img.shields.io/badge/genre-simulasi_ekonomi-2783DE) ![Stack](https://img.shields.io/badge/stack-vanilla_JS-EAC26B) ![License](https://img.shields.io/badge/license-MIT-46A171)

---

## 🎮 Cara Bermain

1. **Beli hasil panen** dari petani mitra (tab *Pasar*) — harga gabah berubah tiap musim.
2. **Simpan** di gudang (perhatikan kapasitas & pembusukan barang perishable).
3. **Atur harga jual** — harga murah menaikkan kepercayaan tapi menekan margin; harga mahal sebaliknya.
4. **Warga membeli** tiap hari sesuai permintaan (dipengaruhi harga, kepercayaan, jumlah anggota).
5. **Bangun & upgrade unit usaha** (tab *Unit*): toko, gudang, penggilingan, cold storage, logistik, simpan pinjam, marketplace, UMKM center.
6. **Riset teknologi** (tab *Riset*): ERP, Digital Payment, IoT, AI Prediksi Permintaan, Smart Farming, Blockchain.
7. **Hadapi event dinamis**: banjir, panen raya, pesaing minimarket, audit, godaan korupsi, dll. Setiap pilihan punya konsekuensi.
8. **Rapat Anggota Tahunan (RAT)**: bagikan **SHU** ke anggota vs simpan sebagai cadangan.

### 🏆 Menang
Capai status **Holding Regional** (kekayaan bersih ≥ Rp 300 juta).

### 💀 Kalah
- **Bangkrut** — kas negatif terlalu lama, atau
- **Mosi tidak percaya** — kepercayaan warga runtuh.

---

## 🚀 Menjalankan Secara Lokal

Tidak perlu instalasi. Pilih salah satu:

```bash
# Opsi 1: buka langsung
open index.html          # macOS
start index.html         # Windows

# Opsi 2: server lokal (disarankan)
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

---

## 🌐 Deploy ke GitHub Pages

1. Buat repo baru di GitHub, lalu push isi folder ini:
   ```bash
   git init
   git add .
   git commit -m "KDMP: game simulasi koperasi desa"
   git branch -M main
   git remote add origin https://github.com/USERNAME/kdmp.git
   git push -u origin main
   ```
2. Di GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   Workflow `.github/workflows/deploy.yml` sudah disertakan dan akan otomatis mem-publish.
   *(Alternatif: Source → Deploy from a branch → `main` / `root`.)*
3. Game akan tayang di `https://USERNAME.github.io/kdmp/`.

---

## 📁 Struktur Proyek

```
kdmp/
├─ index.html          # Struktur halaman & layar judul
├─ css/
│  └─ style.css        # Desain visual (tema Merah Putih, responsif)
├─ js/
│  ├─ config.js        # Data: produk, unit usaha, riset, event, level
│  ├─ economy.js       # Mesin simulasi ekonomi (supply-demand, biaya, sosial)
│  ├─ render.js        # Rendering desa 2.5D isometrik (canvas)
│  ├─ game.js          # State, loop waktu, aksi, event, SHU, save/load
│  ├─ ui.js            # Jembatan state ↔ DOM (KPI, panel, modal, grafik)
│  └─ main.js          # Bootstrap
├─ .github/workflows/
│  └─ deploy.yml       # Auto-deploy GitHub Pages
├─ LICENSE
└─ README.md
```

---

## 🧩 Fitur

- 🏘️ **Desa 2.5D isometrik** dengan sawah, air, jalan, bangunan bertingkat, siang/malam & partikel hujan sesuai musim.
- 📊 **Simulasi ekonomi** dinamis: supply-demand, elastisitas harga, inflasi, susut stok, biaya operasional/logistik/bunga, depresiasi aset.
- 🤝 **Dinamika sosial**: kepercayaan, kepuasan, reputasi, pertumbuhan anggota — dipengaruhi keputusan Anda.
- 🏗️ **9 unit usaha** dengan level upgrade & efek unik.
- 🔬 **Pohon riset** teknologi dengan prasyarat.
- 🎲 **10 event dinamis** bercabang dengan konsekuensi.
- 🌦️ **Musim** (kemarau/hujan) yang memengaruhi harga, pasokan, dan permintaan.
- 💰 **Sistem koperasi**: SHU, RAT, simpan pinjam, pinjaman.
- 💾 **Save/Load** via localStorage + **Auto-Restock** opsional.
- 📈 **Grafik tren** & log aktivitas real-time.
- 📱 **Responsif** untuk desktop & mobile.

---

## ⚙️ Kustomisasi

Semua keseimbangan game ada di `js/config.js` (data-driven). Ubah harga, biaya, efek unit, atau tambah event baru tanpa menyentuh logika inti. Cocok untuk eksperimen balancing atau *modding*.

---

## 📄 Lisensi

MIT — bebas digunakan, dimodifikasi, dan disebarkan. Lihat [LICENSE](LICENSE).

---

*Dibuat sebagai prototipe playable dari Game Design Document KDMP. Ini adalah simulasi edukatif fiksional dan tidak mewakili entitas atau kebijakan resmi mana pun.*
