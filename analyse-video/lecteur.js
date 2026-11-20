// Lecteur : lecture avant/arrière (J/K/L), vitesses, sauts, image par image, zoom dans l'image,
// arrêts sur image des dessins, lecture d'une séquence ou d'une liste de séquences.
import { ic } from './icones.js';
import { E, $, $$, emit, fmt } from './etat.js';

export const video = $('#video');
const cadre = $('#cadre'), scene = $('#scene');
const FPS = 25;
export const Z = { s: 1, x: 0, y: 0 };          // zoom en pixels vidéo (coin haut-gauche visible)
let k = 1, ox = 0, oy = 0;                       // échelle écran et décalage de l'image dans le cadre
let vitesse = 1;                                 // vitesse choisie (> 0)
let arriere = 0, minArriere = 0;                 // lecture arrière : vitesse (négative) et minuterie
let gel = null;                                  // arrêt sur image en cours { d, minuterie }
let segment = null;                              // { fin, suite } : lecture d'une séquence
let tPrec = 0, raf = 0;

export const W = () => video.videoWidth || 1920;
export const H = () => video.videoHeight || 1080;
export const pret = () => !!video.currentSrc && video.readyState > 0;
export const t = () => video.currentTime || 0;
export const enGel = () => gel;

// ---------------- mise en page et zoom
export function miseEnPage() {
  const cw = cadre.clientWidth, ch = cadre.clientHeight;
  k = Math.min(cw / W(), ch / H());
  ox = (cw - W() * k) / 2; oy = (ch - H() * k) / 2;
  scene.style.width = W() * k + 'px';
  scene.style.height = H() * k + 'px';
  appliquerZoom(false);
}
function borner() {
  Z.s = Math.max(1, Math.min(6, Z.s));
  Z.x = Math.max(0, Math.min(W() - W() / Z.s, Z.x));
  Z.y = Math.max(0, Math.min(H() - H() / Z.s, Z.y));
}
export function appliquerZoom(anime = false) {
  borner();
  scene.style.transition = anime ? 'transform .45s ease' : 'none';
  scene.style.transform = `translate(${ox}px, ${oy}px) scale(${Z.s}) translate(${-Z.x * k}px, ${-Z.y * k}px)`;
  cadre.classList.toggle('zoom', Z.s > 1.01);
  $('#zNiveau').textContent = Z.s.toFixed(Z.s < 2 ? 1 : 0).replace('.0', '') + '×';
}
export function fixerZoom(z, anime = true) {
  Object.assign(Z, z ? { s: z.s, x: z.x, y: z.y } : { s: 1, x: 0, y: 0 });
  appliquerZoom(anime);
}
/** Coordonnées vidéo du point écran (tient compte du zoom). */
export function versVideo(cx, cy) {
  const r = scene.getBoundingClientRect();
  return [(cx - r.left) / r.width * W(), (cy - r.top) / r.height * H()];
}
export function zoomer(f, cx, cy) {
  const r = cadre.getBoundingClientRect();
  if (cx == null) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
  const [vx, vy] = versVideo(cx, cy);
  const s2 = Math.max(1, Math.min(6, Z.s * f));
  Z.x = vx - (vx - Z.x) * Z.s / s2;
  Z.y = vy - (vy - Z.y) * Z.s / s2;
  Z.s = s2;
  appliquerZoom(false);
  emit('zoom');
}
cadre.addEventListener('wheel', (e) => { if (!pret()) return; e.preventDefault(); zoomer(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY); }, { passive: false });
// déplacement : clic molette, clic droit, ou clic gauche quand on ne dessine pas et que l'image est zoomée
let glisse = null, aGlisse = false;
cadre.addEventListener('pointerdown', (e) => {
  const dessin = document.body.classList.contains('dessin');
  if (e.button === 1 || e.button === 2 || (e.button === 0 && !dessin && Z.s > 1.01 && e.target !== $('#calque'))) {
    glisse = { x: e.clientX, y: e.clientY, zx: Z.x, zy: Z.y, bouge: false };
    cadre.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
});
cadre.addEventListener('pointermove', (e) => {
  if (!glisse) return;
  const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) glisse.bouge = true;
  Z.x = glisse.zx - dx / (k * Z.s); Z.y = glisse.zy - dy / (k * Z.s);
  appliquerZoom(false);
});
cadre.addEventListener('pointerup', () => { aGlisse = !!glisse?.bouge; if (aGlisse) emit('zoom'); glisse = null; });
// téléphone : pincer à deux doigts pour zoomer, glisser à deux doigts pour se déplacer
const doigts = new Map();
let pince = null;
cadre.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  doigts.set(e.pointerId, [e.clientX, e.clientY]);
  if (doigts.size === 2 && pret()) {
    const [a, b] = [...doigts.values()];
    pince = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, s: Z.s };
    glisse = null;
  }
}, true);
cadre.addEventListener('pointermove', (e) => {
  if (!doigts.has(e.pointerId)) return;
  doigts.set(e.pointerId, [e.clientX, e.clientY]);
  if (!pince || doigts.size < 2) return;
  e.stopPropagation(); e.preventDefault();
  const [a, b] = [...doigts.values()];
  const d = Math.hypot(a[0] - b[0], a[1] - b[1]), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
  // déplacement du centre, puis zoom autour de lui
  Z.x -= (cx - pince.cx) / (k * Z.s); Z.y -= (cy - pince.cy) / (k * Z.s);
  pince.cx = cx; pince.cy = cy;
  zoomer((pince.s * d / pince.d) / Z.s, cx, cy);
}, true);
const lacher = (e) => { doigts.delete(e.pointerId); if (doigts.size < 2 && pince) { pince = null; aGlisse = true; emit('zoom'); } };
cadre.addEventListener('pointerup', lacher, true);
cadre.addEventListener('pointercancel', lacher, true);
export const pinceEnCours = () => !!pince;
cadre.addEventListener('contextmenu', (e) => e.preventDefault());
cadre.addEventListener('dblclick', (e) => {
  if (document.body.classList.contains('dessin') || !pret()) return;
  if (Z.s > 1.01) fixerZoom(null); else zoomer(2.5, e.clientX, e.clientY);
});
video.addEventListener('click', () => {
  if (document.body.classList.contains('presente')) { if (!aGlisse) emit('tapPres'); aGlisse = false; return; }
  if (!document.body.classList.contains('dessin') && !aGlisse) basculer(); aGlisse = false;
});
$('#zPlus').onclick = () => zoomer(1.4);
$('#zMoins').onclick = () => zoomer(1 / 1.4);
$('#zNiveau').onclick = () => fixerZoom(null);
new ResizeObserver(miseEnPage).observe(cadre);
video.addEventListener('loadedmetadata', () => { miseEnPage(); emit('duree'); tic(); });

