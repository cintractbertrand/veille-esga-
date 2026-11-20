// Bibliothèque : toutes les séquences de tous les matchs, filtrées par joueuse, thème, match ou genre.
// On clique des séquences dans l'ordre voulu, puis « Fabriquer la vidéo de séance » (un seul MP4, matchs mélangés).
import { ic } from './icones.js';
import { E, $, $$, api, toast, esc, fmt, nomJoueuse, sauverMaintenant, emit } from './etat.js';

const el = $('#biblio');
let B = { matchs: [], sequences: [], seances: [] };
let choix = [];               // [{ match, seq }] dans l'ordre de clic
const cle = (s) => `${s.match}:${s.id}`;

export async function ouvrir() {
  try { await sauverMaintenant(); } catch { /* la bibliothèque s'ouvre quand même */ }
  B = await api('GET', '/api/bibliotheque');
  remplirFiltres();
  el.hidden = false;
  rendre();
}
export const fermer = () => { el.hidden = true; };
export const ouverte = () => !el.hidden;

function remplirFiltres() {
  const garde = (sel, html) => { const v = sel.value; sel.innerHTML = html; sel.value = v; };
  const ids = new Set(B.sequences.flatMap((s) => s.joueuses || []));
  garde($('#fJoueuse'), '<option value="">Toutes les joueuses</option>' + E.effectif.filter((j) => ids.has(j.id))
    .map((j) => `<option value="${j.id}">${esc(nomJoueuse(j))}</option>`).join(''));
  const th = [...new Set(B.sequences.flatMap((s) => s.themes || []))].sort();
  garde($('#fTheme'), '<option value="">Tous les thèmes</option>' + th.map((t) => `<option>${esc(t)}</option>`).join(''));
  garde($('#fMatch'), '<option value="">Tous les matchs</option>' + B.matchs.map((m) => `<option value="${m.id}">${esc(m.nom)}</option>`).join(''));
  $('#biSeances').innerHTML = '<option value="">Séances préparées…</option>' + B.seances.map((s, i) => `<option value="${i}">${esc(s.nom)} (${s.items.length})</option>`).join('');
  if (!$('#biNom').value) $('#biNom').value = `Séance du ${new Date().toLocaleDateString('fr-FR')}`;
}

function filtrees() {
  const j = $('#fJoueuse').value, th = $('#fTheme').value, m = $('#fMatch').value, g = $('#fGenre').value, q = $('#fTexte').value.trim().toLowerCase();
  return B.sequences.filter((s) => (!j || (s.joueuses || []).includes(j)) && (!th || (s.themes || []).includes(th)) && (!m || s.match === m)
    && (!g || s.genre === g) && (!q || `${s.nom} ${s.matchNom} ${(s.themes || []).join(' ')}`.toLowerCase().includes(q)))
    .sort((a, b) => a.matchNom.localeCompare(b.matchNom) || a.debut - b.debut);
}
const titre = (s) => s.nom || (s.joueuses || []).map((id) => E.effectif.find((j) => j.id === id)?.nom).filter(Boolean).join(', ') || 'Séquence';

function rendre() {
  const l = filtrees();
  $('#fNombre').textContent = `${l.length} séquence${l.length > 1 ? 's' : ''}`;
  $('#biGrille').innerHTML = l.length ? l.map((s) => {
    const n = choix.findIndex((c) => c.match === s.match && c.seq === s.id);
    const js = (s.joueuses || []).map((id) => E.effectif.find((j) => j.id === id)).filter(Boolean);
    return `<div class="bi-carte ${n >= 0 ? 'sel' : ''}" data-k="${esc(cle(s))}">
      <img loading="lazy" src="${window.DEMO ? DEMO.vignette : `/vignette?match=${s.match}&t=${((s.debut + s.fin) / 2).toFixed(1)}`}" alt="">
      ${n >= 0 ? `<span class="bi-num">${n + 1}</span>` : ''}
      ${s.genre ? `<span class="bi-genre">${s.genre === 'bien' ? ic('bien', 13) + ' Bien' : ic('corriger', 13) + ' À corriger'}</span>` : ''}
      <div class="bi-txt"><div class="bi-titre">${esc(titre(s))}</div>
        <div class="petit discret">${esc(s.matchNom)} · <span class="mono">${fmt(s.debut, false)}</span> · ${(s.fin - s.debut).toFixed(0)} s${s.nDessins ? ' · ✎' + s.nDessins : ''}${s.voix ? ' · 🎙' : ''}</div>
        <div class="puces">${js.map((j) => `<span class="puce">${esc(nomJoueuse(j))}</span>`).join('')}${(s.themes || []).map((t) => `<span class="puce theme">${esc(t)}</span>`).join('')}</div></div>
      <button class="bi-ouvrir" data-ouvrir title="Ouvrir cette séquence dans son match">${ic('ouvrir', 13)} Ouvrir</button></div>`;
  }).join('') : '<p class="astuce">Aucune séquence avec ces filtres. Donnez des thèmes à vos séquences (＋ thème) pour les retrouver ici.</p>';
  const d = choix.reduce((a, c) => { const s = B.sequences.find((x) => x.match === c.match && x.id === c.seq); return a + (s ? s.fin - s.debut : 0); }, 0);
  $('#biSel').textContent = choix.length ? `${choix.length} séquence(s) choisie(s) · environ ${Math.round(d)} s de vidéo (+ arrêts sur image)`
    : 'Cliquez des séquences pour préparer une séance (l’ordre de clic = l’ordre de la vidéo).';
  $('#biFaire').disabled = !choix.length;
}

