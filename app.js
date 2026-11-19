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

  let data, all = [], pvById = {}, matchs = [], dossiers = [];
  let calMonth, catActive = null, query = "";

  // matchs.json et dossiers.json sont facultatifs : le site fonctionne sans eux
  const charger = (f) => fetch(f, { cache: "no-store" }).then((r) => r.ok ? r.json() : []).catch(() => []);
  fetch("data/pv.json", { cache: "no-store" })
    .then((r) => r.json())
    .then(async (j) => {
      data = j;
      [matchs, dossiers] = await Promise.all([charger("data/matchs.json"), charger("data/dossiers.json")]);
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
    if (t === "lecteur") lectAfficher();
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
    return `<article class="item ${esc(it.gravite)}" data-fiche="${esc(it.id)}">
      <div class="meta"><span class="badge cat">${esc(it.categorie)}</span><span class="badge">${esc(it.commission)}</span>${it.gravite !== "info" ? `<span class="badge ${esc(it.gravite)}">${it.gravite === "urgent" ? "Urgent" : "À surveiller"}</span>` : ""}${ech}</div>
      <h3>${esc(it.titre)}</h3>
      ${match}
      <p>${esc(it.detail)}</p>
      ${it.page ? `<button class="btn-extrait" type="button" aria-expanded="false">Voir l'extrait du PV ▾</button><div class="extrait" hidden></div>` : ""}
      <p class="src">Source : <a href="${esc(it.pvUrl)}${it.page ? "#page=" + it.page : ""}" class="lire" data-pv="${it.pv}" data-page="${it.page || 1}">PV n°${it.pv}${it.page ? ", page " + it.page : ""}</a>${showPv ? " du " + fmtD(it.pvDate) : ""} · <a href="${esc(it.pvUrl)}" target="_blank" rel="noopener">PDF ↗</a></p>
    </article>`;
  }

  const sortItems = (a, b) => (GRAV_ORDRE[a.gravite] - GRAV_ORDRE[b.gravite]) || b.pvDate.localeCompare(a.pvDate);

  function renderSemaine(last) {
    if (!last) return;
    $("#resume").innerHTML = `<strong>En bref, PV n°${last.numero} :</strong> ${esc(last.resume)}`;
    const items = all.filter((i) => i.pv === last.numero).sort(sortItems);
    $("#semaine-note").textContent = `PV n°${last.numero} du ${fmtD(last.date)} · ${items.length} fiche${items.length > 1 ? "s" : ""}`;
    $("#items-semaine").innerHTML = items.map((i) => itemHTML(i)).join("") || `<p class="empty">Aucune mention du club cette semaine 🎉</p>`;
    const ev = prochaines(all);
    const mw = matchs.filter((m) => joursAvant(m.date) >= 0 && joursAvant(m.date) <= 7);
    $("#matchs-semaine").innerHTML = matchsHTML(mw.slice(0, 8), true) + (mw.length > 8 ? `<li class="empty">… et ${mw.length - 8} autres matchs</li>` : "");
    $("#matchs-semaine-bloc").hidden = !matchs.length;
    $("#a-venir").innerHTML = echeancesHTML(ev);
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
      + [...(nUrg ? ["Urgentes"] : []), ...(all.some(estInscr) ? ["Inscriptions"] : []), ...catList()].map((c) => {
      const its = itemsDe(c);
      const urg = !SPECIAL[c] && its.some((i) => i.gravite === "urgent");
      return `<button class="chip ${c === catActive ? "active" : ""}" data-c="${esc(c)}" aria-pressed="${c === catActive}" title="${its.length} mention${its.length > 1 ? "s" : ""} dans les PV">${urg ? '<i class="dot urgent" title="Urgence en cours"></i>' : ""}${esc(c)}${its.length ? ` <small>${its.length}</small>` : ""}</button>`;
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

  function renderTimeline() {
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
  const lect = { num: null, page: 1, zoom: 1, doc: null, docNum: null, pages: null, hl: [], hlIdx: -1, rendu: 0 };
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
    if (!art || e.target.closest("a, .extrait") || window.getSelection().toString()) return;
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

  function renderLecteur() {
    $("#lect-pv").innerHTML = data.pvs.map((pv) => `<option value="${pv.numero}">PV n°${pv.numero} du ${fmtD(pv.date)} (${pv.items.length} mention${pv.items.length > 1 ? "s" : ""})</option>`).join("");
    $("#lect-pv").onchange = () => lire(+$("#lect-pv").value, 1, false);
    $("#lect-page").onchange = () => allerPage(+$("#lect-page").value || 1);
    $("#lect-prec").onclick = () => allerPage(lect.page - 1);
    $("#lect-suiv").onclick = () => allerPage(lect.page + 1);
    $("#lect-plus").onclick = () => { lect.zoom = Math.min(3, lect.zoom * 1.25); afficherPage(); };
    $("#lect-moins").onclick = () => { lect.zoom = Math.max(0.5, lect.zoom / 1.25); afficherPage(); };
    $("#lect-genas").onclick = passageSuivant;
    let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { if ($("#tab-lecteur").classList.contains("active")) afficherPage(); }, 200); });
    if (data.pvs[0]) lire(data.pvs[0].numero, 1, false);
  }

  const localPdf = (pv) => "pv-pdf/" + pv.url.split("/").pop();

  function lire(num, page, ouvrir = true) {
    const pv = pvById[num]; if (!pv) return;
    lect.num = num; lect.page = page; lect.hlIdx = -1; lect.focus = page > 1;
    $("#lect-pv").value = num;
    $("#lect-ext").href = localPdf(pv);
    const its = all.filter((i) => i.pv === num).sort((a, b) => (a.page || 0) - (b.page || 0));
    $("#lect-fiches").innerHTML = `<h3>Mentions du club</h3>` + (its.map((i) => `<button class="lect-fiche ${esc(i.gravite)}" data-page="${i.page || 1}"><b>p. ${i.page || "?"}</b> · ${esc(i.categorie)}<br>${esc(i.titre)}</button>`).join("") || `<p class="empty">Aucune mention.</p>`);
    $("#lect-fiches").querySelectorAll(".lect-fiche").forEach((b) => b.onclick = () => allerPage(+b.dataset.page));
    if (ouvrir) { showTab("lecteur"); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else if ($("#tab-lecteur").classList.contains("active")) lectAfficher();
  }

  // appelé quand l'onglet Lecteur devient visible (il faut sa largeur pour dessiner la page)
  async function lectAfficher() {
    const pv = pvById[lect.num]; if (!pv) return;
    if (!window.pdfjsLib) { $("#lect-view").innerHTML = `<p class="empty">Le lecteur n'a pas pu se charger. <a href="${esc(localPdf(pv))}" target="_blank" rel="noopener">Ouvrir le PDF ↗</a></p>`; return; }
    if (lect.docNum !== lect.num) {
      lect.docNum = lect.num; lect.doc = null; lect.pages = null;
      $("#lect-view").innerHTML = `<p class="empty">Chargement du PV n°${pv.numero}…</p>`;
      $("#lect-pages").innerHTML = `<p class="empty">Recherche en cours…</p>`;
      const num = lect.num;
      try {
        const doc = await chargerDoc(pv);
        if (lect.num !== num) return;
        lect.doc = doc;
        $("#lect-total").textContent = `/ ${doc.numPages}`;
        $("#lect-page").max = doc.numPages;
        chercherClub(doc, num);
      } catch (e) {
        lect.docNum = null;
        $("#lect-view").innerHTML = `<p class="empty">Ce PV n'est pas encore disponible dans le lecteur. <a href="${esc(pv.url)}" target="_blank" rel="noopener">L'ouvrir sur le site du District ↗</a></p>`;
        $("#lect-pages").innerHTML = "";
        return;
      }
    }
    afficherPage(lect.focus); lect.focus = false;
  }

  // repère toutes les pages qui citent le club, en arrière-plan
  async function chercherClub(doc, num) {
    const res = [];
    for (let p = 1; p <= doc.numPages; p++) {
      if (lect.num !== num) return;
      const tc = await (await doc.getPage(p)).getTextContent();
      const n = tc.items.filter((it) => RE_CLUB.test(it.str)).length;
      if (n) res.push({ p, n });
      if (p % 10 === 0 || p === doc.numPages) majPages(res, p === doc.numPages);
    }
    lect.pages = res;
  }
  function majPages(res, fini) {
    $("#lect-pages").innerHTML = (res.map((r) => `<button class="lect-pg ${r.p === lect.page ? "on" : ""}" data-p="${r.p}">p. ${r.p}<small>${r.n}</small></button>`).join("")
      || (fini ? `<p class="empty">Le club n'apparaît pas dans ce PV.</p>` : "")) + (fini ? "" : `<p class="empty">Recherche en cours…</p>`);
    $("#lect-pages").querySelectorAll(".lect-pg").forEach((b) => b.onclick = () => allerPage(+b.dataset.p));
    lect.pagesPartiel = res;
  }

  function allerPage(p, idx = 0) {
    if (!lect.doc) { lect.page = p; return; }
    lect.page = Math.max(1, Math.min(lect.doc.numPages, p));
    lect.hlIdx = idx - 1;
    afficherPage(true);
  }

  async function afficherPage(versHl) {
    const doc = lect.doc; if (!doc) return;
    const n = ++lect.rendu, pnum = lect.page;
    $("#lect-page").value = pnum;
    document.querySelectorAll(".lect-pg, .lect-fiche").forEach((b) => b.classList.toggle("on", +(b.dataset.p || b.dataset.page) === pnum));
    const page = await doc.getPage(pnum);
    const view = $("#lect-view");
    const largeur = Math.max(280, view.clientWidth - 2);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: (largeur / base.width) * lect.zoom });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr);
    canvas.style.width = vp.width + "px"; canvas.style.height = vp.height + "px";
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    if (n !== lect.rendu) return;
    // surlignage des passages qui citent le club
    const tc = await page.getTextContent();
    const boxes = tc.items.filter((it) => RE_CLUB.test(it.str)).map((it) => {
      const tx = pdfjsLib.Util.transform(vp.transform, it.transform);
      const h = Math.hypot(tx[2], tx[3]), w = it.width * vp.scale;
      return { x: tx[4] - 3, y: tx[5] - h * 1.05, w: w + 6, h: h * 1.35 };
    }).sort((a, b) => a.y - b.y || a.x - b.x);
    const pg = document.createElement("div");
    pg.className = "lect-pg-page"; pg.style.width = vp.width + "px"; pg.style.height = vp.height + "px";
    pg.appendChild(canvas);
    boxes.forEach((b, i) => {
      const d = document.createElement("div"); d.className = "hl"; d.dataset.i = i;
      Object.assign(d.style, { left: b.x + "px", top: b.y + "px", width: b.w + "px", height: b.h + "px" });
      pg.appendChild(d);
    });
    if (n !== lect.rendu) return;
    view.innerHTML = ""; view.appendChild(pg);
    lect.hl = boxes;
    $("#lect-aide").textContent = boxes.length
      ? `${boxes.length} passage${boxes.length > 1 ? "s" : ""} sur Genas Azieu / ESGA surligné${boxes.length > 1 ? "s" : ""} sur cette page.`
      : "Aucune mention de Genas Azieu ni de l'ESGA sur cette page.";
    if (versHl && boxes.length) montrerHl(Math.max(0, lect.hlIdx + 1));
  }

  function montrerHl(i) {
    lect.hlIdx = i;
    const el = $(`#lect-view .hl[data-i="${i}"]`); if (!el) return;
    document.querySelectorAll("#lect-view .hl.on").forEach((x) => x.classList.remove("on"));
    el.classList.add("on");
    const view = $("#lect-view");
    view.scrollTo({ top: Math.max(0, el.offsetTop - view.clientHeight / 3), left: Math.max(0, el.offsetLeft - 40), behavior: "smooth" });
    const r = view.getBoundingClientRect();
    if (r.top < 100 || r.bottom > window.innerHeight) scrollTo$(view);
  }

  function passageSuivant() {
    if (lect.hlIdx + 1 < lect.hl.length) return montrerHl(lect.hlIdx + 1);
    const pages = lect.pages || lect.pagesPartiel || [];
    const suiv = pages.find((r) => r.p > lect.page) || pages[0];
    if (suiv) allerPage(suiv.p, 0);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.lire");
    if (!a || e.ctrlKey || e.metaKey) return;
    e.preventDefault(); e.stopPropagation();
    lire(+a.dataset.pv, +a.dataset.page || 1);
  }, true);

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
