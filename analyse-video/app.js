// Assemblage de la page : choix du match, effectif, séquences, repères, clavier, envoi, présentation.
import { ic } from './icones.js';
import { THEMES, E, $, $$, on, emit, api, sauver, sauverMaintenant, sauverEffectif, toast, dialogue, fmt, esc, uid, nomJoueuse, joueuse, sequence, enSaisie } from './etat.js';
import * as L from './lecteur.js';
import { video } from './lecteur.js';
import { redessiner, montrer } from './frise.js';
import * as D from './dessin.js';
import { ouverte as biblioOuverte } from './biblio.js';

const COUL_REP = ['#ffd43b', '#ff4d4f', '#51cf66', '#4dabf7'];

// ================= matchs
async function chargerVideos(choisir) {
  const vids = await api('GET', '/api/videos');
  const sel = $('#choixVideo');
  sel.innerHTML = '<option value="">— Vidéo du match —</option>' + vids.map((v) =>
    `<option value="${v.id}">${esc(v.nom)}${window.DEMO ? '' : ` (${(v.taille / 1e9).toFixed(1)} Go)`}</option>`).join('');
  let id = choisir;
  if (!id) { try { id = localStorage.getItem('montage-dernier'); } catch { /* */ } }
  if (!id && window.DEMO) id = vids[0]?.id;
  if (id && vids.some((v) => v.id === id)) { sel.value = id; await ouvrir(id); }
}
async function ouvrir(id) {
  if (D.actif()) D.terminer();
  try { await sauverMaintenant(); } catch (e) { toast(e.message, { erreur: true }); }
  if (!id) { E.match = null; L.charger(''); listes(); return; }
  E.match = await api('GET', `/api/match?id=${id}`);
  E.match.sequences ||= []; E.match.reperes ||= []; E.match.dessins ||= []; E.match.reglages ||= { avant: 6, apres: 4 };
  E.selSeq = null; E.entree = E.sortie = null;
  $('#nomMatch').value = E.match.nom || '';
  L.charger(window.DEMO ? DEMO.video : `/video?id=${id}`);
  try { localStorage.setItem('montage-dernier', id); } catch { /* */ }
  listes();
}
$('#choixVideo').onchange = (e) => ouvrir(e.target.value);
$('#nomMatch').oninput = (e) => { if (E.match) { E.match.nom = e.target.value; sauver(); } };
$('#ajoutVideo').onclick = async () => {
  const v = await dialogue({ titre: 'Ajouter une vidéo', ok: 'Ajouter', corps: `<label>Chemin complet du fichier (clic droit sur le fichier → « Copier en tant que chemin d'accès ») :
    <input type="text" name="chemin" placeholder="C:\\Users\\…\\match.mp4"></label>
    <p class="petit discret">Astuce : les vidéos rangées dans analyse-veo\\match apparaissent toutes seules.</p>` });
  if (!v?.chemin) return;
  try { const r = await api('POST', '/api/ajouter_video', { chemin: v.chemin }); await chargerVideos(r.id); }
  catch (e) { toast(e.message, { erreur: true, duree: 5000 }); }
};

