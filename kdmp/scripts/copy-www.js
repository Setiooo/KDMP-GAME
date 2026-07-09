/* Menyalin file game statis ke folder www/ untuk dibungkus Capacitor (Android). */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
const include = ['index.html', 'css', 'js', 'assets', 'manifest.webmanifest', 'sw.js'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f));
  } else {
    fs.copyFileSync(src, dst);
  }
}
for (const item of include) {
  const src = path.join(root, item);
  if (fs.existsSync(src)) copy(src, path.join(out, item));
}
console.log('www/ siap dibungkus untuk Android.');
