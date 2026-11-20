// Dessin sur l'image (souris ou tablette Wacom) : flèches, courses, cercles au sol, projecteur, pastilles,
// fantôme, ligne de formation, zone, texte, main levée, chrono. Option « Sol » : 4 coins de la surface
// de réparation suffisent pour coucher les dessins en perspective sur la pelouse.
import { E, $, $$, on, emit, uid, sauver, api, toast, dialogue, fmt, esc } from './etat.js';
import { video, W, H, t, pause, pret, Z, versVideo, enGel, fixerZoom } from './lecteur.js';

const cv = $('#calque');
const COULEURS = ['#ffd43b', '#ff4d4f', '#ffffff', '#4dabf7', '#51cf66', '#111111'];
const MULTI = new Set(['formation', 'zone']);
const ANNEAU = new Set(['cercle', 'projecteur', 'pastille', 'fantome']);
// formes « au sol » : elles passent sous les joueuses quand l'option est cochée
const AU_SOL = new Set(['fleche', 'course', 'ligne', 'cercle', 'zone', 'formation', 'vision', 'horsjeu']);
const masques = {};          // id du dessin → Image du contour des joueuses
const REFS = {
  surface: { nom: 'Surface de réparation (40,3 × 16,5 m)', l: 40.32, p: 16.5 },
  petite: { nom: 'Petite surface (18,3 × 5,5 m)', l: 18.32, p: 5.5 },
  carre: { nom: 'Carré tracé de 10 × 10 m (plots)', l: 10, p: 10 },
};

let outil = 'fleche', couleur = COULEURS[0], epais = 1;
let edit = null;            // dessin en cours de modification
let enCours = null;         // forme en train d'être tracée
let sel = null, glisse = null, histo = [];
let calage = null;          // { ref, pts: [] } pendant le calage du sol
let souris = null;
let prochainNum = 1;

export const actif = () => !!edit;
export const enEdition = () => edit;
const u = () => H() / 1080;
const tolerance = () => 12 * W() / cv.getBoundingClientRect().width;

