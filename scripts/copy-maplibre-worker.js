// Kopiert den Web-Worker von maplibre-gl nach public/, damit die Web-Version
// ihn ausliefern kann (Metro bündelt Worker-Dateien nicht mit).
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', 'maplibre-gl', 'dist');
const dest = path.join(__dirname, '..', 'public', 'maplibre');
fs.mkdirSync(dest, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
