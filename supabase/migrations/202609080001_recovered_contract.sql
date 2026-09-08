-- Bootstrap for a NEW Supabase project. Do not apply over the deployed database.
-- The frontend contract is recovered; these implementations are reconstructed.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(trim(name))>0), email text not null unique,
 org_role text not null default 'member' check(org_role in ('member','god_admin')),
 normal_days_off integer[] not null default '{0,6}' check(normal_days_off <@ array[0,1,2,3,4,5,6]),
 is_active boolean not null default true,password_setup_required boolean not null default true,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references public.profiles(id)
);
create table public.teams(id uuid primary key default gen_random_uuid(),name text not null unique check(length(trim(name))>0),description text,created_at timestamptz default now(),created_by uuid references public.profiles(id),updated_at timestamptz default now(),updated_by uuid references public.profiles(id));
create table public.team_memberships(id uuid primary key default gen_random_uuid(),team_id uuid not null references public.teams(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,role text not null default 'employee' check(role in ('employee','admin')),added_at timestamptz default now(),added_by uuid references public.profiles(id),updated_at timestamptz default now(),updated_by uuid references public.profiles(id),unique(team_id,user_id));
create table public.pto_types(id uuid primary key default gen_random_uuid(),name text not null unique,color text not null default '#4071B6',default_days numeric not null check(default_days>=0),requires_window boolean not null default false,allow_backdate boolean not null default false,is_active boolean not null default true,created_at timestamptz default now(),created_by uuid references public.profiles(id),updated_at timestamptz default now(),updated_by uuid references public.profiles(id));
create table public.pto_grants(user_id uuid not null references public.profiles(id) on delete cascade,pto_type_id uuid not null references public.pto_types(id),leave_year integer not null,amount numeric not null check(amount>=0),primary key(user_id,pto_type_id,leave_year));
create table public.holidays(id uuid primary key default gen_random_uuid(),date date not null unique,name text not null check(length(trim(name))>0),created_at timestamptz default now(),created_by uuid references public.profiles(id),updated_at timestamptz default now(),updated_by uuid references public.profiles(id));
create table public.date_rules(id uuid primary key default gen_random_uuid(),pto_type_id uuid not null references public.pto_types(id) on delete cascade,start_date date not null,end_date date not null check(end_date>=start_date),created_at timestamptz default now(),created_by uuid references public.profiles(id),updated_at timestamptz default now(),updated_by uuid references public.profiles(id));
create table public.blackout_dates(id uuid primary key default gen_random_uuid(),start_date date not null,end_date date not null check(end_date>=start_date),reason text not null,applies_to_all boolean not null default true,created_at timestamptz default now(),created_by uuid references public.profiles(id),updated_at timestamptz default now(),updated_by uuid references public.profiles(id));
create table public.blackout_types(blackout_id uuid not null references public.blackout_dates(id) on delete cascade,pto_type_id uuid not null references public.pto_types(id),primary key(blackout_id,pto_type_id));
create table public.requests(id uuid primary key default gen_random_uuid(),requester_id uuid not null references public.profiles(id),status text not null default 'pending' check(status in ('pending','approved','denied','cancelled')),note text,decided_by uuid references public.profiles(id),decided_at timestamptz,denial_reason text,submitted_at timestamptz not null default now());
create table public.request_lines(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.requests(id) on delete cascade,pto_type_id uuid not null references public.pto_types(id),start_date date not null,end_date date not null check(end_date>=start_date));
create table public.request_audit(id bigint generated always as identity primary key,request_id uuid not null references public.requests(id),actor_id uuid not null references public.profiles(id),action text not null,reason text,created_at timestamptz not null default now());
create index on public.requests(requester_id,status);create index on public.request_lines(request_id);create index on public.team_memberships(user_id);
create function public.active_actor() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and is_active)$$;
create function public.is_god_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and is_active and org_role='god_admin')$$;
create function public.manages_team(p_team_id uuid) returns boolean language sql stable security definer set search_path=public as $$select active_actor() and (is_god_admin() or exists(select 1 from team_memberships where team_id=p_team_id and user_id=auth.uid() and role='admin'))$$;
create function public.manages_person(p_user_id uuid) returns boolean language sql stable security definer set search_path=public as $$select active_actor() and (is_god_admin() or (not exists(select 1 from profiles where id=p_user_id and org_role='god_admin') and exists(select 1 from team_memberships m where m.user_id=p_user_id and manages_team(m.team_id))))$$;
create function public.can_read_request(p_user_id uuid) returns boolean language sql stable security definer set search_path=public as $$select active_actor() and (p_user_id=auth.uid() or manages_person(p_user_id))$$;
-- Roster/config reads support calendars. Private notes/reasons stay owner/manager only.
alter table profiles enable row level security;alter table teams enable row level security;alter table team_memberships enable row level security;alter table pto_types enable row level security;alter table pto_grants enable row level security;alter table holidays enable row level security;alter table date_rules enable row level security;alter table blackout_dates enable row level security;alter table blackout_types enable row level security;alter table requests enable row level security;alter table request_lines enable row level security;alter table request_audit enable row level security;
create policy roster_read on profiles for select to authenticated using(active_actor());
create policy teams_read on teams for select to authenticated using(active_actor());
create policy memberships_read on team_memberships for select to authenticated using(active_actor());
create policy types_read on pto_types for select to authenticated using(active_actor());
create policy holidays_read on holidays for select to authenticated using(active_actor());
create policy windows_read on date_rules for select to authenticated using(active_actor());
create policy blackouts_read on blackout_dates for select to authenticated using(active_actor());
create policy blackout_types_read on blackout_types for select to authenticated using(active_actor());
create policy grants_read on pto_grants for select to authenticated using(can_read_request(user_id));
create policy requests_read on requests for select to authenticated using(can_read_request(requester_id));
create policy lines_read on request_lines for select to authenticated using(exists(select 1 from requests r where r.id=request_id and can_read_request(r.requester_id)));
create policy audit_read on request_audit for select to authenticated using(exists(select 1 from requests r where r.id=request_id and can_read_request(r.requester_id)));
create policy holidays_manage on holidays for all to authenticated using(is_god_admin()) with check(is_god_admin());
create policy types_retire on pto_types for update to authenticated using(is_god_admin()) with check(is_god_admin());
create policy blackout_delete on blackout_dates for delete to authenticated using(is_god_admin());
create policy team_delete on teams for delete to authenticated using(is_god_admin());
-- Never grant direct request/profile/membership writes to browser clients.
grant select on all tables in schema public to authenticated;
grant insert,update,delete on holidays to authenticated;grant update(is_active) on pto_types to authenticated;grant delete on blackout_dates,teams to authenticated;
create function public.charged_days(p_user uuid,p_start date,p_end date) returns integer language sql stable security definer set search_path=public as $$select count(*)::integer from generate_series(p_start::timestamp,p_end::timestamp,interval '1 day') d where not extract(dow from d)::integer=any(coalesce((select normal_days_off from profiles where id=p_user),array[0,6])) and not exists(select 1 from holidays where date=d::date)$$;
create function public.assert_request_valid(p_request uuid) returns void language plpgsql security definer set search_path=public as $$
declare req requests;line request_lines;kind pto_types;grant_amount numeric;used_days numeric;requested_days numeric;year integer;
begin
 select * into strict req from requests where id=p_request;
 -- Serialize submissions and approvals for the same person, preventing overspending.
 perform 1 from profiles where id=req.requester_id for update;
 if not exists(select 1 from request_lines where request_id=p_request) then raise exception 'Add at least one PTO line.';end if;
 for line in select * from request_lines where request_id=p_request loop
  select * into strict kind from pto_types where id=line.pto_type_id;
  if not kind.is_active then raise exception 'This PTO type is retired.';end if;
  if line.end_date-line.start_date>366 or extract(year from line.start_date)<>extract(year from line.end_date) then raise exception 'Split requests at the end of the leave year.';end if;
  if line.start_date<current_date and not kind.allow_backdate then raise exception 'This leave type cannot be backdated.';end if;
  if charged_days(req.requester_id,line.start_date,line.end_date)=0 then raise exception 'Choose at least one working day.';end if;
  if kind.requires_window and exists(select 1 from generate_series(line.start_date::timestamp,line.end_date::timestamp,interval '1 day') d where not exists(select 1 from date_rules where pto_type_id=kind.id and d::date between start_date and end_date)) then raise exception 'This leave type is only available during its booking windows.';end if;
  if exists(select 1 from blackout_dates b where b.start_date<=line.end_date and b.end_date>=line.start_date and (b.applies_to_all or exists(select 1 from blackout_types bt where bt.blackout_id=b.id and bt.pto_type_id=kind.id))) then raise exception 'These dates overlap a blackout period.';end if;
  if exists(select 1 from request_lines l join requests r on r.id=l.request_id where r.requester_id=req.requester_id and r.status in ('pending','approved') and l.id<>line.id and l.start_date<=line.end_date and l.end_date>=line.start_date) then raise exception 'These dates overlap an existing request.';end if;
  year:=extract(year from line.start_date);
  select amount into grant_amount from pto_grants where user_id=req.requester_id and pto_type_id=kind.id and leave_year=year;
  if grant_amount is null then raise exception 'No leave grant is configured for this type and year.';end if;
  select coalesce(sum(charged_days(req.requester_id,l.start_date,l.end_date)),0) into used_days from request_lines l join requests r on r.id=l.request_id where r.requester_id=req.requester_id and r.status='approved' and r.id<>p_request and l.pto_type_id=kind.id and extract(year from l.start_date)=year;
  select coalesce(sum(charged_days(req.requester_id,l.start_date,l.end_date)),0) into requested_days from request_lines l where l.request_id=p_request and l.pto_type_id=kind.id and extract(year from l.start_date)=year;
  if used_days+requested_days>grant_amount then raise exception 'Your leave balance is short for these dates.';end if;
 end loop;
