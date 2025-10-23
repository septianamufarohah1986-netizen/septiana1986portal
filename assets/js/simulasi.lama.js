console.log('simulasi.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('simulasi-root');
  if (!root) {
    console.warn('Elemen #simulasi-root tidak ditemukan');
    return;
  }
  root.innerHTML = `
    <h3>Contoh Soal</h3>
    <p>Paracetamol termasuk golongan…</p>
    <label><input type="radio" name="a"> Analgesik antipiretik</label><br>
    <label><input type="radio" name="a"> Antibiotik</label>
  `;
});