// ---------------- lecture
export function charger(url) {
  stopArriere(); finGel(false); segment = null;
  video.src = url;
  video.playbackRate = vitesse;
  $('#vide').hidden = !!url;
}
export function lire() {
  if (!pret()) return;
  stopArriere();
  if (gel) { finGel(true); return; }
  video.playbackRate = vitesse;
  tPrec = video.currentTime;
  video.play();
}
export function pause() { stopArriere(); finGel(false); segment = null; video.pause(); }
export function basculer() { (video.paused && !arriere) || gel ? lire() : pause(); }
export function aller(tt, { garderSegment = false } = {}) {
  if (!pret()) return;
  finGel(false);
  if (!garderSegment) segment = null;
  video.currentTime = Math.max(0, Math.min((video.duration || tt) - 0.02, tt));
  tPrec = video.currentTime;
  tic();
}
export const saut = (dt) => aller(t() + dt, { garderSegment: !video.paused });
export function image(dir) { pause(); aller(t() + dir / FPS); }

export function choisirVitesse(v) {
  vitesse = v;
  if (!arriere) video.playbackRate = v;
  $$('#vitesses button').forEach((b) => b.classList.toggle('actif', +b.dataset.v === v));
  afficherVitesse();
}
function afficherVitesse() {
  $('#tVitesse').textContent = arriere ? `◀ ${-arriere}×` : (!video.paused && vitesse !== 1 ? `${vitesse}×` : '');
}
// J / K / L comme dans un logiciel de montage
export function L() {
  if (arriere || video.paused) { stopArriere(); choisirVitesse(1); lire(); }
  else choisirVitesse(Math.min(4, vitesse * 2));
  afficherVitesse();
}
export function K() { pause(); afficherVitesse(); }
export function J() {
  if (!pret()) return;
  if (!arriere) { video.pause(); finGel(false); arriere = -1; }
  else arriere = Math.max(-4, arriere * 2);
  clearInterval(minArriere);
  minArriere = setInterval(() => {
    const n = video.currentTime + arriere * 0.08;
    if (n <= 0) { video.currentTime = 0; stopArriere(); return; }
    video.currentTime = n;
    tic();
  }, 80);
  afficherVitesse();
}
function stopArriere() { if (arriere) { arriere = 0; clearInterval(minArriere); afficherVitesse(); } }

