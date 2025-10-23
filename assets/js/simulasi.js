console.log('simulasi.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const stemEl = document.querySelector('#q-stem');
  const optsEl = document.querySelector('#q-options');
  const expEl  = document.querySelector('#q-explain');
  const gridEl = document.querySelector('#number-grid');

  const sess = { mode: 'topik', items: [] };
  let i = 0;
  const answers = {};

  const statusToScreen = (msg) => {
    if (stemEl) stemEl.textContent = msg;
    console.log('[STATUS]', msg);
  };

  async function loadBank(path = '../data/banks/farmakologi.json') {
    try {
      statusToScreen('LOADING...');
      const res = await fetch(path);
      console.log('[FETCH]', path, res.status, res.statusText);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const raw = await res.json();
      const arr = Array.isArray(raw) ? raw : (raw.items || raw.questions || []);
      if (!arr.length) throw new Error('Bank kosong / format tidak cocok');

      sess.items = arr.map((q, idx) => ({
        id: q.id || `q${idx+1}`,
        stem: q.stem || q.question || q.text || '-',
        options: q.options || q.choices || [],
        answerIndex: typeof q.answerIndex === 'number'
          ? q.answerIndex
          : typeof q.answer === 'number'
          ? q.answer
          : 0,
        rationale: q.rationale || q.explain || q.explanation || '—'
      }));

      i = 0;
      render();
    } catch (e) {
      console.error('Gagal load data bank:', e);
      statusToScreen('❌ Gagal memuat bank: ' + e.message);
      // tampilkan 1 kartu error agar tidak kosong
      sess.items = [{
        id: 'err',
        stem: 'Tidak bisa memuat: ../data/banks/farmakologi.json',
        options: ['Periksa path & nama file', 'Cek F12 → Network'],
        answerIndex: 0,
        rationale: e.message
      }];
      i = 0;
      render();
    }
  }

  function render() {
    const q = sess.items[i];
    if (!q) { statusToScreen('Tidak ada soal.'); optsEl.innerHTML = ''; return; }

    stemEl.textContent = q.stem;
    optsEl.innerHTML = q.options.map((opt, idx) => {
      const checked = answers[q.id] === idx ? 'checked' : '';
      return `<li><label><input type="radio" name="ans" value="${idx}" ${checked}/> ${opt}</label></li>`;
    }).join('');

    expEl.classList.add('hidden');
    expEl.textContent = '';

    if (gridEl) {
      gridEl.innerHTML = sess.items.map((item, idx) => {
        const picked = answers[item.id] != null ? 'style="opacity:.9;"' : '';
        const active = idx === i ? 'style="outline:2px solid #8ab4f8;padding:2px 6px;border-radius:6px;"' : '';
        return `<button data-go="${idx}" ${picked} ${active}>${idx+1}</button>`;
      }).join(' ');
      gridEl.querySelectorAll('button').forEach(b => b.onclick = () => { saveCurrent(); i = +b.dataset.go; render(); });
    }
  }

  function saveCurrent() {
    const val = +document.querySelector('input[name="ans"]:checked')?.value;
    if (!Number.isNaN(val)) answers[sess.items[i].id] = val;
  }

   const $ = (s) => document.querySelector(s);
   const btnNext    = $('#btn-next');
   const btnPrev    = $('#btn-prev');
   const btnExplain = $('#btn-explain');
   const btnSubmit  = $('#btn-submit');

   btnNext   && (btnNext.onclick   = () => { saveCurrent(); if (i < sess.items.length - 1) i++; render(); });
   btnPrev   && (btnPrev.onclick   = () => { saveCurrent(); if (i > 0) i--; render(); });
   btnExplain&& (btnExplain.onclick= () => { const q = sess.items[i]; expEl.textContent = q.rationale || '—'; expEl.classList.remove('hidden'); });
   btnSubmit && (btnSubmit.onclick = () => {
  saveCurrent();
  const correct = sess.items.reduce((a, q) => a + (answers[q.id] === q.answerIndex ? 1 : 0), 0);
  alert(`Skor: ${Math.round(100 * correct / sess.items.length)}% (${correct}/${sess.items.length})`);
});

 // BACA PARAMETER BANK DARI URL
function getQuery(name, def='') {
  const u = new URL(location.href);
  return u.searchParams.get(name) ?? def;
}
const bank = getQuery('bank', 'farmakologi'); // default farmakologi

// MULAI
loadBank(`../data/banks/${bank}.json`);
});

