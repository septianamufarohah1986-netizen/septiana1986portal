/* ================== Konfigurasi ================== */
const DURATION_MIN = 60;
const STORAGE_PREFIX = 'ukai';

/* ================== Util ================== */
const $  = (sel) => document.querySelector(sel);
const qq = (...sels) => sels.map(s => document.querySelector(s)).find(Boolean);
const getParam = (k) => new URLSearchParams(location.search).get(k);
const fmtTime  = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

function saveResult({ score, mode, correct, total, bank }) {
  const payload = { score, max: 100, mode, correct, total, bank, ts: Date.now() };
  localStorage.setItem(`${STORAGE_PREFIX}:lastRaw`, JSON.stringify(payload));
  const kHist = `${STORAGE_PREFIX}:history`;
  const hist = JSON.parse(localStorage.getItem(kHist) || '[]');
  hist.unshift(payload);
  localStorage.setItem(kHist, JSON.stringify(hist.slice(0, 50)));
}

/* ================== State ================== */
let bankId = (getParam('bank') || 'farmakologi').toLowerCase();
let questions = [];
let idx = 0;
let answers = {};                             // { qid: number }
let flagged = new Set();                      // Set<qid>
let remainSec = DURATION_MIN * 60;
let submitted = false;

/* keys sesi per bank */
const K_ANS   = `${STORAGE_PREFIX}:ans:${bankId}`;
const K_META  = `${STORAGE_PREFIX}:meta:${bankId}`;
const K_FLAG  = `${STORAGE_PREFIX}:flag:${bankId}`;

/* Elemen UI */
const stemEl      = $('#q-stem');
const optsEl      = $('#q-options');
const progressEl  = qq('#progress','#q-progress');
const timerEl     = $('#timer');
const timeFill    = $('#timebar-fill');
const explainWrap = qq('#explain','#q-explain');
const explainBody = qq('#explain-body','#q-explain');
const gridEl      = $('#number-grid');

const btnPrev     = qq('#btnPrev','#btn-prev');
const btnNext     = qq('#btnNext','#btn-next');
const btnExplain  = qq('#btnExplain','#btn-explain');
const btnFlag     = qq('#btnFlag','#btn-flag');
const btnSubmit   = qq('#btnSubmit','#btn-submit');
const btnReset    = qq('#btnReset','#btn-reset');
const bankNameEl  = $('#bank-name');

/* ================== Boot ================== */
document.addEventListener('DOMContentLoaded', async () => {
  if (bankNameEl) bankNameEl.textContent = bankId;
  await loadBank();          // baca dari manifest + fetch soal
  restoreSession();          // lanjutkan jawaban/timer/flag
  render();                  // tampilkan soal pertama
  startTimer();              // timer jalan
  bindEvents();              // tombol + grid
  guardExit();               // cegah close tanpa submit
});

