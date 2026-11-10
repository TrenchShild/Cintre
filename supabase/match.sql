-- Cintre : quota et cache des correspondances web (fonction « match »)
-- À lancer une seule fois dans Supabase : SQL Editor → New query → coller → Run.
-- Ces tables ne sont accessibles qu'à la fonction serveur (clé service), jamais depuis l'app.

create table if not exists public.cintre_match_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default current_date,
  n       int  not null default 0,
  primary key (user_id, day)
);
create table if not exists public.cintre_match_cache (
  key        text primary key,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.cintre_match_usage enable row level security;
alter table public.cintre_match_cache enable row level security;
revoke all on public.cintre_match_usage, public.cintre_match_cache from anon, authenticated;

-- Compte une recherche ; renvoie le total du jour, ou -1 si la limite est atteinte.
create or replace function public.cintre_match_take(p_user uuid, p_limit int)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  insert into cintre_match_usage (user_id, day, n) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set n = cintre_match_usage.n + 1
    where cintre_match_usage.n < p_limit
  returning n into v;
  return coalesce(v, -1);
end $$;

-- Résultats déjà trouvés pour la même recherche (moins de 7 jours) : ne consomment pas de quota.
create or replace function public.cintre_match_cached(p_key text)
returns jsonb language sql security definer set search_path = public as $$
  select data from cintre_match_cache where key = p_key and created_at > now() - interval '7 days';
$$;

create or replace function public.cintre_match_store(p_key text, p_data jsonb)
returns void language sql security definer set search_path = public as $$
  insert into cintre_match_cache (key, data, created_at) values (p_key, p_data, now())
  on conflict (key) do update set data = excluded.data, created_at = now();
  delete from cintre_match_cache where created_at < now() - interval '30 days';
$$;

revoke execute on function public.cintre_match_take(uuid, int), public.cintre_match_cached(text), public.cintre_match_store(text, jsonb) from public, anon, authenticated;
grant execute on function public.cintre_match_take(uuid, int), public.cintre_match_cached(text), public.cintre_match_store(text, jsonb) to service_role;
