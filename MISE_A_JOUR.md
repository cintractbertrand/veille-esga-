# Procédure de mise à jour hebdomadaire (jeudi soir)

Cette procédure est suivie par la tâche planifiée chaque jeudi soir.

1. Ouvrir la page des PV du District :
   https://lyon-rhone.fff.fr/category/commissions-2021-2022/
   (malgré son nom, c'est la page à jour). Repérer le dernier « PV Intégral » (date JJ-MM-AAAA, n° de PV, lien PDF).
2. Si ce numéro de PV est déjà dans `data/pv.json`, ou si le PV du jour n'est pas encore paru, ne rien modifier et s'arrêter.
3. **Source du texte :** si le PDF est dans `pv-pdf/` (Bertrand télécharge le PV depuis son navigateur, puis la tâche du PC le déplace des Téléchargements vers pv-pdf\ et le pousse le jeudi à 17h30 et 19h), lancer `python3 outils/lire_pv.py` puis `python3 outils/lire_pv.py <numero>` pour obtenir le texte complet et les passages qui citent le club, avec leur page. Sinon, lire le PDF avec WebFetch, qui ne couvre qu'environ les 27 premières pages.
   Lire tout le PDF et relever chaque passage qui concerne le club : « GENAS », « AZIEU », « ESGA », n° **523341**. **Ne pas relever** les plateaux du football d'animation (U7 à U13, plateaux de coupe du groupement, « Plateau des Copines »). Cela inclut en revanche les tableaux de sanctions (joueurs, dirigeants), les demandes de rapports, les convocations, les matchs perdus, les forfaits, les amendes, les homologations, les reports, les changements d'horaires, les coupes et tirages, la trésorerie, le futsal, le football féminin et les invitations.
4. Ajouter en tête de `pvs` dans `data/pv.json` un objet pour ce PV :
   - `numero`, `date` (AAAA-MM-JJ), `url`, `pages`
   - `resume` : 2 ou 3 phrases simples pour le club, avec le plus important d'abord.
   - `items[]` : une fiche par décision, avec les champs suivants.
     - `id` : « <numero>-<n> ».
     - `categorie` : « Club » si la fiche est générale, sinon Seniors, Seniors F, U19, U17, U15, U15F, U13, Futsal, Vétérans…
     - `commission` : Discipline, Règlements, Appel, Trésorerie, Compétitions, Coupes, Arbitrage, PSEM, Secrétariat…
     - `type` : discipline | sanction | reglement | tresorerie | match | homologation | observation | inscription | info
     - `inscription` : appel à inscription ou date limite d'engagement (coupes, tournois, futsal, formations) qui concerne le club, même sans citer Genas. La date limite va dans `echeances`. Ignorer les coupes des autres groupements (Genas est dans le Groupement Vallée du Rhône)..
     - `gravite` : `urgent` s'il y a une action du club à faire sous 7 jours ou une sanction lourde, `attention` s'il y a une amende, une suspension ou un délai, sinon `info`.
     - `titre` et `detail` : des phrases claires en français, avec le nom des joueurs ou la licence s'ils sont publiés, la durée de suspension, la date d'effet et le montant.
     - `match` (facultatif) : `numero`, `date`, `competition`, `domicile`, `exterieur`.
     - `echeances[]` : `date`, `heure` (facultatif), `libelle`. On y met les dates limites de rapport, les audiences, les fins de suspension, les délais de paiement et les dates de match à rejouer.
     - `page` : la page du PDF.
5. Lancer `python3 outils/extraire_pv.py` : il met à jour tout seul `data/matchs.json` (les matchs du club, tirés des annexes « Désignations par poule ») et `data/dossiers.json` (amendes et dossiers du club, tirés de « Dossiers par club »). Ne pas recopier ces éléments dans `pv.json`.
6. Mettre à jour `mis_a_jour`, vérifier que le JSON est valide (`python3 -m json.tool data/pv.json`), puis faire un commit « PV n°XXX du JJ/MM » et le pousser sur `main`. GitHub Pages republie le site tout seul.
7. Envoyer à Bertrand un court résumé de 3 lignes maximum avec le lien du site.

## Limites connues
- Le site du District refuse les téléchargements depuis le cloud et depuis GitHub Actions (403). C'est pour cela que le PC de Bertrand télécharge les PDF (`outils/telecharger-pv.ps1`, planifié par `outils/installer-veille.ps1`).
- Sans ces PDF, la lecture par WebFetch couvre environ les 27 premières pages de chaque PV. Les dernières pages contiennent surtout les plateaux U7-U13, qu'on ne suit pas, et les annexes de désignations.
