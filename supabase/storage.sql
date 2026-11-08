-- Cintre : espace de stockage pour la recherche par photo (Google Lens)
-- À lancer une seule fois dans Supabase : SQL Editor → New query → coller → Run.
-- Chaque compte ne peut écrire que dans son propre dossier ; une seule photo par compte,
-- remplacée à chaque recherche. Les photos sont lisibles par lien (Google Lens doit pouvoir les ouvrir).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lens', 'lens', true, 2097152, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

drop policy if exists "lens_select_own" on storage.objects;
drop policy if exists "lens_insert_own" on storage.objects;
drop policy if exists "lens_update_own" on storage.objects;
drop policy if exists "lens_delete_own" on storage.objects;

create policy "lens_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'lens' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "lens_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'lens' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "lens_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'lens' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'lens' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "lens_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'lens' and (storage.foldername(name))[1] = (select auth.uid())::text);
