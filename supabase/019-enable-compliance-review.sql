-- Allow compliance to review the company copy and advisor submission before IT is provisioned.
create or replace function public.portal_submit(p_content jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_version int; v_base jsonb; v_org text;
begin
 if public.portal_role() is distinct from 'advisor' then raise exception 'Advisor access required'; end if;
 perform 1 from public.portal_profiles where id=auth.uid() for update;
 perform public.portal_validate_content(p_content);
 select description into v_org from public.portal_organization where id=1;
 if v_org is null then raise exception 'The company description must be configured before review'; end if;
 if exists(select 1 from public.portal_requests where advisor_id=auth.uid() and status in ('submitted','approved')) then raise exception 'Complete the pending request before submitting another version'; end if;
 if not exists(select 1 from public.portal_profiles where role='compliance') then raise exception 'A compliance account must be provisioned first'; end if;
 select coalesce(max(version),0)+1 into v_version from public.portal_requests where advisor_id=auth.uid();
 select content into v_base from public.portal_requests where advisor_id=auth.uid() and status='published' order by version desc limit 1;
 insert into public.portal_requests(advisor_id,advisor_name,version,content,baseline,organization_description) values(auth.uid(),p_content->>'name',v_version,p_content,coalesce(v_base,'{}'),v_org) returning id into v_id;
 perform public.portal_save_draft(p_content);
 insert into public.portal_events(request_id,actor_id,actor_name,action) select v_id,id,name,'Submitted version '||v_version||' for compliance review' from public.portal_profiles where id=auth.uid();
 insert into public.portal_messages(recipient_id,request_id,body) select id,v_id,(p_content->>'name')||' submitted version '||v_version||' for compliance review.' from public.portal_profiles where role='compliance';
 return v_id;
end $$;
