export async function fetchJSON(path){ const r = await fetch(path); return r.json(); }
export function fmt(n){ return new Intl.NumberFormat('id-ID').format(n); }

export async function loadTopics(selector){
  const root = document.querySelector(selector);
  const cfg = await fetchJSON('../data/topics.json');
  root.innerHTML = cfg.topics.map(t => `
    <article class="card">
      <span class="badge">📚 ${t.name}</span>
      <h3>${t.name}</h3>
      <p>Bank soal: <code>${t.id}</code></p>
      <a class="btn" data-topic="${t.id}" data-bank="${t.bank}">Mulai Latihan →</a>
    </article>`).join('');
  root.addEventListener('click', async e=>{
    const btn = e.target.closest('a[data-topic]');
    if(!btn) return;
    const bank = await fetchJSON('../data/'+btn.dataset.bank);
    sessionStorage.setItem('uk_session', JSON.stringify({mode:'topik', topic:btn.dataset.topic, items:bank.items}));
    location.href = './ukai-simulasi.html?mode=topik';
  });
}

export function saveResult(payload){
  const key = 'uk_results.'+Date.now();
  localStorage.setItem(key, JSON.stringify(payload));
  return key;
}

export function lastResult(){
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('uk_results.')).sort();
  const last = keys[keys.length-1];
  return last ? JSON.parse(localStorage.getItem(last)) : null;
}
