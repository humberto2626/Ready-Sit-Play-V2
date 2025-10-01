import { supabase } from './supabase.js';

/**
 * Game Database Service
 * Handles all database operations for the Ready, Sit, Play! game
 */

/**
 * Find or create a player by name
 * @param {string} name - Player name
 * @param {string} email - Optional email address
 * @param {boolean} emailConsent - Whether player consents to emails
 * @returns {Promise<{id: string, name: string}>} Player object
 */
export async function findOrCreatePlayer(name, email = null, emailConsent = false) {
  try {
    // First, try to find existing player by name
    const { data: existingPlayer, error: findError } = await supabase
      .from('players')
      .select('id, name, email, total_games, total_wins')
      .eq('name', name)
      .maybeSingle();

    if (findError) {
      console.error('Error finding player:', findError);
      throw findError;
    }

    if (existingPlayer) {
      // Update email if provided and different
      if (email && email !== existingPlayer.email) {
        const { error: updateError } = await supabase
          .from('players')
          .update({ email, email_consent: emailConsent, updated_at: new Date().toISOString() })
          .eq('id', existingPlayer.id);

        if (updateError) {
          console.error('Error updating player email:', updateError);
        }
      }
      return existingPlayer;
    }

    // Create new player
    const { data: newPlayer, error: createError } = await supabase
      .from('players')
      .insert({
        name,
        email,
        email_consent: emailConsent,
        total_games: 0,
        total_wins: 0
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating player:', createError);
      throw createError;
    }

    return newPlayer;
  } catch (error) {
    console.error('Error in findOrCreatePlayer:', error);
    return null;
  }
}

/**
 * Find or create a dog by name and owner
 * @param {string} name - Dog name
 * @param {string} ownerPlayerId - Owner player ID
 * @returns {Promise<{id: string, name: string}>} Dog object
 */
export async function findOrCreateDog(name, ownerPlayerId) {
  try {
    // Try to find existing dog by name and owner
    const { data: existingDog, error: findError } = await supabase
      .from('dogs')
      .select('id, name, total_games')
      .eq('name', name)
      .eq('owner_player_id', ownerPlayerId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding dog:', findError);
      throw findError;
    }

    if (existingDog) {
      return existingDog;
    }

    // Create new dog
    const { data: newDog, error: createError } = await supabase
      .from('dogs')
      .insert({
        name,
        owner_player_id: ownerPlayerId,
        total_games: 0
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating dog:', createError);
      throw createError;
    }

    return newDog;
  } catch (error) {
    console.error('Error in findOrCreateDog:', error);
    return null;
  }
}

/**
 * Create a new game session
 * @param {Object} gameData - Game initialization data
 * @returns {Promise<{id: string}>} Game object
 */
export async function createGame(gameData) {
  try {
    const { data: game, error } = await supabase
      .from('games')
      .insert({
        dog_id: gameData.dogId,
        num_players: gameData.numPlayers,
        started_at: new Date().toISOString(),
        is_completed: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating game:', error);
      throw error;
    }

    // Create game participants
    const participants = gameData.players.map((player, index) => ({
      game_id: game.id,
      player_id: player.id,
      player_number: index + 1,
      final_action_cards: 0,
      advantage_cards_won: 0,
      actions_completed: 0,
      actions_failed: 0
    }));

    const { error: participantsError } = await supabase
      .from('game_participants')
      .insert(participants);

    if (participantsError) {
      console.error('Error creating game participants:', participantsError);
    }

    return game;
  } catch (error) {
    console.error('Error in createGame:', error);
    return null;
  }
}

/**
 * Record a game action (card drawn and outcome)
 * @param {Object} actionData - Action data
 * @returns {Promise<{id: string}>} Action object
 */
export async function recordGameAction(actionData) {
  try {
    const { data: action, error } = await supabase
      .from('game_actions')
      .insert({
        game_id: actionData.gameId,
        player_id: actionData.playerId,
        card_id: actionData.cardId,
        card_category: actionData.cardCategory,
        card_label: actionData.cardLabel,
        success: actionData.success,
        had_challenge: actionData.hadChallenge || false,
        completion_time_seconds: actionData.completionTime,
        video_recorded: actionData.videoRecorded || false,
        video_url: actionData.videoUrl
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording action:', error);
      throw error;
    }

    // Update participant statistics
    if (actionData.success) {
      await updateParticipantStats(actionData.gameId, actionData.playerId, 'actions_completed');
    } else {
      await updateParticipantStats(actionData.gameId, actionData.playerId, 'actions_failed');
    }

    // Update player card statistics
    await updatePlayerCardStats(actionData.playerId, actionData.cardId, actionData.cardLabel, actionData.success, actionData.completionTime);

    return action;
  } catch (error) {
    console.error('Error in recordGameAction:', error);
    return null;
  }
}

/**
 * Update participant statistics during game
 * @param {string} gameId - Game ID
 * @param {string} playerId - Player ID
 * @param {string} statField - Field to increment
 */
async function updateParticipantStats(gameId, playerId, statField) {
  try {
    const { data: participant, error: fetchError } = await supabase
      .from('game_participants')
      .select('*')
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .single();

    if (fetchError || !participant) {
      console.error('Error fetching participant:', fetchError);
      return;
    }

    const { error: updateError } = await supabase
      .from('game_participants')
      .update({ [statField]: participant[statField] + 1 })
      .eq('game_id', gameId)
      .eq('player_id', playerId);

    if (updateError) {
      console.error('Error updating participant stats:', updateError);
    }
  } catch (error) {
    console.error('Error in updateParticipantStats:', error);
  }
}

/**
 * Update player card statistics
 * @param {string} playerId - Player ID
 * @param {number} cardId - Card ID
 * @param {string} cardLabel - Card label
 * @param {boolean} success - Whether action succeeded
 * @param {number} completionTime - Time taken in seconds
 */
async function updatePlayerCardStats(playerId, cardId, cardLabel, success, completionTime) {
  try {
    const { data: existingStats, error: fetchError } = await supabase
      .from('player_card_statistics')
      .select('*')
      .eq('player_id', playerId)
      .eq('card_id', cardId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching card stats:', fetchError);
      return;
    }

    if (existingStats) {
      // Update existing statistics
      const newAttempts = existingStats.times_attempted + 1;
      const newSuccesses = existingStats.times_succeeded + (success ? 1 : 0);

      let newAvgTime = existingStats.average_completion_time;
      if (completionTime && success) {
        const totalTime = (existingStats.average_completion_time * existingStats.times_succeeded) + completionTime;
        newAvgTime = totalTime / newSuccesses;
      }

      const { error: updateError } = await supabase
        .from('player_card_statistics')
        .update({
          times_attempted: newAttempts,
          times_succeeded: newSuccesses,
          average_completion_time: newAvgTime,
          updated_at: new Date().toISOString()
        })
        .eq('player_id', playerId)
        .eq('card_id', cardId);

      if (updateError) {
        console.error('Error updating card stats:', updateError);
      }
    } else {
      // Create new statistics record
      const { error: createError } = await supabase
        .from('player_card_statistics')
        .insert({
          player_id: playerId,
          card_id: cardId,
          card_label: cardLabel,
          times_attempted: 1,
          times_succeeded: success ? 1 : 0,
          average_completion_time: success && completionTime ? completionTime : null
        });

      if (createError) {
        console.error('Error creating card stats:', createError);
      }
    }
  } catch (error) {
    console.error('Error in updatePlayerCardStats:', error);
  }
}

/**
 * Update participant final card counts
 * @param {string} gameId - Game ID
 * @param {string} playerId - Player ID
 * @param {number} actionCards - Number of action cards
 * @param {number} advantageCards - Number of advantage cards
 */
export async function updateParticipantCardCounts(gameId, playerId, actionCards, advantageCards) {
  try {
    const { error } = await supabase
      .from('game_participants')
      .update({
        final_action_cards: actionCards,
        advantage_cards_won: advantageCards
      })
      .eq('game_id', gameId)
      .eq('player_id', playerId);

    if (error) {
      console.error('Error updating card counts:', error);
    }
  } catch (error) {
    console.error('Error in updateParticipantCardCounts:', error);
  }
}

/**
 * Complete a game and update statistics
 * @param {string} gameId - Game ID
 * @param {string} winnerPlayerId - Winner player ID (null for tie)
 * @param {number} durationSeconds - Game duration in seconds
 */
export async function completeGame(gameId, winnerPlayerId, durationSeconds) {
  try {
    // Update game record
    const { error: gameError } = await supabase
      .from('games')
      .update({
        winner_player_id: winnerPlayerId,
        game_duration_seconds: durationSeconds,
        completed_at: new Date().toISOString(),
        is_completed: true
      })
      .eq('id', gameId);

    if (gameError) {
      console.error('Error completing game:', gameError);
      return;
    }

    // Get game details
    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select('*, game_participants(player_id)')
      .eq('id', gameId)
      .single();

    if (fetchError || !game) {
      console.error('Error fetching game details:', fetchError);
      return;
    }

    // Update player statistics
    for (const participant of game.game_participants) {
      const isWinner = participant.player_id === winnerPlayerId;

      const { data: player, error: playerFetchError } = await supabase
        .from('players')
        .select('total_games, total_wins')
        .eq('id', participant.player_id)
        .single();

      if (playerFetchError || !player) continue;

      const { error: playerUpdateError } = await supabase
        .from('players')
        .update({
          total_games: player.total_games + 1,
          total_wins: player.total_wins + (isWinner ? 1 : 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', participant.player_id);

      if (playerUpdateError) {
        console.error('Error updating player stats:', playerUpdateError);
      }
    }

    // Update dog statistics
    if (game.dog_id) {
      const { data: dog, error: dogFetchError } = await supabase
        .from('dogs')
        .select('total_games')
        .eq('id', game.dog_id)
        .single();

      if (!dogFetchError && dog) {
        await supabase
          .from('dogs')
          .update({ total_games: dog.total_games + 1 })
          .eq('id', game.dog_id);
      }
    }

    return true;
  } catch (error) {
    console.error('Error in completeGame:', error);
    return false;
  }
}

/**
 * Get player statistics
 * @param {string} playerId - Player ID
 * @returns {Promise<Object>} Player statistics
 */
export async function getPlayerStats(playerId) {
  try {
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      console.error('Error fetching player:', playerError);
      return null;
    }

    const { data: cardStats, error: cardStatsError } = await supabase
      .from('player_card_statistics')
      .select('*')
      .eq('player_id', playerId)
      .order('times_attempted', { ascending: false });

    if (cardStatsError) {
      console.error('Error fetching card stats:', cardStatsError);
    }

    return {
      ...player,
      cardStatistics: cardStats || []
    };
  } catch (error) {
    console.error('Error in getPlayerStats:', error);
    return null;
  }
}

/**
 * Get recent games for display
 * @param {number} limit - Number of games to fetch
 * @returns {Promise<Array>} Array of game records
 */
export async function getRecentGames(limit = 10) {
  try {
    const { data: games, error } = await supabase
      .from('games')
      .select(`
        *,
        dogs(name),
        winner:players!games_winner_player_id_fkey(name),
        game_participants(
          player_number,
          final_action_cards,
          players(name)
        )
      `)
      .eq('is_completed', true)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent games:', error);
      return [];
    }

    return games || [];
  } catch (error) {
    console.error('Error in getRecentGames:', error);
    return [];
  }
}

/**
 * Get leaderboard data
 * @param {number} limit - Number of players to fetch
 * @returns {Promise<Array>} Array of top players
 */
export async function getLeaderboard(limit = 10) {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('name, total_games, total_wins')
      .order('total_wins', { ascending: false })
      .order('total_games', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return players || [];
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    return [];
  }
}
