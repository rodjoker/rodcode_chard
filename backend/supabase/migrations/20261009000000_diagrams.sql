-- Diagramas de cada usuario. `data` guarda { nodes, edges } del editor (React Flow).
create table public.diagrams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Diagrama sin título',
  data jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index diagrams_owner_updated_idx on public.diagrams (owner_id, updated_at desc);

alter table public.diagrams enable row level security;

create policy "diagrams_select_own" on public.diagrams
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "diagrams_insert_own" on public.diagrams
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "diagrams_update_own" on public.diagrams
  for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "diagrams_delete_own" on public.diagrams
  for delete to authenticated using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.diagrams to authenticated;

create or replace function public.touch_diagram_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger diagrams_touch_updated_at
  before update on public.diagrams
  for each row execute function public.touch_diagram_updated_at();
