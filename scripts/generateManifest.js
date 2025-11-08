// scripts/generateManifest.js
const fs = require('fs');
const path = require('path');

const root = __dirname ? path.resolve(__dirname, '..') : process.cwd();
const materiDir = path.join(root, 'materi');
const kuisDir   = path.join(root, 'kuis');
const outDir    = path.join(root, 'data', 'akademik');
const outFile   = path.join(outDir, 'manifest.json');

// pola nama: materi-{slug}-modul{n}.html  |  kuis-{slug}-modul{n}.html
const reMateri = /^materi-(.+)-modul(\d+)\.html$/i;
const reKuis   = /^kuis-(.+)-modul(\d+)\.html$/i;

function scan(dir, regex) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => regex.test(f))
    .map(f => {
      const m = f.match(regex);
      const slug = m[1];
      const no = Number(m[2]);
      return { file: f, slug, no };
    });
}

function toTitle(slug) {
  // "analisis-farmasi-instrumental" -> "Analisis Farmasi Instrumental"
  return slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}

function build() {
  const materi = scan(materiDir, reMateri);
  const kuis   = scan(kuisDir,   reKuis);

  // gabungkan per-mata kuliah
  const map = new Map();

  function ensureCourse(slug) {
    if (!map.has(slug)) {
      map.set(slug, {
        id: slug,
        nama: toTitle(slug),
        modul: [] // { no, judul?, materi?, kuis? }
      });
    }
    return map.get(slug);
  }

  // masukkan materi
  for (const m of materi) {
    const course = ensureCourse(m.slug);
    let mod = course.modul.find(x => x.no === m.no);
    if (!mod) {
      mod = { no: m.no, judul: `Modul ${m.no}` };
      course.modul.push(mod);
    }
    mod.materi = `../materi/${m.file}`;
  }

  // masukkan kuis
  for (const k of kuis) {
    const course = ensureCourse(k.slug);
    let mod = course.modul.find(x => x.no === k.no);
    if (!mod) {
      mod = { no: k.no, judul: `Modul ${k.no}` };
      course.modul.push(mod);
    }
    mod.kuis = `../kuis/${k.file}`;
  }

  // urutkan modul by no
  const mata_kuliah = Array.from(map.values())
    .map(c => ({ ...c, modul: c.modul.sort((a,b)=>a.no-b.no) }))
    .sort((a,b) => a.nama.localeCompare(b.nama));

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ mata_kuliah }, null, 2), 'utf8');
  console.log(`✅ Manifest ditulis: ${path.relative(root, outFile)}`);
}

build();
