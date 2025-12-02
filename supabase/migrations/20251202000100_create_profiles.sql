create type public.user_role as enum ('admin', 'editor');

create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'editor'::user_role,
  created_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id)
);

alter table public.profiles enable row level security;

create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "Users can view own profile"
  on public.profiles
  for select
  using (
    auth.uid() = id
  );

create policy "Admins can insert profiles"
  on public.profiles
  for insert
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "Admins can update profiles"
  on public.profiles
  for update
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "Admins can delete profiles"
  on public.profiles
  for delete
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

-- Trigger to create a profile when a user is created via Supabase Auth
-- This is useful if we use the standard signup flow, but for the admin page we might create the profile manually.
-- However, to keep it synced, a trigger is good.
-- But wait, if we use the Admin API to create a user, we can also insert into profiles directly.
-- Let's add a trigger for safety, but default to 'editor'.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'editor');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
