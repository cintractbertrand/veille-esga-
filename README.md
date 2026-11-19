# Veille PV ESGA

Synthèse hebdomadaire des procès-verbaux du District de Lyon et du Rhône de football pour l'**ES Genas Azieu** (n° 523341).

- `index.html`, `style.css`, `app.js` : le site statique, publié par GitHub Pages depuis la racine de `main`.
- `data/pv.json` : les données, avec une entrée par PV et une fiche par mention du club.
- `MISE_A_JOUR.md` : la procédure suivie chaque jeudi soir pour ajouter le nouveau PV.

En haut du site, la barre « Mon équipe » donne accès directement à chaque catégorie (Seniors, U17, Vétérans, Club…) : ses prochains matchs, ses échéances, ses amendes et toutes ses mentions dans les PV, avec une recherche. Chaque équipe a son propre lien, par exemple `#equipe/U17`.

Les onglets proposent ensuite les vues de tout le club :
- Cette semaine : le résumé, les échéances à venir et toutes les mentions du club.
- Calendrier : la vue par mois, avec un export `.ics` pour l'agenda.
- Historique : tous les PV, semaine par semaine.
- Lecteur PV : le PDF du PV, avec la liste des pages qui concernent le club.

Pour tester le site en local : `python3 -m http.server`, puis ouvrir http://localhost:8000.