// ================= géométrie : homographie sol (mètres) → image
function resoudre(A, b) {   // Gauss
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let m = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return x;
}
function homographie(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [X, Y] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
  }
  const h = resoudre(A, b);
  return [[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1]];
}
const appl = (M, [x, y]) => { const w = M[2][0] * x + M[2][1] * y + M[2][2]; return [(M[0][0] * x + M[0][1] * y + M[0][2]) / w, (M[1][0] * x + M[1][1] * y + M[1][2]) / w]; };
function solDe(d) {
  if (!d?.sol || d.sol.img.length !== 4) return null;
  if (!d.sol._M) {
    const r = REFS[d.sol.ref] || REFS.surface;
    const g = [[0, 0], [r.l, 0], [r.l, r.p], [0, r.p]];
    d.sol._M = homographie(g, d.sol.img);
    d.sol._I = homographie(d.sol.img, g);
  }
  return { versImg: (p) => appl(d.sol._M, p), versSol: (p) => appl(d.sol._I, p) };
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const milieuChemin = (pts) => {
  let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  let acc = 0;
  for (let i = 1; i < pts.length; i++) { const l = dist(pts[i - 1], pts[i]); if (acc + l >= L / 2) { const f = (L / 2 - acc) / (l || 1); return [pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1])]; } acc += l; }
  return pts.at(-1);
};
/** Une flèche tracée à main levée devient une flèche droite ou une belle courbe (passe par le milieu du geste). */
function controle(pts) {
  const a = pts[0], b = pts.at(-1), m = milieuChemin(pts);
  const L = dist(a, b) || 1;
  const ecart = Math.abs((b[0] - a[0]) * (a[1] - m[1]) - (a[0] - m[0]) * (b[1] - a[1])) / L;
  if (ecart < L * 0.07) return null;
  return [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2];
}
const quad = (a, c, b, s) => [(1 - s) ** 2 * a[0] + 2 * (1 - s) * s * c[0] + s * s * b[0], (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * c[1] + s * s * b[1]];

// ================= rendu
function trait(c, f, mult = 1) { c.lineWidth = 5 * u() * (f.ep || 1) * mult; c.lineCap = 'round'; c.lineJoin = 'round'; }
function ombre(c, on = true) { c.shadowColor = on ? '#000a' : 'transparent'; c.shadowBlur = on ? 6 * u() : 0; }

function pointe(c, de, a, taille) {
  const ang = Math.atan2(a[1] - de[1], a[0] - de[0]);
  c.beginPath(); c.moveTo(a[0], a[1]);
  c.lineTo(a[0] - taille * Math.cos(ang - 0.42), a[1] - taille * Math.sin(ang - 0.42));
  c.lineTo(a[0] - taille * Math.cos(ang + 0.42), a[1] - taille * Math.sin(ang + 0.42));
  c.closePath(); c.fill();
}

/** Flèche peinte au sol (perspective) : largeur et pointe en mètres. */
function flecheSol(c, f, sol) {
  const g = f.pts.map(sol.versSol);
  const ctrl = controle(f.pts) ? (() => { const m = sol.versSol(milieuChemin(f.pts)); const a = g[0], b = g.at(-1); return [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2]; })() : null;
  const a = g[0], b = g.at(-1);
  const N = 48, larg = 0.32 * (f.ep || 1), tete = 1.5 * Math.sqrt(f.ep || 1), L = dist(a, b);
  if (L < 0.5) return;
  const at = (s) => (ctrl ? quad(a, ctrl, b, s) : [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]);
  const sFin = Math.max(0, 1 - tete / L);
  const tirets = f.type === 'course';
  const morceau = (s0, s1) => {
    const g1 = [], g2 = [];
    for (let i = 0; i <= 12; i++) {
      const s = s0 + (s1 - s0) * i / 12, p = at(s), q = at(Math.min(1, s + 0.01)), r = at(Math.max(0, s - 0.01));
      const dx = q[0] - r[0], dy = q[1] - r[1], n = Math.hypot(dx, dy) || 1;
      g1.push([p[0] - dy / n * larg / 2, p[1] + dx / n * larg / 2]); g2.push([p[0] + dy / n * larg / 2, p[1] - dx / n * larg / 2]);
    }
    const poly = [...g1, ...g2.reverse()].map(sol.versImg);
    c.beginPath(); poly.forEach((p, i) => (i ? c.lineTo(...p) : c.moveTo(...p))); c.closePath(); c.fill();
  };
  if (tirets) { const pas = 1.6 / L, plein = 1.0 / L; for (let s = 0; s < sFin; s += pas) morceau(s, Math.min(sFin, s + plein)); }
  else morceau(0, sFin);
  // pointe
  const p = at(sFin), q = at(1), dx = q[0] - p[0], dy = q[1] - p[1], n = Math.hypot(dx, dy) || 1, lt = tete * 0.55;
  const tri = [[p[0] - dy / n * lt, p[1] + dx / n * lt], q, [p[0] + dy / n * lt, p[1] - dx / n * lt]].map(sol.versImg);
  c.beginPath(); tri.forEach((pp, i) => (i ? c.lineTo(...pp) : c.moveTo(...pp))); c.closePath(); c.fill();
  void N;
}

/** Contour d'un anneau au sol : vrai cercle en perspective si le sol est calé, sinon ellipse aplatie. */
function contourAnneau(f, sol, rayon) {
  const [cx, cy] = f.pts[0];
  if (sol) {
    const g = sol.versSol(f.pts[0]);
    const rm = f.pts[1] ? Math.max(0.4, dist(g, sol.versSol(f.pts[1]))) : (rayon?.m || 1);
    return Array.from({ length: 64 }, (_, i) => sol.versImg([g[0] + rm * Math.cos(i / 32 * Math.PI), g[1] + rm * Math.sin(i / 32 * Math.PI)]));
  }
  const rx = f.pts[1] ? Math.max(8 * u(), dist(f.pts[0], f.pts[1])) : (rayon?.px || 34) * u();
  return Array.from({ length: 64 }, (_, i) => [cx + rx * Math.cos(i / 32 * Math.PI), cy + rx * 0.36 * Math.sin(i / 32 * Math.PI)]);
}
const chemin = (c, pts, ferme = true) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); if (ferme) c.closePath(); };
const boite = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };

