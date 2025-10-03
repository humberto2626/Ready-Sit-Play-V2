# Quick Migration Application Guide

## Step-by-Step: Apply All Migrations to Supabase

Follow these steps to apply all migration files to your Supabase database:

### 1. Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### 2. Apply Migrations in Order

Copy and paste each migration file's contents into the SQL Editor and run them **in this exact order**:

---

#### Migration 1: Create Game Tables

**File:** `supabase/migrations/20251001190957_create_game_tables.sql`

1. Open the file in your code editor
2. Copy all contents (lines 1-259)
3. Paste into Supabase SQL Editor
4. Click "Run" or press Ctrl+Enter
5. You should see "Success. No rows returned"

**What this creates:**
- players table
- dogs table
- games table
- game_participants table
- game_actions table
- player_card_statistics table
- Indexes for better performance
- RLS policies for all tables

---

#### Migration 2: Add Authentication Support

**File:** `supabase/migrations/20251003000000_add_authentication_support.sql`

1. Open the file in your code editor
2. Copy all contents (lines 1-272)
3. Paste into Supabase SQL Editor
4. Click "Run" or press Ctrl+Enter
5. You should see "Success. No rows returned"

**What this adds:**
- user_id column linking players to auth.users
- is_guest column to distinguish authenticated vs guest players
- display_name column for user-friendly names
- Updated RLS policies for authenticated users
- claim_guest_account() function

---

### 3. Verify Migrations Were Applied

Run this query in the SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables:**
- dogs
- game_actions
- game_participants
- games
- player_card_statistics
- players

### 4. Test Database Connection

Run this test query:

```sql
SELECT COUNT(*) as player_count FROM players;
```

You should see `0` (since the database is empty) without any errors.

### 5. Test RLS Policies

Run this query to see all policies:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see multiple policies for each table.

---

## Troubleshooting

### If Migration 1 Fails

**Error: "relation already exists"**
- The tables are already created
- Skip to Migration 2

**Error: "permission denied"**
- Make sure you're logged into the correct Supabase project
- Check you have owner/admin access

### If Migration 2 Fails

**Error: "column already exists"**
- The migration has already been partially applied
- Check which columns exist:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'players';
```

**Error: "policy already exists"**
- Some policies were already created
- You can safely ignore this or run:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```
Then re-run the migration.

---

## Quick Verification Checklist

After applying all migrations, verify:

- [ ] All 6 tables exist (players, dogs, games, game_participants, game_actions, player_card_statistics)
- [ ] Players table has user_id, is_guest, and display_name columns
- [ ] RLS is enabled on all tables (check with `SELECT tablename FROM pg_tables WHERE rowsecurity = true;`)
- [ ] Multiple policies exist for each table
- [ ] claim_guest_account function exists

---

## Next Steps

Once migrations are applied:

1. Test your Vercel app to ensure database connectivity works
2. Try creating a test game to verify write permissions
3. Check that authentication flow works correctly
4. Keep this file for reference when applying future migrations

---

## Need Help?

If you encounter issues:
1. Check the error message in the SQL Editor
2. Review the Supabase logs (Logs section in dashboard)
3. Verify your `.env` credentials match your Supabase project
4. Refer to the main `DATABASE_WORKFLOW.md` for detailed guidance
