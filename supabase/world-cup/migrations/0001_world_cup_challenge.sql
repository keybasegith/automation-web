-- =============================================================================
-- Argosy / Keybase World Cup Challenge 2026
-- Schema, Row Level Security, leaderboard view, and scoring function.
--
-- Tables are namespaced with a `wc_` prefix because this Supabase project is
-- shared across several internal microsites. The columns match the project
-- specification exactly; only the table names carry the prefix.
--
--   spec name           -> table in this DB
--   profiles            -> wc_profiles
--   matches             -> wc_matches
--   predictions         -> wc_predictions
--   canada_challenges   -> wc_canada_challenges
--   final_predictions   -> wc_final_predictions
--   announcements       -> wc_announcements
--   (config, added)     -> wc_event_settings
--   leaderboard_view    -> wc_leaderboard (view)
--
-- Run this file once in the Supabase SQL editor (or via the CLI), then run
-- supabase/world-cup/seed.sql for sample data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.wc_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text not null,
  company     text,
  favorite_team text,
  role        text not null default 'participant',
  created_at  timestamptz not null default now()
);

create table if not exists public.wc_matches (
  id           uuid primary key default gen_random_uuid(),
  match_number integer,
  stage        text,
  group_name   text,
  home_team    text not null,
  away_team    text not null,
  match_date   timestamptz not null,
  venue        text,
  status       text not null default 'scheduled', -- scheduled | live | completed
  home_score   integer,
  away_score   integer,
  winner       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.wc_predictions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.wc_profiles (id) on delete cascade,
  match_id            uuid not null references public.wc_matches (id) on delete cascade,
  predicted_home_score integer not null,
  predicted_away_score integer not null,
  predicted_winner    text,
  points_awarded      integer not null default 0,
  is_locked           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, match_id)
);

create table if not exists public.wc_canada_challenges (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.wc_profiles (id) on delete cascade,
  canada_game_1_result        text,   -- 'W' | 'D' | 'L' (Canada's result)
  canada_game_1_canada_goals  integer,
  canada_game_1_opponent_goals integer,
  canada_game_2_result        text,
  canada_game_2_canada_goals  integer,
  canada_game_2_opponent_goals integer,
  canada_game_3_result        text,
  canada_game_3_canada_goals  integer,
  canada_game_3_opponent_goals integer,
  total_canada_goals_scored   integer,
  total_canada_goals_conceded integer,
  points_awarded              integer not null default 0,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.wc_final_predictions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.wc_profiles (id) on delete cascade,
  finalist_one   text not null,
  finalist_two   text not null,
  champion       text,
  points_awarded integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.wc_announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  type       text not null default 'daily', -- daily | weekly | general
  published  boolean not null default false,
  created_at timestamptz not null default now()
);

-- Single-row configuration table: lock dates, the three Canada group matches,
-- and the official final results used to score the Canada & final challenges.
create table if not exists public.wc_event_settings (
  id                   integer primary key default 1,
  canada_lock_date     timestamptz,
  final_lock_date      timestamptz,
  canada_match_1_id    uuid references public.wc_matches (id) on delete set null,
  canada_match_2_id    uuid references public.wc_matches (id) on delete set null,
  canada_match_3_id    uuid references public.wc_matches (id) on delete set null,
  actual_finalist_one  text,
  actual_finalist_two  text,
  actual_champion      text,
  updated_at           timestamptz not null default now(),
  constraint wc_event_settings_singleton check (id = 1)
);

insert into public.wc_event_settings (id) values (1)
on conflict (id) do nothing;

create index if not exists wc_predictions_match_idx on public.wc_predictions (match_id);
create index if not exists wc_predictions_user_idx  on public.wc_predictions (user_id);
create index if not exists wc_matches_date_idx       on public.wc_matches (match_date);

-- -----------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- -----------------------------------------------------------------------------
create or replace function public.wc_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wc_matches_touch on public.wc_matches;
create trigger wc_matches_touch before update on public.wc_matches
  for each row execute function public.wc_touch_updated_at();

drop trigger if exists wc_predictions_touch on public.wc_predictions;
create trigger wc_predictions_touch before update on public.wc_predictions
  for each row execute function public.wc_touch_updated_at();

drop trigger if exists wc_canada_touch on public.wc_canada_challenges;
create trigger wc_canada_touch before update on public.wc_canada_challenges
  for each row execute function public.wc_touch_updated_at();

drop trigger if exists wc_final_touch on public.wc_final_predictions;
create trigger wc_final_touch before update on public.wc_final_predictions
  for each row execute function public.wc_touch_updated_at();

-- -----------------------------------------------------------------------------
-- Auth helper: is the current user an admin? SECURITY DEFINER avoids RLS
-- recursion when used inside wc_profiles policies.
-- -----------------------------------------------------------------------------
create or replace function public.wc_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.wc_profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.wc_profiles          enable row level security;
alter table public.wc_matches           enable row level security;
alter table public.wc_predictions        enable row level security;
alter table public.wc_canada_challenges  enable row level security;
alter table public.wc_final_predictions  enable row level security;
alter table public.wc_announcements      enable row level security;
alter table public.wc_event_settings     enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists wc_profiles_select_own on public.wc_profiles;
create policy wc_profiles_select_own on public.wc_profiles
  for select using (auth.uid() = id or public.wc_is_admin());

drop policy if exists wc_profiles_insert_own on public.wc_profiles;
create policy wc_profiles_insert_own on public.wc_profiles
  for insert with check (auth.uid() = id and role = 'participant');

drop policy if exists wc_profiles_update_own on public.wc_profiles;
create policy wc_profiles_update_own on public.wc_profiles
  for update using (auth.uid() = id or public.wc_is_admin())
  with check (auth.uid() = id or public.wc_is_admin());

-- matches: public read, admin write ------------------------------------------
drop policy if exists wc_matches_select_all on public.wc_matches;
create policy wc_matches_select_all on public.wc_matches
  for select using (true);

drop policy if exists wc_matches_admin_write on public.wc_matches;
create policy wc_matches_admin_write on public.wc_matches
  for all using (public.wc_is_admin()) with check (public.wc_is_admin());

-- predictions: own CRUD before lock; admin read all --------------------------
drop policy if exists wc_predictions_select_own on public.wc_predictions;
create policy wc_predictions_select_own on public.wc_predictions
  for select using (auth.uid() = user_id or public.wc_is_admin());

drop policy if exists wc_predictions_insert_own on public.wc_predictions;
create policy wc_predictions_insert_own on public.wc_predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.wc_matches m
      where m.id = match_id and m.match_date > now()
    )
  );