function etiquette(c, x, y, txt, fond, taille = 30) {
  c.font = `700 ${taille * u()}px system-ui, "Segoe UI", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = Math.max(taille * u() * 1.25, c.measureText(txt).width + taille * u() * 0.7), h = taille * u() * 1.35;
  ombre(c); c.fillStyle = fond; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, h / 2); c.fill(); ombre(c, false);
  c.fillStyle = clair(fond) ? '#111' : '#fff'; c.fillText(txt, x, y + 1 * u());
}
const clair = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; };

export function rendreForme(c, f, d, tt) {
  const sol = solDe(d);
  c.save();
  c.strokeStyle = c.fillStyle = f.couleur;
  switch (f.type) {
    case 'fleche': case 'course': {
      if (f.pts.length < 2) break;
      if (sol) { ombre(c); c.globalAlpha = 0.92; flecheSol(c, f, sol); break; }
      const a = f.pts[0], b = f.pts.at(-1), k = controle(f.pts);
      trait(c, f); ombre(c);
      if (f.type === 'course') c.setLineDash([16 * u(), 12 * u()]);
      const taille = 26 * u() * Math.sqrt(f.ep || 1);
      const fin = k ? quad(a, k, b, 0.93) : [b[0] - (b[0] - a[0]) * 0.02, b[1] - (b[1] - a[1]) * 0.02];
      c.beginPath(); c.moveTo(...a);
      if (k) c.quadraticCurveTo(k[0], k[1], b[0] - (b[0] - fin[0]) * 0.5, b[1] - (b[1] - fin[1]) * 0.5); else c.lineTo(...b);
      c.stroke(); c.setLineDash([]);
      pointe(c, k ? quad(a, k, b, 0.9) : a, b, taille);
      break;
    }
    case 'ligne': if (f.pts.length > 1) { trait(c, f); ombre(c); chemin(c, f.pts, false); c.stroke(); } break;
    case 'main': if (f.pts.length > 1) { trait(c, f, 0.8); ombre(c); chemin(c, f.pts, false); c.stroke(); } break;
    case 'cercle': {
      const p = contourAnneau(f, sol);
      c.globalAlpha = 0.22; chemin(c, p); c.fill(); c.globalAlpha = 1;
      trait(c, f, 0.9); ombre(c); chemin(c, p); c.stroke();
      break;
    }
    case 'projecteur': {
      const p = contourAnneau(f, sol, { m: 0.9, px: 38 });
      const [x0, y0, x1, y1] = boite(p), lw = x1 - x0, cx = (x0 + x1) / 2, haut = Math.max(lw * 2.6, 180 * u());
      const bas = p.filter((q) => q[1] >= (y0 + y1) / 2).sort((a, b) => a[0] - b[0]);
      const rayon = [...bas.reverse(), [cx - lw * 0.28, y1 - haut], [cx + lw * 0.28, y1 - haut]];
      // tout s'assombrit sauf le faisceau
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.rect(0, 0, W(), H());
      rayon.slice().reverse().forEach((q, i) => (i ? c.lineTo(...q) : c.moveTo(...q))); c.closePath(); c.fill('evenodd');
      const g = c.createLinearGradient(0, y1, 0, y1 - haut); g.addColorStop(0, f.couleur + '55'); g.addColorStop(1, f.couleur + '00');
      c.fillStyle = g; chemin(c, rayon); c.fill();
      c.strokeStyle = f.couleur; trait(c, f, 0.8); ombre(c); chemin(c, p); c.stroke();
      break;
    }
    case 'pastille': case 'fantome': {
      const p = contourAnneau(f, sol, { m: 0.8, px: 30 });
      const [x0, y0, x1] = boite(p), lw = x1 - x0, cx = (x0 + x1) / 2;
      if (f.type === 'fantome') {
        c.globalAlpha = 0.85; trait(c, f, 0.7); c.setLineDash([10 * u(), 8 * u()]); ombre(c); chemin(c, p); c.stroke();
        const hb = Math.max(lw * 2.4, 120 * u()), lb = lw * 0.55;
        c.globalAlpha = 0.25; c.beginPath(); c.roundRect(cx - lb / 2, y0 - hb, lb, hb, lb / 2); c.fill();
        c.globalAlpha = 0.9; c.stroke(); c.setLineDash([]);
        if (f.texte) etiquette(c, cx, y0 - hb - 22 * u(), f.texte, f.couleur, 26);
      } else {
        trait(c, f, 0.8); ombre(c); chemin(c, p); c.stroke();
        etiquette(c, cx, y0 - Math.max(lw * 1.9, 95 * u()), f.texte || '?', f.couleur, 30);
        c.lineWidth = 2 * u(); c.globalAlpha = 0.7; c.beginPath(); c.moveTo(cx, y0 - Math.max(lw * 1.9, 95 * u()) + 20 * u()); c.lineTo(cx, y0 - 4 * u()); c.stroke();
      }
      break;
    }
    case 'formation': {
      if (!f.pts.length) break;
      trait(c, f, 0.8); ombre(c); chemin(c, f.pts, false); c.stroke();
      for (const q of f.pts) { c.beginPath(); c.ellipse(q[0], q[1], 16 * u(), 6 * u(), 0, 0, Math.PI * 2); c.lineWidth = 3 * u(); c.stroke(); c.globalAlpha = 0.35; c.fill(); c.globalAlpha = 1; }
      break;
    }
    case 'zone': {
      if (f.pts.length < 2) break;
      c.globalAlpha = 0.25; chemin(c, f.pts); c.fill(); c.globalAlpha = 0.95;
      trait(c, f, 0.6); c.setLineDash([12 * u(), 8 * u()]); ombre(c); chemin(c, f.pts, f.fini !== false); c.stroke();
      break;
    }
    case 'texte': {
      const [x, y] = f.pts[0];
      c.font = `700 ${34 * u() * (f.ep || 1)}px system-ui, "Segoe UI", sans-serif`; c.textBaseline = 'middle'; c.textAlign = 'left';
      const lignes = String(f.texte || '').split('\n'), hl = 42 * u() * (f.ep || 1);
      const w = Math.max(...lignes.map((l) => c.measureText(l).width)) + 24 * u();
      ombre(c); c.fillStyle = '#000000b0'; c.beginPath(); c.roundRect(x, y, w, hl * lignes.length + 14 * u(), 8 * u()); c.fill(); ombre(c, false);
      c.fillStyle = f.couleur === '#111111' ? '#ffffff' : f.couleur;
      c.fillRect(x, y, 6 * u(), hl * lignes.length + 14 * u());
      lignes.forEach((l, i) => c.fillText(l, x + 14 * u(), y + 7 * u() + hl * (i + 0.5)));
      break;
    }
    case 'vision': {
      if (f.pts.length < 2) break;
      const ang = 0.42;
      let poly;
      if (sol) {
        const a = sol.versSol(f.pts[0]), b = sol.versSol(f.pts[1]);
        const L = Math.max(1, dist(a, b)), th = Math.atan2(b[1] - a[1], b[0] - a[0]);
        poly = [a, ...Array.from({ length: 25 }, (_, i) => { const t2 = th - ang + (2 * ang * i) / 24; return [a[0] + L * Math.cos(t2), a[1] + L * Math.sin(t2)]; })].map(sol.versImg);
      } else {
        const a = f.pts[0], b = f.pts[1], L = dist(a, b), th = Math.atan2(b[1] - a[1], b[0] - a[0]);
        poly = [a, ...Array.from({ length: 25 }, (_, i) => { const t2 = th - ang + (2 * ang * i) / 24; return [a[0] + L * Math.cos(t2), a[1] + L * Math.sin(t2)]; })];
      }
      const g = c.createRadialGradient(poly[0][0], poly[0][1], 0, poly[0][0], poly[0][1], Math.max(...poly.map((q) => dist(q, poly[0]))));
      g.addColorStop(0, f.couleur + 'aa'); g.addColorStop(1, f.couleur + '10');
      c.fillStyle = g; chemin(c, poly); c.fill();
      c.strokeStyle = f.couleur; c.globalAlpha = 0.8; trait(c, f, 0.45); chemin(c, [poly[1], poly[0], poly.at(-1)], false); c.stroke();
      break;
    }
    case 'horsjeu': {
      if (!sol) break;
      const r = REFS[d.sol.ref] || REFS.surface, y = sol.versSol(f.pts[0])[1];
      const a = sol.versImg([-30, y]), b = sol.versImg([r.l + 30, y]);
      ombre(c); trait(c, f, 0.7); c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
      const [x, yy] = f.pts[0];
      etiquette(c, x, yy - 34 * u(), 'Hors-jeu', f.couleur, 22);
      break;
    }
    case 'suivi': {
      const P = f.piste || [];
      if (P.length < 2) break;
      let q = null;
      const x = tt ?? d.t;
      if (x <= P[0][0] + 0.02) q = P[0].slice(1);
      else if (x <= P.at(-1)[0]) {
        for (let i = 1; i < P.length; i++) if (P[i][0] >= x) { const a = P[i - 1], b = P[i], k = (x - a[0]) / ((b[0] - a[0]) || 1); q = [1, 2, 3].map((j) => a[j] + k * (b[j] - a[j])); break; }
      }
      if (!q) break;
      ombre(c);
      if (f.trace !== false) {
        trait(c, f, 0.5); c.globalAlpha = 0.85;
        chemin(c, [...P.filter((p) => p[0] <= x).map((p) => [p[1], p[2]]), [q[0], q[1]]], false); c.stroke(); c.globalAlpha = 1;
      }
      const rx = Math.max(10, q[2] * 0.32);
      trait(c, f, 1); c.beginPath(); c.ellipse(q[0], q[1], rx, Math.max(4, rx * 0.36), 0, 0, Math.PI * 2); c.stroke();
      break;
    }
    case 'chrono': {
      const [x, y] = f.pts[0], dt = Math.max(0, (tt ?? d.t) - d.t);
      etiquette(c, x, y, `⏱ ${dt.toFixed(1)} s`, f.couleur, 30);
      break;
    }
  }
  c.restore();
}

function masqueDe(d) {
  if (!d.sousJoueuses) return null;
  let m = masques[d.id];
  if (!m || m._v !== d.sousJoueuses) {
    m = masques[d.id] = new Image();
    m._v = d.sousJoueuses;
    m.onload = () => { m._ok = true; rafraichir(); };
    m.src = `/masque?match=${E.match.id}&id=${d.id}&v=${d.sousJoueuses}`;
  }
  return m._ok ? m : null;
}
export function rendreDessin(c, d, tt) {
  const m = masqueDe(d);
  if (!m) { for (const f of d.formes) rendreForme(c, f, d, tt); return; }
  // couche « sol » découpée par le contour des joueuses, puis le reste par-dessus
  const o = document.createElement('canvas'); o.width = c.canvas.width; o.height = c.canvas.height;
  const oc = o.getContext('2d');
  for (const f of d.formes) if (AU_SOL.has(f.type)) rendreForme(oc, f, d, tt);
  oc.globalCompositeOperation = 'destination-out';
  oc.drawImage(m, 0, 0, o.width, o.height);
  c.drawImage(o, 0, 0);
  for (const f of d.formes) if (!AU_SOL.has(f.type)) rendreForme(c, f, d, tt);
}

function grilleSol(c, d) {
  const sol = solDe(d); if (!sol) return;
  const r = REFS[d.sol.ref] || REFS.surface;
  c.save(); c.strokeStyle = '#ffffff88'; c.lineWidth = 1.5 * u(); c.setLineDash([6 * u(), 6 * u()]);
  for (let x = -10; x <= r.l + 10; x += 5) { c.beginPath(); for (let y = -10; y <= r.p + 15; y += 1) { const p = sol.versImg([x, y]); y === -10 ? c.moveTo(...p) : c.lineTo(...p); } c.stroke(); }
  for (let y = -10; y <= r.p + 15; y += 5) { c.beginPath(); for (let x = -10; x <= r.l + 10; x += 1) { const p = sol.versImg([x, y]); x === -10 ? c.moveTo(...p) : c.lineTo(...p); } c.stroke(); }
  c.setLineDash([]); c.strokeStyle = '#ffd43b'; c.lineWidth = 3 * u(); chemin(c, d.sol.img); c.stroke();
  c.restore();
}

// ================= affichage à l'écran
let montres = [], montreGrille = false;
export function rafraichir() {
  if (pret() && (cv.width !== W() || cv.height !== H())) { cv.width = W(); cv.height = H(); }
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  const tt = t();
  if (edit) {
    if (montreGrille || calage) grilleSol(c, edit);
    rendreDessin(c, edit, tt);
    if (enCours) rendreForme(c, MULTI.has(enCours.type) && souris ? { ...enCours, pts: [...enCours.pts, souris], fini: false } : enCours, edit, tt);
    if (sel) { const [x0, y0, x1, y1] = boite(sel.pts); c.save(); c.strokeStyle = '#4dabf7'; c.lineWidth = 2 * u(); c.setLineDash([8 * u(), 6 * u()]); c.strokeRect(x0 - 20 * u(), y0 - 20 * u(), x1 - x0 + 40 * u(), y1 - y0 + 40 * u()); c.restore(); }
    if (calage) {
      c.save(); c.fillStyle = '#ffd43b'; c.font = `700 ${26 * u()}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle';
      calage.pts.forEach((p, i) => { c.beginPath(); c.arc(p[0], p[1], 9 * u(), 0, 7); c.fill(); c.fillText(String(i + 1), p[0], p[1] - 26 * u()); });
      if (calage.pts.length && souris) { c.strokeStyle = '#ffd43b'; c.lineWidth = 2 * u(); chemin(c, [...calage.pts, souris], false); c.stroke(); }
      c.restore();
    }
    return;
  }
  const g = enGel();
  montres = g ? [g.d] : (E.match?.dessins || []).filter((d) =>
    (video.paused && Math.abs(d.t - tt) < 0.06) || (d.mode === 'vivant' && tt >= d.t && tt <= d.t + (d.duree || 4)));
  for (const d of montres) rendreDessin(c, d, tt);
}
on('temps', rafraichir);
on('gel', rafraichir);
on('duree', rafraichir);

