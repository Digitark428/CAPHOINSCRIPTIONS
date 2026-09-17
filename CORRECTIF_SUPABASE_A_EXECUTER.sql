-- À exécuter une seule fois dans Supabase > SQL Editor > New query.
-- Met à jour la validation des inscriptions selon le format du tournoi.

create or replace function public.inscrire_equipe(
  p_slug              text,
  p_nom_equipe        text,
  p_joueurs           jsonb,
  p_contact_nom       text,
  p_contact_prenom    text,
  p_contact_telephone text,
  p_liste_attente     boolean default false
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_tournoi         public.tournois%rowtype;
  v_equipe_id       uuid;
  v_j               jsonb;
  v_pos             int := 0;
  v_count           int;
  v_joueurs_requis  int;
  v_nb              int;
  v_vigilance       boolean := false;
  v_attente         boolean;
begin
  select * into v_tournoi
  from public.tournois
  where slug = p_slug
  limit 1
  for update;

  if not found then
    raise exception 'Tournoi introuvable';
  end if;
  if v_tournoi.statut <> 'ouvert' or v_tournoi.is_historique then
    raise exception 'Les inscriptions pour ce tournoi sont fermées';
  end if;
  if btrim(coalesce(p_nom_equipe, '')) = '' then
    raise exception 'Le nom de l''équipe est obligatoire';
  end if;
  if btrim(coalesce(p_contact_nom, '')) = ''
     or btrim(coalesce(p_contact_prenom, '')) = ''
     or btrim(coalesce(p_contact_telephone, '')) = '' then
    raise exception 'Le contact (nom, prénom, téléphone) est obligatoire';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(coalesce(p_joueurs, '[]'::jsonb)) j
  where btrim(coalesce(j->>'prenom', '')) <> ''
    and btrim(coalesce(j->>'nom', '')) <> ''
    and btrim(coalesce(j->>'email', '')) <> '';

  v_joueurs_requis := case v_tournoi.type
    when '4x4' then 4
    when '3x3' then 3
    when '2x2' then 2
    else null
  end;

  if v_joueurs_requis is null then
    raise exception 'Format de tournoi non pris en charge : %', v_tournoi.type;
  end if;
  if v_count <> v_joueurs_requis then
    raise exception 'Ce tournoi exige exactement % joueurs', v_joueurs_requis;
  end if;

  select exists (
    select 1
    from jsonb_array_elements(coalesce(p_joueurs, '[]'::jsonb)) j
    join public.liste_vigilance v
      on v.actif = true
     and public.normaliser_nom(v.prenom) = public.normaliser_nom(j->>'prenom')
     and public.normaliser_nom(v.nom) = public.normaliser_nom(j->>'nom')
  ) into v_vigilance;

  v_attente := coalesce(p_liste_attente, false) or v_vigilance;

  if not v_attente and v_tournoi.max_equipes is not null then
    select count(*) into v_nb
    from public.equipes
    where tournoi_id = v_tournoi.id and liste_attente = false;
    if v_nb >= v_tournoi.max_equipes then
      raise exception 'Le tournoi est complet';
    end if;
  end if;

  insert into public.equipes
    (tournoi_id, nom, contact_nom, contact_prenom, contact_telephone,
     liste_attente, vigilance)
  values
    (v_tournoi.id, btrim(p_nom_equipe), btrim(p_contact_nom),
     btrim(p_contact_prenom), btrim(p_contact_telephone),
     v_attente, v_vigilance)
  returning id into v_equipe_id;

  for v_j in
    select * from jsonb_array_elements(coalesce(p_joueurs, '[]'::jsonb))
  loop
    if btrim(coalesce(v_j->>'prenom', '')) <> ''
       and btrim(coalesce(v_j->>'nom', '')) <> ''
       and btrim(coalesce(v_j->>'email', '')) <> '' then
      v_pos := v_pos + 1;
      insert into public.joueurs
        (equipe_id, prenom, nom, email, position, paye, boisson)
      values
        (v_equipe_id, btrim(v_j->>'prenom'), btrim(v_j->>'nom'),
         btrim(lower(v_j->>'email')), v_pos, false, false);
    end if;
  end loop;

  return jsonb_build_object(
    'equipe_id', v_equipe_id,
    'liste_attente', v_attente,
    'vigilance', v_vigilance
  );
end;
$$;

grant execute on function
  public.inscrire_equipe(text, text, jsonb, text, text, text, boolean)
  to anon, authenticated;
