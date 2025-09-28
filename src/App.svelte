<script>
  import VideoRecorder from './lib/VideoRecorder.svelte';
  import GameReview from './lib/GameReview.svelte';

  // Game state
  let gameStarted = $state(false);
  let currentPlayer = $state(1);
  let gameEnded = $state(false);
  let winner = $state(null);
  let showInstructions = $state(false);
  let showWinnerOverlay = $state(false);
  let showTieOverlay = $state(false);
  let recordedGameActions = $state([]);
  let showGameReview = $state(false);

  // Player cards
  let player1Cards = $state([]);
  let player2Cards = $state([]);
  let player3Cards = $state([]);

  // Deck and active card
  let deck = $state([]);
  let activeCard = $state(null);
  let activeCardImage = $state('');

  // Game history for undo functionality
  let gameHistory = $state([]);

  // Turn timer
  let turnTimeLeft = $state(30);
  let turnTimer = $state(null);

  // Video recording state
  let isRecording = $state(false);

  // Initialize deck with cards 1-29
  function initializeDeck() {
    deck = Array.from({length: 29}, (_, i) => i + 1);
    shuffleDeck();
  }

  function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function saveGameState() {
    gameHistory.push({
      player1Cards: [...player1Cards],
      player2Cards: [...player2Cards],
      player3Cards: [...player3Cards],
      deck: [...deck],
      activeCard: activeCard,
      activeCardImage: activeCardImage,
      currentPlayer: currentPlayer,
      turnTimeLeft: turnTimeLeft
    });
    
    // Keep only last 10 states to prevent memory issues
    if (gameHistory.length > 10) {
      gameHistory.shift();
    }
  }

  function undoLastAction() {
    if (gameHistory.length === 0) return;
    
    const lastState = gameHistory.pop();
    player1Cards = lastState.player1Cards;
    player2Cards = lastState.player2Cards;
    player3Cards = lastState.player3Cards;
    deck = lastState.deck;
    activeCard = lastState.activeCard;
    activeCardImage = lastState.activeCardImage;
    currentPlayer = lastState.currentPlayer;
    turnTimeLeft = lastState.turnTimeLeft;
    
    // Restart turn timer
    startTurnTimer();
  }

  function drawCard() {
    if (deck.length === 0) {
      checkForTie();
      return;
    }

    saveGameState();
    
    const card = deck.pop();
    activeCard = card;
    activeCardImage = `/card-images/${card}.png`;
    
    // Add card to current player
    if (currentPlayer === 1) {
      player1Cards.push(card);
    } else if (currentPlayer === 2) {
      player2Cards.push(card);
    } else {
      player3Cards.push(card);
    }
    
    checkWinCondition();
    
    if (!gameEnded) {
      nextPlayer();
    }
  }

  function nextPlayer() {
    currentPlayer = currentPlayer === 3 ? 1 : currentPlayer + 1;
    startTurnTimer();
  }

  function startTurnTimer() {
    if (turnTimer) {
      clearInterval(turnTimer);
    }
    
    turnTimeLeft = 30;
    turnTimer = setInterval(() => {
      turnTimeLeft--;
      if (turnTimeLeft <= 0) {
        // Auto-draw card when time runs out
        drawCard();
      }
    }, 1000);
  }

  function checkWinCondition() {
    const currentCards = currentPlayer === 1 ? player1Cards : 
                        currentPlayer === 2 ? player2Cards : player3Cards;
    
    if (currentCards.length >= 10) {
      gameEnded = true;
      winner = currentPlayer;
      showWinnerOverlay = true;
      if (turnTimer) {
        clearInterval(turnTimer);
      }
    }
  }

  function checkForTie() {
    if (deck.length === 0) {
      gameEnded = true;
      showTieOverlay = true;
      if (turnTimer) {
        clearInterval(turnTimer);
      }
    }
  }

  function animateShuffle() {
    recordedGameActions = []; // Clear recorded actions for a new game
    gameStarted = false;
    gameEnded = false;
    winner = null;
    showWinnerOverlay = false;
    showTieOverlay = false;
    showInstructions = false;
    currentPlayer = 1;
    activeCard = null;
    activeCardImage = '';
    gameHistory = [];
    
    // Clear all player cards
    player1Cards = [];
    player2Cards = [];
    player3Cards = [];
    
    // Reset and shuffle deck
    initializeDeck();
    
    // Start the game
    setTimeout(() => {
      gameStarted = true;
      drawCard();
    }, 500);
  }

  function toggleInstructions() {
    showInstructions = !showInstructions;
  }

  function handleRecordedVideo(event) {
    if (event.detail.status === 'completed') {
      recordedGameActions.push({
        videoUrl: event.detail.url,
        cardImage: event.detail.cardImage
      });
      console.log('Recorded game actions:', recordedGameActions);
    }
    
    // Continue with existing logic
    if (event.detail.status === 'completed' || event.detail.status === 'failed') {
      isRecording = false;
    }
  }

  function openGameReview() {
    showGameReview = true;
  }

  function closeGameReview() {
    showGameReview = false;
  }

  // Initialize game on component mount
  initializeDeck();
</script>