drop policy if exists wc_predictions_update_own on public.wc_predictions;
create policy wc_predictions_update_own on public.wc_predictions
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.wc_matches m
      where m.id = match_id and m.match_date > now()
    )
  );

-- canada challenge: own CRUD before canada lock; admin read all --------------
drop policy if exists wc_canada_select_own on public.wc_canada_challenges;
create policy wc_canada_select_own on public.wc_canada_challenges
  for select using (auth.uid() = user_id or public.wc_is_admin());

drop policy if exists wc_canada_write_own on public.wc_canada_challenges;
create policy wc_canada_write_own on public.wc_canada_challenges
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and coalesce(
      (select s.canada_lock_date from public.wc_event_settings s where s.id = 1) > now(),
      true
    )
  );

-- final prediction: own CRUD before final lock; admin read all ---------------
drop policy if exists wc_final_select_own on public.wc_final_predictions;
create policy wc_final_select_own on public.wc_final_predictions
  for select using (auth.uid() = user_id or public.wc_is_admin());

drop policy if exists wc_final_write_own on public.wc_final_predictions;
create policy wc_final_write_own on public.wc_final_predictions
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and coalesce(
      (select s.final_lock_date from public.wc_event_settings s where s.id = 1) > now(),
      true
    )
  );

-- announcements: public reads published; admin all --------------------------
drop policy if exists wc_announcements_select on public.wc_announcements;
create policy wc_announcements_select on public.wc_announcements
  for select using (published = true or public.wc_is_admin());

drop policy if exists wc_announcements_admin_write on public.wc_announcements;
create policy wc_announcements_admin_write on public.wc_announcements
  for all using (public.wc_is_admin()) with check (public.wc_is_admin());

-- event settings: public read, admin write ----------------------------------
drop policy if exists wc_settings_select on public.wc_event_settings;
create policy wc_settings_select on public.wc_event_settings
  for select using (true);

drop policy if exists wc_settings_admin_write on public.wc_event_settings;
create policy wc_settings_admin_write on public.wc_event_settings
  for all using (public.wc_is_admin()) with check (public.wc_is_admin());

