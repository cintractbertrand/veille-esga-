// Timeline du match : règle, repères, séquences (bords glissables), dessins, points I / O, tête de lecture.
import { E, $, on, emit, fmt, sauver, joueuse } from './etat.js';
import { video, aller, pret } from './lecteur.js';

const cv = $('#tl');
const vue = { a: 0, b: 0 };                     // fenêtre affichée en secondes (b = 0 : tout)
const RANG = { regle: [0, 20], rep: [22, 40], seq: [44, 76], des: [80, 92], io: [96, 112] };
const BORD = 6;
let action = null, survol = null, attente = 0;

const duree = () => video.duration || 0;
const fen = () => (vue.b > vue.a ? [vue.a, Math.min(vue.b, duree())] : [0, duree()]);
const largeur = () => cv.clientWidth;
const X = (tt) => { const [a, b] = fen(); return b > a ? ((tt - a) / (b - a)) * largeur() : 0; };
const T = (x) => { const [a, b] = fen(); return Math.max(0, Math.min(duree(), a + (x / largeur()) * (b - a))); };
const dans = (y, r) => y >= r[0] && y <= r[1];

export function redessiner() { if (!attente) attente = requestAnimationFrame(() => { attente = 0; dessiner(); }); }

function couleurSeq(s) { return s.genre === 'bien' ? '#4ade80' : s.genre === 'corriger' ? '#fb923c' : '#60a5fa'; }

function dessiner() {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  if (!duree() || !E.match) return;
  const [a, b] = fen();
  // règle
  c.fillStyle = '#12151c'; c.fillRect(0, 0, w, 20); c.fillStyle = 'rgba(255,255,255,.02)'; c.fillRect(0, 44, w, 32);
  const pas = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900].find((p) => (p / (b - a)) * w > 70) || 1800;
  c.font = '500 10px "JetBrains Mono", ui-monospace, Consolas, monospace'; c.fillStyle = '#6b7385'; c.strokeStyle = 'rgba(255,255,255,.06)';
  for (let tt = Math.ceil(a / pas) * pas; tt <= b; tt += pas) {
    const x = Math.round(X(tt)) + 0.5;
    c.beginPath(); c.moveTo(x, 12); c.lineTo(x, h); c.stroke();
    c.fillText(fmt(tt, false), x + 3, 11);
  }
  c.fillStyle = '#5d6576'; c.font = '600 9px Inter, system-ui, sans-serif';
  c.fillText('REPÈRES', 6, 35); c.fillText('SÉQUENCES', 6, 58); c.fillText('DESSINS', 6, 90);
  // entrée / sortie libres
  if (E.entree != null || E.sortie != null) {
    const i = E.entree ?? E.sortie, o = E.sortie ?? E.entree;
    c.fillStyle = '#ffd43b22'; c.fillRect(X(Math.min(i, o)), 20, Math.max(2, X(Math.max(i, o)) - X(Math.min(i, o))), h - 20);
    c.fillStyle = '#ffd43b'; c.font = 'bold 11px ui-monospace, monospace';
    if (E.entree != null) { c.fillRect(X(E.entree) - 1, 20, 2, h - 20); c.fillText('[', X(E.entree) + 3, 108); }
    if (E.sortie != null) { c.fillRect(X(E.sortie) - 1, 20, 2, h - 20); c.fillText(']', X(E.sortie) - 9, 108); }
  }
  // séquences
  for (const s of E.match.sequences) {
    if (s.fin < a || s.debut > b) continue;
    const x0 = X(s.debut), x1 = Math.max(x0 + 3, X(s.fin)), col = couleurSeq(s), sel = s.id === E.selSeq;
    c.fillStyle = col + (sel ? '88' : '40'); c.beginPath(); c.roundRect(x0, 46, x1 - x0, 28, 6); c.fill();
    c.strokeStyle = sel ? '#ffffff' : col + 'cc'; c.lineWidth = sel ? 2 : 1; c.beginPath(); c.roundRect(x0 + 0.5, 46.5, x1 - x0 - 1, 27, 6); c.stroke();
    c.lineWidth = 1;
    if (x1 - x0 > 14) {
      c.save(); c.beginPath(); c.rect(x0 + 2, 46, x1 - x0 - 4, 28); c.clip();
      c.fillStyle = '#fff'; c.font = '700 11px Inter, system-ui, sans-serif';
      const nums = (s.joueuses || []).map((id) => joueuse(id)?.num || '?').join(' ');
      c.fillText(nums || '—', x0 + 4, 58);
      c.font = '10px Inter, system-ui, sans-serif'; c.fillStyle = '#eceef3cc'; c.fillText(s.nom || '', x0 + 4, 70);
      c.restore();
    }
  }
  // repères
  for (const r of E.match.reperes) {
    if (r.t < a || r.t > b) continue;
    const x = X(r.t);
    c.fillStyle = r.couleur || '#ffd43b';
    c.beginPath(); c.moveTo(x, 40); c.lineTo(x - 6, 30); c.arc(x, 28, 6, Math.PI * 0.85, Math.PI * 0.15); c.closePath(); c.fill();
    if (r.nom && survol !== r) { c.fillStyle = '#eceef3'; c.font = '10px Inter, system-ui, sans-serif'; c.fillText(r.nom, x + 8, 34); }
  }
  // dessins
  for (const d of E.match.dessins) {
    if (d.t < a || d.t > b) continue;
    const x = X(d.t);
    c.fillStyle = d.mode === 'vivant' ? '#c084fc' : '#fb923c';
    c.beginPath(); c.arc(x, 86, 4, 0, Math.PI * 2); c.fill();
    if (d.mode === 'vivant') { c.fillRect(x, 85, Math.max(2, X(d.t + (d.duree || 4)) - x), 2); }
  }
  // survol
  if (survol?.nom != null && survol.t != null) {
    c.fillStyle = '#232834f0'; c.font = '11px Inter, system-ui, sans-serif';
    const txt = `${fmt(survol.t)}${survol.nom ? ' · ' + survol.nom : ''}`, x = Math.min(w - 160, X(survol.t) + 8);
    c.beginPath(); c.roundRect(x - 3, 21, c.measureText(txt).width + 10, 18, 5); c.fill(); c.fillStyle = '#fff'; c.fillText(txt, x + 1, 34);
  }
  // tête de lecture
  const xp = X(video.currentTime);
  c.fillStyle = '#f43f5e'; c.fillRect(xp - 1, 0, 2, h);
  c.beginPath(); c.moveTo(xp - 6, 0); c.lineTo(xp + 6, 0); c.lineTo(xp, 8); c.fill();
}

