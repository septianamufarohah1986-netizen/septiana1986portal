// ====== Konfigurasi ======
const DURATION_MIN = 60;                 // lama simulasi (menit)
const STORAGE_PREFIX = 'ukai';

// ====== Util ======
const $ = (sel) => document.querySelector(sel);
const qq = (...sels) => sels.map(s => document.querySelector(s)).find(Boolean);
const getParam = (k) => new URLSearchParams(location.search).get(k);
const fmtTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

// ====== Save result (tanpa module import) ======
function saveResult({ score, mode, correct, total, bank }) {
  const payload = {
    score, max: 100, mode,
    correct, total, bank,
    ts: Date.now()
  };
  localStorage.setItem(`${STORAGE_PREFIX}:lastRaw`, JSON.stringify(payload));

  // simpan riwayat singkat
  const kHist = `${STORAGE_PREFIX}:history`;
  const hist = JSON.parse(localStorage.getItem(kHist) || '[]');
  hist.unshift(payload);
  localStorage.setItem(kHist, JSON.stringify(hist.slice(0, 50)));
}

// ====== State ======
let bankId = getParam('bank') || 'farmakologi';
let questions = [];
let idx = 0;
let answers = {};                // { qid: number }
let remainSec = DURATION_MIN * 60;
let submitted = false;

// key penyimpanan sesi per bank
const K_ANS  = `${STORAGE_PREFIX}:ans:${bankId}`;
const K_META = `${STORAGE_PREFIX}:meta:${bankId}`;

// elemen UI (dukung id versi kebab & camel)
const stemEl     = $('#q-stem');
const optsEl     = $('#q-options');
const progressEl = qq('#progress', '#q-progress');
const timerEl    = $('#timer');
const explainBox = qq('#explain', '#q-explain');
const explainBody= qq('#explain-body', '#q-explain');

const btnPrev    = qq('#btnPrev', '#btn-prev');
const btnNext    = qq('#btnNext', '#btn-next');
const btnExplain = qq('#btnExplain', '#btn-explain');
const btnSubmit  = qq('#btnSubmit', '#btn-submit');
const btnReset   = qq('#btnReset', '#btn-reset');
const bankNameEl = $('#bank-name');

// ====== Boot ======
document.addEventListener('DOMContentLoaded', async () => {
  if (bankNameEl) bankNameEl.textContent = bankId;

  await loadBank();

  restoreSession();
  render();
  startTimer();
});

// ====== Load bank ======
async function fetchManifest() {
  const url = `../data/banks/index.json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Manifest bank tidak ditemukan.');
  return res.json();
}

async function resolveBankUrl(base) {
  // jika user sudah menulis explicit .json, langsung pakai
  if (base.endsWith('.json')) return `../data/banks/${base}`;

  const manifest = await fetchManifest();

  // normalisasi key (pakai huruf kecil & underscore biar konsisten)
  const key = base.toLowerCase();
  const list = manifest[key];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`Bank "${base}" tidak terdaftar di manifest.`);
  }

  // pilih file pertama yang memang ada
  for (const filename of list) {
    const url = `../data/banks/${filename}`;
    try {
      const head = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (head.ok) return url;
    } catch (_) { /* lanjut kandidat berikutnya */ }
  }
  throw new Error(`Tidak ada file yang tersedia untuk "${base}" (cek nama di manifest & repository).`);
}

async function loadBank() {
  try {
    const base = (getParam('bank') || 'farmakologi').toLowerCase();
    const url = await resolveBankUrl(base);

    stemEl && (stemEl.textContent = 'Memuat soal…');
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Gagal memuat bank (${res.status})`);

    const data = await res.json();
    let raw = [];
    if (Array.isArray(data)) raw = data;
    else if (Array.isArray(data.items)) raw = data.items;
    else if (Array.isArray(data.questions)) raw = data.questions;
    else throw new Error('Format bank tidak dikenali (harus array atau {items:[...]}/{questions:[...]}).');

    questions = raw.map((q, i) => ({
      id: q.id || `q${i+1}`,
      stem: q.stem || q.question || q.text || '-',
      options: q.options || q.choices || [],
      answerIndex: (typeof q.answerIndex === 'number') ? q.answerIndex :
                   (typeof q.answer === 'number') ? q.answer : 0,
      rationale: q.rationale || q.explain || q.explanation || 'Belum ada pembahasan.'
    }));

    if (!questions.length) throw new Error('Bank kosong.');
  } catch (e) {
    console.error(e);
    questions = [];
    stemEl && (stemEl.textContent = '❌ ' + (e.message || 'Gagal memuat bank.'));
  }
}

