<script>
  import { onMount, onDestroy } from 'svelte';
  import MenuOverlay from './lib/MenuOverlay.svelte';
  import VideoRecorder from './lib/VideoRecorder.svelte';
  import GameReview from './lib/GameReview.svelte';

  // Game state
  let gameState = $state('setup'); // 'setup', 'playing', 'gameOver'
  let currentPlayer = $state(1);
  let players = $state([
    { id: 1, name: 'Player 1', cards: [], drawnCards: [], advantageCards: [] },
    { id: 2, name: 'Player 2', cards: [], drawnCards: [], advantageCards: [] },
    { id: 3, name: 'Player 3', cards: [], drawnCards: [], advantageCards: [] }
  ]);
  let numPlayers = $state(2);
  let winner = $state(null);
  let gameHistory = $state([]);
  let recordedActions = $state([]);

  // Global timer state
  let gameTimer = $state(1200); // 20 minutes in seconds
  let timerRunning = $state(false);
  let timerIntervalId = $state(null);
  let firstCardDrawn = $state(false);

  // UI state
  let showMenu = $state(false);
  let showInstructions = $state(false);
  let showGameReview = $state(false);
  let playerTurnCountdown = $state(0);
  let turnCountdownInterval = $state(null);
  let activeCardImage = $state('');

  // Card deck (1-29)
  const totalCards = 29;
  let availableCards = $state([]);

  // Initialize available cards
  function initializeCards() {
    availableCards = Array.from({ length: totalCards }, (_, i) => i + 1);
  }

  // Format timer display (MM:SS)
  function formatTimer(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Start global timer
  function startGlobalTimer() {
    if (!timerRunning) {
      timerRunning = true;
      timerIntervalId = setInterval(() => {
        gameTimer--;
        if (gameTimer <= 0) {
          clearInterval(timerIntervalId);
          timerRunning = false;
          handleTimerEnd();
        }
      }, 1000);
    }
  }

  // Handle timer end - determine winner by most cards
  function handleTimerEnd() {
    const activePlayers = players.slice(0, numPlayers);
    let maxCards = 0;
    let gameWinner = null;

    activePlayers.forEach(player => {
      const totalPlayerCards = player.cards.length + player.drawnCards.length;
      if (totalPlayerCards > maxCards) {
        maxCards = totalPlayerCards;
        gameWinner = player;
      }
    });

    if (gameWinner) {
      winner = gameWinner;
      gameState = 'gameOver';
    }
  }

  // Draw card function
  function drawCard(playerId) {
    if (availableCards.length === 0) return null;
    
    // Start timer on first card draw
    if (!firstCardDrawn && !timerRunning) {
      firstCardDrawn = true;
      startGlobalTimer();
    }

    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const drawnCard = availableCards[randomIndex];
    availableCards.splice(randomIndex, 1);

    const player = players.find(p => p.id === playerId);
    if (player) {
      player.drawnCards.push(drawnCard);
      activeCardImage = `/card-images/${drawnCard}.png`;
      
      // Save state for undo
      gameHistory.push({
        type: 'draw',
        playerId,
        card: drawnCard,
        gameState: JSON.parse(JSON.stringify({ players, availableCards, currentPlayer }))
      });
    }

    return drawnCard;
  }

  // Complete action function
  function completeAction(playerId) {
    const player = players.find(p => p.id === playerId);
    if (player && player.drawnCards.length > 0) {
      const completedCard = player.drawnCards.pop();
      player.cards.push(completedCard);
      
      // Save state for undo
      gameHistory.push({
        type: 'complete',
        playerId,
        card: completedCard,
        gameState: JSON.parse(JSON.stringify({ players, availableCards, currentPlayer }))
      });

      // Check win condition (if not timer-based)
      if (player.cards.length >= 10) {
        winner = player;
        gameState = 'gameOver';
        if (timerIntervalId) {
          clearInterval(timerIntervalId);
          timerRunning = false;
        }
      }

      nextTurn();
    }
  }

  // Fail action function
  function failAction(playerId) {
    const player = players.find(p => p.id === playerId);
    if (player && player.drawnCards.length > 0) {
      const failedCard = player.drawnCards.pop();
      availableCards.push(failedCard);
      
      // Save state for undo
      gameHistory.push({
        type: 'fail',
        playerId,
        card: failedCard,
        gameState: JSON.parse(JSON.stringify({ players, availableCards, currentPlayer }))
      });

      nextTurn();
    }
  }

  // Next turn function
  function nextTurn() {
    currentPlayer = currentPlayer >= numPlayers ? 1 : currentPlayer + 1;
    startPlayerTurnCountdown();
  }

  // Start player turn countdown
  function startPlayerTurnCountdown() {
    playerTurnCountdown = 30;
    if (turnCountdownInterval) {
      clearInterval(turnCountdownInterval);
    }
    turnCountdownInterval = setInterval(() => {
      playerTurnCountdown--;
      if (playerTurnCountdown <= 0) {
        clearInterval(turnCountdownInterval);
        nextTurn();
      }
    }, 1000);
  }

  // Start game function
  function startGame() {
    initializeCards();
    gameState = 'playing';
    currentPlayer = 1;
    winner = null;
    gameHistory = [];
    recordedActions = [];
    
    // Reset timer state
    gameTimer = 1200;
    timerRunning = false;
    firstCardDrawn = false;
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }

    // Reset players
    players.forEach(player => {
      player.cards = [];
      player.drawnCards = [];
      player.advantageCards = [];
    });

    startPlayerTurnCountdown();
  }

  // Undo last action
  function undoLastAction() {
    if (gameHistory.length > 0) {
      const lastAction = gameHistory.pop();
      const previousState = lastAction.gameState;
      
      players = previousState.players;
      availableCards = previousState.availableCards;
      currentPlayer = previousState.currentPlayer;
    }
  }

  // Video action handler
  function handleVideoAction(event) {
    const { url, status, cardImage } = event.detail;
    
    if (status === 'completed') {
      recordedActions.push({ videoUrl: url, cardImage });
      completeAction(currentPlayer);
    } else if (status === 'failed') {
      failAction(currentPlayer);
    }
  }

  // Menu functions
  function toggleMenu() {
    showMenu = !showMenu;
  }

  function closeMenu() {
    showMenu = false;
  }

  function toggleInstructions() {
    showInstructions = !showInstructions;
  }

  function openGameReview() {
    showGameReview = true;
  }

  function closeGameReview() {
    showGameReview = false;
  }

  // Cleanup on destroy
  onDestroy(() => {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
    }
    if (turnCountdownInterval) {
      clearInterval(turnCountdownInterval);
    }
  });