/* ================== Manifest loader ================== */
async function fetchManifest() {
  const url = `../data/banks/index.json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Manifest bank tidak ditemukan.');
  return res.json();
}
async function resolveBankUrl(base) {
  if (base.endsWith('.json')) return `../data/banks/${base}`;
  const manifest = await fetchManifest();
  const key = base.toLowerCase();
  const list = manifest[key];
  if (!Array.isArray(list) || !list.length) throw new Error(`Bank "${base}" tidak ada di manifest.`);
  for (const filename of list) {
    const url = `../data/banks/${filename}`;
    try {
      const r = await fetch(url, { method:'GET', cache:'no-store' });
      if (r.ok) return url;
    } catch (_) {}
  }
  throw new Error(`Tidak ada file tersedia untuk "${base}".`);
}

/* ================== Load bank ================== */
async function loadBank() {
  try {
    const url = await resolveBankUrl(bankId);
    stemEl && (stemEl.textContent = 'Memuat soal…');
    const res = await fetch(url, { cache:'no-store' });
    if (!res.ok) throw new Error(`Gagal memuat bank (${res.status})`);
    const data = await res.json();

    let raw = [];
    if (Array.isArray(data)) raw = data;
    else if (Array.isArray(data.items)) raw = data.items;
    else if (Array.isArray(data.questions)) raw = data.questions;
    else throw new Error('Format bank salah (array atau {items:[]} / {questions:[]}).');

    questions = raw.map((q,i)=>({
      id: q.id || `q${i+1}`,
      stem: q.stem || q.question || q.text || '-',
      options: q.options || q.choices || [],
      answerIndex: (typeof q.answerIndex==='number') ? q.answerIndex :
                   (typeof q.answer==='number') ? q.answer : 0,
      rationale: q.rationale || q.explain || q.explanation || 'Belum ada pembahasan.'
    }));
    if (!questions.length) throw new Error('Bank kosong.');
  } catch (e) {
    console.error(e);
    questions = [];
    stemEl && (stemEl.textContent = '❌ ' + (e.message || 'Gagal memuat bank.'));
  }
}

/* ================== Session ================== */
function restoreSession() {
  const meta  = JSON.parse(localStorage.getItem(K_META) || 'null');
  const saved = JSON.parse(localStorage.getItem(K_ANS)  || 'null');
  const flg   = JSON.parse(localStorage.getItem(K_FLAG) || '[]');
  flagged = new Set(Array.isArray(flg) ? flg : []);
  if (!meta || meta.submitted) {
    answers   = {};
    remainSec = DURATION_MIN * 60;
    submitted = false;
    idx = 0;
    persist();
    return;
  }
  answers   = saved || {};
  remainSec = (typeof meta.remainSec==='number') ? meta.remainSec : DURATION_MIN*60;
  submitted = !!meta.submitted;
  idx       = Math.min(meta.idx || 0, Math.max(questions.length-1,0));
}
function persist() {
  localStorage.setItem(K_ANS, JSON.stringify(answers));
  localStorage.setItem(K_META, JSON.stringify({ remainSec, submitted, idx }));
  localStorage.setItem(K_FLAG, JSON.stringify([...flagged]));
}

/* ================== Render ================== */
function render() {
  if (!questions.length) {
    progressEl && (progressEl.textContent = '0/0');
    optsEl && (optsEl.innerHTML = '');
    gridEl && (gridEl.innerHTML = '');
    return;
  }
  const q = questions[idx];
  progressEl && (progressEl.textContent = `${idx+1}/${questions.length}`);
  stemEl     && (stemEl.textContent = q.stem);

  // opsi
  if (optsEl) {
    optsEl.innerHTML = (q.options || []).map((opt,i) => {
      const checked = (answers[q.id] === i) ? 'checked' : '';
      return `<label class="option" style="display:block;margin:.25rem 0;line-height:1.5">
                <input type="radio" name="opt" value="${i}" ${checked} style="margin-right:.5rem"/> ${opt}
              </label>`;
    }).join('');
    optsEl.addEventListener('change', onPick, { once:true });
  }

  // pembahasan
  if (explainWrap) {
    explainWrap.classList.add('hidden');
    if (explainBody) explainBody.innerHTML = q.rationale || 'Belum ada pembahasan.';
  }

  // tombol state
  btnPrev && (btnPrev.disabled = (idx===0));
  btnNext && (btnNext.disabled = (idx===questions.length-1));
  if (btnFlag) btnFlag.textContent = flagged.has(q.id) ? '🚩 Hapus Tanda' : '🚩 Tandai';

  // grid nomor
  if (gridEl) {
    gridEl.innerHTML = questions.map((it, i) => {
      const classes = [
        (i===idx) ? 'current' : '',
        (answers[it.id] != null) ? 'answered' : '',
        (flagged.has(it.id)) ? 'flagged' : ''
      ].filter(Boolean).join(' ');
      return `<button class="${classes}" data-go="${i}" aria-label="Soal ${i+1}">${i+1}</button>`;
    }).join('');
  }
}

/* ================== Events ================== */
function onPick(e) {
  const inp = e.target.closest('input[name="opt"]');
  if (!inp) return;
  const choice = Number(inp.value);
  if (!Number.isNaN(choice)) {
    const q = questions[idx];
    answers[q.id] = choice;
    persist();
    // refresh grid warna
    if (gridEl) {
      const btn = gridEl.querySelector(`button[data-go="${idx}"]`);
      btn && btn.classList.add('answered');
    }
  }
}
function bindEvents() {
  btnPrev    && btnPrev.addEventListener('click', () => { if (idx>0){ idx--; persist(); render(); } });
  btnNext    && btnNext.addEventListener('click', () => { if (idx<questions.length-1){ idx++; persist(); render(); } });
  btnExplain && btnExplain.addEventListener('click', () => { if (explainWrap) explainWrap.classList.toggle('hidden'); });
  btnFlag    && btnFlag.addEventListener('click', () => {
    const q = questions[idx];
    if (flagged.has(q.id)) flagged.delete(q.id); else flagged.add(q.id);
    persist(); render();
  });
  btnSubmit  && btnSubmit.addEventListener('click', () => submit(false));
  btnReset   && btnReset.addEventListener('click', () => {
    if (!confirm('Mulai ulang simulasi? Jawaban, flag, dan timer akan direset.')) return;
    localStorage.removeItem(K_ANS);
    localStorage.removeItem(K_META);
    localStorage.removeItem(K_FLAG);
    answers = {}; flagged = new Set(); idx=0; remainSec = DURATION_MIN*60; submitted=false;
    persist(); render(); if (timerEl) timerEl.textContent = fmtTime(remainSec);
    if (timeFill) timeFill.style.width = '0%';
  });

  // lompat via grid
  gridEl && gridEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-go]');
    if (!b) return;
    idx = Number(b.dataset.go) || 0;
    persist(); render();
  });

  // navigasi keyboard (opsional)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') btnNext?.click();
    if (e.key === 'ArrowLeft')  btnPrev?.click();
  });
}

/* ================== Timer ================== */
function startTimer() {
  if (timerEl) timerEl.textContent = fmtTime(remainSec);
  updateBar(); // awal
  let last = Date.now();
  const t = setInterval(() => {
    if (submitted){ clearInterval(t); timerEl && (timerEl.textContent='Selesai'); updateBar(); return; }
    const now = Date.now();
    const delta = Math.floor((now-last)/1000);
    last = now;
    if (delta>0){
      remainSec = Math.max(0, remainSec - delta);
      timerEl && (timerEl.textContent = fmtTime(remainSec));
      persist(); updateBar();
    }
    if (remainSec<=0){ clearInterval(t); submit(true); }
  }, 1000);
}
function updateBar(){
  if (!timeFill) return;
  const total = DURATION_MIN * 60;
  const used = Math.min(total, Math.max(0, total - remainSec));
  const pct = Math.round((used / total) * 100);
  timeFill.style.width = `${pct}%`;
}

/* ================== Guard & Submit ================== */
function guardExit() {
  window.addEventListener('beforeunload', (e) => {
    const meta = JSON.parse(localStorage.getItem(K_META) || 'null');
    const hasUnsubmitted = meta && !meta.submitted && questions.length>0;
    if (hasUnsubmitted) { e.preventDefault(); e.returnValue=''; }
  });
}
function submit(auto) {
  if (submitted) return;
  submitted = true;
  const correct = questions.reduce((a,q)=> a + (answers[q.id]===q.answerIndex?1:0), 0);
  const score = Math.round((correct / (questions.length || 1)) * 100);
  saveResult({ score, mode:'simulasi', correct, total: questions.length, bank: bankId });
  persist();
  alert((auto ? 'Waktu habis.\n' : '') + `Skor: ${score}/100 (${correct}/${questions.length})`);
  location.href = './ukai-analitik.html';
}