// ====== Session ======
function restoreSession() {
  const meta = JSON.parse(localStorage.getItem(K_META) || 'null');
  const saved = JSON.parse(localStorage.getItem(K_ANS) || 'null');

  if (meta && saved && Array.isArray(questions) && questions.length) {
    answers   = saved;
    remainSec = typeof meta.remainSec === 'number' ? meta.remainSec : remainSec;
    submitted = !!meta.submitted;
  } else {
    answers = {};
    remainSec = DURATION_MIN * 60;
    submitted = false;
    persist();
  }
}

function persist() {
  localStorage.setItem(K_ANS, JSON.stringify(answers));
  localStorage.setItem(K_META, JSON.stringify({ remainSec, submitted }));
}

// ====== Render ======
function render() {
  if (!questions.length) {
    progressEl && (progressEl.textContent = '0/0');
    optsEl && (optsEl.innerHTML = '');
    return;
  }

  const q = questions[idx];
  progressEl && (progressEl.textContent = `${idx+1}/${questions.length}`);
  stemEl && (stemEl.textContent = q.stem);

  if (optsEl) {
    optsEl.innerHTML = (q.options || []).map((opt, i) => {
      const checked = (answers[q.id] === i) ? 'checked' : '';
      return `<label class="option" style="display:block;margin:.25rem 0">
                <input type="radio" name="opt" value="${i}" ${checked}/> ${opt}
              </label>`;
    }).join('');
    optsEl.addEventListener('change', onPick, { once: true });
  }

  // pembahasan disembunyikan dulu
  if (explainBox) {
    explainBox.classList.add('hidden');
    if (explainBody) explainBody.innerHTML = q.rationale || 'Belum ada pembahasan.';
  }

  // tombol navigasi
  if (btnPrev) btnPrev.disabled = (idx === 0);
  if (btnNext) btnNext.disabled = (idx === questions.length - 1);
}

function onPick(e) {
  const inp = e.target.closest('input[name="opt"]');
  if (!inp) return;
  const choice = Number(inp.value);
  if (!Number.isNaN(choice)) {
    const q = questions[idx];
    answers[q.id] = choice;
    persist();
  }
}

// ====== Timer ======
function startTimer() {
  if (!timerEl) return;
  timerEl.textContent = fmtTime(remainSec);
  const t = setInterval(() => {
    if (submitted) { clearInterval(t); timerEl.textContent = 'Selesai'; return; }
    remainSec = Math.max(0, remainSec - 1);
    timerEl.textContent = fmtTime(remainSec);
    persist();
    if (remainSec === 0) {
      clearInterval(t);
      submit(true);
    }
  }, 1000);
}

// ====== Events ======
btnPrev && btnPrev.addEventListener('click', () => {
  if (idx > 0) { idx--; render(); }
});
btnNext && btnNext.addEventListener('click', () => {
  if (idx < questions.length - 1) { idx++; render(); }
});
btnExplain && btnExplain.addEventListener('click', () => {
  if (!explainBox) return;
  explainBox.classList.toggle('hidden');
});
btnSubmit && btnSubmit.addEventListener('click', () => submit(false));
btnReset && btnReset.addEventListener('click', () => {
  const ok = confirm('Mulai ulang simulasi? Jawaban & timer akan direset.');
  if (!ok) return;
  localStorage.removeItem(K_ANS);
  localStorage.removeItem(K_META);
  answers = {};
  idx = 0;
  remainSec = DURATION_MIN * 60;
  submitted = false;
  persist();
  render();
});

// ====== Submit ======
function submit(auto) {
  if (submitted) return;
  submitted = true;

  const correct = questions.reduce((a, q) => a + (answers[q.id] === q.answerIndex ? 1 : 0), 0);
  const score = Math.round((correct / (questions.length || 1)) * 100);

  saveResult({
    score,
    mode: 'simulasi',
    correct,
    total: questions.length,
    bank: bankId
  });

  alert((auto ? 'Waktu habis.\n' : '') + `Skor: ${score}/100 (${correct}/${questions.length})`);
  // arahkan ke Analitik
  location.href = './ukai-analitik.html';
}
