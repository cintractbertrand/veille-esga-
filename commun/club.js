/* Socle commun du club ESGA : licenciés, staff, équipes, créneaux, calendrier,
   convocations, présences et disponibilités. Tous les modules lisent et écrivent ici
   (Console du club, Messagerie, Monteur vidéo, Lecture des PV).

   Usage :  <script src="../commun/club.js"></script>   puis   CLUB.pret.then(() => …)
   Les licenciés, le staff et les équipes sont disponibles tout de suite (CLUB.joueurs(…)) ;
   les matchs officiels arrivent avec CLUB.pret (lus dans data/matchs.json, issu des PV).

   Sans code : démo, tout est gardé dans ce navigateur (localStorage, onglets synchronisés).
   Avec le code du club (CLUB.enLigne.connecter) : les données sont partagées par Supabase
   (supabase/esga_en_ligne.sql). Le navigateur garde une copie pour aller vite et tenir sans réseau ;
   les modifications partent toutes seules et celles des autres arrivent toutes les 15 s. */
(function () {
  "use strict";
  const script = document.currentScript;
  const BASE = new URL("../", script ? script.src : location.href).href;
  const CLE = "esga-club:v1";
  const VERSION = 1;
  const SAISON = { libelle: "2026-2027", debut: "2026-07-01", fin: "2027-06-30", annee: 2027 };

  /* ---------- en ligne : un document par sujet ('club', 'messagerie:<équipe>'), avec version ----------
     Si deux appareils écrivent en même temps, le second relit et fusionne (champ par champ,
     listes par identifiant) avant de renvoyer : personne ne perd sa modification. */
  const NUAGE = (function () {
    const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
    const URL_ = ls("esga-nuage-url") || "https://bkebcwjkorqdpckcqtwq.supabase.co";
    const CLE_API = "sb_publishable_x_SzQDiP3WP28PGi8Y1OPw_-eKd9HQq"; // clé publique : sans le code du club, elle n'ouvre rien
    let code = ls("esga-code") || null, role = code ? ls("esga-role") : null, etat = code ? "connexion" : "demo";
    const docs = {}, ops = [], ecoutes = [];
    const changer = (e) => { if (e !== etat) { etat = e; ecoutes.forEach((cb) => { try { cb(); } catch (x) {} }); } };
    const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).sort().reduce((o, c) => ((o[c] = v[c]), o), {}) : v));
    const pareil = (a, b) => a === b || canon(a) === canon(b);
    const copie = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
    const objet = (x) => x && typeof x === "object" && !Array.isArray(x);
    const avecId = (x) => Array.isArray(x) && x.every((y) => objet(y) && y.id != null);
    function fusion(b, l, s) { // b = dernière version lue, l = ici, s = en ligne
      if (pareil(l, b)) return s; if (pareil(s, b) || pareil(l, s)) return l;
      if (avecId(l) && avecId(s) && (b === undefined || avecId(b))) {
        const ix = (t) => Object.fromEntries((t || []).map((y) => [y.id, y])), m = fusion(ix(b), ix(l), ix(s));
        return [...new Set(s.map((y) => y.id).concat(l.map((y) => y.id)))].filter((id) => id in m).map((id) => m[id]);
      }
      if (objet(l) && objet(s) && (b === undefined || objet(b))) {
        const r = {}; new Set(Object.keys(l).concat(Object.keys(s))).forEach((k) => { const v = fusion(b && b[k], l[k], s[k]); if (v !== undefined) r[k] = v; }); return r;
      }
      return l;
    }
    async function rpc(fn, corps) {
      const h = { "Content-Type": "application/json", apikey: CLE_API }; if (!CLE_API.startsWith("sb_")) h.Authorization = "Bearer " + CLE_API;
      let r; try { r = await fetch(URL_ + "/rest/v1/rpc/" + fn, { method: "POST", headers: h, body: JSON.stringify(corps) }); } catch (e) { const x = new Error("hors ligne"); x.reseau = true; throw x; }
      const j = await r.json().catch(() => null);
      if (!r.ok) { const x = new Error((j && j.message) || "erreur " + r.status); x.conflit = /conflit/.test(x.message); x.code = /code du club/.test(x.message); throw x; }
      return j;
    }
    const peutEcrire = (cle) => role === "staff" || (role === "famille" && cle.startsWith("messagerie:"));
    const meta = (cle) => { try { return JSON.parse(ls("esga-nuage:" + cle)) || {}; } catch (e) { return {}; } };
    const garder = (cle, d) => ls("esga-nuage:" + cle, JSON.stringify({ version: d.version, sale: d.sale }));
    function erreur(e) {
      if (e.code) { code = role = null; ls("esga-code", null); ls("esga-role", null); changer("code"); return; }
      changer(e.reseau ? "hors-ligne" : "erreur"); console.warn("Club en ligne :", e.message);
    }
    function suivre(cle, lire, appliquer) {
      if (docs[cle]) return; const m = meta(cle);
      docs[cle] = { lire, appliquer, version: m.version || 0, sale: !!m.sale, base: undefined, connu: false };
      if (code) { clearTimeout(suivre.t); suivre.t = setTimeout(tirer, 30); }
    }
    function marquer(cle) {
      const d = docs[cle]; if (!d || !code || !peutEcrire(cle)) return;
      d.sale = true; garder(cle, d); clearTimeout(d.t); d.t = setTimeout(() => pousser(cle), 800);
    }
    function recevoir(cle, s) {
      const d = docs[cle]; if (cle === "club" && ops.length) return; // réponses de la famille pas encore parties
      const sv = s ? s.version : 0, sd = s ? s.data : undefined, local = d.lire();
      let res = sd;
      if (peutEcrire(cle) && local) { // pas encore en ligne : on publie la copie de cet appareil
        if (sd === undefined) res = local; else if (d.sale) res = fusion(d.connu ? d.base : undefined, local, sd);
      }
      d.version = sv; d.base = copie(sd); d.connu = true;
      if (res !== undefined && !pareil(res, local)) d.appliquer(copie(res));
      d.sale = peutEcrire(cle) && res !== undefined && !pareil(res, sd); garder(cle, d);
      return d.sale ? pousser(cle) : null;
    }
    async function pousser(cle) {
      const d = docs[cle]; if (!code || !d || !d.sale || !peutEcrire(cle)) return;
      if (d.envoi) { d.encore = true; return; }
      d.envoi = true; clearTimeout(d.t); const data = copie(d.lire());
      try {
        d.version = await rpc("esga_ecrire", { code, cle_: cle, data_: data, version_: d.version });
        d.base = data; d.connu = true; d.essais = 0; d.sale = !pareil(d.lire(), data); garder(cle, d); changer("ok");
      } catch (e) {
        if (e.conflit && (d.essais = (d.essais || 0) + 1) < 5) { d.envoi = false; if (enCours) encore = true; else setTimeout(tirer, 0); return; } // relire, fusionner, renvoyer
        erreur(e);
      } finally { d.envoi = false; if (d.encore) { d.encore = false; if (d.sale) marquer(cle); } }
    }
    let enCours = null, encore = false;
    function tirer(force) {
      if (!code) return Promise.resolve();
      if (enCours) { encore = true; return enCours; }
      enCours = (async () => {
        const cles = Object.keys(docs);
        try {
          const v = await rpc("esga_versions", { code, cles }); role = v._role; ls("esga-role", role);
          const a = cles.filter((k) => !docs[k].connu || (v[k] || 0) !== docs[k].version);
          const envois = [];
          if (a.length) { const r = await rpc("esga_lire", { code, cles: a }); a.forEach((k) => envois.push(recevoir(k, r[k]))); }
          cles.filter((k) => !a.includes(k) && docs[k].sale).forEach((k) => envois.push(pousser(k)));
          await Promise.all(envois);
          changer("ok");
        } catch (e) { erreur(e); }
      })().finally(() => { enCours = null; if (encore) { encore = false; tirer(); } });
      return enCours;
    }
    async function viderOps() {
      if (viderOps.c) return; viderOps.c = true;
      while (ops.length && code) {
        try { await rpc("esga_famille", { code, op: ops[0] }); ops.shift(); }
        catch (e) { if (e.reseau) { erreur(e); break; } console.warn("Club en ligne :", e.message); ops.shift(); }
      }
      viderOps.c = false; if (!ops.length) tirer(true);
    }
    function op(o) { if (!code || role !== "famille") return false; ops.push(o); viderOps(); return true; }
    async function connecter(c) {
      c = String(c || "").trim(); if (!c) throw new Error("Tapez le code du club.");
      let r; try { r = await rpc("esga_versions", { code: c, cles: [] }); } catch (e) { throw new Error(e.code ? "Code incorrect." : e.reseau ? "Pas de réseau." : e.message); }
      code = c; role = r._role; ls("esga-code", c); ls("esga-role", role);
      Object.keys(docs).forEach((k) => { Object.assign(docs[k], { version: 0, sale: false, connu: false, base: undefined }); garder(k, docs[k]); });
      changer("connexion"); await tirer(true); return role;
    }
    function deconnecter() {
      try { Object.keys(localStorage).filter((k) => k.startsWith("esga-nuage:") || k.startsWith("esga-messagerie:") || k === CLE).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
      ls("esga-code", null); ls("esga-role", null); code = role = null; changer("demo");
    }
    if (code) {
      setInterval(() => { if (!document.hidden) tirer(); }, 15000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) tirer(); });
      window.addEventListener("online", () => { tirer(); viderOps(); });
    }
    // Petit document à part (commentaire audio d'une séquence) : écrit une fois, lu à la demande
    async function ecrireSeul(cle, data) {
      if (!code || !peutEcrire(cle)) return false;
      try { const v = await rpc("esga_versions", { code, cles: [cle] }); await rpc("esga_ecrire", { code, cle_: cle, data_: data, version_: v[cle] || 0 }); return true; } catch (e) { erreur(e); return false; }
    }
    async function lireSeul(cle) { if (!code) return null; try { const r = await rpc("esga_lire", { code, cles: [cle] }); return r[cle] ? r[cle].data : null; } catch (e) { erreur(e); return null; } }
    // Plusieurs documents lus d'un coup, sans les suivre (récapitulatif de la console : messageries des équipes)
    async function lireDocs(cles) { const o = {}; if (!code || !cles.length) return o; try { const r = await rpc("esga_lire", { code, cles }); cles.forEach((k) => { if (r && r[k]) o[k] = r[k].data; }); } catch (e) { erreur(e); } return o; }
    return { suivre, marquer, tirer, op, connecter, deconnecter, fusion, ecrireSeul, lireSeul, lireDocs, surEtat: (cb) => ecoutes.push(cb),
      get actif() { return !!code; }, get role() { return role; }, get etat() { return etat; } };
  })();

  /* ---------- copie locale (et démo) ---------- */
  const STOCKAGE = {
    get mode() { return NUAGE.actif ? "en-ligne" : "demo"; },
    lire() { try { return JSON.parse(localStorage.getItem(CLE)); } catch (e) { return null; } },
    ecrire(d, recu) { if (!recu) NUAGE.marquer("club"); try { localStorage.setItem(CLE, JSON.stringify(d)); return true; } catch (e) { return false; } },
    effacer() { try { localStorage.removeItem(CLE); } catch (e) {} },
    surChangement(cb) { window.addEventListener("storage", (ev) => { if (ev.key === CLE) cb(); }); },
  };

  /* ---------- outils ---------- */
  const uid = (p) => (p ? p + "-" : "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const jour = (s) => new Date(s + "T12:00");
  const ajout = (s, n) => { const d = jour(s); d.setDate(d.getDate() + n); return iso(d); };
  const auj = () => iso(new Date());
  function alea(graine) { let a = 0; for (const c of graine) a = (a * 31 + c.charCodeAt(0)) >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- catégories de la saison ---------- */
  // Catégorie d'âge d'après l'année de naissance (saison 2026-2027 : U15 = nés en 2012 et 2013)
  function categorieAge(naissance, genre) {
    if (!naissance) return "";
    const age = SAISON.annee - +naissance.slice(0, 4);
    const f = genre === "F";
    if (age <= 7) return "U7"; if (age <= 9) return "U9"; if (age <= 11) return "U11"; if (age <= 13) return "U13";
    if (age <= 15) return f ? "U15F" : "U15"; if (age <= 17) return f ? "U18F" : "U17";
    if (age <= 18) return f ? "U18F" : "U18"; if (age <= 20) return f ? "Seniors F" : "U20";
    if (age >= 35 && !f) return "Vétérans"; return f ? "Seniors F" : "Seniors";
  }

  /* ---------- données de démonstration ---------- */
  const PRENOMS_G = ["Léo", "Nathan", "Yanis", "Lucas", "Adam", "Hugo", "Ilyes", "Gabriel", "Noah", "Rayan", "Tom", "Sacha", "Enzo", "Mathis", "Kylian", "Jules", "Rayane", "Ethan", "Nolan", "Maël", "Aaron", "Bilal", "Théo", "Samuel", "Imran", "Louis", "Amir", "Timéo", "Malik", "Evan"];
  const PRENOMS_F = ["Léa", "Inès", "Jade", "Chloé", "Lina", "Manon", "Sarah", "Emma", "Zoé", "Maëlys", "Louise", "Nina", "Camille", "Assia", "Lou", "Romane", "Alice", "Yasmine", "Clara", "Anaïs", "Lucie", "Elsa", "Margaux", "Kenza", "Julia", "Océane", "Lilou", "Mila"];
  const NOMS = ["Martin", "Bernard", "Kaci", "Durand", "Roux", "Petit", "Thomas", "Lambert", "Simon", "Fontaine", "Chevalier", "Vidal", "Garnier", "Haddad", "André", "Nicolas", "Mercier", "Benali", "Faure", "Girard", "Blanc", "Guerin", "Boyer", "Morel", "Rousseau", "Diallo", "Perrin", "Marchand", "Dupuis", "Leroy", "Barbier", "Brun", "Moulin", "Lopez", "Ferrand", "Colin", "Masson", "Renaud", "Aubert", "Belkacem"];
  const POSTES = ["Gardien", "Défenseur", "Défenseur", "Défenseur", "Milieu", "Milieu", "Milieu", "Attaquant", "Attaquant"];
  const LIEUX = ["Stade Edmond Pouzet", "Stade Léon Garaud", "Stade Marcel Gonzales"];
  // Équipes de la saison (les matchs officiels viennent des PV ; les plateaux U7 à U13 n'ont pas de matchs dans les PV)
  const EQUIPES = [
    ["Seniors-1", "Seniors", 1, "M", 11], ["Seniors-2", "Seniors", 2, "M", 11], ["Seniors-3", "Seniors", 3, "M", 11],
    ["Seniors F-1", "Seniors F", 1, "F", 11], ["Seniors F-2", "Seniors F", 2, "F", 11],
    ["Vétérans-35", "Vétérans", 35, "M", 11], ["U20-1", "U20", 1, "M", 11],
    ["U18F-1", "U18F", 1, "F", 11], ["U18F-2", "U18F", 2, "F", 11],
    ["U17-1", "U17", 1, "M", 11], ["U17-2", "U17", 2, "M", 11],
    ["U15-1", "U15", 1, "M", 11], ["U15-2", "U15", 2, "M", 11], ["U15-3", "U15", 3, "M", 11], ["U15-4", "U15", 4, "M", 11],
    ["U15F-2", "U15F", 2, "F", 11],
    ["U13-1", "U13", 1, "X", 8], ["U13-2", "U13", 2, "X", 8], ["U11-1", "U11", 1, "X", 8], ["U11-2", "U11", 2, "X", 8],
    ["U9-1", "U9", 1, "X", 5], ["U7-1", "U7", 1, "X", 4],
  ];
  // Équipe d'un match du PV (la Gambardella U18 est jouée par les U17 1)
  const ALIAS = { "U18-21": "U17-1" };
  const NAISSANCE = { "Seniors": [1992, 2006], "Seniors F": [1994, 2007], "Vétérans": [1975, 1991], "U20": [2007, 2008], "U18F": [2009, 2011], "U17": [2010, 2010], "U15": [2012, 2013], "U15F": [2012, 2013], "U13": [2014, 2015], "U11": [2016, 2017], "U9": [2018, 2019], "U7": [2020, 2021] };
  // U15F 2 : mêmes joueuses que la messagerie et le Monteur vidéo (numéros du Monteur)
  const U15F2 = [["Léa", "Martin", 3, "Défenseur"], ["Inès", "Bernard", 5, "Défenseur"], ["Jade", "Kaci", 8, "Milieu"], ["Chloé", "Durand", 9, "Attaquant"], ["Lina", "Roux", 11, "Attaquant"], ["Manon", "Petit", 6, "Milieu"], ["Sarah", "Thomas", 10, "Milieu"], ["Emma", "Lambert", 1, "Gardien"], ["Zoé", "Simon", 14, "Défenseur"], ["Maëlys", "Fontaine", 4, "Défenseur"], ["Louise", "Chevalier", 7, "Milieu"], ["Nina", "Vidal", 2, "Défenseur"], ["Camille", "Garnier", 12, "Milieu"], ["Assia", "Haddad", 13, "Attaquant"], ["Lou", "André", 15, "Défenseur"], ["Romane", "Nicolas", 16, "Gardien"]];
  const STAFF = [
    ["Michel", "Garnier", "president", [], "Président"], ["Sophie", "Lambert", "secretaire", [], "Secrétaire générale"],
    ["Patrick", "Morel", "dirigeant", [], "Responsable sportif"], ["Nadia", "Belkacem", "dirigeant", [], "Responsable féminines"],
    ["Karim", "Haddad", "coach", ["Seniors-1"]], ["Julien", "Faure", "coach", ["Seniors-2"]], ["Olivier", "Brun", "coach", ["Seniors-3", "Vétérans-35"]],
    ["Stéphanie", "Roux", "coach", ["Seniors F-1"]], ["Mehdi", "Kaci", "coach", ["Seniors F-2"]], ["Thomas", "Girard", "coach", ["U20-1"]],
    ["Claire", "Mercier", "coach", ["U18F-1", "U18F-2"]], ["Antoine", "Perrin", "coach", ["U17-1"]],
    ["Romain", "Dupuis", "coach", ["U15-1"]], ["Yacine", "Benali", "coach", ["U15-2"]], ["David", "Colin", "coach", ["U15-3", "U15-4"]],
    ["Julie", "Marchand", "coach", ["U15F-2"]], ["Lucas", "Moulin", "adjoint", ["U15F-2"]],
    ["Sébastien", "Leroy", "coach", ["U13-1", "U13-2"]], ["Hélène", "Aubert", "coach", ["U11-1"]], ["Marc", "Renaud", "coach", ["U9-1", "U7-1"]],
  ]; // U17-2 et U11-2 sans coach : à pourvoir (visible dans le tableau de bord)

  function creneauxDe(id, cat) {
    const soir = /Seniors|Vétérans|U20/.test(cat) ? "19:30" : /U1[13]|U9|U7/.test(cat) ? "17:30" : "18:30";
    if (cat === "Vétérans") return [[4, "20:00", 90]];
    if (/U7|U9/.test(cat)) return [[3, "14:00", 75]];
    if (/U11|U13/.test(cat)) return [[3, "14:00", 90], [5, soir, 75]];
    return [[2, soir, 90], [4, soir, 90]];
  }

  function graine() {
    const r = alea("esga-2026");
    const tel = () => "06 " + Array.from({ length: 4 }, () => String(Math.floor(r() * 90) + 10)).join(" ");
    const pick = (t) => t[Math.floor(r() * t.length)];
    const d = { version: VERSION, saison: SAISON.libelle, maj: new Date().toISOString(),
      club: { nom: "ES Genas Azieu", court: "ESGA", numero: "523341", ville: "Genas", email: "contact@esga.example", lieux: LIEUX.slice() },
      equipes: [], personnes: [], staff: [], creneaux: [], evenements: [], exceptions: {}, convocations: [], presences: {}, dispos: {} };
    EQUIPES.forEach(([id, cat, num, genre, format]) => {
      const nb = EQUIPES.filter((e) => e[1] === cat).length;
      d.equipes.push({ id, categorie: cat, numero: num, genre, format, nom: nb > 1 ? `${cat} ${num}` : cat });
      creneauxDe(id, cat).forEach(([j, h, duree], i) => d.creneaux.push({ id: `cr-${id}-${i}`, equipe: id, jour: j, heure: h, duree, lieu: LIEUX[(i + num) % 2] }));
      const rr = alea(id), fem = genre === "F" || (genre === "X" && false);
      const [a0, a1] = NAISSANCE[cat];
      const n = id === "U15F-2" ? 16 : format === 11 ? 16 + Math.floor(rr() * 5) : format === 8 ? 12 + Math.floor(rr() * 3) : 10;
      const pris = new Set();
      for (let k = 0; k < n; k++) {
        let prenom, nom, numero, poste, g = fem ? "F" : genre === "X" && rr() < .25 ? "F" : "M";
        if (id === "U15F-2") [prenom, nom, numero, poste] = U15F2[k];
        else {
          do { prenom = (g === "F" ? PRENOMS_F : PRENOMS_G)[Math.floor(rr() * (g === "F" ? PRENOMS_F : PRENOMS_G).length)]; nom = NOMS[Math.floor(rr() * NOMS.length)]; } while (pris.has(prenom + nom));
          numero = format >= 8 ? k + 1 : null; poste = k === 0 ? "Gardien" : format >= 8 ? POSTES[1 + Math.floor(rr() * 8)] : "";
        }
        pris.add(prenom + nom);
        const an = a0 + Math.floor(rr() * (a1 - a0 + 1)), mo = 1 + Math.floor(rr() * 12), jo = 1 + Math.floor(rr() * 28);
        const mineur = SAISON.annee - an < 18, x = rr();
        d.personnes.push({ id: `j-${id.replace(/\s/g, "")}-${k + 1}`, prenom, nom, genre: g, naissance: `${an}-${String(mo).padStart(2, "0")}-${String(jo).padStart(2, "0")}`,
          equipe: id, numero, poste, licence: { numero: String(2540000000 + Math.floor(rr() * 9e6)), statut: x < .08 ? "en_attente" : x < .12 ? "a_renouveler" : "validee" },
          certificat: rr() < .07 ? "a_fournir" : "ok", tel: mineur ? "" : tel(), email: "",
          contacts: mineur ? [{ nom: `${pick(["Mme", "M."])} ${nom}`, lien: pick(["Mère", "Père", "Mère", "Père", "Tuteur"]), tel: tel(), email: `${nom.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}.famille@exemple.fr` }] : [],
          notes: "" });
      }
    });
    STAFF.forEach(([prenom, nom, role, equipes, fonction], i) => d.staff.push({ id: "s-" + (i + 1), prenom, nom, role, fonction: fonction || "", equipes, tel: tel(), email: `${prenom.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}.${nom.toLowerCase()}@esga.example`, diplome: role === "coach" ? pick(["CFF1", "CFF2", "CFF3", "BMF", "Aucun"]) : "" }));
    // Événements du club
    const t = auj();
    d.evenements.push({ id: "ev-ag", equipe: null, type: "reunion", titre: "Réunion des éducateurs", date: ajout(t, 5), heure: "19:00", duree: 90, lieu: "Club-house", notes: "Bilan de la phase aller, planning des plateaux." });
    const samedi = ajout(t, ((6 - jour(t).getDay() + 7) % 7) || 7);
    d.evenements.push({ id: "ev-amical-u15f", equipe: "U15F-2", type: "amical", titre: "ESGA – Chassieu Décines (amical)", adversaire: "Chassieu Décines", domicile: true, date: ajout(samedi, 1), heure: "10:30", duree: 90, lieu: "Stade Edmond Pouzet", competition: "Match amical", notes: "Match de préparation avant la reprise du championnat." });
    d.evenements.push({ id: "ev-plateau", equipe: "U9-1", type: "plateau", titre: "Plateau U9 à domicile", date: ajout(t, 8), heure: "10:00", duree: 180, lieu: "Stade Edmond Pouzet", notes: "6 clubs invités. Besoin de 4 parents pour le goûter." });
    d.evenements.push({ id: "ev-tournoi", equipe: "U13-1", type: "tournoi", titre: "Tournoi de Meyzieu", date: ajout(t, 15), heure: "09:00", duree: 420, lieu: "Meyzieu", notes: "" });
    return d;
  }

  /* ---------- état ---------- */
  let D = STOCKAGE.lire();
  if (!D || D.version !== VERSION) { D = graine(); STOCKAGE.ecrire(D); }
  const completer = (d) => { d.feuilles = d.feuilles || {}; d.sondages = d.sondages || {}; d.seances = d.seances || {}; d.videos = d.videos || {}; d.envois = d.envois || []; d.rappels = d.rappels || {}; return d; }; // données plus anciennes
  completer(D);
  let MATCHS = []; // matchs officiels (data/matchs.json)
  const abonnes = [];
  const notifier = () => abonnes.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  let enLot = 0, sale = false;
  function sauver() { if (enLot) { sale = true; return; } D.maj = new Date().toISOString(); STOCKAGE.ecrire(D); notifier(); }
  STOCKAGE.surChangement(() => { const n = STOCKAGE.lire(); if (n && n.version === VERSION) { D = completer(n); notifier(); } });
  NUAGE.suivre("club", () => D, (n) => { n.version = VERSION; D = completer(n); STOCKAGE.ecrire(D, true); notifier(); });
  NUAGE.surEtat(notifier);

  /* ---------- calendrier : matchs des PV + entraînements des créneaux + événements ---------- */
  function matchEvt(m) {
    const eq = ALIAS[`${m.categorie}-${m.equipe}`] || `${m.categorie}-${m.equipe}`;
    const adv = (m.a_domicile ? m.exterieur : m.domicile).replace(/\s+\d+$/, "");
    const id = "m-" + m.numero, ex = D.exceptions[id] || {};
    return Object.assign({ id, equipe: eq, type: "match", source: "pv", titre: (m.a_domicile ? "ESGA – " : "") + adv + (m.a_domicile ? "" : " – ESGA"),
      adversaire: adv, domicile: !!m.a_domicile, date: m.date, heure: m.heure || "15:00", duree: 105, lieu: (m.lieu || "").replace(/\s+à\s*$/, "").replace(/\s+à\s+/, ", "),
      competition: m.competition, coupe: /coupe/i.test(m.competition), pv: m.pv, statut: "prevu" }, ex);
  }
  function entrainements(du, au, equipe) {
    const out = [];
    D.creneaux.filter((c) => !equipe || c.equipe === equipe).forEach((c) => {
      let d = jour(du); const fin = jour(au);
      while (d.getDay() !== c.jour % 7) d.setDate(d.getDate() + 1);
      for (; d <= fin; d.setDate(d.getDate() + 7)) {
        const date = iso(d), id = `e-${c.id}-${date}`, ex = D.exceptions[id] || {};
        if (vacances(date)) continue;
        out.push(Object.assign({ id, equipe: c.equipe, type: "entrainement", source: "creneau", creneau: c.id, titre: "Entraînement", date, heure: c.heure, duree: c.duree, lieu: c.lieu, statut: "prevu" }, ex));
      }
    });
    return out;
  }
  // Vacances scolaires zone A 2026-2027 (Lyon) : pas d'entraînement des créneaux
  const VACANCES = [["2026-10-17", "2026-11-01"], ["2026-12-19", "2027-01-03"], ["2027-02-06", "2027-02-21"], ["2027-04-03", "2027-04-18"]];
  const vacances = (date) => VACANCES.some(([a, b]) => date >= a && date <= b);

  function evenements({ equipe, equipes, du, au, types } = {}) {
    du = du || ajout(auj(), -60); au = au || ajout(auj(), 120);
    const garde = (e) => (!equipe || e.equipe === equipe || (e.equipe == null && !equipes)) && (!equipes || equipes.includes(e.equipe) || e.equipe == null) && (!types || types.includes(e.type)) && e.date >= du && e.date <= au;
    const liste = [...MATCHS.map(matchEvt), ...entrainements(du, au, equipe), ...D.evenements.map((e) => Object.assign({ source: "manuel", statut: "prevu", duree: 90 }, e))];
    return liste.filter(garde).sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
  }
  function evenement(id) {
    if (id.startsWith("m-")) { const m = MATCHS.find((x) => "m-" + x.numero === id); return m ? matchEvt(m) : null; }
    if (id.startsWith("e-")) { const date = id.slice(-10), cr = id.slice(2, -11); const c = D.creneaux.find((x) => x.id === cr); return c ? entrainements(date, date, c.equipe).find((e) => e.id === id) || null : null; }
    const e = D.evenements.find((x) => x.id === id); return e ? Object.assign({ source: "manuel", statut: "prevu", duree: 90 }, e) : null;
  }

  /* ---------- historique de démo : présences des entraînements passés ---------- */
  function presencesDemo() {
    if (NUAGE.actif) return; // en ligne : les vraies données du club, pas d'exemples ajoutés
    seancesDemo(); videosDemo();
    if (D.presencesDemo) { if (!D.matchsDemo) { matchsDemo(alea("matchs")); STOCKAGE.ecrire(D); } return; }
    const r = alea("presences");
    entrainements(ajout(auj(), -42), ajout(auj(), -1)).forEach((e) => {
      const p = (D.presences[e.id] = D.presences[e.id] || {});
      joueurs(e.equipe).forEach((j) => { if (!(j.id in p)) { const x = r(); p[j.id] = x < .78 ? "present" : x < .86 ? "retard" : x < .94 ? "excuse" : "absent"; } });
    });
    // Disponibilités signalées pour la semaine qui vient (reprises par la messagerie)
    const prochains = entrainements(auj(), ajout(auj(), 6), "U15F-2");
    if (prochains[0]) D.dispos[prochains[0].id] = { "j-U15F-2-5": { statut: "absent", motif: "Malade", precision: "Fièvre depuis hier", par: "messagerie", date: new Date().toISOString() }, "j-U15F-2-9": { statut: "absent", motif: "École / devoirs", precision: "Contrôle de maths le lendemain", par: "messagerie", date: new Date().toISOString() } };
    // Une partie des convocations du week-end sont déjà faites par les coachs (sauf U15F 2, pour essayer)
    MATCHS.map(matchEvt).filter((e) => e.date >= auj() && e.date <= ajout(auj(), 3) && e.equipe !== "U15F-2").forEach((e) => {
      if (r() < .55) {
        const q = D.equipes.find((x) => x.id === e.equipe), mx = q && q.format === 11 ? 14 : q && q.format === 8 ? 11 : 10; // règle du club : 14 à 11, 11 à 8
        const js = joueurs(e.equipe).filter((j) => j.certificat === "ok").slice(0, mx).map((j) => j.id);
        const [h, mn] = e.heure.split(":").map(Number), t = h * 60 + mn - (e.domicile ? 60 : 90);
        D.convocations.push({ id: uid("cv"), evenement: e.id, equipe: e.equipe, joueurs: js, rdvHeure: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`, rdvLieu: e.domicile ? "Vestiaires du stade" : "Parking du stade Edmond Pouzet", tenue: "Tenue du club, protège-tibias", mot: "", publiee: new Date(Date.now() - 864e5 * (1 + r())).toISOString(), source: "console" });
      }
    });
    // Réponses au sondage du match amical U15F 2 (les mêmes que dans la messagerie)
    const so = (statut, motif) => ({ statut, motif, par: "sondage", date: new Date().toISOString() });
    D.dispos["ev-amical-u15f"] = Object.assign(D.dispos["ev-amical-u15f"] || {}, { "j-U15F-2-4": so("absent", "Absent (sondage)"), "j-U15F-2-5": so("absent", "Absent (sondage)"), "j-U15F-2-7": so("incertain", "Peut-être (sondage)") });
    D.presencesDemo = true; matchsDemo(r); STOCKAGE.ecrire(D);
  }

  // U15F 2 : une séance déjà préparée dans l'Atelier pour le 2e entraînement à venir (le coach choisit lequel)
  function seancesDemo() {
    if (D.seancesDemo) return; D.seancesDemo = true;
    const e = entrainements(auj(), ajout(auj(), 28), "U15F-2").filter((x) => x.date > auj()).sort((a, b) => a.date.localeCompare(b.date))[1]; if (!e) return;
    D.seances[e.id] = { nom: "Conservation et jeu vers l'avant", duree: e.duree, source: "atelier", auteur: "Julie Marchand", maj: new Date().toISOString(), lien: "https://cintractbertrand.github.io/atelier-foot/site/",
      materiel: "16 ballons, 24 coupelles, 12 chasubles, 4 mini-buts",
      exercices: [{ titre: "Échauffement : passes en mouvement", theme: "échauffement", duree: 15 }, { titre: "Rondo 4 contre 2", theme: "technique", duree: 15 },
        { titre: "Conservation 5 contre 5 + 2 appuis", theme: "jeu réduit", duree: 20, variante: "2 touches maximum" }, { titre: "Match à thème : jouer vers l'avant", theme: "tactique", duree: 25 }, { titre: "Retour au calme et étirements", theme: "retour au calme", duree: 5 }] };
    STOCKAGE.ecrire(D);
  }

  // U15F 2 : la vidéo de démonstration du Monteur reliée au dernier match joué, et deux séquences déjà envoyées
  function videosDemo() {
    if (D.videosDemo || !MATCHS.length) return;
    const m = MATCHS.map(matchEvt).filter((e) => e.equipe === "U15F-2" && e.date < auj()).sort((a, b) => a.date.localeCompare(b.date)).pop(); if (!m) return;
    D.videosDemo = true;
    D.videos[m.id] = { url: BASE + "analyse-video/demo/duchere.mp4", titre: "Vidéo du match (extrait de démonstration)", source: "monteur", maj: new Date().toISOString() };
    const js = joueurs("U15F-2"), num = (n) => (js.find((p) => p.numero === n) || {}).id, de = "Julie Marchand";
    const t = new Date(jour(ajout(m.date, 1))); t.setHours(20, 15);
    D.envois.push({ id: "env-demo-1", evt: m.id, equipe: "U15F-2", a: "equipe", debut: 4, fin: 13, nom: "Transition : l'appel dans la profondeur", note: "Bel enchaînement ! C'est ce qu'on veut voir dès la récupération.", genre: "bien", de, date: t.toISOString(), vus: {}, sequence: "s1" });
    if (num(3)) D.envois.push({ id: "env-demo-2", evt: m.id, equipe: "U15F-2", a: [num(3)], debut: 17, fin: 27, nom: "Placement : resserre vers l'axe", note: "Regarde ta position au moment de la relance adverse, on en reparle mardi.", genre: "corriger", de, date: t.toISOString(), vus: {}, sequence: "s2" });
    STOCKAGE.ecrire(D);
  }

  // U15F 2 : matchs déjà joués avec convocation et feuille de match (score, buts, passes décisives)
  function matchsDemo(r) {
    if (D.matchsDemo) return;
    const SCORES = { "Ent. Ols Charly": [3, 1], "As Saint Priest": [1, 1], "Chassieu Decines Fc": [2, 0], "Sevenne F.C.": [0, 2], "F.C. Gerland Lyon": [4, 2], "Us Villette D Anthon": [2, 3], "A.S. De Montchat Lyo": [1, 0] };
    const js = joueurs("U15F-2");
    MATCHS.map(matchEvt).filter((e) => e.equipe === "U15F-2" && e.date < auj()).forEach((e) => {
      const conv = js.filter((j) => j.certificat === "ok" && r() < .9).slice(0, 14).map((j) => j.id);
      if (!D.convocations.some((c) => c.evenement === e.id)) D.convocations.push({ id: uid("cv"), evenement: e.id, equipe: e.equipe, joueurs: conv, rdvHeure: "13:30", rdvLieu: e.domicile ? "Vestiaires du stade" : "Parking du stade Edmond Pouzet", tenue: "Tenue du club", mot: "", publiee: ajout(e.date, -3) + "T18:00:00.000Z", source: "console" });
      const [nous, eux] = SCORES[e.adversaire] || [1, 1], stats = {};
      const attaque = conv.filter((id) => /Attaquant|Milieu/.test((personne(id) || {}).poste));
      for (let b = 0; b < nous; b++) {
        const bu = attaque[Math.floor(r() * attaque.length)] || conv[0]; (stats[bu] = stats[bu] || { buts: 0, passes: 0 }).buts++;
        if (r() < .7) { const pa = conv[Math.floor(r() * conv.length)]; if (pa !== bu) (stats[pa] = stats[pa] || { buts: 0, passes: 0 }).passes++; }
      }
      D.feuilles[e.id] = { nous, eux, joueurs: conv.filter(() => r() < .95), stats, notes: "", saisie: ajout(e.date, 1) + "T10:00:00.000Z" };
    });
    // Sondage du match amical déjà lancé, avec les mêmes réponses que dans la messagerie (Zoé n'a pas répondu)
    const so = (statut, motif) => ({ statut, motif, par: "sondage", date: new Date().toISOString() });
    const rep = { 1: "present", 2: "present", 3: "present", 4: "absent", 5: "absent", 6: "present", 7: "incertain", 8: "present", 10: "present", 11: "present", 12: "present", 13: "present", 14: "present", 15: "present", 16: "present" };
    const dm = (D.dispos["ev-amical-u15f"] = D.dispos["ev-amical-u15f"] || {});
    Object.entries(rep).forEach(([k, v]) => { const id = "j-U15F-2-" + k; if (!dm[id]) dm[id] = so(v, v === "present" ? "Présent (sondage)" : v === "absent" ? "Absent (sondage)" : "Peut-être (sondage)"); });
    D.sondages["ev-amical-u15f"] = D.sondages["ev-amical-u15f"] || { lance: new Date(Date.now() - 4 * 3600e3).toISOString() };
    D.matchsDemo = true;
  }

  /* ---------- lecture ---------- */
  const equipe = (id) => D.equipes.find((e) => e.id === id) || null;
  const joueurs = (eq) => D.personnes.filter((p) => !eq || p.equipe === eq).sort((a, b) => (a.numero || 99) - (b.numero || 99) || a.nom.localeCompare(b.nom, "fr"));
  const personne = (id) => D.personnes.find((p) => p.id === id) || null;
  const staffDe = (eq) => D.staff.filter((s) => s.equipes.includes(eq)).sort((a, b) => (a.role === "coach" ? 0 : 1) - (b.role === "coach" ? 0 : 1));
  const coachDe = (eq) => staffDe(eq).find((s) => s.role === "coach") || staffDe(eq)[0] || null;
  const nomEquipe = (id) => { const e = equipe(id); return e ? e.nom : id || "Club"; };
  const nomComplet = (p) => p ? `${p.prenom} ${p.nom}` : "?";
  // Rencontres : ce qui se prépare avec un sondage et une convocation (plateaux et tournois de l'école de foot compris)
  const RENCONTRES = ["match", "amical", "plateau", "tournoi"];
  const rencontres = (eq, du, au) => evenements({ equipe: eq, du: du || auj(), au, types: RENCONTRES }).filter((e) => e.statut !== "annule" && !!e.equipe && (!eq || e.equipe === eq));
  const prochainMatch = (eq) => rencontres(eq)[0] || null;
  // Le sondage de disponibilité s'ouvre 10 jours avant la rencontre (pas avant : les familles ne savent pas encore)
  const JOURS_SONDAGE = 10;
  const ouvertureSondage = (e) => ajout(e.date, -JOURS_SONDAGE);
  const sondagePossible = (e) => !!e && e.date >= auj() && auj() >= ouvertureSondage(e);
  // Week-end d'une date (vendredi → dimanche) ; un jour de semaine renvoie au week-end qui suit
  function weekend(d) { const j = jour(d).getDay(), ven = ajout(d, j === 0 ? -2 : j === 6 ? -1 : j === 5 ? 0 : 5 - j); return { du: ven, au: ajout(ven, 2) }; }
  // Équipes d'un profil : tout le club (dirigeant), ses équipes (coach), l'équipe de l'enfant (famille)
  function equipesDe(p) {
    if (!p) return [];
    if (p.role === "dirigeant") return D.equipes.map((e) => e.id);
    if (p.role === "coach") { const s = D.staff.find((x) => x.id === p.staff); return s ? s.equipes.slice() : []; }
    const j = personne(p.joueur); return j ? [j.equipe] : [];
  }
  const prochainsEntrainements = (eq, n = 6) => evenements({ equipe: eq, du: auj(), types: ["entrainement"] }).filter((e) => e.statut !== "annule").slice(0, n);
  const convocation = (evt) => D.convocations.filter((c) => c.evenement === evt).slice(-1)[0] || null;
  function tauxPresence(jid, n = 8) {
    const evs = entrainements(ajout(auj(), -70), ajout(auj(), -1)).filter((e) => D.presences[e.id] && jid in D.presences[e.id]).slice(-n);
    if (!evs.length) return null;
    return Math.round(100 * evs.filter((e) => ["present", "retard"].includes(D.presences[e.id][jid])).length / evs.length);
  }

  /* ---------- écriture ---------- */
  const COLL = { personnes: "j", staff: "s", equipes: "eq", creneaux: "cr", evenements: "ev" };
  function enregistrer(coll, obj) {
    const t = D[coll]; if (!t) throw new Error("Collection inconnue : " + coll);
    if (!obj.id) { obj.id = uid(COLL[coll]); if (coll === "evenements") obj.cree = new Date().toISOString(); } // date de création : récapitulatif « depuis votre dernière connexion »
    const i = t.findIndex((x) => x.id === obj.id);
    if (i >= 0) t[i] = Object.assign({}, t[i], obj); else t.push(obj);
    sauver(); return obj.id;
  }
  function supprimer(coll, id) { D[coll] = D[coll].filter((x) => x.id !== id); sauver(); }
  function modifierEvenement(id, champs) {
    champs = Object.assign({}, champs, { modifie: new Date().toISOString() });
    if (id.startsWith("m-") || id.startsWith("e-")) D.exceptions[id] = Object.assign({}, D.exceptions[id], champs);
    else { const e = D.evenements.find((x) => x.id === id); if (e) Object.assign(e, champs); }
    sauver();
  }
  function setPresence(evt, jid, statut) { const p = (D.presences[evt] = D.presences[evt] || {}); if ((p[jid] || null) === (statut || null)) return; if (statut) p[jid] = statut; else delete p[jid]; sauver(); }
  // Sondage commun du week-end : une réponse vaut pour tous les matchs liés (choix du coach)
  const lies = (evt) => { const s = D.sondages[evt]; return s && s.lies ? s.lies.filter((x) => x !== evt) : []; };
  function setDispo(evt, jid, info, seul) {
    const p = (D.dispos[evt] = D.dispos[evt] || {});
    if (!info && !p[jid] && (seul || !lies(evt).length)) return;
    if (info) p[jid] = Object.assign({ date: new Date().toISOString() }, info); else delete p[jid];
    if (seul) return;
    NUAGE.op({ type: "dispo", evt, jid, info: info || null }); // famille : la réponse part seule (le reste du club est en lecture)
    lies(evt).forEach((x) => setDispo(x, jid, info, true));
    sauver();
  }
  // Plusieurs écritures d'un coup : un seul enregistrement à la fin
  function lot(fn) { enLot++; try { fn(); } finally { enLot--; if (!enLot && sale) { sale = false; sauver(); } } }
  function publierConvocation(c) {
    const e = evenement(c.evenement);
    const conv = Object.assign({ id: uid("cv"), equipe: e && e.equipe, publiee: new Date().toISOString(), source: "console" }, c);
    D.convocations.push(conv); sauver(); return conv;
  }
  function majClub(champs) { Object.assign(D.club, champs); sauver(); }
  // Feuille de match : { nous, eux, joueurs: [ids ayant joué], stats: { id: { buts, passes } }, notes }
  function setFeuille(evt, f) { D.feuilles[evt] = Object.assign({ saisie: new Date().toISOString() }, f); sauver(); }
  // Sondage de disponibilité d'un match : lancé depuis la console ou la messagerie, réponses dans dispos
  function lancerSondage(evt, relance, avec) {
    const s = D.sondages[evt]; if (s && !relance) return;
    if (!s && !sondagePossible(evenement(evt))) return false;
    const groupe = avec && avec.length ? [evt, ...avec] : (s && s.lies) || null, t = new Date().toISOString();
    (groupe || [evt]).forEach((x) => { const s0 = D.sondages[x]; D.sondages[x] = Object.assign({}, s0, s0 && relance ? { relance: t } : { lance: t }, groupe ? { lies: groupe } : {}); });
    sauver();
  }
  // Séance préparée dans l'Atelier, rattachée à un entraînement choisi par le coach (pas forcément le prochain)
  // s = { nom, duree, exercices: [{ titre, theme, duree, variante, note }], materiel, lien, auteur }
  function setSeance(evt, s) { if (s) D.seances[evt] = Object.assign({ maj: new Date().toISOString(), source: "atelier" }, s); else delete D.seances[evt]; sauver(); }
  // Vidéo d'un match (lien YouTube, Veo, Drive… ou vidéo du Monteur) et séquences envoyées aux joueurs
  function setVideo(evt, v) { if (v && v.url) D.videos[evt] = Object.assign({ maj: new Date().toISOString() }, v); else delete D.videos[evt]; sauver(); }
  // o = { evt, equipe, a: "equipe" | [ids joueurs], debut, fin (secondes), nom, note, genre ("bien" | "corriger"), de, sequence (id Monteur) }
  function envoyerSequence(o) {
    const son = o.voix || "", e = Object.assign({ id: uid(), date: new Date().toISOString(), vus: {} }, o, { voix: !!son });
    if (son) setVoix(e.id, son);
    if (o.sequence) D.envois = D.envois.filter((x) => !(x.sequence === o.sequence && x.evt === o.evt && JSON.stringify(x.a) === JSON.stringify(o.a)));
    D.envois.unshift(e); sauver(); return e.id;
  }
  const pourJoueur = (x, jid) => { const p = personne(jid); return x.a === "equipe" ? !!p && p.equipe === x.equipe : Array.isArray(x.a) && x.a.includes(jid); };
  function envois({ evt, equipe, joueur } = {}) { return D.envois.filter((x) => (!evt || x.evt === evt) && (!equipe || x.equipe === equipe) && (!joueur || pourJoueur(x, joueur))); }
  function vuEnvoi(id, jid) { const x = D.envois.find((y) => y.id === id); if (!x || !jid || x.vus[jid]) return; x.vus[jid] = new Date().toISOString(); NUAGE.op({ type: "vu", envoi: id, jid }); sauver(); }
  // Commentaire au micro d'une séquence envoyée (audio en data URL)
  function setVoix(id, src) { try { localStorage.setItem("esga-voix:" + id, src); } catch (e) {} NUAGE.ecrireSeul("voix:" + id, { src }); }
  async function voixEnvoi(id) {
    let src = null; try { src = localStorage.getItem("esga-voix:" + id); } catch (e) {}
    if (!src) { const d = await NUAGE.lireSeul("voix:" + id); src = d && d.src; if (src) try { localStorage.setItem("esga-voix:" + id, src); } catch (e) {} }
    return src || null;
  }
  function retirerEnvoi(id) { D.envois = D.envois.filter((x) => x.id !== id); sauver(); }
  function statsJoueur(id) {
    const p = personne(id); if (!p) return null;
    const passes = MATCHS.map(matchEvt).concat(D.evenements.filter((e) => e.type === "amical")).filter((e) => e.equipe === p.equipe && e.date < auj());
    const convs = D.convocations.filter((c) => c.joueurs.includes(id));
    let joues = 0, buts = 0, pd = 0;
    Object.values(D.feuilles).forEach((f) => { if ((f.joueurs || []).includes(id)) joues++; const st = (f.stats || {})[id]; if (st) { buts += st.buts || 0; pd += st.passes || 0; } });
    return { joues, buts, passes: pd, convocations: convs.length, matchsEquipe: passes.length, presence: tauxPresence(id, 30) };
  }
  function exporter() { return JSON.stringify(D, null, 1); }
  function importer(txt) { const n = JSON.parse(txt); if (!n || !Array.isArray(n.personnes) || !Array.isArray(n.equipes)) throw new Error("Fichier non reconnu"); n.version = VERSION; D = completer(n); sauver(); }
  function reinitialiser() { if (NUAGE.actif) { NUAGE.deconnecter(); location.reload(); return; } STOCKAGE.effacer(); D = completer(graine()); STOCKAGE.ecrire(D); presencesDemo(); notifier(); }

  /* ---------- profil de la personne qui utilise l'appli (le même pour tous les modules) ----------
     { role: "dirigeant" } | { role: "coach", staff } | { role: "parent", joueur } | { role: "joueur", joueur }
     En démo on le choisit ; avec Supabase il viendra du compte connecté. */
  const CLE_PROFIL = "esga-profil";
  function profil() { try { return JSON.parse(localStorage.getItem(CLE_PROFIL)) || null; } catch (e) { return null; } }
  function setProfil(p) { try { if (p) localStorage.setItem(CLE_PROFIL, JSON.stringify(p)); else localStorage.removeItem(CLE_PROFIL); } catch (e) {} }
  function nomProfil(p) {
    p = p || profil(); if (!p) return "";
    if (p.role === "dirigeant") return "Dirigeant du club";
    if (p.role === "coach") { const s = D.staff.find((x) => x.id === p.staff); return s ? `${s.prenom} ${s.nom}` : "Éducateur"; }
    const j = personne(p.joueur); if (!j) return "";
    return p.role === "parent" ? `Parent de ${j.prenom}` : `${j.prenom} ${j.nom}`;
  }

  /* ---------- dernière connexion (récapitulatif de la console) ----------
     Gardée pour chaque personne de ce navigateur ({ derniere, precedente, pv, pvPrecedent }) et recopiée dans le profil.
     Une nouvelle connexion = un nouvel onglet ou une nouvelle session du navigateur, ou un retour après 3 h sans venir.
     « precedente » est la date de la connexion d'avant : le récapitulatif montre tout ce qui s'est passé depuis. */
  const CLE_CNX = "esga-connexions", PAUSE = 3 * 3600e3;
  const cleProfil = (p) => !p ? "" : p.role === "dirigeant" ? "dirigeant" : p.role === "coach" ? "coach:" + p.staff : p.role + ":" + p.joueur;
  const lireCnx = () => { try { return JSON.parse(localStorage.getItem(CLE_CNX)) || {}; } catch (e) { return {}; } };
  function ecrireCnx(k, c) {
    const t = lireCnx(); t[k] = c; try { localStorage.setItem(CLE_CNX, JSON.stringify(t)); } catch (e) {}
    const p = profil(); if (p && cleProfil(p) === k) { p.derniere = c.derniere; p.precedente = c.precedente || null; setProfil(p); }
  }
  function connexion() {
    const p = profil(), k = cleProfil(p); if (!k) return null;
    const c = Object.assign({}, lireCnx()[k]), now = new Date().toISOString();
    let ses = null; try { ses = sessionStorage.getItem("esga-session"); } catch (e) {}
    const nouvelle = ses !== k || !c.derniere || Date.now() - new Date(c.derniere) > PAUSE;
    if (nouvelle) { c.precedente = c.derniere || null; c.pvPrecedent = c.pv == null ? null : c.pv; try { sessionStorage.setItem("esga-session", k); } catch (e) {} }
    if (nouvelle || Date.now() - new Date(c.derniere) > 60e3) { c.derniere = now; ecrireCnx(k, c); }
    return c;
  }
  // « J'ai tout vu » : le récapitulatif repart de maintenant ; pv = dernier PV connu
  function toutVu(pv) { const k = cleProfil(profil()); if (!k) return; const c = Object.assign({}, lireCnx()[k]); c.precedente = new Date().toISOString(); if (pv != null) c.pv = c.pvPrecedent = pv; ecrireCnx(k, c); }
  function noterPV(n) { const k = cleProfil(profil()); if (!k || n == null) return; const c = Object.assign({}, lireCnx()[k]); if (c.pv === n) return; c.pv = n; if (c.pvPrecedent === undefined) c.pvPrecedent = null; ecrireCnx(k, c); }

  // En ligne : on attend la première lecture (6 s au plus, sinon on part de la copie locale)
  const premier = NUAGE.actif ? Promise.race([NUAGE.tirer(), new Promise((r) => setTimeout(r, 6000))]) : null;
  const pret = Promise.all([fetch(BASE + "data/matchs.json").then((r) => r.json()).catch(() => []), premier]).then(([m]) => { MATCHS = Array.isArray(m) ? m : []; presencesDemo(); return window.CLUB; });

  window.CLUB = {
    get mode() { return STOCKAGE.mode; }, enLigne: NUAGE, BASE, SAISON, pret, LIEUX,
    get donnees() { return D; }, get club() { return D.club; }, get maj() { return D.maj; },
    equipes: () => D.equipes.slice(), equipe, nomEquipe, joueurs, personne, nomComplet, staff: () => D.staff.slice(), staffDe, coachDe,
    creneaux: (eq) => D.creneaux.filter((c) => !eq || c.equipe === eq),
    evenements, evenement, prochainMatch, prochainsEntrainements, RENCONTRES, rencontres, JOURS_SONDAGE, ouvertureSondage, sondagePossible, weekend, equipesDe, convocation, convocations: (eq) => D.convocations.filter((c) => !eq || c.equipe === eq),
    presences: (evt) => D.presences[evt] || {}, dispos: (evt) => D.dispos[evt] || {}, tauxPresence, categorieAge,
    enregistrer, supprimer, majClub, lot, modifierEvenement, setPresence, setDispo, publierConvocation,
    feuille: (evt) => D.feuilles[evt] || null, setFeuille, sondage: (evt) => D.sondages[evt] || null, lancerSondage, statsJoueur,
    seance: (evt) => D.seances[evt] || null, setSeance,
    // Rappel « lancer le sondage le… » choisi par le coach (par défaut 7 jours avant le match)
    rappel: (evt) => D.rappels[evt] || null, setRappel: (evt, date) => { if (date) D.rappels[evt] = date; else delete D.rappels[evt]; sauver(); },
    video: (evt) => D.videos[evt] || null, setVideo, envoyerSequence, envois, envoi: (id) => D.envois.find((x) => x.id === id) || null, vuEnvoi, retirerEnvoi, voixEnvoi,
    lienEnvoi: (id) => BASE + "analyse-video/voir.html?e=" + encodeURIComponent(id),
    exporter, importer, reinitialiser, profil, setProfil, nomProfil, connexion, toutVu, noterPV, surChangement: (cb) => abonnes.push(cb),
    outils: { iso, ajout, auj, jour, uid },
  };
})();
