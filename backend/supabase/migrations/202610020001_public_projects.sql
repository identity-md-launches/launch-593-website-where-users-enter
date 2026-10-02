begin;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  project_username text not null check (project_username ~ '^[A-Za-z0-9_-]{3,32}$'),
  twitter_username text not null check (twitter_username ~ '^[A-Za-z0-9_]{1,15}$'),
  contract text not null check (contract ~ '^0x[0-9a-f]{40}$' and contract <> '0x0000000000000000000000000000000000000000'),
  description text not null check (char_length(description) between 20 and 1000),
  wallet text not null check (wallet ~ '^0x[0-9a-fA-F]{40}$' and lower(wallet) <> '0x0000000000000000000000000000000000000000'),
  created_at timestamptz not null default now(),
  constraint projects_contract_unique unique (contract)
);

create index projects_created_at_idx on public.projects (created_at desc, id desc);
alter table public.projects enable row level security;
revoke all on public.projects from anon, authenticated;
grant select on public.projects to anon, authenticated;
grant select, insert, update, delete on public.projects to service_role;
create policy "Anyone can read published projects" on public.projects
  for select to anon, authenticated using (true);

comment on table public.projects is 'Public user submissions. Only the Privy-verifying Edge Function may insert. Addresses and project claims are self-reported.';
commit;
