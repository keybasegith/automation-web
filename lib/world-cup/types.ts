// Domain types for the Argosy / Keybase World Cup Challenge 2026.
// These mirror the wc_* tables in supabase/world-cup/migrations.

export type Role = "participant" | "admin";
export type MatchStatus = "scheduled" | "live" | "completed";
export type CanadaResult = "W" | "D" | "L";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  favorite_team: string | null;
  role: Role;
  created_at: string;
}

export interface Match {
  id: string;
  match_number: number | null;
  stage: string | null;
  group_name: string | null;
  home_team: string;
  away_team: string;
  match_date: string;
  venue: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  winner: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_winner: string | null;
  points_awarded: number;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CanadaChallenge {
  id: string;
  user_id: string;
  canada_game_1_result: CanadaResult | null;
  canada_game_1_canada_goals: number | null;
  canada_game_1_opponent_goals: number | null;
  canada_game_2_result: CanadaResult | null;
  canada_game_2_canada_goals: number | null;
  canada_game_2_opponent_goals: number | null;
  canada_game_3_result: CanadaResult | null;
  canada_game_3_canada_goals: number | null;
  canada_game_3_opponent_goals: number | null;
  total_canada_goals_scored: number | null;
  total_canada_goals_conceded: number | null;
  points_awarded: number;
  created_at: string;
  updated_at: string;
}

export interface FinalPrediction {
  id: string;
  user_id: string;
  finalist_one: string;
  finalist_two: string;
  champion: string | null;
  points_awarded: number;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "daily" | "weekly" | "general";
  published: boolean;
  created_at: string;
}

export interface EventSettings {
  id: number;
  canada_lock_date: string | null;
  final_lock_date: string | null;
  canada_match_1_id: string | null;
  canada_match_2_id: string | null;
  canada_match_3_id: string | null;
  actual_finalist_one: string | null;
  actual_finalist_two: string | null;
  actual_champion: string | null;
  updated_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  full_name: string;
  company: string | null;
  total_points: number;
  match_points: number;
  canada_points: number;
  final_points: number;
  rank: number;
}
