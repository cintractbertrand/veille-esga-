// État partagé, sauvegarde automatique et petits utilitaires d'interface.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const uid = () => Math.random().toString(36).slice(2, 10);

export const THEMES = ['Pressing', 'Relance', 'Transition', 'Placement', 'Duel', 'Finition', 'Coup de pied arrêté', 'Bloc défensif', 'Communication'];

export const E = {
  match: null,            // { id, nom, sequences:[], reperes:[], dessins:[], reglages }
  effectif: [],           // [{ id, num, nom }]
  selSeq: null,           // id de la séquence sélectionnée
  entree: null, sortie: null,   // points I / O libres
};

// ---- petit bus d'évènements
const ecoutes = {};
export const on = (n, f) => (ecoutes[n] ||= []).push(f);
export const emit = (n, ...a) => (ecoutes[n] || []).forEach((f) => f(...a));

export async function api(methode, url, corps, brut = false) {
  const r = await fetch(url, {
    method: methode,
    headers: brut ? {} : { 'Content-Type': 'application/json' },
    body: corps == null ? undefined : brut ? corps : JSON.stringify(corps),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erreur || `Erreur ${r.status}`);
  return d;
}

// ---- sauvegarde automatique (rien à enregistrer à la main)
let minuteur = 0;
export function sauver() {
  if (!E.match) return;
  $('#etatSauve').textContent = '…';
  clearTimeout(minuteur);
  const m = E.match;
  minuteur = setTimeout(async () => {
    minuteur = 0;
    try { await api('PUT', `/api/match?id=${m.id}`, m); $('#etatSauve').textContent = 'Enregistré ✓'; }
    catch (e) { $('#etatSauve').textContent = 'Non enregistré !'; toast(e.message, { erreur: true }); }
  }, 500);
  emit('change');
}
export async function sauverMaintenant() {
  if (!E.match || !minuteur) return;
  clearTimeout(minuteur); minuteur = 0;
  await api('PUT', `/api/match?id=${E.match.id}`, E.match);
  $('#etatSauve').textContent = 'Enregistré ✓';
}
// à la fermeture de l'onglet : on n'attend pas la temporisation
window.addEventListener('pagehide', () => {
  if (!E.match || !minuteur) return;
  clearTimeout(minuteur);
  fetch(`/api/match?id=${E.match.id}`, { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(E.match) });
});
export const sauverEffectif = () => api('PUT', '/api/effectif', E.effectif).catch((e) => toast(e.message, { erreur: true }));

// ---- formats
export function fmt(t, dixiemes = true) {
  t = Math.max(0, t || 0);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const ss = dixiemes ? s.toFixed(1).padStart(4, '0') : String(Math.floor(s)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
export const nomJoueuse = (j) => `${j.num ? j.num + ' ' : ''}${j.nom || ''}`.trim();
export const joueuse = (id) => E.effectif.find((j) => j.id === id);
export const sequence = (id) => E.match?.sequences.find((s) => s.id === id) || null;

// ---- messages
export function toast(msg, { erreur = false, duree = 2600, action = null } = {}) {
  const el = document.createElement('div');
  el.className = 'toast' + (erreur ? ' erreur' : '');
  el.innerHTML = `<span>${esc(msg)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.textContent = action.label; b.onclick = () => { action.fn(); el.remove(); };
    el.append(b);
  }
  $('#toasts').append(el);
  if (duree) setTimeout(() => el.remove(), duree);
  return el;
}

/** Boîte de dialogue simple ; renvoie les valeurs du formulaire, ou null si annulé. */
export function dialogue({ titre, corps, ok = 'OK', auChargement }) {
  const d = $('#dlg');
  $('#dlgTitre').textContent = titre;
  $('#dlgCorps').innerHTML = corps;
  $('#dlgOk').textContent = ok;
  $('#dlgOk').hidden = !ok;
  d.showModal();
  auChargement?.($('#dlgCorps'));
  return new Promise((res) => {
    d.onclose = () => {
      if (d.returnValue !== 'ok') return res(null);
      const v = {};
      $$('[name]', d).forEach((el) => { v[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
      res(v);
    };
  });
}
export const enSaisie = (ev) => {
  const t = ev.target;
  return t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) && t.type !== 'checkbox' && t.type !== 'range';
};
