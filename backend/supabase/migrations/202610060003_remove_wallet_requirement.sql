begin;

-- New submissions no longer collect a wallet. Preserve historical values while
-- allowing the updated function to insert only the remaining project fields.
alter table public.projects alter column wallet drop not null;

commit;
