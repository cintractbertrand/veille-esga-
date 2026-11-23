/* À exécuter dans la page « Saison » d'une équipe sur epreuves.fff.fr (Chrome de Bertrand).
   Range les matchs de l'équipe dans localStorage["esga_cal2"] (une clé par équipe FFF). */
(async () => {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  // La page se remplit en plusieurs fois : on attend que le nombre de matchs ne bouge plus.
  let n = -1, stable = 0;
  for (let i = 0; i < 60 && stable < 5; i++) {
    window.scrollTo(0, document.body.scrollHeight); await pause(400);
    const k = document.querySelectorAll("app-match-score").length;
    stable = k && k === n ? stable + 1 : 0; n = k;
  }
  const MOIS = { JAN: "01", FÉV: "02", FEV: "02", MAR: "03", AVR: "04", MAI: "05", JUN: "06", JUI: "07", JUL: "07", AOÛ: "08", AOU: "08", SEP: "09", OCT: "10", NOV: "11", DÉC: "12", DEC: "12" };
  // Textes de la carte, un par nœud (marche aussi pour les cartes masquées « dernier / prochain match »).
  const lignes = (c) => { const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT), o = []; while (w.nextNode()) { const t = w.currentNode.textContent.trim(); if (t) o.push(t); } return o; };
  const eq = location.pathname.split("/equipe/")[1].split("/")[0];
  const titre = document.title.split("|")[1]?.trim() || "";
  const vus = new Set();
  const liste = [...document.querySelectorAll("app-match-score")].map((c) => {
    const l = lignes(c);
    const d = (l[0] || "").match(/(\d{1,2}) (\S+) (\d{4}) - (\d\d)h(\d\d)/i);
    if (!d || l.length < 5) return null;
    const lien = c.querySelector('a[href*="/competition/match/"]');
    const milieu = l.slice(4, -1), scores = milieu.filter((s) => /^\d+$/.test(s));
    return {
      numero: lien ? lien.getAttribute("href").split("/").pop().split("-")[0] : null,
      date: `${d[3]}-${MOIS[d[2].slice(0, 3).toUpperCase()] || "??"}-${d[1].padStart(2, "0")}`,
      heure: `${d[4]}:${d[5]}`,
      competition: l[1].split(" - ")[0].trim(), tour: l[2], domicile: l[3], exterieur: l[l.length - 1],
      score: scores.length >= 2 ? scores.slice(0, 2).map(Number) : null,
      note: milieu.filter((s) => !/^\d+$/.test(s) && !/^\d\d:\d\d$/.test(s)).join(" ") || undefined,
      equipe_fff: eq, nom_equipe: titre,
    };
  }).filter((m) => m && !vus.has(m.numero || m.date + m.domicile) && vus.add(m.numero || m.date + m.domicile))
    .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
  const tout = JSON.parse(localStorage.getItem("esga_cal2") || "{}");
  tout[eq] = liste; localStorage.setItem("esga_cal2", JSON.stringify(tout));
  return eq + " : " + liste.length + " matchs (" + Object.keys(tout).length + " équipes en mémoire)";
})();