// ================= effectif
function effectif() {
  const el = $('#effectif');
  const s = sequence(E.selSeq);
  el.innerHTML = E.effectif.length ? E.effectif.map((j) =>
    `<button data-j="${j.id}" class="${s?.joueuses?.includes(j.id) ? 'dans' : ''}" title="${esc(nomJoueuse(j))}"><b>${esc(j.num || '')}</b>${esc(j.nom || '')}</button>`).join('')
    : '<p class="astuce" style="grid-column:1/-1">Ajoutez vos joueuses avec « Modifier » (une par ligne : <b>9 Manon</b>).</p>';
}
$('#effectif').addEventListener('click', (e) => {
  const b = e.target.closest('[data-j]'); if (!b) return;
  marquer(b.dataset.j);
});
/** Clic sur une joueuse : l'ajoute à la séquence en cours si on est dedans, sinon crée sa séquence à l'instant. */
function marquer(jid) {
  if (!E.match || !L.pret()) { toast('Choisissez d’abord une vidéo', { erreur: true }); return; }
  const tt = L.t(), s = sequence(E.selSeq);
  if (s && tt >= s.debut - 0.5 && tt <= s.fin + 0.5) {
    s.joueuses ||= [];
    const i = s.joueuses.indexOf(jid);
    if (i >= 0) s.joueuses.splice(i, 1); else s.joueuses.push(jid);
    sauver(); listes();
    return;
  }
  creerSequence(Math.max(0, tt - E.match.reglages.avant), tt + E.match.reglages.apres, [jid]);
  toast(`${nomJoueuse(joueuse(jid))} marquée · glissez les bords de la séquence si besoin`, { duree: 2500 });
}
$('#btnEffectif').onclick = async () => {
  const v = await dialogue({ titre: 'Effectif', ok: 'Enregistrer', corps: `<p class="petit discret">Une joueuse par ligne : numéro puis prénom.</p>
    <textarea name="txt">${esc(E.effectif.map(nomJoueuse).join('\n'))}</textarea>` });
  if (!v) return;
  const anciens = E.effectif;
  E.effectif = v.txt.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(\d{1,3})\s*[-.]?\s*(.*)$/);
    const num = m ? m[1] : '', nom = (m ? m[2] : l).trim();
    const ancien = anciens.find((a) => a.num === num && a.nom === nom) || anciens.find((a) => num && a.num === num) || anciens.find((a) => a.nom === nom);
    return { id: ancien?.id || uid(), num, nom };
  });
  await sauverEffectif();
  listes();
};

