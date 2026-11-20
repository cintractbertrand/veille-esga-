// Icônes vectorielles (trait fin, style « Lucide »), à la place des caractères Unicode.
const P = {
  logo: '<circle cx="12" cy="12" r="10"/><path d="m12 7 4.2 3-1.6 5h-5.2l-1.6-5z"/><path d="M12 7V2.5M16.2 10l4.3-1.5M14.6 15l2.6 4M9.4 15l-2.6 4M7.8 10 3.5 8.5"/>',
  choix: '<path d="M4.04 4.69a.5.5 0 0 1 .65-.65l16 6.5a.5.5 0 0 1-.06.95l-6.13 1.58a2 2 0 0 0-1.43 1.43l-1.58 6.13a.5.5 0 0 1-.95.06z"/>',
  fleche: '<path d="M5 19 19 5"/><path d="M9 5h10v10"/>',
  course: '<path d="M5 19l2.2-2.2M10 14l2-2M14.6 9.4 17 7" /><path d="M10 6h8v8"/>',
  ligne: '<path d="M6.5 17.5 17.5 6.5"/><circle cx="5" cy="19" r="1.6"/><circle cx="19" cy="5" r="1.6"/>',
  cercle: '<ellipse cx="12" cy="16" rx="9" ry="4.5"/><circle cx="12" cy="7" r="2.6"/><path d="M12 9.6V15"/>',
  projecteur: '<path d="M9.5 3h5L19 17H5z"/><ellipse cx="12" cy="18" rx="7" ry="2.5"/>',
  pastille: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5h5l-3 7.5"/>',
  fantome: '<path d="M9 10h.01M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>',
  formation: '<circle cx="4" cy="14" r="2"/><circle cx="12" cy="9" r="2"/><circle cx="20" cy="14" r="2"/><path d="M5.8 13 10.2 10M13.8 10l4.4 3"/>',
  vision: '<path d="M5 12 20 5v14z"/><circle cx="4" cy="12" r="1.8"/>',
  horsjeu: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  suivi: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
  zone: '<path d="M12 3 21 9.5 17.5 20h-11L3 9.5z"/>',
  texte: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  main: '<path d="M21.17 6.81a2.82 2.82 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  chrono: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
  sol: '<path d="M7 5h10l4 14H3z"/><path d="M12 5v14M5 12h14"/>',
  annuler: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  effacer: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
  lecture: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1.2" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1.2" fill="currentColor"/>',
  recul: '<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>',
  avance: '<path d="m6 17 5-5-5-5M13 17l5-5-5-5"/>',
  prec: '<path d="m15 18-6-6 6-6"/>',
  suiv: '<path d="m9 18 6-6-6-6"/>',
  repere: '<path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  ciseaux: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.12 8.12 12 12M20 4 8.12 15.88M14.8 14.8 20 20"/>',
  biblio: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  presenter: '<path d="M2 3h20M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3M7 21l5-5 5 5"/><path d="m10 7 4 2.5-4 2.5z" fill="currentColor"/>',
  envoyer: '<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.02.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>',
  dossier: '<path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/>',
  aide: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  moins: '<path d="M5 12h14"/>',
  fermer: '<path d="M18 6 6 18M6 6l12 12"/>',
  film: '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9M12.4 3.4l3.1 4M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  bien: '<path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  corriger: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01"/>',
  micro: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  ecouter: '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5zM16 9a5 5 0 0 1 0 6M19.36 18.36a9 9 0 0 0 0-12.73"/>',
  sansvoix: '<path d="M2 2l20 20M18.89 13.23A7 7 0 0 0 19 12v-2M5 10v2a7 7 0 0 0 12 5M15 9.34V5a3 3 0 0 0-5.68-1.33M9 9v3a3 3 0 0 0 5.12 2.12M12 19v3"/>',
  ouvrir: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  menu: '<circle cx="12" cy="5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="19" r="1.2" fill="currentColor"/>',
  revoir: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  exporter: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  importer: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  joueuse: '<circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>',
  video: '<path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.89a.5.5 0 0 0-.76-.43L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
};

/** Code SVG d'une icône (taille en px). */
export const ic = (nom, taille = 18) =>
  `<svg class="ic" width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nom] || ''}</svg>`;

/** Remplace chaque <i data-ic="nom"> par son icône. */
export function poserIcones(racine = document) {
  racine.querySelectorAll('i[data-ic]').forEach((el) => { el.outerHTML = ic(el.dataset.ic, +el.dataset.t || 18); });
}
poserIcones();
