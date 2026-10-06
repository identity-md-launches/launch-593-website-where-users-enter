begin;

-- Empty string represents an omitted personal Twitter account in the existing API.
alter table public.projects drop constraint projects_twitter_username_check;
alter table public.projects add constraint projects_twitter_username_check
  check (twitter_username = '' or twitter_username ~ '^[A-Za-z0-9_]{1,15}$');

-- Preserve historical rows while enforcing valid project Twitter handles on new writes.
alter table public.projects drop constraint projects_project_username_check;
alter table public.projects add constraint projects_project_username_check
  check (project_username ~ '^[A-Za-z0-9_]{1,15}$') not valid;

commit;
