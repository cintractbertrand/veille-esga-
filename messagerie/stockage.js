/* Stockage de la messagerie.
   Version démo : tout est gardé dans le navigateur (localStorage), rien n'est partagé
   entre appareils. Les onglets d'un même navigateur se synchronisent entre eux, ce qui
   permet de jouer le coach dans un onglet et un parent dans un autre.
   Pour une vraie messagerie partagée, il suffira de remplacer cet objet par une version
   Firebase qui offre les mêmes fonctions : lire, ecrire, surChangement. */
(function () {
  const PREFIXE = "esga-messagerie:";
  window.STOCKAGE = {
    mode: "demo",
    lire(equipe) {
      try { return JSON.parse(localStorage.getItem(PREFIXE + equipe)) || null; } catch (e) { return null; }
    },
    ecrire(equipe, etat) {
      try { localStorage.setItem(PREFIXE + equipe, JSON.stringify(etat)); } catch (e) { /* stockage indisponible */ }
    },
    effacer(equipe) {
      try { localStorage.removeItem(PREFIXE + equipe); } catch (e) {}
    },
    // Appelé quand un autre onglet modifie l'équipe
    surChangement(cb) {
      window.addEventListener("storage", (ev) => {
        if (ev.key && ev.key.startsWith(PREFIXE)) cb(ev.key.slice(PREFIXE.length));
      });
    },
  };
})();