// ================= séquences
function creerSequence(a, b, joueuses = []) {
  const n = E.match.sequences.length + 1;
  const s = { id: uid(), debut: +a.toFixed(2), fin: +b.toFixed(2), joueuses, nom: '', genre: null };
  s.nom = joueuses.length ? '' : `Séquence ${n}`;
  E.match.sequences.push(s);
  E.match.sequences.sort((x, y) => x.debut - y.debut);
  E.selSeq = s.id;
  sauver(); listes();
  return s;
}
function creerDepuisIO() {
  if (!E.match || !L.pret()) return;
  const tt = L.t();
  let a = E.entree, b = E.sortie;
  if (a == null && b == null) { a = tt - E.match.reglages.avant; b = tt + E.match.reglages.apres; }
  else if (b == null) b = Math.max(tt, a + 4);
  else if (a == null) a = Math.min(tt, b - 4);
  if (b < a) [a, b] = [b, a];
  if (b - a < 0.5) b = a + 0.5;
  E.entree = E.sortie = null;
  creerSequence(Math.max(0, a), b);
}
function choisirSeq(id, allerDebut = false) {
  E.selSeq = id;
  const s = sequence(id);
  if (s && allerDebut) { L.aller(s.debut); montrer(s.debut, s.fin); }
  listes();
  $(`#listeSeq [data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
}
on('choisirSeq', choisirSeq);
on('ouvrirSeq', async (mid, sid) => {
  if (E.match?.id !== mid) {
    $('#choixVideo').value = mid;
    await ouvrir(mid);
    await new Promise((r) => { if (L.pret()) r(); else video.addEventListener('loadedmetadata', r, { once: true }); });
  }
  choisirSeq(sid, true);
});
on('presenterSeqs', (ids) => presenter(ids.map(sequence).filter(Boolean)));
on('lireSeq', (id) => { const s = sequence(id); if (s) { choisirSeq(id); L.lireSegment(s.debut, s.fin); } });

const themesPerso = () => [...new Set((E.match?.sequences || []).flatMap((s) => s.themes || []))];
const titreSeq = (s) => s.nom || (s.joueuses || []).map((id) => joueuse(id)?.nom).filter(Boolean).join(', ') || 'Séquence';
function listeSeq() {
  const seqs = E.match?.sequences || [];
  $('#nSeq').textContent = seqs.length ? `(${seqs.length})` : '';
  $('#listeSeq').innerHTML = seqs.length ? seqs.map((s) => {
    const nd = E.match.dessins.filter((d) => d.t >= s.debut && d.t < s.fin).length;
    return `<div class="carte ${s.id === E.selSeq ? 'sel' : ''}" data-id="${s.id}">
      <div class="l1"><input class="nom" value="${esc(s.nom)}" placeholder="${esc(titreSeq(s))}" title="Nom de la séquence (apparaît dans la liste)">
        <button class="bt discret" data-a="lire" title="Lire la séquence">${ic('lecture', 14)}</button>
        <button class="bt discret" data-a="suppr" title="Supprimer la séquence">${ic('fermer', 14)}</button></div>
      <div class="l2 mono petit">${fmt(s.debut)} → ${fmt(s.fin)} <span>(${(s.fin - s.debut).toFixed(1)} s)</span>${nd ? ` · ✎ ${nd}` : ''}</div>
      <div class="puces">${(s.joueuses || []).map((id) => joueuse(id)).filter(Boolean).map((j) => `<span class="puce">${esc(nomJoueuse(j))}</span>`).join('')
        || '<span class="petit discret">Cliquez une joueuse de l’effectif pour l’ajouter</span>'}</div>
      <div class="puces themes">${(s.themes || []).map((th) => `<span class="puce theme" data-th="${esc(th)}" title="Retirer ce thème">${esc(th)} ✕</span>`).join('')}
        <select class="ajout-theme" title="Thème (pour retrouver la séquence dans la bibliothèque)"><option value="">＋ thème</option>
          ${[...new Set([...THEMES, ...themesPerso()])].filter((th) => !(s.themes || []).includes(th)).map((th) => `<option>${esc(th)}</option>`).join('')}
          <option value="__autre">Autre…</option></select></div>
      <div class="l1" style="margin-top:3px">
        <button class="bt k-bien ${s.genre === 'bien' ? 'on' : ''}" data-a="bien" title="À valoriser">${ic('bien', 14)} Bien</button>
        <button class="bt k-corriger ${s.genre === 'corriger' ? 'on' : ''}" data-a="corriger" title="À corriger">${ic('corriger', 14)} À corriger</button>
        <span class="espace"></span>
        ${s.voix ? `<button class="bt" data-a="ecouter" title="Lire la séquence avec le commentaire">${ic('ecouter', 15)}</button><button class="bt discret" data-a="sansvoix" title="Supprimer le commentaire">${ic('sansvoix', 15)}</button>`
          : ''}<button class="bt ${s.voix ? 'discret' : ''}" data-a="micro" title="${s.voix ? 'Refaire le commentaire' : 'Commenter au micro : la séquence défile (arrêts sur image compris) pendant que vous parlez'}">${ic('micro', 15)}</button>
      </div></div>`;
  }).join('') : `<p class="astuce">En regardant le match, cliquez une joueuse de l’effectif : sa séquence est créée
    (${E.match?.reglages.avant ?? 6} s avant, ${E.match?.reglages.apres ?? 4} s après).<br><br>
    Ou posez <kbd>I</kbd> entrée et <kbd>O</kbd> sortie, puis <kbd>Entrée</kbd>.</p>`;
}
$('#listeSeq').addEventListener('click', (e) => {
  const c = e.target.closest('.carte'); if (!c) return;
  const s = sequence(c.dataset.id); if (!s) return;
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (a === 'lire') { choisirSeq(s.id); L.lireSegment(s.debut, s.fin); return; }
  if (a === 'ecouter') { choisirSeq(s.id); lireAvecVoix(s); return; }
  if (a === 'micro') { choisirSeq(s.id); enregistrer(s); return; }
  if (a === 'sansvoix') { api('POST', `/api/voix?match=${E.match.id}&seq=${s.id}`, '', true).then(() => { s.voix = 0; sauver(); listes(); }); return; }
  if (a === 'suppr') {
    const i = E.match.sequences.indexOf(s);
    E.match.sequences.splice(i, 1);
    if (E.selSeq === s.id) E.selSeq = null;
    sauver(); listes();
    toast('Séquence supprimée', { action: { label: 'Annuler', fn: () => { E.match.sequences.splice(i, 0, s); sauver(); listes(); } }, duree: 5000 });
    return;
  }
  const th = e.target.closest('[data-th]');
  if (th) { s.themes = (s.themes || []).filter((x) => x !== th.dataset.th); sauver(); listes(); return; }
  if (a === 'bien' || a === 'corriger') { s.genre = s.genre === a ? null : a; sauver(); listes(); return; }
  if (!e.target.closest('input,select') && s.id !== E.selSeq) choisirSeq(s.id, true);
});
$('#listeSeq').addEventListener('change', async (e) => {
  if (!e.target.classList.contains('ajout-theme')) return;
  const s = sequence(e.target.closest('.carte').dataset.id);
  let v = e.target.value;
  if (v === '__autre') { const r = await dialogue({ titre: 'Nouveau thème', corps: '<input type="text" name="v" placeholder="Ex. Sortie de balle">', auChargement: (el) => el.querySelector('input').focus() }); v = r?.v?.trim(); }
  if (s && v) { s.themes = [...new Set([...(s.themes || []), v])]; sauver(); }
  listes();
});
$('#listeSeq').addEventListener('input', (e) => {
  if (!e.target.classList.contains('nom')) return;
  const s = sequence(e.target.closest('.carte').dataset.id);
  if (s) { s.nom = e.target.value; sauver(); }
});
$('#listeSeq').addEventListener('focusin', (e) => { const c = e.target.closest('.carte'); if (c && e.target.classList.contains('nom') && c.dataset.id !== E.selSeq) { E.selSeq = c.dataset.id; effectif(); redessiner(); $$('#listeSeq .carte').forEach((x) => x.classList.toggle('sel', x === c)); } });
$('#listeSeq').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });

// ================= commentaire au micro
let rec = null;
async function enregistrer(s) {
  if (rec) { rec.stop(); return; }
  if (!L.pret()) return;
  let flux;
  try { flux = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch { toast('Micro inaccessible : autorisez-le dans le navigateur (icône à gauche de l’adresse)', { erreur: true, duree: 6000 }); return; }
  const mr = new MediaRecorder(flux, MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? { mimeType: 'audio/webm;codecs=opus' } : {});
  const morceaux = [];
  mr.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
  const vol = video.volume;
  const el = toast('', { duree: 0 });
  el.innerHTML = '<span style="color:#ff6b6b">● Enregistrement</span><span>parlez, la séquence défile</span>';
  const b = document.createElement('button'); b.textContent = 'Arrêter'; el.append(b);
  b.onclick = () => rec?.stop();
  rec = { stop: () => { if (mr.state !== 'inactive') mr.stop(); } };
  mr.onstop = async () => {
    flux.getTracks().forEach((t) => t.stop());
    video.volume = vol; el.remove(); rec = null; L.pause();
    const blob = new Blob(morceaux, { type: 'audio/webm' });
    if (blob.size < 2000) { toast('Commentaire trop court, rien enregistré', { erreur: true }); return; }
    try {
      await api('POST', `/api/voix?match=${E.match.id}&seq=${s.id}`, blob, true);
      s.voix = Date.now(); sauver(); listes();
      toast('Commentaire enregistré : il sera dans les vidéos envoyées', { duree: 3000 });
    } catch (e) { toast(e.message, { erreur: true }); }
  };
  video.volume = Math.min(vol, 0.2);
  mr.start(250);
  L.lireSegment(s.debut, s.fin, () => setTimeout(() => rec?.stop(), 300));
}
// lecture avec la voix : l'audio suit la séquence, arrêts sur image compris
let voixEnCours = null, suiviVoix = 0;
function lireAvecVoix(s, suite = null) {
  arreterVoix();
  if (!s.voix) { L.lireSegment(s.debut, s.fin, suite); return; }
  const a = new Audio(window.DEMO ? DEMO.voix(s.id) : `/voix?match=${E.match.id}&id=${s.id}&v=${s.voix}`);
  voixEnCours = a;
  const vol = video.volume; video.volume = Math.min(vol, 0.3);
  L.lireSegment(s.debut, s.fin, () => { arreterVoix(); video.volume = vol; suite?.(); });
  a.play().catch(() => {});
  suiviVoix = setInterval(() => {
    if (voixEnCours !== a) return;
    const enCours = !video.paused || L.enGel();
    if (enCours && a.paused && !a.ended) a.play().catch(() => {});
    if (!enCours && !a.paused) { a.pause(); }
  }, 200);
  a._vol = vol;
}
function arreterVoix() {
  clearInterval(suiviVoix);
  if (voixEnCours) { voixEnCours.pause(); if (voixEnCours._vol != null) video.volume = voixEnCours._vol; voixEnCours = null; }
}

// ================= repères
function poserRepere() {
  if (!E.match || !L.pret()) return;
  const tt = +L.t().toFixed(2);
  const r = { id: uid(), t: tt, nom: '', couleur: COUL_REP[0] };
  E.match.reperes.push(r);
  E.match.reperes.sort((a, b) => a.t - b.t);
  sauver(); listes();
  toast(`Repère posé à ${fmt(tt)} · double-clic dessus pour le nommer`, { duree: 1800 });
}
function repereVoisin(dir) {
  const tt = L.t(), rs = E.match?.reperes || [];
  const r = dir > 0 ? rs.find((x) => x.t > tt + 0.05) : [...rs].reverse().find((x) => x.t < tt - 0.05);
  if (r) L.aller(r.t); else toast(dir > 0 ? 'Pas de repère après' : 'Pas de repère avant', { duree: 1000 });
}
async function renommerRepere(r) {
  const v = await dialogue({ titre: 'Repère à ' + fmt(r.t), ok: 'OK', corps: `<label>Nom : <input type="text" name="nom" value="${esc(r.nom)}" placeholder="Ex. pressing, but encaissé…"></label>
    <label>Couleur : ${COUL_REP.map((c) => `<label style="display:inline"><input type="radio" name="c" value="${c}" ${r.couleur === c ? 'checked' : ''} onclick="this.form.querySelector('[name=couleur]').value=this.value"><span style="color:${c}">●</span></label>`).join(' ')}</label>
    <input type="hidden" name="couleur" value="${r.couleur}">`, auChargement: (el) => el.querySelector('[name=nom]').focus() });
  if (!v) return;
  r.nom = v.nom.trim(); r.couleur = v.couleur || r.couleur;
  sauver(); listes();
}
on('renommerRepere', renommerRepere);
on('supprimerRepere', (r) => {
  const i = E.match.reperes.indexOf(r); if (i < 0) return;
  E.match.reperes.splice(i, 1); sauver(); listes();
  toast('Repère supprimé', { action: { label: 'Annuler', fn: () => { E.match.reperes.splice(i, 0, r); sauver(); listes(); } }, duree: 5000 });
});
function listeRep() {
  const rs = E.match?.reperes || [];
  $('#nRep').textContent = rs.length ? `(${rs.length})` : '';
  $('#listeRep').innerHTML = rs.length ? rs.map((r) => `<div class="carte" data-id="${r.id}"><div class="l1">
      <span class="rep-ic" style="color:${r.couleur}">${ic('repere', 15)}</span><span class="mono petit">${fmt(r.t)}</span>
      <input class="nom" value="${esc(r.nom)}" placeholder="(sans nom)">
      <button class="bt discret" data-a="seq" title="Créer une séquence autour de ce repère">${ic('ciseaux', 14)}</button>
      <button class="bt discret" data-a="suppr" title="Supprimer">${ic('fermer', 14)}</button></div></div>`).join('')
    : '<p class="astuce">Touche <kbd>M</kbd> (ou 📍 Repère) pour poser une puce à l’instant. <kbd>↑</kbd> / <kbd>↓</kbd> pour sauter de repère en repère.</p>';
}
$('#listeRep').addEventListener('click', (e) => {
  const c = e.target.closest('.carte'); if (!c) return;
  const r = E.match.reperes.find((x) => x.id === c.dataset.id); if (!r) return;
  const a = e.target.closest('[data-a]')?.dataset.a;
  if (a === 'suppr') { emit('supprimerRepere', r); return; }
  if (a === 'seq') { creerSequence(Math.max(0, r.t - E.match.reglages.avant), r.t + E.match.reglages.apres); if (r.nom) { sequence(E.selSeq).nom = r.nom; sauver(); listes(); } return; }
  if (!e.target.closest('input')) L.aller(r.t);
});
$('#listeRep').addEventListener('input', (e) => {
  const r = E.match.reperes.find((x) => x.id === e.target.closest('.carte')?.dataset.id);
  if (r && e.target.classList.contains('nom')) { r.nom = e.target.value; sauver(); }
});
$$('.onglets button').forEach((b) => b.addEventListener('click', () => {
  $$('.onglets button').forEach((x) => x.classList.toggle('actif', x === b));
  $('#listeSeq').hidden = b.dataset.onglet !== 'seq';
  $('#listeRep').hidden = b.dataset.onglet !== 'rep';
}));

function listes() { effectif(); listeSeq(); listeRep(); redessiner(); }

// ================= boutons du transport
$('#tRepere').onclick = poserRepere;
$('#tEntree').onclick = () => { E.entree = L.t(); redessiner(); };
$('#tSortie').onclick = () => { E.sortie = L.t(); redessiner(); };
$('#tCreer').onclick = creerDepuisIO;

// ================= envoi
let suiviEnvoi = 0;
$('#btnEnvoyer').onclick = async () => {
  if (!E.match) return;
  const seqs = E.match.sequences;
  if (!seqs.length) { toast('Aucune séquence : marquez d’abord des joueuses', { erreur: true }); return; }
  const info = await api('GET', '/api/info');
  if (!info.ffmpeg) { toast('ffmpeg introuvable : relancez lancer_montage.bat', { erreur: true, duree: 6000 }); return; }
  const jids = [...new Set(seqs.flatMap((s) => s.joueuses || []))].map(joueuse).filter(Boolean);
  const v = await dialogue({ titre: 'Envoyer les vidéos', ok: 'Fabriquer les vidéos', corps: `
    <p><b>${jids.length}</b> joueuse(s) concernée(s) : une vidéo chacune avec ses séquences, dessins et arrêts sur image.</p>
    <p class="petit">${jids.map((j) => esc(nomJoueuse(j)) + ' (' + seqs.filter((s) => s.joueuses?.includes(j.id)).length + ')').join(' · ') || '—'}</p>
    ${seqs.some((s) => s.voix) ? `<p class="petit">🎙 ${seqs.filter((s) => s.voix).length} séquence(s) avec commentaire au micro.</p>` : ''}
    <label><input type="checkbox" name="equipe" checked> Et une vidéo de l’équipe avec les ${seqs.length} séquences</label>
    <p class="petit discret">Dossier : ${esc(info.envois)}\\${esc(E.match.nom || '')}</p>` });
  if (!v) return;
  try {
    const tache = await api('POST', `/api/envoi?match=${E.match.id}`, { equipe: v.equipe });
    const el = toast('', { duree: 0 });
    clearInterval(suiviEnvoi);
    suiviEnvoi = setInterval(async () => {
      const t = await api('GET', `/api/tache?id=${tache.id}`).catch(() => null);
      if (!t) return;
      el.innerHTML = `<span>📤 ${esc(t.message)}</span><span class="barre-progres"><i style="width:${Math.round(t.progres * 100)}%"></i></span>`;
      if (t.etat !== 'en cours') {
        clearInterval(suiviEnvoi);
        el.remove();
        if (t.etat === 'terminé') toast(t.message, { duree: 15000, action: window.DEMO ? { label: 'Présenter', fn: () => $('#btnPresenter').click() } : { label: 'Ouvrir le dossier', fn: () => api('POST', `/api/ouvrir?chemin=${encodeURIComponent(t.dossier)}`) } });
        else toast('Envoi : ' + (t.erreur || t.etat), { erreur: true, duree: 10000 });
      }
    }, 800);
  } catch (e) { toast(e.message, { erreur: true }); }
};
$('#btnDossier').onclick = () => api('POST', '/api/ouvrir').catch((e) => toast(e.message, { erreur: true }));

// ================= présentation (séance au club)
let pres = null;
function presenter(liste) {
  if (!liste.length) { toast('Aucune séquence à présenter', { erreur: true }); return; }
  if (D.actif()) D.terminer();
  pres = { liste, i: 0 };
  document.body.classList.add('presente');
  $('#cadre').requestFullscreen?.().catch(() => {});
  setTimeout(L.miseEnPage, 300);
  jouerPres();
}
function jouerPres() {
  if (!pres) return;
  const s = pres.liste[pres.i];
  let lg = $('#legende');
  if (!lg) { lg = document.createElement('div'); lg.id = 'legende'; $('#cadre').append(lg); }
  lg.textContent = `${pres.i + 1}/${pres.liste.length} · ${titreSeq(s)}`;
  lg.hidden = false;
  lireAvecVoix(s, () => { if (!pres) return; if (pres.i + 1 < pres.liste.length) { pres.i++; setTimeout(jouerPres, 600); } else finPres(); });
}
function finPres() {
  if (!pres) return;
  pres = null;
  arreterVoix();
  document.body.classList.remove('presente');
  $('#legende')?.remove();
  L.pause();
  L.fixerZoom(null, false);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  setTimeout(L.miseEnPage, 300);
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && pres) finPres(); });
$('#btnPresenter').onclick = () => {
  const s = sequence(E.selSeq);
  presenter(E.match ? [...E.match.sequences] : []);
  if (s && pres) { pres.i = Math.max(0, pres.liste.indexOf(s)); jouerPres(); }
};

// ================= aide
$('#btnAide').onclick = () => dialogue({ titre: 'Raccourcis clavier', ok: '', corps: `<div id="aide"><table>
  <tr><td><kbd>Espace</kbd> / <kbd>K</kbd></td><td>Lecture / pause</td></tr>
  <tr><td><kbd>L</kbd> (répété)</td><td>Lecture avant 1×, 2×, 4×</td></tr>
  <tr><td><kbd>J</kbd> (répété)</td><td>Lecture arrière 1×, 2×, 4×</td></tr>
  <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>−2 s / +2 s (Maj : 5 s, Ctrl : 30 s)</td></tr>
  <tr><td><kbd>,</kbd> <kbd>.</kbd></td><td>Image précédente / suivante</td></tr>
  <tr><td><kbd>M</kbd></td><td>Poser un repère ; <kbd>↑</kbd> <kbd>↓</kbd> repère précédent / suivant</td></tr>
  <tr><td><kbd>I</kbd> <kbd>O</kbd> <kbd>Entrée</kbd></td><td>Entrée, sortie, créer la séquence</td></tr>
  <tr><td>Clic joueuse</td><td>Crée sa séquence à l’instant (ou l’ajoute à la séquence sélectionnée)</td></tr>
  <tr><td><kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd></td><td>Zoom dans l’image (aussi : molette, double-clic) ; clic droit pour se déplacer</td></tr>
  <tr><td><kbd>D</kbd></td><td>Dessiner ici (dernier outil) ; <kbd>Échap</kbd> terminer ; <kbd>Ctrl</kbd>+<kbd>Z</kbd> annuler ; <kbd>Suppr</kbd> effacer la forme choisie</td></tr>
  <tr><td><kbd>P</kbd></td><td>Lire la séquence sélectionnée</td></tr>
</table></div>` });

// ================= clavier
window.addEventListener('keydown', (e) => {
  if ($('#dlg').open || enSaisie(e) || biblioOuverte() || !$('#lecteurSeance').hidden) return;
  const k = e.code, ctrl = e.ctrlKey || e.metaKey;
  if (pres) {
    if (k === 'Escape') { e.preventDefault(); finPres(); }
    else if (k === 'Space') { e.preventDefault(); L.basculer(); }
    else if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      const n = pres.i + (k === 'ArrowRight' ? 1 : -1);
      if (n >= 0 && n < pres.liste.length) { pres.i = n; jouerPres(); }
    }
    return;
  }
  if (D.actif()) {
    if (k === 'Escape') { e.preventDefault(); if (!D.echap()) D.terminer(); return; }
    if (ctrl && k === 'KeyZ') { e.preventDefault(); D.annuler(); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); D.effacer(); return; }
    if (k === 'Enter') { e.preventDefault(); D.finirMulti(); return; }
    if (k === 'Space') { e.preventDefault(); D.terminer(); L.lire(); return; }
    if (['Equal', 'NumpadAdd'].includes(k)) { e.preventDefault(); L.zoomer(1.4); return; }
    if (['Minus', 'NumpadSubtract'].includes(k)) { e.preventDefault(); L.zoomer(1 / 1.4); return; }
    return;
  }
  const pas = ctrl ? 30 : e.shiftKey ? 5 : 2;
  switch (k) {
    case 'Space': e.preventDefault(); L.basculer(); return;
    case 'KeyK': e.preventDefault(); L.K(); return;
    case 'KeyL': e.preventDefault(); L.L(); return;
    case 'KeyJ': e.preventDefault(); L.J(); return;
    case 'ArrowLeft': e.preventDefault(); L.saut(-pas); return;
    case 'ArrowRight': e.preventDefault(); L.saut(pas); return;
    case 'Comma': e.preventDefault(); L.image(-1); return;
    case 'Period': e.preventDefault(); L.image(1); return;
    case 'KeyM': e.preventDefault(); poserRepere(); return;
    case 'ArrowUp': e.preventDefault(); repereVoisin(-1); return;
    case 'ArrowDown': e.preventDefault(); repereVoisin(1); return;
    case 'KeyI': e.preventDefault(); E.entree = L.t(); redessiner(); return;
    case 'KeyO': e.preventDefault(); E.sortie = L.t(); redessiner(); return;
    case 'Enter': case 'NumpadEnter': e.preventDefault(); creerDepuisIO(); return;
    case 'KeyP': { const s = sequence(E.selSeq); if (s) { e.preventDefault(); lireAvecVoix(s); } return; }
    case 'KeyD': e.preventDefault(); if (D.commencer()) $('#listeOutils [data-outil="fleche"]').click(); return;
    case 'Equal': case 'NumpadAdd': e.preventDefault(); L.zoomer(1.4); return;
    case 'Minus': case 'NumpadSubtract': e.preventDefault(); L.zoomer(1 / 1.4); return;
    case 'Digit0': case 'Numpad0': e.preventDefault(); L.fixerZoom(null); return;
    case 'Escape':
      if (E.entree != null || E.sortie != null) { E.entree = E.sortie = null; redessiner(); }
      else if (E.selSeq) { E.selSeq = null; listes(); }
      return;
    case 'Delete': {
      const s = sequence(E.selSeq);
      if (s) { e.preventDefault(); $(`#listeSeq [data-id="${s.id}"] [data-a="suppr"]`)?.click(); }
      return;
    }
  }
});

// ================= démarrage
(async () => {
  try {
    E.effectif = await api('GET', '/api/effectif');
    await chargerVideos();
    listes();
  } catch (e) { toast(window.DEMO ? 'La démo n’a pas pu démarrer : ' + e.message : 'Serveur injoignable : lancez lancer_montage.bat', { erreur: true, duree: 0 }); }
})();