function suivre(tt) {
  if (vue.b <= vue.a || action) return;
  const [a, b] = fen(), w = b - a;
  if (tt > b - w * 0.03 || tt < a) { vue.a = Math.max(0, Math.min(duree() - w, tt - w * 0.1)); vue.b = vue.a + w; }
}

export function zoomFrise(f, autour = video.currentTime) {
  const d = duree(); if (!d) return;
  const [a, b] = fen();
  const w = Math.max(8, Math.min(d, (b - a) * f));
  if (w >= d - 0.01) { vue.a = vue.b = 0; redessiner(); return; }
  const p = b > a ? (autour - a) / (b - a) : 0.5;
  vue.a = Math.max(0, Math.min(d - w, autour - p * w)); vue.b = vue.a + w;
  redessiner();
}
export function montrer(a, b) {
  const d = duree(); if (!d) return;
  const m = Math.max(4, (b - a) * 0.6);
  vue.a = Math.max(0, a - m); vue.b = Math.min(d, b + m);
  redessiner();
}

// ---------------- souris
function cible(x, y) {
  if (!E.match) return null;
  const tt = T(x);
  if (dans(y, RANG.seq)) {
    const s = [...E.match.sequences].reverse().find((s) => X(s.debut) - BORD <= x && x <= X(s.fin) + BORD);
    if (s) {
      if (Math.abs(x - X(s.debut)) <= BORD) return { type: 'debut', s };
      if (Math.abs(x - X(s.fin)) <= BORD) return { type: 'fin', s };
      return { type: 'seq', s };
    }
  }
  if (dans(y, [RANG.rep[0] - 4, RANG.rep[1]])) {
    const r = E.match.reperes.find((r) => Math.abs(X(r.t) - x) <= 7);
    if (r) return { type: 'rep', r };
  }
  if (dans(y, [RANG.des[0] - 4, RANG.des[1] + 2])) {
    const d = E.match.dessins.find((d) => Math.abs(X(d.t) - x) <= 6);
    if (d) return { type: 'des', d };
  }
  if (E.entree != null && Math.abs(X(E.entree) - x) <= BORD && y > 20) return { type: 'entree' };
  if (E.sortie != null && Math.abs(X(E.sortie) - x) <= BORD && y > 20) return { type: 'sortie' };
  return { type: 'vide', t: tt };
}

