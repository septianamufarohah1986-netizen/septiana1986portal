/* Simple CBT engine for UKAI
   - Ambil bank soal dari ?bank=<nama>, mis: ukai-simulasi.html?bank=farmakologi
   - 1 soal = 1 menit (bisa override ?mins=120)
   - Fitur: next/prev, klik nomor, tandai, hapus jawaban, review, autosubmit saat waktu habis
   - Hasil + pembahasan disimpan ke localStorage -> ukai_results, lalu redirect ke ukai-analitik.html
*/

(() => {
  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  // DOM
  const elBankName   = qs('#bank-name');
  const elProgress   = qs('#progress');
  const elFlagCount  = qs('#flag-count');
  const elTimer      = qs('#timer');
  const elTimeFill   = qs('#timebar-fill');
  const elStem       = qs('#q-stem');
  const elOptions    = qs('#q-options');
  const elCard       = qs('#q-card');
  const elNumGrid    = qs('#number-grid');
  const elReview     = qs('#review-screen');
  const elReviewList = qs('#review-list');
  const elBtnBack    = qs('#btn-back-exam');
  const dlgBrief     = qs('#dlg-brief');
  const fsWarn       = qs('#fs-warn');

  const btnPrev      = qs('#btn-prev');
  const btnNext      = qs('#btn-next');
  const btnFlag      = qs('#btn-flag');
  const btnClear     = qs('#btn-clear');
  const btnReview    = qs('#btn-review');
  const btnSubmit    = qs('#btn-submit');
  const btnStart     = qs('#btn-start');
  const btnFinal     = qs('#btn-final-submit');

  // STATE
  let bankId    = new URLSearchParams(location.search).get('bank') || 'farmakologi';
  let minutesQS = parseInt(new URLSearchParams(location.search).get('mins') || '', 10);
  let data = { meta: {}, soal: [] };
  let idx = 0;
  let answers = [];          // index opsi yang dipilih, null jika belum
  let flagged = new Set();   // nomor yang ditandai
  let started = false;
  let totalSeconds = 0;
  let remaining = 0;
  let timerHandle = null;

  // Utils
  const fmtTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return (h>0 ? String(h).padStart(2,'0')+':' : '') +
           String(m).padStart(2,'0')+':' +
           String(sec).padStart(2,'0');
  };

  

  function buildNumberGrid() {
    elNumGrid.innerHTML = '';
    data.soal.forEach((_, i) => {
      const b = document.createElement('button');
      b.textContent = (i+1);
      b.addEventListener('click', () => {
        idx = i;
        renderQuestion();
      });
      elNumGrid.appendChild(b);
    });
  }
  
   async function loadBank() {
  try {
    // ambil daftar bank dari manifest
    const resManifest = await fetch(`../data/banks/manifest.json`);
    const manifest = await resManifest.json();
    const list = manifest.banks || [];
    
    // pastikan file yang dipilih memang ada di manifest
    if (!list.includes(bankId)) {
      throw new Error(`Bank "${bankId}" tidak ada di manifest.json`);
    }

    // load file bank soal
    const res = await fetch(`../data/banks/${bankId}.json`);
    if (!res.ok) throw new Error(res.statusText);
    data = await res.json();

    // sisanya sama seperti sebelumnya
    if (!Array.isArray(data.soal)) data.soal = [];
    elBankName.textContent = data?.meta?.nama || bankId;
    answers = new Array(data.soal.length).fill(null);

    const defaultMins = data.soal.length || 200;
    const minutes = Number.isFinite(minutesQS) ? minutesQS : defaultMins;
    totalSeconds = minutes * 60;
    remaining = totalSeconds;

    buildNumberGrid();
    renderQuestion();
    updateTopbar();
    dlgBrief.showModal();
  } catch (e) {
    elStem.textContent = '⚠️ Gagal memuat bank soal. Pastikan file JSON ada dan nama cocok dengan manifest.';
    console.error(e);
  }
}

  function updateNumberGridClasses() {
    const btns = qsa('#number-grid button');
    btns.forEach((b, i) => {
      b.classList.toggle('current', i === idx);
      b.classList.toggle('answered', answers[i] !== null);
      b.classList.toggle('flagged', flagged.has(i));
    });
  }

  function renderQuestion() {
    const q = data.soal[idx];
    if (!q) return;
    elStem.innerHTML = q.stem || '(tanpa stem)';
    elOptions.innerHTML = '';

    (q.opsi || []).forEach((opt, i) => {
      const id = `opt-${idx}-${i}`;
      const wrap = document.createElement('div');
      wrap.className = 'choice';
      wrap.innerHTML = `
        <label style="display:flex;gap:.5rem;align-items:flex-start;cursor:pointer">
          <input type="radio" name="q${idx}" id="${id}" value="${i}" ${answers[idx]===i ? 'checked':''}/>
          <span>${opt}</span>
        </label>`;
      wrap.querySelector('input').addEventListener('change', () => {
        answers[idx] = i;
        updateTopbar();
        updateNumberGridClasses();
      });
      elOptions.appendChild(wrap);
    });

    updateTopbar();
    updateNumberGridClasses();
  }

  function updateTopbar() {
    const total = data.soal.length;
    const answeredCount = answers.filter(a => a !== null).length;
    elProgress.textContent = `${answeredCount}/${total}`;
    elFlagCount.textContent = `${flagged.size}`;

    // timer UI
    elTimer.textContent = fmtTime(remaining);
    const pct = totalSeconds ? Math.max(0, (1 - remaining/totalSeconds) * 100) : 0;
    elTimeFill.style.width = `${pct}%`;
  }

  function next() {
    if (idx < data.soal.length - 1) { idx++; renderQuestion(); }
  }
  function prev() {
    if (idx > 0) { idx--; renderQuestion(); }
  }
  function toggleFlag() {
    flagged.has(idx) ? flagged.delete(idx) : flagged.add(idx);
    updateTopbar();
    updateNumberGridClasses();
  }
  function clearAnswer() {
    answers[idx] = null;
    renderQuestion();
  }

  function showReview() {
    elCard.classList.add('hidden');
    elReview.classList.remove('hidden');
    elReviewList.innerHTML = '';
    answers.forEach((ans, i) => {
      if (ans === null) {
        const b = document.createElement('button');
        b.className = 'btn';
        b.textContent = i+1;
        b.addEventListener('click', () => {
          elReview.classList.add('hidden');
          elCard.classList.remove('hidden');
          idx = i;
          renderQuestion();
        });
        elReviewList.appendChild(b);
      }
    });
    if (!elReviewList.children.length) {
      const ok = document.createElement('div');
      ok.textContent = 'Semua soal sudah dijawab. Silakan submit bila yakin.';
      ok.style.opacity = .8;
      elReviewList.appendChild(ok);
    }
  }

  function backToExam() {
    elReview.classList.add('hidden');
    elCard.classList.remove('hidden');
  }

  function submitNow(auto = false) {
    // Hitung skor + siapkan payload review untuk analitik
    const result = {
      bank: data?.meta?.nama || bankId,
      bankId,
      total: data.soal.length,
      timestamp: new Date().toISOString(),
      durationSec: totalSeconds - remaining,
      autoSubmit: auto,
      benar: 0,
      salah: 0,
      kosong: 0,
      detail: []  // per-soal: {id, jawab, kunci, benar?, pembahasan, domain}
    };

    data.soal.forEach((q, i) => {
      const j = answers[i];               // index jawaban user
      const k = Number(q.kunci);          // index kunci benar
      let stat = 'kosong';
      if (j === null) {
        result.kosong++;
      } else if (j === k) {
        result.benar++; stat = 'benar';
      } else {
        result.salah++; stat = 'salah';
      }
      result.detail.push({
        no: i+1,
        id: q.id || null,
        jawab: j,
        kunci: k,
        status: stat,
        pembahasan: q.pembahasan || '',
        domain: q.domain || null
      });
    });

    // Simpan ke localStorage
    try {
      const key = 'ukai_results';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.push(result);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {
      console.warn('Gagal menyimpan hasil ke localStorage', e);
    }

    // Akhiri timer
    if (timerHandle) clearInterval(timerHandle);

    // Pindah ke analitik untuk lihat skor + review
    location.href = `./ukai-analitik.html?bank=${encodeURIComponent(bankId)}`;
  }

  function startTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      updateTopbar();
      if (remaining <= 0) {
        clearInterval(timerHandle);
        submitNow(true);
      }
    }, 1000);
  }

  // Fullscreen helpers
  function goFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  }
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function onFsChange() {
    if (started && !isFullscreen()) {
      fsWarn.classList.remove('hidden');
      setTimeout(() => fsWarn.classList.add('hidden'), 2500);
    }
  }

  // Events
  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);
  btnFlag.addEventListener('click', toggleFlag);
  btnClear.addEventListener('click', clearAnswer);
  btnReview.addEventListener('click', showReview);
  btnBack.addEventListener('click', backToExam);
  btnSubmit.addEventListener('click', () => showReview());
  btnFinal.addEventListener('click', () => submitNow(false));
  btnStart.addEventListener('click', async () => {
    await goFullscreen();
    started = true;
    dlgBrief.close();
    startTimer();
  });

  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  // Boot
  loadBank();
})();
