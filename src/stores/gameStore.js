import { writable } from 'svelte/store';

function createGameStore() {
  const { subscribe, set, update } = writable({
    timeLeft: 1200, // 20 minutes in seconds
    isRunning: false,
    firstCardDrawn: false,
    gameOver: false,
    winner: null,
    playerScores: {}
  });

  let timerInterval = null;

  return {
    subscribe,
    startTimer() {
      update(state => {
        if (!state.firstCardDrawn) {
          state.firstCardDrawn = true;
          state.isRunning = true;
          
          // Clear any existing interval
          if (timerInterval) {
            clearInterval(timerInterval);
          }
          
          // Start the countdown
          timerInterval = setInterval(() => {
            update(currentState => {
              if (currentState.timeLeft > 0) {
                currentState.timeLeft -= 1;
              } else {
                // Time's up - end the game
                gameStore.endGame();
              }
              return currentState;
            });
          }, 1000);
        }
        return state;
      });
    },
    
    stopTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      update(state => ({
        ...state,
        isRunning: false
      }));
    },
    
    resetTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      set({
        timeLeft: 1200,
        isRunning: false,
        firstCardDrawn: false,
        gameOver: false,
        winner: null,
        playerScores: {}
      });
    },
    
    recordActionCard(playerId) {
      update(state => {
        const newPlayerScores = { ...state.playerScores };
        newPlayerScores[playerId] = (newPlayerScores[playerId] || 0) + 1;
        return {
          ...state,
          playerScores: newPlayerScores
        };
      });
    },
    
    endGame() {
      gameStore.stopTimer();
      update(state => {
        // Find the player with the most action cards
        let maxScore = -1;
        let winner = null;
        let tie = false;
        
        const playerIds = Object.keys(state.playerScores);
        
        if (playerIds.length === 0) {
          winner = "No winner - no action cards played";
        } else {
          for (const playerId of playerIds) {
            const score = state.playerScores[playerId];
            if (score > maxScore) {
              maxScore = score;
              winner = playerId;
              tie = false;
            } else if (score === maxScore) {
              tie = true;
            }
          }
          
          if (tie) {
            const tiedPlayers = playerIds.filter(id => state.playerScores[id] === maxScore);
            winner = `Tie between: ${tiedPlayers.join(', ')} (${maxScore} cards each)`;
          } else {
            winner = `${winner} wins with ${maxScore} action cards!`;
          }
        }
        
        return {
          ...state,
          gameOver: true,
          winner: winner
        };
      });
    },
    
    // Helper method to format time for display
    formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };
}

export const gameStore = createGameStore();