-- Schéma Supabase du socle commun ESGA (Console du club, Messagerie, Monteur, PV).
-- PRÉPARÉ, NON APPLIQUÉ : rien n'est branché tant que Bertrand ne l'a pas validé.
-- Les noms de champs reprennent ceux de commun/club.js : pour basculer, il suffira de
-- remplacer l'objet STOCKAGE de ce fichier par des appels Supabase sur ces tables.
-- À créer dans le même projet Supabase que l'Atelier entraînements (choix de Bertrand).

create extension if not exists "pgcrypto";

-- Saison et club ------------------------------------------------------------
create table if not exists club (
  id          smallint primary key default 1 check (id = 1),
  nom         text not null default 'ES Genas Azieu',
  numero      text not null default '523341',
  ville       text, email text,
  lieux       text[] not null default '{}',
  saison      text not null default '2026-2027'
);

create table if not exists equipes (
  id          text primary key,              -- ex. 'U15F-2' (catégorie-numéro, comme les PV)
  categorie   text not null,
  numero      int  not null,
  nom         text not null,                 -- affiché : 'U15F', 'Seniors 2'
  genre       text not null check (genre in ('M','F','X')),
  format      int  not null default 11,      -- foot à 4, 5, 8 ou 11
  saison      text not null default '2026-2027'
);

-- Personnes ------------------------------------------------------------------
create table if not exists personnes (           -- licenciés (joueurs et joueuses)
  id          text primary key default gen_random_uuid()::text,
  prenom      text not null, nom text not null,
  genre       text check (genre in ('M','F')),
  naissance   date,
  equipe      text references equipes(id) on delete set null,
  numero      int, poste text,
  licence     jsonb not null default '{"numero":"","statut":"en_attente"}',  -- statut : validee | en_attente | a_renouveler
  certificat  text not null default 'a_fournir' check (certificat in ('ok','a_fournir')),
  tel text, email text,
  contacts    jsonb not null default '[]',      -- [{nom, lien, tel, email}] responsables légaux
  notes       text default '',
  compte      uuid references auth.users(id)    -- compte de la famille ou du joueur majeur (connexion)
);

create table if not exists staff (               -- éducateurs et bureau
  id          text primary key default gen_random_uuid()::text,
  prenom      text not null, nom text not null,
  role        text not null check (role in ('president','secretaire','tresorier','dirigeant','coach','adjoint')),
  fonction    text default '',
  equipes     text[] not null default '{}',
  tel text, email text, diplome text,
  compte      uuid references auth.users(id)
);

-- Calendrier -----------------------------------------------------------------
create table if not exists creneaux (            -- entraînements hebdomadaires
  id text primary key default gen_random_uuid()::text,
  equipe text not null references equipes(id) on delete cascade,
  jour int not null check (jour between 0 and 6), heure time not null, duree int not null default 90, lieu text
);

create table if not exists evenements (          -- événements saisis dans la console (amical, plateau, réunion…)
  id text primary key default gen_random_uuid()::text,
  equipe text references equipes(id) on delete cascade,  -- null = tout le club
  type text not null check (type in ('entrainement','amical','plateau','tournoi','reunion','autre')),
  titre text not null, date date not null, heure time not null, duree int default 90, lieu text, notes text,
  statut text not null default 'prevu' check (statut in ('prevu','annule'))
);

-- Les matchs officiels restent lus dans data/matchs.json (issu des PV) ;
-- les séances des créneaux sont calculées. Leurs modifications ponctuelles vont ici :
create table if not exists exceptions (
  evenement text primary key,                    -- 'm-<numéro FFF>' ou 'e-<créneau>-<date>'
  champs jsonb not null                          -- {statut:'annule'} ou {date, heure, lieu}
);

-- Convocations, présences, disponibilités -------------------------------------
create table if not exists convocations (
  id text primary key default gen_random_uuid()::text,
  evenement text not null, equipe text references equipes(id) on delete cascade,
  joueurs text[] not null, rdv_heure time, rdv_lieu text, tenue text, mot text,
  source text not null default 'console' check (source in ('console','messagerie')),
  publiee timestamptz not null default now()
);

create table if not exists presences (           -- appel des entraînements
  evenement text not null, personne text not null references personnes(id) on delete cascade,
  statut text not null check (statut in ('present','retard','excuse','absent')),
  primary key (evenement, personne)
);

create table if not exists dispos (              -- absences signalées, réponses au sondage, empêchements
  evenement text not null, personne text not null references personnes(id) on delete cascade,
  statut text not null check (statut in ('absent','incertain')),
  motif text, precision text, par text, date timestamptz default now(),
  primary key (evenement, personne)
);

-- Messagerie (aujourd'hui dans messagerie/stockage.js, même logique) ---------------
create table if not exists conversations (
  id text primary key default gen_random_uuid()::text,
  equipe text references equipes(id) on delete cascade,
  type text not null check (type in ('equipe','groupe','perso')), nom text, annonces boolean default false,
  membres text[] not null, cree_par text, epingle text, date timestamptz default now()
);
create table if not exists messages (
  id text primary key default gen_random_uuid()::text,
  conv text not null references conversations(id) on delete cascade,
  auteur text not null, date timestamptz not null default now(),
  type text not null, contenu jsonb not null default '{}'   -- texte, photo, sondage, absence, convocation…
);

-- Droits (RLS) -----------------------------------------------------------------
-- Bureau : tout. Éducateur : ses équipes. Famille : son enfant et les conversations dont elle est membre.
create or replace function est_bureau() returns boolean language sql stable as $$
  select exists (select 1 from staff where compte = auth.uid() and role in ('president','secretaire','tresorier','dirigeant')) $$;
create or replace function mes_equipes() returns text[] language sql stable as $$
  select coalesce(array_agg(distinct e), '{}') from staff, unnest(equipes) e where compte = auth.uid() $$;

alter table personnes enable row level security;
create policy "bureau" on personnes for all using (est_bureau()) with check (est_bureau());
create policy "educateur lit et modifie ses joueurs" on personnes for all using (equipe = any(mes_equipes())) with check (equipe = any(mes_equipes()));
create policy "famille lit sa fiche" on personnes for select using (compte = auth.uid());

alter table presences enable row level security;
create policy "staff" on presences for all using (est_bureau() or exists (select 1 from personnes p where p.id = personne and p.equipe = any(mes_equipes())));

alter table dispos enable row level security;
create policy "staff" on dispos for all using (est_bureau() or exists (select 1 from personnes p where p.id = personne and p.equipe = any(mes_equipes())));
create policy "famille signale" on dispos for all using (exists (select 1 from personnes p where p.id = personne and p.compte = auth.uid()));

alter table convocations enable row level security;
create policy "staff" on convocations for all using (est_bureau() or equipe = any(mes_equipes()));
create policy "famille lit" on convocations for select using (exists (select 1 from personnes p where p.compte = auth.uid() and p.equipe = convocations.equipe));
-- (mêmes principes à décliner pour staff, equipes, creneaux, evenements, conversations, messages)