</script>

<main>
  <!-- Global Timer Display -->
  {#if gameState === 'playing' && (timerRunning || firstCardDrawn)}
    <div class="global-timer-display">
      {formatTimer(gameTimer)}
    </div>
  {/if}

  <!-- Menu Button -->
  <button class="menu-icon-btn" onclick={toggleMenu}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>

  <!-- Video Recorder -->
  {#if gameState === 'playing'}
    <VideoRecorder 
      {activeCardImage}
      on:videoAction={handleVideoAction}
    />
  {/if}

  {#if gameState === 'setup'}
    <!-- Setup Screen -->
    <div class="setup-overlay">
      <div class="setup-content">
        <h1>Ready, Sit, Play!</h1>
        <div class="player-selection">
          <label>
            Number of Players:
            <select bind:value={numPlayers}>
              <option value={2}>2 Players</option>
              <option value={3}>3 Players</option>
            </select>
          </label>
        </div>
        <div class="overlay-buttons">
          <button class="primary-overlay-btn" onclick={startGame}>
            Start Game
          </button>
          <button class="secondary-overlay-btn" onclick={toggleInstructions}>
            Instructions
          </button>
        </div>
      </div>
    </div>
  {:else if gameState === 'playing'}
    <!-- Game Screen -->
    <div class="game-container">
      {#each players.slice(0, numPlayers) as player}
        <div class="player-section" class:active-player-p1={currentPlayer === player.id && player.id === 1} class:active-player-p2={currentPlayer === player.id && player.id === 2} class:active-player-p3={currentPlayer === player.id && player.id === 3}>
          <div class="player-content">
            <h2>{player.name}</h2>
            <div class="player-cards-container">
              <div class="cards-container">
                {#each player.cards as card}
                  <div class="card small-card">
                    <img src="/card-images/{card}.png" alt="Card {card}" class="card-image" />
                  </div>
                {/each}
              </div>
              
              <div class="drawn-cards">
                {#each player.drawnCards as card}
                  <div class="card">
                    <img src="/card-images/{card}.png" alt="Card {card}" class="card-image" />
                  </div>
                {/each}
              </div>
            </div>
            
            {#if currentPlayer === player.id}
              <div class="player-actions">
                <button onclick={() => drawCard(player.id)}>Draw Card</button>
                <button onclick={() => completeAction(player.id)} disabled={player.drawnCards.length === 0}>
                  Complete Action
                </button>
                <button onclick={() => failAction(player.id)} disabled={player.drawnCards.length === 0}>
                  Fail Action
                </button>
              </div>
              
              {#if playerTurnCountdown > 0}
                <div class="player-turn-countdown">
                  {playerTurnCountdown}s
                </div>
              {/if}
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else if gameState === 'gameOver'}
    <!-- Game Over Screen -->
    <div class="game-over-overlay">
      <div class="game-over-content">
        <h1>🎉 Game Over! 🎉</h1>
        <h2>{winner?.name} Wins!</h2>
        <p>Cards collected: {winner?.cards.length + winner?.drawnCards.length}</p>
        <div class="overlay-buttons">
          <button class="primary-overlay-btn" onclick={() => gameState = 'setup'}>
            New Game
          </button>
          <button class="secondary-overlay-btn" onclick={openGameReview}>
            Review Game Videos
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Instructions Overlay -->
  {#if showInstructions}
    <div class="instructions-overlay" onclick={toggleInstructions}>
      <div class="instructions-content" onclick={(e) => e.stopPropagation()}>
        <h2>How to Play</h2>
        <div class="instructions-text">
          <p><strong>Objective:</strong> Be the first player to collect 10 cards, or have the most cards when the 20-minute timer runs out!</p>
          
          <h3>Game Flow:</h3>
          <ol>
            <li><strong>Draw a Card:</strong> On your turn, draw a card from the deck</li>
            <li><strong>Perform the Action:</strong> Complete the challenge shown on the card</li>
            <li><strong>Record Your Attempt:</strong> Use the video recorder to capture your performance</li>
            <li><strong>Mark Success/Failure:</strong> 
              <ul>
                <li>✓ Success: Keep the card and add it to your collection</li>
                <li>✗ Failure: Return the card to the deck</li>
              </ul>
            </li>
          </ol>
          
          <h3>Timer Rules:</h3>
          <ul>
            <li>The 20-minute global timer starts when the first card is drawn</li>
            <li>Each player has 30 seconds per turn</li>
            <li>If time runs out, the player with the most cards wins</li>
          </ul>
          
          <h3>Winning:</h3>
          <p>Win by collecting 10 cards OR having the most cards when the timer expires!</p>
        </div>
        <button class="close-instructions-btn" onclick={toggleInstructions}>
          Got it!
        </button>
      </div>
    </div>
  {/if}

  <!-- Menu Overlay -->
  <MenuOverlay 
    show={showMenu} 
    onClose={closeMenu}
    onUndo={undoLastAction}
    onToggleInstructions={toggleInstructions}
    onOpenGameReview={openGameReview}
  />

  <!-- Game Review -->
  {#if showGameReview}
    <GameReview 
      {recordedActions}
      onClose={closeGameReview}
    />
  {/if}
</main>