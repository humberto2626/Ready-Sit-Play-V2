/*
  # Add Video Storage Metadata

  1. Changes Made
    - Add storage-related fields to game_actions table
    - Add video_storage_path for tracking file location in Supabase Storage
    - Add thumbnail_url for quick thumbnail access
    - Add thumbnail_storage_path for tracking thumbnail location
    - Add video_size for storage management
    - Add upload_status to track video upload state
    - Add upload_error for debugging failed uploads

  2. Security
    - Maintain existing RLS policies
    - No changes to access control needed

  3. Notes
    - video_url field remains for backward compatibility
    - upload_status: 'pending', 'uploading', 'completed', 'failed', 'local_only'
    - Existing rows will have NULL for new fields (handled gracefully in code)
*/

-- Add video storage metadata fields to game_actions table
DO $$
BEGIN
  -- Add video_storage_path column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_actions' AND column_name = 'video_storage_path'
  ) THEN
    ALTER TABLE game_actions ADD COLUMN video_storage_path text;
  END IF;

  -- Add thumbnail_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_actions' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE game_actions ADD COLUMN thumbnail_url text;
  END IF;

  -- Add thumbnail_storage_path column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_actions' AND column_name = 'thumbnail_storage_path'
  ) THEN
    ALTER TABLE game_actions ADD COLUMN thumbnail_storage_path text;
  END IF;

  -- Add video_size column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_actions' AND column_name = 'video_size'
  ) THEN
    ALTER TABLE game_actions ADD COLUMN video_size bigint;
  END IF;

  -- Add upload_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_actions' AND column_name = 'upload_status'
  ) THEN
    ALTER TABLE game_actions ADD COLUMN upload_status text DEFAULT 'local_only';
  END IF;

  -- Add upload_error column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_actions' AND column_name = 'upload_error'
  ) THEN
    ALTER TABLE game_actions ADD COLUMN upload_error text;
  END IF;
END $$;

-- Add index for efficient queries by upload status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_game_actions_upload_status'
  ) THEN
    CREATE INDEX idx_game_actions_upload_status ON game_actions(upload_status);
  END IF;
END $$;

-- Add index for efficient queries by game_id and video_recorded
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_game_actions_game_videos'
  ) THEN
    CREATE INDEX idx_game_actions_game_videos ON game_actions(game_id, video_recorded);
  END IF;
END $$;