// ================= édition
const TACTILE = matchMedia('(hover: none)').matches;
function bandeau() {
  const b = $('#bandeauDessin');
  if (!edit) { b.hidden = true; return; }
  b.hidden = false;
  const r = REFS[edit.sol?.ref];
  b.innerHTML = `<b>✎ Dessin à ${fmt(edit.t)}</b>
    <select id="dMode" title="Pendant la lecture et dans la vidéo envoyée">
      <option value="pause" ${edit.mode !== 'vivant' ? 'selected' : ''}>Fige l'image</option>
      <option value="vivant" ${edit.mode === 'vivant' ? 'selected' : ''}>Reste pendant la lecture</option></select>
    <input id="dDuree" type="number" min="0.5" max="30" step="0.5" value="${edit.mode === 'vivant' ? edit.duree || 4 : edit.pause || 4}"> s
    <span class="petit discret">${Z.s > 1.01 ? `zoom ${Z.s.toFixed(1)}× mémorisé` : TACTILE ? 'boutons − + : zoomer' : 'molette : zoomer'}</span>
    ${r ? `<span class="petit" title="${esc(r.nom)}">▱ sol calé</span>` : ''}
    ${edit.mode !== 'vivant' ? `<label class="petit" title="Les flèches, cercles et zones passent sous les joueuses (détection automatique sur l'image)"><input type="checkbox" id="dSous" ${edit.sousJoueuses ? 'checked' : ''}> sous les joueuses</label>` : ''}
    <button id="dFini" class="principal">${TACTILE ? 'Terminer' : 'Terminer (Échap)'}</button>`;
  $('#dMode').onchange = (e) => { edit.mode = e.target.value; if (edit.mode === 'vivant') edit.sousJoueuses = 0; bandeau(); changer(false); };
  $('#dDuree').onchange = (e) => { const v = Math.max(0.5, +e.target.value || 4); if (edit.mode === 'vivant') edit.duree = v; else edit.pause = v; changer(false); };
  $('#dFini').onclick = terminer;
  $('#dSous')?.addEventListener('change', (e) => sousJoueuses(e.target.checked));
}

