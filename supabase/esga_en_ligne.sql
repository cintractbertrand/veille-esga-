-- Club ESGA en ligne : console, messagerie, vidéos et séances partagées entre tous les appareils.
-- À lancer UNE FOIS dans Supabase > SQL Editor, dans le même projet que l'Atelier entraînements.
--
-- AVANT de lancer : remplace CODE_STAFF_ICI et CODE_FAMILLES_ICI (plus bas) par les deux codes choisis.
--   - code staff    : coachs, dirigeants. Tout voir, tout modifier.
--   - code familles : parents et joueuses. Réponses aux matchs, absences, messagerie, vidéos.
--                     Les téléphones, adresses, dates de naissance et notes des autres restent cachés.
-- Si les deux codes sont identiques, tout le monde a l'accès staff (choix de départ de Bertrand, 20/11/2026).
-- Les codes sont stockés chiffrés : ils n'apparaissent nulle part en clair, ni dans le site ni sur GitHub.
-- Pour changer un code plus tard : relance seulement le bloc « insert into public.esga_reglage … ».

create extension if not exists pgcrypto with schema extensions;

-- Un document par sujet : 'club' (licenciés, calendrier, convocations…) et 'messagerie:<équipe>'.
create table if not exists public.esga_etat (
  cle     text primary key,
  data    jsonb not null,
  version bigint not null default 1,
  maj     timestamptz not null default now()
);
alter table public.esga_etat enable row level security;   -- aucun accès direct : seulement les fonctions ci-dessous

create table if not exists public.esga_reglage (cle text primary key, valeur text not null);
alter table public.esga_reglage enable row level security;

insert into public.esga_reglage (cle, valeur) values
  ('code_staff',    extensions.crypt('CODE_STAFF_ICI',    extensions.gen_salt('bf'))),
  ('code_familles', extensions.crypt('CODE_FAMILLES_ICI', extensions.gen_salt('bf')))
on conflict (cle) do update set valeur = excluded.valeur;

