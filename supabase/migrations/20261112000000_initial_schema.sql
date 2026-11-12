-- =============================================================================
-- Schéma initial de Popote
--
-- Modèle (voir PLAN.md §4 et docs/architecture.md) :
--   recipes         une recette ; ingrédients et étapes en JSONB (toujours lus et
--                   écrits en entier, recherche faite côté client)
--   recipe_photos   photos d'une recette (site HelloFresh, feuillet scanné, photo perso)
--   cook_log        historique « cuisinée le… »
--   pantry_items    contenu de « Mon frigo », partagé par le foyer
--   pantry_staples  basiques toujours considérés comme disponibles
--
-- Sécurité : RLS activé partout. Le foyer = tous les utilisateurs authentifiés
-- (les inscriptions sont fermées, les deux comptes sont créés à la main).
-- Le rôle `anon` (visiteur non connecté) n'a aucun accès.
-- =============================================================================

-- Met à jour `updated_at` à chaque modification d'une ligne.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Recettes
-- -----------------------------------------------------------------------------
create table public.recipes (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,

  title           text not null check (char_length(title) between 1 and 300),
  subtitle        text,
  description     text,

  source          text not null check (source in ('hellofresh', 'scan', 'manual')),
  -- URL canonique et identifiant HelloFresh (24 caractères hexadécimaux, sans « -fr-FR »).
  -- Uniques : c'est la clé de dédoublonnage des imports.
  source_url      text unique,
  hellofresh_id   text unique check (hellofresh_id ~ '^[0-9a-f]{24}$'),

  prep_minutes    integer check (prep_minutes >= 0),
  total_minutes   integer check (total_minutes >= 0),
  -- HelloFresh fournit un entier : 1 facile, 2 moyen, 3 difficile.
  difficulty      smallint check (difficulty between 1 and 3),
  servings        smallint check (servings > 0),

  tags            text[] not null default '{}',
  allergens       text[] not null default '{}',
  utensils        text[] not null default '{}',

  -- [{ name, normalized, quantity, unit, shipped }] — schéma validé côté client (Zod).
  ingredients     jsonb not null default '[]' check (jsonb_typeof(ingredients) = 'array'),
  -- [{ text, image_path }]
  steps           jsonb not null default '[]' check (jsonb_typeof(steps) = 'array'),
  -- Valeurs par portion : { kcal, fat, saturated_fat, carbs, sugars, fiber, protein, salt }
  nutrition       jsonb check (nutrition is null or jsonb_typeof(nutrition) = 'object'),

  -- Note commune du foyer, de 0 à 5 par demi-points ; null = pas encore notée.
  rating          numeric(2, 1) check (rating between 0 and 5 and rating * 2 = floor(rating * 2)),
  comment         text,

  cover_photo_id  uuid
);

comment on table public.recipes is 'Recettes du foyer (une ligne par recette).';

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Photos
-- -----------------------------------------------------------------------------
create table public.recipe_photos (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  -- Chemin dans le bucket Storage « photos », par ex. « <recipe_id>/<photo_id>.webp ».
  path        text not null unique,
  kind        text not null check (kind in ('source', 'scan', 'user')),
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null
);

comment on column public.recipe_photos.kind is
  'source : photo du site HelloFresh ; scan : feuillet papier ; user : photo du plat réalisé.';

create index recipe_photos_recipe_id_idx on public.recipe_photos (recipe_id);

-- La photo de couverture doit appartenir aux photos ; si elle est supprimée, plus de couverture.
alter table public.recipes
  add constraint recipes_cover_photo_fk
  foreign key (cover_photo_id) references public.recipe_photos (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Historique « cuisinée le… »
-- -----------------------------------------------------------------------------
create table public.cook_log (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  cooked_on   date not null default current_date,
  note        text,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null
);

create index cook_log_recipe_id_cooked_on_idx on public.cook_log (recipe_id, cooked_on desc);

-- -----------------------------------------------------------------------------
-- Mon frigo
-- -----------------------------------------------------------------------------
-- `normalized` : nom normalisé par src/domain/normalize.ts (minuscules, sans accents…).
create table public.pantry_items (
  normalized  text primary key,
  label       text not null,
  created_at  timestamptz not null default now()
);

create table public.pantry_staples (
  normalized  text primary key,
  label       text not null
);

comment on table public.pantry_staples is
  'Basiques toujours considérés comme disponibles. Les œufs n’en font volontairement pas partie.';

-- Valeurs initiales. Si les règles de normalisation changent (phase 5), recalculer `normalized`.
insert into public.pantry_staples (normalized, label) values
  ('sel', 'Sel'),
  ('poivre', 'Poivre'),
  ('huile d olive', 'Huile d''olive'),
  ('huile de tournesol', 'Huile de tournesol'),
  ('beurre', 'Beurre'),
  ('sucre', 'Sucre'),
  ('farine', 'Farine'),
  ('vinaigre', 'Vinaigre'),
  ('eau', 'Eau');

-- =============================================================================
-- Sécurité (Row Level Security)
-- =============================================================================
-- Défense en profondeur : le visiteur non connecté n'a aucun droit sur ces tables,
-- même si une politique RLS était ajoutée par erreur.
revoke all on table
  public.recipes, public.recipe_photos, public.cook_log, public.pantry_items, public.pantry_staples
  from anon;

alter table public.recipes        enable row level security;
alter table public.recipe_photos  enable row level security;
alter table public.cook_log       enable row level security;
alter table public.pantry_items   enable row level security;
alter table public.pantry_staples enable row level security;

-- Une seule règle par table : tout membre connecté du foyer peut tout lire et tout modifier.
create policy "Le foyer gère les recettes" on public.recipes
  for all to authenticated using (true) with check (true);

create policy "Le foyer gère les photos" on public.recipe_photos
  for all to authenticated using (true) with check (true);

create policy "Le foyer gère l'historique" on public.cook_log
  for all to authenticated using (true) with check (true);

create policy "Le foyer gère le frigo" on public.pantry_items
  for all to authenticated using (true) with check (true);

create policy "Le foyer gère les basiques" on public.pantry_staples
  for all to authenticated using (true) with check (true);

-- =============================================================================
-- Stockage des photos
-- =============================================================================
-- Bucket privé : les images ne sont lisibles qu'avec une session (URL signées).
-- Les images sont redimensionnées côté client avant l'envoi (≤ 1600 px).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "Le foyer lit les photos" on storage.objects
  for select to authenticated using (bucket_id = 'photos');

create policy "Le foyer ajoute des photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');

create policy "Le foyer modifie les photos" on storage.objects
  for update to authenticated using (bucket_id = 'photos') with check (bucket_id = 'photos');

create policy "Le foyer supprime des photos" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');
