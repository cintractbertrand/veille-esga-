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
        <a href="guide.html#${profil.role}">${svg("accueil")}<span class="long">Guide de l'appli</span><span class="court">Guide</span></a>
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
      ${recapHTML()}
      <div class="kpis">
        <a class="kpi" href="#licencies"><b>${js.length}</b><span>licenciés</span>${attente.length ? `<small class="att">${attente.length} licences à finaliser</small>` : '<small class="ok">Toutes validées</small>'}</a>
        <a class="kpi" href="#equipes"><b>${eqs.length}</b><span>équipes</span>${sansCoach.length ? `<small class="ko">${pl(sansCoach.length, "sans éducateur", "sans éducateur")}</small>` : '<small class="ok">Toutes encadrées</small>'}</a>
        <a class="kpi" href="#staff"><b>${st.filter((s) => ["coach", "adjoint"].includes(s.role)).length}</b><span>éducateurs</span><small class="discret">${st.filter((s) => !["coach", "adjoint"].includes(s.role)).length} au bureau</small></a>
        <a class="kpi" href="#calendrier"><b>${nbM}</b><span>${nbM > 1 ? "matchs" : "match"} d'ici dimanche</span><small class="discret">${pl(nbE, "entraînement")}</small></a>
      </div>
      ${tuilesConvoques(null, 7, { replier: true })}
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

  /* ---------- récapitulatif : tout ce qui s'est passé depuis la dernière connexion (coach et dirigeant) ----------
     Messages des équipes, PV du District, réponses aux sondages, convocations, absences, scores,
     vidéos et séquences, séances de l'Atelier, annulations. La date de la connexion est gardée par CLUB.connexion(). */
  let periode = "connexion"; // connexion | 24h | 7j
  function cnx() { const k = profil ? profil.role + ":" + (profil.staff || "") : ""; if (cnx.k !== k) { cnx.k = k; cnx.v = profil ? C.connexion() : null; } return cnx.v || {}; }
  const ilYa = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  function depuis() { const c = cnx(); return periode === "24h" ? ilYa(24) : periode === "7j" ? ilYa(168) : c.precedente || ilYa(168); }
  const fDH = (t) => { const d = new Date(t), j = iso(d); return `${j === auj() ? "aujourd'hui" : j === ajout(auj(), -1) ? "hier" : fmt(j, { weekday: "long", day: "numeric", month: "long" })} à ${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`; };
  const fCourt = (e) => `${fJ(e.date)}${e.type === "entrainement" ? " " + hh(e.heure) : ""}`;
  const nomEvt = (e) => e.type === "entrainement" ? "Entraînement " + fCourt(e) : `${e.titre} · ${fJ(e.date)}`;
  // Messageries des équipes : copie de ce navigateur (démo) ou documents en ligne, relus au plus toutes les minutes
  let MSGS = {}, msgsT = 0, msgsP = null;
  function lireLocal(eq) { try { return JSON.parse(localStorage.getItem("esga-messagerie:" + eq)) || null; } catch (e) { return null; } }
  function chargerMessages() {
    const eqs = mesEquipes();
    if (!N.actif) { MSGS = Object.fromEntries(eqs.map((eq) => [eq, lireLocal(eq)]).filter(([, v]) => v)); return Promise.resolve(false); }
    if (msgsP || Date.now() - msgsT < 60e3) return Promise.resolve(false);
    msgsP = N.lireDocs(eqs.map((eq) => "messagerie:" + eq)).then((o) => { MSGS = {}; eqs.forEach((eq) => { const d = o["messagerie:" + eq] || lireLocal(eq); if (d) MSGS[eq] = d; }); msgsT = Date.now(); msgsP = null; return true; });
    return msgsP;
  }
  function maSigne() { if (estDirigeant()) return "Dirigeant du club"; const s = moiStaff(); return !s ? "" : s.role === "coach" ? "Coach " + s.prenom : `${s.prenom} ${s.nom[0]}. (${s.role || "staff"})`; }
  function recapMessages(S) {
    const moi = maSigne(), lignes = [];
    Object.entries(MSGS).forEach(([eq, d]) => {
      if (!peutVoir(eq) || !d || !Array.isArray(d.messages)) return;
      const convs = Object.fromEntries((d.convs || []).map((c) => [c.id, c])), nomJ = (a) => { const j = (d.joueurs || []).find((x) => "p-" + x.id === a); return !j ? "" : /Seniors|Vétérans|U20/.test((C.equipe(eq) || {}).categorie || "") ? j.nom : "Parent de " + j.nom; };
      const l = d.messages.filter((m) => m.date > S && !m.supprime && ["texte", "photo", "absence", "empechement"].includes(m.type) && !(m.auteur === "coach" && (m.signe === moi || (!m.signe && estCoach())))
        && convs[m.conv] && (convs[m.conv].type !== "perso" && convs[m.conv].type !== "groupe" || convs[m.conv].annonces || (convs[m.conv].membres || []).includes("coach")));
      if (!l.length) return;
      const par = {}; l.forEach((m) => { const c = convs[m.conv], n = c.annonces ? "Annonces" : c.type === "equipe" ? "Blabla" : c.type === "perso" ? "Privé" : c.nom || "Groupe"; par[n] = (par[n] || 0) + 1; });
      const der = l[l.length - 1], qui = der.signe || (der.auteur === "coach" ? "Le staff" : nomJ(der.auteur) || "Une famille");
      const txt = der.type === "photo" ? "📷 Photo" : der.type === "absence" ? `Absence : ${der.motif || ""}` : der.type === "empechement" ? "Ne peut plus venir au match" : (der.texte || "").slice(0, 70) + ((der.texte || "").length > 70 ? "…" : "");
      const abs = l.filter((m) => m.type === "absence" || m.type === "empechement").length;
      lignes.push({ k: abs ? "" : "info", t: `${C.nomEquipe(eq)} : ${pl(l.length, "nouveau message", "nouveaux messages")}`, s: `${Object.entries(par).map(([n, x]) => `${n} ${x}`).join(" · ")} — dernier : ${qui}, « ${txt} »`, a: `<a class="btn mini" href="${URL_MOD.messagerie(eq)}">Lire</a>`, n: l.length });
    });
    return lignes.sort((a, b) => b.n - a.n);
  }
  function recapPV(S) {
    if (!PVS) return null;
    const c = cnx(), cats = estDirigeant() ? null : new Set(mesEquipes().map((eq) => (C.equipe(eq) || {}).categorie));
    const neuf = (p) => periode === "connexion" && c.pvPrecedent != null ? p.numero > c.pvPrecedent : p.date >= S.slice(0, 10);
    return PVS.filter(neuf).map((p) => {
      const its = (p.items || []).filter((i) => !cats || cats.has(i.categorie)), urg = its.filter((i) => i.gravite === "urgent");
      if (!its.length) return { k: "ok", t: `PV n°${p.numero} du ${fmt(p.date, { day: "numeric", month: "long" })}`, s: cats ? `Rien pour ${[...cats].join(", ")}` : "Le club n'est pas cité", a: `<a class="btn mini lien" href="${URL_MOD.pv()}">Lire</a>` };
      const ech = its.flatMap((i) => i.echeances || []).filter((x) => x.date >= auj()).sort((a, b) => a.date.localeCompare(b.date))[0];
      return { k: urg.length ? "ko" : "", t: `PV n°${p.numero} du ${fmt(p.date, { day: "numeric", month: "long" })} : ${pl(its.length, "mention")}${cats ? "" : " du club"}${urg.length ? `, dont ${pl(urg.length, "urgente")}` : ""}`,
        s: its.slice(0, 3).map((i) => `${i.categorie ? i.categorie + " : " : ""}${i.titre}`).join(" · ") + (ech ? ` — à faire avant le ${fJ(ech.date)}` : ""), a: `<a class="btn mini${urg.length ? " prim" : ""}" href="${URL_MOD.pv(estDirigeant() ? "" : mesEquipes()[0])}">Lire</a>` };
    });
  }
  function recapMatchs(S) {
    const D = C.donnees, lignes = [], vu = (eq) => !!eq && peutVoir(eq);
    // Réponses des familles aux sondages et empêchements après convocation
    Object.entries(D.dispos).forEach(([id, rep]) => {
      const e = C.evenement(id); if (!e || !convocable(e) || !vu(e.equipe) || e.date < auj()) return;
      const neuves = Object.entries(rep).filter(([, x]) => x.date > S); if (!neuves.length) return;
      const cv = C.convocation(id), fem = (C.equipe(e.equipe) || {}).genre === "F";
      if (cv) {
        const abs = neuves.filter(([j, x]) => x.statut === "absent" && cv.joueurs.includes(j) && x.date > cv.publiee);
        if (abs.length) lignes.push({ k: "ko", t: `${abs.map(([j]) => (C.personne(j) || {}).prenom).join(", ")} ${abs.length > 1 ? "ne peuvent" : "ne peut"} plus venir`, s: `${C.nomEquipe(e.equipe)} · ${nomEvt(e)} · convoqué${fem ? "e" : ""}${abs.length > 1 ? "s" : ""}`, a: `<a class="btn mini prim" href="#convoc/${esc(id)}">Remplacer</a>`, o: 0 });
        return;
      }
      const tout = Object.values(rep), n = (s) => tout.filter((x) => x.statut === s).length, sans = C.joueurs(e.equipe).length - tout.length;
      lignes.push({ k: "", t: `${pl(neuves.length, "réponse")} au sondage · ${C.nomEquipe(e.equipe)}`, s: `${nomEvt(e)} — ${n("present")} présent${fem ? "e" : ""}s · ${n("incertain")} peut-être · ${n("absent")} absent${fem ? "e" : ""}s${sans > 0 ? ` · ${sans} sans réponse` : ""}`, a: `<a class="btn mini prim" href="#convoc/${esc(id)}">Convoquer</a>`, o: 1 });
    });
    // Sondages lancés et convocations publiées (par un autre éducateur, ou vus par le dirigeant)
    Object.entries(D.sondages).forEach(([id, s]) => { const e = C.evenement(id); const t = [s.relance, s.lance].filter(Boolean).sort().pop();
      if (e && vu(e.equipe) && t > S && (!s.lies || s.lies[0] === id) && estDirigeant()) lignes.push({ k: "info", t: `Sondage ${s.relance > S ? "relancé" : "lancé"} · ${C.nomEquipe(e.equipe)}`, s: s.lies ? `${s.lies.length} matchs du week-end` : nomEvt(e), a: `<a class="btn mini" href="#convoc/${esc(id)}">Voir</a>`, o: 3 }); });
    const cvs = D.convocations.filter((c) => c.publiee > S && vu(c.equipe) && C.evenement(c.evenement) && C.convocation(c.evenement) === c);
    if (cvs.length > 2) lignes.push({ k: "ok", t: `${pl(cvs.length, "convocation publiée", "convocations publiées")}`, s: cvs.map((c) => C.nomEquipe(c.equipe)).join(", "), a: `<a class="btn mini" href="#convocations">Voir</a>`, o: 2, n: cvs.length });
    else cvs.forEach((c) => { const e = C.evenement(c.evenement);
      lignes.push({ k: "ok", t: `Convocation publiée · ${C.nomEquipe(c.equipe)}`, s: `${nomEvt(e)} — ${pl(c.joueurs.length, "convoqué")}, RDV ${hh(c.rdvHeure)}`, a: `<a class="btn mini" href="#convoc/${esc(e.id)}">Voir</a>`, o: 2 }); });
    // Scores saisis
    Object.entries(D.feuilles).forEach(([id, f]) => { const e = C.evenement(id); if (e && vu(e.equipe) && f.saisie > S)
      lignes.push({ k: f.nous > f.eux ? "ok" : f.nous < f.eux ? "ko" : "", t: `Score : ESGA ${f.nous} – ${f.eux} ${e.adversaire || ""}`, s: `${C.nomEquipe(e.equipe)} · ${fJ(e.date)}${Object.values(f.stats || {}).some((x) => x.buts) ? " · " + buteursHTML(f).replace(/<[^>]+>/g, "") : ""}`, a: `<a class="btn mini" href="#feuille/${esc(id)}">Voir</a>`, o: 4 }); });
    return lignes.sort((a, b) => a.o - b.o);
  }
  function recapEntrainements(S) {
    const D = C.donnees, lignes = [];
    Object.entries(D.dispos).forEach(([id, rep]) => {
      if (!id.startsWith("e-")) return; const e = C.evenement(id); if (!e || !peutVoir(e.equipe) || e.date < auj()) return;
      const abs = Object.entries(rep).filter(([, x]) => x.date > S && x.statut === "absent"); if (!abs.length) return;
      lignes.push({ k: "", t: `${pl(abs.length, "absence signalée", "absences signalées")} · ${C.nomEquipe(e.equipe)}`, s: `${nomEvt(e)} — ${abs.map(([j, x]) => `${(C.personne(j) || {}).prenom} (${x.motif || "absent"})`).join(", ")}`, a: `<button class="btn mini" data-a="appel" data-id="${esc(id)}">Appel</button>` });
    });
    Object.entries(D.seances).forEach(([id, s]) => { const e = C.evenement(id); if (!e || !peutVoir(e.equipe) || !(s.maj > S)) return;
      const moi = estCoach() && s.auteur === C.nomComplet(moiStaff());
      lignes.push({ k: "ok", t: `Séance ${moi ? "préparée" : "prête"} dans l'Atelier · ${C.nomEquipe(e.equipe)}`, s: `${nomEvt(e)} — « ${s.nom || "Séance"} »${s.exercices ? `, ${pl(s.exercices.length, "exercice")}` : ""}${s.auteur && !moi ? ` · ${s.auteur}` : ""}`, a: `<button class="btn mini" data-a="evt" data-id="${esc(id)}">Voir</button>` }); });
    // Annulations, déplacements et nouveaux événements
    Object.entries(D.exceptions).forEach(([id, x]) => { if (!(x.modifie > S)) return; const e = C.evenement(id); if (!e || !peutVoir(e.equipe))  return;
      lignes.push({ k: x.statut === "annule" ? "ko" : "info", t: `${x.statut === "annule" ? "Annulé" : "Modifié"} · ${C.nomEquipe(e.equipe)}`, s: nomEvt(e) + (e.lieu ? ` · ${e.lieu}` : ""), a: `<button class="btn mini" data-a="evt" data-id="${esc(id)}">Voir</button>` }); });
    D.evenements.filter((e) => (e.cree > S || e.modifie > S) && (e.equipe ? peutVoir(e.equipe) : true) && e.date >= auj()).forEach((e) =>
      lignes.push({ k: e.statut === "annule" ? "ko" : "info", t: `${e.statut === "annule" ? "Annulé" : e.cree > S ? "Nouveau" : "Modifié"} : ${e.titre}`, s: `${e.equipe ? C.nomEquipe(e.equipe) + " · " : ""}${fJ(e.date)} ${hh(e.heure)}${e.lieu ? " · " + e.lieu : ""}`, a: `<button class="btn mini" data-a="evt" data-id="${esc(e.id)}">Voir</button>` }));
    return lignes;
  }
  function recapVideos(S) {
    const D = C.donnees, lignes = [];
    Object.entries(D.videos).forEach(([id, v]) => { const e = C.evenement(id); if (e && peutVoir(e.equipe) && v.maj > S)
      lignes.push({ k: "info", t: `Vidéo du match reliée · ${C.nomEquipe(e.equipe)}`, s: `${e.titre} · ${fJ(e.date)}${v.source === "monteur" ? " · depuis le Monteur" : ""}`, a: `<a class="btn mini" href="#feuille/${esc(id)}">Voir</a>` }); });
    const env = D.envois.filter((x) => peutVoir(x.equipe));
    const nouv = env.filter((x) => x.date > S);
    if (nouv.length) lignes.push({ k: "info", t: `${pl(nouv.length, "séquence envoyée", "séquences envoyées")} aux joueurs`, s: nouv.slice(0, 3).map((x) => `« ${x.nom || "Séquence"} » → ${destEnvoi(x)}`).join(" · "), a: `<a class="btn mini" href="#feuille/${esc(nouv[0].evt)}">Voir</a>` });
    const vues = env.flatMap((x) => Object.entries(x.vus || {}).filter(([, t]) => t > S).map(([j]) => [x, j]));
    if (vues.length) { const qui = [...new Set(vues.map(([, j]) => (C.personne(j) || {}).prenom).filter(Boolean))];
      lignes.push({ k: "ok", t: `${pl(vues.length, "séquence regardée", "séquences regardées")}`, s: `par ${qui.slice(0, 6).join(", ")}${qui.length > 6 ? ` et ${qui.length - 6} autres` : ""}`, a: `<a class="btn mini" href="#feuille/${esc(vues[0][0].evt)}">Voir</a>` }); }
    return lignes;
  }
  function recapHTML() {
    if (estFamille()) return "";
    if (!N.actif) chargerMessages(); // démo : messageries gardées dans ce navigateur
    const c = cnx(), S = depuis();
    // [icône, titre, lignes, mot de la puce]
    const sections = [["messagerie", "Messages", recapMessages(S), ["message", "messages"]], ["convocations", "Matchs : sondages, convocations, scores", recapMatchs(S), ["match", "matchs"]], ["calendrier", "Entraînements, séances et calendrier", recapEntrainements(S), ["entraînement", "entraînements"]], ["video", "Vidéos", recapVideos(S), ["vidéo", "vidéos"]], ["pv", "PV du District", recapPV(S), ["PV", "PV"]]];
    const total = sections.reduce((n, [, , l]) => n + (l ? l.length : 0), 0);
    const quand = periode === "24h" ? "ces dernières 24 heures" : periode === "7j" ? "ces 7 derniers jours" : c.precedente ? `depuis votre dernière visite, ${fDH(c.precedente)}` : "ces 7 derniers jours (première visite)";
    const choixP = `<select class="recap-periode" aria-label="Période">${[["connexion", "Depuis ma dernière visite"], ["24h", "Dernières 24 h"], ["7j", "7 derniers jours"]].map(([k, l]) => `<option value="${k}"${periode === k ? " selected" : ""}>${l}</option>`).join("")}</select>`;
    const puces = sections.filter(([, , l]) => l && l.length).map(([ic, t, l, [un, des]]) => { const m = ic === "messagerie" ? l.reduce((x, y) => x + y.n, 0) : 0;
      return `<button class="recap-puce" data-a="recap-aller" data-id="${ic}">${svg(ic)}${m ? `<b>${m}</b> ${m > 1 ? des : un}` : `${esc(t.split(/ :|,/)[0])} <b>${l.length}</b>`}</button>`; }).join("");
    const tete = `<div class="recap-tete"><div><h2>Récapitulatif</h2><p>${total ? `<b>${pl(total, "nouveauté")}</b> ${esc(quand)}` : `Rien de nouveau ${esc(quand)}. 👌`}</p></div><div class="recap-actions">${choixP}${total ? '<button class="btn mini or" data-a="recap-vu">✓ J\'ai tout vu</button>' : ""}</div></div>`;
    if (!total) return `<section class="recap vide-recap">${tete}${PVS ? "" : '<p class="discret petit" style="margin:8px 0 0">PV du District : chargement…</p>'}</section>`;
    const bloc = ([ic, t, l]) => { if (!l || !l.length) return ""; const max = 5, li = (x) => `<li><span class="pt ${x.k}"></span><span class="tx">${esc(x.t)}<small>${esc(x.s)}</small></span>${x.a}</li>`;
      return `<div class="recap-bloc" id="recap-${ic}"><h3>${svg(ic)} ${esc(t)} <span class="etiq">${l.length}</span></h3><ul class="taches">${l.slice(0, max).map(li).join("")}</ul>${l.length > max ? `<details><summary class="btn lien">+ ${pl(l.length - max, "autre", "autres")}</summary><ul class="taches">${l.slice(max).map(li).join("")}</ul></details>` : ""}</div>`; };
    return `<section class="recap">${tete}<nav class="recap-puces">${puces}</nav><div class="recap-grille">${sections.map(bloc).join("")}</div></section>`;
  }

  /* ---------- convoqués en tuiles : sur l'accueil de chaque rôle ---------- */
  // Les rencontres à venir dont la convocation est publiée, une tuile par convoqué (numéro, prénom), sans poste : l'entraîneur les décide le jour même.
  // Famille : son équipe, sa tuile en or. Coach : ses équipes. Dirigeant : tout le club, replié s'il y a beaucoup de matchs.
  function tuilesConvoques(eqs, jours, { moi = null, replier = false, avecEquipe = true } = {}) {
    const evs = (eqs ? eqs.flatMap((eq) => C.rencontres(eq, auj(), ajout(auj(), jours))) : C.rencontres(null, auj(), ajout(auj(), jours)))
      .filter((e) => C.convocation(e.id)).sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
    const fam = !!moi;
    const tete = (n) => `<h2>📋 ${fam ? "Les convoqués" : "Convoqués aux prochains matchs"} ${n ? `<span class="etiq bleu">${pl(n, "match", "matchs")}</span>` : ""}${fam ? "" : '<a class="plus" href="#convocations">Tous les matchs ›</a>'}</h2>`;
    if (!evs.length) {
      const n = (eqs || []).map((eq) => C.prochainMatch(eq)).filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))[0];
      return `<section class="carte convoques">${tete(0)}<p class="vide" style="padding:6px 0">${fam && n ? `La convocation pour <b>${esc(n.titre)}</b> (${fJ(n.date)}) n'est pas encore publiée. Elle apparaîtra ici.` : `Aucune convocation publiée pour les ${jours} prochains jours.`}</p></section>`;
    }
    const tuile = (p, e) => { const d = C.dispos(e.id)[p.id], abs = d && d.statut === "absent", f = p.genre === "F", c = moi === p.id;
      return `<li class="tuile-j${c ? " moi" : ""}${abs ? " abs" : ""}"${fam ? "" : ` data-a="fiche" data-id="${esc(p.id)}" role="button" tabindex="0"`} title="${esc(C.nomComplet(p))}">
        <span class="num">${p.numero || initiales(p)}</span><b>${esc(p.prenom)}${p.nom ? " " + esc(p.nom[0]) + "." : ""}</b><small>${abs ? `absent${f ? "e" : ""}` : c ? (profil.role === "parent" ? "votre enfant" : "c'est vous") : ""}</small></li>`; };
    const bloc = (e, ouvert) => { const cv = C.convocation(e.id), js = cv.joueurs.map(C.personne).filter(Boolean).sort((a, b) => (a.numero || 99) - (b.numero || 99) || a.prenom.localeCompare(b.prenom)), mx = maxConv(e);
      const resume = `<span class="cq-date"><b>${fmt(e.date, { weekday: "short" })}</b><span>${jour(e.date).getDate()}</span><small>${fmt(e.date, { month: "short" })}</small></span>
        <span class="cq-titre"><b>${avecEquipe ? esc(C.nomEquipe(e.equipe)) + " · " : ""}${esc(e.adversaire || e.titre)}</b><small>${hh(e.heure)} · ${esc(e.lieu || "")}${e.type !== "match" ? " · " + esc(TYPES[e.type]) : ""}<br>⏰ RDV ${hh(cv.rdvHeure)} · ${esc(cv.rdvLieu || "")}</small></span>
        <span class="etiq ${mx && js.length > mx ? "att" : "ok"}">${js.length}${mx ? " / " + mx : ""}</span>`;
      const liste = `<ul class="tuiles-j">${js.map((p) => tuile(p, e)).join("")}</ul>${fam ? "" : `<p class="cq-pied"><a class="btn mini lien" href="#convoc/${esc(e.id)}">Voir la convocation ›</a></p>`}`;
      return replier ? `<details class="cq"${ouvert ? " open" : ""}><summary class="cq-tete">${resume}</summary>${liste}</details>` : `<div class="cq"><div class="cq-tete">${resume}</div>${liste}</div>`; };
    return `<section class="carte convoques">${tete(evs.length)}${evs.map((e, i) => bloc(e, evs.length <= 2 || i === 0)).join("")}</section>`;
  }

  function pageAccueilCoach() {
    const s = moiStaff(); if (!s) return `<p class="vide">Profil introuvable.</p>`;
    const eqs = s.equipes;
    if (!eqs.length) return `<div class="entete"><h1>Bonjour ${esc(s.prenom)}</h1></div><p class="vide">Aucune équipe ne vous est confiée pour l'instant. Le responsable sportif peut vous en affecter une.</p>`;
    return `<div class="entete"><div><p class="fil-ariane discret">${fJL(auj())}</p><h1>Bonjour ${esc(s.prenom)} 👋</h1><p class="sous">${eqs.map(C.nomEquipe).join(" · ")}</p></div></div>`
      + bandeMatchs(eqs) + recapHTML() + carteWeekend(eqs) + tuilesConvoques(eqs, 10, { avecEquipe: eqs.length > 1 }) + eqs.map((eq) => blocCoach(eq, eqs.length > 1)).join("")
      + `<section class="carte" style="margin-top:14px"><h2>Vos outils</h2>${modulesHTML(eqs[0])}</section>`;
  }
  // Accès direct aux matchs du coach : le dernier joué et les prochains, un geste pour ouvrir la fiche
  function bandeMatchs(eqs) {
    const plusieurs = eqs.length > 1;
    const av = C.evenements({ equipes: eqs, du: auj(), au: ajout(auj(), 60), types: ["match", "amical", "plateau", "tournoi"] }).filter((e) => e.statut !== "annule" && e.equipe).slice(0, 4);
    const pa = C.evenements({ equipes: eqs, du: ajout(auj(), -30), au: ajout(auj(), -1), types: ["match", "amical"] }).filter((e) => e.statut !== "annule" && e.equipe).pop();
    const tuile = (e, passe) => { const cv = C.convocation(e.id), f = C.feuille(e.id);
      const etat = passe ? scoreHTML(e, f) : cv ? '<span class="etiq ok">Convoqué</span>' : etatSondage(e).lance ? '<span class="etiq bleu">Sondage en cours</span>' : '<span class="etiq att">À préparer</span>';
      return `<a class="tm${passe ? " passe" : ""}" href="#${passe ? "feuille" : "convoc"}/${esc(e.id)}"><small>${passe ? "Dernier match · " : ""}${maj1(fmt(e.date, { weekday: "short", day: "numeric", month: "short" }))}${passe ? "" : " · " + hh(e.heure)}</small>
        <b>${esc(e.adversaire || e.titre)}</b><small>${plusieurs ? esc(C.nomEquipe(e.equipe)) + " · " : ""}${e.domicile ? "Domicile" : "Extérieur"}</small>${etat}</a>`; };
    const l = (pa ? [tuile(pa, true)] : []).concat(av.map((e) => tuile(e, false)));
    return `<section class="bande-matchs"><h2>⚽ Mes matchs <a class="plus" href="#convocations">Tous les matchs de la saison ›</a></h2>${l.length ? `<div class="tm-liste">${l.join("")}</div>` : '<p class="discret petit">Aucun match dans les 2 prochains mois.</p>'}</section>`;
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
  const ligneRencontre = (e, avecEquipe, avecRappel) => `<li class="${rappelDu(e) ? "du" : ""}"><button class="btn lien quand" data-a="evt" data-id="${esc(e.id)}"><b>${fJ(e.date)}</b> ${hh(e.heure)}</button><span class="qui"><b>${esc(e.titre)}</b><small>${esc([avecEquipe ? C.nomEquipe(e.equipe) : "", e.competition || TYPES[e.type] || "", e.lieu].filter(Boolean).join(" · "))}${meteoTag(e)}</small></span><span class="etat">${etatRencontre(e, avecRappel)}</span></li>`;
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
    const cls = C.classements().filter((c) => eqs.some((e) => e.id === c.equipe));
    const carte = (e) => {
      const co = C.coachDe(e.id), n = C.joueurs(e.id).length, m = C.prochainMatch(e.id), cr = C.creneaux(e.id);
      return `<a class="eq" href="#equipe/${esc(e.id)}"><h3>${esc(e.nom)} ${e.genre === "F" ? '<span class="etiq bleu">Féminines</span>' : ""}</h3>
        <span class="l">Éducateur : ${co ? `<b>${esc(C.nomComplet(co))}</b>` : '<b style="color:var(--ko)">à pourvoir</b>'}</span>
        <span class="l">${cr.length ? cr.map((c) => `${maj1(JOURS[c.jour]).slice(0, 3)}. ${hh(c.heure)}`).join(" · ") : "Pas de créneau"}</span>
        <span class="l">${m ? `Prochain match : <b>${fJ(m.date)}</b> · ${esc(m.adversaire)}` : e.format < 11 ? "Plateaux et tournois" : "Aucun match à venir"}</span>
        <span class="chiffres">${(() => { const c = cls.find((x) => x.equipe === e.id); return c ? `<span class="etiq bleu">${c.rang}${c.rang === 1 ? "er" : "e"} / ${c.nb}</span>` : ""; })()}<span class="etiq">${pl(n, "joueur")}</span><span class="etiq">Foot à ${e.format}</span>${m && !C.convocation(m.id) && jour(m.date) - jour(auj()) <= 8 * 864e5 ? '<span class="etiq att">À convoquer</span>' : ""}</span></a>`;
    };
    const forme = (f) => f.map((r) => `<span class="etiq ${r === "V" ? "ok" : r === "D" ? "ko" : "or"}">${r}</span>`).join("");
    const recap = cls.length ? `<section class="carte recap-cl"><h2>Classements de la saison</h2><div class="table-wrap"><table class="liste saison"><thead><tr><th>Équipe</th><th class="cache-m">Championnat</th><th class="c">Place</th><th class="c">Pts</th><th class="c cache-m">J</th><th>Forme</th></tr></thead><tbody>
      ${cls.map((c) => `<tr data-a="lien" data-href="#equipe/${esc(c.equipe)}/saison"><td class="nom"><b>${esc(C.nomEquipe(c.equipe))}</b><small class="seul-m discret">${esc(c.championnat)}</small></td><td class="cache-m discret">${esc(c.championnat)}</td><td class="c"><b>${c.rang}<sup>${c.rang === 1 ? "er" : "e"}</sup></b><small class="discret">/${c.nb}</small></td><td class="c"><b>${c.pts}</b></td><td class="c cache-m">${c.j}</td><td class="forme">${forme(c.forme)}</td></tr>`).join("")}
      </tbody></table></div><p class="aide">Résultats officiels lus chaque lundi sur Scorenco. Touchez une équipe pour voir le classement complet et les matchs de sa poule.</p></section>` : "";
    return `<div class="entete"><div><h1>${estDirigeant() ? "Équipes" : "Mes équipes"}</h1><p class="sous">${pl(eqs.length, "équipe")} · saison ${C.SAISON.libelle}</p></div>${estDirigeant() ? '<div class="actions"><button class="btn prim" data-a="nouvelle-equipe">+ Équipe</button></div>' : ""}</div>`
      + recap + groupes.map(([t, f]) => { const l = eqs.filter(f); return l.length ? `<h2 class="groupe-titre">${t}</h2><div class="equipes">${l.map(carte).join("")}</div>` : ""; }).join("");
  }

  function pageEquipe(id, onglet) {
    const e = C.equipe(id);
    if (!e || !peutVoir(id)) return `<p class="vide">Équipe introuvable ou non accessible.</p>`;
    onglet = onglet || "effectif";
    const staff = C.staffDe(id), js = C.joueurs(id);
    const off = C.saisonOfficielle(id);
    const tabs = [["effectif", `Effectif (${js.length})`], ["calendrier", "Calendrier"], ...(off ? [["saison", "Matchs et classement"]] : []), ["presences", "Présences"], ["creneaux", "Horaires"]];
    let corps = "";
    if (onglet === "effectif") corps = tableJoueurs(js, { equipe: false }) + `<p style="margin-top:12px"><button class="btn" data-a="nouveau-joueur" data-equipe="${esc(id)}">+ Ajouter un joueur</button></p>`;
    if (onglet === "calendrier") {
      const av = C.evenements({ equipe: id, du: auj(), au: ajout(auj(), 35) }), pa = C.evenements({ equipe: id, du: ajout(auj(), -21), au: ajout(auj(), -1) }).reverse();
      corps = `<div class="grille g2"><section class="carte"><h2>À venir <button class="btn mini plus" data-a="nouvel-evt" data-equipe="${esc(id)}">+ Ajouter</button></h2>${agenda(av, false)}</section><section class="carte"><h2>3 dernières semaines</h2>${agenda(pa, false)}</section></div>`;
    }
    if (onglet === "saison") corps = off ? pageSaison(off) : '<p class="vide">Pas encore de données officielles pour cette équipe.</p>';
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
  // Onglet Classement : classement de chaque poule (recalculé d'après les résultats), matchs de l'équipe et des adversaires
  function pageSaison(off) {
    const score = (m) => m.statut === "withdrawal" ? '<span class="etiq att">Forfait</span>' : m.statut === "postponed" ? '<span class="etiq att">Reporté</span>'
      : m.score_dom != null && m.score_ext != null ? `<b>${m.score_dom} – ${m.score_ext}</b>` : hh(m.heure || "") || "";
    const issue = (m) => { if (m.statut !== "finish" || m.score_dom == null || m.esga_id == null) return "";
      const p = m.a_domicile ? m.score_dom : m.score_ext, c = m.a_domicile ? m.score_ext : m.score_dom;
      return p > c ? '<span class="etiq ok">V</span>' : p < c ? '<span class="etiq ko">D</span>' : '<span class="etiq or">N</span>'; };
    const nom = (m, cote) => m.a_domicile === (cote === "dom") ? `<b>${esc(cote === "dom" ? m.domicile : m.exterieur)}</b>` : esc(cote === "dom" ? m.domicile : m.exterieur);
    const cible = (m) => { const e = m.esga_id != null && C.evenementScorenco(m.id); return e ? `data-a="lien" data-href="#${e.date < auj() ? "feuille" : "convoc"}/${esc(e.id)}"` : `data-lien="${esc(m.url || "")}"`; };
    const ligne = (m) => `<tr ${cible(m)}><td class="num">${fmt(m.date, { day: "numeric", month: "numeric" })}</td><td class="rencontre">${nom(m, "dom")} <span class="sc">${score(m)}</span> ${nom(m, "ext")}</td><td class="c">${issue(m)}</td></tr>`;
    const table = (l, vide) => l.length ? `<div class="table-wrap"><table class="liste saison"><tbody>${l.map(ligne).join("")}</tbody></table></div>` : `<p class="vide">${vide}</p>`;
    const joues = off.matchs.filter((m) => m.statut !== "to_come").reverse(), avenir = off.matchs.filter((m) => m.statut === "to_come");
    const classement = (p) => `<section class="carte"><h2>${esc(p.nom)}</h2><div class="table-wrap"><table class="liste saison"><thead><tr><th>#</th><th>Équipe</th><th class="c">Pts</th><th class="c cache-m">J</th><th class="c cache-m">V</th><th class="c cache-m">N</th><th class="c cache-m">D</th><th class="c cache-m">BP</th><th class="c cache-m">BC</th><th class="c">Diff</th></tr></thead><tbody>
      ${p.classement.map((l) => `<tr${off.ids.includes(l.team_id) ? ' class="moi"' : ""}><td class="num">${l.rang}</td><td class="nom">${l.esga ? "<b>" + esc(l.nom) + "</b>" : esc(l.nom)}</td><td class="c"><b>${l.pts}</b></td><td class="c cache-m">${l.j}</td><td class="c cache-m">${l.v}</td><td class="c cache-m">${l.n}</td><td class="c cache-m">${l.d}</td><td class="c cache-m">${l.bp}</td><td class="c cache-m">${l.bc}</td><td class="c">${l.diff > 0 ? "+" : ""}${l.diff}</td></tr>`).join("")}
      </tbody></table></div>
      <details class="autres"><summary>Matchs des autres équipes de la poule</summary>${(() => { const a = off.autres(p.id), j = a.filter((m) => m.statut !== "to_come").reverse().slice(0, 12), v = a.filter((m) => m.statut === "to_come").slice(0, 12);
        return `<h3>Derniers résultats</h3>${table(j, "Aucun résultat.")}<h3>Prochains matchs</h3>${table(v, "Aucun match prévu.")}`; })()}</details></section>`;
    const matchsHTML = `<div class="grille g2"><section class="carte"><h2>Prochains matchs</h2>${table(avenir, "Aucun match prévu.")}</section><section class="carte"><h2>Résultats</h2>${table(joues, "Aucun match joué.")}</section></div>`;
    return matchsHTML + (off.poules.length ? off.poules.map(classement).join("") : '<p class="vide">Pas de championnat suivi pour cette équipe (coupes ou plateaux seulement).</p>')
      + `<p class="aide">Touchez un de vos matchs pour ouvrir sa convocation ou sa feuille de match. Source : Scorenco, mis à jour chaque lundi (dernière lecture ${fmt(off.maj.slice(0, 10), { day: "numeric", month: "long" })}). Classement recalculé d'après les résultats (3 points la victoire, 1 le nul), hors pénalités éventuelles du District.</p>`;
  }

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
    f = f || e.officiel;
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
        <span><b>${esc(e.titre)}</b><small>${estDirigeant() ? esc(C.nomEquipe(e.equipe)) + " · " : ""}${hh(e.heure)} · ${esc(e.lieu)}<br>${esc(e.competition || TYPES[e.type])}</small></span></div>${etape1}${etape2}</section>`; }).join("")}</div>` : '<p class="vide">Aucun match ni plateau dans les 5 prochaines semaines. Ajoutez un match amical si besoin.</p>') + plusTard();
  }
  function plusTard() {
    const evs = C.rencontres(null, ajout(auj(), 36), ajout(auj(), 300)).filter((e) => peutVoir(e.equipe));
    if (!evs.length) return "";
    return `<h2 class="groupe-titre">Plus tard dans la saison</h2><div class="table-wrap"><table class="liste"><tbody>${evs.map((e) => `<tr data-a="lien" data-href="#convoc/${esc(e.id)}"><td>${fJ(e.date)}<small class="discret"> · ${hh(e.heure)}</small></td>${estDirigeant() ? `<td><b>${esc(C.nomEquipe(e.equipe))}</b></td>` : ""}<td class="nom" style="white-space:normal"><b>${esc(e.titre)}</b><br><small class="discret">${esc(e.competition || TYPES[e.type] || "")}</small></td></tr>`).join("")}</tbody></table></div>`;
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
          <div class="form"><div class="pied" style="justify-content:flex-start"><a class="btn" href="guide.html#affiche" title="Le guide par rôle et l'affiche à imprimer avec le QR code">📖 Guide et affiche QR</a><a class="btn" href="simulateur.html" title="Un match préparé de A à Z, joué tout seul sur des données de test">🧪 Simulateur de test</a><button class="btn" data-a="export-json">Sauvegarder (JSON)</button><button class="btn" data-a="import-json">Restaurer</button>${N.actif ? "" : '<button class="btn danger" data-a="raz">Remettre la démo à zéro</button>'}</div></div>
          <div class="form"><p class="petit" style="margin:4px 0 6px"><b>🧪 Matchs fictifs pour tester</b> : un match dans les 7 jours pour chaque équipe qui n'en a pas déjà un (domicile et extérieur, avec la météo), et pour les U15F 2 un match à l'extérieur déjà convoqué avec du covoiturage en cours.${N.actif ? " Le mode test travaille sur une copie gardée sur cet appareil : les vraies données du club ne bougent pas." : ""}</p>
            <div class="pied" style="justify-content:flex-start">${N.actif ? '<button class="btn prim" data-a="mode-test">Tester avec des matchs fictifs</button>' : `<button class="btn" data-a="matchs-test">Recréer les matchs fictifs</button>${C.modeTest && C.modeTest.actif ? '<button class="btn" data-a="mode-test-sortir">Quitter le mode test</button>' : ""}`}</div></div>
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
    const t = { demo: ["Démo", "Les données restent dans ce navigateur. Entrez le code du club (Changer de profil) pour partager avec tout le club."], ok: ["🟢 En ligne", "Données partagées avec tout le club, mises à jour toutes les 15 secondes."], connexion: ["En ligne…", "Connexion au club…"], "hors-ligne": ["🟠 Hors ligne", "Pas de réseau : vos modifications partiront dès son retour."], erreur: ["🟠 En ligne", "Un envoi a échoué, nouvel essai bientôt."], code: ["Code à saisir", "Le code du club a changé : entrez le nouveau code."] }[C.modeTest && C.modeTest.actif && N.etat === "demo" ? "test" : N.etat] || ["🧪 Mode test", "Copie de test sur cet appareil, avec des matchs fictifs : rien n'est envoyé au club."];
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
      <p class="discret petit">${N.actif ? "Vous pourrez changer de profil à tout moment." : "Démo : choisissez librement, vous pourrez changer à tout moment."}</p><p class="petit"><a href="guide.html">📖 Première fois ? Le guide en 2 minutes</a></p></div>`;
    const retour = `<button class="btn lien" data-a="role" data-v="">‹ Retour</button>`;
    if (choix.role === "dirigeant") { // le nom sert à retrouver « depuis votre dernière visite » sur tous vos appareils
      const ds = C.staff().filter((x) => !["coach", "adjoint"].includes(x.role));
      return `<div class="bienvenue">${tete}${retour}<p class="bv-intro">Choisissez votre nom : vous retrouverez votre récapitulatif sur tous vos appareils.</p><div class="choix-liste">${ds.map((x) => `<button class="pers" data-a="choisir-dirigeant" data-id="${esc(x.id)}">${avatarP(x)}<span><b>${esc(C.nomComplet(x))}</b><small>${esc(x.fonction || ROLES[x.role] || "Dirigeant")}</small></span></button>`).join("")}
        <button class="pers" data-a="choisir-dirigeant" data-id=""><span class="avatar" aria-hidden="true">🏛️</span><span><b>Autre dirigeant</b><small>Sans nom (récapitulatif commun)</small></span></button></div></div>`;
    }
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
    const tete = `<p class="gros">${esc(m.titre)}</p><p class="discret" style="margin:0 0 12px">${fJL(m.date)} · ${hh(m.heure)}<br>${esc(m.lieu)}${m.type !== "match" ? ` · ${esc(TYPES[m.type])}` : ""}${meteoTag(m)}</p>`;
    const absent = dm && dm.statut === "absent";
    if (cv && conv && !absent) return tete + `<div class="statut-convoc">✅ <span><b>${parent ? `${esc(j.prenom)} est convoqué${e_}` : "Vous êtes convoqué" + e_}</b><br>Rendez-vous <b>${hh(cv.rdvHeure)}</b> · ${esc(cv.rdvLieu)}<br><small>${esc(cv.tenue)}</small>${cv.mot ? `<br><small>💬 ${esc(cv.mot)}</small>` : ""}</span></div>
          <button class="btn" data-a="dispo-match" data-id="${esc(m.id)}" data-v="absent">${parent ? `${esc(j.prenom)} ne peut pas venir` : "Je ne peux pas venir"}</button>` + covoitHTML(m, j, parent);
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
  /* ---------- météo du match (prévision à 7 jours, remplie après l'affichage) ---------- */
  const meteoTag = (e) => (estMatch(e) || ["amical", "plateau", "tournoi"].includes(e.type)) ? `<span class="meteo" data-meteo="${esc(e.id)}"></span>` : "";
  function remplirMeteo() {
    document.querySelectorAll("[data-meteo]:not([data-ok])").forEach((el) => {
      el.dataset.ok = "1";
      C.meteo(el.dataset.meteo).then((v) => { if (!v) return el.remove();
        const pluvieux = /pluie|averse|bruine|orage|neige/i.test(v.lib);
        el.innerHTML = `${v.ic} <b>${v.temp}°</b> ${esc(v.lib.toLowerCase())}${v.pluie != null && v.pluie >= 20 ? (pluvieux ? ` (${v.pluie} %)` : ` · pluie ${v.pluie} %`) : ""}${v.vent >= 30 ? ` · vent ${v.vent} km/h` : ""}`;
        el.title = `Prévision à l'heure du match${v.ville ? " · " + v.ville : ""} (Open-Meteo)`; });
    });
  }

  /* ---------- covoiturage : les familles s'organisent entre elles, le coach n'a rien à faire ---------- */
  let covoitOffre = null; // rencontre où la famille choisit son nombre de places
  const famDe = (jid) => { const p = C.personne(jid) || {}; return `${/^[aeiouyhéèêàâîïôû]/i.test(p.prenom || "") ? "la famille d'" : "la famille de "}${esc(p.prenom || "?")}`; };
  const prenomDe = (jid) => esc((C.personne(jid) || {}).prenom || "?");
  function covoitHTML(m, j, parent) {
    const cv = C.covoiturage(m.id), moi = cv.de(j.id) || {}, f = j.genre === "F";
    const conduit = cv.conducteurs.find((v) => v.jid === j.id), monte = cv.conducteurs.find((v) => v.passagers.includes(j.id));
    let etat = "", choix = "";
    if (conduit) etat = `<p class="covoit-moi ok">🚗 <span><b>${conduit.passagers.length ? `${parent ? "Vous emmenez" : "Ta famille emmène"} ${conduit.passagers.map(prenomDe).join(", ")}` : `${parent ? "Vous n'emmenez" : "Ta famille n'emmène"} personne pour l'instant`}</b><br><small>${conduit.libres ? `${conduit.libres} place${conduit.libres > 1 ? "s" : ""} encore libre${conduit.libres > 1 ? "s" : ""}` : "Voiture complète"} · ${conduit.places} en tout</small></span></p>
        <p class="covoit-actions"><button class="btn mini" data-a="covoit" data-id="${esc(m.id)}" data-v="offrir">Changer le nombre de places</button><button class="btn mini lien" data-a="covoit" data-id="${esc(m.id)}" data-v="aucun">${parent ? "Nous ne conduisons plus" : "Ma famille ne conduit plus"}</button></p>`;
    else if (monte) etat = `<p class="covoit-moi ok">✅ <span><b>${parent ? esc(j.prenom) + " monte" : "Tu montes"} avec ${famDe(monte.jid)}</b><br><small>Rendez-vous à l'heure de la convocation.</small></span></p>
        <p class="covoit-actions"><button class="btn mini lien" data-a="covoit" data-id="${esc(m.id)}" data-v="cherche">Ne plus monter avec eux</button></p>`;
    else {
      const libres = cv.conducteurs.filter((v) => v.libres > 0);
      choix = libres.length ? `<ul class="covoit-liste">${libres.map((v) => `<li><span><b>🚗 ${maj1(famDe(v.jid))}</b><small>${v.libres} place${v.libres > 1 ? "s" : ""} libre${v.libres > 1 ? "s" : ""}${v.passagers.length ? " · avec " + v.passagers.map(prenomDe).join(", ") : ""}</small></span><button class="btn mini prim" data-a="covoit" data-id="${esc(m.id)}" data-v="avec:${esc(v.jid)}">${parent ? esc(j.prenom) + " monte" : "Je monte"}</button></li>`).join("")}</ul>` : "";
      etat = moi.cherche || moi.avec ? `<p class="covoit-moi att">🙋 <span><b>${parent ? esc(j.prenom) + " cherche" : "Tu cherches"} une place</b><br><small>Les familles qui conduisent le voient.</small></span></p>` : "";
      etat += `<p class="covoit-actions"><button class="btn mini" data-a="covoit" data-id="${esc(m.id)}" data-v="offrir">${parent ? "Je peux emmener des enfants" : "Ma famille peut emmener"}</button>${moi.cherche || moi.avec ? `<button class="btn mini lien" data-a="covoit" data-id="${esc(m.id)}" data-v="aucun">Plus besoin</button>` : `<button class="btn mini" data-a="covoit" data-id="${esc(m.id)}" data-v="cherche">${parent ? "Nous cherchons une place" : "Je cherche une place"}</button>`}</p>`;
    }
    const offre = covoitOffre === m.id ? `<div class="covoit-places"><span>Combien de places pour les enfants ?</span>${[1, 2, 3, 4].map((n) => `<button class="btn${conduit && conduit.places === n ? " prim" : ""}" data-a="covoit" data-id="${esc(m.id)}" data-v="places:${n}">${n}</button>`).join("")}</div>` : "";
    const autres = cv.cherche.filter((x) => x !== j.id);
    return `<div class="covoit"><h3>🚗 Covoiturage <small>entre familles</small></h3>${etat}${offre}${choix}
      ${autres.length ? `<p class="covoit-cherche"><b>Cherche${autres.length > 1 ? "nt" : ""} une place :</b> ${autres.map(prenomDe).join(", ")}</p>` : ""}
      ${!cv.conducteurs.length && !cv.cherche.length && !offre ? `<p class="aide" style="margin:0">Personne ne s'est encore proposé. Le premier qui conduit lance le mouvement 🙂</p>` : ""}
      <p class="aide" style="margin:6px 0 0">L'heure et le lieu de départ se calent dans le <a href="${URL_MOD.messagerie(j.equipe)}">Blabla de l'équipe</a>.</p></div>`;
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
      ${tuilesConvoques([j.equipe], C.JOURS_SONDAGE, { moi: j.id, avecEquipe: false })}
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
    remplirMeteo();
    document.title = `${($("#contenu h1") || {}).textContent || "Console"} · Console ESGA`;
    if (r.page === "accueil") {
      chargerPV(); if (!PVS) chargerPVs().then(() => { if (route().page === "accueil") rendre(true); });
      else if (PVS[0]) C.noterPV(Math.max(...PVS.map((p) => p.numero)));
      if (!estFamille()) chargerMessages().then((neuf) => { if (neuf && route().page === "accueil") rendre(true); });
    }
    const cle = location.hash;
    if (garderDefil && cle === derniere) window.scrollTo(0, y); else if (cle !== derniere) window.scrollTo(0, 0);
    // Lien d'un autre module (retour de l'Atelier…) : #calendrier?evt=<id> ouvre la fiche de l'événement, une fois
    const pe = new URLSearchParams(r.params || "").get("evt");
    if (pe && cle !== derniere && C.evenement(pe) && peutVoir(C.evenement(pe).equipe)) setTimeout(() => ouvrirEvt(pe), 0);
    derniere = cle;
  }

  /* ---------- événements ---------- */
  document.addEventListener("click", (ev) => {
    const l = ev.target.closest("tr[data-lien]"); if (l && l.dataset.lien) { window.open(l.dataset.lien, "_blank", "noopener"); return; }
    const t = ev.target.closest("[data-a]"); if (!t) return;
    if (ev.target.closest("[data-stop]")) return;
    const a = t.dataset.a, id = t.dataset.id;
    if (t.tagName === "A") return; // liens normaux
    if (a === "f-joue") return; // case à cocher : gérée à l'événement « change »
    ev.preventDefault();
    if (a === "fermer") return fermer();
    if (a === "recap-aller") { const el = document.getElementById("recap-" + id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (a === "recap-vu") { C.toutVu(PVS && PVS[0] ? Math.max(...PVS.map((p) => p.numero)) : null); cnx.k = null; periode = "connexion"; toast("C'est noté : le récapitulatif repart de maintenant."); return rendre(true); }
    if (a === "role") {
      choix = { role: t.dataset.v || null, equipe: t.dataset.v === "joueur" ? "Seniors F-1" : "U15F-2", q: "" }; return rendre();
    }
    if (a === "choix-equipe") { choix.equipe = t.dataset.v; choix.q = ""; return rendre(true); }
    if (a === "choisir-dirigeant") { profil = id ? { role: "dirigeant", staff: id } : { role: "dirigeant" }; sauverProfil(); choix = { role: null, equipe: null, q: "" }; return allerA("#accueil", `Bienvenue${moiStaff() ? " " + moiStaff().prenom : ""} ! Vous voyez tout le club.`); }
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
    if (a === "covoit") {
      const j = moiJoueur(), v = t.dataset.v || ""; if (!j) return;
      if (v === "offrir") { covoitOffre = covoitOffre === id ? null : id; return rendre(true); }
      covoitOffre = null;
      if (v.startsWith("places:")) { C.setCovoit(id, j.id, { places: +v.slice(7) }); toast("Merci ! Les autres familles voient vos places. 🚗"); }
      else if (v.startsWith("avec:")) { C.setCovoit(id, j.id, { avec: v.slice(5) }); toast("C'est noté, la place est réservée. 👍"); }
      else if (v === "cherche") { C.setCovoit(id, j.id, { cherche: true }); toast("C'est noté : les familles qui conduisent le voient."); }
      else C.setCovoit(id, j.id, null);
      return rendre(true);
    }
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
    if (a === "mode-test") { C.modeTest.entrer(); return; }
    if (a === "mode-test-sortir") { C.modeTest.sortir(); return; }
    if (a === "matchs-test") { C.matchsTest(true); toast("Matchs fictifs ajoutés pour les 7 prochains jours."); return; }
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
    if (ev.target.classList && ev.target.classList.contains("recap-periode")) { periode = ev.target.value; return rendre(true); }
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
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !$("#tiroir").hidden) fermer(); if (ev.key === "Enter" && ev.target.matches && ev.target.matches('.tuile-j[role="button"]')) ev.target.click(); });
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
