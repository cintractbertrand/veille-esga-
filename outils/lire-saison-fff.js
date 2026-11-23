/* À exécuter dans la page « Saison » d'une équipe sur epreuves.fff.fr (navigateur de Bertrand).
   Range les matchs de l'équipe dans localStorage["esga_cal"], puis exporter-fff.js les télécharge. */
(async () => {
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 40 && !document.querySelector("app-match-score"); i++) await pause(250);
  for (let i = 0; i < 6; i++) { window.scrollTo(0, document.body.scrollHeight); await pause(400); }
  const MOIS = { JAN: "01", FÉV: "02", FEV: "02", MAR: "03", AVR: "04", MAI: "05", JUN: "06", JUI: "07", JUL: "07", AOÛ: "08", AOU: "08", SEP: "09", OCT: "10", NOV: "11", DÉC: "12", DEC: "12" };
  const eq = location.pathname.split("/equipe/")[1].split("/")[0];
  const titre = document.title.split("|")[1]?.trim() || "";
  const liste = ([...document.querySelectorAll("app-match-score")].map((c) => {
    const l = c.innerText.split("\n").map((s) => s.trim()).filter(Boolean);
    const d = (l[0] || "").match(/(\d{1,2}) (\S+) (\d{4}) - (\d\d)H(\d\d)/);
    if (!d) return null;
    const lien = c.querySelector('a[href*="/competition/match/"]');
    const [comp, tour] = (l[1] || "").split(/ - (?=[^-]*$)/);
    const milieu = l.slice(3, -1), scores = milieu.filter((s) => /^\d+$/.test(s));
    return {
      numero: lien ? lien.getAttribute("href").split("/").pop().split("-")[0] : null,
      date: `${d[3]}-${MOIS[d[2].slice(0, 3).toUpperCase()] || "??"}-${d[1].padStart(2, "0")}`,
      heure: `${d[4]}:${d[5]}`,
      competition: comp, tour: tour || "", domicile: l[2], exterieur: l[l.length - 1],
      score: scores.length === 2 ? scores.map(Number) : null,
      note: milieu.filter((s) => !/^\d+$/.test(s) && !/^\d\d:\d\d$/.test(s)).join(" ") || undefined,
      equipe_fff: eq, nom_equipe: titre,
    };
  }).filter(Boolean));
  const tout = JSON.parse(localStorage.getItem("esga_cal") || "{}");
  tout[eq] = liste; localStorage.setItem("esga_cal", JSON.stringify(tout));
  return eq + " : " + liste.length + " matchs (" + Object.keys(tout).length + " équipes en mémoire)";
})();
