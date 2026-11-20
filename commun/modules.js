/* Bandeau commun des modules ESGA.
   Ajouter dans un module :
     <script src="https://cintractbertrand.github.io/veille-esga-/commun/modules.js" data-module="atelier" defer></script>
   data-module : accueil | console | pv | video | atelier | messagerie (le module courant est mis en avant).
   Pour changer l'adresse d'un module, modifier seulement la liste MODULES ci-dessous. */
(function () {
  const script = document.currentScript;
  const BASE = new URL("../", script ? script.src : location.href).href; // racine de veille-esga-

  const ICONES = {
    console: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-3v10l-6-3"/></svg>',
    pv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
    equipe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20"/></svg>',
    messagerie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14.5h4"/></svg>',
    atelier: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 9h3v6H3M21 9h-3v6h3"/><circle cx="12" cy="12" r="2.5"/></svg>',
  };

  const MODULES = [
    { id: "console", nom: "Console du club", court: "Console", url: BASE,
      desc: "Licenciés, éducateurs, équipes, calendrier, présences et convocations : tout le club au même endroit, partagé par tous les modules." },
    { id: "video", nom: "Analyse vidéo", court: "Vidéo", url: BASE + "analyse-video/",
      desc: "Revoir un match, marquer une joueuse, dessiner flèches et cercles sur l'image, monter des séquences et les envoyer." },
    { id: "pv", nom: "Lecture des PV du District", court: "PV District", url: BASE + "pv.html",
      desc: "Chaque semaine, tout ce que les PV du District disent du club : sanctions, échéances, matchs, amendes." },
    { id: "atelier", nom: "Atelier entraînements", court: "Entraînements", url: "https://cintractbertrand.github.io/atelier-foot/site/",
      desc: "Choisir des exercices, composer une séance, la partager et la suivre au bord du terrain." },
    { id: "messagerie", nom: "Messagerie d'équipe", court: "Messagerie", url: BASE + "messagerie/",
      desc: "Discuter avec les familles, recevoir les absences aux entraînements, sonder la présence au match, faire la compo et la convocation." },
    { id: "equipe", nom: "Gestion de l'équipe", court: "Équipe", url: "https://myfootsquad.com/", externe: true,
      desc: "Le site de Nico (MyFootSquad) : gestion des matchs, des absences et de l'équipe." },
  ];
  window.ESGA = { BASE, MODULES, ICONES };

  function bandeau() {
    if (document.querySelector(".esga-bar")) return;
    const courant = (script && script.dataset.module) || "";
    const bar = document.createElement("div");
    bar.className = "esga-bar";
    bar.innerHTML = `<div class="esga-bar-in">
      <a class="esga-accueil" href="${BASE}" title="Retour à l'accueil">
        <span class="esga-blason" aria-hidden="true">ES<small>GA</small></span>
        <span class="esga-nom">ESGA<small>Espace éducateurs</small></span>
      </a>
      <nav class="esga-mods" aria-label="Modules">
        ${MODULES.map((m) => `<a href="${m.url}"${m.id === courant ? ' aria-current="page"' : ""}${m.externe ? ' target="_blank" rel="noopener"' : ""} title="${m.nom}${m.externe ? " (nouvel onglet)" : ""}">${ICONES[m.id]}<span>${m.court}</span></a>`).join("")}
      </nav>
    </div>`;
    document.body.prepend(bar);
  }
  if (!script || script.dataset.bandeau !== "non") {
    if (document.body) bandeau(); else document.addEventListener("DOMContentLoaded", bandeau);
  }
})();
