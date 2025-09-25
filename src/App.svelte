<script>
  import VideoRecorder from './lib/VideoRecorder.svelte';

  let showInstructions = false;
  let gameState = 'playing'; // 'playing', 'paused', 'ended'
  let currentPlayer = 1;
  let players = [
    { id: 1, name: 'Player 1', score: 0, advantages: [] },
    { id: 2, name: 'Player 2', score: 0, advantages: [] }
  ];
  let activeCard = null;
  let gameHistory = [];
  let cards = [];
  let usedCards = [];

  // Initialize cards
  for (let i = 1; i <= 29; i++) {
    cards.push({
      id: i,
      image: `/card-images/${i}.png`,
      used: false
    });
  }

  function drawCard() {
    const availableCards = cards.filter(card => !card.used);
    if (availableCards.length === 0) {
      // Reset all cards if none available
      cards.forEach(card => card.used = false);
      usedCards = [];
    }
    
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const selectedCard = availableCards[randomIndex];
    selectedCard.used = true;
    usedCards.push(selectedCard);
    
    // Save current state to history
    gameHistory.push({
      activeCard: activeCard,
      currentPlayer: currentPlayer,
      players: JSON.parse(JSON.stringify(players)),
      usedCards: [...usedCards]
    });
    
    activeCard = selectedCard;
  }

  function toggleInstructions() {
    showInstructions = !showInstructions;
  }

  function undoLastAction() {
    if (gameHistory.length === 0) return;
    
    const lastState = gameHistory.pop();
    activeCard = lastState.activeCard;
    currentPlayer = lastState.currentPlayer;
    players = lastState.players;
    usedCards = lastState.usedCards;
    
    // Update card used status
    cards.forEach(card => {
      card.used = usedCards.some(usedCard => usedCard.id === card.id);
    });
  }

  function handleVideoAction(event) {
    const { url, status } = event.detail;
    console.log('Video action:', status, url);
    
    if (status === 'completed') {
      // Handle successful video completion
      drawCard();
    } else if (status === 'failed') {
      // Handle failed video - maybe show a message or retry option
      console.log('Video recording failed');
    }
  }

  // Draw initial card
  drawCard();
</script>

<main>
  <button class="instructions-btn" on:click={toggleInstructions} disabled={showInstructions}>
    <img src="/Info.svg" alt="Instructions" width="20" height="20" />
    Instructions
  </button>

  <button class="undo-btn" on:click={undoLastAction} disabled={gameHistory.length === 0}>
    <img src="/Undo.svg" alt="Undo" width="16" height="16" />
  </button>

  {#if showInstructions}
    <div class="instructions-overlay">
      <div class="instructions-content">
        <h2>How to Play Ready, Sit, Play!</h2>
        <div class="instructions-text">
          <p><strong>Objective:</strong> Train your dog while having fun with challenge cards!</p>
          
          <h3>Setup:</h3>
          <ul>
            <li>Each player takes turns being the "trainer"</li>
            <li>Draw a challenge card to see what trick or behavior to teach</li>
            <li>Use the video recorder to capture your training session</li>
          </ul>

          <h3>How to Play:</h3>
          <ol>
            <li><strong>Draw a Card:</strong> Click to reveal your challenge</li>
            <li><strong>Record Training:</strong> Use the video button to record your dog performing the trick</li>
            <li><strong>Complete or Skip:</strong> Mark the challenge as completed (✓) or failed (✗)</li>
            <li><strong>Next Turn:</strong> A new card is automatically drawn for the next challenge</li>
          </ol>

          <h3>Tips:</h3>
          <ul>
            <li>Be patient with your dog - training takes time!</li>
            <li>Use positive reinforcement and treats</li>
            <li>Keep training sessions short and fun</li>
            <li>Record multiple attempts if needed</li>
          </ul>

          <h3>Video Recording:</h3>
          <ul>
            <li>Tap the record button to start filming</li>
            <li>You have 30 seconds to capture the trick</li>
            <li>Switch between front/back camera during recording</li>
            <li>Review your video before marking complete/failed</li>
          </ul>
        </div>
        
        <button class="close-instructions" on:click={toggleInstructions}>
          Got it! Let's Play
        </button>
      </div>
    </div>
  {/if}

  <div class="game-main-area">
    <div class="active-card-container">
      {#if activeCard}
        <div class="card">
          <div class="card-content">
            <img 
              src={activeCard.image} 
              alt="Challenge Card {activeCard.id}"
              class="card-image"
              loading="lazy"
            />
          </div>
        </div>
      {/if}
    </div>

    <VideoRecorder on:videoAction={handleVideoAction} />
  </div>

  <div class="player-section">
    <h2>Current Player: {players.find(p => p.id === currentPlayer)?.name}</h2>
    
    <div class="cards-container">
      <p>Cards Used: {usedCards.length} / {cards.length}</p>
    </div>
  </div>
</main>

<style>
  .game-main-area {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    min-height: 400px;
    position: relative;
  }

  .active-card-container {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .card {
    width: 300px;
    height: 400px;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    position: relative;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    cursor: pointer;
  }

  .card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  }

  .card-content {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .instructions-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
    box-sizing: border-box;
  }

  .instructions-content {
    background-color: #1a1a1a;
    border: 2px solid #646cff;
    border-radius: 12px;
    padding: 2rem;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    color: rgba(255, 255, 255, 0.87);
  }

  .instructions-content h2 {
    color: #646cff;
    margin-top: 0;
    text-align: center;
  }

  .instructions-content h3 {
    color: #ffd700;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .instructions-text {
    line-height: 1.6;
  }

  .instructions-text ul, .instructions-text ol {
    padding-left: 1.5rem;
  }

  .instructions-text li {
    margin-bottom: 0.5rem;
  }

  .close-instructions {
    background-color: #646cff;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 1.5rem;
    width: 100%;
    transition: background-color 0.25s;
  }

  .close-instructions:hover {
    background-color: #535bf2;
  }

  @media (max-width: 768px) {
    .game-main-area {
      flex-direction: column;
      gap: 1rem;
    }

    .card {
      width: 250px;
      height: 350px;
    }

    .instructions-content {
      margin: 1rem;
      padding: 1.5rem;
      max-height: 90vh;
    }
  }
</style>