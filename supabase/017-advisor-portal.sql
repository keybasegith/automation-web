-- Run once against the selected Supabase project. No existing tables are modified.
begin;
create table public.portal_profiles (
 id uuid primary key references auth.users(id), name text not null,
 role text not null check(role in ('advisor','compliance','it'))
);
create table public.portal_organization(id int primary key check(id=1),description text not null,ready boolean not null default false);
insert into public.portal_organization values (1,'Approved Keybase Financial Group description pending supplied copy.',false);
create table public.portal_drafts(advisor_id uuid primary key references public.portal_profiles(id),content jsonb not null,updated_at timestamptz not null default now());
create table public.portal_requests(
 id uuid primary key default gen_random_uuid(),advisor_id uuid not null references public.portal_profiles(id),advisor_name text not null,
 version int not null,content jsonb not null,baseline jsonb not null default '{}',
 organization_description text not null,
 status text not null default 'submitted' check(status in ('submitted','returned','approved','published')),
 created_at timestamptz not null default now(),unique(advisor_id,version)
);
create unique index portal_one_pending on public.portal_requests(advisor_id) where status in ('submitted','approved');
create table public.portal_events(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.portal_requests(id),actor_id uuid not null references public.portal_profiles(id),actor_name text not null,action text not null,created_at timestamptz not null default now());
create table public.portal_messages(id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.portal_profiles(id),request_id uuid not null references public.portal_requests(id),body text not null,created_at timestamptz not null default now(),read_at timestamptz);
create index on public.portal_messages(recipient_id,created_at desc);
create index on public.portal_events(request_id);
create function public.portal_role() returns text language sql stable security definer set search_path='' as $$select role from public.portal_profiles where id=auth.uid()$$;
create function public.portal_can_read_request(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.portal_requests where id=p_id and (advisor_id=auth.uid() or public.portal_role()='compliance' or (public.portal_role()='it' and status in ('approved','published'))))$$;
alter table public.portal_profiles enable row level security;
alter table public.portal_organization enable row level security;
alter table public.portal_drafts enable row level security;
alter table public.portal_requests enable row level security;
alter table public.portal_events enable row level security;
alter table public.portal_messages enable row level security;
create policy portal_profiles_read on public.portal_profiles for select to authenticated using(id=auth.uid() or public.portal_role() in ('compliance','it'));
create policy portal_org_read on public.portal_organization for select to authenticated using(public.portal_role() is not null);
create policy portal_drafts_read on public.portal_drafts for select to authenticated using(advisor_id=auth.uid());
create policy portal_requests_read on public.portal_requests for select to authenticated using(public.portal_can_read_request(id));
create policy portal_events_read on public.portal_events for select to authenticated using(public.portal_can_read_request(request_id));
create policy portal_messages_read on public.portal_messages for select to authenticated using(recipient_id=auth.uid());
-- Browser clients have no direct INSERT, UPDATE or DELETE privileges on these tables.
revoke all on public.portal_profiles,public.portal_organization,public.portal_drafts,public.portal_requests,public.portal_events,public.portal_messages from anon,authenticated;
grant select on public.portal_profiles,public.portal_organization,public.portal_drafts,public.portal_requests,public.portal_events,public.portal_messages to authenticated;
create function public.portal_validate_content(p_content jsonb) returns void language plpgsql set search_path='' as $$
declare v_key text; v_item jsonb;
begin
 if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>6000000 then raise exception 'Invalid page content or images too large'; end if;
 if p_content - array['name','credentials','headline','intro','bio','email','phone','address','cta','accent','background','portrait','stats','sections','cell','gold','logo','company','noteLabel','noteHeading','contactHeading','contactIntro','footerDisclosure']::text[] <> '{}'::jsonb then raise exception 'Page contains protected or unsupported fields'; end if;
 foreach v_key in array array['name','credentials','headline','intro','bio','email','phone','address','cta','accent','background','portrait','cell','gold','logo','company','noteLabel','noteHeading','contactHeading','contactIntro','footerDisclosure'] loop
  if jsonb_typeof(p_content->v_key) is distinct from 'string' then raise exception 'Invalid text field: %',v_key; end if;
 end loop;
 if (p_content->>'accent') !~ '^#[0-9a-fA-F]{6}$' or (p_content->>'gold') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid page colour'; end if;
 foreach v_key in array array['background','portrait','logo'] loop
  if p_content->>v_key <> '' and p_content->>v_key !~ '^/(?!/)' and p_content->>v_key !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' then raise exception 'Invalid image'; end if;
 end loop;
 if length(trim(coalesce(p_content->>'name','')))=0 or length(trim(coalesce(p_content->>'headline','')))=0 then raise exception 'Name and headline are required'; end if;
 if jsonb_typeof(p_content->'stats') is distinct from 'array' or jsonb_typeof(p_content->'sections') is distinct from 'array' then raise exception 'Invalid sections or statistics'; end if;
 if jsonb_array_length(p_content->'stats')>20 or jsonb_array_length(p_content->'sections')>30 then raise exception 'Too many page sections'; end if;
 for v_item in select value from jsonb_array_elements(p_content->'stats') loop
  if jsonb_typeof(v_item->'value') is distinct from 'string' or jsonb_typeof(v_item->'label') is distinct from 'string' then raise exception 'Invalid statistic'; end if;
 end loop;
 for v_item in select value from jsonb_array_elements(p_content->'sections') loop
  if jsonb_typeof(v_item->'title') is distinct from 'string' or jsonb_typeof(v_item->'body') is distinct from 'string' then raise exception 'Invalid page section'; end if;
 end loop;
