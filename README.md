# Veille PV ESGA

Synthèse hebdomadaire des procès-verbaux du District de Lyon et du Rhône de football pour l'**ES Genas Azieu** (n° 523341).

- `index.html`, `style.css`, `app.js` : le site statique, publié par GitHub Pages depuis la racine de `main`.
- `data/pv.json` : les données, avec une entrée par PV et une fiche par mention du club.
- `MISE_A_JOUR.md` : la procédure suivie chaque jeudi soir pour ajouter le nouveau PV.

Le site propose les vues suivantes :
- Cette semaine : le résumé, les échéances à venir et toutes les mentions du club.
- Calendrier : la vue par mois, avec un export `.ics` pour l'agenda.
- Par catégorie : un bilan pour chaque catégorie, avec un filtre et une recherche.
- Historique : tous les PV, semaine par semaine.

Pour tester le site en local : `python3 -m http.server`, puis ouvrir http://localhost:8000.
