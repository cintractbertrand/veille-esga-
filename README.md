# Veille PV ESGA

Synthèse hebdomadaire des procès-verbaux du District de Lyon et du Rhône de football pour l'**ES Genas Azieu** (n° 523341).

- `index.html` : la page d'accueil de l'Espace éducateurs (Analyse vidéo, Lecture des PV, Atelier entraînements).
- `commun/charte.css` et `commun/modules.js` : la charte graphique commune et le bandeau des modules, repris par tous les modules (y compris le dépôt `atelier-foot`, par leur adresse en ligne). Les adresses des modules se changent dans la liste `MODULES` de `commun/modules.js`.
- `analyse-video/` : la version en ligne du Monteur vidéo (copie de `montage/web/` du projet analyse-veo du PC). `demo/demo.js` remplace le serveur du PC par une démo dans le navigateur, avec une minute du match contre La Duchère (`demo/duchere.mp4`), des joueuses marquées, 3 séquences et des dessins. La fabrication des vidéos, le suivi et la détection restent sur le PC.
- `messagerie/` : la messagerie d'équipe, façon WhatsApp (démo dans le navigateur, ou en ligne avec le code du club) : conversations (Annonces et Blabla de l'équipe, groupes créés par le staff, discussions perso), sondages, absences signalées depuis la conversation. Le coach a en plus un Espace coach : sondage du match, convocation générale (sans postes, décidés le jour même par l’entraîneur), feuilles de présence. Version pro : répondre à un message, réactions, photos, suppression, message épinglé, accusés de lecture (✓✓), séparateur « nouveaux messages », groupe d'annonces où seul le coach écrit, panneau « Cette semaine » pour les parents et « À faire » pour le coach, empêchement signalé après la convocation. Qui écrit : le profil choisi à l'accueil (parent, joueuse, coach, dirigeant), signé du nom de l'éducateur ; en démo seulement, le staff peut « voir comme » une famille. Toutes les rencontres à venir (matchs des PV, amicaux, plateaux et tournois de la console) sont suivies, pas seulement la prochaine ; le sondage s'ouvre 10 jours avant, avec les mêmes mots partout (Présent, Peut-être, Absent), et la convocation respecte la règle 14 à 11 / 11 à 8. `stockage.js` partage chaque équipe par Supabase quand le code du club est saisi.
- `pv.html`, `style.css`, `app.js` : le module Lecture des PV, publié par GitHub Pages depuis la racine de `main`. Les anciens liens `#…` vers la racine sont renvoyés vers `pv.html`.
- `data/pv.json` : les données, avec une entrée par PV et une fiche par mention du club.
- `MISE_A_JOUR.md` : la procédure suivie chaque jeudi soir pour ajouter le nouveau PV.

En haut du site, la barre « Mon équipe » donne accès directement à chaque catégorie (Seniors, U17, Vétérans, Club…) : ses prochains matchs, ses échéances, ses amendes et toutes ses mentions dans les PV, avec une recherche. Chaque équipe a son propre lien, par exemple `#equipe/U17`.

Les onglets proposent ensuite les vues de tout le club :
- Cette semaine : le résumé, les échéances à venir et toutes les mentions du club.
- Calendrier : les matchs du club et les échéances des PV, mois par mois, avec un filtre par équipe, l'agenda du mois et un export `.ics`.
- Historique : tous les PV, semaine par semaine.
- Lecteur PV : le PDF du PV (copie de `pv-pdf/`, car le District interdit l'affichage de ses PDF dans une autre page), affiché avec PDF.js (`vendor/pdfjs/`). Les passages qui citent Genas Azieu sont surlignés, et la liste des pages qui citent le club est dressée automatiquement.

Pour tester le site en local : `python3 -m http.server`, puis ouvrir http://localhost:8000.

À chaque modification de `app.js` ou `style.css`, changer le numéro `?v=` dans `pv.html` pour que les navigateurs rechargent les fichiers.

## Console du club (`console/`) et socle commun (`commun/club.js`)

La console est la page d'accueil du site (racine ; `console/` renvoie vers la racine). Elle gère licenciés, éducateurs, équipes, créneaux, calendrier (matchs des PV + entraînements + événements), présences et convocations. Vue dirigeant (tout le club) ou vue coach (ses équipes), au choix en haut de la page.

`commun/club.js` est le socle partagé : la messagerie, le Monteur vidéo et la lecture des PV y lisent l'effectif, les séances, les matchs et les convocations. En démo, tout reste dans le navigateur. Le schéma Supabase prévu est dans `supabase/schema.sql` (non appliqué) : pour basculer, remplacer seulement l'objet `STOCKAGE` de `commun/club.js`.