/** Pause qui garde la séquence en cours (présentation) ; reprendre() repart du même point. */
let gelSuspendu = null;
export function pauseDouce() {
  if (gel) { clearTimeout(gel.minuterie); gelSuspendu = gel; return; }
  video.pause();
}
export function reprendre() {
  if (gelSuspendu && gel === gelSuspendu) { gelSuspendu = null; finGel(true); return; }
  gelSuspendu = null;
  if (!pret()) return;
  video.playbackRate = vitesse; tPrec = video.currentTime; video.play();
}
export const enPauseDouce = () => !!gelSuspendu || (video.paused && !gel);

/** Lit [a, b] puis appelle suite() (ou s'arrête). */
export function lireSegment(a, b, suite = null) {
  if (!pret()) return;
  aller(a);
  segment = { fin: b, suite };
  lire();
}

// ---------------- arrêts sur image
function finGel(reprendre) {
  if (!gel) return;
  clearTimeout(gel.minuterie);
  const d = gel.d;
  gel = null;
  if (d.zoom) fixerZoom(null);
  emit('gel', null);
  if (reprendre) { video.playbackRate = vitesse; tPrec = video.currentTime + 0.001; video.play(); }
}
function geler(d) {
  video.pause();
  video.currentTime = d.t;
  gel = { d, minuterie: setTimeout(() => finGel(true), (d.pause || 4) * 1000) };
  if (d.zoom) fixerZoom(d.zoom);
  emit('gel', d);
}

// ---------------- boucle d'affichage
function tic() {
  const tt = video.currentTime;
  $('#tTemps').textContent = fmt(tt);
  emit('temps', tt);
}
function boucle() {
  raf = 0;
  if (video.paused) return;
  const tt = video.currentTime;
  if (segment && tt >= segment.fin) {
    const s = segment; segment = null;
    video.pause(); tic();
    s.suite?.();
    return;
  }
  if (tt >= tPrec && tt - tPrec < 1) {
    const d = (E.match?.dessins || []).find((x) => (x.mode || 'pause') === 'pause' && x.t > tPrec && x.t <= tt);
    if (d) { tPrec = d.t + 0.001; geler(d); tic(); return; }
  }
  tPrec = tt;
  tic();
  raf = requestAnimationFrame(boucle);
}
video.addEventListener('play', () => { $('#tLecture').innerHTML = ic('pause', 20); afficherVitesse(); if (!raf) raf = requestAnimationFrame(boucle); });
video.addEventListener('pause', () => { if (!gel) $('#tLecture').innerHTML = ic('lecture', 20); afficherVitesse(); tic(); });
video.addEventListener('seeked', () => { if (video.paused) tic(); });

// ---------------- boutons
$('#tLecture').onclick = basculer;
$$('[data-saut]').forEach((b) => { b.onclick = () => saut(+b.dataset.saut); });
$$('[data-image]').forEach((b) => { b.onclick = () => image(+b.dataset.image); });
$$('#vitesses button').forEach((b) => { b.onclick = () => choisirVitesse(+b.dataset.v); });