-- Rôle donné par un code : 'staff', 'famille' ou null
create or replace function public.esga_role(code text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select case
    when exists (select 1 from esga_reglage where cle = 'code_staff'    and valeur = crypt(code, valeur)) then 'staff'
    when exists (select 1 from esga_reglage where cle = 'code_familles' and valeur = crypt(code, valeur)) then 'famille'
  end;
$$;

-- Ce qu'une famille voit du document 'club' : sans coordonnées ni notes privées
create or replace function public.esga_pour_famille(d jsonb) returns jsonb
language sql immutable as $$
  select d
    || jsonb_build_object('personnes', coalesce((
         select jsonb_agg((p - 'tel' - 'email' - 'contacts' - 'notes' - 'naissance')
                || jsonb_build_object('licence', jsonb_build_object('statut', p->'licence'->'statut')))
         from jsonb_array_elements(coalesce(d->'personnes', '[]')) p), '[]'::jsonb))
    || jsonb_build_object('feuilles', coalesce((
         select jsonb_object_agg(k, v - 'notes') from jsonb_each(coalesce(d->'feuilles', '{}')) as f(k, v)), '{}'::jsonb));
$$;

-- Lire un ou plusieurs documents : { cle: { data, version } }
create or replace function public.esga_lire(code text, cles text[]) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare r text := esga_role(code); res jsonb := '{}';
begin
  if r is null then raise exception 'code du club incorrect'; end if;
  select coalesce(jsonb_object_agg(cle, jsonb_build_object(
           'data', case when r = 'famille' and cle = 'club' then esga_pour_famille(data) else data end,
           'version', version)), '{}')
    into res from esga_etat where cle = any(cles);
  return res || jsonb_build_object('_role', r);
end $$;

-- Versions seules : chaque appareil regarde toutes les 15 s si quelque chose a changé
create or replace function public.esga_versions(code text, cles text[]) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare r text := esga_role(code);
begin
  if r is null then raise exception 'code du club incorrect'; end if;
  return coalesce((select jsonb_object_agg(cle, version) from esga_etat where cle = any(cles)), '{}') || jsonb_build_object('_role', r);
end $$;

-- Écrire un document entier (le staff partout, les familles seulement dans la messagerie).
-- version = celle lue avant de modifier ; si quelqu'un a écrit entre-temps : erreur « conflit », on relit et on fusionne.
create or replace function public.esga_ecrire(code text, cle_ text, data_ jsonb, version_ bigint) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare r text := esga_role(code); v bigint;
begin
  if r is null then raise exception 'code du club incorrect'; end if;
  if r <> 'staff' and cle_ not like 'messagerie:%' then raise exception 'réservé au staff'; end if;
  if length(data_::text) > 4000000 then raise exception 'document trop gros'; end if;
  select version into v from esga_etat where cle = cle_ for update;
  if v is null then
    if version_ <> 0 then raise exception 'conflit'; end if;
    insert into esga_etat (cle, data, version) values (cle_, data_, 1); return 1;
  end if;
  if v <> version_ then raise exception 'conflit'; end if;
  update esga_etat set data = data_, version = v + 1, maj = now() where cle = cle_;
  return v + 1;
end $$;

-- Ce qu'une famille peut changer dans le document 'club' : sa réponse à un match ou son absence, une vidéo vue, son covoiturage
create or replace function public.esga_famille(code text, op jsonb) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare r text := esga_role(code); d jsonb; v bigint; evt text := op->>'evt'; jid text := op->>'jid'; i int;
begin
  if r is null then raise exception 'code du club incorrect'; end if;
  select data, version into d, v from esga_etat where cle = 'club' for update;
  if d is null then raise exception 'club pas encore en ligne'; end if;
  if not exists (select 1 from jsonb_array_elements(d->'personnes') p where p->>'id' = jid) then raise exception 'joueur inconnu'; end if;
  d := jsonb_set(d, '{dispos}', coalesce(d->'dispos', '{}'));
  if op->>'type' = 'dispo' then
    if coalesce(d->'dispos'->evt->jid->>'par', 'famille') not in ('famille', 'messagerie', 'sondage') then raise exception 'déjà noté par le coach'; end if;
    if op->'info' is null or op->'info' = 'null'::jsonb then
      d := jsonb_set(d, array['dispos', evt], coalesce(d->'dispos'->evt, '{}') - jid);
    else
      d := jsonb_set(d, array['dispos', evt], coalesce(d->'dispos'->evt, '{}') || jsonb_build_object(jid,
             jsonb_build_object('statut', op->'info'->'statut', 'motif', op->'info'->'motif', 'precision', op->'info'->'precision',
                                'par', coalesce(op->'info'->>'par', 'famille'), 'date', to_jsonb(now()))));
    end if;
  elsif op->>'type' = 'vu' then
    select ord - 1 into i from jsonb_array_elements(d->'envois') with ordinality as e(x, ord) where x->>'id' = op->>'envoi';
    if i is null then raise exception 'vidéo inconnue'; end if;
    d := jsonb_set(d, array['envois', i::text, 'vus', jid], to_jsonb(now()));
  elsif op->>'type' = 'covoit' then -- covoiturage : chaque famille ne change que sa propre ligne
    d := jsonb_set(d, '{covoit}', coalesce(d->'covoit', '{}'));
    if op->'info' is null or op->'info' = 'null'::jsonb then
      d := jsonb_set(d, array['covoit', evt], coalesce(d->'covoit'->evt, '{}') - jid);
    else
      d := jsonb_set(d, array['covoit', evt], coalesce(d->'covoit'->evt, '{}') || jsonb_build_object(jid,
             jsonb_strip_nulls(jsonb_build_object('places', least(greatest(coalesce((op->'info'->>'places')::int, 0), 0), 8),
                                'cherche', op->'info'->'cherche', 'avec', op->'info'->'avec', 'date', to_jsonb(now())))));
    end if;
  else raise exception 'opération inconnue';
  end if;
  update esga_etat set data = d, version = v + 1, maj = now() where cle = 'club';
  return v + 1;
end $$;

revoke all on function public.esga_role(text) from public, anon, authenticated;
revoke all on function public.esga_pour_famille(jsonb) from public, anon, authenticated;
revoke all on function public.esga_lire(text, text[]) from public;
revoke all on function public.esga_versions(text, text[]) from public;
revoke all on function public.esga_ecrire(text, text, jsonb, bigint) from public;
revoke all on function public.esga_famille(text, jsonb) from public;
grant execute on function public.esga_lire(text, text[]) to anon, authenticated;
grant execute on function public.esga_versions(text, text[]) to anon, authenticated;
grant execute on function public.esga_ecrire(text, text, jsonb, bigint) to anon, authenticated;
grant execute on function public.esga_famille(text, jsonb) to anon, authenticated;