cv.addEventListener('pointerdown', (e) => {
  if (!pret() || e.button !== 0) return;
  const x = e.offsetX, y = e.offsetY, c = cible(x, y);
  action = { ...c, x0: x, t0: T(x), bouge: false };
  if (c.type === 'seq') action.orig = [c.s.debut, c.s.fin];
  if (c.type === 'vide') aller(T(x));
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', (e) => {
  const x = e.offsetX, y = e.offsetY;
  if (!action) {
    const c = cible(x, y);
    cv.style.cursor = c && ['debut', 'fin', 'entree', 'sortie'].includes(c.type) ? 'ew-resize' : c && c.type !== 'vide' ? 'pointer' : 'default';
    const s = c?.type === 'rep' ? c.r : null;
    if (s !== survol) { survol = s; redessiner(); }
    return;
  }
  if (Math.abs(x - action.x0) > 3) action.bouge = true;
  if (!action.bouge) return;
  const tt = T(x), s = action.s;
  switch (action.type) {
    case 'vide': aller(tt); break;
    case 'debut': s.debut = Math.min(tt, s.fin - 0.5); aller(s.debut); break;
    case 'fin': s.fin = Math.max(tt, s.debut + 0.5); aller(s.fin); break;
    case 'seq': { const dt = tt - action.t0; s.debut = Math.max(0, action.orig[0] + dt); s.fin = s.debut + (action.orig[1] - action.orig[0]); aller(s.debut); break; }
    case 'rep': action.r.t = tt; aller(tt); break;
    case 'entree': E.entree = tt; aller(tt); break;
    case 'sortie': E.sortie = tt; aller(tt); break;
  }
  redessiner();
});
cv.addEventListener('pointerup', () => {
  const a = action; action = null;
  if (!a) return;
  if (a.bouge) {
    if (['debut', 'fin', 'seq', 'rep'].includes(a.type)) { sauver(); emit('listes'); }
    return;
  }
  if (a.type === 'seq' || a.type === 'debut' || a.type === 'fin') emit('choisirSeq', a.s.id, true);
  else if (a.type === 'rep') aller(a.r.t);
  else if (a.type === 'des') aller(a.d.t);
  else if (a.type === 'vide' && E.selSeq) emit('choisirSeq', null);
});
cv.addEventListener('dblclick', (e) => {
  const c = cible(e.offsetX, e.offsetY);
  if (c?.type === 'rep') emit('renommerRepere', c.r);
  if (c?.type === 'seq') emit('lireSeq', c.s.id);
});
cv.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const c = cible(e.offsetX, e.offsetY);
  if (c?.type === 'rep') emit('supprimerRepere', c.r);
});
cv.addEventListener('pointerleave', () => { if (survol) { survol = null; redessiner(); } });
cv.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    const [a, b] = fen(), w = b - a; if (vue.b <= vue.a) return;
    const dt = ((e.deltaX || e.deltaY) / largeur()) * w;
    vue.a = Math.max(0, Math.min(duree() - w, a + dt)); vue.b = vue.a + w; redessiner(); return;
  }
  zoomFrise(e.deltaY > 0 ? 1.35 : 1 / 1.35, T(e.offsetX));
}, { passive: false });
$('#tlPlus').onclick = () => zoomFrise(1 / 2);
$('#tlMoins').onclick = () => zoomFrise(2);
$('#tlTout').onclick = () => { vue.a = vue.b = 0; redessiner(); };

on('temps', (tt) => { suivre(tt); redessiner(); });
on('change', redessiner);
on('duree', () => { vue.a = vue.b = 0; redessiner(); });
new ResizeObserver(redessiner).observe(cv);
