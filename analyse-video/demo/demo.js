// Version en ligne du Monteur : remplace le serveur du PC par une démo dans le navigateur.
// Les réglages (séquences, dessins, effectif) restent dans ce navigateur (localStorage).
// La fabrication des vidéos, le suivi automatique et la détection des joueuses restent sur le PC du club.
(function () {
  const CLE = 'montage-demo-v1';
  const ID = 'demo-duchere';
  const PC = 'Disponible sur le PC du club (outil complet). En ligne, c’est une démo.';

  // Effectif lu dans la console du club (commun/club.js) : U15F 2, numéros = identifiants du Monteur (j3 = n°3)
  const EFFECTIF_DEMO = [
    { id: 'j3', num: '3', nom: 'Léa' }, { id: 'j5', num: '5', nom: 'Inès' }, { id: 'j6', num: '6', nom: 'Manon' },
    { id: 'j8', num: '8', nom: 'Jade' }, { id: 'j9', num: '9', nom: 'Chloé' }, { id: 'j10', num: '10', nom: 'Sarah' },
    { id: 'j11', num: '11', nom: 'Lina' }, { id: 'j14', num: '14', nom: 'Zoé' },
  ];
  const EQUIPE = 'U15F-2';
  const depuisClub = () => (window.CLUB ? CLUB.joueurs(EQUIPE).filter((p) => p.numero) : []).map((p) => ({ id: 'j' + p.numero, num: String(p.numero), nom: p.prenom }));
  const EFFECTIF = depuisClub().length ? depuisClub() : EFFECTIF_DEMO;
  const JAUNE = '#ffd43b', ROUGE = '#ff4d4f', VERT = '#51cf66';
  const MATCH = {
    id: ID, nom: 'La Duchère – ESGA U15F (extrait)',
    reglages: { avant: 6, apres: 4 },
    reperes: [{ id: 'r1', t: 21, nom: 'Relance', couleur: JAUNE }],
    sequences: [
      { id: 's1', debut: 4, fin: 13, joueuses: ['j6', 'j9'], nom: '', genre: 'bien', themes: ['Transition'] },
      { id: 's2', debut: 17, fin: 27, joueuses: ['j3'], nom: '', genre: 'corriger', themes: ['Placement', 'Bloc défensif'] },
      { id: 's3', debut: 38, fin: 48, joueuses: ['j10'], nom: 'Séquence 3', genre: null, themes: ['Relance'] },
    ],
    dessins: [
      { id: 'd1', t: 8, mode: 'pause', pause: 4, duree: 4, zoom: null, sol: null, formes: [
        { type: 'projecteur', pts: [[426, 398], [426, 466]], couleur: JAUNE, ep: 1 },
        { type: 'course', pts: [[1028, 452], [1080, 400], [1160, 345]], couleur: JAUNE, ep: 1 },
        { type: 'cercle', pts: [[1028, 452]], couleur: JAUNE, ep: 1 },
        { type: 'texte', pts: [[870, 520]], texte: 'Appel dans la profondeur !', couleur: JAUNE, ep: 1 },
      ] },
      { id: 'd2', t: 21, mode: 'pause', pause: 4, duree: 4, zoom: null, sol: null, formes: [
        { type: 'cercle', pts: [[258, 540]], couleur: ROUGE, ep: 1 },
        { type: 'fantome', pts: [[520, 520]], texte: '3', couleur: ROUGE, ep: 1 },
        { type: 'fleche', pts: [[268, 530], [400, 525], [510, 520]], couleur: ROUGE, ep: 1 },
        { type: 'texte', pts: [[330, 600]], texte: 'Resserre vers l’axe', couleur: ROUGE, ep: 1 },
        { type: 'fleche', pts: [[670, 470], [820, 480], [955, 500]], couleur: VERT, ep: 1 },
      ] },
    ],
  };

  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch { return {}; } };
  const ecrire = (d) => { try { localStorage.setItem(CLE, JSON.stringify(d)); } catch { /* navigation privée */ } };
  const etat = () => { const d = lire(); d.match ||= structuredClone(MATCH); if (!d.effectifModifie) d.effectif = depuisClub().length ? depuisClub() : structuredClone(EFFECTIF); d.seances ||= []; return d; };
  const voix = {};          // commentaires au micro : en mémoire (URL d'objet)
  const taches = {};

  const rep = (d, code = 200) => new Response(JSON.stringify(d), { status: code, headers: { 'Content-Type': 'application/json' } });
  const tache = (message) => { const id = Math.random().toString(36).slice(2); taches[id] = { t0: Date.now(), message }; return { id }; };

  const fetchOrig = window.fetch.bind(window);
  window.fetch = async (url, opt = {}) => {
    if (typeof url !== 'string' || !url.startsWith('/api/')) return fetchOrig(url, opt);
    const u = new URL(url, location.href), p = u.pathname, q = u.searchParams, m = (opt.method || 'GET').toUpperCase();
    const d = etat();
    if (p === '/api/info') return rep({ ffmpeg: true, envois: 'envois (sur le PC du club)' });
    if (p === '/api/videos') return rep([{ id: ID, nom: MATCH.nom, chemin: '', taille: 9.4e6 }]);
    if (p === '/api/detection') return rep({ ok: false });
    if (p === '/api/match') {
      if (m === 'PUT') { d.match = { ...JSON.parse(opt.body), id: ID }; ecrire(d); return rep({ ok: true }); }
      return rep(d.match);
    }
    if (p === '/api/effectif') {
      if (m === 'PUT') { d.effectif = JSON.parse(opt.body); d.effectifModifie = true; ecrire(d); return rep({ ok: true }); }
      return rep(d.effectif);
    }
    if (p === '/api/bibliotheque') {
      const mt = d.match;
      return rep({
        matchs: [{ id: ID, nom: mt.nom, video: true }],
        sequences: mt.sequences.map((s) => ({ ...s, match: ID, matchNom: mt.nom, voix: !!voix[s.id],
          nDessins: mt.dessins.filter((x) => s.debut <= x.t && x.t < s.fin).length })),
        seances: d.seances,
      });
    }
    if (p === '/api/voix') {
      const sid = q.get('seq');
      if (opt.body && opt.body.size) voix[sid] = URL.createObjectURL(opt.body); else delete voix[sid];
      return rep({ ok: true });
    }
    if (p === '/api/calque') return rep({ ok: true });
    if (p === '/api/seance') {
      const c = JSON.parse(opt.body || '{}');
      d.seances = [{ nom: c.nom || 'Séance', items: c.items || [], date: new Date().toISOString().slice(0, 16).replace('T', ' ') },
        ...d.seances.filter((x) => x.nom !== c.nom)].slice(0, 30);
      ecrire(d);
      return rep(tache('séance'));
    }
    if (p === '/api/envoi') return rep(tache('envoi'));
    if (p === '/api/tache') {
      const t = taches[q.get('id')];
      if (!t) return rep({ erreur: 'tâche inconnue' }, 404);
      const f = Math.min(1, (Date.now() - t.t0) / 2500);
      if (f < 1) return rep({ etat: 'en cours', progres: f, message: t.message === 'envoi' ? 'Fabrication des vidéos…' : 'Montage de la séance…' });
      return rep({ etat: 'terminé', progres: 1, dossier: '', resultats: [{ fichier: 'demo' }],
        message: t.message === 'envoi'
          ? 'Démo : sur le PC du club, chaque joueuse reçoit ici sa vidéo (séquences, dessins, voix). Essayez « Présenter » pour voir le rendu.'
          : 'Démo : sur le PC du club, la séance devient une vidéo. « ▶ Regarder » enchaîne les séquences choisies.' });
    }
    if (p === '/api/ouvrir') return rep({ ok: true });
    if (p === '/api/ajouter_video' || p === '/api/suivi' || p === '/api/masque') return rep({ erreur: PC }, 400);
    return rep({ erreur: 'introuvable' }, 404);
  };

  window.DEMO = {
    video: 'demo/duchere.mp4',
    vignette: 'demo/vignette.jpg',
    voix: (sid) => voix[sid] || '',
    reinitialiser() { try { localStorage.removeItem(CLE); localStorage.removeItem('montage-dernier'); } catch { /* */ } location.reload(); },
  };
})();
