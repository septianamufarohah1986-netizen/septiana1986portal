// tools/normalize-files.js
// Normalisasi nama file materi/ dan kuis/ + perbaiki href di HTML
// Format final: materi-[slug-mata-kuliah]-modul[n].html, kuis-[slug]-modul[n].html

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['materi', 'kuis']; // yang dicek & dinormalisasi
const HTML_GLOB_DIRS = ['.', 'pages'];   // tempat script update href di file .html
const DRY_RUN = !process.argv.includes('--apply');

const log = (...a) => console.log(...a);
const asSlug = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9]+/g, '-')   // non-alfanumerik -> hyphen
    .replace(/-+/g, '-')           // hyphen ganda -> satu
    .replace(/(^-|-$)/g, '');      // trim hyphen

// coba parse nama file jadi { kind, slug, modul }
function parseName(basename) {
  const name = basename.toLowerCase().replace(/\.(html?)$/i, '');
  // contoh pola yang kita dukung:
  // materi-analisis-farmasi-instrumental-modul1
  // kuis_biokimia_modul-03
  // materi biologi sel modul 2, dll
  const cleaned = name.replace(/[_\s]+/g, '-');

  // ambil kind (materi|kuis)
  const kindMatch = cleaned.match(/^(materi|kuis)[-]/);
  const kind = kindMatch ? kindMatch[1] : null;

  // ambil modul number (modul1 | modul-01 | modul 3)
  const modulMatch = cleaned.match(/modul[-\s]?(\d+)/);
  const modul = modulMatch ? parseInt(modulMatch[1], 10) : null;

  // slug = segalanya di antara kind- dan -modulN
  let slug = null;
  if (kind && modul != null) {
    slug = cleaned
      .replace(/^materi-/, '')
      .replace(/^kuis-/, '')
      .replace(/-?modul[-\s]?\d+$/, '');
  }

  return { ok: Boolean(kind && slug && modul), kind, slug, modul };
}

function normalizeFilename(kind, slug, modul) {
  return `${kind}-${asSlug(slug)}-modul${modul}.html`;
}

function listFiles(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith('.html'))
    .map((d) => path.join(dir, d.name));
}

function replaceHrefsInHtml(filePath, mapping) {
  let src = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // ganti href="materi/...html" dan href="kuis/...html" berdasar mapping lama->baru
  src = src.replace(/href="(materi|kuis)\/([^"]+?)"/gi, (m, folder, file) => {
    const key = path.posix.join(folder, file).toLowerCase();
    if (mapping[key]) {
      changed = true;
      return `href="${mapping[key].replace(/\\/g, '/')}"`;
    }
    return m;
  });

  if (changed && !DRY_RUN) fs.writeFileSync(filePath, src, 'utf8');
  return changed;
}

(function main() {
  log('🔎 Scan & normalisasi nama file…', DRY_RUN ? '(dry-run)' : '(APPLY)');
  const changes = [];
  const seenTargets = new Set();

  for (const d of TARGET_DIRS) {
    for (const file of listFiles(d)) {
      const base = path.basename(file);
      const info = parseName(base);

      if (!info.ok) {
        changes.push({ file, action: 'SKIP', reason: 'Nama tidak bisa diparse', from: base });
        continue;
      }

      const normalized = normalizeFilename(info.kind, info.slug, info.modul);
      if (base === normalized) {
        changes.push({ file, action: 'OK', to: base });
        continue;
      }

      const targetPath = path.join(path.dirname(file), normalized);
      const targetKey = targetPath.toLowerCase();
      if (seenTargets.has(targetKey)) {
        changes.push({ file, action: 'CONFLICT', to: normalized, reason: 'Target sudah dipakai di sesi ini' });
        continue;
      }
      seenTargets.add(targetKey);
      changes.push({ file, action: 'RENAME', to: targetPath, from: file });
    }
  }

  // Tampilkan ringkas
  const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n);
  log('\n📋 Rencana perubahan:');
  for (const c of changes) {
    if (c.action === 'RENAME') {
      log('  ✨', pad(c.action, 8), path.basename(c.file), '→', path.basename(c.to));
    } else if (c.action === 'OK') {
      log('  ✅', pad(c.action, 8), path.basename(c.file));
    } else if (c.action === 'SKIP') {
      log('  ⚠️ ', pad(c.action, 8), path.basename(c.file), '-', c.reason);
    } else if (c.action === 'CONFLICT') {
      log('  ❌', pad(c.action, 8), path.basename(c.file), '→', path.basename(c.to), '-', c.reason);
    }
  }

  // Eksekusi rename
  if (!DRY_RUN) {
    for (const c of changes) {
      if (c.action === 'RENAME') {
        const fromAbs = path.join(ROOT, c.file);
        const toAbs = path.join(ROOT, c.to);
        fs.renameSync(fromAbs, toAbs);
      }
    }
  }

  // Bangun mapping lama->baru untuk update href
  const mapping = {};
  for (const c of changes) {
    if (c.action === 'RENAME') {
      const oldKey = c.file.replace(/\\/g, '/').toLowerCase();
      const newKey = c.to.replace(/\\/g, '/');
      mapping[oldKey] = newKey;
    }
  }

  // Update href pada HTML (root + pages/)
  const htmlTargets = [];
  for (const dir of HTML_GLOB_DIRS) {
    htmlTargets.push(...listFiles(dir));
  }
  let replacedFiles = 0;
  for (const f of htmlTargets) {
    const changed = Object.keys(mapping).length
      ? replaceHrefsInHtml(path.join(ROOT, f), mapping)
      : false;
    if (changed) replacedFiles++;
  }

  log(
    `\n${DRY_RUN ? '🧪 Dry-run selesai' : '✅ Rename selesai'} —`,
    `${changes.filter((c) => c.action === 'RENAME').length} file diubah.`,
    replacedFiles ? `(${replacedFiles} file HTML href ter-update)` : ''
  );

  if (DRY_RUN) {
    log('\n👉 Jalankan lagi dengan: node tools/normalize-files.js --apply  (untuk eksekusi rename)');
  }
})();