async function lancerSuivi(p) {
  const t0 = edit.t, sq = E.match.sequences.find((s) => t0 >= s.debut && t0 < s.fin);
  const duree = Math.min(20, Math.max(2, sq ? sq.fin - t0 : 6));
  terminer();
  const el = toast('Suivi de la joueuse…', { duree: 0 });
  try {
    const t = await api('POST', '/api/suivi', { match: E.match.id, t: t0, x: p[0], y: p[1], duree });
    let r;
    for (;;) {
      await new Promise((ok) => setTimeout(ok, 700));
      r = await api('GET', `/api/tache?id=${t.id}`);
      el.innerHTML = `<span>🎯 ${esc(r.message)}</span><span class="barre-progres"><i style="width:${Math.round(r.progres * 100)}%"></i></span>`;
      if (r.etat !== 'en cours') break;
    }
    if (r.etat !== 'terminé') throw new Error(r.erreur || r.etat);
    const P = r.resultats.piste;
    const d = { id: uid(), t: P[0][0], mode: 'vivant', duree: +(P.at(-1)[0] - P[0][0]).toFixed(2), zoom: null, sol: null,
      formes: [{ type: 'suivi', piste: P, pts: [[P[0][1], P[0][2]]], couleur, ep: epais, trace: true }] };
    E.match.dessins.push(d); E.match.dessins.sort((a, b) => a.t - b.t);
    sauver(); rafraichir();
    toast(r.resultats.perdu ? `Suivi jusqu’à ${fmt(r.resultats.perdu)} (joueuse perdue ensuite)` : 'Suivi prêt : lancez la lecture pour le voir', { duree: 4000 });
  } catch (e) { toast('Suivi : ' + e.message, { erreur: true, duree: 8000 }); }
  finally { el.remove(); }
}

