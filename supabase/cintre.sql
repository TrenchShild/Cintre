-- Cintre : table de synchronisation des comptes
-- À lancer une seule fois dans Supabase : SQL Editor → New query → coller → Run.

create table if not exists public.cintre_docs (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  kind       text        not null check (kind in ('item', 'outfit', 'wear', 'wish')),
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

comment on table public.cintre_docs is 'Cintre : une ligne par pièce, tenue, envie ou jour porté, propre à chaque compte.';

-- Chaque personne ne voit et ne modifie que ses propres lignes.
alter table public.cintre_docs enable row level security;

drop policy if exists "cintre_select_own" on public.cintre_docs;
drop policy if exists "cintre_insert_own" on public.cintre_docs;
drop policy if exists "cintre_update_own" on public.cintre_docs;
drop policy if exists "cintre_delete_own" on public.cintre_docs;

create policy "cintre_select_own" on public.cintre_docs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cintre_insert_own" on public.cintre_docs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cintre_update_own" on public.cintre_docs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cintre_delete_own" on public.cintre_docs
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.cintre_docs to authenticated;
revoke all on public.cintre_docs from anon;
