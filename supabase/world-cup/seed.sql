-- =============================================================================
-- Argosy / Keybase World Cup Challenge 2026 — sample data
-- Run AFTER migrations/0001_world_cup_challenge.sql
--
-- These are PLACEHOLDER fixtures so the app is populated for a demo. Admins can
-- edit / delete every match from the Admin → Matches screen. The three "Canada
-- Group Stage" games are wired into wc_event_settings for the Canada Pride
-- Challenge scoring.
--
-- Participants and predictions are created through real sign-ups (Supabase
-- Auth), so they are not seeded here. See README "Creating the first admin".
-- =============================================================================

-- Fixed UUIDs for Canada's three group games so we can reference them below.
insert into public.wc_matches
  (id, match_number, stage, group_name, home_team, away_team, match_date, venue, status, home_score, away_score, winner)
values
  ('11111111-1111-1111-1111-111111111101', 1, 'Group Stage', 'Group B', 'Canada', 'Morocco',
     '2026-06-12 19:00:00-04', 'BMO Field, Toronto', 'scheduled', null, null, null),
  ('11111111-1111-1111-1111-111111111102', 18, 'Group Stage', 'Group B', 'Canada', 'Croatia',
     '2026-06-18 19:00:00-04', 'BC Place, Vancouver', 'scheduled', null, null, null),
  ('11111111-1111-1111-1111-111111111103', 35, 'Group Stage', 'Group B', 'Belgium', 'Canada',
     '2026-06-24 16:00:00-04', 'BMO Field, Toronto', 'scheduled', null, null, null)
on conflict (id) do nothing;

-- A spread of other placeholder fixtures across the tournament window.
insert into public.wc_matches
  (match_number, stage, group_name, home_team, away_team, match_date, venue, status)
values
  (2,  'Group Stage', 'Group A', 'Mexico',      'Norway',     '2026-06-11 20:00:00-04', 'Estadio Azteca, Mexico City', 'scheduled'),
  (3,  'Group Stage', 'Group A', 'USA',         'Japan',      '2026-06-12 16:00:00-04', 'SoFi Stadium, Los Angeles',   'scheduled'),
  (4,  'Group Stage', 'Group C', 'Argentina',   'Australia',  '2026-06-13 15:00:00-04', 'MetLife Stadium, New York',   'scheduled'),
  (5,  'Group Stage', 'Group C', 'France',      'Senegal',    '2026-06-13 18:00:00-04', 'Hard Rock Stadium, Miami',    'scheduled'),
  (6,  'Group Stage', 'Group D', 'Brazil',      'Switzerland','2026-06-14 15:00:00-04', 'Lincoln Financial, Philly',   'scheduled'),
  (7,  'Group Stage', 'Group D', 'England',     'Ghana',      '2026-06-14 18:00:00-04', 'Levi''s Stadium, San Jose',   'scheduled'),
  (8,  'Group Stage', 'Group E', 'Spain',       'South Korea','2026-06-15 16:00:00-04', 'AT&T Stadium, Dallas',        'scheduled'),
  (9,  'Group Stage', 'Group F', 'Germany',     'Ecuador',    '2026-06-16 16:00:00-04', 'Arrowhead Stadium, KC',       'scheduled'),
  (49, 'Round of 32', null,      'Winner B',    'Runner-up F','2026-06-29 16:00:00-04', 'BMO Field, Toronto',          'scheduled'),
  (90, 'Final',       null,      'TBD',         'TBD',        '2026-07-19 16:00:00-04', 'MetLife Stadium, New York',   'scheduled')
on conflict do nothing;

-- Wire the Canada Pride Challenge to Canada's three group games + lock dates.
update public.wc_event_settings set
  canada_match_1_id = '11111111-1111-1111-1111-111111111101',
  canada_match_2_id = '11111111-1111-1111-1111-111111111102',
  canada_match_3_id = '11111111-1111-1111-1111-111111111103',
  canada_lock_date  = '2026-06-12 19:00:00-04',  -- kickoff of Canada's first game
  final_lock_date   = '2026-07-04 12:00:00-04',  -- before knockout finals begin
  updated_at        = now()
where id = 1;

-- Sample announcements (one published daily update, one welcome note).
insert into public.wc_announcements (title, body, type, published) values
  ('Welcome to the Challenge!',
   'The Argosy / Keybase World Cup Challenge 2026 is officially open. Register, submit your predictions before kickoff, and follow the leaderboard all the way to the final on July 19. Stronger Together — let''s celebrate Canada through sport!',
   'general', true),
  ('Day 1 Recap — Tournament Kicks Off',
   'The 2026 FIFA World Cup is underway! Canada opens its group stage on June 12. Get your match and Canada Pride predictions in before lock. Daily updates land here every morning.',
   'daily', true)
on conflict do nothing;