-- -----------------------------------------------------------------------------
-- Public leaderboard view
-- Runs with the view owner's privileges (not security_invoker), so it can
-- aggregate every participant's points for a public leaderboard without
-- exposing the underlying tables or any email addresses.
-- -----------------------------------------------------------------------------
create or replace view public.wc_leaderboard as
with match_pts as (
  select user_id, coalesce(sum(points_awarded), 0) as pts
  from public.wc_predictions group by user_id
),
canada_pts as (
  select user_id, coalesce(sum(points_awarded), 0) as pts
  from public.wc_canada_challenges group by user_id
),
final_pts as (
  select user_id, coalesce(sum(points_awarded), 0) as pts
  from public.wc_final_predictions group by user_id
)
select
  p.id                                   as user_id,
  p.full_name,
  p.company,
  coalesce(m.pts, 0)
    + coalesce(c.pts, 0)
    + coalesce(f.pts, 0)                 as total_points,
  coalesce(m.pts, 0)                     as match_points,
  coalesce(c.pts, 0)                     as canada_points,
  coalesce(f.pts, 0)                     as final_points,
  rank() over (
    order by coalesce(m.pts, 0) + coalesce(c.pts, 0) + coalesce(f.pts, 0) desc
  )                                      as rank
from public.wc_profiles p
left join match_pts  m on m.user_id = p.id
left join canada_pts c on c.user_id = p.id
left join final_pts  f on f.user_id = p.id
where p.role <> 'admin';

-- -----------------------------------------------------------------------------
-- Scoring: recompute every participant's points. Admin-only.
-- -----------------------------------------------------------------------------
create or replace function public.wc_recalculate_points()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s            public.wc_event_settings%rowtype;
  rec          record;
  cg           record;            -- a canada match row
  canada_total_scored   integer;
  canada_total_conceded integer;
  game_pts     integer;
  fin_pts      integer;
  one_correct  boolean;
  both_correct boolean;