async function sousJoueuses(oui) {
  const d = edit; if (!d) return;
  if (!oui) { d.sousJoueuses = 0; changer(false); return; }
  if (d._nouveau) { toast('Tracez d’abord une forme', { erreur: true }); bandeau(); return; }
  const el = toast('Repérage des joueuses sur l’image…', { duree: 0 });
  try {
    await api('POST', `/api/masque?match=${E.match.id}&dessin=${d.id}&t=${d.t}`);
    d.sousJoueuses = Date.now();
    changer(false);
  } catch (e) { toast(e.message, { erreur: true, duree: 8000 }); if (edit === d) bandeau(); }
  finally { el.remove(); }
}

/** Ouvre le dessin de l'instant courant (ou en crée un). */
export function commencer() {
  if (!pret() || !E.match) { toast('Choisissez d’abord une vidéo', { erreur: true }); return false; }
  if (edit) return true;
  pause();
  const tt = t();
  edit = E.match.dessins.find((d) => Math.abs(d.t - tt) < 0.06) || null;
  if (!edit) edit = { id: uid(), t: +tt.toFixed(3), mode: 'pause', pause: 4, duree: 4, zoom: null, sol: null, formes: [], _nouveau: true };
  else if (edit.zoom) fixerZoom(edit.zoom, true);
  histo = []; sel = null; enCours = null;
  document.body.classList.add('dessin');
  bandeau(); rafraichir();
  return true;
}
export function terminer() {
  if (!edit) return;
  if (enCours && MULTI.has(enCours.type)) finirMulti();
  calage = null; montreGrille = false;
  const d = edit;
  edit = null; sel = null; enCours = null;
  document.body.classList.remove('dessin');
  $$('#listeOutils button').forEach((b) => b.classList.remove('actif'));
  if (!d.formes.length) {
    const i = E.match.dessins.indexOf(d);
    if (i >= 0) { E.match.dessins.splice(i, 1); sauver(); }
  }
  bandeau(); rafraichir();
}
function changer(historique = true) {
  if (!edit) return;
  if (historique) histo.push(JSON.stringify(edit.formes));
  edit.zoom = Z.s > 1.01 ? { s: +Z.s.toFixed(3), x: Math.round(Z.x), y: Math.round(Z.y) } : null;
  if (edit._nouveau && edit.formes.length) { delete edit._nouveau; E.match.dessins.push(edit); E.match.dessins.sort((a, b) => a.t - b.t); }
  if (!edit._nouveau) { sauver(); envoyerCalque(edit); }
  rafraichir();
}
const avantChange = () => histo.push(JSON.stringify(edit.formes));
let attenteCalque = {};
function envoyerCalque(d) {
  if (d.formes.some((f) => f.type === 'suivi')) return;
  clearTimeout(attenteCalque[d.id]);
  attenteCalque[d.id] = setTimeout(function essai() {
    if (d.sousJoueuses && !masqueDe(d)) { attenteCalque[d.id] = setTimeout(essai, 300); return; }
    const o = document.createElement('canvas'); o.width = W(); o.height = H();
    rendreDessin(o.getContext('2d'), d, d.t);
    o.toBlob((b) => api('POST', `/api/calque?match=${E.match.id}&dessin=${d.id}`, b, true).catch((e) => toast(e.message, { erreur: true })), 'image/png');
  }, 400);
}
export function annuler() {
  if (!edit || !histo.length) return;
  edit.formes = JSON.parse(histo.pop()); sel = null;
  if (!edit._nouveau) { sauver(); envoyerCalque(edit); }
  rafraichir();
}
export function effacer() {
  if (!edit) return;
  if (sel) { avantChange(); edit.formes.splice(edit.formes.indexOf(sel), 1); sel = null; changer(false); return; }
  if (!edit.formes.length) return;
  avantChange(); edit.formes = []; changer(false);
}
export function echap() {
  if (calage) { calage = null; rafraichir(); return true; }
  if (enCours) { if (MULTI.has(enCours.type) && enCours.pts.length > 1) finirMulti(); else enCours = null; rafraichir(); return true; }
  if (sel) { sel = null; rafraichir(); return true; }
  return false;
}
export function finirMulti() {
  if (!enCours || !MULTI.has(enCours.type)) return;
  const f = enCours; enCours = null;
  if (f.pts.length >= (f.type === 'zone' ? 3 : 2)) { avantChange(); edit.formes.push(f); changer(false); }
  rafraichir();
}

