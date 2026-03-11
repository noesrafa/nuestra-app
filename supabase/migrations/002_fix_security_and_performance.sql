-- Fix search_path on functions (security)
alter function public.my_couple_id() set search_path = '';
alter function public.update_updated_at() set search_path = '';
alter function public.handle_new_user() set search_path = '';

-- Fix RLS: wrap auth.uid() in (select ...) for performance
drop policy "Users can read own profile" on profiles;
create policy "Users can read own profile"
  on profiles for select using ((select auth.uid()) = id);

drop policy "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update using ((select auth.uid()) = id);

drop policy "Couple members can read their couple" on nuestra_couples;
create policy "Couple members can read their couple"
  on nuestra_couples for select
  using ((select auth.uid()) = user_a or (select auth.uid()) = user_b);

drop policy "Authenticated users can create a couple" on nuestra_couples;
create policy "Authenticated users can create a couple"
  on nuestra_couples for insert
  with check ((select auth.uid()) = user_a);

drop policy "Couple members can update their couple" on nuestra_couples;
create policy "Couple members can update their couple"
  on nuestra_couples for update
  using ((select auth.uid()) = user_a or (select auth.uid()) = user_b);
