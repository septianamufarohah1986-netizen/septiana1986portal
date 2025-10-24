document.addEventListener('DOMContentLoaded', () => {
  const box = document.querySelector('#result-box');

  // Ambil hasil terakhir dari localStorage
  const raw = localStorage.getItem('ukai:lastRaw');

  if (!raw) {
    box.innerHTML = `
      <div class="card">
        <h3>Skor Terakhir</h3>
        <p>Belum ada hasil. Coba kerjakan latihan dulu.</p>
      </div>
    `;
    return;
  }

  try {
    const res = JSON.parse(raw); // {score, max, mode, ts}
    box.innerHTML = `
      <div class="card text-center">
        <h3>Skor Terakhir</h3>
        <div class="text-3xl font-bold">${res.score ?? '—'} / ${res.max ?? 100}</div>
        <p>Mode: ${res.mode ?? '—'}</p>
      </div>
    `;
  } catch (err) {
    console.error('Gagal memuat hasil terakhir:', err);
    box.innerHTML = `
      <div class="card">
        <p>Terjadi kesalahan saat memuat data.</p>
      </div>
    `;
  }
});