function choisirOutil(o) {
  outil = o;
  $$('#listeOutils button').forEach((b) => b.classList.toggle('actif', b.dataset.outil === o));
  document.body.className = document.body.className.replace(/\boutil-\S+/g, '').trim();
  document.body.classList.add('outil-' + o);
  if (enCours && MULTI.has(enCours.type)) finirMulti();
}
$('#listeOutils').addEventListener('click', (e) => {
  const b = e.target.closest('[data-outil]'); if (!b) return;
  // téléphone : ramener la vidéo à l'écran pour dessiner
  if (matchMedia('(max-width: 820px)').matches) { const r = $('#cadre').getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) scrollBy({ top: r.top - 56, behavior: 'smooth' }); }
  if (!commencer()) return;
  choisirOutil(b.dataset.outil);
});
$('#couleurs').innerHTML = COULEURS.map((c, i) => `<button data-c="${c}" style="background:${c}" class="${i ? '' : 'actif'}" title="Couleur"></button>`).join('');
$('#couleurs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-c]'); if (!b) return;
  couleur = b.dataset.c;
  $$('#couleurs button').forEach((x) => x.classList.toggle('actif', x === b));
  if (sel) { avantChange(); sel.couleur = couleur; changer(false); }
});
$$('[data-epais]').forEach((b) => b.addEventListener('click', () => {
  epais = +b.dataset.epais;
  $$('[data-epais]').forEach((x) => x.classList.toggle('actif', x === b));
  if (sel) { avantChange(); sel.ep = epais; changer(false); }
}));
$('#btnAnnuler').onclick = annuler;
$('#btnEffacer').onclick = effacer;

// ---- calage du sol (perspective)
$('#btnSol').onclick = async () => {
  if (!commencer()) return;
  if (edit.sol) {
    const v = await dialogue({ titre: 'Perspective du sol', ok: 'Recaler', corps: `<p>Le sol est calé pour ce dessin.</p>
      <label><input type="checkbox" name="retirer"> Retirer le calage (dessins à plat)</label>` });
    if (!v) return;
    if (v.retirer) { avantChange(); edit.sol = null; changer(false); bandeau(); return; }
  }
  const v = await dialogue({ titre: 'Caler le sol en 4 clics', ok: 'Commencer', corps: `
    <p>Cliquez les 4 coins d'un rectangle connu, dans cet ordre :<br>
    <b>1</b> et <b>2</b> : sur la ligne de but (gauche puis droite),<br><b>3</b> et <b>4</b> : sur la ligne avant (droite puis gauche).</p>
    <label>Rectangle : <select name="ref">${Object.entries(REFS).map(([k, r]) => `<option value="${k}">${esc(r.nom)}</option>`).join('')}</select></label>
    <p class="petit discret">Ensuite cercles, flèches et pastilles se couchent sur la pelouse. Échap pour annuler.</p>` });
  if (!v) return;
  calage = { ref: v.ref, pts: [] };
  toast('Cliquez le coin 1 (ligne de but, à gauche)', { duree: 3500 });
  rafraichir();
};

