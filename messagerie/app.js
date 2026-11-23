/* Messagerie d'équipe ESGA, façon WhatsApp (démo dans le navigateur).
   Familles : conversations (équipe, groupes, perso), sondages, absences, convocation reçue.
   Coach : en plus, l'Espace coach (sondage du match, convocation, feuilles de présence). */
(function () {
  "use strict";
  const S = window.STOCKAGE;
  const CLUB = window.CLUB; // socle commun : joueurs, séances, matchs, convocations, présences (commun/club.js)
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const jourISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const maintenant = () => new Date().toISOString();
  const fmtJour = (iso, opts = { weekday: "long", day: "numeric", month: "long" }) => new Date(iso.length === 10 ? iso + "T12:00" : iso).toLocaleDateString("fr-FR", opts);
  const fmtHeure = (iso) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const maj1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;

  const FORMATIONS = { 11: ["4-4-2", "4-3-3", "4-2-3-1", "3-5-2", "5-3-2"], 8: ["3-3-1", "2-3-2", "3-2-2"], 5: ["2-2", "1-2-1"], 4: ["2-1", "1-2"] };
  const MOTIFS = ["Malade", "Blessure", "École / devoirs", "Raison familiale", "Transport", "Autre"];
  const OPTIONS_MATCH = ["Présent", "Peut-être", "Absent"]; // index 0, 1, 2
  const CLES_MATCH = ["oui", "incertain", "non"];
  const REACTIONS = ["👍", "❤️", "😂", "👏", "⚽", "🙏"];
  const VERSION = 5;
  const COULEURS = ["#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#15803d", "#c2410c", "#0369a1"];
  const IC = {
    groupe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20"/></svg>',
    ballon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m12 7 4 3-1.5 4.5h-5L8 10z"/><path d="M12 3v4M16 10l4.5-1.5M14.5 14.5 17 19M9.5 14.5 7 19M8 10 3.5 8.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    envoyer: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6 3.3 10l12.6 2-12.6 2z"/></svg>',
    retour: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18 9 12l6-6"/></svg>',
    sondage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
    absence: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M10 14l4 4M14 14l-4 4"/></svg>',
    convoc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 14l2 2 4-4"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    epingle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 6 4 3v2H6v-2l4-3zM12 15v6"/></svg>',
    repondre: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/></svg>',
    corbeille: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    copier: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
    oeil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12"/></svg>',
    crayon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  };

  let EQUIPES = [];
  let moi = lireMoi();
  let etat = null;
  let brouillon = null; // convocation en cours d'écriture (onglet du coach)
  let reponseA = null;  // message auquel on répond (onglet courant)
  let sep = { conv: null, idx: 0 }; // séparateur « nouveaux messages »
  let enBasPrec = { conv: null, n: 0 }, nouveauxEnBas = 0;

  /* ---------- qui utilise la messagerie : le profil choisi à l'accueil (le même dans toute l'appli) ----------
     Coach et dirigeant écrivent comme le staff de l'équipe (« coach », signé de leur nom) ; un parent écrit pour
     son enfant, une joueuse pour elle-même. En démo seulement, le staff peut « voir comme » une famille. */
  let PG = null; // profil de l'accueil (CLUB.profil())
  const estStaffPG = () => !!PG && (PG.role === "coach" || PG.role === "dirigeant");
  const demo = () => !CLUB.enLigne.actif;
  function lireMoi() { try { return JSON.parse(sessionStorage.getItem("esga-messagerie-moi")) || {}; } catch (e) { return {}; } }
  function ecrireMoi() { try { sessionStorage.setItem("esga-messagerie-moi", JSON.stringify(moi)); } catch (e) {} }
  const estCoach = () => moi.profil === "coach";
  const enfantDe = (p) => (p || "").startsWith("p-") ? p.slice(2) : null;
  const monEnfant = () => enfantDe(moi.profil);
  const joueur = (id) => etat.joueurs.find((j) => j.id === id) || { id, nom: "?" };
  const fem = () => { const e = CLUB.equipe(moi.equipe); return e ? e.genre === "F" : /F/.test((moi.equipe || "").split("-")[0]); };
  const e_ = () => (fem() ? "e" : "");
  // En seniors, vétérans et U20, ce sont les joueurs eux-mêmes qui utilisent la messagerie
  const adultes = () => /Seniors|Vétérans|U20/.test((CLUB.equipe(moi.equipe) || {}).categorie || "");
  const nomCoach = () => { const c = CLUB.coachDe(moi.equipe); return c ? "Coach " + c.prenom : "Le coach"; };
  const nomProfil = (p) => p === "coach" ? nomCoach() : enfantDe(p) ? (adultes() ? joueur(enfantDe(p)).nom : "Parent de " + joueur(enfantDe(p)).nom) : "?";
  // Signature de mes messages : plusieurs éducateurs écrivent comme « coach », une joueuse écrit en son nom
  function maSignature() {
    if (!PG) return null;
    if (estCoach()) {
      if (PG.role === "dirigeant") return "Dirigeant du club";
      const s = PG.role === "coach" && CLUB.staff().find((x) => x.id === PG.staff);
      return !s ? null : s.role === "coach" ? "Coach " + s.prenom : `${s.prenom} ${s.nom[0]}. (${s.role || "staff"})`;
    }
    return PG.role === "joueur" && monEnfant() && idClub(monEnfant()) === PG.joueur && !adultes() ? joueur(monEnfant()).nom : null;
  }
  const nomAuteur = (m) => m.signe || nomProfil(m.auteur);
  const tousProfils = () => ["coach", ...etat.joueurs.map((j) => "p-" + j.id)];
  function initiales(t) { return t.replace(/^(Parent de|Coach) /, "").split(/\s+/).map((m) => m[0]).join("").slice(0, 2).toUpperCase(); }
  function couleur(t) { let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COULEURS[h % COULEURS.length]; }

  /* ---------- équipes, match du week-end et séances ---------- */
  function nomEquipe(id) { return CLUB.nomEquipe(id); }
  // Rencontres à venir (matchs, amicaux, plateaux, tournois) et séances : lues dans le socle du club (PV + console)
  const HORIZON = 42; // jours
  const LIB_TYPE = { amical: "Match amical", plateau: "Plateau", tournoi: "Tournoi", match: "Match" };
  function versMatch(e) {
    const eq = CLUB.equipe(e.equipe), f = eq ? eq.format : 11, ecole = e.type === "plateau" || e.type === "tournoi";
    return { id: e.id, date: e.date, heure: e.heure || "10:00", adversaire: e.adversaire || e.titre || LIB_TYPE[e.type] || "Adversaire à confirmer", domicile: e.domicile !== false, lieu: e.lieu || CLUB.club.lieux[0],
      competition: e.competition || LIB_TYPE[e.type] || "Match", format: FORMATIONS[f] ? f : 8, type: e.type, ecole };
  }
  function matchsVenir(equipe) { const o = CLUB.outils; return CLUB.rencontres(equipe, o.auj(), o.ajout(o.auj(), HORIZON)).map(versMatch); }
  const prochainMatch = (equipe) => matchsVenir(equipe)[0] || null;
  // Match suivi dans cet onglet : le prochain, ou celui que le coach a choisi
  function matchCourant() { const l = matchsVenir(moi.equipe); return l.find((m) => m.id === moi.match) || l[0] || null; }
  const matchDe = (id) => matchsVenir(moi.equipe).find((m) => m.id === id) || null;
  const titreMatch = (m) => (m.ecole ? m.adversaire : "contre " + m.adversaire);
  const affiche = (m) => (m.ecole ? m.adversaire : m.domicile ? "ESGA – " + m.adversaire : m.adversaire + " – ESGA");
  const jourMatch = (m) => fmtJour(m.date, { weekday: "long", day: "numeric" });
  const sondageOuvert = (m) => !!m && CLUB.sondagePossible(CLUB.evenement(m.id));
  const dateOuverture = (m) => fmtJour(CLUB.ouvertureSondage(m), { weekday: "long", day: "numeric", month: "long" });
  const dans10j = (m) => m.date <= CLUB.outils.ajout(CLUB.outils.auj(), CLUB.JOURS_SONDAGE);
  // Sondage commun du week-end (choisi par le coach dans la console) : publié une fois, avec le premier match
  const primaire = (mid) => { const cs = CLUB.sondage(mid); return cs && cs.lies && cs.lies.length ? cs.lies[0] : mid; };
  // Convocation : 14 au maximum à 11, 11 à 8 (règle du club), sauf case « exceptionnellement »
  const maxConv = () => { const q = CLUB.equipe(moi.equipe); return q && q.format === 11 ? 14 : q && q.format === 8 ? 11 : null; };
  function seances(equipe) { return CLUB.prochainsEntrainements(equipe, 6).map((e) => ({ id: e.id, date: e.date, heure: e.heure, lieu: e.lieu })); }
  const libSeance = (s) => `${maj1(fmtJour(s.date))} · ${s.heure.replace(":", "h")}`;
  const seance = (id) => seances(moi.equipe).find((s) => s.id === id);

  /* ---------- état de l'équipe ---------- */
  function etatInitial(equipe) {
    const joueurs = CLUB.donnees.personnes.filter((p) => p.equipe === equipe).map((p, i) => ({ id: "j" + (i + 1), nom: `${p.prenom} ${p.nom[0]}.`, club: p.id }));
    const match = prochainMatch(equipe), s = seances(equipe);
    const il = (h) => new Date(Date.now() - h * 3600e3).toISOString();
    const tous = ["coach", ...joueurs.map((j) => "p-" + j.id)];
    const e = { version: VERSION, joueurs, convs: [], messages: [], sondages: [], absences: [], appel: {}, convocations: [], lus: {} };
    e.convs.push({ id: "equipe", type: "equipe", nom: "Blabla · " + nomEquipe(equipe), membres: tous, creePar: "coach", date: il(80) });
    e.convs.push({ id: "annonces", type: "groupe", annonces: true, nom: "Annonces · " + nomEquipe(equipe), membres: tous, creePar: "coach", date: il(90) });
    // En ligne : une équipe toute neuve, sans messages d'exemple (seulement les deux mots d'accueil)
    if (!demo()) {
      const accueil = (conv, texte) => e.messages.push({ id: uid(), conv, auteur: "coach", date: maintenant(), type: "texte", texte });
      accueil("annonces", "📣 Ici, seulement les informations du staff : sondages des matchs, convocations, horaires, changements de terrain. Pour échanger entre vous (covoiturage…), utilisez le Blabla de l'équipe.");
      accueil("equipe", "Bonjour à tous ! Ici c'est le Blabla de l'équipe 👋 Tout le monde peut écrire : covoiturage, goûters, questions… Pour une absence à l'entraînement, touchez le + en bas puis « Absence ».");
      return e;
    }
    e.convs.push({ id: "c-staff", type: "groupe", nom: "Parents référents", membres: ["coach", "p-j2", "p-j10"], creePar: "coach", date: il(70) });
    e.convs.push({ id: "c-perso-j3", type: "perso", membres: ["coach", "p-j3"], creePar: "p-j3", date: il(30) });
    const m = (conv, auteur, h, o) => e.messages.push(Object.assign({ id: uid(), conv, auteur, date: il(h) }, o));
    m("equipe", "coach", 50, { type: "texte", texte: "Bonjour à tous ! Ici c'est le Blabla de l'équipe 👋 Tout le monde peut écrire : covoiturage, goûters, questions… Les informations officielles (sondages, convocations) sont dans « Annonces ». Pour une absence à l'entraînement, touchez le + en bas puis « Absence »." });
    m("annonces", "coach", 49, { type: "texte", texte: "📣 Ici, seulement les informations du staff : sondages des matchs, convocations, horaires, changements de terrain. Pour échanger entre vous (covoiturage…), utilisez le Blabla de l'équipe." });
    m("annonces", "coach", 6, { type: "texte", texte: "Rappel : pensez aux licences 2026-2027, à rendre avant le 30 novembre au secrétariat du club." });
    m("c-staff", "coach", 48, { type: "texte", texte: "Merci à vous deux d'être référents cette saison. Je vous mets ici l'organisation des goûters." });
    m("c-staff", "p-j2", 47, { type: "texte", texte: "Parfait, on s'en occupe !" });
    m("equipe", "p-j3", 26, { type: "texte", texte: "Bonjour, l'entraînement est maintenu s'il pleut ?" });
    m("equipe", "coach", 25, { type: "texte", texte: "Oui, on s'entraîne sauf si la mairie ferme le terrain. Je préviens ici dans ce cas." });
    const q = e.messages[e.messages.length - 2], r = e.messages[e.messages.length - 1];
    r.reponseA = q.id; r.reactions = { "p-j3": "🙏", "p-j1": "👍", "p-j8": "👍" };
    m("equipe", "p-j3", 24, { type: "texte", texte: "Qui peut emmener samedi ? J'ai 2 places." });
    m("equipe", "p-j6", 23, { type: "texte", texte: "Moi aussi, 3 places au départ de Genas centre." });
    if (s[0]) {
      e.absences.push({ id: uid(), seance: s[0].id, joueur: "j5", motif: "Malade", precision: "Fièvre depuis hier", par: "p-j5", date: il(5) });
      m("equipe", "p-j5", 5, { type: "absence", joueur: "j5", seance: s[0].id, motif: "Malade" });
      e.appel[s[0].id] = { j5: "absent" };
    }
    // Sondage du match lancé par le coach (seulement s'il est lancé dans le club : c'est le coach qui décide)
    if (match && CLUB.sondage(match.id) && primaire(match.id) === match.id) {
      const sm = { id: "s-match", conv: "annonces", auteur: "coach", date: CLUB.sondage(match.id).lance || il(4), type: "match", match: match.id, question: `${maj1(jourMatch(match))} · ${maj1(titreMatch(match))} : qui est disponible ?`, options: OPTIONS_MATCH, reponses: {} };
      const rep = { j1: 0, j2: 0, j3: 0, j4: 2, j5: 2, j6: 0, j7: 1, j8: 0, j10: 0, j11: 0, j12: 0, j13: 0, j14: 0, j15: 0, j16: 0 };
      Object.assign(sm.reponses, rep);
      e.sondages.push(sm);
      e.messages.push({ id: uid(), conv: "annonces", auteur: "coach", date: sm.date, type: "sondage", sondage: sm.id });
      e.convs[1].epingle = e.messages[e.messages.length - 1].id;
    }
    m("c-perso-j3", "p-j3", 3, { type: "texte", texte: "Bonjour coach, Jade aura 15 minutes de retard mardi (dentiste). Désolé !" });
    m("c-perso-j3", "coach", 2.5, { type: "texte", texte: "Pas de souci, merci de prévenir." });
    const sl = { id: "s-repas", conv: "annonces", auteur: "coach", date: il(2.2), type: "libre", question: "Repas de fin d'année : quelle date vous arrange ?", options: ["Samedi 12 décembre", "Dimanche 13 décembre", "Samedi 19 décembre"], reponses: { "p-j1": 0, "p-j2": 0, "p-j4": 1, "p-j6": 0, "p-j9": 2 } };
    e.sondages.push(sl);
    m("annonces", "coach", 2.2, { type: "sondage", sondage: sl.id });
    if (s[0]) {
      e.absences.push({ id: uid(), seance: s[0].id, joueur: "j9", motif: "École / devoirs", precision: "Contrôle de maths le lendemain", par: "p-j9", date: il(1.5) });
      m("equipe", "p-j9", 1.5, { type: "absence", joueur: "j9", seance: s[0].id, motif: "École / devoirs" });
    }
    e.messages.sort((a, b) => a.date.localeCompare(b.date));
    // Les personnes citées dans la démo doivent exister dans l'effectif (les petites équipes ont moins de 16 joueurs)
    const ok = new Set(tous);
    e.convs.forEach((c) => (c.membres = c.membres.filter((p) => ok.has(p))));
    e.convs = e.convs.filter((c) => c.type !== "perso" || c.membres.length === 2);
    e.messages = e.messages.filter((x) => ok.has(x.auteur) && e.convs.some((c) => c.id === x.conv) && (!x.joueur || ok.has("p-" + x.joueur)));
    e.absences = e.absences.filter((a) => ok.has("p-" + a.joueur));
    e.sondages.forEach((so) => Object.keys(so.reponses).forEach((k) => { if (!ok.has(k) && !ok.has("p-" + k)) delete so.reponses[k]; }));
    // Tout est lu sauf les derniers messages
    tous.forEach((p) => { e.lus[p] = {}; e.convs.forEach((c) => (e.lus[p][c.id] = Math.max(0, e.messages.filter((x) => x.conv === c.id).length - (c.id === "equipe" ? 2 : 1)))); });
    return e;
  }
  function charger() {
    etat = S.lire(moi.equipe);
    if (!etat || etat.version !== VERSION) etat = etatInitial(moi.equipe);
    depuisClub(); versClub();
    S.ecrire(moi.equipe, etat);
  }
  function sauver() { versClub(); S.ecrire(moi.equipe, etat); rendre(); }

  /* ---------- synchronisation avec le socle du club ---------- */
  const idClub = (jid) => (etat.joueurs.find((j) => j.id === jid) || {}).club;
  const idMsg = (cid) => (etat.joueurs.find((j) => j.club === cid) || {}).id;
  // Ce que la console a changé : effectif, appel, convocations publiées depuis la console
  function depuisClub() {
    CLUB.joueurs(moi.equipe).forEach((p) => {
      const j = etat.joueurs.find((x) => x.club === p.id), nom = `${p.prenom} ${p.nom[0]}.`;
      if (j) j.nom = nom;
      else { const id = "j" + (etat.joueurs.reduce((m, x) => Math.max(m, +x.id.slice(1) || 0), 0) + 1); etat.joueurs.push({ id, nom, club: p.id }); etat.convs.filter((c) => c.type === "equipe" || c.annonces).forEach((c) => c.membres.push("p-" + id)); }
    });
    seances(moi.equipe).forEach((s) => {
      const pr = CLUB.presences(s.id); Object.keys(pr).forEach((cid) => { const j = idMsg(cid); if (j) (etat.appel[s.id] = etat.appel[s.id] || {})[j] = ["absent", "excuse"].includes(pr[cid]) ? "absent" : "present"; });
    });
    // Absences prévenues depuis l'espace parent de la console : elles apparaissent ici comme si la famille les avait écrites
    seances(moi.equipe).forEach((s) => {
      const d = CLUB.dispos(s.id);
      Object.entries(d).forEach(([cid, x]) => {
        const j = idMsg(cid); if (!j || x.par === "messagerie" || x.statut !== "absent" || etat.absences.some((a) => a.seance === s.id && a.joueur === j)) return;
        etat.absences.push({ id: uid(), seance: s.id, joueur: j, motif: x.motif || "Autre", precision: x.precision || "", par: "p-" + j, date: x.date || maintenant(), deClub: true });
        etat.messages.push({ id: uid(), conv: "equipe", auteur: "p-" + j, date: x.date || maintenant(), type: "absence", joueur: j, seance: s.id, motif: x.motif || "Autre" });
      });
      etat.absences = etat.absences.filter((a) => !(a.deClub && a.seance === s.id && !d[idClub(a.joueur)]));
    });
    // Toutes les rencontres à venir (deux matchs le même week-end, un plateau…), pas seulement la prochaine
    matchsVenir(moi.equipe).forEach(depuisClubMatch);
  }
  function depuisClubMatch(m) {
    const cv = CLUB.convocation(m.id), cs = CLUB.sondage(m.id), prim = primaire(m.id) === m.id;
    const epingler = () => { const a = conv("annonces"); if (a) a.epingle = etat.messages[etat.messages.length - 1].id; };
    // Sondage lancé (ou relancé) depuis la console : publié dans les Annonces de l'équipe
    let sl = etat.sondages.find((x) => x.type === "match" && x.match === m.id);
    if (prim && cs && !sl) {
      const lies = cs.lies ? cs.lies.map((x) => CLUB.evenement(x)).filter(Boolean).map(versMatch) : null;
      sl = { id: uid(), conv: "annonces", auteur: "coach", date: cs.lance, type: "match", match: m.id, lies: cs.lies || undefined,
        question: lies ? `Week-end : ${lies.map((x) => `${x.adversaire} (${fmtJour(x.date, { weekday: "short", day: "numeric" })})`).join(" et ")}. Qui est disponible pour les ${lies.length} matchs ?` : `${maj1(jourMatch(m))} · ${maj1(titreMatch(m))} : qui est disponible ?`, options: OPTIONS_MATCH, reponses: {} };
      etat.sondages.push(sl); etat.messages.push({ id: uid(), conv: "annonces", auteur: "coach", date: cs.lance, type: "sondage", sondage: sl.id });
      epingler();
    }
    if (prim && cs && cs.relance && sl && sl.relanceClub !== cs.relance) {
      sl.relanceClub = cs.relance;
      const sans = etat.joueurs.filter((j) => sl.reponses[j.id] === undefined && !CLUB.dispos(m.id)[j.club]);
      if (sans.length) etat.messages.push({ id: uid(), conv: "annonces", auteur: "coach", date: cs.relance, type: "relance", sondage: sl.id, noms: sans.map((j) => j.nom) });
    }
    // Réponses données dans l'espace parent de l'accueil : reportées sur le sondage du match et la convocation
    const cvm = derniereConvocation(m.id), imp = prim && sl ? (sl.deFamille = sl.deFamille || {}) : null;
    // Réponse retirée dans l'espace parent : elle disparaît aussi du sondage
    if (imp) Object.keys(imp).forEach((j) => { const x = CLUB.dispos(m.id)[idClub(j)]; if (!x) delete sl.reponses[j]; if (!x || x.par !== "famille") delete imp[j]; });
    Object.entries(CLUB.dispos(m.id)).forEach(([cid, x]) => {
      const j = idMsg(cid); if (!j || x.par !== "famille") return;
      const r = { present: 0, incertain: 1, absent: 2 }[x.statut];
      if (imp && r !== undefined) { sl.reponses[j] = r; imp[j] = true; }
      if (cvm && cvm.joueurs.includes(j) && x.statut === "absent" && !(cvm.empechements || {})[j]) (cvm.empechements = cvm.empechements || {})[j] = { motif: x.motif, precision: x.precision || "", date: x.date || maintenant() };
    });
    if (cvm && cvm.empechements) Object.keys(cvm.empechements).forEach((j) => { const x = CLUB.dispos(m.id)[idClub(j)]; if (!x || x.statut !== "absent") delete cvm.empechements[j]; });
    // Convocation publiée depuis la console
    if (cv && cv.source !== "messagerie" && !etat.convocations.some((c) => c.clubRef === cv.id)) {
      const formation = cvm ? cvm.formation : FORMATIONS[m.format][m.format === 11 ? 1 : 0];
      const joueurs = cv.joueurs.map(idMsg).filter(Boolean);
      const c = Object.assign({}, m, { id: uid(), match: m.id, joueurs, formation, postes: places(formation).map(() => null), rdvHeure: cv.rdvHeure, rdvLieu: cv.rdvLieu, tenue: cv.tenue, mot: cv.mot, publiee: cv.publiee, vus: [], clubRef: cv.id });
      remplirAuto(c);
      etat.convocations.push(c);
      etat.messages.push({ id: uid(), conv: "annonces", auteur: "coach", date: cv.publiee, type: "convocation", convoc: c.id });
      epingler();
    }
  }
  // Ce que la messagerie apporte au club : absences signalées, appel, réponses au sondage, empêchements, convocations
  function versClub() {
    CLUB.lot(() => {
      const ss = seances(moi.equipe);
      ss.forEach((s) => {
        const d = CLUB.dispos(s.id);
        Object.keys(d).forEach((cid) => { if (d[cid].par === "messagerie" && !etat.absences.some((a) => a.seance === s.id && idClub(a.joueur) === cid)) CLUB.setDispo(s.id, cid, null); });
        Object.entries(etat.appel[s.id] || {}).forEach(([jid, v]) => { const cid = idClub(jid), cur = CLUB.presences(s.id)[cid]; if (cid && !(v === "absent" && ["absent", "excuse"].includes(cur)) && !(v === "present" && ["present", "retard"].includes(cur))) CLUB.setPresence(s.id, cid, v === "absent" ? "excuse" : "present"); });
      });
      etat.absences.forEach((a) => { const cid = idClub(a.joueur); if (cid && !CLUB.dispos(a.seance)[cid]) CLUB.setDispo(a.seance, cid, { statut: "absent", motif: a.motif, precision: a.precision, par: "messagerie", date: a.date }); });
      // Chaque rencontre à venir dont la messagerie s'occupe (sondage ou convocation) ; les autres restent à la console
      matchsVenir(moi.equipe).forEach((m) => {
        const prim = primaire(m.id) === m.id, sm = prim ? etat.sondages.find((x) => x.type === "match" && x.match === m.id) : null, cv = derniereConvocation(m.id);
        if (!sm && !cv) return;
        if (sm && !CLUB.sondage(m.id)) CLUB.lancerSondage(m.id); // sondage lancé par le coach dans la messagerie
        etat.joueurs.forEach((j) => {
          const emp = cv && cv.empechements && cv.empechements[j.id], r = sm ? sm.reponses[j.id] : undefined, d = CLUB.dispos(m.id)[j.club];
          const voulu = emp ? { statut: "absent", motif: emp.motif, precision: emp.precision, par: "messagerie" } : r === 2 ? { statut: "absent", motif: "Absent (sondage)", par: "sondage" } : r === 1 ? { statut: "incertain", motif: "Peut-être (sondage)", par: "sondage" } : r === 0 ? { statut: "present", motif: "Présent (sondage)", par: "sondage" } : null;
          if (voulu && (!d || d.statut !== voulu.statut)) CLUB.setDispo(m.id, j.club, voulu);
          else if (!voulu && d && (d.par === "messagerie" || (sm && d.par === "sondage"))) CLUB.setDispo(m.id, j.club, null);
        });
      });
      etat.convocations.filter((c) => !c.clubRef && CLUB.evenement(c.match)).forEach((c) => {
        c.clubRef = CLUB.publierConvocation({ evenement: c.match, joueurs: c.joueurs.map(idClub).filter(Boolean), rdvHeure: c.rdvHeure, rdvLieu: c.rdvLieu, tenue: c.tenue, mot: c.mot, source: "messagerie" }).id;
      });
    });
  }
  function poster(conv, msg) { const signe = maSignature(); etat.messages.push(Object.assign({ id: uid(), conv, date: maintenant(), auteur: moi.profil }, signe ? { signe } : {}, msg)); marquerLu(conv); }

  /* ---------- conversations ---------- */
  const mesConvs = () => etat.convs.filter((c) => c.membres.includes(moi.profil));
  const conv = (id) => etat.convs.find((c) => c.id === id);
  const msgsDe = (id) => etat.messages.filter((m) => m.conv === id);
  function nomConv(c) { return c.type === "perso" ? nomProfil(c.membres.find((p) => p !== moi.profil) || moi.profil) : c.nom; }
  function nonLus(c) { const n = msgsDe(c.id); const lu = (etat.lus[moi.profil] || {})[c.id] || 0; return n.slice(lu).filter((m) => m.auteur !== moi.profil).length; }
  function marquerLu(id) { const l = (etat.lus[moi.profil] = etat.lus[moi.profil] || {}); const n = msgsDe(id).length; if (l[id] !== n) { l[id] = n; return true; } return false; }
  function avatar(c) {
    if (c.type === "equipe") return `<span class="av av-equipe">${IC.ballon}</span>`;
    if (c.annonces) return `<span class="av av-annonces">${IC.megaphone}</span>`;
    if (c.type === "groupe") return `<span class="av" style="background:${couleur(c.nom)}">${IC.groupe}</span>`;
    const n = nomConv(c); return `<span class="av" style="background:${couleur(n)}">${esc(initiales(n))}</span>`;
  }
  function extrait(m) {
    if (!m) return "";
    if (m.supprime) return "Message supprimé";
    if (m.type === "texte" || m.type === "info") return m.texte;
    if (m.type === "photo") return "📷 Photo" + (m.texte ? " · " + m.texte : "");
    if (m.type === "sondage") { const so = sondage(m.sondage); return "📊 " + (so ? so.question : "Sondage"); }
    if (m.type === "convocation") { const c = etat.convocations.find((x) => x.id === m.convoc); return c ? `📋 Convocation · ${affiche(c)}, RDV ${c.rdvHeure.replace(":", "h")}` : "📋 Convocation"; }
    if (m.type === "absence") return `🚫 Absence de ${joueur(m.joueur).nom}`;
    if (m.type === "empechement") return `⚠️ Empêchement de ${joueur(m.joueur).nom}`;
    return "🔔 Rappel";
  }
  function apercu(m) {
    if (!m) return "Aucun message";
    if (m.supprime) return "🚫 Message supprimé";
    if (m.type === "photo") return (m.auteur === moi.profil ? "Vous : " : "") + "📷 Photo" + (m.texte ? " · " + m.texte : "");
    if (m.type === "empechement") return `⚠️ Empêchement de ${joueur(m.joueur).nom}`;
    const qui = m.auteur === moi.profil ? "Vous : " : (conv(m.conv) || {}).type !== "perso" ? nomAuteur(m).replace("Parent de ", "") + " : " : "";
    if (m.type === "texte") return qui + m.texte;
    if (m.type === "info") return m.texte;
    if (m.type === "sondage") { const s = sondage(m.sondage); return "📊 " + (s ? s.question : "Sondage"); }
    if (m.type === "absence") return `🚫 Absence de ${joueur(m.joueur).nom}`;
    if (m.type === "convocation") return "📋 Convocation publiée";
    if (m.type === "relance") return "🔔 Rappel du sondage";
    return "";
  }
  function trierConvs(liste) { return liste.slice().sort((a, b) => ((msgsDe(b.id).slice(-1)[0] || b).date).localeCompare((msgsDe(a.id).slice(-1)[0] || a).date)); }

  /* ---------- rendu général ---------- */
  function rendre() {
    rendreTete();
    if (!estCoach() && moi.espace === "coach") moi.espace = "discussions";
    document.body.dataset.espace = moi.espace;
    document.body.classList.toggle("coach", estCoach());
    document.querySelectorAll(".espace-btn").forEach((b) => b.setAttribute("aria-selected", b.dataset.espace === moi.espace));
    $("#ongletCoach").hidden = !estCoach();
    const total = mesConvs().reduce((n, c) => n + nonLus(c), 0);
    const b = $("#badgeTotal"); b.textContent = total; b.hidden = !total || moi.espace === "discussions";
    if (moi.espace === "coach") rendreCoach();
    else {
      // La conversation affichée est lue (sur téléphone, seulement si elle est ouverte en plein écran)
      const c = conv(moi.conv);
      const visible = c && c.membres.includes(moi.profil) && (moi.mobileChat || matchMedia("(min-width: 761px)").matches);
      if (visible && sep.conv !== c.id) sep = { conv: c.id, idx: (etat.lus[moi.profil] || {})[c.id] || 0, vu: false };
      if (visible && marquerLu(c.id)) S.ecrire(moi.equipe, etat);
      rendreSemaine(); rendreListe(); rendreChat();
    }
  }
  // Bandeau : qui je suis (profil de l'accueil), mode démo ou en ligne ; équipe au choix pour le staff
  function rendreTete() {
    const N = CLUB.enLigne, staff = estStaffPG();
    document.body.classList.toggle("en-ligne", N.actif);
    $("#bandeauMode").innerHTML = N.actif ? `🟢 <b>En ligne</b> · messages partagés avec l'équipe` : `<b>Démo</b> · tout reste dans ce navigateur${staff ? ". Pour tester, ouvrez un 2<sup>e</sup> onglet et « voyez comme » une famille" : ""}`;
    $("#bandeauQui").textContent = CLUB.nomProfil(PG) + (staff ? "" : " · " + nomEquipe(moi.equipe));
    $("#lblEquipe").hidden = !staff || EQUIPES.length < 2;
    $("#choixEquipe").innerHTML = EQUIPES.map((e) => `<option value="${esc(e)}"${e === moi.equipe ? " selected" : ""}>${esc(nomEquipe(e))}</option>`).join("");
    $("#lblProfil").hidden = !staff || !demo();
    $("#btnReinitialiser").hidden = !staff || !demo();
    if (staff && demo()) {
      $("#choixProfil").innerHTML = `<option value="coach">Moi (${esc(maSignatureStaff())})</option><optgroup label="Une famille (démo)">${etat.joueurs.map((j) => `<option value="p-${j.id}">${adultes() ? "" : "Parent de "}${esc(j.nom)}</option>`).join("")}</optgroup>`;
      $("#choixProfil").value = moi.profil;
    }
  }
  const maSignatureStaff = () => { const p = moi.profil; moi.profil = "coach"; const s = maSignature(); moi.profil = p; return s || nomCoach(); };
  function rendreListe() {
    const q = ($("#recherche").value || "").toLowerCase();
    const liste = trierConvs(mesConvs()).filter((c) => !q || nomConv(c).toLowerCase().includes(q));
    $("#listeConvs").innerHTML = liste.map((c) => {
      const der = msgsDe(c.id).slice(-1)[0], n = nonLus(c);
      return `<button class="conv${c.id === moi.conv ? " active" : ""}" data-ouvrir="${c.id}">
        ${avatar(c)}
        <span class="conv-txt"><span class="conv-l1"><b>${esc(nomConv(c))}</b><small class="${n ? "non-lu" : ""}">${der ? (der.date.slice(0, 10) === jourISO(new Date()) ? fmtHeure(der.date) : fmtJour(der.date, { day: "2-digit", month: "2-digit" })) : ""}</small></span>
        <span class="conv-l2"><span>${esc(apercu(der))}</span>${n ? `<i class="pastille-nl">${n}</i>` : ""}</span></span></button>`;
    }).join("") || `<p class="vide-liste">Aucune conversation.</p>`;
  }

  /* ---------- conversation ouverte ---------- */
  function rendreChat() {
    const c = conv(moi.conv);
    const ok = c && c.membres.includes(moi.profil);
    document.body.classList.toggle("chat-ouvert", !!(ok && moi.mobileChat));
    $("#chatVide").hidden = !!ok; $("#chat").hidden = !ok;
    if (!ok) return;
    if (marquerLu(c.id)) S.ecrire(moi.equipe, etat);
    const n = c.membres.length;
    $("#chatTete").innerHTML = `<button class="icone retour" data-retour aria-label="Retour aux conversations">${IC.retour}</button>${avatar(c)}
      <button class="chat-titre" data-infos="${c.id}"><b>${esc(nomConv(c))}</b><small>${c.type === "perso" ? "Conversation privée" : esc(c.membres.map((p) => (p === moi.profil ? "Vous" : nomProfil(p).replace("Parent de ", ""))).slice(0, 6).join(", ") + (n > 6 ? ` et ${n - 6} autres` : ""))}</small></button>`;
    const fil = $("#fil");
    const enBas = fil.scrollHeight - fil.scrollTop - fil.clientHeight < 90;
    const msgs = msgsDe(c.id);
    let html = "", jourPrec = "", auteurPrec = "";
    msgs.forEach((m, idx) => {
      const j = m.date.slice(0, 10);
      if (j !== jourPrec) { html += `<div class="jour"><span>${esc(j === jourISO(new Date()) ? "Aujourd'hui" : maj1(fmtJour(m.date)))}</span></div>`; jourPrec = j; auteurPrec = ""; }
      if (sep.conv === c.id && idx === sep.idx && msgs.slice(idx).some((x) => x.auteur !== moi.profil)) {
        html += `<div class="separateur" id="separateur"><span>${pluriel(msgs.slice(idx).filter((x) => x.auteur !== moi.profil).length, "nouveau message").replace("nouveau messages", "nouveaux messages")}</span></div>`; auteurPrec = "";
      }
      if (m.type === "info") { html += `<div class="jour info"><span>${esc(m.texte)}</span></div>`; auteurPrec = ""; return; }
      const mien = m.auteur === moi.profil, suite = auteurPrec === nomAuteur(m);
      auteurPrec = nomAuteur(m);
      const nom = !mien && c.type !== "perso" && !suite ? `<div class="auteur" style="color:${couleur(nomAuteur(m))}">${esc(nomAuteur(m))}</div>` : "";
      html += `<div class="msg${mien ? " mien" : ""}${suite ? " suite" : ""}${m.type !== "texte" && m.type !== "photo" ? " riche" : ""}${m.supprime ? " supprime" : ""}" id="m-${m.id}">
        <div class="bulle">${m.supprime ? "" : `<button class="m-plus" data-ctx="${m.id}" aria-label="Options du message">${IC.chevron}</button>`}${nom}${corpsMessage(m)}<span class="h">${fmtHeure(m.date)}${mien && !m.supprime ? coches(c, idx) : ""}</span></div>
        ${reactions(m)}${!m.supprime && estCoach() && !mien && enfantDe(m.auteur) ? `<button class="msg-act" data-act-joueur="${enfantDe(m.auteur)}" title="Actions pour ${esc(joueur(enfantDe(m.auteur)).nom)}">${IC.absence}<span>Action</span></button>` : ""}</div>`;
    });
    fil.innerHTML = html;
    // Message épinglé
    const ep = c.epingle && msgs.find((m) => m.id === c.epingle && !m.supprime);
    $("#epingle").hidden = !ep;
    if (ep) $("#epingle").innerHTML = `${IC.epingle}<span><b>Épinglé</b> ${esc(extrait(ep))}</span>`, ($("#epingle").dataset.allerMsg = ep.id);
    // Lecture seule (groupe d'annonces) et réponse en cours
    const peutEcrire = !c.annonces || estCoach();
    $("#formEnvoi").hidden = !peutEcrire; $("#lectureSeule").hidden = peutEcrire;
    const ra = reponseA && msgs.find((m) => m.id === reponseA);
    $("#reponseBarre").hidden = !ra;
    if (ra) $("#reponseBarre").innerHTML = `<div class="citation"><b>${esc(ra.auteur === moi.profil ? "Vous" : nomAuteur(ra))}</b><span>${esc(extrait(ra))}</span></div><button class="icone" id="btnAnnulerReponse" aria-label="Annuler la réponse">✕</button>`;
    // Défilement : à la première arrivée, sur le séparateur ; ensuite, en bas si on y était
    if (fil.dataset.conv !== c.id) {
      const sp = $("#separateur");
      fil.scrollTop = sp ? sp.offsetTop - 60 : fil.scrollHeight;
      fil.dataset.conv = c.id; enBasPrec = { conv: c.id, n: msgs.length }; nouveauxEnBas = 0;
    } else if (enBas) { fil.scrollTop = fil.scrollHeight; nouveauxEnBas = 0; }
    else if (enBasPrec.conv === c.id && msgs.length > enBasPrec.n) nouveauxEnBas += msgs.slice(enBasPrec.n).filter((m) => m.auteur !== moi.profil).length;
    enBasPrec = { conv: c.id, n: msgs.length };
    majVersBas();
    // Menu « + » selon le profil
    $("#menuPlus").innerHTML =
      `<button data-action="sondage">${IC.sondage}<span>Sondage</span></button>` +
      (monEnfant() ? `<button data-action="absence">${IC.absence}<span>Absence à l'entraînement</span></button>` : "") +
      (estCoach() ? actionsCoach(c) : "");
  }

  function corpsMessage(m) {
    if (m.supprime) return `<div class="txt discret"><i>🚫 Ce message a été supprimé</i></div>`;
    let cit = "";
    if (m.reponseA) {
      const o = etat.messages.find((x) => x.id === m.reponseA);
      if (o) cit = `<button class="citation" data-aller-msg="${o.id}"><b style="color:${couleur(nomAuteur(o))}">${esc(o.auteur === moi.profil ? "Vous" : nomAuteur(o))}</b><span>${esc(extrait(o))}</span></button>`;
    }
    if (m.type === "texte") return cit + `<div class="txt">${lienner(esc(m.texte)).replace(/\n/g, "<br>")}</div>`;
    if (m.type === "photo") return cit + `<button class="photo" data-zoom="${m.id}"><img src="${m.src}" alt="Photo envoyée par ${esc(nomAuteur(m))}"></button>${m.texte ? `<div class="txt">${esc(m.texte)}</div>` : ""}`;
    if (m.type === "sondage") return carteSondage(sondage(m.sondage));
    if (m.type === "absence") return carteAbsence(m);
    if (m.type === "convocation") return carteConvocMsg(m);
    if (m.type === "relance") return carteRelance(m);
    if (m.type === "empechement") return carteEmpechement(m);
    return "";
  }
  const lienner = (t) => t.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  // ✓ envoyé, ✓✓ gris lu par certains, ✓✓ bleu lu par tous
  function lecteurs(c, idx) { return c.membres.filter((p) => p !== moi.profil && ((etat.lus[p] || {})[c.id] || 0) > idx); }
  function coches(c, idx) {
    const n = lecteurs(c, idx).length, total = c.membres.length - 1;
    return `<i class="coches${n && n === total ? " tous" : ""}" title="${n === total ? "Lu par tous" : `Lu par ${n} sur ${total}`}">${n ? "✓✓" : "✓"}</i>`;
  }
  function reactions(m) {
    const r = m.reactions || {}, compte = {};
    Object.values(r).forEach((e) => (compte[e] = (compte[e] || 0) + 1));
    const k = Object.keys(compte);
    if (!k.length || m.supprime) return "";
    return `<div class="reacs">${k.map((e) => `<button class="reac${r[moi.profil] === e ? " mienne" : ""}" data-reagir="${m.id}|${e}" title="${esc(Object.keys(r).filter((p) => r[p] === e).map((p) => (p === moi.profil ? "Vous" : nomProfil(p))).join(", "))}">${e}<span>${compte[e]}</span></button>`).join("")}</div>`;
  }
  function majVersBas() {
    const fil = $("#fil"), b = $("#versBas");
    const loin = fil.scrollHeight - fil.scrollTop - fil.clientHeight > 220;
    b.hidden = !loin;
    b.innerHTML = `${IC.chevron}${nouveauxEnBas ? `<span class="badge">${nouveauxEnBas}</span>` : ""}`;
    if (!loin) nouveauxEnBas = 0;
  }
  function ouvrirCtx(id, bouton) {
    const m = etat.messages.find((x) => x.id === id), c = conv(m.conv), mien = m.auteur === moi.profil;
    const peutEpingler = estCoach() || c.creePar === moi.profil;
    const el = $("#ctx");
    el.innerHTML = `<div class="ctx-reacs">${REACTIONS.map((e) => `<button data-reagir="${id}|${e}" class="${(m.reactions || {})[moi.profil] === e ? "mienne" : ""}">${e}</button>`).join("")}</div>
      <button data-repondre-a="${id}">${IC.repondre}<span>Répondre</span></button>
      ${m.type === "texte" ? `<button data-copier-msg="${id}">${IC.copier}<span>Copier</span></button>` : ""}
      ${!mien && c.type !== "perso" && m.auteur !== "coach" || (!mien && m.auteur === "coach" && c.type !== "perso") ? `<button data-perso="${m.auteur}">${IC.groupe}<span>Répondre en privé</span></button>` : ""}
      ${peutEpingler ? `<button data-epingler="${id}">${IC.epingle}<span>${c.epingle === id ? "Désépingler" : "Épingler"}</span></button>` : ""}
      ${mien && c.type !== "perso" ? `<button data-vu="${id}">${IC.oeil}<span>Lu par…</span></button>` : ""}
      ${mien || (estCoach() && c.type !== "perso") ? `<button data-supprimer="${id}" class="rouge">${IC.corbeille}<span>Supprimer</span></button>` : ""}`;
    el.hidden = false;
    const r = bouton.getBoundingClientRect(), z = $("#chat").getBoundingClientRect();
    const h = el.offsetHeight, w = el.offsetWidth;
    let top = r.bottom - z.top + 4; if (top + h > z.height - 70) top = Math.max(8, r.top - z.top - h - 4);
    let left = r.right - z.left - w; if (left < 8) left = 8;
    el.style.top = top + "px"; el.style.left = left + "px";
  }
  function fermerCtx() { $("#ctx").hidden = true; }
  function allerMsg(id) {
    const el = document.getElementById("m-" + id); if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }
  function modaleLu(id) {
    const m = etat.messages.find((x) => x.id === id), c = conv(m.conv), idx = msgsDe(c.id).indexOf(m);
    const lus = lecteurs(c, idx), pas = c.membres.filter((p) => p !== moi.profil && !lus.includes(p));
    ouvrirModale("Infos du message", `<p class="discret">${esc(extrait(m))}</p>
      <div class="votes"><div class="votes-t"><b>Lu par</b><span>${lus.length}</span></div><div class="discret">${lus.map((p) => esc(nomProfil(p))).join(", ") || "—"}</div></div>
      <div class="votes"><div class="votes-t"><b>Pas encore lu</b><span>${pas.length}</span></div><div class="discret">${pas.map((p) => esc(nomProfil(p))).join(", ") || "—"}</div></div>`);
  }
  // Toast quand un message arrive d'un autre onglet dans une conversation qu'on ne regarde pas
  function notifierNouveaux(ancien, nouveau) {
    if (!ancien) return;
    const vus = new Set(ancien.messages.map((m) => m.id));
    const n = nouveau.messages.filter((m) => !vus.has(m.id) && m.auteur !== moi.profil && m.type !== "info");
    const pourMoi = n.filter((m) => { const c = nouveau.convs.find((x) => x.id === m.conv); return c && c.membres.includes(moi.profil) && (m.conv !== moi.conv || moi.espace !== "discussions"); });
    if (!pourMoi.length) return;
    const m = pourMoi[pourMoi.length - 1], c = nouveau.convs.find((x) => x.id === m.conv);
    const nomC = c.type === "perso" ? nomAuteur(m) : c.nom;
    toast(`💬 ${nomC} · ${apercu(m)}`.slice(0, 110));
  }

  /* ---------- panneau « Cette semaine » (parent) / « À faire » (coach) ---------- */
  function rendreSemaine() {
    const el = $("#semaine"), ferme = moi.semaineFerme;
    const s0 = seances(moi.equipe)[0], tous = matchsVenir(moi.equipe), proches = tous.filter(dans10j);
    const jc = (m) => fmtJour(m.date, { weekday: "short", day: "numeric" });
    let titre, lignes = [];
    if (estCoach()) {
      const aNoter = etat.absences.filter((a) => seances(moi.equipe).some((s) => s.id === a.seance) && !((etat.appel[a.seance] || {})[a.joueur] === "absent")).length;
      titre = "À faire";
      if (aNoter) lignes.push(`<button class="sem-l alerte-l" data-coach="entrainements">${IC.absence}<span><b>${pluriel(aNoter, "absence")} à noter</b><small>sur les feuilles de présence</small></span></button>`);
      else if (s0) lignes.push(`<div class="sem-l ok-l">${IC.absence}<span><b>Absences à jour</b><small>${esc(libSeance(s0))}</small></span></div>`);
      // Chaque rencontre des 10 prochains jours : d'abord le sondage, puis la convocation
      proches.forEach((m) => {
        const sm = sondageMatch(m.id), cv = derniereConvocation(m.id), qui = `${maj1(titreMatch(m))} · ${jc(m)}`;
        const sans = sm ? etat.joueurs.filter((j) => sm.reponses[j.id] === undefined).length : 0;
        const emp = cv ? Object.keys(cv.empechements || {}).filter((j) => cv.joueurs.includes(j)) : [];
        if (!sm && !cv) return lignes.push(`<button class="sem-l alerte-l" data-action="sondage-match" data-match="${esc(m.id)}">${IC.ballon}<span><b>Sondage à lancer</b><small>${esc(qui)}</small></span></button>`);
        if (sm && primaire(m.id) === m.id) lignes.push(sans ? `<button class="sem-l" data-relancer="${sm.id}">${IC.ballon}<span><b>${pluriel(sans, "famille")} sans réponse</b><small>${esc(qui)} · relancer dans Annonces</small></span></button>`
          : `<div class="sem-l ok-l">${IC.ballon}<span><b>Tout le monde a répondu</b><small>${esc(qui)}</small></span></div>`);
        lignes.push(!cv ? `<button class="sem-l alerte-l" data-coach="convoc" data-match="${esc(m.id)}">${IC.convoc}<span><b>Convocation à faire</b><small>${esc(qui)}</small></span></button>`
          : `<button class="sem-l${emp.length ? " alerte-l" : ""}" data-coach="convoc" data-match="${esc(m.id)}">${IC.convoc}<span><b>${emp.length ? pluriel(emp.length, "empêchement") + " signalé" + (emp.length > 1 ? "s" : "") : `Convocation lue par ${cv.vus.length}/${cv.joueurs.length}`}</b><small>${emp.length ? esc(emp.map((j) => joueur(j).nom).join(", ")) + " · revoir la convocation" : esc(qui)}</small></span></button>`);
      });
      if (!proches.length) lignes.push(tous[0] ? `<div class="sem-l ok-l">${IC.ballon}<span><b>Prochain match ${esc(jourMatch(tous[0]))}</b><small>Sondage à lancer à partir du ${esc(dateOuverture(tous[0]))}</small></span></div>`
        : `<div class="sem-l ok-l">${IC.ballon}<span><b>Pas de match prévu</b><small>dans les 6 prochaines semaines</small></span></div>`);
    } else {
      const j = monEnfant(), nom = joueur(j).nom, vus = new Set();
      titre = `Cette semaine · ${nom}`;
      if (s0) {
        const absS = etat.absences.find((a) => a.joueur === j && a.seance === s0.id);
        lignes.push(absS ? `<div class="sem-l">${IC.absence}<span><b>${esc(libSeance(s0))}</b><small>Absence signalée (${esc(absS.motif)})</small></span></div>`
          : `<button class="sem-l" data-action="absence">${IC.absence}<span><b>Entraînement ${esc(libSeance(s0))}</b><small>Absent${e_()} ? Prévenir le coach</small></span></button>`);
      }
      proches.forEach((m) => {
        const sm = sondageMatch(m.id), cv = derniereConvocation(m.id), r = sm ? sm.reponses[j] : undefined;
        const tete = `<b>${esc(m.ecole ? m.competition : "Match")} ${esc(jourMatch(m))}</b><small>${esc(titreMatch(m))}</small>`;
        if (sm && vus.has(sm.id)) lignes.push(`<div class="sem-l">${IC.ballon}<span>${tete}<small>Sondage commun du week-end : même réponse</small></span></div>`);
        else lignes.push(sm ? `<div class="sem-l sem-match">${IC.ballon}<span>${tete}
            <span class="sem-choix">${OPTIONS_MATCH.map((o, i) => `<button class="pastille p-${CLES_MATCH[i]}${r === i ? " choisi" : ""}" data-voter="${sm.id}|${i}">${o}</button>`).join("")}</span></span></div>`
          : `<div class="sem-l">${IC.ballon}<span>${tete}<small>Le coach n'a pas encore lancé le sondage</small></span></div>`);
        if (sm) vus.add(sm.id);
        if (cv) {
          const ret = cv.joueurs.includes(j), emp = (cv.empechements || {})[j];
          lignes.push(`<button class="sem-l${ret && !cv.vus.includes(j) && !emp ? " alerte-l" : ""}" data-voir-convoc="${cv.id}">${IC.convoc}<span><b>${emp ? "Empêchement signalé" : ret ? `Convoqué${e_()} · RDV ${esc(cv.rdvHeure.replace(":", "h"))}` : "Non retenu" + e_() + " pour ce match"}</b><small>${ret && !cv.vus.includes(j) && !emp ? "À lire et confirmer" : "Voir la convocation"}${proches.length > 1 ? " · " + esc(jc(m)) : ""}</small></span></button>`);
        }
      });
      if (!proches.length) lignes.push(tous[0] ? `<div class="sem-l">${IC.ballon}<span><b>Prochain match ${esc(jourMatch(tous[0]))}</b><small>${esc(maj1(titreMatch(tous[0])))} · le sondage ouvrira le ${esc(dateOuverture(tous[0]))}</small></span></div>`
        : `<div class="sem-l">${IC.ballon}<span><b>Pas de match prévu</b><small>dans les 6 prochaines semaines</small></span></div>`);
    }
    el.innerHTML = `<button class="sem-titre" data-replier aria-expanded="${!ferme}"><span>${esc(titre)}</span>${IC.chevron}</button>${ferme ? "" : `<div class="sem-lignes">${lignes.join("")}</div>`}`;
    el.classList.toggle("ferme", !!ferme);
  }

  // Actions du coach dans n'importe quelle conversation (perso : déjà ciblées sur l'enfant du parent)
  function enfantConv(c) { if (c.type !== "perso") return null; return enfantDe(c.membres.find((p) => p !== moi.profil)); }
  function actionsCoach(c) {
    const j = enfantConv(c), nom = j ? " " + joueur(j).nom : "", conv = derniereConvocation();
    return `<div class="menu-sep">Coach</div>` +
      `<button data-action="absence-coach">${IC.absence}<span>Noter une absence${esc(nom)} à l'entraînement</span></button>` +
      `<button data-action="match-coach">${IC.ballon}<span>Présence${esc(nom)} au match</span></button>` +
      (c.type === "equipe" || c.annonces ? `<button data-action="sondage-match">${IC.sondage}<span>Sondage du match</span></button>` : "") +
      (conv && c.type !== "equipe" && !c.annonces ? `<button data-action="envoyer-convoc">${IC.convoc}<span>Envoyer la convocation ici</span></button>` : "") +
      `<button data-action="convoc">${IC.convoc}<span>Convocation</span></button>`;
  }
  // Fenêtre d'actions sur un enfant (depuis le menu ou un message d'un parent)
  function modaleActionsJoueur(jid) {
    const s = sondageMatch(), r = s ? s.reponses[jid] : undefined, m = matchCourant();
    const c = conv(moi.conv);
    ouvrirModale(`Actions pour ${joueur(jid).nom}`, `<div class="actions-j">
      <h3>Entraînement</h3><button class="esga-btn" data-absence-pour="${jid}">${IC.absence} Noter absent${e_()} à un entraînement</button>
      ${!m ? `<h3>Match</h3><p class="discret petit">Pas de match prévu dans les 6 prochaines semaines.</p>` : `<h3>${esc(maj1(titreMatch(m)))} (${esc(fmtJour(m.date, { weekday: "short", day: "numeric" }))})</h3>
      ${s ? `<div class="choix3">${OPTIONS_MATCH.map((o, i) => `<button class="rep rep-${CLES_MATCH[i]}${r === i ? " choisi" : ""}" data-match-pour="${jid}|${i}">${o}</button>`).join("")}</div>`
          : sondageOuvert(m) ? `<p class="discret petit">Le sondage du match n'est pas encore lancé.</p><button class="esga-btn" data-action="sondage-match">Lancer le sondage du match</button>`
          : `<p class="discret petit">Le sondage pourra être lancé à partir du ${esc(dateOuverture(m))} (10 jours avant).</p>`}`}
      ${c && c.type !== "perso" ? `<h3>Conversation</h3><button class="esga-btn" data-perso="p-${jid}">Écrire en privé au parent</button>` : ""}
    </div>`);
  }
  function modaleChoixJoueur(action) {
    ouvrirModale("Pour qui ?", `<div class="liste-pers">${etat.joueurs.map((j) => `<button class="pers" data-${action}="${j.id}"><span class="av" style="background:${couleur(j.nom)}">${esc(initiales(j.nom))}</span>${esc(j.nom)}</button>`).join("")}</div>`);
  }

  /* ---------- cartes riches dans la conversation ---------- */
  const sondage = (id) => etat.sondages.find((s) => s.id === id);
  const optionsDe = (s) => (s.type === "match" ? OPTIONS_MATCH : s.options); // mêmes mots partout : Présent, Peut-être, Absent
  // Pour le sondage du match, c'est l'enfant qui « vote » (le parent répond pour lui)
  const votant = (s) => (s.type === "match" ? monEnfant() : moi.profil);
  function carteSondage(s) {
    if (!s) return "";
    const v = votant(s), mien = v ? s.reponses[v] : undefined;
    const compte = optionsDe(s).map((_, i) => Object.values(s.reponses).filter((r) => r === i).length);
    const max = Math.max(1, ...compte), total = Object.keys(s.reponses).length;
    const attendus = s.type === "match" ? etat.joueurs.length : conv(s.conv).membres.length;
    return `<div class="sondage${s.type === "match" ? " s-match" : ""}">
      <div class="s-q">${s.type === "match" ? IC.ballon : IC.sondage}<b>${esc(s.question)}</b></div>
      <div class="s-aide">${s.type === "match" ? (monEnfant() ? `Répondez pour ${esc(joueur(monEnfant()).nom)}` : "Les familles répondent pour leur enfant") : "Choisissez une option"}${s.clos ? " · clos" : ""}</div>
      ${optionsDe(s).map((o, i) => `<button class="s-opt${mien === i ? " choisi" : ""}${s.type === "match" ? " m" + i : ""}" data-voter="${s.id}|${i}"${!v || s.clos ? " disabled" : ""}>
        <span class="rond"></span><span class="s-lib">${esc(o)}</span><span class="s-n">${compte[i]}</span>
        <span class="s-barre"><i style="width:${(compte[i] / max) * 100}%"></i></span></button>`).join("")}
      <button class="s-voir" data-votes="${s.id}">Voir les votes · ${total}/${attendus}</button></div>`;
  }
  function carteAbsence(m) {
    const s = seance(m.seance);
    const note = etat.appel[m.seance] && etat.appel[m.seance][m.joueur] === "absent";
    return `<div class="carte-msg c-absence"><div class="c-tete">${IC.absence}<b>Absence à l'entraînement</b></div>
      <div><b>${esc(joueur(m.joueur).nom)}</b> · ${esc(s ? libSeance(s) : fmtJour(m.seance))}</div><span class="motif">${esc(m.motif)}</span>
      ${estCoach() && s ? (note ? `<div class="note-ok">✓ Noté${e_()} absent${e_()}</div>` : `<button class="mini-btn" data-noter="${m.seance}|${m.joueur}">Noter absent${e_()}</button>`) : ""}</div>`;
  }
  function carteConvocMsg(m) {
    const c = etat.convocations.find((x) => x.id === m.convoc);
    if (!c) return "";
    const enfant = monEnfant(), retenu = enfant && c.joueurs.includes(enfant);
    const derniere = (derniereConvocation(c.match) || {}).id === c.id;
    return `<div class="carte-msg c-convoc"><div class="c-tete">${IC.convoc}<b>Convocation${derniere ? "" : " (remplacée)"}</b></div>
      <div>${esc(affiche(c))}</div>
      <div class="discret">${esc(maj1(fmtJour(c.date, { weekday: "long", day: "numeric", month: "long" })))} · RDV ${esc(c.rdvHeure.replace(":", "h"))}</div>
      ${enfant ? `<div class="verdict-mini ${retenu ? "ok" : "non"}">${retenu ? `${esc(joueur(enfant).nom)} est convoqué${e_()}` : `${esc(joueur(enfant).nom)} n'est pas retenu${e_()}`}</div>` : `<div class="discret">${pluriel(c.joueurs.length, "convoqué" + e_())} · lue par ${c.vus.length}</div>`}
      <button class="mini-btn" data-voir-convoc="${c.id}">Voir la convocation</button></div>`;
  }
  function carteEmpechement(m) {
    return `<div class="carte-msg c-absence"><div class="c-tete">⚠️ <b>Empêchement pour le match</b></div>
      <div><b>${esc(joueur(m.joueur).nom)}</b> · ${esc(m.motif)}</div>${m.precision ? `<div class="discret">« ${esc(m.precision)} »</div>` : ""}
      ${estCoach() ? `<button class="mini-btn" data-coach="convoc" data-revoir="1"${m.match ? ` data-match="${esc(m.match)}"` : ""}>Revoir la convocation</button>` : ""}</div>`;
  }
  function modaleEmpechement(cid) {
    const j = monEnfant();
    ouvrirModale(`Empêchement de ${joueur(j).nom}`, `<form id="formEmpechement" class="form" data-convoc="${cid}">
      <p class="large discret petit">Le coach sera prévenu en privé et pourra revoir la convocation.</p>
      <label>Motif<select name="motif">${MOTIFS.map((m) => `<option>${m}</option>`).join("")}</select></label>
      <label>Précision (facultatif)<input name="precision" maxlength="140" placeholder="Ex. : fièvre depuis ce matin"></label>
      <div class="actions large"><button class="esga-btn esga-btn-primaire">Prévenir le coach</button></div></form>`);
  }
  function carteRelance(m) {
    const s = sondage(m.sondage);
    return `<div class="carte-msg c-relance"><div class="c-tete">🔔 <b>Rappel du coach</b></div>
      <div>Pensez à répondre au sondage « ${esc(s ? s.question : "")} ».</div>
      <div class="discret">Pas encore de réponse pour : ${esc(m.noms.join(", "))}</div></div>`;
  }

  /* ---------- fenêtres (modales) ---------- */
  function ouvrirModale(titre, html, large) {
    const d = $("#modale");
    d.innerHTML = `<div class="mod-boite${large ? " large" : ""}" role="dialog" aria-modal="true" aria-label="${esc(titre)}"><div class="mod-tete"><b>${esc(titre)}</b><button class="icone" data-fermer aria-label="Fermer">✕</button></div><div class="mod-corps">${html}</div></div>`;
    d.hidden = false;
    const f = d.querySelector("input:not([type=checkbox]), textarea"); if (f) setTimeout(() => f.focus(), 30);
  }
  function fermerModale() { $("#modale").hidden = true; $("#modale").innerHTML = ""; }
  function caseProfil(p, coche, desactive) {
    return `<label class="case"><input type="checkbox" name="m" value="${p}"${coche ? " checked" : ""}${desactive ? " disabled" : ""}><span>${esc(p === moi.profil ? "Vous" : nomProfil(p))}</span></label>`;
  }
  function modaleGroupe() {
    ouvrirModale("Nouveau groupe", `<form id="formGroupe" class="form">
      <label class="large">Nom du groupe<input name="nom" required maxlength="40" placeholder="Ex. : Goûters, Tournoi de Noël…"></label>
      <fieldset class="large"><legend>Membres</legend><div class="cases">${tousProfils().map((p) => caseProfil(p, p === moi.profil, p === moi.profil)).join("")}</div></fieldset>
      <div class="actions large"><button class="esga-btn esga-btn-primaire">Créer le groupe</button></div></form>`);
  }
  function modalePerso() {
    ouvrirModale("Nouvelle conversation", `<div class="liste-pers">${tousProfils().filter((p) => p !== moi.profil).map((p) => `<button class="pers" data-perso="${p}"><span class="av" style="background:${couleur(nomProfil(p))}">${esc(initiales(nomProfil(p)))}</span>${esc(nomProfil(p))}</button>`).join("")}</div>`);
  }
  function modaleSondage(convId) {
    ouvrirModale("Nouveau sondage", `<form id="formSondage" class="form" data-conv="${convId}">
      <label class="large">Question<input name="question" required maxlength="120" placeholder="Ex. : Qui peut tenir la buvette dimanche ?"></label>
      <fieldset class="large"><legend>Réponses possibles</legend><div id="optsSondage" class="opts">
        <input name="opt" required maxlength="60" placeholder="Option 1"><input name="opt" required maxlength="60" placeholder="Option 2"></div>
        <button type="button" class="lien" id="btnAjoutOpt">+ Ajouter une option</button></fieldset>
      <div class="actions large"><button class="esga-btn esga-btn-primaire">Envoyer le sondage</button></div></form>`);
  }
  function modaleAbsence(convId, jid) {
    const enfant = jid || monEnfant(), liste = seances(moi.equipe);
    const miennes = etat.absences.filter((a) => a.joueur === enfant && liste.some((s) => s.id === a.seance));
    ouvrirModale(`Absence de ${joueur(enfant).nom}`, `<form id="formAbsence" class="form" data-conv="${convId}" data-joueur="${enfant}">
      <label class="large">Entraînement<select name="seance">${liste.map((s) => { const d = miennes.some((a) => a.seance === s.id); return `<option value="${s.id}"${d ? " disabled" : ""}>${esc(libSeance(s))}${d ? " (déjà signalé)" : ""}</option>`; }).join("")}</select></label>
      <label>Motif<select name="motif">${MOTIFS.map((m) => `<option>${m}</option>`).join("")}</select></label>
      <label>Précision (facultatif)<input name="precision" maxlength="140" placeholder="Ex. : rendez-vous médical"></label>
      <div class="actions large"><button class="esga-btn esga-btn-primaire">${estCoach() ? "Noter l'absence" : "Prévenir le coach"}</button></div></form>
      ${miennes.length ? `<h3>Déjà signalées</h3><ul class="liste">${miennes.map((a) => `<li><span><b>${esc(libSeance(seance(a.seance)))}</b> · ${esc(a.motif)}</span><button class="lien rouge" data-annuler-absence="${a.id}">Annuler</button></li>`).join("")}</ul>` : ""}`);
  }
  function modaleVotes(id) {
    const s = sondage(id);
    const qui = (k) => (s.type === "match" ? joueur(k).nom : nomProfil(k));
    const sans = (s.type === "match" ? etat.joueurs.map((j) => j.id) : conv(s.conv).membres).filter((k) => s.reponses[k] === undefined);
    ouvrirModale("Votes", `<p><b>${esc(s.question)}</b></p>${optionsDe(s).map((o, i) => {
      const v = Object.keys(s.reponses).filter((k) => s.reponses[k] === i);
      return `<div class="votes"><div class="votes-t"><b>${esc(o)}</b><span>${v.length}</span></div><div class="discret">${v.map((k) => esc(qui(k))).join(", ") || "—"}</div></div>`;
    }).join("")}<div class="votes"><div class="votes-t"><b>Sans réponse</b><span>${sans.length}</span></div><div class="discret">${sans.map((k) => esc(qui(k))).join(", ") || "—"}</div></div>
    ${(estCoach() || s.auteur === moi.profil) && !s.clos ? `<div class="actions">${sans.length ? `<button class="esga-btn" data-relancer="${s.id}">Relancer les ${sans.length} sans réponse</button>` : ""}<button class="esga-btn" data-clore="${s.id}">Clore le sondage</button></div>` : ""}`);
  }
  function modaleInfos(id) {
    const c = conv(id);
    ouvrirModale(nomConv(c), `${c.annonces ? `<p class="alerte">${IC.megaphone} Annonces : seuls les coachs et les dirigeants y écrivent. Pour discuter entre vous (covoiturage…), utilisez le Blabla.</p>` : ""}<p class="discret">${c.type === "equipe" ? "Groupe de toute l'équipe, créé par le coach." : c.type === "groupe" ? `Groupe créé par ${esc(c.creePar === moi.profil ? "vous" : nomProfil(c.creePar))}.` : "Conversation privée."}</p>
      ${c.type === "perso" ? "" : `<h3>${pluriel(c.membres.length, "membre")}</h3><ul class="liste">${c.membres.map((p) => `<li><span>${esc(p === moi.profil ? "Vous" : nomProfil(p))}</span>${p === "coach" ? '<span class="etiquette e-oui">Coach</span>' : ""}</li>`).join("")}</ul>`}
      ${c.type !== "perso" && (c.creePar === moi.profil || estCoach()) ? `<div class="actions">${c.type === "groupe" ? `<button class="esga-btn" data-modifier-groupe="${c.id}">Modifier les membres</button>` : ""}<button class="esga-btn" data-annonces="${c.id}">${IC.megaphone} ${c.annonces ? "Permettre à tous d'écrire" : "Seul le coach écrit"}</button></div>` : ""}
      ${c.type === "groupe" && !c.annonces && c.creePar !== moi.profil ? `<div class="actions"><button class="lien rouge" data-quitter="${c.id}">Quitter le groupe</button></div>` : ""}`);
  }
  function modaleMembres(id) {
    const c = conv(id);
    ouvrirModale(`Membres de « ${c.nom} »`, `<form id="formMembres" class="form" data-conv="${c.id}">
      <fieldset class="large"><legend>Membres</legend><div class="cases">${tousProfils().map((p) => caseProfil(p, c.membres.includes(p), p === moi.profil)).join("")}</div></fieldset>
      <div class="actions large"><button class="esga-btn esga-btn-primaire">Enregistrer</button></div></form>`);
  }
  function modaleConvoc(id) {
    const c = etat.convocations.find((x) => x.id === id);
    ouvrirModale("Convocation", vueConvocation(c), true);
  }

  /* ---------- convocation : affichage ---------- */
  function carteMatch(match) {
    return `<div class="match">
      <div class="match-date"><span>${esc(fmtJour(match.date, { weekday: "short" }))}</span><b>${esc(fmtJour(match.date, { day: "numeric" }))}</b><span>${esc(fmtJour(match.date, { month: "short" }))}</span></div>
      <div class="match-info"><p class="esga-kicker">${esc(match.competition)}</p>
        <div class="match-titre">${match.ecole ? esc(match.adversaire) : match.domicile ? `ESGA <span>contre</span> ${esc(match.adversaire)}` : `${esc(match.adversaire)} <span>contre</span> ESGA`}</div>
        <div class="discret">${esc(match.heure.replace(":", "h"))} · ${esc(match.lieu)}${match.ecole ? "" : match.domicile ? " · à domicile" : " · à l'extérieur"}</div></div></div>`;
  }
  function derniereConvocation(mid) { mid = mid || (matchCourant() || {}).id; return mid ? etat.convocations.filter((c) => c.match === mid).slice(-1)[0] || null : null; }
  function places(formation) {
    const lignes = formation.split("-").map(Number), L = lignes.length, res = [{ x: 50, y: 90, lib: "G" }];
    lignes.forEach((n, li) => {
      const y = 72 - li * (54 / Math.max(L - 1, 1));
      const lib = li === 0 ? "DEF" : li === L - 1 ? "ATT" : L === 4 ? (li === 1 ? "MDF" : "MOC") : "MIL";
      for (let i = 0; i < n; i++) res.push({ x: ((i + 1) / (n + 1)) * 100, y, lib });
    });
    return res;
  }
  const remplacants = (c) => c.joueurs.filter((id) => !(c.postes || []).includes(id));
  function terrain(c, edition) {
    const enfant = monEnfant();
    return `<div class="terrain"><div class="lignes"><i class="rond"></i><i class="surface haut"></i><i class="surface bas"></i><i class="milieu"></i></div>
      ${places(c.formation).map((p, i) => {
        const id = c.postes[i];
        const contenu = edition
          ? `<select data-poste="${i}" aria-label="Poste ${p.lib}"><option value="">${p.lib}</option>${c.joueurs.map((j) => `<option value="${j}"${j === id ? " selected" : ""}>${esc(joueur(j).nom)}</option>`).join("")}</select>`
          : `<span>${id ? esc(joueur(id).nom) : "?"}</span>`;
        return `<div class="poste${id ? "" : " libre"}${id && id === enfant ? " moi" : ""}" style="left:${p.x}%;top:${p.y}%"><b>${p.lib}</b>${contenu}</div>`;
      }).join("")}</div>`;
  }
  function vueConvocation(c) {
    const enfant = monEnfant(), retenu = enfant && c.joueurs.includes(enfant);
    const derniere = (derniereConvocation(c.match) || {}).id === c.id;
    return `<div class="convoc">
      ${derniere ? "" : `<p class="alerte">Cette convocation a été remplacée par une version plus récente.</p>`}
      ${carteMatch(c)}
      ${estCoach() && Object.keys(c.empechements || {}).some((j) => c.joueurs.includes(j)) ? `<p class="alerte">⚠️ Empêchement${Object.keys(c.empechements).length > 1 ? "s" : ""} : ${Object.entries(c.empechements).filter(([j]) => c.joueurs.includes(j)).map(([j, x]) => esc(joueur(j).nom) + " (" + esc(x.motif) + ")").join(", ")}. Modifiez la convocation pour en tenir compte.</p>` : ""}
      ${enfant ? `<div class="verdict ${retenu ? "ok" : "non"}">${retenu ? `<b>${esc(joueur(enfant).nom)} est convoqué${e_()}</b>.` : `<b>${esc(joueur(enfant).nom)} n'est pas retenu${e_()} pour ce match.</b> Il y en aura d'autres !`}</div>` : ""}
      <dl class="rdv"><div><dt>Rendez-vous</dt><dd><b>${esc(c.rdvHeure.replace(":", "h"))}</b> · ${esc(c.rdvLieu)}</dd></div>
        <div><dt>Tenue</dt><dd>${esc(c.tenue)}</dd></div>${c.mot ? `<div><dt>Mot du coach</dt><dd>${esc(c.mot)}</dd></div>` : ""}</dl>
      <!-- Convocation générale, sans postes : l'entraîneur les décide le jour même (Bertrand, 23/11/2026) -->
      <h3>Convoqué${e_()}s (${c.joueurs.length})</h3>
      <ul class="convoques">${c.joueurs.map((id) => `<li class="${id === enfant ? "moi" : ""}">${esc(joueur(id).nom)}${estCoach() && c.vus.includes(id) ? ' <span class="lu">✓ lu</span>' : ""}</li>`).join("")}</ul>
      <div class="actions">
        ${enfant && derniere ? (c.vus.includes(enfant) ? `<span class="discret">✓ Vous avez confirmé la lecture</span>` : `<button class="esga-btn esga-btn-primaire" data-lu="${c.id}">J'ai bien lu</button>`) : ""}
        ${enfant && derniere && retenu ? ((c.empechements || {})[enfant] ? `<span class="discret">⚠️ Empêchement signalé au coach</span>` : `<button class="esga-btn" data-empechement="${c.id}">Signaler un empêchement</button>`) : ""}
        ${estCoach() ? `<span class="discret">Lue par ${c.vus.length} famille${c.vus.length > 1 ? "s" : ""} sur ${etat.joueurs.length}</span>` : ""}
        <button class="esga-btn" data-diffuser="${c.id}">${estCoach() ? "Diffuser (WhatsApp, SMS…)" : "Copier le texte"}</button>
      </div></div>`;
  }
  function texteConvocation(c) {
    const noms = (ids) => ids.map((id) => joueur(id).nom).join(", ");
    return `⚽ CONVOCATION ESGA · ${nomEquipe(moi.equipe)}\n${maj1(fmtJour(c.date))} · ${c.ecole ? "début" : "coup d'envoi"} ${c.heure.replace(":", "h")}\n` +
      `${affiche(c)} (${c.lieu})\n\nRendez-vous : ${c.rdvHeure.replace(":", "h")} · ${c.rdvLieu}\nTenue : ${c.tenue}\n\n` +
      `Convoqué${e_()}s (${c.joueurs.length}) : ${noms(c.joueurs)}\n` + (c.mot ? `\n${c.mot}\n` : "");
  }

  /* ---------- Espace coach ---------- */
  // Sondage d'une rencontre (par défaut celle suivie dans l'onglet) ; sondage commun du week-end : celui du premier match
  function sondageMatch(mid) {
    mid = mid || (matchCourant() || {}).id; if (!mid) return null;
    const p = primaire(mid); return etat.sondages.filter((s) => s.type === "match" && (s.match === p || s.match === mid)).slice(-1)[0] || null;
  }
  function reponseMatch(jid) { const s = sondageMatch(); const r = s ? s.reponses[jid] : undefined; return r === undefined ? null : CLES_MATCH[r]; }
  function rendreCoach() {
    const o = moi.coachOnglet || "match";
    document.querySelectorAll(".c-onglet").forEach((b) => b.setAttribute("aria-selected", b.dataset.coach === o));
    const el = $("#coachContenu");
    if (el.contains(document.activeElement) && document.activeElement.matches("input:not([type=checkbox]), textarea")) return;
    el.innerHTML = o === "entrainements" ? coachEntrainements() : choixMatch() + (o === "match" ? coachMatch() : coachConvoc());
  }
  // Plusieurs rencontres à venir (deux matchs le même week-end, un tournoi…) : le coach choisit celle qu'il prépare
  function choixMatch() {
    const l = matchsVenir(moi.equipe), cur = matchCourant();
    if (l.length < 2) return "";
    return `<div class="choix-match" role="tablist" aria-label="Rencontre">${l.slice(0, 6).map((m) => `<button class="chip${m.id === cur.id ? " actif" : ""}" data-match-choisi="${esc(m.id)}" aria-selected="${m.id === cur.id}"><b>${esc(maj1(fmtJour(m.date, { weekday: "short", day: "numeric", month: "short" })))}</b><span>${esc(m.ecole ? m.adversaire : m.adversaire + (m.domicile ? " (dom.)" : " (ext.)"))}</span></button>`).join("")}</div>`;
  }
  const sansMatch = () => `<section class="carte"><h2>Pas de match prévu</h2><p class="discret">Aucune rencontre dans les 6 prochaines semaines. Les matchs arrivent des PV du District ; les amicaux et plateaux s'ajoutent dans le calendrier de la console.</p><a class="esga-btn" href="../#calendrier">Ouvrir le calendrier</a></section>`;
  function coachMatch() {
    const match = matchCourant(), s = sondageMatch();
    if (!match) return sansMatch();
    if (!s) return `<section class="carte">${carteMatch(match)}${sondageOuvert(match)
      ? `<p>Le sondage de présence n'est pas encore lancé pour ce match.</p><button class="esga-btn esga-btn-or" data-action="sondage-match">Lancer le sondage dans Annonces</button>`
      : `<p>Le sondage s'ouvre 10 jours avant la rencontre : vous pourrez le lancer à partir du <b>${esc(dateOuverture(match))}</b>.</p>`}</section>`;
    const cpt = [0, 0, 0], sans = [];
    etat.joueurs.forEach((j) => (s.reponses[j.id] === undefined ? sans.push(j) : cpt[s.reponses[j.id]]++));
    return `<section class="carte">${carteMatch(match)}${s.match !== match.id ? `<p class="discret petit">Sondage commun du week-end : « ${esc(s.question)} »</p>` : ""}
      <div class="jauge">${cpt.map((n, i) => (n ? `<span class="j-${CLES_MATCH[i]}" style="flex:${n}"></span>` : "")).join("")}${sans.length ? `<span class="j-aucune" style="flex:${sans.length}"></span>` : ""}</div>
      <div class="legende"><span><i class="j-oui"></i>${cpt[0]} présent${e_()}${cpt[0] > 1 ? "s" : ""}</span><span><i class="j-incertain"></i>${cpt[1]} peut-être</span><span><i class="j-non"></i>${cpt[2]} absent${e_()}${cpt[2] > 1 ? "s" : ""}</span><span><i class="j-aucune"></i>${sans.length} sans réponse</span></div>
      <div class="actions">${sans.length ? `<button class="esga-btn" data-relancer="${s.id}">Relancer les ${sans.length} sans réponse</button>` : ""}
        <button class="esga-btn esga-btn-or" data-coach="convoc">Faire la convocation ›</button></div></section>
      <section class="carte"><h2>Réponses</h2><p class="discret petit">Touchez une réponse pour la changer (si une famille vous a répondu de vive voix).</p>
      <ul class="reponses">${etat.joueurs.map((j) => `<li><span class="nom">${esc(j.nom)}</span><span class="mini">${OPTIONS_MATCH.map((lib, i) => `<button class="pastille p-${CLES_MATCH[i]}${s.reponses[j.id] === i ? " choisi" : ""}" data-pour="${s.id}|${j.id}|${i}">${lib}</button>`).join("")}</span></li>`).join("")}</ul></section>`;
  }
  function moinsMinutes(h, min) { const [a, b] = h.split(":").map(Number); const t = (a * 60 + b - min + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; }
  function nouveauBrouillon() {
    const match = matchCourant(), c = derniereConvocation();
    if (c) {
      const b = JSON.parse(JSON.stringify({ joueurs: c.joueurs, formation: c.formation, postes: c.postes, rdvHeure: c.rdvHeure, rdvLieu: c.rdvLieu, tenue: c.tenue, mot: c.mot }));
      const emp = Object.keys(c.empechements || {});
      b.joueurs = b.joueurs.filter((j) => !emp.includes(j)); b.postes = b.postes.map((p) => (emp.includes(p) ? null : p));
      b.plus = !!maxConv() && b.joueurs.length > maxConv();
      return b;
    }
    const formation = FORMATIONS[match.format][match.format === 11 ? 1 : 0];
    const b = { joueurs: etat.joueurs.filter((j) => reponseMatch(j.id) === "oui").map((j) => j.id).slice(0, maxConv() || 99), formation, postes: places(formation).map(() => null),
      rdvHeure: moinsMinutes(match.heure, match.domicile ? 60 : 90), rdvLieu: match.domicile ? match.lieu.split(",")[0] + " (vestiaires)" : "Parking du stade Edmond Pouzet (covoiturage)",
      tenue: "Tenue du club, protège-tibias, gourde", mot: "" };
    return b;
  }
  function remplirAuto(b) { const libres = b.joueurs.filter((j) => !b.postes.includes(j)); b.postes = b.postes.map((p) => p || libres.shift() || null); }
  function coachConvoc() {
    const match = matchCourant(), c = derniereConvocation();
    if (!match) return sansMatch();
    if (c && !brouillon) return `<section class="carte"><div class="carte-tete"><h2>Convocation publiée</h2><button class="esga-btn" id="btnModifierConvoc">${IC.crayon} Modifier</button></div>${vueConvocation(c)}</section>`;
    if (!brouillon) brouillon = nouveauBrouillon();
    const b = brouillon, cpt = { oui: 0, incertain: 0, non: 0, aucune: 0 }, mx = maxConv();
    etat.joueurs.forEach((j) => cpt[reponseMatch(j.id) || "aucune"]++);
    const LIB = { oui: "Présent", incertain: "Peut-être", non: "Absent" };
    return `<section class="carte"><h2>${c ? "Modifier la convocation" : "Convocation"}</h2>${carteMatch(match)}
      <p class="resume-sondage">${sondageMatch() ? `Sondage : <b>${cpt.oui}</b> présent${e_()}${cpt.oui > 1 ? "s" : ""}, <b>${cpt.incertain}</b> peut-être, <b>${cpt.non}</b> absent${e_()}${cpt.non > 1 ? "s" : ""}, <b>${cpt.aucune}</b> sans réponse.` : "Le sondage n'est pas lancé pour ce match : cochez les convoqué" + e_() + "s vous-même."}</p>
      <form id="formConvoc" class="form">
        <fieldset class="large"><legend>1. Convoqué${e_()}s <span class="discret">(${b.joueurs.length}${mx ? " / " + mx + " maximum" : ""})</span></legend>
          <p class="discret petit">Les « Présent » du sondage sont déjà cochés.</p>
          ${mx ? `<label class="case exception"><input type="checkbox" id="convPlus"${b.plus ? " checked" : ""}><span>Exceptionnellement, convoquer plus de ${mx} ${fem() ? "joueuses" : "joueurs"}</span></label>` : ""}
          <div class="cases">${etat.joueurs.map((j) => { const r = reponseMatch(j.id); return `<label class="case"><input type="checkbox" name="j" value="${j.id}"${b.joueurs.includes(j.id) ? " checked" : ""}><span>${esc(j.nom)}</span><span class="etiquette e-${r || "aucune"}">${r ? LIB[r] : "?"}</span></label>`; }).join("")}</div>
        </fieldset>
        <fieldset class="large grille2"><legend>2. Rendez-vous</legend>
          <label>Heure<input type="time" name="rdvHeure" required value="${esc(b.rdvHeure)}"></label>
          <label>Lieu<input name="rdvLieu" required value="${esc(b.rdvLieu)}"></label>
          <label class="large">Tenue et affaires<input name="tenue" value="${esc(b.tenue)}"></label>
          <label class="large">Mot du coach (facultatif)<textarea name="mot" rows="2" placeholder="Ex. : prévenez-moi au plus vite en cas d'empêchement.">${esc(b.mot)}</textarea></label>
        </fieldset>
        <div class="actions large"><button class="esga-btn esga-btn-or">${c ? "Republier dans Annonces" : "Publier dans Annonces"}</button>
          ${c ? `<button type="button" class="esga-btn" id="btnAnnulerEdition">Annuler</button>` : ""}</div>
      </form></section>`;
  }
  function lireChampsBrouillon() { const f = $("#formConvoc"); if (!f || !brouillon) return; ["rdvHeure", "rdvLieu", "tenue", "mot"].forEach((k) => (brouillon[k] = f.elements[k].value)); }
  function coachEntrainements() {
    const total = etat.joueurs.length;
    return `<section class="carte"><h2>Prochains entraînements</h2><div class="seances">${seances(moi.equipe).map((s) => {
      const abs = etat.absences.filter((a) => a.seance === s.id), ap = etat.appel[s.id] || {};
      const absent = (jid) => ap[jid] === "absent" || (!ap[jid] && abs.some((a) => a.joueur === jid));
      const nAbs = etat.joueurs.filter((j) => absent(j.id)).length;
      const aValider = abs.filter((a) => ap[a.joueur] !== "absent").length;
      return `<div class="seance"><div class="seance-tete"><div><b>${esc(libSeance(s))}</b><div class="discret">${esc(s.lieu)}</div></div>
          <div class="compte${nAbs ? " a-absents" : ""}">${total - nAbs}/${total}<small>attendu${e_()}s</small></div></div>
        ${nAbs ? `<div class="noms-abs">Absent${e_()}s : ${etat.joueurs.filter((j) => absent(j.id)).map((j) => esc(j.nom)).join(", ")}</div>` : ""}
        ${aValider ? `<div class="a-valider"><span>${pluriel(aValider, "absence")} prévenue${aValider > 1 ? "s" : ""} à noter</span><button class="mini-btn" data-noter-tout="${s.id}">Tout noter</button></div>` : ""}
        <details class="feuille"${aValider ? " open" : ""}><summary>Feuille de présence</summary><ul>${etat.joueurs.map((j) => {
          const a = abs.find((x) => x.joueur === j.id), est = ap[j.id] === "absent";
          return `<li class="${est ? "est-absent" : ""}${a && !est ? " prevenu" : ""}"><span class="nom">${esc(j.nom)}${a ? `<small>Prévenu : ${esc(a.motif)}${a.precision ? " · « " + esc(a.precision) + " »" : ""}</small>` : ""}</span>
            <button class="bascule ${est ? "abs" : "pres"}" data-appel="${s.id}|${j.id}">${est ? "Absent" + e_() : a ? "Noter absent" + e_() : "Présent" + e_()}</button></li>`;
        }).join("")}</ul></details></div>`;
    }).join("")}</div></section>`;
  }

  /* ---------- petites aides ---------- */
  function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2600); }
  function copier(t) {
    const ok = () => toast("Texte copié : collez-le dans WhatsApp ou un SMS.");
    const secours = () => { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); ok(); } catch (e) {} a.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, secours); else secours();
  }
  function diffuser(t) { if (estCoach() && navigator.share) navigator.share({ title: "Convocation ESGA", text: t }).catch(() => {}); else copier(t); }
  function ouvrirConv(id) { moi.conv = id; moi.espace = "discussions"; moi.mobileChat = true; ecrireMoi(); $("#menuPlus").hidden = true; rendre(); if (matchMedia("(min-width: 761px)").matches) $("#saisie").focus(); }
  function convPerso(p) {
    let c = etat.convs.find((x) => x.type === "perso" && x.membres.includes(p) && x.membres.includes(moi.profil));
    if (!c) { c = { id: "c-" + uid(), type: "perso", membres: [moi.profil, p], creePar: moi.profil, date: maintenant() }; etat.convs.push(c); S.ecrire(moi.equipe, etat); }
    return c.id;
  }
  // Où va un message « officiel » d'un parent (absence) : la conversation ouverte si le coach y est, sinon le groupe de l'équipe
  const convPourCoach = (id) => (conv(id) && conv(id).membres.includes("coach") ? id : "equipe");

  /* ---------- clics ---------- */
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("button, [data-fermer]");
    if (ev.target.id === "modale") return fermerModale();
    if (!$("#menuPlus").hidden && !ev.target.closest("#menuPlus, #btnPlus")) $("#menuPlus").hidden = true;
    if (!$("#ctx").hidden && !ev.target.closest("#ctx, .m-plus")) fermerCtx();
    if (!t) return;
    const d = t.dataset;
    if (d.ctx) { ev.stopPropagation(); return $("#ctx").hidden || $("#ctx").dataset.id !== d.ctx ? (ouvrirCtx(d.ctx, t), ($("#ctx").dataset.id = d.ctx)) : fermerCtx(); }
    if (d.reagir) {
      const [id, e] = d.reagir.split("|"), m = etat.messages.find((x) => x.id === id);
      m.reactions = m.reactions || {};
      if (m.reactions[moi.profil] === e) delete m.reactions[moi.profil]; else m.reactions[moi.profil] = e;
      fermerCtx(); return sauver();
    }
    if (d.repondreA) { reponseA = d.repondreA; fermerCtx(); rendreChat(); return $("#saisie").focus(); }
    if (t.id === "btnAnnulerReponse") { reponseA = null; return rendreChat(); }
    if (d.copierMsg) { const m = etat.messages.find((x) => x.id === d.copierMsg); fermerCtx(); const ok = () => toast("Message copié."); return navigator.clipboard ? navigator.clipboard.writeText(m.texte).then(ok, ok) : ok(); }
    if (d.epingler) { const m = etat.messages.find((x) => x.id === d.epingler), c = conv(m.conv); c.epingle = c.epingle === m.id ? null : m.id; fermerCtx(); toast(c.epingle ? "Message épinglé en haut de la conversation." : "Message désépinglé."); return sauver(); }
    if (d.vu) { fermerCtx(); return modaleLu(d.vu); }
    if (d.supprimer) { const m = etat.messages.find((x) => x.id === d.supprimer); m.supprime = true; delete m.texte; delete m.src; fermerCtx(); const c = conv(m.conv); if (c.epingle === m.id) c.epingle = null; return sauver(); }
    if (d.allerMsg) return allerMsg(d.allerMsg);
    if (t.id === "versBas") { const f = $("#fil"); f.scrollTo({ top: f.scrollHeight, behavior: "smooth" }); nouveauxEnBas = 0; return; }
    if (d.zoom) { const m = etat.messages.find((x) => x.id === d.zoom); return ouvrirModale("Photo", `<img class="photo-zoom" src="${m.src}" alt="">${m.texte ? `<p>${esc(m.texte)}</p>` : ""}<p class="discret petit">${esc(nomAuteur(m))} · ${esc(fmtJour(m.date, { day: "numeric", month: "long" }))} à ${fmtHeure(m.date)}</p>`, true); }
    if (t.id === "btnPhoto") return $("#fichierPhoto").click();
    if (d.replier !== undefined) { moi.semaineFerme = !moi.semaineFerme; ecrireMoi(); return rendreSemaine(); }
    if (d.empechement) return modaleEmpechement(d.empechement);
    if (d.annonces) { const c = conv(d.annonces); c.annonces = !c.annonces; poster(c.id, { type: "info", texte: c.annonces ? "Seuls les coachs et les dirigeants peuvent maintenant écrire dans ce groupe" : "Tout le monde peut de nouveau écrire dans ce groupe" }); fermerModale(); return sauver(); }
    if (d.fermer !== undefined) return fermerModale();
    if (d.espace) { moi.espace = d.espace; ecrireMoi(); return rendre(); }
    if (d.matchChoisi) { if (moi.match !== d.matchChoisi) brouillon = null; moi.match = d.matchChoisi; ecrireMoi(); return rendre(); }
    if (d.coach) {
      if (d.match && d.match !== (matchCourant() || {}).id) { moi.match = d.match; brouillon = null; }
      if (d.revoir && derniereConvocation()) brouillon = nouveauBrouillon();
      moi.coachOnglet = d.coach; moi.espace = "coach"; ecrireMoi(); rendre(); return window.scrollTo(0, 0);
    }
    if (d.ouvrir) { reponseA = null; return ouvrirConv(d.ouvrir); }
    if (d.retour !== undefined) { moi.mobileChat = false; ecrireMoi(); return rendre(); }
    if (d.infos) return modaleInfos(d.infos);
    if (t.id === "btnGroupe") return estCoach() ? modaleGroupe() : toast("Seuls les coachs et les dirigeants créent les groupes. Pour un covoiturage, écrivez dans le Blabla de l'équipe.");
    if (t.id === "btnPerso") return modalePerso();
    if (d.perso) { const id = convPerso(d.perso); fermerModale(); fermerCtx(); reponseA = null; return ouvrirConv(id); }
    if (t.id === "btnPlus") { $("#menuPlus").hidden = !$("#menuPlus").hidden; return; }
    if (d.action) {
      $("#menuPlus").hidden = true;
      if (d.action === "sondage") return modaleSondage(moi.conv);
      if (d.action === "absence") return modaleAbsence(moi.conv);
      if (d.action === "absence-coach") { const j = enfantConv(conv(moi.conv)); return j ? modaleAbsence(moi.conv, j) : modaleChoixJoueur("absence-pour"); }
      if (d.action === "match-coach") { const j = enfantConv(conv(moi.conv)); return j ? modaleActionsJoueur(j) : modaleChoixJoueur("act-joueur"); }
      if (d.action === "envoyer-convoc") { const c = derniereConvocation(); poster(moi.conv, { type: "convocation", convoc: c.id }); toast("Convocation envoyée dans la conversation."); return sauver(); }
      if (d.action === "convoc") { moi.coachOnglet = "convoc"; moi.espace = "coach"; ecrireMoi(); return rendre(); }
      if (d.action === "sondage-match") {
        fermerModale();
        const m = (d.match && matchDe(d.match)) || matchCourant();
        if (!m) return toast("Pas de match prévu dans les 6 prochaines semaines.");
        const ex = sondageMatch(m.id);
        if (ex) { toast("Le sondage de ce match est déjà lancé."); return ouvrirConv(ex.conv); }
        // Règle du club : le sondage s'ouvre 10 jours avant la rencontre (avant, les familles ne savent pas encore)
        if (!sondageOuvert(m)) return toast(`Trop tôt : le sondage pourra être lancé à partir du ${dateOuverture(m)}.`);
        const s = { id: "s-" + uid(), conv: "annonces", auteur: moi.profil, date: maintenant(), type: "match", match: m.id, question: `${maj1(jourMatch(m))} · ${maj1(titreMatch(m))} : qui est disponible ?`, options: OPTIONS_MATCH, reponses: {} };
        etat.sondages.push(s); poster("annonces", { type: "sondage", sondage: s.id });
        conv("annonces").epingle = etat.messages[etat.messages.length - 1].id;
        CLUB.lancerSondage(m.id);
        toast("Sondage publié dans Annonces.");
        sauver(); return ouvrirConv("annonces");
      }
    }
    if (t.id === "btnAjoutOpt") {
      const box = $("#optsSondage"); if (box.children.length >= 6) return;
      box.insertAdjacentHTML("beforeend", `<input name="opt" maxlength="60" placeholder="Option ${box.children.length + 1}">`); box.lastElementChild.focus(); return;
    }
    if (d.voter) {
      const [sid, i] = d.voter.split("|"), s = sondage(sid), v = votant(s);
      if (!v || s.clos) return;
      if (s.reponses[v] === +i) delete s.reponses[v]; else s.reponses[v] = +i;
      return sauver();
    }
    if (d.pour) { const [sid, jid, i] = d.pour.split("|"), s = sondage(sid); if (s.reponses[jid] === +i) delete s.reponses[jid]; else s.reponses[jid] = +i; return sauver(); }
    if (d.votes) return modaleVotes(d.votes);
    if (d.actJoueur) return modaleActionsJoueur(d.actJoueur);
    if (d.absencePour) return modaleAbsence(moi.conv, d.absencePour);
    if (d.matchPour) {
      const [jid, i] = d.matchPour.split("|"), s = sondageMatch(); if (!s) return;
      s.reponses[jid] = +i;
      poster(moi.conv, { type: "info", texte: `${nomCoach()} : ${joueur(jid).nom} · ${OPTIONS_MATCH[+i].toLowerCase()} au match` });
      fermerModale(); toast(`${joueur(jid).nom} : ${OPTIONS_MATCH[+i]} au match.`); return sauver();
    }
    if (d.relancer) {
      const s = sondage(d.relancer);
      const sans = (s.type === "match" ? etat.joueurs.map((j) => j.id) : conv(s.conv).membres).filter((k) => s.reponses[k] === undefined);
      poster(s.conv, { type: "relance", sondage: s.id, noms: sans.map((k) => (s.type === "match" ? joueur(k).nom : nomProfil(k))) });
      fermerModale(); toast(s.conv === "annonces" ? "Rappel publié dans Annonces." : "Rappel envoyé dans la conversation."); return sauver();
    }
    if (d.clore) { sondage(d.clore).clos = true; fermerModale(); return sauver(); }
    if (d.noter) { const [sid, jid] = d.noter.split("|"); (etat.appel[sid] = etat.appel[sid] || {})[jid] = "absent"; toast(`${joueur(jid).nom} noté${e_()} absent${e_()}.`); return sauver(); }
    if (d.noterTout) { const ap = (etat.appel[d.noterTout] = etat.appel[d.noterTout] || {}); etat.absences.filter((a) => a.seance === d.noterTout).forEach((a) => (ap[a.joueur] = "absent")); return sauver(); }
    if (d.appel) { const [sid, jid] = d.appel.split("|"), ap = (etat.appel[sid] = etat.appel[sid] || {}); ap[jid] = ap[jid] === "absent" ? "present" : "absent"; return sauver(); }
    if (d.annulerAbsence) {
      const a = etat.absences.find((x) => x.id === d.annulerAbsence); if (!a) return;
      etat.absences = etat.absences.filter((x) => x !== a);
      if (a.deClub) CLUB.setDispo(a.seance, idClub(a.joueur), null);
      if (etat.appel[a.seance]) delete etat.appel[a.seance][a.joueur];
      poster(convPourCoach(moi.conv), { type: "texte", texte: `Finalement, ${joueur(a.joueur).nom} sera bien là à l'entraînement du ${libSeance(seance(a.seance))}.` });
      fermerModale(); return sauver();
    }
    if (d.voirConvoc) { if (!$("#modale").hidden) fermerModale(); return modaleConvoc(d.voirConvoc); }
    if (d.lu) { const c = etat.convocations.find((x) => x.id === d.lu); if (c && !c.vus.includes(monEnfant())) c.vus.push(monEnfant()); sauver(); if (!$("#modale").hidden) modaleConvoc(c.id); return; }
    if (d.diffuser) return diffuser(texteConvocation(etat.convocations.find((x) => x.id === d.diffuser)));
    if (d.modifierGroupe) return modaleMembres(d.modifierGroupe);
    if (d.quitter) { const c = conv(d.quitter); c.membres = c.membres.filter((p) => p !== moi.profil); poster(c.id, { type: "info", texte: `${nomProfil(moi.profil)} a quitté le groupe` }); moi.conv = "equipe"; ecrireMoi(); fermerModale(); return sauver(); }
    if (t.id === "btnModifierConvoc") { brouillon = nouveauBrouillon(); return rendre(); }
    if (t.id === "btnAnnulerEdition") { brouillon = null; return rendre(); }
    if (t.id === "btnAuto" && brouillon) { lireChampsBrouillon(); remplirAuto(brouillon); return rendre(); }
    if (t.id === "btnVider" && brouillon) { lireChampsBrouillon(); brouillon.postes = brouillon.postes.map(() => null); return rendre(); }
    if (t.id === "btnReinitialiser" && demo()) { S.effacer(moi.equipe); charger(); brouillon = null; moi.conv = "equipe"; ecrireMoi(); toast("Démo remise à zéro pour cette équipe."); return rendre(); }
  });

  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { if (!$("#modale").hidden) fermerModale(); $("#menuPlus").hidden = true; fermerCtx(); if (reponseA) { reponseA = null; rendreChat(); } } });
  $("#recherche").addEventListener("input", rendreListe);

  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.id === "choixEquipe") { if (!estStaffPG() || !EQUIPES.includes(t.value)) return; moi.equipe = t.value; moi.profil = "coach"; moi.conv = "equipe"; moi.match = null; ecrireMoi(); brouillon = null; charger(); return rendre(); }
    if (t.id === "choixProfil") {
      if (!estStaffPG() || !demo()) return;
      moi.profil = t.value; brouillon = null;
      if (!conv(moi.conv) || !conv(moi.conv).membres.includes(moi.profil)) moi.conv = "equipe";
      ecrireMoi(); return rendre();
    }
    if (!brouillon) return;
    if (t.id === "convPlus") { brouillon.plus = t.checked; return; }
    if (t.name === "j") {
      lireChampsBrouillon();
      const mx = maxConv();
      if (t.checked && mx && !brouillon.plus && brouillon.joueurs.length >= mx) { t.checked = false; return toast(`${mx} maximum pour ce format. Cochez « Exceptionnellement » pour en convoquer plus.`); }
      if (t.checked) brouillon.joueurs = etat.joueurs.map((j) => j.id).filter((x) => x === t.value || brouillon.joueurs.includes(x));
      else { brouillon.joueurs = brouillon.joueurs.filter((x) => x !== t.value); brouillon.postes = brouillon.postes.map((p) => (p === t.value ? null : p)); }
      rendre();
    } else if (t.id === "choixFormation") {
      lireChampsBrouillon();
      const anciens = brouillon.postes.filter(Boolean);
      brouillon.formation = t.value; brouillon.postes = places(t.value).map((_, i) => anciens[i] || null);
      remplirAuto(brouillon); rendre();
    } else if (t.dataset.poste != null) {
      lireChampsBrouillon();
      const i = +t.dataset.poste, id = t.value || null, avant = brouillon.postes[i], ailleurs = id ? brouillon.postes.indexOf(id) : -1;
      if (ailleurs >= 0 && ailleurs !== i) brouillon.postes[ailleurs] = avant; // les deux postes s'échangent
      brouillon.postes[i] = id; rendre();
    }
  });

  document.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = ev.target, d = new FormData(f);
    if (f.id === "formEnvoi") {
      const texte = $("#saisie").value.trim(); if (!texte) return;
      poster(moi.conv, Object.assign({ type: "texte", texte }, reponseA ? { reponseA } : {})); reponseA = null;
      $("#saisie").value = ""; ajusterSaisie(); const f = $("#fil"); sauver(); f.scrollTop = f.scrollHeight; return;
    }
    if (f.id === "formGroupe") {
      const membres = [moi.profil, ...d.getAll("m").filter((p) => p !== moi.profil)];
      if (membres.length < 2) return toast("Ajoutez au moins un membre.");
      const c = { id: "c-" + uid(), type: "groupe", nom: d.get("nom").trim(), membres, creePar: moi.profil, date: maintenant() };
      etat.convs.push(c); poster(c.id, { type: "info", texte: `${nomProfil(moi.profil)} a créé le groupe « ${c.nom} »` });
      fermerModale(); sauver(); return ouvrirConv(c.id);
    }
    if (f.id === "formMembres") {
      const c = conv(f.dataset.conv); c.membres = [moi.profil, ...d.getAll("m").filter((p) => p !== moi.profil)];
      if (!c.membres.includes(c.creePar)) c.membres.push(c.creePar);
      fermerModale(); toast("Membres mis à jour."); return sauver();
    }
    if (f.id === "formSondage") {
      const options = d.getAll("opt").map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) return toast("Il faut au moins deux options.");
      const s = { id: "s-" + uid(), conv: f.dataset.conv, auteur: moi.profil, date: maintenant(), type: "libre", question: d.get("question").trim(), options, reponses: {} };
      etat.sondages.push(s); poster(s.conv, { type: "sondage", sondage: s.id }); fermerModale(); return sauver();
    }
    if (f.id === "formAbsence") {
      const a = { id: uid(), seance: d.get("seance"), joueur: f.dataset.joueur, motif: d.get("motif"), precision: (d.get("precision") || "").trim(), par: moi.profil, date: maintenant() };
      if (!a.seance || etat.absences.some((x) => x.joueur === a.joueur && x.seance === a.seance)) return toast("Absence déjà signalée pour cette séance.");
      etat.absences.push(a);
      if (estCoach()) (etat.appel[a.seance] = etat.appel[a.seance] || {})[a.joueur] = "absent"; // noté directement par le coach
      const cible = estCoach() ? f.dataset.conv : convPourCoach(f.dataset.conv);
      poster(cible, { type: "absence", joueur: a.joueur, seance: a.seance, motif: a.motif });
      fermerModale(); toast(estCoach() ? `${joueur(a.joueur).nom} noté${e_()} absent${e_()}.` : "Le coach est prévenu."); sauver(); if (cible !== moi.conv) ouvrirConv(cible); return;
    }
    if (f.id === "formEmpechement") {
      const c = etat.convocations.find((x) => x.id === f.dataset.convoc), j = monEnfant();
      c.empechements = c.empechements || {};
      c.empechements[j] = { motif: d.get("motif"), precision: (d.get("precision") || "").trim(), date: maintenant() };
      const sm = sondageMatch(c.match); if (sm) sm.reponses[j] = 2;
      const pc = convPerso("coach");
      poster(pc, { type: "empechement", joueur: j, match: c.match, motif: d.get("motif"), precision: (d.get("precision") || "").trim() });
      fermerModale(); toast("Le coach est prévenu en privé."); return sauver();
    }
    if (f.id === "formConvoc") {
      lireChampsBrouillon();
      const b = brouillon, m = matchCourant(), mx = maxConv(); if (!m) return;
      if (!b.joueurs.length) return toast(`Cochez au moins un${e_()} ${fem() ? "joueuse" : "joueur"}.`);
      if (mx && !b.plus && b.joueurs.length > mx) return toast(`${mx} maximum : décochez-en ou cochez « Exceptionnellement ».`);
      const ancienne = derniereConvocation();
      const c = Object.assign({}, m, { id: uid(), match: m.id, joueurs: b.joueurs.slice(), formation: b.formation, postes: b.postes.slice(), rdvHeure: b.rdvHeure, rdvLieu: b.rdvLieu.trim(), tenue: b.tenue.trim(), mot: b.mot.trim(), publiee: maintenant(),
        // Une famille qui avait lu garde son « lu » seulement si son enfant reste dans le même cas
        vus: ancienne ? ancienne.vus.filter((id) => ancienne.joueurs.includes(id) === b.joueurs.includes(id)) : [] });
      etat.convocations.push(c); poster("annonces", { type: "convocation", convoc: c.id });
      conv("annonces").epingle = etat.messages[etat.messages.length - 1].id;
      brouillon = null; toast(ancienne ? "Convocation mise à jour dans Annonces." : "Convocation publiée dans Annonces.");
      return sauver();
    }
  });

  function ajusterSaisie() { const s = $("#saisie"); s.style.height = "auto"; s.style.height = Math.min(s.scrollHeight, 140) + "px"; }
  $("#saisie").addEventListener("input", ajusterSaisie);
  $("#saisie").addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey && !matchMedia("(pointer: coarse)").matches) { ev.preventDefault(); $("#formEnvoi").requestSubmit(); } });
  $("#btnPlus").innerHTML = IC.plus; $("#btnEnvoyer").innerHTML = IC.envoyer; $("#btnPhoto").innerHTML = IC.photo;
  $("#fil").addEventListener("scroll", () => majVersBas(), { passive: true });
  // Photo : réduite à 900 px dans le navigateur avant l'envoi
  $("#fichierPhoto").addEventListener("change", (ev) => {
    const f = ev.target.files[0]; ev.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height)), cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        const legende = $("#saisie").value.trim();
        poster(moi.conv, Object.assign({ type: "photo", src: cv.toDataURL("image/jpeg", 0.72), texte: legende }, reponseA ? { reponseA } : {}));
        reponseA = null; $("#saisie").value = ""; ajusterSaisie();
        try { sauver(); } catch (e) { toast("Photo trop lourde pour la démo."); }
        const fl = $("#fil"); fl.scrollTop = fl.scrollHeight;
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(f);
  });

  // La console (ou un autre module) a modifié le socle du club
  CLUB.surChangement(() => { if (!etat) return; const avant = JSON.stringify(etat); depuisClub(); if (JSON.stringify(etat) !== avant) { S.ecrire(moi.equipe, etat); rendre(); } });
  // Un autre onglet a écrit : on relit
  S.surChangement((equipe) => { if (equipe === moi.equipe) { const e = S.lire(equipe); if (e && e.version === VERSION) { notifierNouveaux(etat, e); etat = e; rendre(); } } });

  /* ---------- démarrage ---------- */
  CLUB.pret.then(() => {
    // Le profil choisi à l'accueil décide de tout : pas de profil, on passe d'abord par « Qui êtes-vous ? »
    PG = CLUB.profil();
    if (PG && CLUB.enLigne.actif && CLUB.enLigne.role === "famille" && estStaffPG()) PG = null; // code familles : pas d'accès staff
    const pj = PG && PG.joueur && CLUB.personne(PG.joueur);
    if (!PG || (!estStaffPG() && !pj)) { location.replace(CLUB.BASE + "#bienvenue"); return; }
    EQUIPES = CLUB.equipesDe(PG).filter((e) => CLUB.equipe(e));
    if (!EQUIPES.length) { document.body.classList.remove("chargement"); document.body.innerHTML = `<p class="vide-liste" style="padding:24px">Aucune équipe ne vous est attribuée pour l'instant. <a href="${CLUB.BASE}">Retour à l'accueil</a></p>`; return; }
    // Profil changé à l'accueil depuis la dernière visite de cet onglet : on repart de zéro
    const cle = JSON.stringify(PG);
    if (moi.pg !== cle) moi = { pg: cle };
    const q = new URLSearchParams(location.search), demande = q.get("equipe"), match = q.get("match"); // liens depuis l'accueil
    if (demande && EQUIPES.includes(demande) && demande !== moi.equipe) { moi.equipe = demande; moi.conv = "equipe"; moi.match = null; brouillon = null; }
    if (!EQUIPES.includes(moi.equipe)) moi.equipe = pj ? pj.equipe : PG.role === "dirigeant" && EQUIPES.includes("U15F-2") ? "U15F-2" : EQUIPES[0];
    charger();
    if (!estStaffPG()) moi.profil = "p-" + idMsg(pj.id); // une famille est toujours elle-même
    else if (!demo() || !tousProfils().includes(moi.profil)) moi.profil = "coach";
    if (match && matchDe(match)) { moi.match = match; if (estCoach()) { moi.espace = "coach"; moi.coachOnglet = q.get("onglet") === "convoc" ? "convoc" : "match"; } }
    if (!moi.conv) moi.conv = "equipe";
    if (!moi.espace) moi.espace = "discussions";
    ecrireMoi(); rendre();
    document.body.classList.remove("chargement");
  });
})();
