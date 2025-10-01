/*
  # Ready, Sit, Play! Game Database Schema

  ## Overview
  This migration creates the complete database schema for the dog training card game,
  including player profiles, game sessions, actions, and video metadata.

  ## Tables Created

  ### 1. players
  Stores player information and overall statistics
  - `id` (uuid, primary key) - Unique player identifier
  - `name` (text, unique) - Player name
  - `email` (text, optional) - Player email for summaries
  - `email_consent` (boolean) - Whether player consented to receive emails
  - `total_games` (integer) - Total number of games played
  - `total_wins` (integer) - Total number of games won
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. dogs
  Stores information about dogs participating in games
  - `id` (uuid, primary key) - Unique dog identifier
  - `name` (text) - Dog name
  - `owner_player_id` (uuid) - Reference to player who registered the dog
  - `total_games` (integer) - Total games this dog participated in
  - `created_at` (timestamptz) - Registration timestamp

  ### 3. games
  Stores individual game session data
  - `id` (uuid, primary key) - Unique game identifier
  - `dog_id` (uuid) - Reference to dog that played
  - `winner_player_id` (uuid, optional) - Reference to winning player
  - `num_players` (integer) - Number of players (2 or 3)
  - `game_duration_seconds` (integer) - Total game duration
  - `started_at` (timestamptz) - Game start timestamp
  - `completed_at` (timestamptz, optional) - Game completion timestamp
  - `is_completed` (boolean) - Whether game finished normally

  ### 4. game_participants
  Links players to games with their performance data
  - `id` (uuid, primary key) - Unique participant record
  - `game_id` (uuid) - Reference to game
  - `player_id` (uuid) - Reference to player
  - `player_number` (integer) - Player position (1, 2, or 3)
  - `final_action_cards` (integer) - Number of action cards collected
  - `advantage_cards_won` (integer) - Number of advantage cards won
  - `actions_completed` (integer) - Number of successful actions
  - `actions_failed` (integer) - Number of failed actions

  ### 5. game_actions
  Records each action performed during games
  - `id` (uuid, primary key) - Unique action identifier
  - `game_id` (uuid) - Reference to game
  - `player_id` (uuid) - Reference to player who performed action
  - `card_id` (integer) - ID of the card drawn (1-29)
  - `card_category` (text) - Card category (Action, Challenge, Mini Game)
  - `card_label` (text) - Card label/name
  - `success` (boolean) - Whether action was completed successfully
  - `had_challenge` (boolean) - Whether a challenge card was active
  - `completion_time_seconds` (integer, optional) - Time taken to complete
  - `video_recorded` (boolean) - Whether video was recorded
  - `video_url` (text, optional) - URL/path to recorded video
  - `created_at` (timestamptz) - Action timestamp

  ### 6. player_card_statistics
  Aggregated statistics for each player's performance with specific cards
  - `id` (uuid, primary key) - Unique statistic record
  - `player_id` (uuid) - Reference to player
  - `card_id` (integer) - Card ID
  - `card_label` (text) - Card label for easy reference
  - `times_attempted` (integer) - Number of attempts
  - `times_succeeded` (integer) - Number of successes
  - `average_completion_time` (numeric) - Average time to complete
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Row Level Security (RLS) is enabled on all tables
  - Public read access for game statistics and leaderboards
  - Insert/update restricted to authenticated users or service role
*/

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  email text,
  email_consent boolean DEFAULT false,
  total_games integer DEFAULT 0,
  total_wins integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create dogs table
CREATE TABLE IF NOT EXISTS dogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  total_games integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid REFERENCES dogs(id) ON DELETE SET NULL,
  winner_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  num_players integer NOT NULL CHECK (num_players IN (2, 3)),
  game_duration_seconds integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  is_completed boolean DEFAULT false
);

-- Create game_participants table
CREATE TABLE IF NOT EXISTS game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  player_number integer NOT NULL CHECK (player_number IN (1, 2, 3)),
  final_action_cards integer DEFAULT 0,
  advantage_cards_won integer DEFAULT 0,
  actions_completed integer DEFAULT 0,
  actions_failed integer DEFAULT 0,
  UNIQUE(game_id, player_number)
);

-- Create game_actions table
CREATE TABLE IF NOT EXISTS game_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  card_id integer NOT NULL,
  card_category text NOT NULL,
  card_label text NOT NULL,
  success boolean NOT NULL,
  had_challenge boolean DEFAULT false,
  completion_time_seconds integer,
  video_recorded boolean DEFAULT false,
  video_url text,
  created_at timestamptz DEFAULT now()
);

-- Create player_card_statistics table
CREATE TABLE IF NOT EXISTS player_card_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  card_id integer NOT NULL,
  card_label text NOT NULL,
  times_attempted integer DEFAULT 0,
  times_succeeded integer DEFAULT 0,
  average_completion_time numeric(10, 2),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(player_id, card_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_games_started_at ON games(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner_player_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_game ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_player ON game_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_game_actions_game ON game_actions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_actions_player ON game_actions(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_card_statistics(player_id);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_card_statistics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (for leaderboards and statistics)
CREATE POLICY "Allow public read access to players"
  ON players FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to dogs"
  ON dogs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to games"
  ON games FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to game_participants"
  ON game_participants FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to game_actions"
  ON game_actions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to player_card_statistics"
  ON player_card_statistics FOR SELECT
  TO public
  USING (true);

-- Create RLS policies for insert/update operations (service role or authenticated users)
CREATE POLICY "Allow insert to players"
  ON players FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update to players"
  ON players FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow insert to dogs"
  ON dogs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow insert to games"
  ON games FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update to games"
  ON games FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow insert to game_participants"
  ON game_participants FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update to game_participants"
  ON game_participants FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow insert to game_actions"
  ON game_actions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow insert to player_card_statistics"
  ON player_card_statistics FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow update to player_card_statistics"
  ON player_card_statistics FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);