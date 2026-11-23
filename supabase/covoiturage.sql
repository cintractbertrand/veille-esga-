-- Covoiturage entre familles (23/11/2026) : à lancer UNE FOIS dans Supabase > SQL Editor,
-- seulement si esga_en_ligne.sql a déjà été lancé. Ne touche pas aux codes ni aux données :
-- remplace juste la fonction qui permet aux familles d'écrire leurs réponses.

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
