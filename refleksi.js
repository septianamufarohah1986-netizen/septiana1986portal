const txt = document.querySelector('#journal');
const btn = document.querySelector('#save');

function key(date){ return 'uk_journal.'+date; }

btn.onclick = ()=>{
  const d = new Date().toISOString().slice(0,10);
  localStorage.setItem(key(d), txt.value.trim());
  alert('Tersimpan. Terima kasih sudah menulis dengan hati.');
};

window.addEventListener('DOMContentLoaded',()=>{
  const d = new Date().toISOString().slice(0,10);
  txt.value = localStorage.getItem(key(d))||'';
});
