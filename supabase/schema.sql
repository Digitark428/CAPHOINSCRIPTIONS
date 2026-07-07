-- ============================================================
--  CAP HOMARD BEACH VOLLEY 974 — BASE DE DONNÉES (installation)
--
--  👉 UN SEUL FICHIER À LANCER, une fois, sur ton NOUVEAU projet Supabase.
--     Supabase > SQL Editor > New query > coller tout > Run.
--
--  Crée tout ce qu'il faut : tables, sécurité (RLS), stockage des
--  affiches, et toutes les fonctions (inscription, liste d'attente…).
--  Aucune donnée n'est insérée : tu démarres avec une base VIDE.
--  Ré-exécutable sans risque (aucune erreur « existe déjà »).
--
--  Ensuite, dans Supabase : Authentication > Users > Add user,
--  pour créer ton compte organisateur (connexion à /login).
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
--  TABLES
-- ============================================================

create table if not exists public.tournois (
  id                      uuid primary key default gen_random_uuid(),
  nom                     text not null,
  slug                    text not null unique,
  type                    text not null default '4x4',
  date_tournoi            date,
  tarif_par_joueur        numeric(10,2) not null default 10,
  statut                  text not null default 'ouvert',
  is_historique           boolean not null default false,
  image_url               text,
  max_equipes             int,                               -- limite de places (équipes) ; null = illimité
  rentree_buvette         numeric(12,2) not null default 0,
  depense_buvette         numeric(12,2) not null default 0,
  rentree_inscriptions_manuelle numeric(12,2),
  notes                   text,
  created_at              timestamptz not null default now()
);

create table if not exists public.equipes (
  id                 uuid primary key default gen_random_uuid(),
  tournoi_id         uuid not null references public.tournois(id) on delete cascade,
  nom                text not null,
  contact_nom        text,
  contact_prenom     text,
  contact_telephone  text,
  liste_attente      boolean not null default false,   -- true = équipe en liste d'attente
  montant_historique numeric(12,2),
  created_at         timestamptz not null default now()
);
create index if not exists idx_equipes_tournoi on public.equipes(tournoi_id);

create table if not exists public.joueurs (
  id         uuid primary key default gen_random_uuid(),
  equipe_id  uuid not null references public.equipes(id) on delete cascade,
  nom        text not null,
  paye       boolean not null default false,
  boisson    boolean not null default false,
  position   int not null default 1
);
create index if not exists idx_joueurs_equipe on public.joueurs(equipe_id);

create table if not exists public.achats_divers (
  id          uuid primary key default gen_random_uuid(),
  tournoi_id  uuid not null references public.tournois(id) on delete cascade,
  description text not null default '',
  montant     numeric(12,2) not null default 0,
  position    int not null default 1
);
create index if not exists idx_achats_tournoi on public.achats_divers(tournoi_id);

create table if not exists public.frais_association (
  id          uuid primary key default gen_random_uuid(),
  tournoi_id  uuid not null references public.tournois(id) on delete cascade,
  description text not null default '',
  montant     numeric(12,2) not null default 0,
  fonction    text default '',
  position    int not null default 1
);
create index if not exists idx_frais_tournoi on public.frais_association(tournoi_id);

-- ============================================================
--  STOCKAGE — Affiches des tournois
-- ============================================================
insert into storage.buckets (id, name, public)
values ('tournoi-images', 'tournoi-images', true)
on conflict (id) do update set public = true;

drop policy if exists "affiches lecture publique" on storage.objects;
create policy "affiches lecture publique"
  on storage.objects for select to public
  using (bucket_id = 'tournoi-images');

drop policy if exists "affiches ecriture admin" on storage.objects;
create policy "affiches ecriture admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'tournoi-images');

drop policy if exists "affiches maj admin" on storage.objects;
create policy "affiches maj admin"
  on storage.objects for update to authenticated
  using (bucket_id = 'tournoi-images');

drop policy if exists "affiches suppression admin" on storage.objects;
create policy "affiches suppression admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'tournoi-images');

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.tournois          enable row level security;
alter table public.equipes           enable row level security;
alter table public.joueurs           enable row level security;
alter table public.achats_divers     enable row level security;
alter table public.frais_association enable row level security;

drop policy if exists "admin all tournois"  on public.tournois;
drop policy if exists "admin all equipes"   on public.equipes;
drop policy if exists "admin all joueurs"   on public.joueurs;
drop policy if exists "admin all achats"    on public.achats_divers;
drop policy if exists "admin all frais"     on public.frais_association;

create policy "admin all tournois"  on public.tournois          for all to authenticated using (true) with check (true);
create policy "admin all equipes"   on public.equipes           for all to authenticated using (true) with check (true);
create policy "admin all joueurs"   on public.joueurs           for all to authenticated using (true) with check (true);
create policy "admin all achats"    on public.achats_divers     for all to authenticated using (true) with check (true);
create policy "admin all frais"     on public.frais_association for all to authenticated using (true) with check (true);

-- ============================================================
--  FONCTIONS PUBLIQUES (RPC)
-- ============================================================

create or replace function public.tournois_ouverts()
returns table (
  id uuid, nom text, slug text, type text,
  date_tournoi date, tarif_par_joueur numeric, image_url text,
  max_equipes int, nb_equipes int
)
language sql security definer set search_path = public
as $$
  select t.id, t.nom, t.slug, t.type, t.date_tournoi, t.tarif_par_joueur, t.image_url,
         t.max_equipes,
         (select count(*)::int from public.equipes e
           where e.tournoi_id = t.id and e.liste_attente = false) as nb_equipes
  from public.tournois t
  where t.statut = 'ouvert' and t.is_historique = false
  order by t.date_tournoi asc nulls last, t.created_at desc;
$$;

create or replace function public.tournoi_public(p_slug text)
returns table (
  id uuid, nom text, type text, date_tournoi date,
  tarif_par_joueur numeric, statut text, is_historique boolean, image_url text,
  max_equipes int, nb_equipes int
)
language sql security definer set search_path = public
as $$
  select t.id, t.nom, t.type, t.date_tournoi, t.tarif_par_joueur,
         t.statut, t.is_historique, t.image_url,
         t.max_equipes,
         (select count(*)::int from public.equipes e
           where e.tournoi_id = t.id and e.liste_attente = false) as nb_equipes
  from public.tournois t
  where t.slug = p_slug
  limit 1;
$$;

drop function if exists public.inscrire_equipe(text, text, text[]);
drop function if exists public.inscrire_equipe(text, text, text[], text, text, text);
drop function if exists public.inscrire_equipe(text, text, text[], text, text, text, boolean);
create or replace function public.inscrire_equipe(
  p_slug              text,
  p_nom_equipe        text,
  p_joueurs           text[],
  p_contact_nom       text,
  p_contact_prenom    text,
  p_contact_telephone text,
  p_liste_attente     boolean default false
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_tournoi   public.tournois%rowtype;
  v_equipe_id uuid;
  v_nom       text;
  v_pos       int := 0;
  v_count     int;
  v_nb        int;
begin
  select * into v_tournoi from public.tournois where slug = p_slug limit 1 for update;
  if not found then
    raise exception 'Tournoi introuvable';
  end if;
  if v_tournoi.statut <> 'ouvert' or v_tournoi.is_historique then
    raise exception 'Les inscriptions pour ce tournoi sont fermées';
  end if;

  if not p_liste_attente and v_tournoi.max_equipes is not null then
    select count(*) into v_nb
    from public.equipes
    where tournoi_id = v_tournoi.id and liste_attente = false;
    if v_nb >= v_tournoi.max_equipes then
      raise exception 'Le tournoi est complet';
    end if;
  end if;

  select count(*) into v_count
  from unnest(p_joueurs) j
  where btrim(coalesce(j, '')) <> '';

  if v_count < 4 then
    raise exception 'Minimum 4 joueurs requis';
  end if;
  if v_count > 8 then
    raise exception 'Maximum 8 joueurs autorisés';
  end if;
  if btrim(coalesce(p_nom_equipe, '')) = '' then
    raise exception 'Le nom de l''équipe est obligatoire';
  end if;
  if btrim(coalesce(p_contact_nom, '')) = ''
     or btrim(coalesce(p_contact_prenom, '')) = ''
     or btrim(coalesce(p_contact_telephone, '')) = '' then
    raise exception 'Le contact (nom, prénom, téléphone) est obligatoire';
  end if;

  insert into public.equipes
    (tournoi_id, nom, contact_nom, contact_prenom, contact_telephone, liste_attente)
  values
    (v_tournoi.id, btrim(p_nom_equipe), btrim(p_contact_nom),
     btrim(p_contact_prenom), btrim(p_contact_telephone), p_liste_attente)
  returning id into v_equipe_id;

  foreach v_nom in array p_joueurs loop
    if btrim(coalesce(v_nom, '')) <> '' then
      v_pos := v_pos + 1;
      insert into public.joueurs (equipe_id, nom, position, paye)
      values (v_equipe_id, btrim(v_nom), v_pos, false);
    end if;
  end loop;

  return v_equipe_id;
end;
$$;

grant execute on function public.tournois_ouverts()            to anon, authenticated;
grant execute on function public.tournoi_public(text)          to anon, authenticated;
grant execute on function
  public.inscrire_equipe(text, text, text[], text, text, text, boolean) to anon, authenticated;