end$$;
create function public.submit_request(p_note text,p_lines jsonb) returns uuid language plpgsql security definer set search_path=public as $$declare request_id uuid;line jsonb;begin
 if not active_actor() or exists(select 1 from profiles where id=auth.uid() and password_setup_required) then raise exception 'Finish account setup before requesting leave.';end if;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 30 then raise exception 'Add between 1 and 30 PTO lines.';end if;
 perform 1 from profiles where id=auth.uid() for update;
 insert into requests(requester_id,note) values(auth.uid(),nullif(trim(p_note),'')) returning id into request_id;
 for line in select * from jsonb_array_elements(p_lines) loop insert into request_lines(request_id,pto_type_id,start_date,end_date) values(request_id,(line->>'type_id')::uuid,(line->>'start')::date,(line->>'end')::date);end loop;
 perform assert_request_valid(request_id);insert into request_audit(request_id,actor_id,action) values(request_id,auth.uid(),'submitted');return request_id;end$$;
create function public.decide_request(p_request_id uuid,p_approve boolean,p_reason text) returns void language plpgsql security definer set search_path=public as $$declare req requests;begin
 select * into strict req from requests where id=p_request_id for update;
 if not manages_person(req.requester_id) or req.requester_id=auth.uid() then raise exception 'Not authorized to decide this request.';end if;
 if req.status<>'pending' then raise exception 'This request has already changed. Refresh and try again.';end if;
 if not p_approve and length(trim(coalesce(p_reason,'')))=0 then raise exception 'A reason is required.';end if;
 if p_approve then perform assert_request_valid(p_request_id);end if;
 update requests set status=case when p_approve then 'approved' else 'denied' end,decided_by=auth.uid(),decided_at=now(),denial_reason=case when p_approve then null else trim(p_reason) end where id=p_request_id;
 insert into request_audit(request_id,actor_id,action,reason) values(p_request_id,auth.uid(),case when p_approve then 'approved' else 'denied' end,p_reason);end$$;