// ---- souris / stylet
cv.addEventListener('pointerdown', (e) => {
  if (!edit || e.button !== 0) return;
  e.preventDefault();
  cv.setPointerCapture(e.pointerId);
  const p = versVideo(e.clientX, e.clientY);
  if (calage) {
    calage.pts.push(p);
    if (calage.pts.length === 4) {
      avantChange();
      edit.sol = { ref: calage.ref, img: calage.pts };
      calage = null; montreGrille = true;
      setTimeout(() => { montreGrille = false; rafraichir(); }, 2500);
      changer(false); bandeau();
      toast('Sol calé : la grille montre la pelouse vue de la caméra (carrés de 5 m)', { duree: 3500 });
    } else toast(`Coin ${calage.pts.length + 1}`, { duree: 1200 });
    rafraichir();
    return;
  }
  if (outil === 'choix') {
    sel = touche(p);
    if (sel) { avantChange(); glisse = { p, orig: JSON.parse(JSON.stringify(sel.pts)) }; }
    rafraichir();
    return;
  }
  if (MULTI.has(outil)) {
    if (!enCours) enCours = { type: outil, pts: [p], couleur, ep: epais };
    else enCours.pts.push(p);
    rafraichir();
    return;
  }
  if (outil === 'suivi') { lancerSuivi(p); return; }
  if (outil === 'horsjeu') {
    if (!edit.sol) { toast('Calez d’abord le sol (▱ Sol, 4 coins de la surface)', { erreur: true, duree: 3500 }); return; }
    avantChange(); edit.formes.push({ type: 'horsjeu', pts: [p], couleur, ep: epais }); changer(false); return;
  }
  enCours = { type: outil, pts: [p], couleur, ep: epais };
  rafraichir();
});
cv.addEventListener('pointermove', (e) => {
  if (!edit) return;
  const p = versVideo(e.clientX, e.clientY);
  souris = p;
  if (glisse && sel) {
    const dx = p[0] - glisse.p[0], dy = p[1] - glisse.p[1];
    sel.pts = glisse.orig.map(([x, y]) => [x + dx, y + dy]);
    rafraichir(); return;
  }
  if (!enCours) { if (calage || MULTI.has(outil)) rafraichir(); return; }
  if (MULTI.has(enCours.type)) { rafraichir(); return; }
  if (['fleche', 'course', 'main'].includes(enCours.type)) {
    if (dist(enCours.pts.at(-1), p) > 3 * W() / cv.getBoundingClientRect().width) enCours.pts.push(p);
  } else enCours.pts[1] = p;
  rafraichir();
});
cv.addEventListener('pointerup', async () => {
  if (!edit) return;
  if (glisse) { glisse = null; changer(false); return; }
  if (!enCours || MULTI.has(enCours.type)) return;
  const f = enCours; enCours = null;
  const court = f.pts.length < 2 || dist(f.pts[0], f.pts.at(-1)) < tolerance();
  if (['fleche', 'course', 'ligne', 'main', 'vision'].includes(f.type) && court) { rafraichir(); return; }
  if (ANNEAU.has(f.type) && court) f.pts = [f.pts[0]];
  if (f.type === 'fleche' || f.type === 'course') f.pts = simplifier(f.pts);
  if (f.type === 'pastille' || f.type === 'fantome' || f.type === 'texte') {
    const v = await dialogue({
      titre: f.type === 'texte' ? 'Texte' : f.type === 'pastille' ? 'Pastille : numéro ou lettre' : 'Fantôme : étiquette (facultatif)',
      corps: f.type === 'texte' ? '<textarea name="v" style="min-height:80px" placeholder="Ex. Reste haute !"></textarea>' : `<input type="text" name="v" value="${f.type === 'pastille' ? prochainNum : ''}">`,
      auChargement: (el) => { const i = el.querySelector('[name=v]'); i.focus(); i.select?.(); },
    });
    if (!v || (f.type !== 'fantome' && !v.v.trim())) { rafraichir(); return; }
    f.texte = v.v.trim();
    if (f.type === 'pastille' && /^\d+$/.test(f.texte)) prochainNum = +f.texte + 1;
  }
  avantChange(); edit.formes.push(f); changer(false);
});
cv.addEventListener('dblclick', (e) => { if (enCours && MULTI.has(enCours.type)) { e.preventDefault(); enCours.pts.pop(); finirMulti(); } });

function simplifier(pts) {   // garde ~24 points le long du geste
  if (pts.length <= 24) return pts.map(([x, y]) => [Math.round(x), Math.round(y)]);
  const pas = (pts.length - 1) / 23;
  return Array.from({ length: 24 }, (_, i) => pts[Math.round(i * pas)]).map(([x, y]) => [Math.round(x), Math.round(y)]);
}
function touche(p) {
  const tol = tolerance() * 1.5;
  for (const f of [...edit.formes].reverse()) {
    if (ANNEAU.has(f.type)) {
      const [x0, y0, x1, y1] = boite(contourAnneau(f, solDe(edit)));
      if (p[0] >= x0 - tol && p[0] <= x1 + tol && p[1] >= y0 - tol * 4 && p[1] <= y1 + tol) return f;
    }
    if (f.type === 'texte' || f.type === 'chrono') { if (dist(p, f.pts[0]) < tol * 4) return f; }
    for (let i = 0; i < f.pts.length; i++) {
      if (dist(p, f.pts[i]) < tol) return f;
      if (i && distSeg(p, f.pts[i - 1], f.pts[i]) < tol) return f;
    }
  }
  return null;
}
function distSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1;
  const s = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l));
  return dist(p, [a[0] + s * dx, a[1] + s * dy]);
}

on('zoom', () => { if (edit) { edit.zoom = Z.s > 1.01 ? { s: +Z.s.toFixed(3), x: Math.round(Z.x), y: Math.round(Z.y) } : null; if (!edit._nouveau) sauver(); bandeau(); } });
