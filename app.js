(() => {
  const $ = (s) => document.querySelector(s);
  const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const MOIS_C = ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
  const JOURS = ["lun","mar","mer","jeu","ven","sam","dim"];
  const GRAV_ORDRE = { urgent: 0, attention: 1, info: 2 };
  const CAT_ORDRE = ["Club","Seniors","Seniors F","U20","U19","U18","U17","U16","U15","U15F","U14","U13","U13F","U12","U11","U10","U9","U8","U7","Futsal","Vétérans","Foot loisir"];

  const parseD = (s) => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
  const isoD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const fmtD = (s) => { const d = parseD(s); return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`; };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const today = new Date(); today.setHours(0,0,0,0);
  const joursAvant = (s) => Math.round((parseD(s) - today) / 86400000);

  let data, all = [], pvById = {};
  let calMonth, catActive = "Toutes", query = "";

  fetch("data/pv.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((j) => { data = j; init(); })
    .catch(() => { $("#pv-courant").textContent = "Impossible de charger les données."; });

  function init() {
    data.pvs.sort((a, b) => b.date.localeCompare(a.date));
    data.pvs.forEach((pv) => {
      pvById[pv.numero] = pv;
      pv.items.forEach((it) => all.push({ ...it, pv: pv.numero, pvDate: pv.date, pvUrl: pv.url }));
    });
    const last = data.pvs[0];
    $("#club-nom").textContent = data.club.nom;
    $("#pv-courant").innerHTML = last
      ? `Dernier PV : <a href="${esc(last.url)}" target="_blank" rel="noopener">n°${last.numero} du ${fmtD(last.date)}</a> · club n°${esc(data.club.numero)}`
      : "Aucun PV pour l'instant.";
    calMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderStats(last);
    renderSemaine(last);
    renderCal();
    renderCats();
    renderTimeline();
    bindTabs();
  }

  function renderStats(last) {
    const items = last ? last.items : [];
    const n = (g) => items.filter((i) => i.gravite === g).length;
    const avenir = all.flatMap((i) => i.echeances || []).filter((e) => joursAvant(e.date) >= 0).length;
    $("#stats").innerHTML = [
      [items.length, "mentions cette semaine"],
      [n("urgent"), "urgentes"],
      [avenir, "échéances à venir"],
      [data.pvs.length, "PV suivis"],
    ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");
  }

  function itemHTML(it, showPv) {
    const m = it.match;
    const match = m ? `<p class="match">⚽ <b>${esc(m.domicile)}</b> – <b>${esc(m.exterieur)}</b> · ${esc(m.competition || "")}${m.date ? " · " + fmtD(m.date) : ""}${m.numero ? " · match n°" + esc(m.numero) : ""}</p>` : "";
    const ech = (it.echeances || []).map((e) => `<span class="badge ${joursAvant(e.date) >= 0 && joursAvant(e.date) <= 7 ? "urgent" : ""}">📅 ${fmtD(e.date)}${e.heure ? " " + e.heure.replace(":", "h") : ""}</span>`).join("");
    return `<article class="item ${esc(it.gravite)}">
      <div class="meta"><span class="badge cat">${esc(it.categorie)}</span><span class="badge">${esc(it.commission)}</span>${it.gravite !== "info" ? `<span class="badge ${esc(it.gravite)}">${it.gravite === "urgent" ? "Urgent" : "À surveiller"}</span>` : ""}${ech}</div>
      <h3>${esc(it.titre)}</h3>
      ${match}
      <p>${esc(it.detail)}</p>
      <p class="src">Source : <a href="${esc(it.pvUrl)}${it.page ? "#page=" + it.page : ""}" target="_blank" rel="noopener">PV n°${it.pv}${it.page ? ", page " + it.page : ""}</a>${showPv ? " du " + fmtD(it.pvDate) : ""}</p>
    </article>`;
  }

  const sortItems = (a, b) => (GRAV_ORDRE[a.gravite] - GRAV_ORDRE[b.gravite]) || b.pvDate.localeCompare(a.pvDate);

  function renderSemaine(last) {
    if (!last) return;
    $("#resume").innerHTML = `<strong>En bref, PV n°${last.numero} :</strong> ${esc(last.resume)}`;
    const items = all.filter((i) => i.pv === last.numero).sort(sortItems);
    $("#items-semaine").innerHTML = items.map((i) => itemHTML(i)).join("") || `<p class="empty">Aucune mention du club cette semaine 🎉</p>`;
    const ev = all.flatMap((i) => (i.echeances || []).map((e) => ({ ...e, it: i })))
      .filter((e) => joursAvant(e.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.heure || "").localeCompare(b.heure || ""));
    $("#a-venir").innerHTML = ev.map((e) => {
      const d = parseD(e.date), j = joursAvant(e.date);
      const cls = j <= 4 ? "urgent" : j <= 10 ? "attention" : "";
      const cd = j === 0 ? "aujourd'hui" : j === 1 ? "demain" : `dans ${j} jours`;
      return `<li class="echeance"><div class="date-pill"><b>${d.getDate()}</b><span>${MOIS_C[d.getMonth()]}</span></div>
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
      box.innerHTML = `<strong>${fmtD(el.dataset.d)}</strong><ul>${ev.map((e) => `<li><i class="dot ${e.kind}"></i>${esc(e.label)} <small>(PV n°${e.it.pv})</small></li>`).join("")}</ul>`;
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
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "echeances-esga.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  function catList() {
    const cats = [...new Set(all.map((i) => i.categorie))];
    const idx = (c) => { const i = CAT_ORDRE.indexOf(c); return i < 0 ? 99 : i; };
    return cats.sort((a, b) => idx(a) - idx(b) || a.localeCompare(b));
  }

  function renderCats() {
    const cats = catList();
    $("#chips").innerHTML = ["Toutes", ...cats].map((c) => {
      const n = c === "Toutes" ? all.length : all.filter((i) => i.categorie === c).length;
      return `<button class="chip ${c === catActive ? "active" : ""}" data-c="${esc(c)}">${esc(c)} <small>${n}</small></button>`;
    }).join("");
    $("#chips").querySelectorAll(".chip").forEach((b) => b.onclick = () => { catActive = b.dataset.c; renderCats(); });

    $("#cat-cards").innerHTML = catActive !== "Toutes" ? "" : cats.map((c) => {
      const its = all.filter((i) => i.categorie === c);
      const urg = its.filter((i) => i.gravite === "urgent").length;
      const lastD = its.map((i) => i.pvDate).sort().pop();
      const disc = its.filter((i) => i.type === "discipline" || i.type === "sanction").length;
      return `<div class="cat-card" data-c="${esc(c)}"><h3>${esc(c)}</h3>
        <p>${its.length} mention${its.length > 1 ? "s" : ""}${urg ? ` · <span style="color:var(--urgent)">${urg} urgente${urg > 1 ? "s" : ""}</span>` : ""}</p>
        <p>${disc} dossier${disc > 1 ? "s" : ""} discipline</p>
        <p>Dernière : ${fmtD(lastD)}</p></div>`;
    }).join("");
    $("#cat-cards").querySelectorAll(".cat-card").forEach((el) => el.onclick = () => { catActive = el.dataset.c; renderCats(); });

    const q = query.trim().toLowerCase();
    const items = all.filter((i) => catActive === "Toutes" || i.categorie === catActive)
      .filter((i) => !q || JSON.stringify(i).toLowerCase().includes(q))
      .sort((a, b) => b.pvDate.localeCompare(a.pvDate) || sortItems(a, b));
    $("#items-cat").innerHTML = items.map((i) => itemHTML(i, true)).join("") || `<p class="empty">Aucun résultat.</p>`;
  }
  $("#recherche").addEventListener("input", (e) => { query = e.target.value; renderCats(); });

  function renderTimeline() {
    $("#timeline").innerHTML = data.pvs.map((pv, k) => {
      const its = all.filter((i) => i.pv === pv.numero).sort(sortItems);
      return `<li><details ${k === 0 ? "open" : ""}><summary class="card"><strong>PV n°${pv.numero}</strong> · ${fmtD(pv.date)} · ${its.length} mention${its.length > 1 ? "s" : ""}
        <br><small>${esc(pv.resume)}</small><br><a href="${esc(pv.url)}" target="_blank" rel="noopener">Ouvrir le PDF</a></summary>
        <div class="items">${its.map((i) => itemHTML(i)).join("") || `<p class="empty">Aucune mention.</p>`}</div></details></li>`;
    }).join("");
  }

  function bindTabs() {
    const show = (t) => {
      document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
      document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + t));
    };
    document.querySelectorAll(".tab").forEach((b) => b.onclick = () => { show(b.dataset.tab); history.replaceState(null, "", "#" + b.dataset.tab); });
    const h = location.hash.slice(1);
    if (["semaine", "calendrier", "categories", "historique"].includes(h)) show(h);
  }
})();
