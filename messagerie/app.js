/* Messagerie d'équipe ESGA (démo dans le navigateur).
   Discussion, absences aux entraînements, sondage de présence au match, convocation. */
(function () {
  "use strict";
  const S = window.STOCKAGE;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const jourISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const maintenant = () => new Date().toISOString();
  const fmtJour = (iso, opts = { weekday: "long", day: "numeric", month: "long" }) => new Date(iso.length === 10 ? iso + "T12:00" : iso).toLocaleDateString("fr-FR", opts);
  const fmtHeure = (iso) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const maj1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const PRENOMS_G = ["Léo M.", "Nathan B.", "Yanis K.", "Lucas D.", "Adam R.", "Hugo P.", "Ilyes T.", "Gabriel L.", "Noah S.", "Rayan F.", "Tom C.", "Sacha V.", "Enzo G.", "Mathis H.", "Kylian A.", "Jules N."];
  const PRENOMS_F = ["Léa M.", "Inès B.", "Jade K.", "Chloé D.", "Lina R.", "Manon P.", "Sarah T.", "Emma L.", "Zoé S.", "Maëlys F.", "Louise C.", "Nina V.", "Camille G.", "Assia H.", "Lou A.", "Romane N."];
  // Systèmes de jeu (gardien compris) : lignes de la défense vers l'attaque
  const FORMATIONS = { 11: ["4-4-2", "4-3-3", "4-2-3-1", "3-5-2", "5-3-2"], 8: ["3-3-1", "2-3-2", "3-2-2"] };
  const MOTIFS = ["Malade", "Blessure", "École / devoirs", "Raison familiale", "Transport", "Autre"];
  const REPONSES = { oui: "Présent", incertain: "Incertain", non: "Absent" };

  let MATCHS = [];
  let EQUIPES = [];
  let moi = lireMoi();
  let etat = null;
  let onglet = "discussion";
  let vus = 0;

  /* ---------- profil de l'onglet (chaque onglet peut jouer quelqu'un d'autre) ---------- */
  function lireMoi() {
    try { return JSON.parse(sessionStorage.getItem("esga-messagerie-moi")) || {}; } catch (e) { return {}; }
  }
  function ecrireMoi() {
    try { sessionStorage.setItem("esga-messagerie-moi", JSON.stringify(moi)); } catch (e) {}
  }
  const estCoach = () => moi.profil === "coach";
  const monEnfant = () => (moi.profil || "").startsWith("p-") ? moi.profil.slice(2) : null;
  const joueur = (id) => etat.joueurs.find((j) => j.id === id) || { id, nom: "?" };
  const fem = () => /F/.test((moi.equipe || "").split("-")[0]);
  const e_ = () => (fem() ? "e" : "");
  const nomJ = () => (fem() ? "joueuse" : "joueur");
  const nomProfil = (p) => p === "coach" ? "Coach" : p && p.startsWith("p-") ? "Parent de " + joueur(p.slice(2)).nom : "?";

  /* ---------- équipes, match du week-end et séances ---------- */
  function equipeDe(m) { return `${m.categorie}-${m.equipe}`; }
  function nomEquipe(id) {
    const [cat, n] = [id.slice(0, id.lastIndexOf("-")), id.slice(id.lastIndexOf("-") + 1)];
    return `${cat} · équipe ${n}`;
  }
  function prochainMatch(equipe) {
    const auj = jourISO(new Date());
    const m = MATCHS.filter((x) => equipeDe(x) === equipe && x.date >= auj).sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure))[0];
    if (m) {
      const adv = m.a_domicile ? m.exterieur : m.domicile;
      return { id: m.numero, date: m.date, heure: m.heure, adversaire: adv.replace(/\s+\d+$/, ""), domicile: m.a_domicile, lieu: m.lieu.replace(/\s+à\s*$/, ""), competition: m.competition, format: /à\s*8/i.test(m.competition) ? 8 : 11 };
    }
    // Pas de match connu : un match fictif le samedi suivant
    const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    return { id: "demo-" + jourISO(d), date: jourISO(d), heure: "15:00", adversaire: "Adversaire à confirmer", domicile: true, lieu: "Stade Edmond Pouzet", competition: "Match amical", format: /U1[0-3]/.test(equipe) ? 8 : 11 };
  }
  function seances(equipe) {
    const senior = /Seniors|Vétérans|U20/.test(equipe);
    const heure = senior ? "19:30" : "18:30";
    const liste = [];
    const d = new Date(); d.setHours(12, 0, 0, 0);
    while (liste.length < 6) {
      if (d.getDay() === 2 || d.getDay() === 4) liste.push({ id: jourISO(d), date: jourISO(d), heure, lieu: d.getDay() === 2 ? "Stade Léon Garaud" : "Stade Edmond Pouzet" });
      d.setDate(d.getDate() + 1);
    }
    return liste;
  }
  const libSeance = (s) => `${maj1(fmtJour(s.date))} · ${s.heure.replace(":", "h")}`;

  /* ---------- état de l'équipe ---------- */
  function etatInitial(equipe) {
    const noms = /F/.test(equipe.split("-")[0]) ? PRENOMS_F : PRENOMS_G;
    const joueurs = noms.map((nom, i) => ({ id: "j" + (i + 1), nom }));
    const match = prochainMatch(equipe);
    const s = seances(equipe);
    const il = (h) => new Date(Date.now() - h * 3600e3).toISOString();
    const e = { version: 1, joueurs, messages: [], absences: [], appel: {}, sondage: { match: match.id, reponses: {} }, convocations: [] };
    e.messages.push({ id: uid(), type: "texte", auteur: "coach", date: il(50), texte: "Bonjour à tous ! Voici la messagerie de l'équipe. Les absences aux entraînements se déclarent dans l'onglet « Absences », et le sondage du match est dans « Match »." });
    e.messages.push({ id: uid(), type: "texte", auteur: "p-j3", date: il(26), texte: "Bonjour, l'entraînement est maintenu s'il pleut ?" });
    e.messages.push({ id: uid(), type: "texte", auteur: "coach", date: il(25), texte: "Oui, on s'entraîne sauf si le terrain est fermé par la mairie. Je préviens ici dans ce cas." });
    e.absences.push({ id: uid(), seance: s[0].id, joueur: "j5", motif: "Malade", precision: "Fièvre depuis hier", par: "p-j5", date: il(5) });
    e.messages.push({ id: uid(), type: "absence", auteur: "p-j5", date: il(5), joueur: "j5", seance: s[0].id, motif: "Malade" });
    e.messages.push({ id: uid(), type: "sondage", auteur: "coach", date: il(4), match: match.id });
    e.absences.push({ id: uid(), seance: s[0].id, joueur: "j9", motif: "École / devoirs", precision: "Contrôle de maths le lendemain", par: "p-j9", date: il(2) });
    e.messages.push({ id: uid(), type: "absence", auteur: "p-j9", date: il(2), joueur: "j9", seance: s[0].id, motif: "École / devoirs" });
    e.appel[s[0].id] = { j5: "absent" };
    const rep = { j1: "oui", j2: "oui", j3: "oui", j4: "non", j6: "oui", j7: "incertain", j8: "oui", j10: "oui", j11: "oui", j12: "oui", j13: "oui", j14: "oui", j15: "oui", j16: "oui", j5: "non" };
    Object.entries(rep).forEach(([j, r]) => (e.sondage.reponses[j] = { r, date: il(3) }));
    return e;
  }
  function charger() {
    etat = S.lire(moi.equipe) || etatInitial(moi.equipe);
    etat.appel = etat.appel || {};
    // Nouveau match : le sondage repart à zéro
    const match = prochainMatch(moi.equipe);
    if (etat.sondage.match !== match.id) etat.sondage = { match: match.id, reponses: {} };
    S.ecrire(moi.equipe, etat);
  }
  function sauver() { S.ecrire(moi.equipe, etat); rendre(); }
  function poster(msg) { etat.messages.push(Object.assign({ id: uid(), date: maintenant(), auteur: moi.profil }, msg)); }

  /* ---------- en-tête : équipe et profil ---------- */
  function rendreTete() {
    $("#choixEquipe").innerHTML = EQUIPES.map((e) => `<option value="${esc(e)}"${e === moi.equipe ? " selected" : ""}>${esc(nomEquipe(e))}</option>`).join("");
    $("#choixProfil").innerHTML = `<option value="coach">Le coach</option>` +
      `<optgroup label="Un parent">${etat.joueurs.map((j) => `<option value="p-${j.id}"${moi.profil === "p-" + j.id ? " selected" : ""}>Parent de ${esc(j.nom)}</option>`).join("")}</optgroup>`;
    $("#choixProfil").value = moi.profil;
    document.body.classList.toggle("coach", estCoach());
  }

  /* ---------- onglets ---------- */
  function rendre() {
    rendreTete();
    document.querySelectorAll(".onglet").forEach((b) => b.setAttribute("aria-selected", b.dataset.onglet === onglet));
    document.querySelectorAll(".vue").forEach((v) => (v.hidden = v.id !== "vue-" + onglet));
    if (onglet === "discussion") vus = etat.messages.length;
    const nouveaux = etat.messages.slice(vus).filter((m) => m.auteur !== moi.profil).length;
    const b = $("#badgeDiscussion"); b.textContent = nouveaux; b.hidden = !nouveaux;
    const conv = derniereConvocation();
    const bc = $("#badgeConvoc");
    bc.hidden = !(conv && monEnfant() && !conv.vus.includes(monEnfant()));
    rendreDiscussion(); rendreAbsences(); rendreMatch(); rendreConvocation();
  }

  /* ---------- discussion ---------- */
  function carteSysteme(m) {
    const match = prochainMatch(moi.equipe);
    if (m.type === "absence") {
      const s = seances(moi.equipe).find((x) => x.id === m.seance);
      const note = etat.appel[m.seance] && etat.appel[m.seance][m.joueur] === "absent";
      const action = estCoach() && s ? (note ? `<span class="note-ok">✓ Noté${e_()} absent${e_()}</span>` : `<button class="mini-btn" data-noter="${m.seance}|${m.joueur}">Noter absent${e_()}</button>`) : "";
      return `<div class="sys sys-absence"><span><b>${esc(joueur(m.joueur).nom)}</b> sera absent${e_()} à l'entraînement du ${esc(s ? libSeance(s) : fmtJour(m.seance))}<span class="motif">${esc(m.motif)}</span></span>${action}</div>`;
    }
    if (m.type === "sondage") {
      return `<div class="sys sys-sondage"><span><b>Sondage ouvert</b> : qui est disponible pour le match contre ${esc(match.adversaire)} (${esc(fmtJour(match.date, { weekday: "long", day: "numeric" }))}) ?</span><button class="lien" data-aller="match">Répondre ›</button></div>`;
    }
    if (m.type === "convocation") {
      const c = etat.convocations.find((x) => x.id === m.convoc);
      if (!c) return "";
      return `<div class="sys sys-convoc"><span><b>Convocation publiée</b> pour le match contre ${esc(c.adversaire)} : ${c.joueurs.length} convoqué${c.joueurs.length > 1 ? "s" : ""}, rendez-vous à ${esc(c.rdvHeure.replace(":", "h"))}.</span><button class="lien" data-aller="convocation">Voir ›</button></div>`;
    }
    if (m.type === "relance") {
      return `<div class="sys sys-sondage"><span><b>Rappel du coach</b> : pensez à répondre au sondage du match. Pas encore de réponse pour ${esc(m.noms.join(", "))}.</span><button class="lien" data-aller="match">Répondre ›</button></div>`;
    }
    return "";
  }
  function rendreDiscussion() {
    const fil = $("#fil");
    let html = "", jourPrec = "";
    etat.messages.forEach((m) => {
      const j = m.date.slice(0, 10);
      if (j !== jourPrec) { html += `<div class="jour"><span>${esc(maj1(fmtJour(m.date)))}</span></div>`; jourPrec = j; }
      const mien = m.auteur === moi.profil;
      if (m.type === "texte") {
        html += `<div class="msg${mien ? " mien" : ""}${m.auteur === "coach" ? " du-coach" : ""}">
          ${mien ? "" : `<div class="auteur">${esc(nomProfil(m.auteur))}</div>`}
          <div class="bulle">${esc(m.texte).replace(/\n/g, "<br>")}</div>
          <div class="heure">${fmtHeure(m.date)}</div></div>`;
      } else {
        html += `<div class="sys-ligne">${carteSysteme(m)}<div class="heure">${esc(nomProfil(m.auteur))} · ${fmtHeure(m.date)}</div></div>`;
      }
    });
    const enBas = fil.scrollHeight - fil.scrollTop - fil.clientHeight < 80;
    fil.innerHTML = html;
    if (enBas || fil.dataset.init !== moi.equipe) { fil.scrollTop = fil.scrollHeight; fil.dataset.init = moi.equipe; }
  }

  /* ---------- absences ---------- */
  function rendreAbsences() {
    const liste = seances(moi.equipe);
    const total = etat.joueurs.length;
    const enfant = monEnfant();
    let html = "";
    if (enfant) {
      const miennes = etat.absences.filter((a) => a.joueur === enfant && liste.some((s) => s.id === a.seance));
      html += `<section class="carte">
        <h2>Déclarer une absence de ${esc(joueur(enfant).nom)}</h2>
        <form id="formAbsence" class="form">
          <label>Entraînement<select name="seance">${liste.map((s) => `<option value="${s.id}"${miennes.some((a) => a.seance === s.id) ? " disabled" : ""}>${esc(libSeance(s))}${miennes.some((a) => a.seance === s.id) ? " (déjà déclaré)" : ""}</option>`).join("")}</select></label>
          <label>Motif<select name="motif">${MOTIFS.map((m) => `<option>${m}</option>`).join("")}</select></label>
          <label class="large">Précision pour le coach (facultatif)<input name="precision" maxlength="140" placeholder="Ex. : rendez-vous chez le médecin"></label>
          <button class="esga-btn esga-btn-primaire">Prévenir le coach</button>
        </form>
        ${miennes.length ? `<h3>Absences déjà déclarées</h3><ul class="liste">${miennes.map((a) => `<li><span><b>${esc(libSeance(liste.find((s) => s.id === a.seance)))}</b> · ${esc(a.motif)}${a.precision ? " · " + esc(a.precision) : ""}</span><button class="lien rouge" data-annuler-absence="${a.id}">Annuler</button></li>`).join("")}</ul>` : ""}
      </section>`;
    }
    html += `<section class="carte">
      <h2>${estCoach() ? "Absences aux prochains entraînements" : "Prochains entraînements"}</h2>
      <div class="seances">${liste.map((s) => {
        const abs = etat.absences.filter((a) => a.seance === s.id);
        const ap = etat.appel[s.id] || {};
        const nAbs = etat.joueurs.filter((j) => ap[j.id] === "absent" || (!ap[j.id] && abs.some((a) => a.joueur === j.id))).length;
        const aValider = abs.filter((a) => ap[a.joueur] !== "absent").length;
        return `<div class="seance">
          <div class="seance-tete"><div><b>${esc(libSeance(s))}</b><div class="discret">${esc(s.lieu)}</div></div>
            <div class="compte${nAbs ? " a-absents" : ""}">${total - nAbs}/${total}<small>attendu${e_()}s</small></div></div>
          ${estCoach() && nAbs ? `<div class="noms-abs">Absent${e_()}s : ${etat.joueurs.filter((j) => ap[j.id] === "absent" || (!ap[j.id] && abs.some((a) => a.joueur === j.id))).map((j) => esc(j.nom)).join(", ")}</div>` : ""}
          ${estCoach() && aValider ? `<div class="a-valider"><span>${aValider} absence${aValider > 1 ? "s" : ""} prévenue${aValider > 1 ? "s" : ""} à noter</span><button class="mini-btn" data-noter-tout="${s.id}">Tout noter</button></div>` : ""}
          ${estCoach() ? feuille(s, abs) : ""}
          ${!estCoach() && abs.length ? `<div class="discret petit">${abs.length} absence${abs.length > 1 ? "s" : ""} déclarée${abs.length > 1 ? "s" : ""}</div>` : ""}
        </div>`;
      }).join("")}</div>
    </section>`;
    $("#vue-absences").innerHTML = html;
  }

  // Feuille de présence du coach : un clic bascule présent / absent ; les absences prévenues sont signalées
  function feuille(s, abs) {
    const ap = etat.appel[s.id] || {};
    return `<details class="feuille"${abs.some((a) => ap[a.joueur] !== "absent") ? " open" : ""}><summary>Feuille de présence</summary><ul>${etat.joueurs.map((j) => {
      const a = abs.find((x) => x.joueur === j.id);
      const absent = ap[j.id] === "absent";
      return `<li class="${absent ? "est-absent" : ""}${a && !absent ? " prevenu" : ""}">
        <span class="nom">${esc(j.nom)}${a ? `<small>Prévenu : ${esc(a.motif)}${a.precision ? " · « " + esc(a.precision) + " »" : ""}</small>` : ""}</span>
        <button class="bascule ${absent ? "abs" : "pres"}" data-appel="${s.id}|${j.id}" title="Changer">${absent ? "Absent" + e_() : a ? "Noter absent" + e_() : "Présent" + e_()}</button></li>`;
    }).join("")}</ul></details>`;
  }

  /* ---------- sondage du match ---------- */
  function carteMatch(match) {
    return `<div class="match">
      <div class="match-date"><span>${esc(fmtJour(match.date, { weekday: "short" }))}</span><b>${esc(fmtJour(match.date, { day: "numeric" }))}</b><span>${esc(fmtJour(match.date, { month: "short" }))}</span></div>
      <div class="match-info">
        <p class="esga-kicker">${esc(match.competition)}</p>
        <div class="match-titre">${match.domicile ? `ESGA <span>contre</span> ${esc(match.adversaire)}` : `${esc(match.adversaire)} <span>contre</span> ESGA`}</div>
        <div class="discret">${esc(match.heure.replace(":", "h"))} · ${esc(match.lieu)} · ${match.domicile ? "à domicile" : "à l'extérieur"}</div>
      </div></div>`;
  }
  function rendreMatch() {
    const match = prochainMatch(moi.equipe);
    const rep = etat.sondage.reponses;
    const cpt = { oui: 0, incertain: 0, non: 0, aucune: 0 };
    etat.joueurs.forEach((j) => cpt[rep[j.id] ? rep[j.id].r : "aucune"]++);
    const total = etat.joueurs.length;
    const enfant = monEnfant();
    let html = `<section class="carte">${carteMatch(match)}
      <div class="jauge" title="Réponses au sondage">${["oui", "incertain", "non", "aucune"].map((k) => cpt[k] ? `<span class="j-${k}" style="flex:${cpt[k]}"></span>` : "").join("")}</div>
      <div class="legende"><span><i class="j-oui"></i>${cpt.oui} présent${cpt.oui > 1 ? "s" : ""}</span><span><i class="j-incertain"></i>${cpt.incertain} incertain${cpt.incertain > 1 ? "s" : ""}</span><span><i class="j-non"></i>${cpt.non} absent${cpt.non > 1 ? "s" : ""}</span><span><i class="j-aucune"></i>${cpt.aucune} sans réponse</span></div>`;
    if (enfant) {
      const r = rep[enfant] && rep[enfant].r;
      html += `<h3>${esc(joueur(enfant).nom)} sera-t-${fem() ? "elle" : "il"} disponible ?</h3>
        <div class="choix3">${Object.entries(REPONSES).map(([k, lib]) => `<button class="rep rep-${k}${r === k ? " choisi" : ""}" data-repondre="${k}">${lib}</button>`).join("")}</div>`;
    }
    html += `</section>`;
    html += `<section class="carte"><div class="carte-tete"><h2>Réponses de l'équipe</h2>
      <span class="outils">${estCoach() && cpt.aucune ? `<button class="esga-btn" id="btnRelancer">Relancer les ${cpt.aucune} sans réponse</button>` : ""}
      ${estCoach() ? `<button class="esga-btn esga-btn-or" data-aller="convocation">Faire la compo et la convoc ›</button>` : ""}</span></div>
      ${estCoach() ? `<p class="discret petit">Touchez une réponse pour la changer (si un parent vous a répondu de vive voix).</p>` : ""}
      <ul class="reponses">${etat.joueurs.map((j) => {
        const r = rep[j.id] && rep[j.id].r;
        return `<li><span class="nom">${esc(j.nom)}</span>${estCoach()
          ? `<span class="mini">${Object.keys(REPONSES).map((k) => `<button class="pastille p-${k}${r === k ? " choisi" : ""}" data-pour="${j.id}" data-repondre="${k}" title="${REPONSES[k]}">${REPONSES[k]}</button>`).join("")}</span>`
          : `<span class="etiquette e-${r || "aucune"}">${r ? REPONSES[r] : "Pas de réponse"}</span>`}</li>`;
      }).join("")}</ul></section>`;
    $("#vue-match").innerHTML = html;
  }

  /* ---------- compo et convocation ---------- */
  let brouillon = null; // convocation en cours d'écriture par le coach (dans cet onglet)
  function derniereConvocation() {
    const match = prochainMatch(moi.equipe);
    return etat.convocations.filter((c) => c.match === match.id).slice(-1)[0] || null;
  }
  function moinsMinutes(h, min) {
    const [a, b] = h.split(":").map(Number);
    const t = (a * 60 + b - min + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }
  // Places sur le terrain (en %, gardien en bas) pour un système comme « 4-3-3 »
  function places(formation) {
    const lignes = formation.split("-").map(Number), L = lignes.length;
    const res = [{ x: 50, y: 90, lib: "G" }];
    lignes.forEach((n, li) => {
      const y = 72 - li * (54 / Math.max(L - 1, 1));
      const lib = li === 0 ? "DEF" : li === L - 1 ? "ATT" : L === 4 ? (li === 1 ? "MDF" : "MOC") : "MIL";
      for (let i = 0; i < n; i++) res.push({ x: ((i + 1) / (n + 1)) * 100, y, lib });
    });
    return res;
  }
  const remplacants = (c) => c.joueurs.filter((id) => !(c.postes || []).includes(id));
  function terrain(c, edition) {
    const pl = places(c.formation);
    const enfant = monEnfant();
    return `<div class="terrain${edition ? " edition" : ""}"><div class="lignes"><i class="rond"></i><i class="surface haut"></i><i class="surface bas"></i><i class="milieu"></i></div>
      ${pl.map((p, i) => {
        const id = c.postes[i];
        const contenu = edition
          ? `<select data-poste="${i}" aria-label="Poste ${p.lib}"><option value="">${p.lib}</option>${c.joueurs.map((j) => `<option value="${j}"${j === id ? " selected" : ""}>${esc(joueur(j).nom)}</option>`).join("")}</select>`
          : `<span>${id ? esc(joueur(id).nom) : "?"}</span>`;
        return `<div class="poste${id ? "" : " libre"}${id && id === enfant ? " moi" : ""}" style="left:${p.x}%;top:${p.y}%"><b>${p.lib}</b>${contenu}</div>`;
      }).join("")}</div>`;
  }
  function texteConvocation(c) {
    const noms = (ids) => ids.map((id) => joueur(id).nom).join(", ");
    let compo = "";
    if (c.postes && c.postes.some(Boolean)) {
      const pl = places(c.formation), groupes = [];
      pl.forEach((p, i) => { if (!c.postes[i]) return; const g = groupes.find((x) => x.lib === p.lib); g ? g.ids.push(c.postes[i]) : groupes.push({ lib: p.lib, ids: [c.postes[i]] }); });
      compo = `\nComposition (${c.formation}) :\n` + groupes.map((g) => `${g.lib} : ${noms(g.ids)}`).join("\n") +
        (remplacants(c).length ? `\nRemplaçant${e_()}s : ${noms(remplacants(c))}` : "") + "\n";
    }
    return `⚽ CONVOCATION ESGA · ${nomEquipe(moi.equipe)}\n` +
      `${maj1(fmtJour(c.date))} · coup d'envoi ${c.heure.replace(":", "h")}\n` +
      `${c.domicile ? "ESGA – " + c.adversaire : c.adversaire + " – ESGA"} (${c.lieu})\n\n` +
      `Rendez-vous : ${c.rdvHeure.replace(":", "h")} · ${c.rdvLieu}\n` +
      `Tenue : ${c.tenue}\n\n` +
      `Convoqué${e_()}s (${c.joueurs.length}) : ${noms(c.joueurs)}\n` + compo +
      (c.mot ? `\n${c.mot}\n` : "");
  }
  function nouveauBrouillon() {
    const match = prochainMatch(moi.equipe), conv = derniereConvocation(), rep = etat.sondage.reponses;
    if (conv) return JSON.parse(JSON.stringify({ joueurs: conv.joueurs, formation: conv.formation, postes: conv.postes, rdvHeure: conv.rdvHeure, rdvLieu: conv.rdvLieu, tenue: conv.tenue, mot: conv.mot }));
    const formation = FORMATIONS[match.format][match.format === 11 ? 1 : 0];
    const b = { joueurs: etat.joueurs.filter((j) => rep[j.id] && rep[j.id].r === "oui").map((j) => j.id), formation, postes: places(formation).map(() => null),
      rdvHeure: moinsMinutes(match.heure, match.domicile ? 60 : 90),
      rdvLieu: match.domicile ? match.lieu + ", vestiaires" : "Parking du stade Léon Garaud (covoiturage)",
      tenue: "Tenue du club, protège-tibias, gourde, k-way", mot: "" };
    remplirAuto(b);
    return b;
  }
  function remplirAuto(b) {
    const libres = b.joueurs.filter((j) => !b.postes.includes(j));
    b.postes = b.postes.map((p) => p || libres.shift() || null);
  }
  function rendreConvocation() {
    const match = prochainMatch(moi.equipe);
    const conv = derniereConvocation();
    const el = $("#vue-convocation");
    const enfant = monEnfant();
    const rep = etat.sondage.reponses;
    if (!estCoach()) brouillon = null;
    if (estCoach() && !conv && !brouillon) brouillon = nouveauBrouillon();
    let html = "";
    if (conv && !brouillon) {
      const vus = conv.vus.length, attendus = etat.joueurs.length;
      const retenu = enfant && conv.joueurs.includes(enfant);
      const titulaire = enfant && (conv.postes || []).includes(enfant);
      const nonRetenus = etat.joueurs.filter((j) => !conv.joueurs.includes(j.id));
      html += `<section class="carte convoc">
        <div class="convoc-tete"><p class="esga-kicker">Convocation · ${esc(nomEquipe(moi.equipe))}</p><span class="discret petit">publiée le ${esc(fmtJour(conv.publiee, { day: "numeric", month: "long" }))} à ${fmtHeure(conv.publiee)}</span></div>
        ${carteMatch(match)}
        ${enfant ? `<div class="verdict ${retenu ? "ok" : "non"}">${retenu ? `<b>${esc(joueur(enfant).nom)} est convoqué${e_()}</b>${conv.postes && conv.postes.some(Boolean) ? (titulaire ? " et commence le match." : ", sur le banc au coup d'envoi.") : "."}` : `<b>${esc(joueur(enfant).nom)} n'est pas retenu${e_()} pour ce match.</b> Il y en aura d'autres !`}</div>` : ""}
        <dl class="rdv">
          <div><dt>Rendez-vous</dt><dd><b>${esc(conv.rdvHeure.replace(":", "h"))}</b> · ${esc(conv.rdvLieu)}</dd></div>
          <div><dt>Tenue</dt><dd>${esc(conv.tenue)}</dd></div>
          ${conv.mot ? `<div><dt>Mot du coach</dt><dd>${esc(conv.mot)}</dd></div>` : ""}
        </dl>
        ${conv.postes && conv.postes.some(Boolean) ? `<h3>Composition · ${esc(conv.formation)}</h3>${terrain(conv, false)}
          ${remplacants(conv).length ? `<p class="banc"><b>Remplaçant${e_()}s :</b> ${remplacants(conv).map((id) => `<span class="${id === enfant ? "moi" : ""}">${esc(joueur(id).nom)}</span>`).join(", ")}</p>` : ""}` : ""}
        <h3>Convoqué${e_()}s (${conv.joueurs.length})</h3>
        <ul class="convoques">${conv.joueurs.map((id) => `<li class="${id === enfant ? "moi" : ""}">${esc(joueur(id).nom)}${estCoach() && conv.vus.includes(id) ? ' <span class="lu" title="Lu par la famille">✓ lu</span>' : ""}</li>`).join("")}</ul>
        ${estCoach() && nonRetenus.length ? `<p class="discret petit">Non retenu${e_()}s : ${nonRetenus.map((j) => esc(j.nom)).join(", ")}</p>` : ""}
        <div class="actions">
          ${enfant ? (conv.vus.includes(enfant) ? `<span class="discret">✓ Vous avez confirmé la lecture</span>` : `<button class="esga-btn esga-btn-primaire" id="btnLu">J'ai bien lu</button>`) : ""}
          ${estCoach() ? `<span class="discret">Lue par ${vus} famille${vus > 1 ? "s" : ""} sur ${attendus}</span><span class="espace"></span><button class="esga-btn" id="btnModifierConvoc">Modifier</button>` : ""}
          ${estCoach() ? `<button class="esga-btn esga-btn-or" id="btnDiffuser" title="WhatsApp, SMS, mail…">Diffuser</button>` : `<button class="esga-btn" id="btnCopier">Copier le texte</button>`}
        </div>
      </section>`;
    } else if (estCoach()) {
      const b = brouillon;
      const cpt = { oui: 0, incertain: 0, non: 0, aucune: 0 };
      etat.joueurs.forEach((j) => cpt[rep[j.id] ? rep[j.id].r : "aucune"]++);
      html += `<section class="carte">
        <h2>${conv ? "Modifier la convocation" : "Compo et convocation"}</h2>
        ${carteMatch(match)}
        <p class="resume-sondage">Sondage : <b>${cpt.oui}</b> présent${e_()}s, <b>${cpt.incertain}</b> incertain${e_()}s, <b>${cpt.non}</b> absent${e_()}s, <b>${cpt.aucune}</b> sans réponse.</p>
        <form id="formConvoc" class="form">
          <fieldset class="large"><legend>1. Convoqué${e_()}s <span class="discret">(${b.joueurs.length})</span></legend>
            <p class="discret petit">Les « Présent » du sondage sont déjà cochés.</p>
            <div class="cases">${etat.joueurs.map((j) => {
              const r = rep[j.id] && rep[j.id].r;
              return `<label class="case"><input type="checkbox" name="j" value="${j.id}"${b.joueurs.includes(j.id) ? " checked" : ""}><span>${esc(j.nom)}</span><span class="etiquette e-${r || "aucune"}">${r ? REPONSES[r] : "?"}</span></label>`;
            }).join("")}</div>
          </fieldset>
          <fieldset class="large"><legend>2. Composition</legend>
            <div class="compo-outils">
              <label class="ligne">Système <select id="choixFormation">${[...FORMATIONS[11].map((f) => [f, "à 11"]), ...FORMATIONS[8].map((f) => [f, "à 8"])].map(([f, t]) => `<option value="${f}"${f === b.formation ? " selected" : ""}>${f} (${t})</option>`).join("")}</select></label>
              <button type="button" class="esga-btn" id="btnAuto">Placer les convoqué${e_()}s</button>
              <button type="button" class="esga-btn" id="btnVider">Vider</button>
            </div>
            <p class="discret petit">Choisissez ${fem() ? "la joueuse" : "le joueur"} de chaque poste. Les convoqué${e_()}s non placé${e_()}s sont remplaçant${e_()}s.</p>
            ${terrain(b, true)}
            <p class="banc"><b>Remplaçant${e_()}s :</b> ${remplacants(b).map((id) => esc(joueur(id).nom)).join(", ") || "aucun" + (fem() ? "e" : "")}</p>
          </fieldset>
          <fieldset class="large grille2"><legend>3. Rendez-vous</legend>
            <label>Heure<input type="time" name="rdvHeure" required value="${esc(b.rdvHeure)}"></label>
            <label>Lieu<input name="rdvLieu" required value="${esc(b.rdvLieu)}"></label>
            <label class="large">Tenue et affaires<input name="tenue" value="${esc(b.tenue)}"></label>
            <label class="large">Mot du coach (facultatif)<textarea name="mot" rows="2" placeholder="Ex. : prévenez-moi au plus vite en cas d'empêchement.">${esc(b.mot)}</textarea></label>
          </fieldset>
          <div class="actions large">
            <button class="esga-btn esga-btn-or">${conv ? "Republier et prévenir les familles" : "Publier et prévenir les familles"}</button>
            ${conv ? `<button type="button" class="esga-btn" id="btnAnnulerEdition">Annuler</button>` : ""}
          </div>
        </form></section>`;
    } else {
      html += `<section class="carte vide">${carteMatch(match)}<p>La convocation n'est pas encore publiée. Vous serez prévenu dans la discussion dès que le coach l'aura faite.</p>
        <button class="esga-btn" data-aller="match">Répondre au sondage ›</button></section>`;
    }
    // Ne pas reconstruire le formulaire pendant que le coach écrit dedans (mise à jour venue d'un autre onglet)
    if (el.contains(document.activeElement) && document.activeElement.matches("input:not([type=checkbox]), textarea")) return;
    el.innerHTML = html;
  }
  function lireChampsBrouillon() {
    const f = $("#formConvoc"); if (!f || !brouillon) return;
    ["rdvHeure", "rdvLieu", "tenue", "mot"].forEach((k) => (brouillon[k] = f.elements[k].value));
  }

  /* ---------- actions ---------- */
  function toast(t) {
    const el = $("#toast"); el.textContent = t; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2600);
  }
  function copier(t) {
    const ok = () => toast("Texte copié : collez-le dans WhatsApp ou un SMS.");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, () => secours());
    else secours();
    function secours() { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); ok(); } catch (e) {} a.remove(); }
  }
  // Partage natif sur téléphone (WhatsApp, SMS…), sinon copie du texte
  function diffuser(t) {
    if (navigator.share) navigator.share({ title: "Convocation ESGA", text: t }).catch(() => {});
    else copier(t);
  }
  function aller(o) { onglet = o; rendre(); window.scrollTo(0, 0); if (o === "discussion") $("#saisie").focus(); }

  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("button, [data-aller]");
    if (!t) return;
    if (t.classList.contains("onglet")) return aller(t.dataset.onglet);
    if (t.dataset.aller) return aller(t.dataset.aller);
    if (t.dataset.repondre) {
      const j = t.dataset.pour || monEnfant();
      if (!j) return;
      const ancien = etat.sondage.reponses[j];
      if (estCoach() && ancien && ancien.r === t.dataset.repondre) delete etat.sondage.reponses[j];
      else etat.sondage.reponses[j] = { r: t.dataset.repondre, date: maintenant(), par: moi.profil };
      if (!estCoach()) toast("Réponse envoyée au coach.");
      return sauver();
    }
    if (t.dataset.noter) {
      const [sid, jid] = t.dataset.noter.split("|");
      (etat.appel[sid] = etat.appel[sid] || {})[jid] = "absent";
      toast(`${joueur(jid).nom} noté${e_()} absent${e_()}.`);
      return sauver();
    }
    if (t.dataset.noterTout) {
      const sid = t.dataset.noterTout, ap = (etat.appel[sid] = etat.appel[sid] || {});
      etat.absences.filter((a) => a.seance === sid).forEach((a) => (ap[a.joueur] = "absent"));
      return sauver();
    }
    if (t.dataset.appel) {
      const [sid, jid] = t.dataset.appel.split("|"), ap = (etat.appel[sid] = etat.appel[sid] || {});
      ap[jid] = ap[jid] === "absent" ? "present" : "absent";
      return sauver();
    }
    if (t.dataset.annulerAbsence) {
      const a = etat.absences.find((x) => x.id === t.dataset.annulerAbsence);
      etat.absences = etat.absences.filter((x) => x !== a);
      if (a && etat.appel[a.seance]) delete etat.appel[a.seance][a.joueur];
      if (a) poster({ type: "texte", texte: `Finalement, ${joueur(a.joueur).nom} sera bien là à l'entraînement du ${libSeance(seances(moi.equipe).find((s) => s.id === a.seance) || { date: a.seance, heure: "" })}.` });
      return sauver();
    }
    if (t.id === "btnRelancer") {
      const noms = etat.joueurs.filter((j) => !etat.sondage.reponses[j.id]).map((j) => j.nom);
      poster({ type: "relance", noms });
      toast("Rappel envoyé dans la discussion.");
      return sauver();
    }
    if (t.id === "btnLu") {
      const c = derniereConvocation();
      if (c && !c.vus.includes(monEnfant())) c.vus.push(monEnfant());
      return sauver();
    }
    if (t.id === "btnCopier") return copier(texteConvocation(derniereConvocation()));
    if (t.id === "btnDiffuser") return diffuser(texteConvocation(derniereConvocation()));
    if (t.id === "btnModifierConvoc") { brouillon = nouveauBrouillon(); return rendre(); }
    if (t.id === "btnAnnulerEdition") { brouillon = null; return rendre(); }
    if (t.id === "btnAuto" && brouillon) { lireChampsBrouillon(); remplirAuto(brouillon); return rendre(); }
    if (t.id === "btnVider" && brouillon) { lireChampsBrouillon(); brouillon.postes = brouillon.postes.map(() => null); return rendre(); }
    if (t.id === "btnReinitialiser") {
      S.effacer(moi.equipe); charger(); vus = 0; brouillon = null;
      toast("Démo remise à zéro pour cette équipe.");
      return rendre();
    }
  });

  document.addEventListener("change", (ev) => {
    if (ev.target.id === "choixEquipe") {
      moi.equipe = ev.target.value; moi.profil = "coach"; ecrireMoi(); charger(); vus = 0; rendre();
    } else if (ev.target.id === "choixProfil") {
      moi.profil = ev.target.value; ecrireMoi(); vus = etat.messages.length;
      brouillon = null; rendre();
    } else if (brouillon && ev.target.name === "j") {
      lireChampsBrouillon();
      const id = ev.target.value;
      if (ev.target.checked) brouillon.joueurs = etat.joueurs.map((j) => j.id).filter((x) => x === id || brouillon.joueurs.includes(x));
      else { brouillon.joueurs = brouillon.joueurs.filter((x) => x !== id); brouillon.postes = brouillon.postes.map((p) => (p === id ? null : p)); }
      rendre();
    } else if (brouillon && ev.target.id === "choixFormation") {
      lireChampsBrouillon();
      const anciens = brouillon.postes.filter(Boolean);
      brouillon.formation = ev.target.value;
      brouillon.postes = places(brouillon.formation).map((_, i) => anciens[i] || null);
      remplirAuto(brouillon); rendre();
    } else if (brouillon && ev.target.dataset.poste != null) {
      lireChampsBrouillon();
      const i = +ev.target.dataset.poste, id = ev.target.value || null, avant = brouillon.postes[i];
      const ailleurs = id ? brouillon.postes.indexOf(id) : -1;
      if (ailleurs >= 0 && ailleurs !== i) brouillon.postes[ailleurs] = avant; // échange des deux postes
      brouillon.postes[i] = id;
      rendre();
    }
  });

  document.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const f = ev.target, d = new FormData(f);
    if (f.id === "formEnvoi") {
      const texte = $("#saisie").value.trim();
      if (!texte) return;
      poster({ type: "texte", texte });
      $("#saisie").value = ""; ajusterSaisie();
      vus = etat.messages.length;
      return sauver();
    }
    if (f.id === "formAbsence") {
      const a = { id: uid(), seance: d.get("seance"), joueur: monEnfant(), motif: d.get("motif"), precision: (d.get("precision") || "").trim(), par: moi.profil, date: maintenant() };
      if (!a.seance) return;
      etat.absences.push(a);
      poster({ type: "absence", joueur: a.joueur, seance: a.seance, motif: a.motif });
      toast("Le coach est prévenu.");
      return sauver();
    }
    if (f.id === "formConvoc") {
      lireChampsBrouillon();
      const b = brouillon;
      if (!b.joueurs.length) return toast(`Cochez au moins un${e_()} ${nomJ()}.`);
      const match = prochainMatch(moi.equipe);
      const ancienne = derniereConvocation();
      const c = { id: uid(), match: match.id, date: match.date, heure: match.heure, adversaire: match.adversaire, domicile: match.domicile, lieu: match.lieu,
        joueurs: b.joueurs.slice(), formation: b.formation, postes: b.postes.slice(), rdvHeure: b.rdvHeure, rdvLieu: b.rdvLieu.trim(), tenue: b.tenue.trim(), mot: b.mot.trim(), publiee: maintenant(),
        // Une famille qui avait lu garde son « lu » seulement si son enfant reste dans le même cas
        vus: ancienne ? ancienne.vus.filter((id) => ancienne.joueurs.includes(id) === b.joueurs.includes(id)) : [] };
      etat.convocations.push(c);
      poster({ type: "convocation", convoc: c.id });
      brouillon = null;
      toast(ancienne ? "Convocation mise à jour, les familles sont prévenues." : "Convocation publiée : les familles sont prévenues dans la discussion.");
      return sauver();
    }
  });

  // Entrée envoie, Maj+Entrée va à la ligne
  function ajusterSaisie() { const s = $("#saisie"); s.style.height = "auto"; s.style.height = Math.min(s.scrollHeight, 140) + "px"; }
  $("#saisie").addEventListener("input", ajusterSaisie);
  $("#saisie").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); $("#formEnvoi").requestSubmit(); }
  });

  // Un autre onglet a écrit : on relit
  S.surChangement((equipe) => { if (equipe === moi.equipe) { etat = S.lire(equipe) || etat; etat.appel = etat.appel || {}; rendre(); } });

  /* ---------- démarrage ---------- */
  fetch("../data/matchs.json").then((r) => r.json()).catch(() => []).then((m) => {
    MATCHS = Array.isArray(m) ? m : [];
    EQUIPES = [...new Set(MATCHS.map(equipeDe))].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
    if (!EQUIPES.length) EQUIPES = ["U15F-2"];
    if (!EQUIPES.includes(moi.equipe)) moi.equipe = EQUIPES.includes("U15F-2") ? "U15F-2" : EQUIPES[0];
    if (!moi.profil) moi.profil = "coach";
    ecrireMoi();
    charger();
    if (!etat.joueurs.some((j) => "p-" + j.id === moi.profil)) { if (moi.profil !== "coach") { moi.profil = "coach"; ecrireMoi(); } }
    rendre();
    document.body.classList.remove("chargement");
  });
})();
