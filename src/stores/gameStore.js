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
          state.isRunning = true;
          state.firstCardDrawn = true;
          
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
                this.endGame();
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
      update(state => {
        state.isRunning = false;
        return state;
      });
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
        if (!state.playerScores[playerId]) {
          state.playerScores[playerId] = 0;
        }
        state.playerScores[playerId] += 1;
        return state;
      });
    },
    
    endGame() {
      this.stopTimer();
      update(state => {
        state.gameOver = true;
        
        // Calculate winner
        let maxScore = -1;
        let winnerPlayer = null;
        
        for (const [playerId, score] of Object.entries(state.playerScores)) {
          if (score > maxScore) {
            maxScore = score;
            winnerPlayer = playerId;
          }
        }
        
        if (winnerPlayer) {
          state.winner = {
            playerId: winnerPlayer,
            score: maxScore,
            message: `${winnerPlayer} wins with ${maxScore} action cards!`
          };
        } else {
          state.winner = {
            playerId: null,
            score: 0,
            message: "No winner - no action cards were played!"
          };
        }
        
        return state;
      });
    }
  };
}

export const gameStore = createGameStore();