/* Stockage de la messagerie : un état par équipe.
   Démo : gardé dans ce navigateur (les onglets se synchronisent, on peut jouer le coach dans
   un onglet et un parent dans un autre).
   En ligne (code du club saisi) : chaque équipe est un document 'messagerie:<équipe>' partagé
   par Supabase, via CLUB.enLigne (commun/club.js) ; ce navigateur en garde une copie. */
(function () {
  const PREFIXE = "esga-messagerie:";
  const N = () => window.CLUB && window.CLUB.enLigne;
  const ecoutes = [];
  const local = (equipe) => { try { return JSON.parse(localStorage.getItem(PREFIXE + equipe)) || null; } catch (e) { return null; } };
  const garder = (equipe, etat) => { try { localStorage.setItem(PREFIXE + equipe, JSON.stringify(etat)); } catch (e) { /* stockage indisponible */ } };
  function suivre(equipe) {
    const n = N(); if (!n || !n.actif) return;
    n.suivre("messagerie:" + equipe, () => local(equipe), (etat) => { garder(equipe, etat); ecoutes.forEach((cb) => cb(equipe)); });
  }
  window.STOCKAGE = {
    get mode() { const n = N(); return n && n.actif ? "en-ligne" : "demo"; },
    lire(equipe) { suivre(equipe); return local(equipe); },
    ecrire(equipe, etat) { garder(equipe, etat); suivre(equipe); const n = N(); if (n) n.marquer("messagerie:" + equipe); },
    effacer(equipe) {
      try { localStorage.removeItem(PREFIXE + equipe); } catch (e) {}
    },
    // Appelé quand un autre onglet, ou un autre appareil, modifie l'équipe
    surChangement(cb) {
      ecoutes.push(cb);
      window.addEventListener("storage", (ev) => {
        if (ev.key && ev.key.startsWith(PREFIXE)) cb(ev.key.slice(PREFIXE.length));
      });
    },
  };
})();
