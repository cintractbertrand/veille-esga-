(() => {
  const $ = (s) => document.querySelector(s);
  const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const MOIS_C = ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
  const JOURS = ["lun","mar","mer","jeu","ven","sam","dim"];
  const JOURS_L = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
  const GRAV_ORDRE = { urgent: 0, attention: 1, info: 2 };
  // équipes du club, toujours affichées en haut même sans mention dans les PV
  const CATS_CLUB = ["Club","Seniors","Seniors F","U20","U18F","U17","U15","U15F","U13","U13F","U11","U9","U7","Vétérans"];
  const CAT_ORDRE = ["Club","Seniors","Seniors F","U18F","U20","U19","U18","U17","U16","U15","U15F","U14","U13","U13F","U12","U11","U10","U9","U9F","U8","U7","Futsal","Vétérans","Foot loisir"];

  const parseD = (s) => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
  const isoD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const fmtD = (s) => { const d = parseD(s); return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const today = new Date(); today.setHours(0,0,0,0);
  const joursAvant = (s) => Math.round((parseD(s) - today) / 86400000);

  let data, all = [], pvById = {}, matchs = [], dossiers = [], sommaire = {};
  let calMonth, catActive = null, query = "";
  // préférences de l'utilisateur, gardées sur son appareil (rien n'est envoyé)
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const traites = new Set(store.get("esga-pv-traites", []));
  let favoris = store.get("esga-pv-favoris", []);
  let nouveauxPv = new Set();
  const aTraiter = (i) => i.gravite !== "info" || (i.echeances || []).some((e) => joursAvant(e.date) >= 0);

  // matchs.json et dossiers.json sont facultatifs : le site fonctionne sans eux
  const charger = (f) => fetch(f, { cache: "no-store" }).then((r) => r.ok ? r.json() : []).catch(() => []);
  fetch("data/pv.json", { cache: "no-store" })
    .then((r) => r.json())
    .then(async (j) => {
      data = j;
      let so;
      [matchs, dossiers, so] = await Promise.all([charger("data/matchs.json"), charger("data/dossiers.json"), charger("data/sommaire.json")]);
      if (Array.isArray(so)) so.forEach((e) => { sommaire[e.pv] = e.rubriques || e.commissions || []; });
      if (!Array.isArray(matchs)) matchs = [];
      if (!Array.isArray(dossiers)) dossiers = [];
      matchs.sort((a, b) => a.date.localeCompare(b.date) || (a.heure || "").localeCompare(b.heure || ""));
      init();
    })
    .catch(() => { $("#pv-courant").textContent = "Impossible de charger les données."; });

  function init() {
    data.pvs.sort((a, b) => b.date.localeCompare(a.date));
    data.pvs.forEach((pv) => {
      pvById[pv.numero] = pv;
      pv.items.forEach((it) => all.push({ ...it, pv: pv.numero, pvDate: pv.date, pvUrl: pv.url }));
    });
    const last = data.pvs[0];
    // une fiche urgente d'un ancien PV dont toutes les échéances sont passées n'est plus urgente
    all.forEach((i) => {
      if (i.gravite === "urgent" && i.pv !== (last && last.numero) && (i.echeances || []).every((e) => joursAvant(e.date) < 0)) i.gravite = "attention";
    });
    const vu = store.get("esga-pv-dernier", null);
    if (vu != null) nouveauxPv = new Set(data.pvs.filter((p) => p.numero > vu).map((p) => p.numero));
    if (last) store.set("esga-pv-dernier", last.numero);
    $("#club-nom").textContent = data.club.nom;
    $("#pv-courant").innerHTML = last
      ? `Dernier PV : <a href="${esc(last.url)}" target="_blank" rel="noopener">n°${last.numero} du ${fmtD(last.date)}</a> · club n°${esc(data.club.numero)}`
      : "Aucun PV pour l'instant.";
    calMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderStats(last);
    renderSemaine(last);
    renderCal();
    renderChips();
    renderTimeline();
    renderLecteur();
    bindTabs();
  }

  function renderStats(last) {
    const items = last ? last.items : [];
    const n = (g) => items.filter((i) => i.gravite === g).length;
    const avenir = all.flatMap((i) => i.echeances || []).filter((e) => joursAvant(e.date) >= 0).length;
    $("#stats").innerHTML = [
      [items.length, "mentions cette semaine", "mentions"],
      [all.filter((i) => i.gravite === "urgent").length, "urgentes", "urgentes"],
      [avenir, "échéances à venir", "echeances"],
      [data.pvs.length, "PV suivis", "pv"],
    ].map(([v, l, g]) => `<button class="stat" data-go="${g}"><b>${v}</b><span>${l}</span></button>`).join("");
    $("#stats").querySelectorAll(".stat").forEach((b) => b.onclick = () => {
      const g = b.dataset.go;
      if (g === "mentions") { showTab("semaine"); scrollTo$("#items-semaine"); }
      if (g === "echeances") { showTab("semaine"); scrollTo$("#a-venir"); }
      if (g === "pv") showTab("historique");
      if (g === "urgentes") ouvrirEquipe("Urgentes");
    });
  }

  function scrollTo$(sel) {
    const el = typeof sel === "string" ? $(sel) : sel;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - (($(".barre") || {}).offsetHeight || 0) - 12;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  // ouvre la fiche dans la vue de son équipe et la met en évidence
  function ouvrirFiche(id) {
    const it = all.find((i) => i.id === id);
    if (!it) return;
    ouvrirEquipe(it.categorie, false);
    const el = $(`#items-cat [data-fiche="${CSS.escape(id)}"]`);
    if (el) { scrollTo$(el); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2000); }
  }

  function showPanel(id) {
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + id));
  }

  function showTab(t) {
    catActive = null;
    renderChips();
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
    showPanel(t);
    history.replaceState(null, "", "#" + t);
    if (t === "lecteur") lectRafraichir();
  }

  // vue d'une équipe (catégorie) ou des urgences, ouverte depuis la barre du haut
  function ouvrirEquipe(c, remonter = true) {
    if (c !== catActive) eqNum = null;
    catActive = c; query = ""; $("#recherche").value = "";
    renderChips(); renderEquipe();
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    showPanel("equipe");
    history.replaceState(null, "", "#equipe/" + encodeURIComponent(c));
    if (remonter) window.scrollTo({ top: Math.min(window.scrollY, $(".barre").offsetTop), behavior: "smooth" });
  }

  function itemHTML(it, showPv) {
    const m = it.match;
    const match = m ? `<p class="match">⚽ <b>${esc(m.domicile)}</b> – <b>${esc(m.exterieur)}</b> · ${esc(m.competition || "")}${m.date ? " · " + fmtD(m.date) : ""}${m.numero ? " · match n°" + esc(m.numero) : ""}</p>` : "";
    const ech = (it.echeances || []).map((e) => `<span class="badge ${joursAvant(e.date) >= 0 && joursAvant(e.date) <= 7 ? "urgent" : ""}">📅 ${fmtD(e.date)}${e.heure ? " " + e.heure.replace(":", "h") : ""}</span>`).join("");
    const fait = traites.has(it.id);
    return `<article class="item ${esc(it.gravite)}${fait ? " traite" : ""}" data-fiche="${esc(it.id)}">
      <div class="meta">${nouveauxPv.has(it.pv) ? '<span class="badge nouveau">Nouveau</span>' : ""}${fait ? '<span class="badge fait">✓ Traité</span>' : ""}<span class="badge cat">${esc(it.categorie)}</span><span class="badge">${esc(it.commission)}</span>${it.gravite !== "info" ? `<span class="badge ${esc(it.gravite)}">${it.gravite === "urgent" ? "Urgent" : "À surveiller"}</span>` : ""}${ech}</div>
      <h3>${esc(it.titre)}</h3>
      ${match}
      <p>${esc(it.detail)}</p>
      ${it.page ? `<button class="btn-extrait" type="button" aria-expanded="false">Voir l'extrait du PV ▾</button><div class="extrait" hidden></div>` : ""}
      <div class="actions">
        ${aTraiter(it) || fait ? `<button class="act act-fait" type="button" data-act="traite" aria-pressed="${fait}">${fait ? "↺ Remettre à traiter" : "✓ Marquer comme traité"}</button>` : ""}
        <button class="act" type="button" data-act="partager" title="Envoyer cette fiche à un coach ou un dirigeant">↗ Partager</button>
        ${(it.echeances || []).some((e) => joursAvant(e.date) >= 0) ? `<button class="act" type="button" data-act="agenda" title="Ajouter les dates de cette fiche à mon agenda">📅 Agenda</button>` : ""}
      </div>
      <p class="src">Source : <a href="${esc(it.pvUrl)}${it.page ? "#page=" + it.page : ""}" class="lire" data-pv="${it.pv}" data-page="${it.page || 1}">PV n°${it.pv}${it.page ? ", page " + it.page : ""}</a>${showPv ? " du " + fmtD(it.pvDate) : ""} · <a href="${esc(it.pvUrl)}" target="_blank" rel="noopener">PDF ↗</a></p>
    </article>`;
  }

  const sortItems = (a, b) => (traites.has(a.id) - traites.has(b.id)) || (GRAV_ORDRE[a.gravite] - GRAV_ORDRE[b.gravite]) || b.pvDate.localeCompare(a.pvDate);

  function renderSemaine(last) {
    if (!last) return;
    $("#resume").innerHTML = `<strong>En bref, PV n°${last.numero} :</strong> ${esc(last.resume)}`;
    const items = all.filter((i) => i.pv === last.numero).sort(sortItems);
    $("#semaine-note").textContent = `PV n°${last.numero} du ${fmtD(last.date)} · ${items.length} fiche${items.length > 1 ? "s" : ""}`;
    $("#items-semaine").innerHTML = items.map((i) => itemHTML(i)).join("") || `<p class="empty">Aucune mention du club cette semaine 🎉</p>`;
    renderBord(items);
    const ev = prochaines(all).filter((e) => !traites.has(e.it.id));
    const mw = matchs.filter((m) => joursAvant(m.date) >= 0 && joursAvant(m.date) <= 7);
    $("#matchs-semaine").innerHTML = matchsHTML(mw.slice(0, 8), true) + (mw.length > 8 ? `<li class="empty">… et ${mw.length - 8} autres matchs</li>` : "");
    $("#matchs-semaine-bloc").hidden = !matchs.length;
    $("#a-venir").innerHTML = echeancesHTML(ev.slice(0, 5)) + (ev.length > 5 ? `<li class="plus"><details><summary>Voir les ${ev.length - 5} autres échéances</summary><ul class="echeances">${echeancesHTML(ev.slice(5))}</ul></details></li>` : "");
    $("#a-venir").querySelectorAll("[data-id]").forEach((li) => li.onclick = () => ouvrirFiche(li.dataset.id));
  }

  function prochaines(items) {
    return items.flatMap((i) => (i.echeances || []).map((e) => ({ ...e, it: i })))
      .filter((e) => joursAvant(e.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.heure || "").localeCompare(b.heure || ""));
  }

  const hm = (h) => h ? h.replace(":", "h") : "";
  const estGenas = (n) => /genas/i.test(n || "");
  function matchsHTML(ms, avecCat) {
    return ms.map((m) => {
      const d = parseD(m.date), j = joursAvant(m.date);
      const adv = m.a_domicile ? m.exterieur : m.domicile;
      const eq = (m.a_domicile ? m.domicile : m.exterieur).replace(/^.*?genas azieu\s*/i, "");
      return `<li class="echeance match ${j < 0 ? "passe" : ""}"><div class="date-pill"><b>${d.getDate()}</b><span>${MOIS_C[d.getMonth()]}</span></div>
        <div class="txt"><strong>${m.a_domicile ? "🏠" : "🚌"} ${avecCat ? esc(m.categorie) + (eq ? " " + esc(eq) : "") + " · " : ""}${m.a_domicile ? "reçoit" : "à"} ${esc(adv)}</strong><br>
        <small>${esc(m.competition)}${m.poule ? " · " + esc(m.poule) : ""}${m.lieu ? " · " + esc(m.lieu) : ""}</small></div>
        <span class="countdown">${JOURS[(d.getDay() + 6) % 7]} ${hm(m.heure)}</span></li>`;
    }).join("") || `<li class="empty">Aucun match prévu.</li>`;
  }

  const euros = (v) => (Math.round(v * 100) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  function amendesHTML(ds, parCat) {
    if (!ds.length) return `<p class="empty">Aucune amende enregistrée.</p>`;
    const tot = ds.reduce((t, d) => t + (+d.montant || 0), 0);
    let recap = "";
    if (parCat) {
      const m = {};
      ds.forEach((d) => m[d.categorie] = (m[d.categorie] || 0) + (+d.montant || 0));
      recap = `<div class="eq-stats">${Object.entries(m).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<button class="eq-stat lien" data-c="${esc(c)}"><b>${euros(v)}</b><span>${esc(c)}</span></button>`).join("")}</div>`;
    }
    const rows = [...ds].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((d) => `<tr>
      <td>${d.date ? fmtD(d.date) : ""}</td>${parCat ? `<td>${esc(d.categorie)}</td>` : ""}<td>${esc(d.motif)}${d.competition ? `<br><small>${esc(d.competition)}${d.match_date ? " · match du " + fmtD(d.match_date) : ""}</small>` : ""}</td>
      <td class="num">${euros(+d.montant || 0)}</td><td>${d.pv && pvById[d.pv] ? `<a href="${esc(pvById[d.pv].url)}" class="lire" data-pv="${d.pv}" data-page="1">PV n°${d.pv}</a>` : d.pv ? "PV n°" + esc(d.pv) : ""}</td></tr>`).join("");
    return `${recap}<div class="table-wrap"><table class="amendes"><thead><tr><th>Date</th>${parCat ? "<th>Catégorie</th>" : ""}<th>Motif</th><th class="num">Montant</th><th>Source</th></tr></thead>
      <tbody>${rows}</tbody><tfoot><tr><td colspan="${parCat ? 3 : 2}">Total (${ds.length} dossier${ds.length > 1 ? "s" : ""})</td><td class="num">${euros(tot)}</td><td></td></tr></tfoot></table></div>`;
  }

  function echeancesHTML(ev) {
    return ev.map((e) => {
      const d = parseD(e.date), j = joursAvant(e.date);
      const cls = j <= 4 ? "urgent" : j <= 10 ? "attention" : "";
      const cd = j === 0 ? "aujourd'hui" : j === 1 ? "demain" : `dans ${j} jours`;
      return `<li class="echeance lien" data-id="${esc(e.it.id)}"><div class="date-pill"><b>${d.getDate()}</b><span>${MOIS_C[d.getMonth()]}</span></div>
        <div class="txt"><strong>${esc(e.libelle)}</strong><br><small>${esc(e.it.categorie)} · ${esc(e.it.commission)}${e.heure ? " · " + e.heure.replace(":", "h") : ""}</small></div>
        <span class="countdown ${cls}">${cd}</span></li>`;
    }).join("") || `<li class="empty">Rien à prévoir pour l'instant.</li>`;
  }

  const advDe = (m) => (m.a_domicile ? m.exterieur : m.domicile);
  const eqDe = (m) => (m.a_domicile ? m.domicile : m.exterieur).replace(/^.*?genas azieu\s*/i, "");

  // tous les événements du calendrier, par jour : matchs du club et échéances des PV
  function eventsByDay(filtre) {
    const map = {};
    const ok = (c) => !filtre || c === filtre;
    const add = (d, o) => (map[d] = map[d] || []).push(o);
    const numeros = new Set(matchs.map((m) => String(m.numero)));
    matchs.filter((m) => ok(m.categorie)).forEach((m) => add(m.date, {
      kind: "match", heure: m.heure || "", cat: m.categorie,
      court: `${m.categorie}${eqDe(m) ? " " + eqDe(m) : ""} ${m.a_domicile ? "vs" : "@"} ${advDe(m)}`,
      label: `${m.categorie}${eqDe(m) ? " " + eqDe(m) : ""} · ${m.domicile} – ${m.exterieur}`,
      sous: `${m.competition || ""}${m.lieu ? " · " + m.lieu : ""}`, dom: m.a_domicile,
    }));
    all.filter((it) => ok(it.categorie)).forEach((it) => {
      (it.echeances || []).forEach((e) => add(e.date, { kind: it.gravite, heure: e.heure || "", cat: it.categorie, court: e.libelle, label: e.libelle, sous: `${it.categorie} · ${it.commission}`, it }));
      if (it.match && it.match.date && !numeros.has(String(it.match.numero || ""))) add(it.match.date, { kind: "match", heure: "", cat: it.categorie, court: `${it.categorie} · ${it.titre}`, label: `${it.match.domicile} – ${it.match.exterieur}`, sous: `${it.categorie} · ${it.titre}`, it });
    });
    Object.values(map).forEach((l) => l.sort((a, b) => (a.kind === "match") - (b.kind === "match") || a.heure.localeCompare(b.heure)));
    return map;
  }

  let calFiltre = "";
  function evHTML(e) {
    return `<li class="ag-ev ${e.kind} ${e.it ? "lien" : ""}" ${e.it ? `data-id="${esc(e.it.id)}"` : ""}>
      <span class="ag-h">${e.heure ? hm(e.heure) : e.kind === "match" ? "" : "📅"}</span>
      <span class="ag-t"><b>${e.kind === "match" ? (e.dom ? "🏠 " : e.dom === false ? "🚌 " : "⚽ ") : ""}${esc(e.label)}</b><small>${esc(e.sous || "")}${e.it ? " · voir la fiche ›" : ""}</small></span></li>`;
  }
  const lierFiches = (root) => root.querySelectorAll("[data-id]").forEach((li) => li.onclick = () => ouvrirFiche(li.dataset.id));

  function renderCal() {
    const sel = $("#cal-filtre");
    if (!sel.options.length) {
      sel.innerHTML = `<option value="">Toutes les équipes</option>` + catList().map((c) => `<option>${esc(c)}</option>`).join("");
      sel.onchange = () => { calFiltre = sel.value; $("#cal-jour").hidden = true; renderCal(); };
    }
    sel.value = calFiltre;
    const map = eventsByDay(calFiltre);
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    $("#cal-titre").textContent = `${MOIS[m]} ${y}`;
    const first = new Date(y, m, 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    let html = JOURS.map((j) => `<div class="dow">${j}</div>`).join("");
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = isoD(d), ev = map[k] || [];
      const cls = ["day", d.getMonth() !== m && "out", k === isoD(today) && "today", ev.length && "has", d < today && "past"].filter(Boolean).join(" ");
      const pills = ev.slice(0, 3).map((e) => `<span class="pill ${e.kind}" title="${esc(e.label)}">${e.heure ? `<b>${hm(e.heure)}</b> ` : ""}${esc(e.court)}</span>`).join("");
      html += `<div class="${cls}" data-d="${k}"><span class="n">${d.getDate()}</span>
        <div class="pills">${pills}${ev.length > 3 ? `<span class="more">+${ev.length - 3}</span>` : ""}</div>
        <div class="dots">${ev.slice(0, 6).map((e) => `<i class="dot ${e.kind}"></i>`).join("")}</div></div>`;
      if (i >= 34 && d.getMonth() !== m) break;
    }
    $("#cal").innerHTML = html;
    $("#cal").querySelectorAll(".day.has").forEach((el) => el.addEventListener("click", () => {
      $("#cal").querySelectorAll(".sel").forEach((x) => x.classList.remove("sel"));
      el.classList.add("sel");
      const box = $("#cal-jour");
      box.hidden = false;
      box.innerHTML = `<h3>${JOURS_L[(parseD(el.dataset.d).getDay() + 6) % 7]} ${fmtD(el.dataset.d)}</h3><ul class="ag-list">${map[el.dataset.d].map(evHTML).join("")}</ul>`;
      lierFiches(box);
      scrollTo$(box);
    }));
    // agenda du mois, jour par jour
    const jours = Object.keys(map).filter((k) => { const d = parseD(k); return d.getFullYear() === y && d.getMonth() === m; }).sort();
    const n = jours.reduce((t, k) => t + map[k].length, 0);
    $("#agenda-titre").textContent = `Agenda de ${MOIS[m]}${calFiltre ? " · " + calFiltre : ""} (${n} événement${n > 1 ? "s" : ""})`;
    const jourHTML = (k) => {
      const d = parseD(k);
      return `<div class="ag-jour ${d < today ? "past" : ""} ${k === isoD(today) ? "today" : ""}"><div class="date-pill"><b>${d.getDate()}</b><span>${JOURS[(d.getDay() + 6) % 7]}</span></div>
        <ul class="ag-list">${map[k].map(evHTML).join("")}</ul></div>`;
    };
    // les jours passés sont repliés pour aller droit à ce qui arrive
    const passes = jours.filter((k) => parseD(k) < today), avenir = jours.filter((k) => parseD(k) >= today);
    $("#cal-agenda").innerHTML = (passes.length && avenir.length
      ? `<details class="ag-passes"><summary>Jours passés (${passes.length})</summary><div class="agenda">${passes.map(jourHTML).join("")}</div></details>` + avenir.map(jourHTML).join("")
      : jours.map(jourHTML).join("")) || `<p class="empty">Rien ce mois-ci${calFiltre ? " pour " + esc(calFiltre) : ""}.</p>`;
    lierFiches($("#cal-agenda"));
  }
  $("#cal-prev").onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); $("#cal-jour").hidden = true; renderCal(); };
  $("#cal-next").onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); $("#cal-jour").hidden = true; renderCal(); };
  $("#cal-auj").onclick = () => { calMonth = new Date(today.getFullYear(), today.getMonth(), 1); $("#cal-jour").hidden = true; renderCal(); };
  $("#voir-cal").onclick = () => { calFiltre = ""; renderCal(); showTab("calendrier"); window.scrollTo({ top: 0 }); };

  $("#ics").onclick = () => {
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//veille-esga//FR", "CALSCALE:GREGORIAN"];
    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const icsEsc = (s) => String(s).replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
    all.forEach((it) => (it.echeances || []).forEach((e, n) => {
      const d = e.date.replace(/-/g, "");
      lines.push("BEGIN:VEVENT", `UID:${it.id}-${n}@veille-esga`, `DTSTAMP:${stamp}`);
      if (e.heure) {
        const t = e.heure.replace(":", "") + "00";
        lines.push(`DTSTART;TZID=Europe/Paris:${d}T${t}`, `DTEND;TZID=Europe/Paris:${d}T${t}`);
      } else {
        const nx = parseD(e.date); nx.setDate(nx.getDate() + 1);
        lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${isoD(nx).replace(/-/g, "")}`);
      }
      lines.push(`SUMMARY:${icsEsc("ESGA · " + e.libelle)}`, `DESCRIPTION:${icsEsc(it.titre + " — " + it.detail + " (PV n°" + it.pv + ")")}`, `URL:${it.pvUrl}`, "END:VEVENT");
    }));
    matchs.filter((m) => joursAvant(m.date) >= -7).forEach((m) => {
      const d = m.date.replace(/-/g, ""), t = (m.heure || "00:00").replace(":", "") + "00";
      const fin = new Date(parseD(m.date)); const [hh, mm] = (m.heure || "00:00").split(":").map(Number); fin.setHours(hh + 2, mm);
      lines.push("BEGIN:VEVENT", `UID:match-${m.numero}@veille-esga`, `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Europe/Paris:${d}T${t}`, `DTEND;TZID=Europe/Paris:${isoD(fin).replace(/-/g, "")}T${String(fin.getHours()).padStart(2, "0")}${String(fin.getMinutes()).padStart(2, "0")}00`,
        `SUMMARY:${icsEsc("⚽ " + m.categorie + " · " + m.domicile + " – " + m.exterieur)}`, `DESCRIPTION:${icsEsc(m.competition + (m.poule ? " · " + m.poule : ""))}`,
        ...(m.lieu ? [`LOCATION:${icsEsc(m.lieu)}`] : []), "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "echeances-esga.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  function catList() {
    const cats = [...new Set([...CATS_CLUB, ...all.map((i) => i.categorie), ...matchs.map((m) => m.categorie), ...dossiers.map((d) => d.categorie)].filter(Boolean))];
    const idx = (c) => { const i = CAT_ORDRE.indexOf(c); return i < 0 ? 99 : i; };
    return cats.sort((a, b) => idx(a) - idx(b) || a.localeCompare(b));
  }

  // vues transversales (toutes équipes) en plus des catégories
  const RE_INSCR = /inscri|engag|tournoi|candidat|appel à/i;
  const estInscr = (i) => i.type === "inscription" || RE_INSCR.test(i.titre + " " + i.detail);
  const SPECIAL = { Urgentes: (i) => i.gravite === "urgent", Inscriptions: estInscr };
  const itemsDe = (c) => all.filter((i) => SPECIAL[c] ? SPECIAL[c](i) : i.categorie === c);

  function renderChips() {
    const nUrg = all.filter((i) => i.gravite === "urgent").length;
    $("#chips").innerHTML = `<button class="chip tout ${catActive ? "" : "active"}" data-c="">Tout le club</button>`
      + [...(nUrg ? ["Urgentes"] : []), ...(all.some(estInscr) ? ["Inscriptions"] : []), ...favoris.filter((c) => catList().includes(c)), ...catList().filter((c) => !favoris.includes(c))].map((c) => {
      const its = itemsDe(c);
      const urg = !SPECIAL[c] && its.some((i) => i.gravite === "urgent");
      const fav = favoris.includes(c);
      return `<button class="chip ${c === catActive ? "active" : ""}${fav ? " fav" : ""}" data-c="${esc(c)}" aria-pressed="${c === catActive}" title="${its.length} mention${its.length > 1 ? "s" : ""} dans les PV">${fav ? '<span class="etoile" aria-label="Mon équipe">★</span>' : ""}${urg ? '<i class="dot urgent" title="Urgence en cours"></i>' : ""}${esc(c)}${its.length ? ` <small>${its.length}</small>` : ""}</button>`;
    }).join("");
    $("#chips").querySelectorAll(".chip").forEach((b) => b.onclick = () => {
      if (!b.dataset.c || b.dataset.c === catActive) { if (catActive) showTab("semaine"); } else ouvrirEquipe(b.dataset.c);
    });
    const act = $("#chips .chip.active");
    if (act) act.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  let eqNum = null;
  function renderEquipe() {
    const c = catActive, its = itemsDe(c);
    const urg = its.filter((i) => i.gravite === "urgent").length;
    const att = its.filter((i) => i.gravite === "attention").length;
    const disc = its.filter((i) => i.type === "discipline" || i.type === "sanction").length;
    const ev = prochaines(its);
    const lastD = its.map((i) => i.pvDate).sort().pop();
    $("#eq-titre").textContent = c === "Urgentes" ? "Urgences en cours" : c === "Inscriptions" ? "Coupes, tournois et inscriptions" : c === "Club" ? "Vie du club" : c;
    $("#eq-kicker").textContent = SPECIAL[c] ? "Toutes équipes" : c === "Club" ? "Administratif · arbitrage · général" : "Équipe";
    const bf = $("#eq-fav"), fav = favoris.includes(c);
    bf.hidden = !!SPECIAL[c];
    bf.setAttribute("aria-pressed", fav);
    bf.textContent = fav ? "★ Mon équipe" : "☆ Suivre cette équipe";
    bf.title = fav ? "Retirer de mes équipes" : "Mettre cette équipe en tête de la barre, sur cet appareil";
    const nAm = (c === "Club" ? dossiers : dossiers.filter((d) => d.categorie === c)).reduce((t, d) => t + (+d.montant || 0), 0);
    const nMa = SPECIAL[c] || c === "Club" ? 0 : matchs.filter((m) => m.categorie === c && joursAvant(m.date) >= 0).length;
    // on n'affiche que les chiffres utiles (la mention reste toujours visible)
    $("#eq-stats").innerHTML = [
      [its.length, `mention${its.length > 1 ? "s" : ""} dans les PV`, "", true],
      [urg, `urgente${urg > 1 ? "s" : ""}`, "urgent"],
      [att, "à surveiller", "attention"],
      [ev.length, `échéance${ev.length > 1 ? "s" : ""} à venir`, ""],
      [nMa, `match${nMa > 1 ? "s" : ""} à venir`, ""],
      [disc, `dossier${disc > 1 ? "s" : ""} discipline`, ""],
      ...(SPECIAL[c] || !nAm ? [] : [[euros(nAm), "d'amendes", "", true]]),
    ].filter(([v, , , tjs]) => tjs || v).map(([v, l, k]) => `<div class="eq-stat ${k}"><b>${v}</b><span>${l}</span></div>`).join("")
      + (lastD ? `<p class="eq-last">Dernière mention : PV du ${fmtD(lastD)}</p>` : "");
    const urgView = !!SPECIAL[c], clubView = c === "Club";
    // une carte par équipe de la catégorie (Seniors 1, 2, 3…), d'après data/matchs.json
    const toutes = matchs.filter((m) => m.categorie === c);
    const nums = [...new Set(toutes.map((m) => m.equipe).filter((n) => n != null))].sort((a, b) => a - b);
    if (eqNum != null && !nums.includes(eqNum)) eqNum = null;
    $("#eq-equipes").hidden = urgView || nums.length < 1;
    $("#eq-equipes").innerHTML = nums.length ? (nums.length > 1 ? `<button class="eq-team ${eqNum == null ? "on" : ""}" data-n=""><b>Toutes les équipes</b><span>${toutes.length} matchs</span></button>` : "") + nums.map((n) => {
      const mm = toutes.filter((m) => m.equipe === n), proch = mm.find((m) => joursAvant(m.date) >= 0);
      const comp = (mm.filter((m) => !/coupe/i.test(m.competition)).pop() || mm[mm.length - 1] || {}).competition || "";
      return `<button class="eq-team ${eqNum === n ? "on" : ""}" data-n="${n}"><b>${esc(c)} ${n}</b><span>${esc(comp)}</span>
        <small>${proch ? `Prochain : ${JOURS[(parseD(proch.date).getDay() + 6) % 7]} ${parseD(proch.date).getDate()} ${MOIS_C[parseD(proch.date).getMonth()]} ${hm(proch.heure)} · ${proch.a_domicile ? "reçoit" : "à"} ${esc(advDe(proch))}` : "Aucun match à venir"}</small></button>`;
    }).join("") : "";
    $("#eq-equipes").querySelectorAll(".eq-team").forEach((b) => b.onclick = () => { eqNum = b.dataset.n === "" ? null : +b.dataset.n; renderEquipe(); });
    const ms = eqNum == null ? toutes : toutes.filter((m) => m.equipe === eqNum);
    const avenir = ms.filter((m) => joursAvant(m.date) >= 0), passes = ms.filter((m) => joursAvant(m.date) < 0).slice(-3).reverse();
    $("#eq-matchs-bloc").hidden = urgView || clubView || !ms.length;
    $("#eq-matchs").innerHTML = matchsHTML(avenir.slice(0, 6)) + (ms.length ? `<li><button class="btn btn-link" id="eq-cal">Tous les matchs dans le calendrier ›</button></li>` : "");
    const bc = $("#eq-cal"); if (bc) bc.onclick = () => { calFiltre = c; calMonth = new Date(today.getFullYear(), today.getMonth(), 1); renderCal(); showTab("calendrier"); window.scrollTo({ top: 0 }); };
    $("#eq-matchs-passes").innerHTML = passes.length ? `<details><summary>Derniers matchs joués (${passes.length})</summary><ul class="echeances">${matchsHTML(passes)}</ul></details>` : "";
    const ds = clubView ? dossiers : dossiers.filter((d) => d.categorie === c);
    $("#eq-amendes-bloc").hidden = urgView || (!ds.length && !dossiers.length);
    $("#eq-amendes-titre").textContent = clubView ? "Amendes du club, toutes catégories" : "Amendes";
    $("#eq-amendes").innerHTML = amendesHTML(ds, clubView);
    $("#eq-amendes").querySelectorAll("[data-c]").forEach((b) => b.onclick = () => ouvrirEquipe(b.dataset.c));
    $("#eq-ech").innerHTML = echeancesHTML(ev);
    $("#eq-ech").querySelectorAll("[data-id]").forEach((li) => li.onclick = () => {
      const el = $(`#items-cat [data-fiche="${CSS.escape(li.dataset.id)}"]`);
      if (el) { scrollTo$(el); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2000); }
    });
    renderItemsEquipe();
  }

  function renderItemsEquipe() {
    const q = query.trim().toLowerCase();
    const items = itemsDe(catActive)
      .filter((i) => !q || JSON.stringify(i).toLowerCase().includes(q))
      .sort((a, b) => b.pvDate.localeCompare(a.pvDate) || sortItems(a, b));
    $("#items-cat").innerHTML = items.map((i) => itemHTML(i, true)).join("") || `<p class="empty">Aucun résultat.</p>`;
  }
  $("#recherche").addEventListener("input", (e) => { query = e.target.value; renderItemsEquipe(); });
  $("#eq-fermer").onclick = () => showTab("semaine");
  $("#eq-fav").onclick = () => {
    const c = catActive;
    favoris = favoris.includes(c) ? favoris.filter((x) => x !== c) : [...favoris, c];
    store.set("esga-pv-favoris", favoris);
    renderChips(); renderEquipe();
    toast(favoris.includes(c) ? `${c} est en tête de la barre des équipes` : `${c} retirée de vos équipes`);
  };

  function renderTimeline() {
    const q = norm($("#histo-q").value.trim());
    const res = $("#histo-res");
    $("#timeline").hidden = !!q; res.hidden = !q;
    if (q) {
      const mots = q.split(/\s+/);
      const its = all.filter((i) => { const t = norm([i.titre, i.detail, i.categorie, i.commission, i.match && (i.match.domicile + " " + i.match.exterieur + " " + i.match.competition)].join(" ")); return mots.every((m) => t.includes(m)); })
        .sort((a, b) => b.pvDate.localeCompare(a.pvDate));
      res.innerHTML = `<p class="sec-note">${its.length} fiche${its.length > 1 ? "s" : ""} sur ${data.pvs.length} PV</p><div class="items">${its.map((i) => itemHTML(i, true)).join("") || `<p class="empty">Aucune fiche ne correspond.</p>`}</div>`;
      return;
    }
    $("#timeline").innerHTML = data.pvs.map((pv, k) => {
      const its = all.filter((i) => i.pv === pv.numero).sort(sortItems);
      return `<li><details ${k === 0 ? "open" : ""}><summary class="card"><strong>PV n°${pv.numero}</strong> · ${fmtD(pv.date)} · ${its.length} mention${its.length > 1 ? "s" : ""}
        <br><small>${esc(pv.resume)}</small><br><a href="${esc(pv.url)}" class="lire" data-pv="${pv.numero}" data-page="1">Lire le PV</a></summary>
        <div class="items">${its.map((i) => itemHTML(i)).join("") || `<p class="empty">Aucune mention.</p>`}</div></details></li>`;
    }).join("");
  }

  // Lecteur de PV : affichage avec PDF.js pour surligner les passages qui citent le club.
  // Le site du District interdit l'affichage de ses PDF dans une autre page : on lit la
  // copie publiée avec le site (pv-pdf/).
  const RE_CLUB = /genas|\besga\b|523341/i; // « Genas Azieu », « ESGA » ou le numéro du club
  const lect = { num: null, page: 1, zoom: 1, doc: null, docNum: null, pages: null, cur: null, focus: null };
  if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";

  // ---- Extrait du PV dans une fiche : on découpe la page autour du passage cité
  const docs = {};
  function chargerDoc(pv) {
    if (!docs[pv.numero]) {
      const opts = { standardFontDataUrl: "vendor/pdfjs/standard_fonts/" };
      docs[pv.numero] = pdfjsLib.getDocument({ url: localPdf(pv), ...opts }).promise
        .catch(() => pdfjsLib.getDocument({ url: pv.url, ...opts }).promise)
        .catch((e) => { delete docs[pv.numero]; throw e; });
    }
    return docs[pv.numero];
  }
  const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  async function afficherExtrait(it, box) {
    const pv = pvById[it.pv];
    if (!window.pdfjsLib || !pv) { box.innerHTML = `<p class="empty">Extrait indisponible.</p>`; return; }
    box.innerHTML = `<p class="empty">Chargement de l'extrait…</p>`;
    try {
      const doc = await chargerDoc(pv);
      const page = await doc.getPage(Math.min(it.page, doc.numPages));
      const largeur = Math.min(900, Math.max(600, box.clientWidth - 18)); // lisible même sur téléphone (défilement horizontal dans l'extrait)
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: largeur / base.width });
      const tc = await page.getTextContent();
      const rect = (t) => { const tx = pdfjsLib.Util.transform(vp.transform, t.transform); const h = Math.hypot(tx[2], tx[3]); return { x: tx[4] - 3, y: tx[5] - h * 1.05, w: t.width * vp.scale + 6, h: h * 1.35, str: t.str }; };
      const items = tc.items.filter((t) => t.str.trim()).map(rect);
      const club = items.filter((b) => RE_CLUB.test(b.str));
      // point d'ancrage : n° du match, sinon une mention du club proche de l'adversaire ou d'un mot du titre
      const m = it.match || {};
      let ancre = m.numero ? items.find((b) => b.str.includes(String(m.numero))) : null;
      if (!ancre && club.length) {
        const mots = [m.domicile, m.exterieur, ...(it.titre || "").split(/[\s:,;()–-]+/)].filter((w) => w && w.length > 3 && !/genas|azieu|esga/i.test(w)).map(norm);
        const score = (c) => items.filter((b) => Math.abs(b.y - c.y) < 60 && mots.some((w) => norm(b.str).includes(w))).length;
        ancre = club.map((c) => [c, score(c)]).sort((a, b) => b[1] - a[1])[0][0];
      }
      if (!ancre) ancre = items[0];
      if (!ancre) throw new Error("page vide");
      // la mention du club la plus proche de l'ancre est mise en avant
      const proche = club.slice().sort((a, b) => Math.abs(a.y - ancre.y) - Math.abs(b.y - ancre.y))[0];
      const y0 = Math.max(0, ancre.y - 70), y1 = Math.min(vp.height, ancre.y + 230);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const full = document.createElement("canvas");
      full.width = Math.floor(vp.width * dpr); full.height = Math.floor(vp.height * dpr);
      await page.render({ canvasContext: full.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
      const crop = document.createElement("canvas");
      crop.width = full.width; crop.height = Math.floor((y1 - y0) * dpr);
      crop.getContext("2d").drawImage(full, 0, Math.floor(y0 * dpr), full.width, crop.height, 0, 0, full.width, crop.height);
      crop.style.width = vp.width + "px"; crop.style.height = (y1 - y0) + "px";
      const wrap = document.createElement("div");
      wrap.className = "extrait-page"; wrap.style.width = vp.width + "px"; wrap.style.height = (y1 - y0) + "px";
      wrap.appendChild(crop);
      club.filter((b) => b.y + b.h > y0 && b.y < y1).forEach((b) => {
        const d = document.createElement("div"); d.className = "hl" + (b === proche ? " on" : "");
        Object.assign(d.style, { left: b.x + "px", top: (b.y - y0) + "px", width: b.w + "px", height: b.h + "px" });
        wrap.appendChild(d);
      });
      box.innerHTML = "";
      const sc = document.createElement("div"); sc.className = "extrait-scroll"; sc.appendChild(wrap);
      box.appendChild(sc);
      const a = wrap.querySelector(".hl.on") || wrap.querySelector(".hl"); if (a) sc.scrollLeft = Math.max(0, a.offsetLeft - 40);
      const pied = document.createElement("p"); pied.className = "extrait-pied";
      pied.innerHTML = `Extrait du PV n°${it.pv}, page ${it.page} · <a href="#" class="lire" data-pv="${it.pv}" data-page="${it.page}">Voir la page entière dans le lecteur ›</a>`;
      box.appendChild(pied);
    } catch (e) {
      box.innerHTML = `<p class="empty">Ce PV n'est pas encore disponible pour l'extrait. <a href="${esc(pv.url)}${it.page ? "#page=" + it.page : ""}" target="_blank" rel="noopener">Ouvrir le PDF ↗</a></p>`;
    }
  }

  document.addEventListener("click", (e) => {
    const art = e.target.closest("article.item");
    if (!art || e.target.closest("a, .extrait, .actions") || window.getSelection().toString()) return;
    const btn = art.querySelector(".btn-extrait"), box = art.querySelector(".extrait");
    if (!btn) return;
    const ouvrir = box.hidden;
    box.hidden = !ouvrir; art.classList.toggle("ouvert", ouvrir);
    btn.setAttribute("aria-expanded", ouvrir);
    btn.textContent = ouvrir ? "Masquer l'extrait ▴" : "Voir l'extrait du PV ▾";
    if (ouvrir && !box.dataset.ok) {
      box.dataset.ok = "1";
      const it = all.find((i) => i.id === art.dataset.fiche);
      if (it) afficherExtrait(it, box);
    }
  });

  // ---- Lecture suivie : tous les passages du PV qui concernent Genas, à la suite
  let lectMode = "suivie";
  const RE_CLUB_G = /(genas(?:\s+azieu)?(?:\s+e\.?s\.?)?|\besga\b|523341)/gi;
  const surligne = (t) => esc(t).replace(RE_CLUB_G, "<mark>$1</mark>");

  function setMode(m) {
    lectMode = m;
    document.querySelectorAll(".seg-b").forEach((b) => b.classList.toggle("on", b.dataset.mode === m));
    $("#lect-suivie").hidden = m !== "suivie";
    $("#lect-pdf").hidden = m !== "pdf";
    if (m === "pdf") lectAfficher(); else renderSuivie();
  }

  // Lecture suivie : de vrais extraits du PDF (image de la page), avec le contexte autour de
  // chaque passage sur Genas et le titre de la rubrique (data/sommaire.json).
  let suivieNum = null;
  function rubriqueDe(num, p) {
    const som = (sommaire[num] || []).filter((c) => c.page && c.page <= p);
    return som.length ? som[som.length - 1] : null;
  }

  async function renderSuivie() {
    const num = lect.num, pv = pvById[num]; if (!pv) return;
    if (suivieNum === num) return;
    suivieNum = num;
    const box = $("#lect-suivie");
    box.innerHTML = `
      <div class="suivie-tete"><div><p class="kicker-dark">Lecture suivie</p><h2>PV n°${pv.numero} du ${fmtD(pv.date)}</h2></div>
        <p class="sec-note" id="suivie-note">Recherche des passages sur Genas…</p></div>
      ${pv.resume ? `<div class="resume"><strong>En bref :</strong> ${esc(pv.resume)}</div>` : ""}
      <div class="suivie" id="suivie-corps"></div>
      <details class="suivie-annexes" id="suivie-annexes" hidden><summary></summary><div class="suivie-ann-corps"></div></details>`;
    if (!window.pdfjsLib) { $("#suivie-note").textContent = "Le lecteur n'a pas pu se charger."; return; }
    let doc;
    try { doc = await chargerDoc(pv); } catch (e) { $("#suivie-note").innerHTML = `Ce PV n'est pas encore disponible. <a href="${esc(pv.url)}" target="_blank" rel="noopener">L'ouvrir sur le site du District ↗</a>`; return; }
    const debutAnnexes = ((sommaire[num] || []).find((c) => c.groupement === "Annexes") || {}).page || Infinity;
    const obs = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { obs.unobserve(e.target); dessinerExtrait(doc, e.target); } }), { rootMargin: "800px 0px" });
    let nPass = 0, nAnn = 0, derniere = null;
    for (let p = 1; p <= doc.numPages; p++) {
      if (suivieNum !== num) return;
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const groupes = passagesClub(tc.items);
      if (!groupes.length) continue;
      const H = page.getViewport({ scale: 1 }).height;
      const annexe = p >= debutAnnexes;
      // zone de chaque passage (en points PDF, depuis le haut) avec du contexte autour, fusionnées si elles se touchent
      const zones = [];
      groupes.forEach((g) => {
        const hauts = g.map((it) => H - it.transform[5] - Math.hypot(it.transform[2], it.transform[3]));
        const bas = g.map((it) => H - it.transform[5]);
        const z = { y0: Math.max(0, Math.min(...hauts) - (annexe ? 14 : 120)), y1: Math.min(H, Math.max(...bas) + (annexe ? 6 : 70)), n: 1 };
        const prev = zones[zones.length - 1];
        if (prev && z.y0 <= prev.y1 + 10) { prev.y1 = Math.max(prev.y1, z.y1); prev.n++; } else zones.push(z);
      });
      const rub = rubriqueDe(num, p);
      zones.forEach((z) => {
        const el = document.createElement("article");
        el.className = "extrait-pdf" + (annexe ? " annexe" : "");
        el.dataset.p = p; el.dataset.y0 = z.y0; el.dataset.y1 = z.y1;
        const titre = rub ? rub.titre : "";
        el.innerHTML = `<header><span class="ex-rub">${esc(titre || "PV")}</span><button class="pg-lien" data-page="${p}">p. ${p} · voir dans le PDF ›</button></header><div class="ex-img" style="aspect-ratio: ${(page.getViewport({ scale: 1 }).width / (z.y1 - z.y0)).toFixed(3)}"></div>`;
        el.querySelector(".pg-lien").onclick = () => { lect.page = p; lect.focus = { p, i: 0 }; setMode("pdf"); window.scrollTo({ top: 0 }); };
        if (annexe) { $("#suivie-annexes .suivie-ann-corps").appendChild(el); nAnn += z.n; }
        else {
          const cle = titre + "|" + (rub ? rub.groupement : "");
          if (cle !== derniere && titre) { const h = document.createElement("h3"); h.className = "suivie-rub"; h.innerHTML = `${esc(titre)}${rub.groupement && rub.groupement !== "District" ? ` <small>${esc(rub.groupement)}</small>` : ""}`; $("#suivie-corps").appendChild(h); }
          derniere = cle;
          $("#suivie-corps").appendChild(el); nPass += z.n;
        }
        obs.observe(el);
      });
      $("#suivie-note").textContent = `${nPass} passage${nPass > 1 ? "s" : ""} sur Genas · recherche jusqu'à la page ${p} / ${doc.numPages}…`;
      if (nAnn) { const d = $("#suivie-annexes"); d.hidden = false; d.querySelector("summary").textContent = `Annexes : désignations et dossiers (${nAnn} ligne${nAnn > 1 ? "s" : ""})`; }
    }
    $("#suivie-note").textContent = nPass || nAnn ? `${nPass} passage${nPass > 1 ? "s" : ""} sur Genas${nAnn ? ` · ${nAnn} ligne${nAnn > 1 ? "s" : ""} d'annexes` : ""} · clique sur « voir dans le PDF » pour la page entière` : "Genas n'apparaît pas dans ce PV.";
  }

  async function dessinerExtrait(doc, el) {
    try {
      const page = await doc.getPage(+el.dataset.p);
      const img = el.querySelector(".ex-img");
      const base = page.getViewport({ scale: 1 });
      const largeur = Math.max(260, img.clientWidth);
      const sc = largeur / base.width, vp = page.getViewport({ scale: sc });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const y0 = +el.dataset.y0 * sc, y1 = +el.dataset.y1 * sc;
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor((y1 - y0) * dpr);
      canvas.style.width = "100%"; canvas.style.height = "auto";
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport: vp, transform: [dpr, 0, 0, dpr, 0, -y0 * dpr] }).promise;
      const tc = await page.getTextContent();
      img.innerHTML = ""; img.appendChild(canvas);
      passagesClub(tc.items).flat().forEach((it) => {
        const tx = pdfjsLib.Util.transform(vp.transform, it.transform);
        const h = Math.hypot(tx[2], tx[3]), top = tx[5] - h * 1.05 - y0;
        if (top + h < 0 || top > y1 - y0) return;
        const d = document.createElement("div"); d.className = "hl";
        Object.assign(d.style, { left: ((tx[4] - 3) / largeur * 100) + "%", top: (top / (y1 - y0) * 100) + "%", width: ((it.width * sc + 6) / largeur * 100) + "%", height: (h * 1.35 / (y1 - y0) * 100) + "%" });
        img.appendChild(d);
      });
    } catch (e) { el.querySelector(".ex-img").innerHTML = `<p class="empty">Extrait indisponible.</p>`; }
  }

  // regroupe les mentions du club d'un même paragraphe : elles restent toutes surlignées,
  // mais ne comptent que pour un passage dans le compteur et la navigation
  function passagesClub(items) {
    const club = items.filter((it) => RE_CLUB.test(it.str)).map((it) => ({ it, y: it.transform[5], x: it.transform[4], h: Math.hypot(it.transform[2], it.transform[3]) || 10 }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const groupes = [];
    club.forEach((c) => {
      const g = groupes[groupes.length - 1], prev = g && g[g.length - 1];
      if (prev && prev.y - c.y <= 2.6 * Math.max(prev.h, c.h)) g.push(c); else groupes.push([c]);
    });
    return groupes.map((g) => g.map((c) => c.it));
  }

  // ---- PDF complet : toutes les pages à la suite (défilement de la page), dessinées à la demande
  const estMobile = () => window.matchMedia("(max-width: 900px)").matches;
  function ouvrirSide(o) {
    $("#lect-body").classList.toggle("side-off", !o);
    $("#lect-side-btn").setAttribute("aria-expanded", o);
    document.body.classList.toggle("noscroll", o && estMobile());
  }

  function renderLecteur() {
    document.querySelectorAll(".seg-b").forEach((b) => b.onclick = () => setMode(b.dataset.mode));
    $("#lect-pv").innerHTML = data.pvs.map((pv) => `<option value="${pv.numero}">PV n°${pv.numero} du ${fmtD(pv.date)} (${pv.items.length} mention${pv.items.length > 1 ? "s" : ""})</option>`).join("");
    $("#lect-pv").onchange = () => lire(+$("#lect-pv").value, 1, false);
    $("#lect-page").onchange = () => allerPage(+$("#lect-page").value || 1);
    $("#lect-prec").onclick = () => allerPage(lect.page - 1);
    $("#lect-suiv").onclick = () => allerPage(lect.page + 1);
    $("#lect-plus").onclick = () => zoomer(1.25);
    $("#lect-moins").onclick = () => zoomer(1 / 1.25);
    $("#lect-genas").onclick = () => passage(1);
    $("#lect-gprec").onclick = () => passage(-1);
    $("#lect-side-btn").onclick = () => ouvrirSide($("#lect-body").classList.contains("side-off"));
    $("#lect-side-close").onclick = () => ouvrirSide(false);
    if (estMobile()) ouvrirSide(false);
    // sur téléphone, le sommaire est un tiroir : un toucher à côté le referme
    document.addEventListener("click", (e) => {
      if (estMobile() && !$("#lect-body").classList.contains("side-off") && !e.target.closest("#lect-side, #lect-side-btn")) ouvrirSide(false);
    });
    const barreH = () => document.documentElement.style.setProperty("--barre-h", ($(".barre").offsetHeight || 0) + "px");
    barreH(); window.addEventListener("resize", barreH);
    let t, w = window.innerWidth;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { if (window.innerWidth !== w && lect.doc && !$("#lect-pdf").hidden) { w = window.innerWidth; mettreEnPage(lect.page); } }, 250); });
    window.addEventListener("scroll", suivreScroll, { passive: true });
    if (data.pvs[0]) lire(data.pvs[0].numero, 1, false);
  }

  const localPdf = (pv) => "pv-pdf/" + pv.url.split("/").pop();

  function lire(num, page, ouvrir = true) {
    const pv = pvById[num]; if (!pv) return;
    if (lect.num !== num) suivieNum = null;
    lect.num = num; lect.page = page; lect.focus = page > 1 ? { p: page, i: 0 } : null;
    $("#lect-pv").value = num;
    $("#lect-ext").href = localPdf(pv);
    const its = all.filter((i) => i.pv === num).sort((a, b) => (a.page || 0) - (b.page || 0));
    $("#lect-fiches").innerHTML = `<h3>Fiches de ce PV</h3>` + (its.map((i) => `<button class="lect-fiche ${esc(i.gravite)}" data-page="${i.page || 1}"><b>p. ${i.page || "?"}</b> · ${esc(i.categorie)}<br>${esc(i.titre)}</button>`).join("") || `<p class="empty">Aucune fiche.</p>`);
    $("#lect-fiches").querySelectorAll(".lect-fiche").forEach((b) => b.onclick = () => { allerPage(+b.dataset.page, 0); if (estMobile()) ouvrirSide(false); });
    renderSommaire(num);
    if (ouvrir) { lectMode = "pdf"; showTab("lecteur"); window.scrollTo({ top: 0 }); }
    else if ($("#tab-lecteur").classList.contains("active")) lectRafraichir();
  }

  // sommaire des commissions (data/sommaire.json, facultatif)
  function renderSommaire(num) {
    const som = (sommaire[num] || []).filter((c) => c && c.page);
    const groupes = [];
    som.forEach((c) => { const g = c.groupement || "Autres"; let x = groupes.find((y) => y.nom === g); if (!x) groupes.push(x = { nom: g, items: [] }); x.items.push(c); });
    $("#lect-sommaire").innerHTML = groupes.length ? `<h3>Sommaire du PV</h3>` + groupes.map((g) => {
      const n = g.items.reduce((t, c) => t + (c.mentions || 0), 0);
      const ouvert = /vall/i.test(g.nom) || (n > 0 && g.nom !== "Annexes");
      return `<details class="lect-som" ${ouvert ? "open" : ""}><summary>${esc(g.nom)}${n ? ` <small>${n} Genas</small>` : ""}</summary>
        ${g.items.map((c) => `<button class="lect-som-b ${c.mentions ? "has" : ""}" data-page="${c.page}"><span>${esc(c.titre || "")}</span><small>p. ${c.page}${c.mentions ? ` · <b>${c.mentions}</b>` : ""}</small></button>`).join("")}</details>`;
    }).join("") : "";
    $("#lect-sommaire").querySelectorAll(".lect-som-b").forEach((b) => b.onclick = () => { allerPage(+b.dataset.page, b.classList.contains("has") ? 0 : null); if (estMobile()) ouvrirSide(false); });
  }

  function lectRafraichir() { setMode(lectMode); }

  async function lectAfficher() {
    const pv = pvById[lect.num]; if (!pv) return;
    if (!window.pdfjsLib) { $("#lect-view").innerHTML = `<p class="empty">Le lecteur n'a pas pu se charger. <a href="${esc(localPdf(pv))}" target="_blank" rel="noopener">Ouvrir le PDF ↗</a></p>`; return; }
    if (lect.docNum !== lect.num) {
      lect.docNum = lect.num; lect.doc = null; lect.pages = null; lect.pageN = {};
      $("#lect-view").innerHTML = `<p class="empty">Chargement du PV n°${pv.numero}…</p>`;
      $("#lect-pages").innerHTML = `<p class="empty">Recherche en cours…</p>`;
      $("#lect-gcount").textContent = "Genas";
      const num = lect.num;
      try {
        const doc = await chargerDoc(pv);
        if (lect.num !== num) return;
        lect.doc = doc;
        $("#lect-total").textContent = `/ ${doc.numPages}`;
        $("#lect-page").max = doc.numPages;
        const p1 = await doc.getPage(1);
        lect.ratio = p1.getViewport({ scale: 1 }).height / p1.getViewport({ scale: 1 }).width;
        mettreEnPage(lect.focus ? lect.focus.p : 1);
        chercherClub(doc, num);
      } catch (e) {
        lect.docNum = null;
        $("#lect-view").innerHTML = `<p class="empty">Ce PV n'est pas encore disponible dans le lecteur. <a href="${esc(pv.url)}" target="_blank" rel="noopener">L'ouvrir sur le site du District ↗</a></p>`;
        $("#lect-pages").innerHTML = "";
        return;
      }
    } else if (lect.focus) allerPage(lect.focus.p, lect.focus.i);
    lect.focus = null;
  }

  // une case par page, à la bonne taille ; les pages sont dessinées quand elles approchent de l'écran
  function mettreEnPage(versP) {
    const doc = lect.doc, view = $("#lect-view");
    if (lect.obs) lect.obs.disconnect();
    lect.rendues = new Map();
    // largeur utile (sans les marges intérieures) : la page ne déborde pas, donc rien ne bouge sur le côté
    const cs = getComputedStyle(view);
    const largeur = Math.floor(Math.max(240, view.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * lect.zoom);
    lect.largeur = largeur;
    view.innerHTML = "";
    view.classList.toggle("zoome", lect.zoom > 1.01);
    for (let p = 1; p <= doc.numPages; p++) {
      const slot = document.createElement("div");
      slot.className = "pg-slot"; slot.dataset.p = p;
      slot.style.width = largeur + "px"; slot.style.height = Math.round(largeur * (lect.ratios?.[p] || lect.ratio)) + "px";
      slot.innerHTML = `<span class="pg-num">${p}</span>`;
      view.appendChild(slot);
    }
    lect.obs = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) dessiner(+e.target.dataset.p); }), { rootMargin: "1200px 0px" });
    view.querySelectorAll(".pg-slot").forEach((s) => lect.obs.observe(s));
    if (versP > 1) allerPage(versP, lect.focus ? lect.focus.i : null, true);
  }

  async function dessiner(p) {
    if (lect.rendues.has(p)) return;
    const doc = lect.doc, slot = $(`#lect-view .pg-slot[data-p="${p}"]`); if (!slot) return;
    const jeton = {}; lect.rendues.set(p, jeton);
    const page = await doc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: lect.largeur / base.width });
    (lect.ratios = lect.ratios || {})[p] = base.height / base.width;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
    canvas.style.width = vp.width + "px"; canvas.style.height = vp.height + "px";
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    if (lect.rendues.get(p) !== jeton) return;
    const tc = await page.getTextContent();
    const boxes = passagesClub(tc.items).flatMap((g, gi) => g.map((it) => {
      const tx = pdfjsLib.Util.transform(vp.transform, it.transform);
      const h = Math.hypot(tx[2], tx[3]);
      return { g: gi, x: tx[4] - 3, y: tx[5] - h * 1.05, w: it.width * vp.scale + 6, h: h * 1.35 };
    }));
    if (lect.rendues.get(p) !== jeton) return;
    slot.style.height = vp.height + "px";
    slot.innerHTML = `<span class="pg-num">${p}</span>`;
    slot.appendChild(canvas);
    boxes.forEach((b) => {
      const d = document.createElement("div"); d.className = "hl"; d.dataset.g = b.g;
      Object.assign(d.style, { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" });
      slot.appendChild(d);
    });
    slot.classList.add("ok"); slot.classList.toggle("genas", boxes.length > 0);
    // on libère la mémoire des pages éloignées
    if (lect.rendues.size > 12) [...lect.rendues.keys()].sort((a, b) => Math.abs(b - lect.page) - Math.abs(a - lect.page)).slice(0, lect.rendues.size - 12).forEach((q) => {
      lect.rendues.delete(q);
      const s = $(`#lect-view .pg-slot[data-p="${q}"]`); if (s) { s.classList.remove("ok"); s.innerHTML = `<span class="pg-num">${q}</span>`; }
    });
    if (lect.attente && lect.attente.p === p) { const a = lect.attente; lect.attente = null; montrerHl(a.p, a.i); }
  }

  const hauteurBarres = () => (($(".barre") || {}).offsetHeight || 0) + (($("#lect-bar") || {}).offsetHeight || 0) + 8;

  function allerPage(p, i = null, instant) {
    if (!lect.doc) { lect.page = p; return; }
    p = Math.max(1, Math.min(lect.doc.numPages, p));
    const slot = $(`#lect-view .pg-slot[data-p="${p}"]`); if (!slot) return;
    lect.page = p; majPage();
    window.scrollTo({ top: slot.getBoundingClientRect().top + window.scrollY - hauteurBarres(), behavior: instant ? "auto" : "smooth" });
    if (i != null) { if (slot.classList.contains("ok")) montrerHl(p, i); else { lect.attente = { p, i }; dessiner(p); } }
  }

  function montrerHl(p, i) {
    const slot = $(`#lect-view .pg-slot[data-p="${p}"]`); if (!slot) return;
    const hls = [...slot.querySelectorAll(".hl")]; if (!hls.length) return;
    const n = Math.max(...hls.map((h) => +h.dataset.g)) + 1;
    i = Math.max(0, Math.min(n - 1, i < 0 ? n + i : i));
    document.querySelectorAll("#lect-view .hl.on").forEach((x) => x.classList.remove("on"));
    const groupe = hls.filter((h) => +h.dataset.g === i);
    groupe.forEach((h) => h.classList.add("on"));
    const el = groupe[0];
    lect.cur = { p, i };
    const y = slot.getBoundingClientRect().top + window.scrollY + el.offsetTop - hauteurBarres() - window.innerHeight * 0.25;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    const view = $("#lect-view");
    if (view.scrollWidth > view.clientWidth) view.scrollTo({ left: Math.max(0, el.offsetLeft - 40), behavior: "smooth" });
    majCompteur();
  }

  // passage Genas suivant (dir = 1) ou précédent (dir = -1), d'une page à l'autre
  function passage(dir) {
    const pages = lect.pages || lect.pagesPartiel || [];
    if (!pages.length) return;
    const cur = lect.cur && lect.cur.p === lect.page ? lect.cur : { p: lect.page, i: dir > 0 ? -1 : 0 };
    const n = (pages.find((r) => r.p === cur.p) || {}).n || 0;
    if (dir > 0 && cur.i + 1 < n) return allerPage(cur.p, cur.i + 1);
    if (dir < 0 && cur.i - 1 >= 0 && n) return allerPage(cur.p, cur.i - 1);
    const cible = dir > 0 ? (pages.find((r) => r.p > cur.p) || pages[0]) : ([...pages].reverse().find((r) => r.p < cur.p) || pages[pages.length - 1]);
    allerPage(cible.p, dir > 0 ? 0 : cible.n - 1);
  }

  function majCompteur() {
    const pages = lect.pages || lect.pagesPartiel || [];
    const total = pages.reduce((t, r) => t + r.n, 0);
    let rang = 0;
    if (lect.cur) { for (const r of pages) { if (r.p < lect.cur.p) rang += r.n; else if (r.p === lect.cur.p) { rang += lect.cur.i + 1; break; } } }
    $("#lect-gcount").textContent = total ? (rang ? `${rang} / ${total}` : `${total} Genas`) : "Genas";
  }

  function majPage() {
    $("#lect-page").value = lect.page;
    document.querySelectorAll(".lect-pg, .lect-fiche").forEach((b) => b.classList.toggle("on", +(b.dataset.p || b.dataset.page) === lect.page));
  }

  let scrollT;
  function suivreScroll() {
    if (scrollT || !lect.doc || $("#lect-pdf").hidden || !$("#tab-lecteur").classList.contains("active")) return;
    scrollT = requestAnimationFrame(() => {
      scrollT = null;
      const ligne = hauteurBarres() + window.innerHeight * 0.3;
      const slots = $("#lect-view").children;
      let bas = 0, haut = slots.length - 1;
      while (bas < haut) { const m = (bas + haut) >> 1; if (slots[m].getBoundingClientRect().bottom < ligne) bas = m + 1; else haut = m; }
      const p = +(slots[bas] && slots[bas].dataset.p) || 1;
      if (p !== lect.page) { lect.page = p; majPage(); }
    });
  }

  function zoomer(f) {
    const z = Math.max(0.5, Math.min(3, lect.zoom * f));
    if (z === lect.zoom || !lect.doc) return;
    lect.zoom = z; mettreEnPage(lect.page);
    allerPage(lect.page, null, true);
  }

  // repère toutes les pages qui citent le club, en arrière-plan
  async function chercherClub(doc, num) {
    const res = [];
    for (let p = 1; p <= doc.numPages; p++) {
      if (lect.num !== num) return;
      const tc = await (await doc.getPage(p)).getTextContent();
      const n = passagesClub(tc.items).length;
      if (n) res.push({ p, n });
      if (p % 10 === 0 || p === doc.numPages) majPages(res, p === doc.numPages);
    }
    lect.pages = res;
    majCompteur();
  }
  function majPages(res, fini) {
    $("#lect-pages").innerHTML = (res.map((r) => `<button class="lect-pg ${r.p === lect.page ? "on" : ""}" data-p="${r.p}">p. ${r.p}<small>${r.n}</small></button>`).join("")
      || (fini ? `<p class="empty">Le club n'apparaît pas dans ce PV.</p>` : "")) + (fini ? "" : `<p class="empty">Recherche en cours…</p>`);
    $("#lect-pages").querySelectorAll(".lect-pg").forEach((b) => b.onclick = () => { allerPage(+b.dataset.p, 0); if (estMobile()) ouvrirSide(false); });
    lect.pagesPartiel = res;
    majCompteur();
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.lire");
    if (!a || e.ctrlKey || e.metaKey) return;
    e.preventDefault(); e.stopPropagation();
    lire(+a.dataset.pv, +a.dataset.page || 1);
  }, true);

  // ---- Tableau de bord de la semaine : ce qui reste à faire
  function renderBord(items) {
    const act = items.filter((i) => aTraiter(i) || traites.has(i.id));
    const faits = act.filter((i) => traites.has(i.id)).length, reste = act.length - faits;
    const nouv = all.filter((i) => nouveauxPv.has(i.pv)).length;
    const pct = act.length ? Math.round((faits / act.length) * 100) : 100;
    $("#bord").innerHTML = `
      <div class="bord-suivi">
        <div><b>${reste ? `${reste} action${reste > 1 ? "s" : ""} à traiter` : "Tout est traité ✓"}</b>
          <span>${faits} sur ${act.length} marquée${faits > 1 ? "s" : ""} comme traitée${faits > 1 ? "s" : ""}${nouv ? ` · <em>${nouv} nouvelle${nouv > 1 ? "s" : ""} fiche${nouv > 1 ? "s" : ""} depuis votre dernière visite</em>` : ""}</span></div>
        <div class="bord-jauge" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      </div>
      <div class="bord-outils">
        <button class="btn" id="bord-partager" title="Envoyer le résumé de la semaine">↗ Partager la synthèse</button>
        <button class="btn" id="bord-imprimer" title="Imprimer ou enregistrer en PDF pour la réunion">🖨 Imprimer</button>
      </div>`;
    $("#bord-imprimer").onclick = () => window.print();
    $("#bord-partager").onclick = () => {
      const last = data.pvs[0];
      const lignes = items.filter((i) => !traites.has(i.id)).map((i) => `• [${i.categorie}] ${i.titre}${(i.echeances || []).filter((e) => joursAvant(e.date) >= 0).map((e) => ` (avant le ${fmtD(e.date)})`).join("")}`);
      partager(`PV District n°${last.numero} du ${fmtD(last.date)}`, `${last.resume}\n\n${lignes.join("\n")}`, lienPage("semaine"));
    };
  }

  const lienPage = (h) => location.href.split("#")[0] + "#" + h;
  let toastT;
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600);
  }
  async function partager(titre, texte, url) {
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title: titre, text: texte, url }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const tout = `${titre}\n${texte}\n${url}`;
    try { await navigator.clipboard.writeText(tout); toast("Copié : collez-le dans WhatsApp, un mail ou la messagerie"); }
    catch (e) { window.prompt("Copiez ce texte :", tout); }
  }
  function icsTelecharger(evts, nom) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ie = (s) => String(s).replace(/[\\,;]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//veille-esga//FR", "CALSCALE:GREGORIAN"];
    evts.forEach(({ it, e, n }) => {
      const d = e.date.replace(/-/g, "");
      L.push("BEGIN:VEVENT", `UID:${it.id}-${n}@veille-esga`, `DTSTAMP:${stamp}`);
      if (e.heure) { const t = e.heure.replace(":", "") + "00"; L.push(`DTSTART;TZID=Europe/Paris:${d}T${t}`, `DTEND;TZID=Europe/Paris:${d}T${t}`); }
      else { const nx = parseD(e.date); nx.setDate(nx.getDate() + 1); L.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${isoD(nx).replace(/-/g, "")}`); }
      L.push(`SUMMARY:${ie("ESGA · " + e.libelle)}`, `DESCRIPTION:${ie(it.titre + " — " + it.detail + " (PV n°" + it.pv + ")")}`, `URL:${it.pvUrl}`, "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${ie(e.libelle)}`, "END:VALARM", "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([L.join("\r\n")], { type: "text/calendar" })); a.download = nom; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // un changement d'état d'une fiche se répercute partout (semaine, équipe, historique)
  function rafraichirTout() {
    const y = window.scrollY;
    renderSemaine(data.pvs[0]); renderTimeline();
    if (catActive) renderEquipe();
    window.scrollTo(0, y);
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest(".actions .act");
    if (!b) return;
    const it = all.find((i) => i.id === b.closest("article.item").dataset.fiche);
    if (!it) return;
    const a = b.dataset.act;
    if (a === "traite") {
      const fait = !traites.has(it.id);
      fait ? traites.add(it.id) : traites.delete(it.id);
      store.set("esga-pv-traites", [...traites]);
      rafraichirTout();
      toast(fait ? "Fiche marquée comme traitée" : "Fiche remise à traiter");
    } else if (a === "partager") {
      const ech = (it.echeances || []).filter((e) => joursAvant(e.date) >= 0).map((e) => `📅 ${e.libelle} : ${fmtD(e.date)}${e.heure ? " " + hm(e.heure) : ""}`);
      partager(`[${it.categorie}] ${it.titre}`, [it.detail, ...ech, `Source : PV n°${it.pv}${it.page ? ", page " + it.page : ""}`].join("\n"), it.pvUrl + (it.page ? "#page=" + it.page : ""));
    } else if (a === "agenda") {
      icsTelecharger((it.echeances || []).map((e, n) => ({ it, e, n })).filter(({ e }) => joursAvant(e.date) >= 0), `esga-${it.id}.ics`);
      toast("Fichier agenda téléchargé : ouvrez-le pour ajouter la date");
    }
  });
  $("#histo-q").addEventListener("input", () => renderTimeline());

  function bindTabs() {
    document.querySelectorAll(".tab").forEach((b) => b.onclick = () => showTab(b.dataset.tab));
    const h = location.hash.slice(1);
    if (h.startsWith("equipe/")) {
      const c = decodeURIComponent(h.slice(7));
      if (SPECIAL[c] || catList().includes(c)) return ouvrirEquipe(c, false);
    }
    if (["semaine", "calendrier", "historique", "lecteur"].includes(h)) showTab(h);
  }
})();
