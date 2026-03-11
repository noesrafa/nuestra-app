-- ============================================
-- Nuestra App - Schema inicial
-- ============================================

-- Profiles: extiende auth.users (compartido entre apps)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-crear profile al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- Couples: vincula dos usuarios como pareja
-- ============================================

create table nuestra_couples (
  id uuid default gen_random_uuid() primary key,
  user_a uuid references profiles(id) on delete cascade not null,
  user_b uuid references profiles(id) on delete cascade,
  invite_code text unique default encode(gen_random_bytes(4), 'hex'),
  created_at timestamptz default now() not null
);

alter table nuestra_couples enable row level security;

create policy "Couple members can read their couple"
  on nuestra_couples for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Authenticated users can create a couple"
  on nuestra_couples for insert
  with check (auth.uid() = user_a);

create policy "Couple members can update their couple"
  on nuestra_couples for update
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Helper: obtener el couple_id del usuario actual
create or replace function my_couple_id()
returns uuid as $$
  select id from nuestra_couples
  where user_a = auth.uid() or user_b = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- ============================================
-- Entries: diario de salidas con foto y fecha
-- ============================================

create table nuestra_entries (
  id uuid default gen_random_uuid() primary key,
  couple_id uuid references nuestra_couples(id) on delete cascade not null,
  date date not null,
  title text not null,
  notes text,
  photo_url text,
  mood text check (mood in ('amazing', 'good', 'okay', 'tough')),
  created_by uuid references profiles(id) not null default auth.uid(),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table nuestra_entries enable row level security;

create policy "Couple members can read their entries"
  on nuestra_entries for select
  using (couple_id = my_couple_id());

create policy "Couple members can create entries"
  on nuestra_entries for insert
  with check (couple_id = my_couple_id());

create policy "Couple members can update their entries"
  on nuestra_entries for update
  using (couple_id = my_couple_id());

create policy "Couple members can delete their entries"
  on nuestra_entries for delete
  using (couple_id = my_couple_id());

-- Index para queries por fecha (calendario)
create index idx_entries_couple_date on nuestra_entries(couple_id, date desc);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger entries_updated_at
  before update on nuestra_entries
  for each row execute function update_updated_at();

-- ============================================
-- Storage bucket para fotos
-- ============================================

insert into storage.buckets (id, name, public)
values ('nuestra-photos', 'nuestra-photos', false);

create policy "Couple members can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'nuestra-photos' and auth.role() = 'authenticated');

create policy "Couple members can view their photos"
  on storage.objects for select
  using (bucket_id = 'nuestra-photos' and auth.role() = 'authenticated');