<div id="app">
  <!-- Instructions Button -->
  <button 
    class="instructions-btn" 
    onclick={toggleInstructions}
    disabled={showInstructions}
  >
    <img src="/Info.svg" alt="Instructions" width="20" height="20" />
  </button>

  <!-- Undo Button -->
  <button 
    class="undo-btn" 
    onclick={undoLastAction}
    disabled={gameHistory.length === 0}
  >
    <img src="/Undo.svg" alt="Undo" width="15" height="15" />
  </button>

  <!-- Video Recorder Button -->
  <button 
    class="video-recorder-btn" 
    onclick={() => isRecording = !isRecording}
    disabled={!gameStarted || gameEnded}
  >
    <img src="/Rec.svg" alt="Record" width="20" height="20" />
  </button>

  <main>
    {#if !gameStarted}
      <h1>Ready, Sit, Play!</h1>
      <button onclick={animateShuffle}>Start Game</button>
    {:else}
      <!-- Player 1 Section -->
      <div class="player-section" class:active-player-p1={currentPlayer === 1}>
        <div class="player-content">
          <h2>Player 1</h2>
          {#if currentPlayer === 1}
            <div class="player-turn-countdown">
              <img src="/Timer.svg" alt="Timer" width="20" height="20" />
              <span>{turnTimeLeft}</span>
            </div>
          {/if}
        </div>
        <div class="player-cards-container" class:compact-display={player1Cards.length > 5}>
          <div class="top-row">
            {#each player1Cards.slice(0, 5) as card}
              <div class="tiny-card">
                <img src="/card-images/{card}.png" alt="Card {card}" class="card-image" />
              </div>
            {/each}
          </div>
          {#if player1Cards.length > 5}
            <div class="drawn-cards">
              {#each player1Cards.slice(5) as card}
                <div class="small-card">
                  <img src="/card-images/{card}.png" alt="Card {card}" class="card-image" />
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Active Card Display -->
      {#if activeCard}
        <div class="card">
          <img src="/card-images/{activeCard}.png" alt="Active Card {activeCard}" class="card-image" />
          <button class="icon-only-button card-info-icon">
            <img src="/Info.svg" alt="Card Info" width="24" height="24" />
          </button>
        </div>
      {/if}

      <!-- Draw Card Button -->
      {#if !gameEnded}
        <button onclick={drawCard} disabled={deck.length === 0}>
          Draw Card ({deck.length} left)
        </button>
      {/if}

      <!-- Player 2 Section -->
      <div class="player-section" class:active-player-p2={currentPlayer === 2}>
        <div class="player-content">
          <h2>Player 2</h2>
          {#if currentPlayer === 2}
            <div class="player-turn-countdown">
              <img src="/Timer.svg" alt="Timer" width="20" height="20" />
              <span>{turnTimeLeft}</span>
            </div>
          {/if}
        </div>
        <div class="player-cards-container" class:compact-display={player2Cards.length > 5}>
          <div class="top-row">
            {#each player2Cards.slice(0, 5) as card}
              <div class="tiny-card">
                <img src="/card-images/{card}.png" alt="Card {card}" class="card-image" />
              </div>
            {/each}
          </div>
          {#if player2Cards.length > 5}
            <div class="drawn-cards">
              {#each player2Cards.slice(5) as card}
                <div class="small-card">
                  <img src="/card-images/{card}.png" alt="Card {card}" class="card-image" />
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Player 3 Section -->
      <div class="player-section" class:active-player-p3={currentPlayer === 3}>
        <div class="player-content">
          <h2>Player 3</h2>
          {#if currentPlayer === 3}
            <div class="player-turn-countdown">
              <img src="/Timer.svg" alt="Timer" width="20" height="20" />
              <span>{turnTimeLeft}</span>
            </div>
          {/if}
        </div>
        <div class="player-cards-container" class:compact-display={player3Cards.length > 5}>
          <div class="top-row">
            {#each player3Cards.slice(0, 5) as card}
              <div class="tiny-card">
                <img src="/card-images/{card}.png" alt="Card {card}" class="card-image" />
              </div>
            {/each}
          </div>
          {#if player3Cards.length > 5}
            <div class="drawn-cards">
              {#each player3Cards.slice(5) as card}
                <div class="small-card">
                  <img src="/card-images/{card}.png" alt="Card {card}" class="card-image" />
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </main>

  <!-- Video Recorder -->
  {#if isRecording}
    <VideoRecorder 
      {activeCardImage}
      on:videoAction={handleRecordedVideo}
    />
  {/if}

  <!-- Instructions Overlay -->
  {#if showInstructions}
    <div class="instructions-overlay">
      <div class="instructions-content">
        <h2>How to Play</h2>
        <p>This is a card drawing game for 3 players.</p>
        <ul>
          <li>Players take turns drawing cards from the deck</li>
          <li>Each player has 30 seconds to draw a card</li>
          <li>The first player to collect 10 cards wins</li>
          <li>If the deck runs out, the game is a tie</li>
          <li>Use the video recorder to capture your reactions</li>
          <li>Use the undo button to reverse the last action</li>
        </ul>
        <button onclick={toggleInstructions}>Got it!</button>
      </div>
    </div>
  {/if}

  <!-- Winner Overlay -->
  {#if showWinnerOverlay}
    <div class="winner-overlay">
      <div class="winner-content">
        <h2>🎉 Player {winner} Wins! 🎉</h2>
        <p>Congratulations! You collected 10 cards first!</p>
        <div class="overlay-buttons">
          <button class="primary-overlay-btn" onclick={animateShuffle}>Play Again</button>
          <button class="secondary-overlay-btn" onclick={openGameReview}>Review Game Videos</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Tie Overlay -->
  {#if showTieOverlay}
    <div class="instructions-overlay">
      <div class="instructions-content">
        <h2>🤝 Game Tied! 🤝</h2>
        <p>The deck ran out of cards! No one reached 10 cards.</p>
        <div class="overlay-buttons">
          <button class="primary-overlay-btn" onclick={animateShuffle}>Play Again</button>
          <button class="secondary-overlay-btn" onclick={openGameReview}>Review Game Videos</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Game Review -->
  {#if showGameReview}
    <GameReview recordedActions={recordedGameActions} onClose={closeGameReview} />
  {/if}
</div>