$('#biGrille').addEventListener('click', (e) => {
  const c = e.target.closest('.bi-carte'); if (!c) return;
  const [match, seq] = c.dataset.k.split(':');
  if (e.target.closest('[data-ouvrir]')) { fermer(); emit('ouvrirSeq', match, seq); return; }
  const i = choix.findIndex((x) => x.match === match && x.seq === seq);
  if (i >= 0) choix.splice(i, 1); else choix.push({ match, seq });
  rendre();
});
['#fJoueuse', '#fTheme', '#fMatch', '#fGenre'].forEach((s) => $(s).addEventListener('change', () => {
  // un filtre joueuse ou thème propose aussi un nom de séance
  const j = $('#fJoueuse').selectedOptions[0], th = $('#fTheme').value;
  if (s !== '#fMatch' && s !== '#fGenre' && (j?.value || th)) $('#biNom').value = [th, j?.value ? j.textContent : ''].filter(Boolean).join(' - ');
  rendre();
}));
$('#fTexte').addEventListener('input', rendre);
$('#biTout').onclick = () => { for (const s of filtrees()) if (!choix.some((c) => c.match === s.match && c.seq === s.id)) choix.push({ match: s.match, seq: s.id }); rendre(); };
$('#biVider').onclick = () => { choix = []; rendre(); };
$('#biFermer').onclick = fermer;
$('#btnBiblio').onclick = () => (ouverte() ? fermer() : ouvrir());
$('#biSeances').onchange = (e) => {
  const s = B.seances[+e.target.value]; e.target.value = '';
  if (!s) return;
  choix = s.items.filter((c) => B.sequences.some((x) => x.match === c.match && x.id === c.seq));
  $('#biNom').value = s.nom;
  rendre();
};

let suivi = 0;
$('#biFaire').onclick = async () => {
  if (!choix.length) return;
  const nom = $('#biNom').value.trim() || 'Séance';
  try {
    const t0 = await api('POST', '/api/seance', { nom, items: choix });
    const el2 = toast('', { duree: 0 });
    clearInterval(suivi);
    suivi = setInterval(async () => {
      const t = await api('GET', `/api/tache?id=${t0.id}`).catch(() => null);
      if (!t) return;
      el2.innerHTML = `<span>🎬 ${esc(t.message)}</span><span class="barre-progres"><i style="width:${Math.round(t.progres * 100)}%"></i></span>`;
      if (t.etat === 'en cours') return;
      clearInterval(suivi); el2.remove();
      if (t.etat !== 'terminé') { toast('Séance : ' + (t.erreur || t.etat), { erreur: true, duree: 10000 }); return; }
      const f = t.resultats[0]?.fichier;
      const tt = toast(t.message, { duree: 20000, action: { label: '▶ Regarder', fn: () => regarder(f) } });
      const b = document.createElement('button'); b.textContent = 'Ouvrir le dossier';
      b.onclick = () => api('POST', `/api/ouvrir?chemin=${encodeURIComponent(t.dossier)}`); if (!window.DEMO) tt.append(b);
    }, 800);
  } catch (e2) { toast(e2.message, { erreur: true }); }
};

export function regarder(f) {
  if (window.DEMO) { const ids = choix.map((c) => c.seq); fermer(); emit('presenterSeqs', ids); return; }
  const l = $('#lecteurSeance'), v = l.querySelector('video');
  v.src = `/envoi/?f=${encodeURIComponent(f)}`;
  l.hidden = false;
  l.requestFullscreen?.().catch(() => {});
  v.play().catch(() => {});
}
$('#lsFermer').onclick = () => { const l = $('#lecteurSeance'); l.querySelector('video').pause(); l.hidden = true; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#lecteurSeance').hidden) { e.stopImmediatePropagation(); $('#lsFermer').click(); }
  else if (ouverte() && !$('#dlg').open) { e.stopImmediatePropagation(); fermer(); }
}, true);
