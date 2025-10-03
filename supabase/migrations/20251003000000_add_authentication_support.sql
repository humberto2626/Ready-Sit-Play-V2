/*
  # Add Authentication Support to Ready, Sit, Play!

  ## Overview
  This migration adds Supabase authentication support to the existing game database,
  allowing players to create accounts, log in, and have their game history permanently
  tied to their authenticated user accounts.

  ## Changes Made

  ### 1. Players Table Updates
  - Add `user_id` column to link players to Supabase auth.users
  - Add `is_guest` column to distinguish authenticated users from guest players
  - Add `display_name` column for user-friendly names (since name is unique)
  - Create unique index on user_id for quick lookups

  ### 2. Security Enhancements
  - Update RLS policies to allow authenticated users to manage their own data
  - Guest players can still create records (for guest mode gameplay)
  - Authenticated users have enhanced permissions for their linked records

  ### 3. Helper Functions
  - Function to claim guest account data when user authenticates

  ## Important Notes
  - Existing guest player records remain unchanged and functional
  - New authenticated players will have user_id populated
  - Guest players can later "claim" their history by authenticating with matching name
*/

-- Add new columns to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE players ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'is_guest'
  ) THEN
    ALTER TABLE players ADD COLUMN is_guest boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE players ADD COLUMN display_name text;
  END IF;
END $$;

-- Create unique index on user_id for authenticated players
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id) WHERE user_id IS NOT NULL;

-- Update existing players to be marked as guests
UPDATE players SET is_guest = true WHERE user_id IS NULL;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow insert to players" ON players;
DROP POLICY IF EXISTS "Allow update to players" ON players;

-- Create new RLS policies for authenticated users
CREATE POLICY "Authenticated users can insert their own player record"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own player record"
  ON players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow guest players to insert and update (for guest mode)
CREATE POLICY "Guest players can insert records"
  ON players FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Guest players can update their records"
  ON players FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- Update dogs policies for authenticated users
DROP POLICY IF EXISTS "Allow insert to dogs" ON dogs;

CREATE POLICY "Authenticated users can insert dogs"
  ON dogs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = owner_player_id
      AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Guest users can insert dogs"
  ON dogs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Update games policies
DROP POLICY IF EXISTS "Allow insert to games" ON games;
DROP POLICY IF EXISTS "Allow update to games" ON games;

CREATE POLICY "Authenticated users can insert games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their games"
  ON games FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_participants
      JOIN players ON game_participants.player_id = players.id
      WHERE game_participants.game_id = games.id
      AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_participants
      JOIN players ON game_participants.player_id = players.id
      WHERE game_participants.game_id = games.id
      AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Guest users can insert games"
  ON games FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Guest users can update games"
  ON games FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Update game_participants policies
DROP POLICY IF EXISTS "Allow insert to game_participants" ON game_participants;
DROP POLICY IF EXISTS "Allow update to game_participants" ON game_participants;

CREATE POLICY "Authenticated users can insert game participants"
  ON game_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update game participants"
  ON game_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = game_participants.player_id
      AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = game_participants.player_id
      AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Guest users can insert game participants"
  ON game_participants FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Guest users can update game participants"
  ON game_participants FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Update game_actions policies
DROP POLICY IF EXISTS "Allow insert to game_actions" ON game_actions;

CREATE POLICY "Authenticated users can insert game actions"
  ON game_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Guest users can insert game actions"
  ON game_actions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Update player_card_statistics policies
DROP POLICY IF EXISTS "Allow insert to player_card_statistics" ON player_card_statistics;
DROP POLICY IF EXISTS "Allow update to player_card_statistics" ON player_card_statistics;

CREATE POLICY "Authenticated users can insert card statistics"
  ON player_card_statistics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their card statistics"
  ON player_card_statistics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_card_statistics.player_id
      AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = player_card_statistics.player_id
      AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Guest users can insert card statistics"
  ON player_card_statistics FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Guest users can update card statistics"
  ON player_card_statistics FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create function to claim guest account
CREATE OR REPLACE FUNCTION claim_guest_account(
  guest_player_name text,
  authenticated_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  guest_player_id uuid;
BEGIN
  -- Find the guest player by name
  SELECT id INTO guest_player_id
  FROM players
  WHERE name = guest_player_name
    AND is_guest = true
    AND user_id IS NULL
  LIMIT 1;

  -- If guest player found, link to authenticated user
  IF guest_player_id IS NOT NULL THEN
    UPDATE players
    SET user_id = authenticated_user_id,
        is_guest = false,
        updated_at = now()
    WHERE id = guest_player_id;

    RETURN guest_player_id;
  END IF;

  RETURN NULL;
END;
$$;