create function public.cancel_request(p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$begin
 update requests set status='cancelled' where id=p_request_id and requester_id=auth.uid() and status='pending' and active_actor();if not found then raise exception 'Only your pending requests can be cancelled.';end if;
 insert into request_audit(request_id,actor_id,action) values(p_request_id,auth.uid(),'cancelled');end$$;
create function public.undo_decision(p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$declare req requests;begin
 select * into strict req from requests where id=p_request_id for update;
 if not manages_person(req.requester_id) or req.requester_id=auth.uid() or req.status not in ('approved','denied') or req.decided_at<now()-interval '24 hours' then raise exception 'This decision cannot be undone.';end if;
 update requests set status='pending',decided_by=null,decided_at=null,denial_reason=null where id=p_request_id;insert into request_audit(request_id,actor_id,action) values(p_request_id,auth.uid(),'undone');end$$;
create function public.set_pto_grant(p_user_id uuid,p_type_id uuid,p_leave_year integer,p_amount numeric) returns numeric language plpgsql security definer set search_path=public as $$begin
 if not manages_person(p_user_id) then raise exception 'Not authorized.';end if;
 insert into pto_grants values(p_user_id,p_type_id,p_leave_year,p_amount) on conflict(user_id,pto_type_id,leave_year) do update set amount=excluded.amount;return p_amount;end$$;
create function public.set_profile_normal_days_off(p_user_id uuid,p_days integer[]) returns integer[] language plpgsql security definer set search_path=public as $$begin
 if not active_actor() or not (p_user_id=auth.uid() or manages_person(p_user_id)) then raise exception 'Not authorized.';end if;
 if p_days is null or not p_days <@ array[0,1,2,3,4,5,6] then raise exception 'Choose valid weekdays.';end if;
 update profiles set normal_days_off=p_days,updated_at=now(),updated_by=auth.uid() where id=p_user_id;return p_days;end$$;
create function public.complete_password_setup() returns void language plpgsql security definer set search_path=public as $$begin if not active_actor() then raise exception 'Not authenticated.';end if;update profiles set password_setup_required=false,updated_at=now() where id=auth.uid();end$$;
create function public.save_pto_type(p_id uuid,p_name text,p_color text,p_default_days numeric,p_requires_window boolean,p_is_active boolean,p_windows jsonb) returns uuid language plpgsql security definer set search_path=public as $$declare saved_id uuid;w jsonb;begin
 if not is_god_admin() then raise exception 'Only a god admin can edit leave types.';end if;
 if p_id is null then insert into pto_types(name,color,default_days,requires_window,is_active,created_by) values(trim(p_name),p_color,p_default_days,p_requires_window,p_is_active,auth.uid()) returning id into saved_id;
 else update pto_types set name=trim(p_name),color=p_color,default_days=p_default_days,requires_window=p_requires_window,is_active=p_is_active,updated_at=now(),updated_by=auth.uid() where id=p_id returning id into saved_id;if not found then raise exception 'Leave type not found.';end if;end if;
 delete from date_rules where pto_type_id=saved_id;for w in select * from jsonb_array_elements(coalesce(p_windows,'[]')) loop insert into date_rules(pto_type_id,start_date,end_date,created_by) values(saved_id,(w->>'start')::date,(w->>'end')::date,auth.uid());end loop;return saved_id;end$$;
create function public.save_blackout(p_id uuid,p_start date,p_end date,p_reason text,p_type_ids uuid[]) returns uuid language plpgsql security definer set search_path=public as $$declare saved_id uuid;begin
 if not is_god_admin() then raise exception 'Only a god admin can edit blackouts.';end if;
 if p_id is null then insert into blackout_dates(start_date,end_date,reason,applies_to_all,created_by) values(p_start,p_end,trim(p_reason),p_type_ids is null,auth.uid()) returning id into saved_id;
 else update blackout_dates set start_date=p_start,end_date=p_end,reason=trim(p_reason),applies_to_all=p_type_ids is null,updated_at=now(),updated_by=auth.uid() where id=p_id returning id into saved_id;if not found then raise exception 'Blackout not found.';end if;end if;
 delete from blackout_types where blackout_id=saved_id;insert into blackout_types select saved_id,unnest(p_type_ids);return saved_id;end$$;
create function public.add_team_memberships(p_team_id uuid,p_entries jsonb) returns void language plpgsql security definer set search_path=public as $$declare entry jsonb;target uuid;begin
 if not manages_team(p_team_id) then raise exception 'Not authorized.';end if;
 for entry in select * from jsonb_array_elements(p_entries) loop target:=coalesce(entry->>'userId',entry->>'id')::uuid;
 if not is_god_admin() and exists(select 1 from profiles where id=target and org_role='god_admin') then raise exception 'Not authorized to assign a god admin.';end if;
 insert into team_memberships(team_id,user_id,role,added_by) values(p_team_id,target,coalesce(entry->>'role','employee'),auth.uid()) on conflict(team_id,user_id) do nothing;end loop;end$$;
create function public.save_team(p_id uuid,p_name text,p_description text,p_members jsonb) returns uuid language plpgsql security definer set search_path=public as $$declare saved_id uuid;begin
 if p_id is null then if not is_god_admin() then raise exception 'Only a god admin can create teams.';end if;insert into teams(name,description,created_by) values(trim(p_name),p_description,auth.uid()) returning id into saved_id;
 else if not manages_team(p_id) then raise exception 'Not authorized.';end if;update teams set name=trim(p_name),description=p_description,updated_at=now(),updated_by=auth.uid() where id=p_id returning id into saved_id;if not found then raise exception 'Team not found.';end if;end if;
 perform add_team_memberships(saved_id,coalesce(p_members,'[]'));return saved_id;end$$;
create function public.remove_team_membership(p_team_id uuid,p_user_id uuid) returns void language plpgsql security definer set search_path=public as $$begin
 if not manages_team(p_team_id) or (not is_god_admin() and p_user_id=auth.uid()) then raise exception 'Not authorized.';end if;delete from team_memberships where team_id=p_team_id and user_id=p_user_id;end$$;
create function public.set_team_membership_role(p_team_id uuid,p_user_id uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$begin
 if not manages_team(p_team_id) or (not is_god_admin() and p_user_id=auth.uid()) then raise exception 'Not authorized.';end if;update team_memberships set role=p_role,updated_at=now(),updated_by=auth.uid() where team_id=p_team_id and user_id=p_user_id;if not found then raise exception 'Membership not found.';end if;end$$;
create function public.set_profile_org_role(p_user_id uuid,p_org_role text) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_god_admin() or p_user_id=auth.uid() then raise exception 'Not authorized.';end if;update profiles set org_role=p_org_role,updated_at=now(),updated_by=auth.uid() where id=p_user_id;end$$;
create function public.set_profile_active(p_user_id uuid,p_is_active boolean) returns void language plpgsql security definer set search_path=public as $$begin
 if not is_god_admin() or p_user_id=auth.uid() then raise exception 'Not authorized.';end if;update profiles set is_active=p_is_active,updated_at=now(),updated_by=auth.uid() where id=p_user_id;end$$;
create function public.team_coverage(p_from date,p_to date) returns table(team_id uuid,day date,out_count bigint,on_shift_count bigint) language plpgsql stable security definer set search_path=public as $$begin
 if not active_actor() then raise exception 'Not authenticated.';end if;
 if p_to<p_from or p_to-p_from>366 then raise exception 'Choose a range of up to one year.';end if;
 return query select tm.team_id,d::date,count(distinct p.id) filter(where exists(select 1 from requests r join request_lines l on l.request_id=r.id where r.requester_id=p.id and r.status='approved' and d::date between l.start_date and l.end_date)),count(distinct p.id) filter(where not exists(select 1 from requests r join request_lines l on l.request_id=r.id where r.requester_id=p.id and r.status='approved' and d::date between l.start_date and l.end_date)) from generate_series(p_from::timestamp,p_to::timestamp,interval '1 day') d cross join team_memberships tm join profiles p on p.id=tm.user_id where p.is_active and not extract(dow from d)::integer=any(p.normal_days_off) and not exists(select 1 from holidays h where h.date=d::date) group by tm.team_id,d;end$$;
-- Definer helpers must not be callable anonymously; internal validation is private.
revoke execute on all functions in schema public from public;
grant execute on function active_actor(),is_god_admin(),manages_team(uuid),manages_person(uuid),can_read_request(uuid),submit_request(text,jsonb),decide_request(uuid,boolean,text),cancel_request(uuid),undo_decision(uuid),set_pto_grant(uuid,uuid,integer,numeric),set_profile_normal_days_off(uuid,integer[]),complete_password_setup(),save_pto_type(uuid,text,text,numeric,boolean,boolean,jsonb),save_blackout(uuid,date,date,text,uuid[]),save_team(uuid,text,text,jsonb),add_team_memberships(uuid,jsonb),remove_team_membership(uuid,uuid),set_team_membership_role(uuid,uuid,text),set_profile_org_role(uuid,text),set_profile_active(uuid,boolean),team_coverage(date,date) to authenticated;
commit;