begin
  if not public.wc_is_admin() then
    raise exception 'Only admins can recalculate points';
  end if;

  select * into s from public.wc_event_settings where id = 1;

  -- ---- Match predictions --------------------------------------------------
  update public.wc_predictions pr
  set points_awarded = sub.pts,
      is_locked = (m.match_date <= now())
  from public.wc_matches m
  cross join lateral (
    select case
      when m.status <> 'completed' or m.home_score is null or m.away_score is null then 0
      -- exact score = 8 (no goal-difference double count)
      when pr.predicted_home_score = m.home_score
       and pr.predicted_away_score = m.away_score then 8
      else
        -- correct result (3) + correct goal difference bonus (2)
        (case when sign(pr.predicted_home_score - pr.predicted_away_score)
                 = sign(m.home_score - m.away_score) then 3 else 0 end)
        +
        (case when (pr.predicted_home_score - pr.predicted_away_score)
                 = (m.home_score - m.away_score) then 2 else 0 end)
    end as pts
  ) sub
  where pr.match_id = m.id;

  -- ---- Canada Pride Challenge ---------------------------------------------
  for rec in select * from public.wc_canada_challenges loop
    game_pts := 0;
    canada_total_scored := 0;
    canada_total_conceded := 0;

    -- helper inline per game via a temp lookup of the mapped match
    -- Game 1
    for cg in
      select * from public.wc_canada_match_actual(s.canada_match_1_id)
    loop
      if cg.completed then
        canada_total_scored := canada_total_scored + cg.canada_goals;
        canada_total_conceded := canada_total_conceded + cg.opponent_goals;
        if rec.canada_game_1_result is not null and rec.canada_game_1_result = cg.result then
          game_pts := game_pts + 5;
        end if;
        if rec.canada_game_1_canada_goals = cg.canada_goals then game_pts := game_pts + 5; end if;
        if rec.canada_game_1_opponent_goals = cg.opponent_goals then game_pts := game_pts + 5; end if;
      end if;
    end loop;
    -- Game 2
    for cg in
      select * from public.wc_canada_match_actual(s.canada_match_2_id)
    loop
      if cg.completed then
        canada_total_scored := canada_total_scored + cg.canada_goals;
        canada_total_conceded := canada_total_conceded + cg.opponent_goals;
        if rec.canada_game_2_result is not null and rec.canada_game_2_result = cg.result then
          game_pts := game_pts + 5;
        end if;
        if rec.canada_game_2_canada_goals = cg.canada_goals then game_pts := game_pts + 5; end if;
        if rec.canada_game_2_opponent_goals = cg.opponent_goals then game_pts := game_pts + 5; end if;
      end if;
    end loop;
    -- Game 3
    for cg in
      select * from public.wc_canada_match_actual(s.canada_match_3_id)
    loop
      if cg.completed then
        canada_total_scored := canada_total_scored + cg.canada_goals;
        canada_total_conceded := canada_total_conceded + cg.opponent_goals;
        if rec.canada_game_3_result is not null and rec.canada_game_3_result = cg.result then
          game_pts := game_pts + 5;
        end if;
        if rec.canada_game_3_canada_goals = cg.canada_goals then game_pts := game_pts + 5; end if;
        if rec.canada_game_3_opponent_goals = cg.opponent_goals then game_pts := game_pts + 5; end if;
      end if;
    end loop;

    -- Totals: only score once all three games are completed.
    if (select count(*) from public.wc_matches m
        where m.id in (s.canada_match_1_id, s.canada_match_2_id, s.canada_match_3_id)
          and m.status = 'completed') = 3 then
      if rec.total_canada_goals_scored = canada_total_scored then game_pts := game_pts + 10; end if;
      if rec.total_canada_goals_conceded = canada_total_conceded then game_pts := game_pts + 10; end if;
    end if;

    update public.wc_canada_challenges set points_awarded = game_pts where id = rec.id;
  end loop;

  -- ---- Final prediction ----------------------------------------------------
  for rec in select * from public.wc_final_predictions loop
    fin_pts := 0;
    if s.actual_finalist_one is not null and s.actual_finalist_two is not null then
      both_correct :=
        (rec.finalist_one in (s.actual_finalist_one, s.actual_finalist_two))
        and (rec.finalist_two in (s.actual_finalist_one, s.actual_finalist_two))
        and (rec.finalist_one <> rec.finalist_two);
      one_correct :=
        (rec.finalist_one in (s.actual_finalist_one, s.actual_finalist_two))
        or (rec.finalist_two in (s.actual_finalist_one, s.actual_finalist_two));
      if both_correct then
        fin_pts := fin_pts + 25;
      elsif one_correct then
        fin_pts := fin_pts + 10;
      end if;
    end if;
    if s.actual_champion is not null and rec.champion = s.actual_champion then
      fin_pts := fin_pts + 30;
    end if;
    update public.wc_final_predictions set points_awarded = fin_pts where id = rec.id;
  end loop;
end;
$$;

-- Helper that returns the actual Canada result for a mapped match id. Returns
-- a single row (or no rows when the id is null). `completed` indicates whether
-- the match has a final score recorded.
create or replace function public.wc_canada_match_actual(p_match_id uuid)
returns table (completed boolean, result text, canada_goals integer, opponent_goals integer)
language plpgsql
stable
as $$
declare m public.wc_matches%rowtype;
begin
  if p_match_id is null then return; end if;
  select * into m from public.wc_matches where id = p_match_id;
  if not found then return; end if;

  if m.status <> 'completed' or m.home_score is null or m.away_score is null then
    completed := false; result := null; canada_goals := null; opponent_goals := null;
    return next; return;
  end if;

  completed := true;
  if m.home_team = 'Canada' then
    canada_goals := m.home_score; opponent_goals := m.away_score;
  else
    canada_goals := m.away_score; opponent_goals := m.home_score;
  end if;
  result := case
    when canada_goals > opponent_goals then 'W'
    when canada_goals < opponent_goals then 'L'
    else 'D' end;
  return next;
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants (RLS still applies; PostgREST needs these base grants).
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.wc_matches, public.wc_announcements, public.wc_event_settings to anon, authenticated;
grant select on public.wc_leaderboard to anon, authenticated;
grant select, insert, update, delete on
  public.wc_profiles, public.wc_predictions,
  public.wc_canada_challenges, public.wc_final_predictions to authenticated;
grant insert, update, delete on
  public.wc_matches, public.wc_announcements, public.wc_event_settings to authenticated;
grant execute on function public.wc_recalculate_points() to authenticated;
grant execute on function public.wc_is_admin() to anon, authenticated;
