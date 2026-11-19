(() => {
  const $ = (s) => document.querySelector(s);
  const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const MOIS_C = ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
  const JOURS = ["lun","mar","mer","jeu","ven","sam","dim"];
  const GRAV_ORDRE = { urgent: 0, attention: 1, info: 2 };
  // équipes du club, toujours affichées en haut même sans mention dans les PV
  const CATS_CLUB = ["Club","Seniors","Seniors F","U20","U18F","U17","U15","U15F","U13","U13F","Vétérans"];
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
    const y = el.getBoundingClientRect().top + window.scrollY - 70;
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
  }

  // vue d'une équipe (catégorie) ou des urgences, ouverte depuis la barre du haut
  function ouvrirEquipe(c, remonter = true) {
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
      <p class="src">Source : <a href="${esc(it.pvUrl)}${it.page ? "#page=" + it.page : ""}" class="lire" data-pv="${it.pv}" data-page="${it.page || 1}">PV n°${it.pv}${it.page ? ", page " + it.page : ""}</a>${showPv ? " du " + fmtD(it.pvDate) : ""} · <a href="${esc(it.pvUrl)}" target="_blank" rel="noopener">PDF ↗</a></p>
    </article>`;
  }

  const sortItems = (a, b) => (GRAV_ORDRE[a.gravite] - GRAV_ORDRE[b.gravite]) || b.pvDate.localeCompare(a.pvDate);

  function renderSemaine(last) {
    if (!last) return;
    $("#resume").innerHTML = `<strong>En bref, PV n°${last.numero} :</strong> ${esc(last.resume)}`;
    const items = all.filter((i) => i.pv === last.numero).sort(sortItems);
    $("#items-semaine").innerHTML = items.map((i) => itemHTML(i)).join("") || `<p class="empty">Aucune mention du club cette semaine 🎉</p>`;
    const ev = prochaines(all);
    const mw = matchs.filter((m) => joursAvant(m.date) >= 0 && joursAvant(m.date) <= 7);
    $("#matchs-semaine").innerHTML = matchsHTML(mw, true);
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

  function eventsByDay() {
    const map = {};
    const add = (d, o) => (map[d] = map[d] || []).push(o);
    all.forEach((it) => {
      (it.echeances || []).forEach((e) => add(e.date, { kind: it.gravite, label: `${e.heure ? e.heure.replace(":", "h") + " · " : ""}${e.libelle}`, it }));
      if (it.match && it.match.date) add(it.match.date, { kind: "match", label: `${it.match.domicile} – ${it.match.exterieur} (${it.categorie}) : ${it.titre}`, it });
    });
    matchs.forEach((m) => add(m.date, { kind: "match", label: `${hm(m.heure)} · ${m.categorie} · ${m.domicile} – ${m.exterieur}${m.lieu ? " (" + m.lieu + ")" : ""}` }));
    return map;
  }

  function renderCal() {
    const map = eventsByDay();
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    $("#cal-titre").textContent = `${MOIS[m]} ${y}`;
    const first = new Date(y, m, 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    let html = JOURS.map((j) => `<div class="dow">${j}</div>`).join("");
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const k = isoD(d), ev = map[k] || [];
      const cls = ["day", d.getMonth() !== m && "out", k === isoD(today) && "today", ev.length && "has"].filter(Boolean).join(" ");
      html += `<div class="${cls}" data-d="${k}"><span class="n">${d.getDate()}</span><div class="dots">${ev.map((e) => `<i class="dot ${e.kind}"></i>`).join("")}</div></div>`;
      if (i >= 34 && d.getMonth() !== m) break;
    }
    $("#cal").innerHTML = html;
    $("#cal").querySelectorAll(".day.has").forEach((el) => el.addEventListener("click", () => {
      $("#cal").querySelectorAll(".sel").forEach((x) => x.classList.remove("sel"));
      el.classList.add("sel");
      const ev = map[el.dataset.d];
      const box = $("#cal-jour");
      box.hidden = false;
      box.innerHTML = `<strong>${fmtD(el.dataset.d)}</strong><ul>${ev.map((e) => e.it ? `<li class="lien" data-id="${esc(e.it.id)}"><i class="dot ${e.kind}"></i>${esc(e.label)} <small>(PV n°${e.it.pv}) · voir la fiche ›</small></li>` : `<li><i class="dot ${e.kind}"></i>${esc(e.label)}</li>`).join("")}</ul>`;
      box.querySelectorAll("[data-id]").forEach((li) => li.onclick = () => ouvrirFiche(li.dataset.id));
    }));
  }
  $("#cal-prev").onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); $("#cal-jour").hidden = true; renderCal(); };
  $("#cal-next").onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); $("#cal-jour").hidden = true; renderCal(); };

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

  const itemsDe = (c) => all.filter((i) => c === "Urgentes" ? i.gravite === "urgent" : i.categorie === c);

  function renderChips() {
    const nUrg = all.filter((i) => i.gravite === "urgent").length;
    $("#chips").innerHTML = `<button class="chip tout ${catActive ? "" : "active"}" data-c="">Tout le club</button>`
      + [...(nUrg ? ["Urgentes"] : []), ...catList()].map((c) => {
      const its = itemsDe(c);
      const urg = c !== "Urgentes" && its.some((i) => i.gravite === "urgent");
      return `<button class="chip ${c === catActive ? "active" : ""}" data-c="${esc(c)}" aria-pressed="${c === catActive}" title="${its.length} mention${its.length > 1 ? "s" : ""} dans les PV">${urg ? '<i class="dot urgent" title="Urgence en cours"></i>' : ""}${esc(c)}${its.length ? ` <small>${its.length}</small>` : ""}</button>`;
    }).join("");
    $("#chips").querySelectorAll(".chip").forEach((b) => b.onclick = () => {
      if (!b.dataset.c || b.dataset.c === catActive) { if (catActive) showTab("semaine"); } else ouvrirEquipe(b.dataset.c);
    });
    const act = $("#chips .chip.active");
    if (act) act.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function renderEquipe() {
    const c = catActive, its = itemsDe(c);
    const urg = its.filter((i) => i.gravite === "urgent").length;
    const att = its.filter((i) => i.gravite === "attention").length;
    const disc = its.filter((i) => i.type === "discipline" || i.type === "sanction").length;
    const ev = prochaines(its);
    const lastD = its.map((i) => i.pvDate).sort().pop();
    $("#eq-titre").textContent = c === "Urgentes" ? "Toutes les urgences du club" : c === "Club" ? "Club (administratif, général)" : `Équipe ${c}`;
    const nAm = (c === "Club" ? dossiers : dossiers.filter((d) => d.categorie === c)).reduce((t, d) => t + (+d.montant || 0), 0);
    const nMa = c === "Urgentes" || c === "Club" ? 0 : matchs.filter((m) => m.categorie === c && joursAvant(m.date) >= 0).length;
    // on n'affiche que les chiffres utiles (la mention reste toujours visible)
    $("#eq-stats").innerHTML = [
      [its.length, `mention${its.length > 1 ? "s" : ""} dans les PV`, "", true],
      [urg, `urgente${urg > 1 ? "s" : ""}`, "urgent"],
      [att, "à surveiller", "attention"],
      [ev.length, `échéance${ev.length > 1 ? "s" : ""} à venir`, ""],
      [nMa, `match${nMa > 1 ? "s" : ""} à venir`, ""],
      [disc, `dossier${disc > 1 ? "s" : ""} discipline`, ""],
      ...(c === "Urgentes" || !nAm ? [] : [[euros(nAm), "d'amendes", "", true]]),
    ].filter(([v, , , tjs]) => tjs || v).map(([v, l, k]) => `<div class="eq-stat ${k}"><b>${v}</b><span>${l}</span></div>`).join("")
      + (lastD ? `<p class="eq-last">Dernière mention : PV du ${fmtD(lastD)}</p>` : "");
    const urgView = c === "Urgentes", clubView = c === "Club";
    const ms = matchs.filter((m) => m.categorie === c);
    const avenir = ms.filter((m) => joursAvant(m.date) >= 0), passes = ms.filter((m) => joursAvant(m.date) < 0).slice(-3).reverse();
    $("#eq-matchs-bloc").hidden = urgView || clubView || !ms.length;
    $("#eq-matchs").innerHTML = matchsHTML(avenir.slice(0, 6));
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

  // Lecteur de PV
  function renderLecteur() {
    $("#lect-pv").innerHTML = data.pvs.map((pv) => `<option value="${pv.numero}">PV n°${pv.numero} du ${fmtD(pv.date)} (${pv.items.length} mention${pv.items.length > 1 ? "s" : ""})</option>`).join("");
    $("#lect-pv").onchange = () => lire(+$("#lect-pv").value, 1, false);
    $("#lect-page").onchange = () => lire(+$("#lect-pv").value, +$("#lect-page").value || 1, false);
    if (data.pvs[0]) lire(data.pvs[0].numero, 1, false);
  }
  function lire(num, page, ouvrir = true) {
    const pv = pvById[num]; if (!pv) return;
    $("#lect-pv").value = num; $("#lect-page").value = page;
    const fr = $("#lect-iframe"), cible = `${pv.url}#page=${page}`;
    if (fr.src !== cible) { fr.src = "about:blank"; setTimeout(() => { fr.src = cible; }, 30); }
    $("#lect-ext").href = `${pv.url}#page=${page}`;
    const its = all.filter((i) => i.pv === num).sort((a, b) => (a.page || 0) - (b.page || 0));
    $("#lect-fiches").innerHTML = `<h3>Mentions du club</h3>` + (its.map((i) => `<button class="lect-fiche ${esc(i.gravite)} ${i.page === page ? "on" : ""}" data-page="${i.page || 1}"><b>p. ${i.page || "?"}</b> · ${esc(i.categorie)}<br>${esc(i.titre)}</button>`).join("") || `<p class="empty">Aucune mention.</p>`);
    $("#lect-fiches").querySelectorAll(".lect-fiche").forEach((b) => b.onclick = () => lire(num, +b.dataset.page, false));
    if (ouvrir) { showTab("lecteur"); window.scrollTo({ top: 0, behavior: "smooth" }); }
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
      if (c === "Urgentes" || catList().includes(c)) return ouvrirEquipe(c, false);
    }
    if (["semaine", "calendrier", "historique", "lecteur"].includes(h)) showTab(h);
  }
})();
