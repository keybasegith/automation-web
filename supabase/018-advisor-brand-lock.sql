-- Brand rules apply to direct API writes as well as the portal UI.
create or replace function public.portal_lock_branding() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.content->>'logo' is distinct from '/keybase-logo-nobg.png'
 or new.content->>'accent' is distinct from '#006d6e'
 or new.content->>'gold' is distinct from '#c8a96a' then
   raise exception 'Company logo and page style are managed by Keybase';
 end if;
 return new;
end $$;
drop trigger if exists portal_draft_brand_lock on public.portal_drafts;
create trigger portal_draft_brand_lock before insert or update of content on public.portal_drafts
for each row execute function public.portal_lock_branding();
drop trigger if exists portal_request_brand_lock on public.portal_requests;
create trigger portal_request_brand_lock before insert or update of content on public.portal_requests
for each row execute function public.portal_lock_branding();
