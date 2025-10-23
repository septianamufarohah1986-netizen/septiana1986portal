import { lastResult } from './ukai-core.js';

const res = lastResult();
const box = document.querySelector('#result-box');
if(!res){
  box.innerHTML = '<p>Belum ada hasil. Coba kerjakan latihan dulu.</p>';
}else{
  box.innerHTML = `
    <div class="card">
      <h3>Skor Terakhir</h3>
      <p><strong>${res.score}</strong> / 100</p>
      <p>Mode: ${res.mode}</p>
    </div>`;
}