end $$;
create function public.portal_save_draft(p_content jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if public.portal_role() is distinct from 'advisor' then raise exception 'Advisor access required'; end if;
 perform public.portal_validate_content(p_content);
 insert into public.portal_drafts(advisor_id,content) values(auth.uid(),p_content) on conflict(advisor_id) do update set content=excluded.content,updated_at=now();
end $$;
create function public.portal_submit(p_content jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_version int; v_base jsonb; v_org text;
begin
 if public.portal_role() is distinct from 'advisor' then raise exception 'Advisor access required'; end if;
 perform 1 from public.portal_profiles where id=auth.uid() for update;
 perform public.portal_validate_content(p_content);
 select description into v_org from public.portal_organization where id=1 and ready=true;
 if v_org is null then raise exception 'The approved company description must be configured before real submissions are enabled'; end if;
 if exists(select 1 from public.portal_requests where advisor_id=auth.uid() and status in ('submitted','approved')) then raise exception 'Complete the pending request before submitting another version'; end if;
 if not exists(select 1 from public.portal_profiles where role='compliance') or not exists(select 1 from public.portal_profiles where role='it') then raise exception 'Compliance and IT accounts must be provisioned first'; end if;
 select coalesce(max(version),0)+1 into v_version from public.portal_requests where advisor_id=auth.uid();
 select content into v_base from public.portal_requests where advisor_id=auth.uid() and status='published' order by version desc limit 1;
 insert into public.portal_requests(advisor_id,advisor_name,version,content,baseline,organization_description) values(auth.uid(),p_content->>'name',v_version,p_content,coalesce(v_base,'{}'),v_org) returning id into v_id;
 perform public.portal_save_draft(p_content);
 insert into public.portal_events(request_id,actor_id,actor_name,action) select v_id,id,name,'Submitted version '||v_version||' for compliance review' from public.portal_profiles where id=auth.uid();
 insert into public.portal_messages(recipient_id,request_id,body) select id,v_id,(p_content->>'name')||' submitted version '||v_version||' for compliance review.' from public.portal_profiles where role='compliance';
 return v_id;
end $$;
create function public.portal_transition(p_request_id uuid,p_action text,p_note text default '') returns void language plpgsql security definer set search_path='' as $$
declare r public.portal_requests; v_role text; v_name text; v_status text; v_body text;
begin
 select role,name into v_role,v_name from public.portal_profiles where id=auth.uid();
 if v_role is null then raise exception 'Portal access required'; end if;
 select * into r from public.portal_requests where id=p_request_id for update;
 if not found then raise exception 'Request unavailable'; end if;
 if length(coalesce(p_note,''))>10000 then raise exception 'Note is too long'; end if;
 if v_role='compliance' and r.status='submitted' and p_action in ('approve','return') then
  if p_action='return' and length(trim(coalesce(p_note,'')))=0 then raise exception 'A feedback note is required'; end if;
  v_status=case when p_action='approve' then 'approved' else 'returned' end;
  v_body=v_name||case when p_action='approve' then ' approved version ' else ' requested changes to version ' end||r.version||'.'||case when length(trim(coalesce(p_note,'')))>0 then ' '||p_note else '' end;
 elsif v_role='it' and r.status='approved' and p_action='publish' then
  v_status='published';v_body=v_name||' marked version '||r.version||' as manually published.'||case when length(trim(coalesce(p_note,'')))>0 then ' '||p_note else '' end;
 else raise exception 'Action not allowed for this role or request status'; end if;
 update public.portal_requests set status=v_status where id=p_request_id;
 insert into public.portal_events(request_id,actor_id,actor_name,action) values(p_request_id,auth.uid(),v_name,v_body);
 insert into public.portal_messages(recipient_id,request_id,body) values(r.advisor_id,p_request_id,v_body);
 if v_status='approved' then insert into public.portal_messages(recipient_id,request_id,body) select id,p_request_id,v_body||' Ready for manual publishing.' from public.portal_profiles where role='it'; end if;
end $$;
create function public.portal_mark_read(p_message_id uuid) returns void language plpgsql security definer set search_path='' as $$begin update public.portal_messages set read_at=coalesce(read_at,now()) where id=p_message_id and recipient_id=auth.uid();end $$;
revoke all on function public.portal_role(),public.portal_can_read_request(uuid),public.portal_validate_content(jsonb),public.portal_save_draft(jsonb),public.portal_submit(jsonb),public.portal_transition(uuid,text,text),public.portal_mark_read(uuid) from public,anon;
grant execute on function public.portal_role(),public.portal_can_read_request(uuid),public.portal_save_draft(jsonb),public.portal_submit(jsonb),public.portal_transition(uuid,text,text),public.portal_mark_read(uuid) to authenticated;
commit;
