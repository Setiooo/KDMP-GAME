# 📲 Menjadikan KDMP Aplikasi HP

Game ini sudah berupa **PWA (Progressive Web App)**, jadi ada 2 cara memasangnya di HP — dari yang paling gampang sampai yang paling "beneran aplikasi".

---

## ✅ Cara 1 (TERGAMPANG): Install langsung dari browser HP

Tidak perlu tool apa pun. Setelah game tayang di GitHub Pages (`https://USERNAME.github.io/KDMP-GAME/`):

**Android (Chrome):**
1. Buka link game di Chrome HP
2. Ketuk menu ⋮ (kanan atas) → **Add to Home screen / Install app**
3. Ikon KDMP muncul di layar HP, buka layar penuh seperti aplikasi — bahkan bisa **jalan offline**.

**iPhone (Safari):**
1. Buka link di Safari
2. Ketuk tombol Share ↑ → **Add to Home Screen**

> Di layar judul game juga ada tombol **📲 Pasang App** yang muncul otomatis kalau browser mendukung.

---

## 🚀 Cara 2 (MUDAH): Bikin file APK pakai PWABuilder — tanpa coding

Menghasilkan file `.apk`/`.aab` yang bisa di-install & dibagikan, **tanpa install Android Studio**.

1. Pastikan game sudah live di GitHub Pages.
2. Buka **https://www.pwabuilder.com**
3. Tempel URL game kamu, klik **Start**.
4. Pilih **Android** → **Generate Package**.
5. Unduh paketnya — di dalamnya ada file **APK** untuk uji-pasang dan **AAB** untuk Google Play.
6. Kirim APK ke HP, aktifkan "Install from unknown sources", lalu pasang.

Ini cara paling praktis untuk dapat APK beneran. 👍

---

## 🧩 Cara 3 (LANJUTAN): Build APK sendiri pakai Capacitor

Untuk kontrol penuh & rilis ke Play Store. Butuh **Node.js**, **Android Studio**, dan **JDK 17**.

```bash
# di folder proyek
npm install
npm run android:add      # menyalin game ke www/ lalu menambah platform Android
npm run android:open     # membuka proyek di Android Studio
```

Di Android Studio:
- **Build → Build Bundle(s) / APK(s) → Build APK(s)** untuk menghasilkan file APK.
- Untuk rilis Play Store: **Generate Signed Bundle / APK** (buat keystore dulu).

Setiap kali game diubah, jalankan lagi:
```bash
npm run android:sync
```

> Catatan: folder `www/`, `node_modules/`, dan `android/` sudah diabaikan lewat `.gitignore` — tidak akan mengganggu GitHub Pages.

---

## 🎯 Mana yang harus kupilih?
| Kebutuhan | Pakai |
|---|---|
| Cepat main di HP sendiri | **Cara 1** (Add to Home Screen) |
| Punya file APK untuk dibagikan | **Cara 2** (PWABuilder) |
| Rilis resmi ke Google Play | **Cara 3** (Capacitor) |

Untuk kualitas grafis 3D seperti game besar (Kingshot dsb.), jalurnya berbeda — perlu engine seperti **Unity** dan aset 3D. Game ini fokus pada simulasi 2.5D yang ringan, edukatif, dan langsung jalan di mana saja.
