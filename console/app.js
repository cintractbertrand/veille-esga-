/* Console du club ESGA : tout gérer au même endroit.
   Dirigeant : tout le club (licenciés, éducateurs, équipes, calendrier, convocations, réglages).
   Coach : ses équipes seulement (effectif, présences, convocations, calendrier).
   Les données viennent du socle commun (commun/club.js), partagé avec les autres modules. */
(function () {
  "use strict";
  const C = window.CLUB, { iso, ajout, auj, jour } = C.outils;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const maj1 = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  const pl = (n, mot, mots) => `${n} ${n > 1 ? mots || mot + "s" : mot}`;
  const hh = (h) => (h || "").replace(":", "h");
  const fmt = (d, o) => jour(d).toLocaleDateString("fr-FR", o);
  const fJ = (d) => fmt(d, { weekday: "short", day: "numeric", month: "short" });
  const fJL = (d) => maj1(fmt(d, { weekday: "long", day: "numeric", month: "long" }));
  const lundi = (d) => { const x = jour(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); };
  const age = (n) => { if (!n) return ""; const b = new Date(n), t = new Date(); let a = t.getFullYear() - b.getFullYear(); if (t < new Date(t.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
  const minutes = (h, delta) => { const [a, b] = h.split(":").map(Number); const t = a * 60 + b + delta; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(((t % 60) + 60) % 60).padStart(2, "0")}`; };
  const initiales = (p) => ((p.prenom || "?")[0] + (p.nom || "")[0]).toUpperCase();
  const COUL = ["#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be185d", "#15803d", "#c2410c", "#0369a1"];
  const couleur = (t) => { let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COUL[h % COUL.length]; };
  const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

  const estMatch = (e) => e.type === "match" || e.type === "amical"; // a un score (feuille de match)
  const convocable = (e) => C.RENCONTRES.includes(e.type) && !!e.equipe; // sondage et convocation (plateaux et tournois compris)
  const DISPO = { present: "Présent", incertain: "Peut-être", absent: "Absent" }; // mêmes mots dans la console et la messagerie
  const TYPES = { match: "Match", entrainement: "Entraînement", amical: "Match amical", plateau: "Plateau", tournoi: "Tournoi", reunion: "Réunion", autre: "Événement" };
  const ROLES = { president: "Président", secretaire: "Secrétariat", tresorier: "Trésorier", dirigeant: "Dirigeant", coach: "Éducateur principal", adjoint: "Éducateur adjoint" };
  const LICENCE = { validee: ["Validée", "ok"], en_attente: ["En attente", "att"], a_renouveler: ["À renouveler", "ko"] };
  const PRES = { present: ["Présent", "p", "P"], retard: ["Retard", "r", "R"], excuse: ["Excusé", "e", "E"], absent: ["Absent", "a", "A"] };

  const IC = {
    accueil: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    calendrier: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    equipes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20"/>',
    licencies: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 9h3M15 13h3"/>',
    staff: '<path d="M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7z"/><path d="m9 12 2 2 4-4"/>',
    convocations: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 14l2 2 4-4"/>',
    parametres: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    messagerie: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14.5h4"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-3v10l-6-3"/>',
    pv: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    equipe: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20"/>',
    atelier: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 9h3v6H3M21 9h-3v6h3"/><circle cx="12" cy="12" r="2.5"/>',
  };
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
  const URL_MOD = { messagerie: (eq) => C.BASE + "messagerie/" + (eq ? "?equipe=" + encodeURIComponent(eq) : ""), video: () => C.BASE + "analyse-video/", pv: (eq) => C.BASE + "pv.html" + (eq ? "#equipe/" + encodeURIComponent(C.equipe(eq) ? C.equipe(eq).categorie : eq) : ""), atelier: (evt, eq) => "https://cintractbertrand.github.io/atelier-foot/site/" + (evt ? `?pour=${encodeURIComponent(evt)}&equipe=${encodeURIComponent(eq || "")}` : "") };
  // Séance préparée dans l'Atelier pour un entraînement : résumé, ouverture, changement
  function seanceHTML(e, peut, court) {
    const s = C.seance(e.id), prep = `href="${URL_MOD.atelier(e.id, e.equipe)}" target="_blank" rel="noopener"`;
    if (!s) return peut ? `<div class="seance vide-s">📋 <span>Séance pas encore préparée.</span><a class="btn" ${prep}>Préparer la séance ↗</a></div>` : "";
    const tot = s.exercices.reduce((a, x) => a + (+x.duree || 0), 0);
    return `<div class="seance"><p class="st">📋 <b>${esc(s.nom || "Séance")}</b><small>${pl(s.exercices.length, "exercice")} · ${tot} min${s.auteur ? " · " + esc(s.auteur) : ""}</small></p>
      ${court ? "" : `<ol>${s.exercices.map((x) => `<li>${esc(x.titre)} <small>${x.duree ? x.duree + " min" : ""}${x.variante ? " · " + esc(x.variante) : ""}</small>${x.note ? `<small class="nt">📝 ${esc(x.note)}</small>` : ""}</li>`).join("")}</ol>${s.materiel ? `<p class="petit discret" style="margin:4px 0 0">🎒 ${esc(s.materiel)}</p>` : ""}`}
      <p class="sa">${s.lien ? `<a class="btn prim" href="${esc(s.lien)}" target="_blank" rel="noopener">Ouvrir la séance ↗</a>` : ""}${peut ? `<a class="btn" ${prep}>Changer</a>${court ? "" : `<button class="btn lien" data-a="seance-retirer" data-id="${esc(e.id)}">Retirer</button>`}` : ""}</p></div>`;
  }

  /* ---------- profil : dirigeant, coach, parent ou joueur (partagé avec les autres modules) ---------- */
  let profil = C.profil();
  const N = C.enLigne, famillesSeules = () => N.actif && N.role === "famille";
  // Code famille : pas de profil coach ou dirigeant
  if (famillesSeules() && profil && !["parent", "joueur"].includes(profil.role)) { profil = null; C.setProfil(null); }
  const sauverProfil = () => C.setProfil(profil);
  const estDirigeant = () => !!profil && profil.role === "dirigeant";
  const estCoach = () => !!profil && profil.role === "coach";
  const estFamille = () => !!profil && (profil.role === "parent" || profil.role === "joueur");
  const moiStaff = () => (profil && C.staff().find((s) => s.id === profil.staff)) || null;
  const moiJoueur = () => (profil && profil.joueur && C.personne(profil.joueur)) || null;
  const mesEquipes = () => estDirigeant() ? C.equipes().map((e) => e.id) : estCoach() ? (moiStaff() || { equipes: [] }).equipes : moiJoueur() ? [moiJoueur().equipe] : [];
  const peutVoir = (eq) => estDirigeant() || mesEquipes().includes(eq);

  /* ---------- outils d'affichage ---------- */
  function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2800); }
  let surSoumission = null;
  function tiroir(titre, html, onSubmit) {
    $("#tiroirTitre").textContent = titre; $("#tiroirCorps").innerHTML = html; surSoumission = onSubmit || null;
    $("#tiroir").hidden = false; $("#tiroirFond").hidden = false;
    const f = $("#tiroirCorps input:not([type=hidden]):not([type=checkbox]), #tiroirCorps select, #tiroirCorps textarea"); if (f && matchMedia("(pointer: fine)").matches) f.focus();
  }
  function fermer() { $("#tiroir").hidden = true; $("#tiroirFond").hidden = true; surSoumission = null; }
  const opt = (v, l, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? " selected" : ""}>${esc(l)}</option>`;
  const optEquipes = (sel, vide, liste) => (vide ? opt("", vide, sel) : "") + (liste || C.equipes().map((e) => e.id)).map((id) => opt(id, C.nomEquipe(id), sel)).join("");
  const etiqLicence = (p) => { const [l, k] = LICENCE[p.licence.statut] || ["?", ""]; return `<span class="etiq ${k}">${l}</span>`; };
  const etiqCertif = (p) => p.certificat === "ok" ? `<span class="etiq ok">OK</span>` : `<span class="etiq ko">À fournir</span>`;
  function jauge(t) { if (t == null) return '<span class="discret">–</span>'; const c = t >= 80 ? "var(--ok)" : t >= 60 ? "var(--att)" : "var(--ko)"; return `<span class="jauge"><i style="--p:${t}%;--cj:${c}"></i>${t} %</span>`; }
  const avatarP = (p) => `<span class="avatar" style="background:${couleur(p.prenom + p.nom)}">${esc(initiales(p))}</span>`;
  function ligneEvt(e, avecEquipe = true) {
    const cv = convocable(e) ? C.convocation(e.id) : null;
    const entEq = e.type === "entrainement" && avecEquipe && e.equipe;
    const sous = entEq ? `Entraînement · ${e.lieu}` : [avecEquipe && e.equipe ? C.nomEquipe(e.equipe) : e.equipe ? "" : "Club", estMatch(e) ? e.competition : TYPES[e.type] !== e.titre ? TYPES[e.type] : "", e.lieu].filter(Boolean).join(" · ");
    const badge = e.statut === "annule" ? '<span class="etiq ko">Annulé</span>' : convocable(e) && e.date >= auj() ? (cv ? '<span class="etiq ok">Convoqués</span>' : '<span class="etiq att">À convoquer</span>') : e.type === "entrainement" && C.seance(e.id) ? '<span class="etiq bleu" title="Séance préparée">📋 Séance</span>' : "";
    return `<button class="evt t-${e.type}${e.statut === "annule" ? " annule" : ""}" data-a="evt" data-id="${esc(e.id)}"><span class="h">${hh(e.heure)}</span><span class="t"><b>${esc(entEq ? C.nomEquipe(e.equipe) : e.type === "entrainement" ? "Entraînement" : e.titre)}</b><small>${esc(sous)}</small></span>${badge}</button>`;
  }
  function agenda(evts, avecEquipe = true, vide = "Rien de prévu.") {
    if (!evts.length) return `<p class="vide">${vide}</p>`;
    let j = "", out = "";
    evts.forEach((e) => { if (e.date !== j) { j = e.date; out += `<li class="jour">${e.date === auj() ? "Aujourd'hui · " : e.date === ajout(auj(), 1) ? "Demain · " : ""}${fJL(e.date)}</li>`; } out += `<li>${ligneEvt(e, avecEquipe)}</li>`; });
    return `<ul class="agenda">${out}</ul>`;
  }

  /* ---------- menu ---------- */
  function rendreMenu(page) {
    const dir = estDirigeant(), s = moiStaff();
    const nbConv = new Set([...convocationsAFaire().map((e) => e.id), ...(estDirigeant() ? [] : mesEquipes().flatMap((q) => matchsAPreparer(q).filter(rappelDu).map((e) => e.id)))]).size;
    if (estFamille()) {
      const j = moiJoueur();
      $("#menu").innerHTML = `<div class="profil"><b>${esc(C.nomProfil(profil))}</b><span>${esc(j ? C.nomEquipe(j.equipe) : "")}</span></div>
        <a href="#moi"${page === "moi" ? ' aria-current="page"' : ""}>${svg("accueil")}<span class="long">Mon espace</span><span class="court">Accueil</span></a>
        <a href="${URL_MOD.messagerie(j && j.equipe)}">${svg("messagerie")}<span class="long">Messagerie de l'équipe</span><span class="court">Messages</span></a>
        <a href="#bienvenue">${svg("equipes")}<span class="long">Changer de profil</span><span class="court">Profil</span></a>`;
      return;
    }
    const items = dir
      ? [["accueil", "Tableau de bord", 0, "Accueil"], ["calendrier", "Calendrier"], ["equipes", "Équipes"], ["licencies", "Licenciés"], ["staff", "Éducateurs et bureau", 0, "Staff"], ["convocations", "Matchs", nbConv], ["parametres", "Réglages"]]
      : [["accueil", "Aujourd'hui", 0, "Accueil"], ["equipes", mesEquipes().length > 1 ? "Mes équipes" : "Mon équipe", 0, "Équipe"], ["calendrier", "Calendrier"], ["convocations", "Matchs", nbConv], ["staff", "Contacts du club", 0, "Contacts"]];
    const ext = [["messagerie", "Messagerie", URL_MOD.messagerie(dir ? "" : mesEquipes()[0])], ["atelier", "Atelier entraînements", URL_MOD.atelier()], ["video", "Monteur vidéo", URL_MOD.video()], ["pv", "PV du District", URL_MOD.pv(dir ? "" : mesEquipes()[0])], ["equipe", "MyFootSquad", "https://myfootsquad.com/"]];
    $("#menu").innerHTML = `<div class="profil"><b>${dir ? "Console du club" : esc(C.nomComplet(s))}</b><span>${dir ? "Vue dirigeant · tout le club" : esc((s.equipes || []).map(C.nomEquipe).join(", ") || "Aucune équipe")}</span><a class="changer" href="#bienvenue">Changer de profil</a></div>`
      + items.map(([id, l, n, c]) => `<a href="#${id}"${page === id ? ' aria-current="page"' : ""}>${svg(id)}<span class="long">${l}</span><span class="court">${c || l}</span>${n ? `<span class="compte">${n}</span>` : ""}</a>`).join("")
      + `<div class="sep">Modules</div>` + ext.map(([id, l, u]) => `<a class="ext" href="${u}"${["atelier", "equipe"].includes(id) ? ' target="_blank" rel="noopener"' : ""}>${svg(id)}<span>${l}</span></a>`).join("");
  }

  /* ---------- données calculées ---------- */
  function convocationsAFaire() {
    return C.rencontres(null, auj(), ajout(auj(), 8)).filter((e) => peutVoir(e.equipe) && !C.convocation(e.id));
  }
  const portee = () => C.joueurs().filter((p) => peutVoir(p.equipe));

  /* ---------- tableau de bord ---------- */
  function pageAccueil() {
    if (!estDirigeant()) return pageAccueilCoach();
    const js = C.joueurs(), eqs = C.equipes(), st = C.staff();
    const attente = js.filter((p) => p.licence.statut !== "validee"), certif = js.filter((p) => p.certificat !== "ok");
    const sansCoach = eqs.filter((e) => !C.coachDe(e.id));
    const fin = ajout(lundi(auj()), 6), sem = C.evenements({ du: auj(), au: fin });
    const nbM = sem.filter((e) => estMatch(e)).length, nbE = sem.filter((e) => e.type === "entrainement" && e.statut !== "annule").length;
    const aConv = convocationsAFaire();
    const annules = C.evenements({ du: auj(), au: ajout(auj(), 14) }).filter((e) => e.statut === "annule");
    const taches = [
      ...[["ko", aConv.filter((e) => e.date <= ajout(auj(), 3)), "d'ici 3 jours"], ["", aConv.filter((e) => e.date > ajout(auj(), 3)), "la semaine suivante"]].filter(([, l]) => l.length).map(([k, l, q]) => ({ k, t: `${pl(l.length, "convocation")} à faire ${q}`, s: l.map((e) => C.nomEquipe(e.equipe)).join(", "), a: l.length === 1 ? `<a class="btn mini" href="#convoc/${esc(l[0].id)}">Préparer</a>` : `<a class="btn mini" href="#convocations">Voir</a>` })),
      ...(sansCoach.length ? [{ k: "ko", t: `${pl(sansCoach.length, "équipe")} sans éducateur`, s: sansCoach.map((e) => e.nom).join(", "), a: `<a class="btn mini" href="#staff">Affecter</a>` }] : []),
      ...(attente.length ? [{ k: "", t: `${pl(attente.length, "licence")} à finaliser`, s: `${attente.filter((p) => p.licence.statut === "en_attente").length} en attente, ${attente.filter((p) => p.licence.statut === "a_renouveler").length} à renouveler`, a: `<a class="btn mini" href="#licencies?licence=nonvalidee">Voir</a>` }] : []),
      ...(certif.length ? [{ k: "", t: `${pl(certif.length, "certificat médical", "certificats médicaux")} à fournir`, s: "Ne peuvent pas jouer en match officiel", a: `<a class="btn mini" href="#licencies?certif=a_fournir">Voir</a>` }] : []),
      ...annules.map((e) => ({ k: "info", t: `${TYPES[e.type]} annulé · ${C.nomEquipe(e.equipe)}`, s: `${fJ(e.date)} ${hh(e.heure)}`, a: `<button class="btn mini" data-a="evt" data-id="${esc(e.id)}">Voir</button>` })),
    ];
    const we = C.evenements({ du: auj(), au: ajout(auj(), 6), types: ["match", "plateau", "tournoi", "reunion", "amical", "autre"] });
    return `<div class="entete"><div><p class="fil-ariane discret">${esc(C.club.nom)} · saison ${C.SAISON.libelle}</p><h1>Tableau de bord</h1><p class="sous">${fJL(auj())}</p></div>
      <div class="actions"><button class="btn" data-a="nouvel-evt">+ Événement</button><button class="btn prim" data-a="nouveau-joueur">+ Licencié</button></div></div>
      <div class="kpis">
        <a class="kpi" href="#licencies"><b>${js.length}</b><span>licenciés</span>${attente.length ? `<small class="att">${attente.length} licences à finaliser</small>` : '<small class="ok">Toutes validées</small>'}</a>
        <a class="kpi" href="#equipes"><b>${eqs.length}</b><span>équipes</span>${sansCoach.length ? `<small class="ko">${pl(sansCoach.length, "sans éducateur", "sans éducateur")}</small>` : '<small class="ok">Toutes encadrées</small>'}</a>
        <a class="kpi" href="#staff"><b>${st.filter((s) => ["coach", "adjoint"].includes(s.role)).length}</b><span>éducateurs</span><small class="discret">${st.filter((s) => !["coach", "adjoint"].includes(s.role)).length} au bureau</small></a>
        <a class="kpi" href="#calendrier"><b>${nbM}</b><span>${nbM > 1 ? "matchs" : "match"} d'ici dimanche</span><small class="discret">${pl(nbE, "entraînement")}</small></a>
      </div>
      <div class="grille g-tb">
        <section class="carte"><h2>À traiter <span class="etiq ${taches.length ? "att" : "ok"}">${taches.length || "Rien"}</span></h2>
          ${taches.length ? `<ul class="taches">${taches.map((t) => `<li><span class="pt ${t.k}"></span><span class="tx">${esc(t.t)}<small>${esc(t.s)}</small></span>${t.a}</li>`).join("")}</ul>` : '<p class="vide">Tout est à jour. 👌</p>'}
        </section>
        <section class="carte"><h2>Les 7 prochains jours <span class="etiq">${pl(we.filter((e) => estMatch(e)).length, "match", "matchs")}</span><a class="plus" href="#calendrier">Calendrier ›</a></h2>${agenda(we.slice(0, 14), true, "Aucun match dans les 7 jours.")}${we.length > 14 ? `<p style="margin:6px 0 0"><a class="btn lien" href="#calendrier">+ ${pl(we.length - 14, "autre", "autres")} dans le calendrier ›</a></p>` : ""}</section>
      </div>
      <div class="grille g2" style="margin-top:14px">
        <section class="carte" id="cartePV"><h2>${svg("pv")} Dernier PV du District <a class="plus" href="${URL_MOD.pv()}">Lire les PV ›</a></h2><p class="discret petit">Chargement…</p></section>
        <section class="carte"><h2>Modules du club</h2>${modulesHTML()}</section>
      </div>`;
  }
  function modulesHTML(eq) {
    return `<div class="modules">
      <a class="module" href="${URL_MOD.messagerie(eq)}">${svg("messagerie")}<span>Messagerie<small>Familles, sondages, absences</small></span></a>
      <a class="module" href="${URL_MOD.atelier()}" target="_blank" rel="noopener">${svg("atelier")}<span>Atelier<small>Préparer une séance</small></span></a>
      <a class="module" href="${URL_MOD.video()}">${svg("video")}<span>Monteur vidéo<small>Revoir et montrer</small></span></a>
      <a class="module" href="${URL_MOD.pv(eq)}">${svg("pv")}<span>PV du District<small>Sanctions, échéances</small></span></a></div>`;
  }
  function chargerPV() {
    const el = $("#cartePV"); if (!el) return;
    fetch(C.BASE + "data/pv.json").then((r) => r.json()).then((d) => {
      const p = d.pvs && d.pvs[0]; if (!p || !$("#cartePV")) return;
      const its = p.items || [], urg = its.filter((i) => i.gravite === "urgent");
      el.querySelector("p").outerHTML = `<p style="margin:0 0 8px"><b>PV n°${esc(p.numero)} du ${fmt(p.date, { day: "numeric", month: "long" })}</b> · ${pl(its.length, "mention")} du club${urg.length ? `, <span style="color:var(--ko);font-weight:700">${pl(urg.length, "urgente")}</span>` : ""}.</p>
        <ul class="taches">${its.slice(0, 4).map((i) => `<li><span class="pt ${i.gravite === "urgent" ? "ko" : i.gravite === "attention" ? "" : "info"}"></span><span class="tx">${esc(i.titre || i.resume || i.type)}<small>${esc([i.categorie, i.type].filter(Boolean).join(" · "))}</small></span></li>`).join("")}</ul>`;
    }).catch(() => { const q = el.querySelector("p"); if (q) q.textContent = "PV indisponibles hors ligne."; });
  }

  function pageAccueilCoach() {
    const s = moiStaff(); if (!s) return `<p class="vide">Profil introuvable.</p>`;
    const eqs = s.equipes;
    if (!eqs.length) return `<div class="entete"><h1>Bonjour ${esc(s.prenom)}</h1></div><p class="vide">Aucune équipe ne vous est confiée pour l'instant. Le responsable sportif peut vous en affecter une.</p>`;
    return `<div class="entete"><div><p class="fil-ariane discret">${fJL(auj())}</p><h1>Bonjour ${esc(s.prenom)} 👋</h1><p class="sous">${eqs.map(C.nomEquipe).join(" · ")}</p></div></div>`
      + carteWeekend(eqs) + eqs.map((eq) => blocCoach(eq, eqs.length > 1)).join("")
      + `<section class="carte" style="margin-top:14px"><h2>Vos outils</h2>${modulesHTML(eqs[0])}</section>`;
  }
  /* ---------- vidéos : séquences envoyées aux joueurs ---------- */
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const secondes = (v) => { const m = String(v || "").trim().match(/^(?:(\d+):)?(\d+(?:[.,]\d+)?)$/); return m ? (+(m[1] || 0)) * 60 + parseFloat(m[2].replace(",", ".")) : NaN; };
  const destEnvoi = (x) => x.a === "equipe" ? "Toute l'équipe" : x.a.map((id) => (C.personne(id) || {}).prenom).filter(Boolean).join(", ");
  function ligneEnvoi(x, jid) {
    const vu = jid ? !!x.vus[jid] : null, nVus = Object.keys(x.vus).length, nDest = x.a === "equipe" ? C.joueurs(x.equipe).length : x.a.length;
    return `<li class="envoi"><a class="vign ${x.genre || ""}" href="${C.lienEnvoi(x.id)}">▶</a><span class="q"><b>${esc(x.nom || "Séquence")}</b>${x.voix ? ' <span title="Commentaire au micro">🎙</span>' : ""}${jid && !vu ? ' <span class="etiq or">Nouveau</span>' : ""}
      <small>${jid ? `${esc(x.de || "Le coach")} · ${x.a === "equipe" ? "pour toute l'équipe" : "rien que pour " + (C.personne(jid) || {}).prenom}` : `${esc(destEnvoi(x))} · vu par ${nVus}/${nDest}`} · ${mmss(x.debut)}–${mmss(x.fin)}</small>${x.note && jid ? `<small class="nt">« ${esc(x.note)} »</small>` : ""}</span>
      ${jid ? `<a class="btn mini prim" href="${C.lienEnvoi(x.id)}">Regarder</a>` : `<button class="btn mini lien" data-a="envoi-retirer" data-id="${esc(x.id)}">Retirer</button>`}</li>`;
  }
  function carteVideo(e) {
    const v = C.video(e.id), env = C.envois({ evt: e.id }), js = C.joueurs(e.equipe);
    return `<section class="carte" id="carteVideo"><h2>🎬 Vidéo du match${v ? ` <span class="plus"><a class="btn mini" href="${esc(v.url)}" target="_blank" rel="noopener">Ouvrir ↗</a>${v.source === "monteur" ? ` <a class="btn mini" href="${URL_MOD.video()}">Monteur vidéo</a>` : ""}</span>` : ""}</h2>
      <form class="form" id="fVideo" data-id="${esc(e.id)}"><label>Lien de la vidéo (YouTube, Veo, Google Drive, fichier .mp4…)<span class="ligne-btn"><input name="url" type="url" placeholder="https://…" value="${esc(v ? v.url : "")}"><button class="btn">${v ? "Changer" : "Relier"}</button></span></label></form>
      ${v ? `<details class="envoyer"${env.length ? "" : " open"}><summary class="btn prim">📤 Envoyer une séquence</summary>
        <form class="form" id="fEnvoi" data-id="${esc(e.id)}">
          <div class="ligne3"><label>Début (min:s)<input name="debut" placeholder="12:30" required></label><label>Fin (min:s)<input name="fin" placeholder="12:50" required></label><label>Type<select name="genre">${opt("", "Neutre", "")}${opt("bien", "👍 À refaire", "")}${opt("corriger", "✏️ À corriger", "")}</select></label></div>
          <label>Titre<input name="nom" placeholder="ex. Pressing à la perte du ballon" required></label>
          <label>Message du coach<textarea name="note" placeholder="Ce qu'il faut regarder…"></textarea></label>
          <fieldset><legend>Pour qui ?</legend><label class="tout"><input type="radio" name="pour" value="equipe" checked> Toute l'équipe</label><label class="tout"><input type="radio" name="pour" value="choix"> Seulement :</label>
            <div class="cases joueurs-envoi">${js.map((p) => `<label><input type="checkbox" name="j" value="${esc(p.id)}"> ${p.numero ? p.numero + " " : ""}${esc(p.prenom)}</label>`).join("")}</div></fieldset>
          <div class="pied"><button class="btn prim">Envoyer</button></div></form></details>` : '<p class="aide">Reliez la vidéo pour envoyer des séquences aux joueurs. Depuis le Monteur vidéo, le bouton « Partager » d\'une séquence fait la même chose.</p>'}
      ${env.length ? `<h3>Séquences envoyées</h3><ul class="envois">${env.map((x) => ligneEnvoi(x)).join("")}</ul>` : ""}</section>`;
  }
  /* ---------- matchs à préparer : le coach lance le sondage (10 jours avant au plus tôt), avec un rappel ---------- */
  // Rappel par défaut : le lundi qui précède le match (règle de Bertrand), jamais avant l'ouverture du sondage
  const dateRappel = (e) => { const r = C.rappel(e.id) || ajout(e.date, -(((jour(e.date).getDay() + 6) % 7) || 7)), o = C.ouvertureSondage(e); return r < o ? o : r; };
  const rappelDu = (e) => !C.convocation(e.id) && !etatSondage(e).lance && C.sondagePossible(e) && dateRappel(e) <= auj();
  // Week-end affiché sur l'accueil du coach : celui en cours (ven. → dim.), sinon le prochain
  const ceWeekend = () => C.weekend(auj());
  const dansWeekend = (e) => { const w = ceWeekend(); return e.date >= w.du && e.date <= w.au; };
  function matchsAPreparer(eq) { return C.rencontres(eq, auj(), ajout(auj(), 42)); }
  const memeWeekend = (a, b) => a.id !== b.id && Math.abs((jour(a.date) - jour(b.date)) / 864e5) <= 2 && [5, 6, 0].includes(jour(a.date).getDay()) && [5, 6, 0].includes(jour(b.date).getDay());
  const jumeau = (e) => matchsAPreparer(e.equipe).find((x) => memeWeekend(e, x)) || null;
  function boutonsSondage(e, prim) {
    const j = jumeau(e), libre = j && !C.convocation(j.id) && !etatSondage(j).lance && C.sondagePossible(j);
    return libre ? `<button class="btn mini${prim ? " prim" : ""}" data-a="lancer-sondage-we" data-id="${esc(e.id)}" data-avec="${esc(j.id)}" title="Une seule réponse des familles pour les deux matchs">Un sondage pour les 2 matchs du week-end</button><button class="btn mini" data-a="lancer-sondage" data-id="${esc(e.id)}">Ce match seulement</button>`
      : `<button class="btn mini${prim ? " prim" : ""}" data-a="lancer-sondage" data-id="${esc(e.id)}">${prim ? "Lancer le sondage" : "Lancer maintenant"}</button>`;
  }
  // État d'une rencontre pour le coach, avec l'action suivante : sondage (dès 10 jours avant), convocation, score
  function etatRencontre(e, avecRappel) {
    const cv = C.convocation(e.id), so = etatSondage(e), f = estMatch(e) ? C.feuille(e.id) : null;
    if (e.date < auj()) return estMatch(e) ? `${scoreHTML(e, f)}<a class="btn mini${f ? "" : " prim"}" href="#feuille/${esc(e.id)}">${f ? "Voir" : "Saisir le score"}</a>` : `<span class="etiq">Joué</span>`;
    if (cv) return `<span class="etiq ok">✅ ${pl(cv.joueurs.length, "convoqué")} · RDV ${hh(cv.rdvHeure)}</span><a class="btn mini" href="#convoc/${esc(e.id)}">Voir</a>`;
    if (so.lance) return `<span class="petit">${(C.sondage(e.id) || {}).lies ? "🔗 Sondage commun · " : "📊 "}${compteDispo(so, e)}</span><a class="btn mini prim" href="#convoc/${esc(e.id)}">Faire la convocation</a>`;
    if (!C.sondagePossible(e)) return `<span class="petit discret">📅 Sondage à partir du ${fJ(C.ouvertureSondage(e))}</span>${avecRappel ? `<label class="petit rappel">⏰ Rappel le <input type="date" class="rappel-date" data-id="${esc(e.id)}" value="${esc(dateRappel(e))}" min="${esc(C.ouvertureSondage(e))}" max="${esc(e.date)}"></label>` : ""}`;
    if (rappelDu(e) || !avecRappel) return `<span class="rappel-du">⏰ C'est le moment de lancer le sondage</span>${boutonsSondage(e, true)}<a class="btn mini lien" href="#convoc/${esc(e.id)}">ou convoquer directement</a>`;
    return `<label class="petit rappel">⏰ Rappel le <input type="date" class="rappel-date" data-id="${esc(e.id)}" value="${esc(dateRappel(e))}" min="${esc(C.ouvertureSondage(e))}" max="${esc(e.date)}"></label>${boutonsSondage(e, false)}`;
  }
  const ligneRencontre = (e, avecEquipe, avecRappel) => `<li class="${rappelDu(e) ? "du" : ""}"><button class="btn lien quand" data-a="evt" data-id="${esc(e.id)}"><b>${fJ(e.date)}</b> ${hh(e.heure)}</button><span class="qui"><b>${esc(e.titre)}</b><small>${esc([avecEquipe ? C.nomEquipe(e.equipe) : "", e.competition || TYPES[e.type] || "", e.lieu].filter(Boolean).join(" · "))}</small></span><span class="etat">${etatRencontre(e, avecRappel)}</span></li>`;
  // Tous les matchs du week-end, toutes équipes du coach (même deux matchs pour une équipe)
  function carteWeekend(eqs) {
    const w = ceWeekend(), l = eqs.flatMap((eq) => C.rencontres(eq, w.du, w.au)).sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
    const titre = auj() >= w.du ? "Ce week-end" : `Le week-end du ${fmt(w.du, { day: "numeric" })} au ${fmt(w.au, { day: "numeric", month: "long" })}`;
    if (!l.length) {
      const n = eqs.map((eq) => C.prochainMatch(eq)).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))[0];
      return `<section class="carte a-preparer weekend"><h2>⚽ ${titre} <a class="plus" href="#convocations">Tous les matchs ›</a></h2><p class="vide" style="padding:6px 0">Pas de match ce week-end.${n ? ` Prochain : <b>${fJ(n.date)}</b>, ${esc(n.titre)}${eqs.length > 1 ? " (" + esc(C.nomEquipe(n.equipe)) + ")" : ""}.` : ""}</p></section>`;
    }
    return `<section class="carte a-preparer weekend"><h2>⚽ ${titre} <span class="etiq bleu">${pl(l.length, "match", "matchs")}</span><a class="plus" href="#convocations">Tous les matchs ›</a></h2><ul>${l.map((e) => ligneRencontre(e, eqs.length > 1, false)).join("")}</ul></section>`;
  }
  function carteAPreparer(eq) {
    const l = matchsAPreparer(eq).filter((e) => !dansWeekend(e));
    const d = C.evenements({ equipe: eq, du: C.SAISON.debut, au: ajout(auj(), -1), types: ["match", "amical"] }).filter((x) => x.statut !== "annule" && x.equipe === eq && !dansWeekend(x)).pop(), f = d && C.feuille(d.id);
    const dernier = d ? `<p class="dernier petit">Dernier match : <b>${esc(d.adversaire || d.titre)}</b> ${scoreHTML(d, f)} <a href="#feuille/${esc(d.id)}">${f ? "voir" : "saisir le score ›"}</a>${C.video(d.id) ? ` · <a href="#feuille/${esc(d.id)}">🎬 vidéo${C.envois({ evt: d.id }).length ? ` (${pl(C.envois({ evt: d.id }).length, "séquence envoyée", "séquences envoyées")})` : ""}</a>` : ""}</p>` : "";
    return `<section class="carte a-preparer"><h2>📋 Matchs à préparer <a class="plus" href="#convocations">Tous les matchs ›</a></h2>${l.length ? `<ul>${l.map((e) => ligneRencontre(e, false, true)).join("")}</ul>` : `<p class="discret petit" style="margin:0">Rien d'autre dans les 6 prochaines semaines.</p>`}${dernier}</section>`;
  }
  // Ce que les PV du District disent de la catégorie de l'équipe (lu dans data/pv.json)
  let PVS = null;
  function chargerPVs() { if (!chargerPVs.p) chargerPVs.p = fetch(C.BASE + "data/pv.json").then((r) => r.json()).then((d) => (PVS = d.pvs || [])).catch(() => (PVS = [])); return chargerPVs.p; }
  function cartePVEquipe(eq) {
    const cat = (C.equipe(eq) || {}).categorie || "", lien = URL_MOD.pv(eq);
    const tete = `<h2>${svg("pv")} PV du District · ${esc(cat)} <a class="plus" href="${lien}">Lire ›</a></h2>`;
    if (!PVS) return `<section class="carte pv-eq" data-eq="${esc(eq)}">${tete}<p class="discret petit">Chargement…</p></section>`;
    const its = PVS.slice(0, 4).flatMap((p) => (p.items || []).filter((i) => i.categorie === cat).map((i) => Object.assign({ pv: p }, i)))
      .sort((a, b) => ({ urgent: 0, attention: 1 }[a.gravite] ?? 2) - ({ urgent: 0, attention: 1 }[b.gravite] ?? 2) || b.pv.date.localeCompare(a.pv.date)).slice(0, 4);
    if (!its.length) return `<section class="carte pv-eq">${tete}<p class="discret petit" style="margin:0">Rien pour ${esc(cat)} dans les derniers PV. 👍</p></section>`;
    return `<section class="carte pv-eq">${tete}<ul class="taches">${its.map((i) => { const ech = (i.echeances || []).filter((x) => x.date >= auj()).sort((a, b) => a.date.localeCompare(b.date))[0];
      return `<li><span class="pt ${i.gravite === "urgent" ? "ko" : i.gravite === "attention" ? "" : "info"}"></span><span class="tx">${esc(i.titre)}<small>PV du ${fmt(i.pv.date, { day: "numeric", month: "short" })}${ech ? ` · <b style="color:var(--ko)">avant le ${fJ(ech.date)}${ech.heure ? " " + hh(ech.heure) : ""}</b>` : ""}</small></span></li>`; }).join("")}</ul></section>`;
  }
  function blocCoach(eq, plusieurs) {
    const ent = C.prochainsEntrainements(eq, 3), js = C.joueurs(eq);
    const alertes = js.filter((p) => p.certificat !== "ok" || p.licence.statut !== "validee");
    const prochain = ent[0], dispo = prochain ? C.dispos(prochain.id) : {}, abs = Object.keys(dispo).filter((id) => dispo[id].statut === "absent");
    const taux = js.map((p) => C.tauxPresence(p.id)).filter((t) => t != null), moy = taux.length ? Math.round(taux.reduce((a, b) => a + b, 0) / taux.length) : null;
    const bas = js.map((p) => [p, C.tauxPresence(p.id)]).filter(([, t]) => t != null && t < 70).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const fem = (C.equipe(eq) || {}).genre === "F";
    return `<h2 class="groupe-titre">${esc(C.nomEquipe(eq))} · <a href="#equipe/${esc(eq)}">fiche de l'équipe ›</a></h2>
      ${carteAPreparer(eq)}
      <div class="grille g3">
        <section class="carte"><h2>Prochain entraînement</h2>${prochain ? `<p style="margin:0 0 4px"><b>${fJL(prochain.date)} · ${hh(prochain.heure)}</b></p><p class="discret petit" style="margin:0 0 10px">${esc(prochain.lieu)} · ${prochain.duree} min</p>
          ${abs.length ? `<div class="alerte">${pl(abs.length, "absence signalée", "absences signalées")} : ${abs.map((id) => `<b>${esc((C.personne(id) || {}).prenom)}</b> (${esc(dispo[id].motif || "")})`).join(", ")}</div>` : '<p class="discret petit">Aucune absence signalée par les familles.</p>'}
          <p style="margin:10px 0 0;display:flex;gap:8px;flex-wrap:wrap"><button class="btn prim" data-a="appel" data-id="${esc(prochain.id)}">Faire l'appel</button></p>
          <div style="margin-top:12px">${seanceHTML(prochain, true, true)}</div>
          ${ent.length > 1 ? `<p class="petit discret" style="margin:10px 0 4px">Séances suivantes :</p><ul class="suivantes">${ent.slice(1).map((x) => { const s = C.seance(x.id); return `<li><button class="btn lien" data-a="evt" data-id="${esc(x.id)}">${fJ(x.date)} ${hh(x.heure)}</button> ${s ? `📋 ${esc(s.nom || "Séance prête")}` : `<a href="${URL_MOD.atelier(x.id, eq)}" target="_blank" rel="noopener">préparer ↗</a>`}</li>`; }).join("")}</ul>` : ""}` : '<p class="vide">Pas d\'entraînement prévu (vacances ?).</p>'}</section>
        <section class="carte"><h2>Effectif</h2><p style="margin:0 0 6px"><b>${pl(js.length, fem ? "joueuse" : "joueur")}</b> · présence moyenne ${moy != null ? moy + " %" : "–"}</p>
          ${alertes.length ? `<div class="alerte ko" style="margin-bottom:8px">${alertes.map((p) => `<b>${esc(p.prenom)} ${esc(p.nom[0])}.</b> ${p.certificat !== "ok" ? "certificat" : "licence"}`).join(", ")}</div>` : '<p class="discret petit">Licences et certificats en règle.</p>'}
          ${bas.length ? `<p class="petit discret" style="margin:6px 0">Peu présent${fem ? "e" : ""}s ces dernières semaines : ${bas.map(([p, t]) => `${esc(p.prenom)} (${t} %)`).join(", ")}</p>` : ""}
          <p style="margin:10px 0 0;display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="#equipe/${esc(eq)}">Voir l'effectif</a><a class="btn" href="${URL_MOD.messagerie(eq)}">💬 Messagerie</a></p></section>
        ${cartePVEquipe(eq)}
      </div>
      ${plusieurs // plusieurs équipes : l'agenda de chacune est replié pour garder l'accueil court
        ? `<details class="carte repli" style="margin-top:14px"><summary>Les 2 prochaines semaines · ${esc(C.nomEquipe(eq))}</summary>${agenda(C.evenements({ equipe: eq, du: auj(), au: ajout(auj(), 14) }), false)}<p style="margin:8px 0 0"><a class="btn lien" href="#calendrier">Calendrier ›</a></p></details>`
        : `<section class="carte" style="margin-top:14px"><h2>Les 2 prochaines semaines <a class="plus" href="#calendrier">Calendrier ›</a></h2>${agenda(C.evenements({ equipe: eq, du: auj(), au: ajout(auj(), 14) }), false)}</section>`}`;
  }

  /* ---------- équipes ---------- */
  function pageEquipes() {
    const eqs = C.equipes().filter((e) => peutVoir(e.id));
    if (!estDirigeant() && eqs.length === 1) { location.replace("#equipe/" + eqs[0].id); return ""; }
    const groupes = [["Seniors et vétérans", (e) => /Seniors|Vétérans/.test(e.categorie)], ["Préformation (U15 à U20)", (e) => /U1[5-9]|U20/.test(e.categorie)], ["École de foot (U7 à U13)", (e) => /U7|U9|U1[13]/.test(e.categorie)]];
    const carte = (e) => {
      const co = C.coachDe(e.id), n = C.joueurs(e.id).length, m = C.prochainMatch(e.id), cr = C.creneaux(e.id);
      return `<a class="eq" href="#equipe/${esc(e.id)}"><h3>${esc(e.nom)} ${e.genre === "F" ? '<span class="etiq bleu">Féminines</span>' : ""}</h3>
        <span class="l">Éducateur : ${co ? `<b>${esc(C.nomComplet(co))}</b>` : '<b style="color:var(--ko)">à pourvoir</b>'}</span>
        <span class="l">${cr.length ? cr.map((c) => `${maj1(JOURS[c.jour]).slice(0, 3)}. ${hh(c.heure)}`).join(" · ") : "Pas de créneau"}</span>
        <span class="l">${m ? `Prochain match : <b>${fJ(m.date)}</b> · ${esc(m.adversaire)}` : e.format < 11 ? "Plateaux et tournois" : "Aucun match à venir"}</span>
        <span class="chiffres"><span class="etiq">${pl(n, "joueur")}</span><span class="etiq">Foot à ${e.format}</span>${m && !C.convocation(m.id) && jour(m.date) - jour(auj()) <= 8 * 864e5 ? '<span class="etiq att">À convoquer</span>' : ""}</span></a>`;
    };
    return `<div class="entete"><div><h1>${estDirigeant() ? "Équipes" : "Mes équipes"}</h1><p class="sous">${pl(eqs.length, "équipe")} · saison ${C.SAISON.libelle}</p></div>${estDirigeant() ? '<div class="actions"><button class="btn prim" data-a="nouvelle-equipe">+ Équipe</button></div>' : ""}</div>`
      + groupes.map(([t, f]) => { const l = eqs.filter(f); return l.length ? `<h2 class="groupe-titre">${t}</h2><div class="equipes">${l.map(carte).join("")}</div>` : ""; }).join("");
  }

  function pageEquipe(id, onglet) {
    const e = C.equipe(id);
    if (!e || !peutVoir(id)) return `<p class="vide">Équipe introuvable ou non accessible.</p>`;
    onglet = onglet || "effectif";
    const staff = C.staffDe(id), js = C.joueurs(id);
    const tabs = [["effectif", `Effectif (${js.length})`], ["calendrier", "Calendrier"], ["presences", "Présences"], ["creneaux", "Horaires"]];
    let corps = "";
    if (onglet === "effectif") corps = tableJoueurs(js, { equipe: false }) + `<p style="margin-top:12px"><button class="btn" data-a="nouveau-joueur" data-equipe="${esc(id)}">+ Ajouter un joueur</button></p>`;
    if (onglet === "calendrier") {
      const av = C.evenements({ equipe: id, du: auj(), au: ajout(auj(), 35) }), pa = C.evenements({ equipe: id, du: ajout(auj(), -21), au: ajout(auj(), -1) }).reverse();
      corps = `<div class="grille g2"><section class="carte"><h2>À venir <button class="btn mini plus" data-a="nouvel-evt" data-equipe="${esc(id)}">+ Ajouter</button></h2>${agenda(av, false)}</section><section class="carte"><h2>3 dernières semaines</h2>${agenda(pa, false)}</section></div>`;
    }
    if (onglet === "presences") corps = matricePresences(id);
    if (onglet === "creneaux") corps = `<section class="carte"><h2>Créneaux d'entraînement hebdomadaires</h2><p class="aide" style="margin:-6px 0 12px">Les entraînements du calendrier sont créés à partir de ces créneaux, hors vacances scolaires. Une séance peut ensuite être annulée ou déplacée une par une.</p>
      ${C.creneaux(id).length ? `<ul class="taches">${C.creneaux(id).map((c) => `<li><span class="pt ok"></span><span class="tx"><b>${maj1(JOURS[c.jour])} · ${hh(c.heure)}</b> (${c.duree} min)<small>${esc(c.lieu)}</small></span><button class="btn mini" data-a="creneau" data-id="${esc(c.id)}">Modifier</button></li>`).join("")}</ul>` : '<p class="vide">Aucun créneau.</p>'}
      <p style="margin:12px 0 0"><button class="btn" data-a="creneau" data-equipe="${esc(id)}">+ Ajouter un créneau</button></p></section>`;
    return `<div class="entete"><div><p class="fil-ariane"><a href="#equipes">${estDirigeant() ? "Équipes" : "Mes équipes"}</a> ›</p><h1>${esc(e.nom)}</h1>
      <p class="sous">Foot à ${e.format} · ${staff.length ? staff.map((s) => `${esc(C.nomComplet(s))} (${ROLES[s.role] ? ROLES[s.role].toLowerCase() : s.role})`).join(", ") : '<span style="color:var(--ko)">aucun éducateur</span>'}</p></div>
      <div class="actions"><a class="btn" href="${URL_MOD.messagerie(id)}">${svg("messagerie").replace("<svg", '<svg width="16" height="16"')} Messagerie</a>${estDirigeant() ? `<button class="btn" data-a="modifier-equipe" data-id="${esc(id)}">Modifier l'équipe</button>` : ""}</div></div>
      <nav class="onglets">${tabs.map(([k, l]) => `<a href="#equipe/${esc(id)}/${k}"${k === onglet ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>${corps}`;
  }

  function matricePresences(eq) {
    const evs = C.evenements({ equipe: eq, du: ajout(auj(), -56), au: auj(), types: ["entrainement"] }).filter((e) => e.statut !== "annule").slice(-8);
    const proch = C.prochainsEntrainements(eq, 1)[0];
    if (!evs.length) return `<p class="vide">Aucun entraînement passé.</p>`;
    const js = C.joueurs(eq);
    return `<div class="outils-liste"><span class="discret petit">Les 8 derniers entraînements. Touchez une colonne pour refaire l'appel.</span>${proch ? `<button class="btn prim" style="margin-left:auto" data-a="appel" data-id="${esc(proch.id)}">Appel du ${fJ(proch.date)}</button>` : ""}</div>
      <div class="table-wrap"><table class="liste matrice"><thead><tr><th>Joueur</th>${evs.map((e) => `<th class="c"><button class="btn lien" data-a="appel" data-id="${esc(e.id)}" title="Appel du ${fJL(e.date)}">${fmt(e.date, { day: "numeric", month: "numeric" })}</button></th>`).join("")}<th>Taux</th></tr></thead>
      <tbody>${js.map((p) => `<tr data-a="fiche" data-id="${esc(p.id)}"><td class="nom"><b>${esc(p.prenom)}</b> ${esc(p.nom)}</td>${evs.map((e) => { const s = C.presences(e.id)[p.id]; return `<td class="c"><span class="pres ${s || "vide"}" title="${s ? PRES[s][0] : "Non renseigné"}">${s ? PRES[s][2] : "·"}</span></td>`; }).join("")}<td>${jauge(C.tauxPresence(p.id))}</td></tr>`).join("")}</tbody></table></div>
      <p class="petit discret">P présent · R retard · E excusé · A absent</p>`;
  }

  /* ---------- licenciés ---------- */
  let filtres = { q: "", equipe: "", licence: "", certif: "" };
  function tableJoueurs(js, { equipe = true } = {}) {
    if (!js.length) return `<p class="vide">Aucun joueur ne correspond.</p>`;
    return `<div class="table-wrap"><table class="liste"><thead><tr><th>N°</th><th>Nom</th>${equipe ? "<th>Équipe</th>" : ""}<th class="cache-m">Poste</th><th class="cache-m">Âge</th><th>Licence</th><th>Certificat</th><th class="cache-m">Présence</th><th class="cache-m" title="Buts">⚽</th><th class="cache-m" title="Passes décisives">PD</th><th class="cache-m">Contact</th></tr></thead><tbody>
      ${js.map((p) => { const cat = C.categorieAge(p.naissance, p.genre), e = C.equipe(p.equipe), sur = e && cat && cat !== e.categorie;
        const ct = p.contacts && p.contacts[0]; const tel = p.tel || (ct && ct.tel) || "";
        return `<tr data-a="fiche" data-id="${esc(p.id)}"><td class="num">${p.numero || ""}</td><td class="nom"><b>${esc(p.prenom)}</b> ${esc(p.nom)}</td>${equipe ? `<td>${esc(C.nomEquipe(p.equipe))}</td>` : ""}<td class="cache-m">${esc(p.poste || "")}</td><td class="cache-m">${age(p.naissance)} ans${sur ? ` <span class="etiq or" title="Catégorie d'âge : ${esc(cat)}">${esc(cat)}</span>` : ""}</td><td>${etiqLicence(p)}</td><td>${etiqCertif(p)}</td><td class="cache-m">${jauge(C.tauxPresence(p.id))}</td>${(() => { const st = C.statsJoueur(p.id) || {}; return `<td class="cache-m num">${st.buts || ""}</td><td class="cache-m num">${st.passes || ""}</td>`; })()}<td class="cache-m">${tel ? `<a href="tel:${esc(tel.replace(/\s/g, ""))}" data-stop>${esc(tel)}</a>${ct && !p.tel ? ` <small class="discret">${esc(ct.lien)}</small>` : ""}` : ""}</td></tr>`; }).join("")}
      </tbody></table></div>`;
  }
  function pageLicencies(params) {
    if (params) { const u = new URLSearchParams(params); filtres = { q: "", equipe: u.get("equipe") || "", licence: u.get("licence") || "", certif: u.get("certif") || "" }; }
    const js = portee().filter((p) => (!filtres.equipe || p.equipe === filtres.equipe)
      && (!filtres.licence || (filtres.licence === "nonvalidee" ? p.licence.statut !== "validee" : p.licence.statut === filtres.licence))
      && (!filtres.certif || p.certificat === filtres.certif)
      && (!filtres.q || `${p.prenom} ${p.nom} ${p.licence.numero} ${(p.contacts || []).map((c) => c.nom).join(" ")}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(filtres.q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""))));
    const tri = js.sort((a, b) => C.equipes().findIndex((e) => e.id === a.equipe) - C.equipes().findIndex((e) => e.id === b.equipe) || (a.numero || 99) - (b.numero || 99) || a.nom.localeCompare(b.nom, "fr"));
    return `<div class="entete"><div><h1>${estDirigeant() ? "Licenciés" : "Mes joueurs"}</h1><p class="sous">${pl(portee().length, "licencié")} · saison ${C.SAISON.libelle}</p></div>
      <div class="actions">${estDirigeant() ? '<button class="btn" data-a="import-csv">Importer</button>' : ""}<button class="btn" data-a="export-csv">Exporter (CSV)</button><button class="btn prim" data-a="nouveau-joueur">+ Licencié</button></div></div>
      <div class="outils-liste">
        <input type="search" id="fQ" placeholder="Rechercher un nom, un parent, un n° de licence" value="${esc(filtres.q)}" aria-label="Rechercher">
        <select id="fEquipe" aria-label="Équipe">${optEquipes(filtres.equipe, "Toutes les équipes", mesEquipes())}</select>
        <select id="fLicence" aria-label="Licence">${opt("", "Toutes les licences", filtres.licence)}${opt("nonvalidee", "Licence à finaliser", filtres.licence)}${opt("en_attente", "En attente", filtres.licence)}${opt("a_renouveler", "À renouveler", filtres.licence)}${opt("validee", "Validée", filtres.licence)}</select>
        <select id="fCertif" aria-label="Certificat">${opt("", "Tous les certificats", filtres.certif)}${opt("a_fournir", "Certificat à fournir", filtres.certif)}${opt("ok", "Certificat OK", filtres.certif)}</select>
        ${filtres.q || filtres.equipe || filtres.licence || filtres.certif ? '<button class="btn lien" data-a="raz-filtres">Effacer les filtres</button>' : ""}
      </div><p class="compteur">${pl(tri.length, "résultat")}</p><div id="tableLic">${tableJoueurs(tri)}</div>`;
  }

  function formJoueur(p) {
    const neuf = !p.id, ct = (p.contacts && p.contacts[0]) || {};
    const cat = C.categorieAge(p.naissance, p.genre), e = C.equipe(p.equipe);
    const taux = p.id ? C.tauxPresence(p.id) : null;
    const lecture = !estDirigeant(); // le coach modifie le sportif, le bureau l'administratif
    return `${neuf ? "" : `<div class="fiche-tete">${avatarP(p)}<div><b style="font-size:1.05rem">${esc(C.nomComplet(p))}</b><br><span class="discret petit">${esc(C.nomEquipe(p.equipe))}${p.numero ? " · n°" + p.numero : ""}${p.poste ? " · " + esc(p.poste) : ""} · ${age(p.naissance)} ans</span></div></div>` + bilanJoueur(p)}
      ${!neuf && e && cat && cat !== e.categorie ? `<p class="alerte info">Catégorie d'âge <b>${esc(cat)}</b>, joue en ${esc(e.nom)} (surclassement ou erreur de date ?).</p>` : ""}
      ${neuf ? "" : '<details class="modifier"><summary>Modifier les informations</summary>'}<form class="form" id="fJoueur">
        <div class="ligne"><label>Prénom<input name="prenom" required value="${esc(p.prenom)}"></label><label>Nom<input name="nom" required value="${esc(p.nom)}"></label></div>
        <div class="ligne3"><label>Né(e) le<input type="date" name="naissance" value="${esc(p.naissance)}"></label><label>Genre<select name="genre">${opt("M", "Garçon / homme", p.genre)}${opt("F", "Fille / femme", p.genre)}</select></label><label>Catégorie<input value="${esc(cat || "–")}" disabled></label></div>
        <fieldset><legend>Sportif</legend>
          <label>Équipe<select name="equipe">${optEquipes(p.equipe, "Sans équipe", estDirigeant() ? null : mesEquipes())}</select></label>
          <div class="ligne"><label>N° de maillot<input type="number" min="1" max="99" name="numero" value="${esc(p.numero || "")}"></label><label>Poste<select name="poste">${["", "Gardien", "Défenseur", "Milieu", "Attaquant"].map((x) => opt(x, x || "–", p.poste)).join("")}</select></label></div>
        </fieldset>
        <fieldset${lecture ? " disabled" : ""}><legend>Licence et santé${lecture ? " · géré par le secrétariat" : ""}</legend>
          <div class="ligne"><label>N° de licence<input name="licNum" value="${esc(p.licence.numero)}"></label><label>Statut<select name="licStatut">${Object.entries(LICENCE).map(([k, [l]]) => opt(k, l, p.licence.statut)).join("")}</select></label></div>
          <label>Certificat médical / questionnaire santé<select name="certificat">${opt("ok", "Fourni", p.certificat)}${opt("a_fournir", "À fournir", p.certificat)}</select></label>
        </fieldset>
        <fieldset><legend>Contacts</legend>
          <div class="ligne"><label>Téléphone du joueur<input type="tel" name="tel" value="${esc(p.tel)}" placeholder="Si majeur"></label><label>E-mail<input type="email" name="email" value="${esc(p.email)}"></label></div>
          <div class="ligne"><label>Responsable légal<input name="ctNom" value="${esc(ct.nom)}" placeholder="Nom"></label><label>Lien<select name="ctLien">${["", "Mère", "Père", "Tuteur", "Autre"].map((x) => opt(x, x || "–", ct.lien)).join("")}</select></label></div>
          <div class="ligne"><label>Tél. du responsable<input type="tel" name="ctTel" value="${esc(ct.tel)}"></label><label>E-mail du responsable<input type="email" name="ctEmail" value="${esc(ct.email)}"></label></div>
        </fieldset>
        <label>Notes (visibles du staff)<textarea name="notes" placeholder="Allergie, contre-indication, transport…">${esc(p.notes)}</textarea></label>
        <div class="pied">${!neuf && estDirigeant() ? '<button type="button" class="btn danger gauche" data-a="suppr-joueur">Supprimer</button>' : ""}<button type="button" class="btn" data-a="fermer">Annuler</button><button class="btn prim">${neuf ? "Ajouter" : "Enregistrer"}</button></div>
      </form>${neuf ? "" : "</details>"}`;
  }
  // Saison d'un joueur : matchs, buts, passes, présence, dernières convocations et derniers entraînements
  function bilanJoueur(p) {
    const st = C.statsJoueur(p.id); if (!st) return "";
    const ms = C.evenements({ equipe: p.equipe, du: C.SAISON.debut, au: ajout(auj(), 21), types: ["match", "amical"] }).filter((e) => e.statut !== "annule").reverse().slice(0, 6);
    const ents = C.evenements({ equipe: p.equipe, du: ajout(auj(), -42), au: ajout(auj(), -1), types: ["entrainement"] }).filter((e) => e.statut !== "annule" && Object.keys(C.presences(e.id)).length).slice(-10);
    return `<div class="bilan"><div><b>${st.joues}</b><span>matchs joués</span></div><div><b>${st.buts}</b><span>buts</span></div><div><b>${st.passes}</b><span>passes déc.</span></div><div><b>${st.presence != null ? st.presence + "%" : "–"}</b><span>présence</span></div></div>
      <h3>Matchs et convocations</h3>${ms.length ? `<ul class="hist">${ms.map((e) => { const cv = C.convocation(e.id), f = C.feuille(e.id), x = f && f.stats[p.id], d = C.dispos(e.id)[p.id];
        const etat = e.date >= auj() ? (cv ? (cv.joueurs.includes(p.id) ? '<span class="etiq ok">Convoqué</span>' : '<span class="etiq">Non convoqué</span>') : d ? `<span class="etiq ${d.statut === "present" ? "ok" : d.statut === "absent" ? "ko" : "att"}">${DISPO[d.statut] || ""}</span>` : '<span class="etiq">À venir</span>')
          : f ? (f.joueurs.includes(p.id) ? `<span class="etiq ok">A joué</span>${x && x.buts ? ` <span class="etiq or">⚽ ${x.buts}</span>` : ""}${x && x.passes ? ` <span class="etiq bleu">PD ${x.passes}</span>` : ""}` : cv && cv.joueurs.includes(p.id) ? '<span class="etiq att">Convoqué, pas joué</span>' : '<span class="etiq">Non convoqué</span>') : cv ? (cv.joueurs.includes(p.id) ? '<span class="etiq">Convoqué</span>' : '<span class="etiq">Non convoqué</span>') : "";
        return `<li><a href="#${e.date < auj() ? "feuille" : "convoc"}/${esc(e.id)}"><span>${fJ(e.date)} · ${esc(e.adversaire || e.titre)}</span>${e.date < auj() && f ? scoreHTML(e, f) : ""}</a><span class="et">${etat}</span></li>`; }).join("")}</ul>` : '<p class="discret petit">Aucun match.</p>'}
      <h3>Présence aux entraînements</h3>${ents.length ? `<div class="pastilles">${ents.map((e) => { const s = C.presences(e.id)[p.id]; return `<span class="pres ${s || "vide"}" title="${fJ(e.date)} · ${s ? PRES[s][0] : "non renseigné"}">${s ? PRES[s][2] : "·"}</span>`; }).join("")}</div><p class="aide">P présent · R retard · E excusé · A absent</p>` : '<p class="discret petit">Aucun entraînement.</p>'}`;
  }
  function ouvrirJoueur(id, equipe) {
    const p = id ? JSON.parse(JSON.stringify(C.personne(id))) : { prenom: "", nom: "", genre: equipe && C.equipe(equipe) && C.equipe(equipe).genre === "F" ? "F" : "M", naissance: "", equipe: equipe || (estDirigeant() ? "" : mesEquipes()[0]), numero: "", poste: "", licence: { numero: "", statut: "en_attente" }, certificat: "a_fournir", tel: "", email: "", contacts: [], notes: "" };
    if (!p) return;
    tiroir(id ? "Fiche joueur" : "Nouveau licencié", formJoueur(p), (f) => {
      const d = new FormData(f), v = (k) => (d.get(k) || "").trim();
      const obj = { id: p.id, prenom: v("prenom"), nom: v("nom").toUpperCase() === v("nom") ? maj1(v("nom").toLowerCase()) : v("nom"), naissance: v("naissance"), genre: v("genre"), equipe: v("equipe"), numero: +v("numero") || null, poste: v("poste"), tel: v("tel"), email: v("email"), notes: v("notes"),
        contacts: v("ctNom") || v("ctTel") ? [{ nom: v("ctNom"), lien: v("ctLien"), tel: v("ctTel"), email: v("ctEmail") }] : [] };
      if (estDirigeant()) { obj.licence = { numero: v("licNum"), statut: v("licStatut") }; obj.certificat = v("certificat"); } else if (!p.id) { obj.licence = p.licence; obj.certificat = p.certificat; }
      if (obj.numero && obj.equipe && C.joueurs(obj.equipe).some((x) => x.id !== p.id && x.numero === obj.numero)) return toast(`Le n° ${obj.numero} est déjà pris dans cette équipe.`);
      C.enregistrer("personnes", obj); fermer(); toast(p.id ? "Fiche enregistrée." : `${obj.prenom} ajouté${obj.genre === "F" ? "e" : ""} à l'effectif.`);
    });
    $("#tiroirCorps").dataset.joueur = id || "";
  }

  /* ---------- staff ---------- */
  function pageStaff() {
    const st = C.staff(), dir = estDirigeant();
    const sansCoach = C.equipes().filter((e) => !C.coachDe(e.id));
    const carte = (s) => `<button class="pers" data-a="${dir ? "staff" : "staff-voir"}" data-id="${esc(s.id)}">${avatarP(s)}<span><b>${esc(C.nomComplet(s))}</b><small>${esc(s.fonction || ROLES[s.role] || s.role)}${s.diplome && s.diplome !== "Aucun" ? " · " + esc(s.diplome) : ""}</small><small>${esc(s.tel)}</small>${s.equipes.length ? `<span class="chips">${s.equipes.map((e) => `<span class="etiq bleu">${esc(C.nomEquipe(e))}</span>`).join("")}</span>` : ""}</span></button>`;
    const bureau = st.filter((s) => !["coach", "adjoint"].includes(s.role)), educ = st.filter((s) => ["coach", "adjoint"].includes(s.role));
    return `<div class="entete"><div><h1>${dir ? "Éducateurs et bureau" : "Contacts du club"}</h1><p class="sous">${pl(educ.length, "éducateur")} · ${bureau.length} au bureau</p></div>${dir ? '<div class="actions"><button class="btn prim" data-a="staff">+ Personne</button></div>' : ""}</div>
      ${dir && sansCoach.length ? `<p class="alerte ko" style="margin-bottom:14px"><b>${pl(sansCoach.length, "équipe")} sans éducateur :</b> ${sansCoach.map((e) => esc(e.nom)).join(", ")}. Ouvrez une fiche pour l'affecter.</p>` : ""}
      <h2 class="groupe-titre">Bureau</h2><div class="personnes">${bureau.map(carte).join("")}</div>
      <h2 class="groupe-titre">Éducateurs</h2><div class="personnes">${educ.map(carte).join("")}</div>`;
  }
  function ouvrirStaff(id, lecture) {
    const s = id ? C.staff().find((x) => x.id === id) : { prenom: "", nom: "", role: "coach", fonction: "", equipes: [], tel: "", email: "", diplome: "" };
    if (lecture) return tiroir(C.nomComplet(s), `<div class="fiche-tete">${avatarP(s)}<div><b>${esc(C.nomComplet(s))}</b><br><span class="discret petit">${esc(s.fonction || ROLES[s.role])}</span></div></div>
      <dl class="detail"><dt>Équipes</dt><dd>${s.equipes.map(C.nomEquipe).join(", ") || "–"}</dd><dt>Téléphone</dt><dd><a href="tel:${esc(s.tel.replace(/\s/g, ""))}">${esc(s.tel)}</a></dd><dt>E-mail</dt><dd><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></dd></dl>`);
    tiroir(id ? "Modifier la fiche" : "Nouvelle personne", `<form class="form" id="fStaff">
      <div class="ligne"><label>Prénom<input name="prenom" required value="${esc(s.prenom)}"></label><label>Nom<input name="nom" required value="${esc(s.nom)}"></label></div>
      <div class="ligne"><label>Rôle<select name="role">${Object.entries(ROLES).map(([k, l]) => opt(k, l, s.role)).join("")}</select></label><label>Fonction (affichée)<input name="fonction" value="${esc(s.fonction)}" placeholder="ex. Responsable U13"></label></div>
      <fieldset><legend>Équipes encadrées</legend><div class="cases">${C.equipes().map((e) => `<label><input type="checkbox" name="equipes" value="${esc(e.id)}"${s.equipes.includes(e.id) ? " checked" : ""}> ${esc(e.nom)}${!C.coachDe(e.id) ? " ⚠️" : ""}</label>`).join("")}</div><p class="aide">⚠️ équipe sans éducateur.</p></fieldset>
      <div class="ligne"><label>Téléphone<input type="tel" name="tel" value="${esc(s.tel)}"></label><label>E-mail<input type="email" name="email" value="${esc(s.email)}"></label></div>
      <label>Diplôme<select name="diplome">${["", "Aucun", "CFF1", "CFF2", "CFF3", "CFF4", "BMF", "BEF", "DES"].map((x) => opt(x, x || "–", s.diplome)).join("")}</select></label>
      <div class="pied">${id ? '<button type="button" class="btn danger gauche" data-a="suppr-staff">Retirer du club</button>' : ""}<button type="button" class="btn" data-a="fermer">Annuler</button><button class="btn prim">Enregistrer</button></div></form>`, (f) => {
      const d = new FormData(f);
      C.enregistrer("staff", { id: s.id, prenom: d.get("prenom").trim(), nom: d.get("nom").trim(), role: d.get("role"), fonction: d.get("fonction").trim(), equipes: d.getAll("equipes"), tel: d.get("tel").trim(), email: d.get("email").trim(), diplome: d.get("diplome") });
      fermer(); toast("Fiche enregistrée.");
    });
    $("#tiroirCorps").dataset.staff = id || "";
  }

  /* ---------- calendrier ---------- */
  let cal = { vue: matchMedia("(max-width: 820px)").matches ? "liste" : "semaine", ref: auj(), equipe: "", types: { match: true, entrainement: true, club: true } };
  const estClub = (e) => !["match", "amical", "entrainement"].includes(e.type);
  function evtsCal(du, au) {
    return C.evenements({ du, au, equipes: estDirigeant() ? null : mesEquipes() }).filter((e) => (!cal.equipe || e.equipe === cal.equipe) && (estClub(e) ? cal.types.club : cal.types[estMatch(e) ? "match" : e.type]));
  }
  function pageCalendrier() {
    let du, au, titre, corps;
    if (cal.vue === "mois") {
      const r = jour(cal.ref); const p = new Date(r.getFullYear(), r.getMonth(), 1); du = lundi(iso(p)); const d = new Date(r.getFullYear(), r.getMonth() + 1, 0); au = ajout(lundi(iso(d)), 6);
      titre = maj1(p.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
      const ev = evtsCal(du, au), mois = p.getMonth();
      corps = `<div class="mois">${["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."].map((j) => `<div class="jn">${j}</div>`).join("")}${Array.from({ length: (jour(au) - jour(du)) / 864e5 + 1 }, (_, i) => { const dt = ajout(du, i), l = ev.filter((e) => e.date === dt);
        return `<div class="mc${jour(dt).getMonth() !== mois ? " hors" : ""}${dt === auj() ? " auj" : ""}" data-a="jour" data-date="${dt}"><span class="d">${jour(dt).getDate()}</span>${l.slice(0, 4).map((e) => `<span class="m t-${e.type}${e.statut === "annule" ? " annule" : ""}" data-a="evt" data-id="${esc(e.id)}" title="${esc(C.nomEquipe(e.equipe) + " · " + e.titre)}">${hh(e.heure)} ${esc(e.equipe ? C.nomEquipe(e.equipe) : e.titre)}</span>`).join("")}${l.length > 4 ? `<span class="plus">+${l.length - 4}</span>` : ""}</div>`; }).join("")}</div>`;
    } else if (cal.vue === "semaine") {
      du = lundi(cal.ref); au = ajout(du, 6);
      titre = `Semaine du ${fmt(du, { day: "numeric", month: "long" })}`;
      const ev = evtsCal(du, au);
      corps = `<div class="semaine">${Array.from({ length: 7 }, (_, i) => { const dt = ajout(du, i), l = ev.filter((e) => e.date === dt);
        return `<div class="sj${dt === auj() ? " auj" : ""}${l.length ? "" : " vide-j"}"><div class="tete"><span>${fmt(dt, { weekday: "short" })}</span><b>${jour(dt).getDate()}</b></div>${l.map((e) => ligneEvt(e)).join("") || '<span class="discret petit">–</span>'}</div>`; }).join("")}</div>`;
    } else {
      du = cal.ref; au = ajout(du, 20); titre = `Du ${fmt(du, { day: "numeric", month: "short" })} au ${fmt(au, { day: "numeric", month: "short" })}`;
      corps = `<section class="carte">${agenda(evtsCal(du, au))}</section>`;
    }
    const n = evtsCal(du, au);
    return `<div class="entete"><div><h1>Calendrier</h1><p class="sous">Matchs des PV du District, entraînements des créneaux et événements du club.</p></div><div class="actions"><button class="btn prim" data-a="nouvel-evt">+ Événement</button></div></div>
      <div class="cal-barre"><button class="btn" data-a="cal-prec" aria-label="Période précédente">‹</button><button class="btn" data-a="cal-auj">Aujourd'hui</button><button class="btn" data-a="cal-suiv" aria-label="Période suivante">›</button><span class="periode">${titre}</span>
        <span class="bascule">${[["semaine", "Semaine"], ["mois", "Mois"], ["liste", "Liste"]].map(([k, l]) => `<button data-a="cal-vue" data-v="${k}" aria-pressed="${cal.vue === k}">${l}</button>`).join("")}</span>
        <select class="champ" id="calEquipe" aria-label="Équipe">${optEquipes(cal.equipe, estDirigeant() ? "Toutes les équipes" : "Mes équipes", mesEquipes())}</select>
        <span class="filtres-types">${[["match", "Matchs", "var(--match)"], ["entrainement", "Entraînements", "var(--entr)"], ["club", "Club", "var(--club)"]].map(([k, l, c]) => `<button class="puce" style="--c:${c}" data-a="cal-type" data-v="${k}" aria-pressed="${cal.types[k]}">${l}</button>`).join("")}</span>
      </div>${corps}<p class="compteur">${pl(n.filter(estMatch).length, "match", "matchs")} · ${pl(n.filter((e) => e.type === "entrainement" && e.statut !== "annule").length, "entraînement")} · ${pl(n.filter(estClub).length, "événement")} du club</p>`;
  }

  function ouvrirEvt(id) {
    const e = C.evenement(id); if (!e) return toast("Événement introuvable.");
    const cv = convocable(e) ? C.convocation(e.id) : null, peut = !e.equipe ? estDirigeant() : peutVoir(e.equipe);
    const pres = C.presences(e.id), nP = Object.values(pres).filter((s) => s === "present" || s === "retard").length, dispo = C.dispos(e.id);
    const passe = e.date <= auj();
    let actions = "";
    if (convocable(e)) actions = peut && e.statut !== "annule" && e.date >= auj() ? `<a class="btn prim" href="#convoc/${esc(e.id)}">${cv ? "Voir la convocation" : "Préparer la convocation"}</a>` : estMatch(e) && peut && e.date <= auj() && e.statut !== "annule" ? `<a class="btn prim" href="#feuille/${esc(e.id)}">${C.feuille(e.id) ? "Voir la feuille de match" : "Saisir le score"}</a>` : "";
    if (e.type === "entrainement" && peut) actions = (e.statut !== "annule" ? `<button class="btn prim" data-a="appel" data-id="${esc(e.id)}">${Object.keys(pres).length ? "Modifier l'appel" : "Faire l'appel"}</button>` : "") + `<button class="btn" data-a="modifier-evt" data-id="${esc(e.id)}">Déplacer</button>`;
    if (e.source === "manuel" && peut) actions += `<button class="btn" data-a="modifier-evt" data-id="${esc(e.id)}">Modifier</button>${e.type !== "match" ? `<button class="btn" data-a="appel" data-id="${esc(e.id)}">Présences</button>` : ""}`;
    if (peut && e.source !== "manuel") actions += e.statut === "annule" ? `<button class="btn" data-a="retablir" data-id="${esc(e.id)}">Rétablir</button>` : `<button class="btn danger" data-a="annuler-evt" data-id="${esc(e.id)}">Annuler ${estMatch(e) ? "(report)" : "la séance"}</button>`;
    if (e.source === "manuel" && peut) actions += `<button class="btn danger" data-a="suppr-evt" data-id="${esc(e.id)}">Supprimer</button>`;
    tiroir(TYPES[e.type] || "Événement", `<p style="margin:0 0 4px"><span class="etiq ${estMatch(e) ? "bleu" : e.type === "entrainement" ? "ok" : "or"}">${esc(TYPES[e.type])}</span> ${e.statut === "annule" ? '<span class="etiq ko">Annulé</span>' : ""} ${e.coupe ? '<span class="etiq or">Coupe</span>' : ""}</p>
      <h3 style="font-size:1.2rem;margin:8px 0 12px">${esc(e.titre)}</h3>
      <dl class="detail"><dt>Équipe</dt><dd>${e.equipe ? `<a href="#equipe/${esc(e.equipe)}">${esc(C.nomEquipe(e.equipe))}</a>` : "Tout le club"}</dd><dt>Date</dt><dd>${fJL(e.date)} · ${hh(e.heure)} (${e.duree} min)</dd><dt>Lieu</dt><dd>${esc(e.lieu || "–")}</dd>
        ${e.competition ? `<dt>Compétition</dt><dd>${esc(e.competition)}</dd>` : ""}${e.source === "pv" ? `<dt>Source</dt><dd>PV du District n°${esc(e.pv)} · <a href="${URL_MOD.pv(e.equipe)}">voir</a></dd>` : ""}
        ${e.notes ? `<dt>Notes</dt><dd>${esc(e.notes)}</dd>` : ""}
        ${convocable(e) ? `<dt>Convocation</dt><dd>${cv ? `✅ ${pl(cv.joueurs.length, "convoqué")}, RDV ${hh(cv.rdvHeure)} · ${esc(cv.rdvLieu)}` : "⏳ pas encore faite"}</dd>` : ""}
        ${e.type === "entrainement" ? `<dt>Présences</dt><dd>${Object.keys(pres).length ? `${nP} / ${C.joueurs(e.equipe).length} présents` : passe ? "appel non fait" : "à venir"}${Object.keys(dispo).length ? ` · ${pl(Object.keys(dispo).length, "absence signalée", "absences signalées")}` : ""}</dd>` : ""}</dl>
      ${e.type === "entrainement" && e.statut !== "annule" ? seanceHTML(e, peut) : ""}
      <div class="form"><div class="pied" style="justify-content:flex-start">${actions}${e.equipe ? `<a class="btn" href="${URL_MOD.messagerie(e.equipe)}">Messagerie</a>` : ""}</div></div>`);
  }

  function ouvrirFormEvt(id, equipe, date, type) {
    const e = id ? C.evenement(id) : { type: type || "entrainement", equipe: equipe || (estDirigeant() ? "" : mesEquipes()[0]), date: date || auj(), heure: "18:30", duree: 90, lieu: C.club.lieux[0], titre: "", notes: "", adversaire: "" };
    const fige = id && e.source !== "manuel"; // séance d'un créneau ou match des PV : seulement horaire et lieu
    const types = estDirigeant() ? ["entrainement", "amical", "plateau", "tournoi", "reunion", "autre"] : ["entrainement", "amical", "plateau", "tournoi", "autre"];
    tiroir(id ? (fige ? "Déplacer" : "Modifier l'événement") : "Nouvel événement", `<form class="form" id="fEvt">
      ${fige ? `<p class="alerte info">${estMatch(e) ? "Match officiel (PV du District)." : "Séance issue d'un créneau hebdomadaire."} Seuls la date, l'heure et le lieu de cette séance changent.</p>` : `
      <div class="ligne"><label>Type<select name="type">${types.map((t) => opt(t, TYPES[t] === "Entraînement" ? "Entraînement ponctuel" : TYPES[t], e.type)).join("")}</select></label>
        <label>Équipe<select name="equipe">${estDirigeant() ? optEquipes(e.equipe || "", "Tout le club") : optEquipes(e.equipe, "", mesEquipes())}</select></label></div>
      <label>Titre<input name="titre" value="${esc(e.titre)}" placeholder="ex. Plateau U9, Réunion des parents… (facultatif pour un amical)"></label>
      <div class="ligne" id="champsAmical"${e.type === "amical" ? "" : " hidden"}><label>Adversaire<input name="adversaire" value="${esc(e.adversaire || "")}" placeholder="ex. Chassieu Décines"></label><label>Lieu du match<select name="domicile">${opt("1", "À domicile", e.domicile === false ? "" : "1")}${opt("", "À l'extérieur", e.domicile === false ? "" : "1")}</select></label></div>`}
      <div class="ligne3"><label>Date<input type="date" name="date" required value="${esc(e.date)}"></label><label>Heure<input type="time" name="heure" required value="${esc(e.heure)}"></label><label>Durée (min)<input type="number" name="duree" min="15" step="15" value="${esc(e.duree)}"></label></div>
      <label>Lieu<input name="lieu" list="lieux" value="${esc(e.lieu)}"><datalist id="lieux">${C.club.lieux.map((l) => `<option value="${esc(l)}">`).join("")}<option value="Club-house"></datalist></label>
      ${fige ? "" : `<label>Notes<textarea name="notes" placeholder="Infos pour le staff et les familles">${esc(e.notes)}</textarea></label>`}
      <div class="pied"><button type="button" class="btn" data-a="fermer">Annuler</button><button class="btn prim">${id ? "Enregistrer" : "Créer"}</button></div></form>`, (f) => {
      const d = new FormData(f), v = (k) => (d.get(k) || "").trim();
      const champs = { date: v("date"), heure: v("heure"), duree: +v("duree") || 90, lieu: v("lieu") };
      if (fige) { C.modifierEvenement(id, champs); fermer(); toast("Séance déplacée."); return; }
      const type = v("type"), eq = v("equipe") || null;
      const adv = v("adversaire"), dom = !!v("domicile");
      if (type === "amical" && !eq) return toast("Choisissez l'équipe qui joue ce match.");
      const titre = v("titre") || (type === "amical" && adv ? (dom ? `ESGA – ${adv}` : `${adv} – ESGA`) + " (amical)" : type === "entrainement" ? "Entraînement" : `${TYPES[type]}${eq ? " · " + C.nomEquipe(eq) : ""}`);
      const plus = type === "amical" ? { adversaire: adv || "Adversaire à confirmer", domicile: dom, competition: "Match amical" } : {};
      if (id) C.modifierEvenement(id, Object.assign(champs, { type, equipe: eq, titre, notes: v("notes") }, plus));
      else C.enregistrer("evenements", Object.assign(champs, { type, equipe: eq, titre, notes: v("notes") }, plus));
      fermer(); toast(id ? "Événement modifié." : "Ajouté au calendrier.");
    });
  }

  /* ---------- appel ---------- */
  function ouvrirAppel(id) {
    const e = C.evenement(id); if (!e || !e.equipe) return;
    const rendreAppel = () => {
      const pres = C.presences(id), dispo = C.dispos(id), js = C.joueurs(e.equipe);
      // Une absence prévenue par la famille compte comme « excusé » tant que le coach ne change rien
      const etatDe = (p) => pres[p.id] || (dispo[p.id] && dispo[p.id].statut === "absent" ? "excuse" : null);
      const n = (k) => js.filter((p) => etatDe(p) === k).length;
      $("#tiroirCorps").innerHTML = `<p class="discret" style="margin:-4px 0 12px">${esc(C.nomEquipe(e.equipe))} · ${fJL(e.date)} · ${hh(e.heure)}</p>
        <div class="outils-liste"><button class="btn prim" data-a="tous-presents" data-id="${esc(id)}">✓ Tous les autres sont présents</button><span class="discret petit" style="margin-left:auto">${n("present") + n("retard")} présents · ${n("excuse") + n("absent")} absents · ${js.filter((p) => !etatDe(p)).length} à cocher</span></div>
        ${C.seance(id) ? seanceHTML(e, peutVoir(e.equipe), true) : ""}
        <p class="aide" style="margin:-4px 0 8px">Les absences prévenues par les familles sont déjà indiquées. Touchez seulement les exceptions, puis « Tous les autres sont présents ».</p>
        <ul class="appel">${js.map((p) => `<li><span class="n"><b>${esc(p.prenom)}</b> ${esc(p.nom)}${dispo[p.id] ? `<small>Absence signalée : ${esc(dispo[p.id].motif || "")}${dispo[p.id].precision ? " · " + esc(dispo[p.id].precision) : ""}</small>` : ""}</span>
          <span class="seg">${Object.entries(PRES).map(([k, [l, c]]) => `<button class="${c}" data-a="pres" data-evt="${esc(id)}" data-j="${esc(p.id)}" data-v="${k}" aria-pressed="${etatDe(p) === k}">${l}</button>`).join("")}</span></li>`).join("")}</ul>
        <div class="form"><div class="pied"><button class="btn prim" data-a="fermer">Terminé</button></div></div>`;
    };
    tiroir("Appel", ""); rendreAppel(); ouvrirAppel.rendre = rendreAppel;
  }

  /* ---------- convocations ---------- */
  /* ---------- matchs : à venir (sondage puis convocation) et joués (score, buts, passes) ---------- */
  // Le sondage est « lancé » seulement par le coach ; les absences prévenues avant comptent déjà dans les réponses
  function etatSondage(e) {
    const js = C.joueurs(e.equipe), d = C.dispos(e.id), n = (k) => js.filter((p) => d[p.id] && d[p.id].statut === k).length;
    return { lance: !!C.sondage(e.id), oui: n("present"), peut: n("incertain"), non: n("absent"), sans: js.filter((p) => !d[p.id]).length, total: js.length };
  }
  // « 12 présentes · 1 peut-être · 2 absentes · 1 sans réponse » (les mêmes mots que dans la messagerie)
  const compteDispo = (so, e) => { const f = (C.equipe(e.equipe) || {}).genre === "F" ? "e" : "", s = (n) => (n > 1 ? "s" : "");
    return `${so.oui} présent${f}${s(so.oui)} · ${so.peut} peut-être · ${so.non} absent${f}${s(so.non)} · ${so.sans} sans réponse`; };
  function scoreHTML(e, f) {
    if (!f) return '<span class="etiq att">Score à saisir</span>';
    const r = f.nous > f.eux ? "ok" : f.nous < f.eux ? "ko" : "";
    return `<span class="score ${r}">${e.domicile ? `${f.nous} – ${f.eux}` : `${f.eux} – ${f.nous}`}</span>`;
  }
  function buteursHTML(f) {
    const l = Object.entries((f && f.stats) || {}).filter(([, x]) => x.buts).sort((a, b) => b[1].buts - a[1].buts).map(([id, x]) => `${esc((C.personne(id) || {}).prenom || "?")}${x.buts > 1 ? " ×" + x.buts : ""}`);
    return l.length ? "⚽ " + l.join(", ") : "";
  }
  function pageConvocations(onglet) {
    const joues = onglet === "joues";
    const tabs = `<nav class="onglets"><a href="#convocations"${joues ? "" : ' aria-current="page"'}>À venir</a><a href="#convocations/joues"${joues ? ' aria-current="page"' : ""}>Joués</a></nav>`;
    const tete = `<div class="entete"><div><h1>Matchs</h1><p class="sous">${joues ? "Saisissez le score, les buts et les passes décisives : les fiches des joueurs se remplissent toutes seules." : `Pour chaque match ou plateau : 1. le sondage aux familles (ouvert ${C.JOURS_SONDAGE} jours avant), 2. la convocation. Les deux sont publiés dans les Annonces de l'équipe (messagerie).`}</p></div>
      ${estFamille() ? "" : '<div class="actions"><button class="btn" data-a="nouvel-evt" data-type="amical">+ Match amical</button></div>'}</div>`;
    if (joues) {
      const evs = C.evenements({ du: C.SAISON.debut, au: ajout(auj(), -1), types: ["match", "amical"] }).filter((e) => peutVoir(e.equipe) && e.statut !== "annule").reverse();
      return tete + tabs + `<div class="table-wrap"><table class="liste"><thead><tr><th>Date</th>${estDirigeant() ? "<th>Équipe</th>" : ""}<th>Match</th><th class="cache-m">Score</th><th class="cache-m">Buteurs</th><th></th></tr></thead><tbody>
        ${evs.map((e) => { const f = C.feuille(e.id);
          return `<tr data-a="lien" data-href="#feuille/${esc(e.id)}"><td>${fJ(e.date)}</td>${estDirigeant() ? `<td><b>${esc(C.nomEquipe(e.equipe))}</b></td>` : ""}<td>${esc(e.titre)}${C.video(e.id) ? " 🎬" : ""}<br><small class="discret">${esc(e.competition || "")}</small><span class="seul-m"> ${scoreHTML(e, f)}</span></td><td class="cache-m">${scoreHTML(e, f)}</td><td class="cache-m petit">${buteursHTML(f)}</td><td><a class="btn mini${f ? "" : " prim"}" href="#feuille/${esc(e.id)}">${f ? "Voir" : "Saisir"}</a></td></tr>`; }).join("") || `<tr><td colspan="6" class="vide">Aucun match joué cette saison.</td></tr>`}
        </tbody></table></div>`;
    }
    const evs = C.rencontres(null, auj(), ajout(auj(), 35)).filter((e) => peutVoir(e.equipe));
    return tete + tabs + (evs.length ? `<div class="matchs">${evs.map((e) => {
      const so = etatSondage(e), cv = C.convocation(e.id);
      const etape1 = so.lance ? `<div class="etape fait"><span class="num">1</span><span class="txt"><b>Sondage</b><small><span class="v">✓ ${so.oui}</span> · <span class="o">? ${so.peut}</span> · <span class="r">✕ ${so.non}</span> · ${so.sans} sans réponse</small></span>${so.sans && !cv ? `<button class="btn mini" data-a="relancer-sondage" data-id="${esc(e.id)}">Relancer</button>` : ""}</div>`
        : cv ? `<div class="etape fait"><span class="num">1</span><span class="txt"><b>Sondage</b><small>Pas de sondage : convocation faite directement.</small></span></div>`
        : C.sondagePossible(e) ? `<div class="etape"><span class="num">1</span><span class="txt"><b>Sondage</b><small>Qui est disponible ? Les familles répondent en un clic.${so.non ? ` Déjà ${pl(so.non, "absence prévenue", "absences prévenues")}.` : ""}</small></span><button class="btn mini prim" data-a="lancer-sondage" data-id="${esc(e.id)}">Lancer</button></div>`
        : `<div class="etape"><span class="num">1</span><span class="txt"><b>Sondage</b><small>Possible à partir du ${fJ(C.ouvertureSondage(e))} (${C.JOURS_SONDAGE} jours avant).${so.non ? ` Déjà ${pl(so.non, "absence prévenue", "absences prévenues")}.` : ""}</small></span></div>`;
      const etape2 = cv ? `<div class="etape fait"><span class="num">2</span><span class="txt"><b>Convocation publiée</b><small>${pl(cv.joueurs.length, "convoqué")} · RDV ${hh(cv.rdvHeure)}</small></span><a class="btn mini" href="#convoc/${esc(e.id)}">Voir</a></div>`
        : `<div class="etape"><span class="num">2</span><span class="txt"><b>Convocation</b><small>${so.lance ? `${so.oui} disponible${so.oui > 1 ? "s" : ""} pour l'instant` : "Après le sondage, ou tout de suite"}</small></span><a class="btn mini${so.lance ? " prim" : ""}" href="#convoc/${esc(e.id)}">Faire</a></div>`;
      return `<section class="carte match-carte"><div class="mc-tete"><span class="date"><b>${fmt(e.date, { weekday: "short" })}</b><span>${jour(e.date).getDate()}</span><small>${fmt(e.date, { month: "short" })}</small></span>
        <span><b>${esc(e.titre)}</b><small>${estDirigeant() ? esc(C.nomEquipe(e.equipe)) + " · " : ""}${hh(e.heure)} · ${esc(e.lieu)}<br>${esc(e.competition || TYPES[e.type])}</small></span></div>${etape1}${etape2}</section>`; }).join("")}</div>` : '<p class="vide">Aucun match ni plateau dans les 5 prochaines semaines. Ajoutez un match amical si besoin.</p>');
  }

  const feuilles = {};
  function pageFeuille(id) {
    const e = C.evenement(id);
    if (!e || !peutVoir(e.equipe)) return `<p class="vide">Match introuvable.</p>`;
    const cv = C.convocation(id), js = C.joueurs(e.equipe), ex = C.feuille(id);
    const f = feuilles[id] || (feuilles[id] = ex ? JSON.parse(JSON.stringify(ex)) : { nous: 0, eux: 0, joueurs: cv ? cv.joueurs.slice() : [], stats: {}, notes: "" });
    const totalButs = Object.values(f.stats).reduce((t, x) => t + (x.buts || 0), 0);
    const adv = e.adversaire || "Adversaire", futur = e.date > auj();
    const ligne = (p) => { const st = f.stats[p.id] || { buts: 0, passes: 0 }, joue = f.joueurs.includes(p.id);
      return `<li class="${joue ? "" : "pas-joue"}"><label class="joue"><input type="checkbox" data-a="f-joue" data-id="${esc(p.id)}"${joue ? " checked" : ""}><span class="num">${p.numero || "–"}</span><span class="n"><b>${esc(p.prenom)} ${esc(p.nom)}</b><small>${cv && !cv.joueurs.includes(p.id) ? "non convoqué" + (p.genre === "F" ? "e" : "") : esc(p.poste || "")}</small></span></label>
        <span class="compteurs"><span class="cpt"><small>Buts</small><button type="button" data-a="f-moins" data-k="buts" data-id="${esc(p.id)}" aria-label="Un but de moins">−</button><b>${st.buts || 0}</b><button type="button" data-a="f-plus" data-k="buts" data-id="${esc(p.id)}" aria-label="Un but de plus">+</button></span>
        <span class="cpt"><small>Passes déc.</small><button type="button" data-a="f-moins" data-k="passes" data-id="${esc(p.id)}" aria-label="Une passe de moins">−</button><b>${st.passes || 0}</b><button type="button" data-a="f-plus" data-k="passes" data-id="${esc(p.id)}" aria-label="Une passe de plus">+</button></span></span></li>`; };
    const ordre = js.slice().sort((a, b) => (f.joueurs.includes(b.id) ? 1 : 0) - (f.joueurs.includes(a.id) ? 1 : 0));
    const sc = (k) => `<span class="cpt grand"><button type="button" data-a="f-moins" data-k="${k}" aria-label="Moins">−</button><b>${f[k]}</b><button type="button" data-a="f-plus" data-k="${k}" aria-label="Plus">+</button></span>`;
    return `<div class="entete"><div><p class="fil-ariane"><a href="#convocations/joues">Matchs joués</a> ›</p><h1>${esc(e.titre)}</h1><p class="sous">${esc(C.nomEquipe(e.equipe))} · ${fJL(e.date)} · ${esc(e.competition || "")}</p></div></div>
      ${futur ? '<p class="alerte info">Ce match n\'est pas encore joué : vous pourrez saisir le score après la rencontre.</p>' : ""}
      <section class="carte tableau-score"><div class="equipe-score"><b>${e.domicile ? "ESGA" : esc(adv)}</b>${e.domicile ? sc("nous") : sc("eux")}</div><span class="tiret">–</span><div class="equipe-score">${e.domicile ? sc("eux") : sc("nous")}<b>${e.domicile ? esc(adv) : "ESGA"}</b></div></section>
      ${totalButs !== f.nous ? `<p class="aide" style="text-align:center;margin:-4px 0 12px">${totalButs} but${totalButs > 1 ? "s" : ""} attribué${totalButs > 1 ? "s" : ""} aux joueurs sur ${f.nous} marqué${f.nous > 1 ? "s" : ""}${totalButs < f.nous ? " (contre son camp adverse ? pas grave)" : ""}. <button class="btn lien" data-a="f-score-auto">Mettre ${totalButs}</button></p>` : ""}
      <section class="carte"><h2>Qui a joué ? <span class="etiq bleu">${f.joueurs.length}</span><span class="plus discret petit">Touchez + pour chaque but ou passe décisive</span></h2>
        <ul class="feuille">${ordre.map(ligne).join("")}</ul>
        <div class="form" style="margin-top:12px"><label>Notes du coach (privées)<textarea id="fNotes" placeholder="Ce qui a marché, ce qu'on travaille mardi…">${esc(f.notes)}</textarea></label>
        <div class="pied">${ex ? `<span class="discret petit gauche">Enregistré le ${new Date(ex.saisie).toLocaleDateString("fr-FR")}</span>` : ""}<a class="btn" href="#convocations/joues">Annuler</a><button class="btn prim" data-a="f-enregistrer" data-id="${esc(id)}"${futur ? " disabled" : ""}>Enregistrer le match</button></div></div></section>
      ${futur ? "" : carteVideo(e)}`;
  }

  const brouillons = {};
  function pageConvoc(id) {
    const e = C.evenement(id);
    if (!e || !peutVoir(e.equipe)) return `<p class="vide">Match introuvable.</p>`;
    const cv = C.convocation(id), js = C.joueurs(e.equipe);
    const dispo = C.dispos(id); // empêchements signalés par les familles (messagerie)
    const b = brouillons[id] || (brouillons[id] = cv && !brouillons[id] ? { joueurs: cv.joueurs.slice(), rdvHeure: cv.rdvHeure, rdvLieu: cv.rdvLieu, tenue: cv.tenue, mot: cv.mot, modif: false }
      : { joueurs: js.filter((p) => !(dispo[p.id] && dispo[p.id].statut === "absent") && p.certificat === "ok").slice(0, maxConv(e) || 99).map((p) => p.id), rdvHeure: minutes(e.heure, e.domicile ? -60 : -90), rdvLieu: e.domicile ? `${e.lieu.split(",")[0]} (vestiaires)` : "Parking du stade Edmond Pouzet", tenue: "Tenue du club, protège-tibias, gourde", mot: "", modif: true });
    const edition = !cv || b.modif;
    const texte = texteConvoc(e, b);
    return `<div class="entete"><div><p class="fil-ariane"><a href="#convocations">Matchs</a> ›</p><h1>${esc(e.titre)}</h1><p class="sous">${esc(C.nomEquipe(e.equipe))} · ${fJL(e.date)} · ${hh(e.heure)} · ${esc(e.lieu)}</p></div>
      <div class="actions"><button class="btn" data-a="copier-convoc" data-id="${esc(id)}">Copier le texte</button><button class="btn" data-a="imprimer">Imprimer</button></div></div>
      ${cv ? `<div class="statut-convoc no-print">✅ <span><b>Publiée le ${new Date(cv.publiee).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${new Date(cv.publiee).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b>${cv.source === "messagerie" ? " depuis la messagerie" : ""} · dans les Annonces de l'équipe (messagerie).</span>${edition ? "" : `<button class="btn mini" style="margin-left:auto" data-a="convoc-modifier" data-id="${esc(id)}">Modifier</button>`}</div>` : ""}
      <form class="convoc" id="fConvoc" data-id="${esc(id)}">
        <section class="carte"><h2>Joueurs convoqués <span class="etiq bleu" id="nbConv">${b.joueurs.length} / ${js.length}</span>${maxConv(e) ? `<span class="discret petit"> · ${maxConv(e)} maximum</span>` : ""}${edition ? `<span class="plus"><button type="button" class="btn lien" data-a="conv-tous">Tous</button> · <button type="button" class="btn lien" data-a="conv-aucun">Aucun</button></span>` : ""}</h2>
          ${edition && maxConv(e) ? `<label class="exception"><input type="checkbox" name="plus"${b.plus || b.joueurs.length > maxConv(e) ? " checked" : ""}> Exceptionnellement, convoquer plus de ${maxConv(e)} joueur${C.equipe(e.equipe).genre === "F" ? "ses" : "s"}</label>` : ""}
          <ul class="sel-joueurs">${js.map((p) => { const d = dispo[p.id], t = C.tauxPresence(p.id), notes = [p.poste, t != null ? `présence ${t} %` : ""].filter(Boolean).join(" · ");
            const ok = d && d.statut === "present";
            const al = [d && !ok ? (d.statut === "incertain" ? "❔ peut-être" : `⚠️ absent${p.genre === "F" ? "e" : ""}${d.motif && !/sondage/i.test(d.motif) ? " : " + d.motif : ""}${d.precision ? " (" + d.precision + ")" : ""}`) : "", p.certificat !== "ok" ? "⛔ certificat médical manquant" : "", p.licence.statut === "en_attente" ? "⛔ licence en attente" : ""].filter(Boolean).join(" · ");
            return `<li><label><input type="checkbox" name="j" value="${esc(p.id)}"${b.joueurs.includes(p.id) ? " checked" : ""}${edition ? "" : " disabled"}><span class="num">${p.numero || "–"}</span><span class="n"><b>${esc(p.prenom)} ${esc(p.nom)}</b><small>${ok ? `<span style="color:var(--ok);font-weight:700">✓ présent${p.genre === "F" ? "e" : ""}</span> · ` : ""}${esc(notes)}${al ? `<br><span style="color:var(--att);font-weight:600">${esc(al)}</span>` : ""}</small></span></label></li>`; }).join("")}</ul>
        </section>
        <section class="carte"><h2>Rendez-vous</h2><div class="form">
          <div class="ligne"><label>Heure du RDV<input type="time" name="rdvHeure" value="${esc(b.rdvHeure)}"${edition ? "" : " disabled"}></label><label>${estMatch(e) ? "Coup d'envoi" : "Début"}<input value="${hh(e.heure)}" disabled></label></div>
          <label>Lieu du RDV<input name="rdvLieu" value="${esc(b.rdvLieu)}"${edition ? "" : " disabled"}></label>
          <label>Tenue et matériel<input name="tenue" value="${esc(b.tenue)}"${edition ? "" : " disabled"}></label>
          <label>Mot du coach<textarea name="mot" placeholder="Covoiturage, goûter, consignes…"${edition ? "" : " disabled"}>${esc(b.mot)}</textarea></label>
          <label>Aperçu du message<div class="apercu" id="apercuConvoc">${esc(texte)}</div></label>
          ${edition ? `<div class="pied">${cv ? `<button type="button" class="btn" data-a="convoc-annuler-modif" data-id="${esc(id)}">Annuler</button>` : ""}<button class="btn prim">${cv ? "Republier la convocation" : "Publier la convocation"}</button></div><p class="aide">Les familles la reçoivent dans les Annonces de l'équipe (messagerie) et dans leur espace, avec un bouton « Je ne peux pas venir ».</p>` : ""}
        </div></section>
      </form>`;
  }
  function texteConvoc(e, b) {
    const js = b.joueurs.map(C.personne).filter(Boolean).sort((a, c) => (a.numero || 99) - (c.numero || 99));
    return `📋 CONVOCATION · ${C.nomEquipe(e.equipe)}\n${e.titre}\n${fJL(e.date)} · ${estMatch(e) ? "coup d'envoi" : "début"} ${hh(e.heure)}\n📍 ${e.lieu}\n\n⏰ Rendez-vous ${hh(b.rdvHeure)} · ${b.rdvLieu}\n🎒 ${b.tenue}\n\nConvoqué${js.length > 1 ? "s" : ""} (${js.length}) :\n${js.map((p) => `${p.numero ? p.numero + ". " : "• "}${p.prenom} ${p.nom}`).join("\n")}${b.mot ? `\n\n💬 ${b.mot}` : ""}\n\nEn cas d'empêchement, prévenez le coach au plus vite.`;
  }
  const maxConv = (e) => { const q = e && e.equipe && C.equipe(e.equipe); return q && q.format === 11 ? 14 : q && q.format === 8 ? 11 : null; };
  function lireConvoc(f) { const id = f.dataset.id, b = brouillons[id]; const d = new FormData(f); b.joueurs = d.getAll("j"); b.plus = d.has("plus"); ["rdvHeure", "rdvLieu", "tenue", "mot"].forEach((k) => { if (d.has(k)) b[k] = d.get(k).trim(); }); return b; }

  /* ---------- réglages ---------- */
  function pageParametres() {
    if (!estDirigeant()) return `<p class="vide">Réservé au bureau du club.</p>`;
    const c = C.club;
    return `<div class="entete"><div><h1>Réglages</h1><p class="sous">Club, terrains et données.</p></div></div>
      <div class="grille g2">
        <section class="carte"><h2>Le club</h2><form class="form" id="fClub">
          <div class="ligne"><label>Nom<input name="nom" value="${esc(c.nom)}"></label><label>N° d'affiliation<input name="numero" value="${esc(c.numero)}"></label></div>
          <div class="ligne"><label>Ville<input name="ville" value="${esc(c.ville)}"></label><label>E-mail du club<input type="email" name="email" value="${esc(c.email)}"></label></div>
          <label>Terrains et lieux (un par ligne)<textarea name="lieux">${esc(c.lieux.join("\n"))}</textarea></label>
          <div class="pied"><button class="btn prim">Enregistrer</button></div></form></section>
        <section class="carte"><h2>Données</h2>
          ${N.actif ? `<p class="alerte info" style="margin-top:0"><b>En ligne.</b> Console, messagerie, Monteur, PV et Atelier partagent les mêmes données sur tous les appareils (mise à jour toutes les 15 s). Ce navigateur en garde une copie pour fonctionner sans réseau.</p>`
            : `<p class="alerte info" style="margin-top:0"><b>Mode démo.</b> Les données sont gardées dans ce navigateur. Entrez le code du club pour les partager avec tous les appareils.</p>`}
          ${blocCode()}
          <div class="form"><div class="pied" style="justify-content:flex-start"><button class="btn" data-a="export-json">Sauvegarder (JSON)</button><button class="btn" data-a="import-json">Restaurer</button>${N.actif ? "" : '<button class="btn danger" data-a="raz">Remettre la démo à zéro</button>'}</div></div>
          <input type="file" id="fichierJSON" accept="application/json,.json" hidden>
          <p class="petit discret">Dernière modification : ${new Date(C.maj).toLocaleString("fr-FR")}</p></section>
      </div>`;
  }

  /* ---------- import / export CSV ---------- */
  function exportCSV() {
    const js = portee(), col = ["Équipe", "N°", "Prénom", "Nom", "Naissance", "Genre", "Poste", "Licence", "Statut licence", "Certificat", "Téléphone", "Responsable", "Tél. responsable", "E-mail responsable"];
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const lignes = js.map((p) => { const ct = p.contacts[0] || {}; return [C.nomEquipe(p.equipe), p.numero, p.prenom, p.nom, p.naissance, p.genre, p.poste, p.licence.numero, (LICENCE[p.licence.statut] || [""])[0], p.certificat === "ok" ? "Fourni" : "À fournir", p.tel, ct.nom, ct.tel, ct.email].map(q).join(";"); });
    const blob = new Blob(["﻿" + [col.map(q).join(";"), ...lignes].join("\r\n")], { type: "text/csv;charset=utf-8" });
    telecharger(blob, `licencies-esga-${auj()}.csv`); toast(`${pl(js.length, "licencié")} exporté${js.length > 1 ? "s" : ""}.`);
  }
  function telecharger(blob, nom) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function ouvrirImport() {
    tiroir("Importer des licenciés", `<form class="form" id="fImport"><p class="aide">Collez des lignes copiées depuis un tableur (Excel, Footclubs…), une personne par ligne, colonnes séparées par des tabulations ou des points-virgules :</p>
      <p class="alerte info" style="margin:0"><b>Prénom ; Nom ; Date de naissance ; Équipe ; N° ; Poste ; Tél. responsable</b><br><small>Date au format 2013-04-21 ou 21/04/2013. Équipe : nom tel qu'affiché (ex. U15F, Seniors 2). La 1re ligne peut être un en-tête.</small></p>
      <label>Lignes<textarea name="txt" rows="10" placeholder="Léa;Martin;21/04/2013;U15F;3;Défenseur;06 12 34 56 78"></textarea></label>
      <div class="pied"><button type="button" class="btn" data-a="fermer">Annuler</button><button class="btn prim">Importer</button></div></form>`, (f) => {
      const eqs = C.equipes(); let n = 0, ko = 0;
      new FormData(f).get("txt").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((l, i) => {
        const c = l.split(/\t|;/).map((x) => x.trim().replace(/^"|"$/g, ""));
        if (i === 0 && /pr[ée]nom/i.test(c[0])) return;
        if (!c[0] || !c[1]) { ko++; return; }
        let dn = c[2] || ""; const m = dn.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) dn = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
        const eq = eqs.find((e) => e.nom.toLowerCase() === (c[3] || "").toLowerCase() || e.id.toLowerCase() === (c[3] || "").toLowerCase());
        C.enregistrer("personnes", { prenom: c[0], nom: c[1], naissance: /^\d{4}-\d{2}-\d{2}$/.test(dn) ? dn : "", genre: eq && eq.genre === "F" ? "F" : "M", equipe: eq ? eq.id : "", numero: +c[4] || null, poste: c[5] || "", licence: { numero: "", statut: "en_attente" }, certificat: "a_fournir", tel: "", email: "", contacts: c[6] ? [{ nom: "", lien: "", tel: c[6], email: "" }] : [], notes: "" });
        n++;
      });
      fermer(); toast(`${pl(n, "licencié importé", "licenciés importés")}${ko ? `, ${ko} ligne${ko > 1 ? "s" : ""} ignorée${ko > 1 ? "s" : ""}` : ""}.`);
    });
  }

  /* ---------- profil ---------- */
  function rendreProfils() {
    const el = $("#quiSuisJe"); if (el) el.textContent = profil ? C.nomProfil(profil) : "pas encore choisi";
    const m = $("#modeClub"); if (!m) return;
    const t = { demo: ["Démo", "Les données restent dans ce navigateur. Entrez le code du club (Changer de profil) pour partager avec tout le club."], ok: ["🟢 En ligne", "Données partagées avec tout le club, mises à jour toutes les 15 secondes."], connexion: ["En ligne…", "Connexion au club…"], "hors-ligne": ["🟠 Hors ligne", "Pas de réseau : vos modifications partiront dès son retour."], erreur: ["🟠 En ligne", "Un envoi a échoué, nouvel essai bientôt."], code: ["Code à saisir", "Le code du club a changé : entrez le nouveau code."] }[N.etat] || ["Démo", ""];
    m.textContent = t[0]; m.parentElement.title = t[1]; document.body.classList.toggle("en-ligne", N.actif);
  }
  function blocCode() {
    if (N.actif) return `<p class="code-club ok">🟢 Connecté au club${N.role === "famille" ? " (accès familles)" : ""}. <button class="btn lien" data-a="deconnexion">Se déconnecter</button></p>`;
    return `<form class="code-club" id="fCode"><label>Code du club<input name="code" type="password" autocomplete="current-password" placeholder="Donné par votre éducateur" required></label><button class="btn prim">Entrer</button>
      <small>${N.etat === "code" ? "Le code a changé : demandez le nouveau à votre éducateur." : "Avec le code, tout le club partage les mêmes informations. Sans code, c'est une démo dans ce navigateur."}</small></form>`;
  }

  /* ---------- bienvenue : qui êtes-vous ? ---------- */
  let choix = { role: null, equipe: null, q: "" };
  const ROLES_ACCUEIL = [
    ["parent", "👨‍👩‍👧", "Parent", "Le planning de mon enfant, ses convocations, prévenir d'une absence."],
    ["joueur", "⚽", "Joueur ou joueuse", "Mon planning, mes convocations, prévenir si je ne peux pas venir."],
    ["coach", "📋", "Éducateur", "Mon équipe : l'appel, les convocations, les messages aux familles."],
    ["dirigeant", "🏛️", "Dirigeant", "Tout le club : licences, équipes, éducateurs, calendrier."],
  ];
  function pageBienvenue() {
    const tete = `<div class="bv-tete"><span class="crest" aria-hidden="true">ES<small>GA</small></span><div><p class="discret petit" style="margin:0">${esc(C.club.nom)}</p><h1>${choix.role ? "Qui êtes-vous ?" : "Bienvenue au club 👋"}</h1></div></div>`;
    if (!choix.role) return `<div class="bienvenue">${tete}<p class="bv-intro">Dites-nous qui vous êtes : l'application ne montre que ce qui vous concerne.</p>
      ${blocCode()}
      <div class="roles">${ROLES_ACCUEIL.filter(([k]) => !famillesSeules() || ["parent", "joueur"].includes(k)).map(([k, e, t, d]) => `<button class="role" data-a="role" data-v="${k}"><span class="emoji">${e}</span><b>${t}</b><span>${d}</span></button>`).join("")}</div>
      <p class="discret petit">${N.actif ? "Vous pourrez changer de profil à tout moment." : "Démo : choisissez librement, vous pourrez changer à tout moment."}</p></div>`;
    const retour = `<button class="btn lien" data-a="role" data-v="">‹ Retour</button>`;
    if (choix.role === "coach") {
      const cs = C.staff().filter((x) => ["coach", "adjoint"].includes(x.role) && x.equipes.length);
      return `<div class="bienvenue">${tete}${retour}<p class="bv-intro">Choisissez votre nom.</p><div class="choix-liste">${cs.map((x) => `<button class="pers" data-a="choisir-coach" data-id="${esc(x.id)}">${avatarP(x)}<span><b>${esc(C.nomComplet(x))}</b><small>${esc(x.equipes.map(C.nomEquipe).join(", "))}</small></span></button>`).join("")}</div></div>`;
    }
    const eq = choix.equipe, q = choix.q.trim().toLowerCase();
    const parent = choix.role === "parent";
    const js = q ? C.joueurs().filter((p) => `${p.prenom} ${p.nom}`.toLowerCase().includes(q)).slice(0, 30) : eq ? C.joueurs(eq) : [];
    return `<div class="bienvenue">${tete}${retour}
      <p class="bv-intro">${parent ? "Trouvez votre enfant" : "Trouvez votre nom"} : tapez son prénom, ou choisissez l'équipe.</p>
      <input type="search" class="champ grand" id="bvQ" placeholder="Prénom ou nom" value="${esc(choix.q)}" aria-label="Rechercher" autocomplete="off">
      <div class="puces-equipes">${C.equipes().map((e) => `<button class="puce-eq" data-a="choix-equipe" data-v="${esc(e.id)}" aria-pressed="${eq === e.id && !q}">${esc(e.nom)}</button>`).join("")}</div>
      ${js.length ? `<div class="choix-liste">${js.map((p) => `<button class="pers" data-a="choisir-joueur" data-id="${esc(p.id)}">${avatarP(p)}<span><b>${esc(C.nomComplet(p))}</b><small>${esc(C.nomEquipe(p.equipe))}${p.numero ? " · n°" + p.numero : ""}</small></span></button>`).join("")}</div>` : q ? '<p class="vide">Aucun nom ne correspond.</p>' : ""}</div>`;
  }

  /* ---------- espace parent / joueur ---------- */
  const MOTIFS = ["Malade", "Blessure", "École / devoirs", "Raison familiale", "Transport", "Autre"];
  // Une rencontre vue par la famille : convocation, sinon sondage (ouvert par le coach), sinon « prévenir d'une absence »
  function carteMatchFamille(m, j, parent) {
    const f = j.genre === "F", e_ = f ? "e" : "", cv = C.convocation(m.id), dm = C.dispos(m.id)[j.id], conv = cv && cv.joueurs.includes(j.id);
    const tete = `<p class="gros">${esc(m.titre)}</p><p class="discret" style="margin:0 0 12px">${fJL(m.date)} · ${hh(m.heure)}<br>${esc(m.lieu)}${m.type !== "match" ? ` · ${esc(TYPES[m.type])}` : ""}</p>`;
    const absent = dm && dm.statut === "absent";
    if (cv && conv && !absent) return tete + `<div class="statut-convoc">✅ <span><b>${parent ? `${esc(j.prenom)} est convoqué${e_}` : "Vous êtes convoqué" + e_}</b><br>Rendez-vous <b>${hh(cv.rdvHeure)}</b> · ${esc(cv.rdvLieu)}<br><small>${esc(cv.tenue)}</small>${cv.mot ? `<br><small>💬 ${esc(cv.mot)}</small>` : ""}</span></div>
          <button class="btn" data-a="dispo-match" data-id="${esc(m.id)}" data-v="absent">${parent ? `${esc(j.prenom)} ne peut pas venir` : "Je ne peux pas venir"}</button>`;
    if (cv && conv) return tete + `<div class="statut-convoc att">⚠️ <span>Vous avez prévenu le coach : <b>${esc(dm.motif || "absent" + e_)}</b>.</span></div><button class="btn" data-a="dispo-annuler" data-id="${esc(m.id)}">${parent ? `Finalement ${esc(j.prenom)} peut venir` : "Finalement je peux venir"}</button>`;
    if (cv) return tete + `<div class="statut-convoc att">ℹ️ <span>${parent ? `${esc(j.prenom)} n'est pas convoqué${e_}` : "Vous n'êtes pas convoqué" + e_} pour ce match.</span></div>`;
    const so = C.sondage(m.id);
    if (!so) {
      const quand = C.sondagePossible(m) ? "bientôt" : `vers le ${fJ(C.ouvertureSondage(m))}`;
      return tete + (absent ? `<div class="statut-convoc att">⚠️ <span>Vous avez prévenu le coach : <b>${esc(dm.motif || "absent" + e_)}</b>.</span></div><button class="btn" data-a="dispo-annuler" data-id="${esc(m.id)}">${parent ? `Finalement ${esc(j.prenom)} peut venir` : "Finalement je peux venir"}</button>`
        : `<p class="aide" style="margin:0 0 10px">📅 Le coach ouvrira le sondage de disponibilité ${quand}. Vous le recevrez ici et dans les Annonces de l'équipe.</p><button class="btn" data-a="dispo-match" data-id="${esc(m.id)}" data-v="absent">${parent ? `${esc(j.prenom)} ne pourra pas venir` : "Je ne pourrai pas venir"}</button>`);
    }
    return tete + `<p style="margin:0 0 8px"><b>${parent ? `${esc(j.prenom)} sera-t-${f ? "elle" : "il"} disponible ?` : "Serez-vous disponible ?"}</b></p>
          <div class="reponse-match">${[["present", "✓ Présent" + e_, "ok"], ["incertain", "? Peut-être", "att"], ["absent", "✕ Absent" + e_, "ko"]].map(([k, l, c]) => `<button class="rep ${c}" data-a="dispo-match" data-id="${esc(m.id)}" data-v="${k}" aria-pressed="${dm ? dm.statut === k : false}">${l}</button>`).join("")}</div>
          <p class="aide" style="margin-top:8px">${so.lies ? `🔗 Une seule réponse pour les 2 matchs du week-end (${so.lies.map((x) => C.evenement(x)).filter(Boolean).map((x) => esc(x.adversaire || x.titre) + " " + fJ(x.date)).join(" et ")}). ` : ""}${dm ? "Réponse envoyée au coach. Vous pouvez la changer." : "Le coach fera la convocation avec ces réponses."}</p>`;
  }
  function pageMoi() {
    const j = moiJoueur(); if (!j) return pageBienvenue();
    const parent = profil.role === "parent", f = j.genre === "F";
    // Tous les matchs et plateaux des 10 prochains jours (deux le même week-end compris), sinon le prochain
    const proches = C.rencontres(j.equipe, auj(), ajout(auj(), C.JOURS_SONDAGE)), ms = proches.length ? proches : [C.prochainMatch(j.equipe)].filter(Boolean);
    const coachs = C.staffDe(j.equipe);
    const carteMatch = ms.length ? ms.map((m) => carteMatchFamille(m, j, parent)).join('<hr class="sep-match">') : '<p class="vide">Pas de match prévu pour l\'instant.</p>';
    const ents = C.evenements({ equipe: j.equipe, du: auj(), au: ajout(auj(), 21), types: ["entrainement"] }).slice(0, 4);
    const autres = C.evenements({ equipe: j.equipe, du: auj(), au: ajout(auj(), 21) }).filter((x) => x.type !== "entrainement" && !ms.some((m) => m.id === x.id) && x.equipe === j.equipe);
    const ligneEnt = (x) => { const d = C.dispos(x.id)[j.id];
      return `<li class="ent${x.statut === "annule" ? " annule" : ""}"><span class="q"><b>${maj1(fmt(x.date, { weekday: "long", day: "numeric", month: "short" }))}</b> · ${hh(x.heure)}<small>${esc(x.lieu)}</small></span>
        ${x.statut === "annule" ? '<span class="etiq ko">Annulé</span>' : d ? `<span class="etat-abs">Absent${f ? "e" : ""} · ${esc(d.motif || "")}</span><button class="btn mini" data-a="dispo-annuler" data-id="${esc(x.id)}">Annuler</button>` : `<button class="btn mini" data-a="absence" data-id="${esc(x.id)}">${parent ? "Prévenir d'une absence" : "Je serai absent" + (f ? "e" : "")}</button>`}</li>`; };
    const dossier = [j.certificat !== "ok" ? "Le certificat médical (ou le questionnaire de santé) est à donner au club." : "", j.licence.statut === "en_attente" ? "La licence est en cours de validation." : j.licence.statut === "a_renouveler" ? "La licence est à renouveler sur le lien envoyé par le club." : ""].filter(Boolean);
    return `<div class="entete"><div><p class="fil-ariane discret">${fJL(auj())}</p><h1>${parent ? `Bonjour 👋` : `Salut ${esc(j.prenom)} 👋`}</h1><p class="sous">${parent ? `Parent de <b>${esc(C.nomComplet(j))}</b> · ` : ""}${esc(C.nomEquipe(j.equipe))}</p></div></div>
      ${dossier.length ? `<p class="alerte ko" style="margin-bottom:14px"><b>À faire :</b> ${dossier.map(esc).join(" ")}</p>` : ""}
      <div class="grille g2 moi">
        <section class="carte"><h2>⚽ ${ms.length > 1 ? "Prochains matchs" : "Prochain match"}</h2>${carteMatch}</section>
        <section class="carte"><h2>🏃 Entraînements</h2>${ents.length ? `<ul class="ents">${ents.map(ligneEnt).join("")}</ul>` : '<p class="vide">Pas d\'entraînement ces 3 prochaines semaines (vacances ?).</p>'}
          ${autres.length ? `<h3>Aussi au programme</h3><ul class="ents">${autres.map((x) => `<li class="ent"><span class="q"><b>${esc(x.titre)}</b> · ${fJ(x.date)} ${hh(x.heure)}<small>${esc(x.lieu)}${x.notes ? " · " + esc(x.notes) : ""}</small></span></li>`).join("")}</ul>` : ""}</section>
        <section class="carte"><h2>📞 ${coachs.length > 1 ? "Les éducateurs" : "L'éducateur"}</h2>${coachs.length ? coachs.map((x) => `<div class="contact">${avatarP(x)}<span><b>${esc(C.nomComplet(x))}</b><small>${esc(ROLES[x.role] || "")}</small></span><a class="btn mini" href="tel:${esc(x.tel.replace(/\s/g, ""))}">Appeler</a></div>`).join("") : '<p class="discret">Éducateur pas encore désigné.</p>'}
          <a class="btn prim" style="margin-top:10px" href="${URL_MOD.messagerie(j.equipe)}">💬 Messagerie de l'équipe</a></section>
        ${(() => { const l = C.envois({ joueur: j.id }).slice(0, 6); return l.length ? `<section class="carte"><h2>🎬 ${parent ? "Les vidéos de " + esc(j.prenom) : "Mes vidéos"}</h2><ul class="envois">${l.map((x) => ligneEnvoi(x, j.id)).join("")}</ul></section>` : ""; })()}
        <section class="carte"><h2>🪪 ${parent ? "Le dossier de " + esc(j.prenom) : "Mon dossier"}</h2><dl class="detail"><dt>Licence</dt><dd>${etiqLicence(j)}</dd><dt>Certificat</dt><dd>${etiqCertif(j)}</dd><dt>Maillot</dt><dd>${j.numero ? "n°" + j.numero : "–"}${j.poste ? " · " + esc(j.poste) : ""}</dd>${(() => { const st = C.statsJoueur(j.id); return st ? `<dt>Saison</dt><dd>${pl(st.joues, "match", "matchs")} · ${pl(st.buts, "but")} · ${pl(st.passes, "passe déc.", "passes déc.")}</dd>` : ""; })()}</dl><p class="aide">Une info à corriger (téléphone, allergie…) ? Écrivez-le au coach dans la messagerie.</p></section>
      </div>`;
  }
  function ouvrirMotif(evt) {
    const j = moiJoueur(), e = C.evenement(evt), parent = profil.role === "parent";
    tiroir(parent ? `${j.prenom} sera absent${j.genre === "F" ? "e" : ""}` : "Je serai absent" + (j.genre === "F" ? "e" : ""), `<form class="form" id="fMotif" data-evt="${esc(evt)}">
      <p class="discret" style="margin:0">${esc(e.type === "entrainement" ? "Entraînement" : e.titre)} · ${fJL(e.date)} · ${hh(e.heure)}</p>
      <fieldset><legend>Pourquoi ?</legend><div class="cases motifs">${MOTIFS.map((x, i) => `<label><input type="radio" name="motif" value="${esc(x)}"${i === 0 ? " checked" : ""}> ${esc(x)}</label>`).join("")}</div></fieldset>
      <label>Un mot pour le coach (facultatif)<input name="precision" placeholder="ex. retour prévu jeudi"></label>
      <div class="pied"><button type="button" class="btn" data-a="fermer">Annuler</button><button class="btn prim">Prévenir le coach</button></div></form>`, (f) => {
      const d = new FormData(f);
      C.setDispo(evt, j.id, { statut: "absent", motif: d.get("motif"), precision: (d.get("precision") || "").trim(), par: "famille" });
      fermer(); toast("C'est noté, le coach est prévenu. 👍");
    });
  }

  /* ---------- routeur ---------- */
  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || "accueil";
    const [chemin, params] = h.split("?"), [page, a, b] = chemin.split("/");
    return { page, a, b, params };
  }
  let derniere = "";
  function rendre(garderDefil) {
    const r = route(), y = window.scrollY;
    if (!profil || r.page === "bienvenue") {
      document.body.classList.add("choix"); $("#menu").innerHTML = ""; $("#contenu").innerHTML = pageBienvenue();
      document.title = "Bienvenue · ES Genas Azieu"; derniere = location.hash; return;
    }
    document.body.classList.remove("choix");
    if (estFamille() && r.page !== "moi") { history.replaceState(null, "", "#moi"); r.page = "moi"; }
    if (!estFamille() && r.page === "moi") r.page = "accueil";
    if (estCoach() && ["licencies", "parametres"].includes(r.page) && !r.params) r.page = r.page === "licencies" ? "equipes" : "accueil";
    const menuPage = { equipe: "equipes", convoc: "convocations", feuille: "convocations" }[r.page] || r.page;
    rendreMenu(menuPage);
    let html = "";
    if (r.page === "moi") html = pageMoi();
    else if (r.page === "accueil") html = pageAccueil();
    else if (r.page === "equipes") html = pageEquipes();
    else if (r.page === "equipe") html = pageEquipe(r.a, r.b);
    else if (r.page === "licencies") html = pageLicencies(r.params);
    else if (r.page === "staff") html = pageStaff();
    else if (r.page === "calendrier") html = pageCalendrier();
    else if (r.page === "convocations") html = pageConvocations(r.a);
    else if (r.page === "feuille") html = pageFeuille(r.a);
    else if (r.page === "convoc") html = pageConvoc(r.a);
    else if (r.page === "parametres") html = pageParametres();
    else html = pageAccueil();
    $("#contenu").innerHTML = html;
    document.title = `${($("#contenu h1") || {}).textContent || "Console"} · Console ESGA`;
    if (r.page === "accueil") { chargerPV(); if (estCoach() && !PVS) chargerPVs().then(() => { if (route().page === "accueil") rendre(true); }); }
    const cle = location.hash;
    if (garderDefil && cle === derniere) window.scrollTo(0, y); else if (cle !== derniere) window.scrollTo(0, 0);
    // Lien d'un autre module (retour de l'Atelier…) : #calendrier?evt=<id> ouvre la fiche de l'événement, une fois
    const pe = new URLSearchParams(r.params || "").get("evt");
    if (pe && cle !== derniere && C.evenement(pe) && peutVoir(C.evenement(pe).equipe)) setTimeout(() => ouvrirEvt(pe), 0);
    derniere = cle;
  }

  /* ---------- événements ---------- */
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-a]"); if (!t) return;
    if (ev.target.closest("[data-stop]")) return;
    const a = t.dataset.a, id = t.dataset.id;
    if (t.tagName === "A") return; // liens normaux
    if (a === "f-joue") return; // case à cocher : gérée à l'événement « change »
    ev.preventDefault();
    if (a === "fermer") return fermer();
    if (a === "role") {
      if (t.dataset.v === "dirigeant") { profil = { role: "dirigeant" }; sauverProfil(); choix = { role: null, equipe: null, q: "" }; return allerA("#accueil", "Bienvenue ! Vous voyez tout le club."); }
      choix = { role: t.dataset.v || null, equipe: t.dataset.v === "joueur" ? "Seniors F-1" : "U15F-2", q: "" }; return rendre();
    }
    if (a === "choix-equipe") { choix.equipe = t.dataset.v; choix.q = ""; return rendre(true); }
    if (a === "choisir-coach") { profil = { role: "coach", staff: id }; sauverProfil(); choix = { role: null, equipe: null, q: "" }; return allerA("#accueil", `Bonjour ${moiStaff().prenom} ! Voici votre équipe.`); }
    if (a === "choisir-joueur") { profil = { role: choix.role, joueur: id }; sauverProfil(); choix = { role: null, equipe: null, q: "" }; return allerA("#moi", "C'est parti !"); }
    if (a === "dispo-match") { if (t.dataset.v === "absent") { if (!(C.dispos(id)[moiJoueur().id] || {}).motif || C.dispos(id)[moiJoueur().id].statut !== "absent") C.setDispo(id, moiJoueur().id, { statut: "absent", motif: "Absent", par: "famille" }); return ouvrirMotif(id); } C.setDispo(id, moiJoueur().id, { statut: t.dataset.v, motif: DISPO[t.dataset.v], par: "famille" }); return toast("Réponse envoyée au coach. 👍"); }
    if (a === "absence") return ouvrirMotif(id);
    if (a === "lancer-sondage-we" || a === "lancer-sondage") {
      const e = C.evenement(id); if (!C.sondagePossible(e)) return toast(`Le sondage s'ouvre le ${fJ(C.ouvertureSondage(e))}, ${C.JOURS_SONDAGE} jours avant le match.`);
      C.lancerSondage(id, false, a === "lancer-sondage-we" ? [t.dataset.avec] : null);
      return toast(a === "lancer-sondage-we" ? "Un seul sondage pour les deux matchs du week-end, publié dans les Annonces : chaque réponse compte pour les deux." : "Sondage publié dans les Annonces de l'équipe (messagerie). Les réponses arrivent ici.");
    }
    if (a === "relancer-sondage") { C.lancerSondage(id, true); return toast("Rappel publié dans les Annonces pour les familles qui n'ont pas répondu."); }
    if (a === "f-plus" || a === "f-moins") {
      const fid = route().a, f = feuilles[fid], k = t.dataset.k, d = a === "f-plus" ? 1 : -1;
      if (id) { const st = (f.stats[id] = f.stats[id] || { buts: 0, passes: 0 }); st[k] = Math.max(0, (st[k] || 0) + d); if (d > 0 && !f.joueurs.includes(id)) f.joueurs.push(id); if (k === "buts" && d > 0 && f.nous < Object.values(f.stats).reduce((x, y) => x + (y.buts || 0), 0)) f.nous++; }
      else f[k] = Math.max(0, f[k] + d);
      return rendre(true);
    }
    if (a === "f-joue") { const f = feuilles[route().a]; f.joueurs = t.checked ? [...new Set([...f.joueurs, id])] : f.joueurs.filter((x) => x !== id); return rendre(true); }
    if (a === "f-score-auto") { const f = feuilles[route().a]; f.nous = Object.values(f.stats).reduce((x, y) => x + (y.buts || 0), 0); return rendre(true); }
    if (a === "f-enregistrer") { const f = feuilles[id]; f.notes = ($("#fNotes") || {}).value || ""; Object.keys(f.stats).forEach((k) => { if (!f.stats[k].buts && !f.stats[k].passes) delete f.stats[k]; }); C.setFeuille(id, f); delete feuilles[id]; location.hash = "#convocations/joues"; return toast("Match enregistré : les fiches des joueurs sont à jour."); }
    if (a === "dispo-annuler") { C.setDispo(id, moiJoueur().id, null); return toast("C'est noté, le coach est prévenu."); }
    if (a === "lien") { location.hash = t.dataset.href; return; }
    if (a === "evt") { ev.stopPropagation(); return ouvrirEvt(id); }
    if (a === "jour") { cal.ref = t.dataset.date; cal.vue = "semaine"; return rendre(); }
    if (a === "fiche") return ouvrirJoueur(id);
    if (a === "nouveau-joueur") return ouvrirJoueur(null, t.dataset.equipe);
    if (a === "suppr-joueur") { const jid = $("#tiroirCorps").dataset.joueur, p = C.personne(jid); if (confirmer(`Supprimer ${C.nomComplet(p)} des licenciés ?`)) { C.supprimer("personnes", jid); fermer(); toast("Licencié supprimé."); } return; }
    if (a === "staff") return ouvrirStaff(id);
    if (a === "staff-voir") return ouvrirStaff(id, true);
    if (a === "suppr-staff") { const sid = $("#tiroirCorps").dataset.staff; if (confirmer("Retirer cette personne du club ?")) { C.supprimer("staff", sid); fermer(); toast("Personne retirée."); } return; }
    if (a === "nouvel-evt") return ouvrirFormEvt(null, t.dataset.equipe, null, t.dataset.type);
    if (a === "modifier-evt") return ouvrirFormEvt(id);
    if (a === "annuler-evt") { const e = C.evenement(id); C.modifierEvenement(id, { statut: "annule" }); toast(`${TYPES[e.type]} annulé. Pensez à prévenir les familles dans la messagerie.`); return ouvrirEvt(id); }
    if (a === "retablir") { C.modifierEvenement(id, { statut: "prevu" }); toast("Rétabli."); return ouvrirEvt(id); }
    if (a === "suppr-evt") { if (confirmer("Supprimer cet événement du calendrier ?")) { C.supprimer("evenements", id); fermer(); toast("Événement supprimé."); } return; }
    if (a === "appel") return ouvrirAppel(id);
    if (a === "envoi-retirer") { if (!confirm("Retirer cette séquence ? Les joueurs ne la verront plus.")) return; C.retirerEnvoi(id); toast("Séquence retirée."); return; }
    if (a === "seance-retirer") { if (!confirm("Retirer la séance prévue pour cet entraînement ?")) return; C.setSeance(id, null); toast("Séance retirée de cet entraînement."); return ouvrirEvt(id); }
    if (a === "pres") { const cur = C.presences(t.dataset.evt)[t.dataset.j]; C.setPresence(t.dataset.evt, t.dataset.j, cur === t.dataset.v ? null : t.dataset.v); return ouvrirAppel.rendre && ouvrirAppel.rendre(); }
    if (a === "tous-presents") { const e = C.evenement(id), d = C.dispos(id), p = C.presences(id); C.joueurs(e.equipe).forEach((j) => { if (!p[j.id]) C.setPresence(id, j.id, d[j.id] ? "excuse" : "present"); }); return ouvrirAppel.rendre(); }
    if (a === "creneau") return ouvrirCreneau(id, t.dataset.equipe);
    if (a === "suppr-creneau") { C.supprimer("creneaux", $("#tiroirCorps").dataset.creneau); fermer(); toast("Créneau supprimé."); return; }
    if (a === "nouvelle-equipe" || a === "modifier-equipe") return ouvrirEquipe(id);
    if (a === "cal-vue") { cal.vue = t.dataset.v; return rendre(); }
    if (a === "cal-type") { cal.types[t.dataset.v] = !cal.types[t.dataset.v]; return rendre(true); }
    if (a === "cal-auj") { cal.ref = auj(); return rendre(); }
    if (a === "cal-prec" || a === "cal-suiv") { const s = a === "cal-prec" ? -1 : 1; if (cal.vue === "mois") { const r = jour(cal.ref); cal.ref = iso(new Date(r.getFullYear(), r.getMonth() + s, 1)); } else cal.ref = ajout(cal.ref, s * (cal.vue === "semaine" ? 7 : 21)); return rendre(); }
    if (a === "raz-filtres") { filtres = { q: "", equipe: "", licence: "", certif: "" }; history.replaceState(null, "", "#licencies"); return rendre(); }
    if (a === "export-csv") return exportCSV();
    if (a === "import-csv") return ouvrirImport();
    if (a === "conv-tous" || a === "conv-aucun") { document.querySelectorAll('#fConvoc input[name="j"]').forEach((c) => (c.checked = a === "conv-tous")); return majConvoc(); }
    if (a === "convoc-modifier") { const cv = C.convocation(id); brouillons[id] = { joueurs: cv.joueurs.slice(), rdvHeure: cv.rdvHeure, rdvLieu: cv.rdvLieu, tenue: cv.tenue, mot: cv.mot, modif: true }; return rendre(true); }
    if (a === "convoc-annuler-modif") { delete brouillons[id]; return rendre(true); }
    if (a === "copier-convoc") { const f = $("#fConvoc"); const b = f ? lireConvoc(f) : brouillons[id]; const txt = texteConvoc(C.evenement(id), b); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast("Texte copié : collez-le dans WhatsApp ou un e-mail."), () => toast("Copie impossible sur ce navigateur.")); return; }
    if (a === "imprimer") return window.print();
    if (a === "export-json") { telecharger(new Blob([C.exporter()], { type: "application/json" }), `club-esga-${auj()}.json`); return toast("Sauvegarde téléchargée."); }
    if (a === "import-json") return $("#fichierJSON").click();
    if (a === "deconnexion") { if (confirmer("Se déconnecter du club ? Ce navigateur repassera en démo (les données du club restent en ligne).")) { N.deconnecter(); C.setProfil(null); location.href = location.pathname; } return; }
    if (a === "raz") { if (confirmer("Remettre toute la démo à zéro ? Les modifications faites dans la console seront perdues.")) { C.reinitialiser(); Object.keys(brouillons).forEach((k) => delete brouillons[k]); toast("Démo remise à zéro."); } return; }
  });
  function allerA(h, msg) { rendreProfils(); if (window.ESGA && ESGA.bandeau) ESGA.bandeau(); if (location.hash === h) rendre(); else location.hash = h; if (msg) toast(msg); }
  function confirmer(t) { return window.confirm(t); }
  function majConvoc() {
    const f = $("#fConvoc"); if (!f) return; const id = f.dataset.id; let b = lireConvoc(f);
    const mx = maxConv(C.evenement(id));
    if (mx && !b.plus && b.joueurs.length > mx) {
      const coches = [...f.querySelectorAll('input[name="j"]:checked')], der = majConvoc.derniere && coches.includes(majConvoc.derniere) ? majConvoc.derniere : coches[coches.length - 1];
      if (der) der.checked = false; while (f.querySelectorAll('input[name="j"]:checked').length > mx) [...f.querySelectorAll('input[name="j"]:checked')].pop().checked = false;
      b = lireConvoc(f); toast(`${mx} maximum pour ce format. Cochez « Exceptionnellement » pour en convoquer plus.`);
    }
    $("#nbConv").textContent = `${b.joueurs.length} / ${C.joueurs(C.evenement(id).equipe).length}`;
    $("#apercuConvoc").textContent = texteConvoc(C.evenement(id), b);
  }
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.closest("#fConvoc")) { if (t.name === "j" && t.checked) majConvoc.derniere = t; return majConvoc(); }
    if (t.id === "bvQ") { choix.q = t.value; clearTimeout(rendre.t); rendre.t = setTimeout(() => { rendre(true); const q = $("#bvQ"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 140); return; }
    if (t.id === "fQ") { filtres.q = t.value; clearTimeout(rendre.t); rendre.t = setTimeout(() => { rendre(true); const q = $("#fQ"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 160); }
  });
  document.addEventListener("change", (ev) => {
    if (ev.target.classList && ev.target.classList.contains("rappel-date")) { C.setRappel(ev.target.dataset.id, ev.target.value); toast(ev.target.value ? `Rappel noté pour le ${fJ(ev.target.value)}.` : "Rappel retiré."); return; }
    const t = ev.target;
    if (t.dataset && t.dataset.a === "f-joue") { const f = feuilles[route().a]; f.joueurs = t.checked ? [...new Set([...f.joueurs, t.dataset.id])] : f.joueurs.filter((x) => x !== t.dataset.id); return rendre(true); }
    if (t.name === "type" && t.closest("#fEvt")) { const z = $("#champsAmical"); if (z) z.hidden = t.value !== "amical"; return; }
    if (t.id === "fEquipe") { filtres.equipe = t.value; return rendre(true); }
    if (t.id === "fLicence") { filtres.licence = t.value; return rendre(true); }
    if (t.id === "fCertif") { filtres.certif = t.value; return rendre(true); }
    if (t.id === "calEquipe") { cal.equipe = t.value; return rendre(true); }
    if (t.id === "fichierJSON") { const f = t.files[0]; t.value = ""; if (!f) return; f.text().then((txt) => { try { C.importer(txt); toast("Données restaurées."); } catch (e) { toast("Fichier non reconnu."); } }); }
  });
  document.addEventListener("submit", (ev) => {
    const f = ev.target; ev.preventDefault();
    if (f.id === "fCode") {
      const b = f.querySelector("button"); b.disabled = true; b.textContent = "Connexion…";
      N.connecter(new FormData(f).get("code")).then((r) => { location.reload(); toast(r === "famille" ? "Bienvenue ! Accès familles." : "Connecté au club."); })
        .catch((e) => { b.disabled = false; b.textContent = "Entrer"; toast(e.message); });
      return;
    }
    if (f.id === "fConvoc") {
      const id = f.dataset.id, b = lireConvoc(f), mx = maxConv(C.evenement(id));
      if (!b.joueurs.length) return toast("Cochez au moins un joueur.");
      if (mx && !b.plus && b.joueurs.length > mx) return toast(`${mx} joueurs maximum : décochez-en ou cochez « Exceptionnellement ».`);
      const ancienne = C.convocation(id);
      C.publierConvocation({ evenement: id, joueurs: b.joueurs.slice(), rdvHeure: b.rdvHeure, rdvLieu: b.rdvLieu, tenue: b.tenue, mot: b.mot, source: "console" });
      delete brouillons[id]; toast(ancienne ? "Convocation mise à jour et renvoyée dans la messagerie." : "Convocation publiée dans la messagerie de l'équipe.");
      return;
    }
    if (f.id === "fVideo") { const u = new FormData(f).get("url").trim(); C.setVideo(f.dataset.id, u ? { url: u, titre: "Vidéo du match", source: /analyse-video\//.test(u) ? "monteur" : "lien" } : null); toast(u ? "Vidéo reliée au match." : "Vidéo retirée."); return; }
    if (f.id === "fEnvoi") {
      const d = new FormData(f), debut = secondes(d.get("debut")), fin = secondes(d.get("fin")), e = C.evenement(f.dataset.id);
      if (!(debut >= 0) || !(fin > debut)) return toast("Indiquez un début et une fin (ex. 12:30 et 12:50).");
      const choix = d.getAll("j"), a = d.get("pour") === "choix" ? choix : "equipe";
      if (a !== "equipe" && !a.length) return toast("Cochez au moins un joueur.");
      const s = moiStaff();
      C.envoyerSequence({ evt: e.id, equipe: e.equipe, a, debut, fin, nom: d.get("nom").trim(), note: d.get("note").trim(), genre: d.get("genre") || null, de: s ? C.nomComplet(s) : "Le coach" });
      toast(a === "equipe" ? "Séquence envoyée à toute l'équipe." : `Séquence envoyée à ${a.length > 1 ? a.length + " joueurs" : (C.personne(a[0]) || {}).prenom}.`); return;
    }
    if (f.id === "fClub") { const d = new FormData(f); C.majClub({ nom: d.get("nom").trim(), numero: d.get("numero").trim(), ville: d.get("ville").trim(), email: d.get("email").trim(), lieux: d.get("lieux").split("\n").map((x) => x.trim()).filter(Boolean) }); return toast("Réglages enregistrés."); }
    if (surSoumission && f.closest("#tiroir")) surSoumission(f);
  });
  $("#tiroirFond").addEventListener("click", fermer);
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !$("#tiroir").hidden) fermer(); });
  window.addEventListener("hashchange", () => { fermer(); rendre(); });

  function ouvrirCreneau(id, equipe) {
    const c = id ? C.creneaux().find((x) => x.id === id) : { equipe, jour: 3, heure: "18:00", duree: 90, lieu: C.club.lieux[0] };
    tiroir(id ? "Modifier le créneau" : "Nouveau créneau", `<form class="form"><p class="discret" style="margin:0">${esc(C.nomEquipe(c.equipe))}</p>
      <div class="ligne3"><label>Jour<select name="jour">${[1, 2, 3, 4, 5, 6, 0].map((j) => opt(j, maj1(JOURS[j]), c.jour)).join("")}</select></label><label>Heure<input type="time" name="heure" value="${esc(c.heure)}"></label><label>Durée (min)<input type="number" name="duree" step="15" min="30" value="${esc(c.duree)}"></label></div>
      <label>Lieu<select name="lieu">${C.club.lieux.map((l) => opt(l, l, c.lieu)).join("")}</select></label>
      <div class="pied">${id ? '<button type="button" class="btn danger gauche" data-a="suppr-creneau">Supprimer</button>' : ""}<button type="button" class="btn" data-a="fermer">Annuler</button><button class="btn prim">Enregistrer</button></div></form>`, (f) => {
      const d = new FormData(f); C.enregistrer("creneaux", { id: c.id, equipe: c.equipe, jour: +d.get("jour"), heure: d.get("heure"), duree: +d.get("duree") || 90, lieu: d.get("lieu") }); fermer(); toast("Créneau enregistré : le calendrier est à jour.");
    });
    $("#tiroirCorps").dataset.creneau = id || "";
  }
  function ouvrirEquipe(id) {
    const e = id ? C.equipe(id) : { categorie: "U13", numero: 3, genre: "X", format: 8, nom: "" };
    const cats = [...new Set([...C.equipes().map((x) => x.categorie), "U7", "U9", "U11", "U13", "U13F", "U11F"])];
    tiroir(id ? "Modifier l'équipe" : "Nouvelle équipe", `<form class="form">
      <div class="ligne"><label>Catégorie<select name="categorie">${cats.map((c) => opt(c, c, e.categorie)).join("")}</select></label><label>N° d'équipe<input type="number" min="1" name="numero" value="${esc(e.numero)}"></label></div>
      <div class="ligne"><label>Nom affiché<input name="nom" value="${esc(e.nom)}" placeholder="ex. U13 3"></label><label>Foot à<select name="format">${[4, 5, 8, 11].map((n) => opt(n, n, e.format)).join("")}</select></label></div>
      <label>Public<select name="genre">${opt("M", "Masculin", e.genre)}${opt("F", "Féminin", e.genre)}${opt("X", "Mixte", e.genre)}</select></label>
      <div class="pied"><button type="button" class="btn" data-a="fermer">Annuler</button><button class="btn prim">Enregistrer</button></div></form>`, (f) => {
      const d = new FormData(f), cat = d.get("categorie"), num = +d.get("numero") || 1;
      const nid = id || `${cat}-${num}`; if (!id && C.equipe(nid)) return toast("Cette équipe existe déjà.");
      C.enregistrer("equipes", { id: nid, categorie: cat, numero: num, nom: d.get("nom").trim() || `${cat} ${num}`, format: +d.get("format"), genre: d.get("genre") });
      fermer(); if (!id) location.hash = "#equipe/" + nid; toast("Équipe enregistrée.");
    });
  }

  /* ---------- démarrage ---------- */
  C.surChangement(() => { rendreProfils(); rendre(true); if (!$("#tiroir").hidden && ouvrirAppel.rendre && $("#tiroirTitre").textContent === "Appel") ouvrirAppel.rendre(); });
  C.pret.then(() => {
    if (profil && ((profil.role === "coach" && !moiStaff()) || (["parent", "joueur"].includes(profil.role) && !moiJoueur()))) profil = null;
    rendreProfils(); rendre(); document.body.classList.remove("chargement");
  });
})();
