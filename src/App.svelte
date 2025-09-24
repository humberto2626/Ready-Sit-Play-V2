<script>
  import { onMount } from 'svelte';
  import VideoRecorder from './lib/VideoRecorder.svelte';

  // Game state
  let gameStarted = false;
  let gameOver = false;
  let currentPlayer = 1;
  let players = [
    { id: 1, name: 'Player 1', position: 0, advantages: [] },
    { id: 2, name: 'Player 2', position: 0, advantages: [] }
  ];
  let activeCard = null;
  let usedCards = [];
  let flying = false;
  let showInstructions = false;
  let showVideoRecorder = false;
  let gameHistory = [];

  // Card data
  const cards = [
    // Trick cards (1-15)
    { id: 1, type: 'trick', name: 'Sit', description: 'Dog sits on command', category: 'Basic', image: '/card-images/1.png' },
    { id: 2, type: 'trick', name: 'Stay', description: 'Dog stays in position', category: 'Basic', image: '/card-images/2.png' },
    { id: 3, type: 'trick', name: 'Come', description: 'Dog comes when called', category: 'Basic', image: '/card-images/3.png' },
    { id: 4, type: 'trick', name: 'Down', description: 'Dog lies down', category: 'Basic', image: '/card-images/4.png' },
    { id: 5, type: 'trick', name: 'Shake', description: 'Dog shakes hands/paws', category: 'Intermediate', image: '/card-images/5.png' },
    { id: 6, type: 'trick', name: 'Roll Over', description: 'Dog rolls over completely', category: 'Intermediate', image: '/card-images/6.png' },
    { id: 7, type: 'trick', name: 'Play Dead', description: 'Dog plays dead on command', category: 'Intermediate', image: '/card-images/7.png' },
    { id: 8, type: 'trick', name: 'Spin', description: 'Dog spins in a circle', category: 'Intermediate', image: '/card-images/8.png' },
    { id: 9, type: 'trick', name: 'High Five', description: 'Dog gives a high five', category: 'Intermediate', image: '/card-images/9.png' },
    { id: 10, type: 'trick', name: 'Bow', description: 'Dog takes a bow', category: 'Advanced', image: '/card-images/10.png' },
    { id: 11, type: 'trick', name: 'Crawl', description: 'Dog crawls forward', category: 'Advanced', image: '/card-images/11.png' },
    { id: 12, type: 'trick', name: 'Back Up', description: 'Dog walks backwards', category: 'Advanced', image: '/card-images/12.png' },
    { id: 13, type: 'trick', name: 'Weave', description: 'Dog weaves through legs', category: 'Advanced', image: '/card-images/13.png' },
    { id: 14, type: 'trick', name: 'Balance', description: 'Dog balances treat on nose', category: 'Expert', image: '/card-images/14.png' },
    { id: 15, type: 'trick', name: 'Fetch Specific', description: 'Dog fetches named object', category: 'Expert', image: '/card-images/15.png' },
    
    // Action cards (16-29)
    { id: 16, type: 'action', name: 'Advantage', description: 'Draw an advantage card', category: 'Action', image: '/card-images/16.png' },
    { id: 17, type: 'action', name: 'Challenge', description: 'Challenge another player', category: 'Action', image: '/card-images/17.png' },
    { id: 18, type: 'action', name: 'Skip Turn', description: 'Skip your next turn', category: 'Action', image: '/card-images/18.png' },
    { id: 19, type: 'action', name: 'Double Points', description: 'Next trick is worth double', category: 'Action', image: '/card-images/19.png' },
    { id: 20, type: 'action', name: 'Steal Advantage', description: 'Steal an advantage from opponent', category: 'Action', image: '/card-images/20.png' },
    { id: 21, type: 'action', name: 'Extra Turn', description: 'Take an extra turn', category: 'Action', image: '/card-images/21.png' },
    { id: 22, type: 'action', name: 'Reset Position', description: 'Move back to start', category: 'Action', image: '/card-images/22.png' },
    { id: 23, type: 'action', name: 'Swap Positions', description: 'Swap positions with opponent', category: 'Action', image: '/card-images/23.png' },
    { id: 24, type: 'action', name: 'Block', description: 'Block opponent\'s next action', category: 'Action', image: '/card-images/24.png' },
    { id: 25, type: 'action', name: 'Wild Card', description: 'Choose any trick to perform', category: 'Action', image: '/card-images/25.png' },
    { id: 26, type: 'action', name: 'Bonus Move', description: 'Move forward 2 extra spaces', category: 'Action', image: '/card-images/26.png' },
    { id: 27, type: 'action', name: 'Reverse', description: 'Reverse turn order', category: 'Action', image: '/card-images/27.png' },
    { id: 28, type: 'action', name: 'Freeze', description: 'Freeze opponent for one turn', category: 'Action', image: '/card-images/28.png' },
    { id: 29, type: 'action', name: 'Lucky Draw', description: 'Draw 2 cards, keep 1', category: 'Action', image: '/card-images/29.png' }
  ];

  const advantages = [
    'Treat Motivation', 'Toy Reward', 'Extra Time', 'Second Chance', 
    'Easier Variation', 'Verbal Encouragement', 'Physical Guidance', 'Practice Round'
  ];

  function saveGameState() {
    gameHistory.push({
      gameStarted,
      gameOver,
      currentPlayer,
      players: JSON.parse(JSON.stringify(players)),
      activeCard: activeCard ? { ...activeCard } : null,
      usedCards: [...usedCards],
      flying
    });
  }

  function undoLastAction() {
    if (gameHistory.length > 0) {
      const lastState = gameHistory.pop();
      gameStarted = lastState.gameStarted;
      gameOver = lastState.gameOver;
      currentPlayer = lastState.currentPlayer;
      players = lastState.players;
      activeCard = lastState.activeCard;
      usedCards = lastState.usedCards;
      flying = lastState.flying;
    }
  }

  function startGame() {
    saveGameState();
    gameStarted = true;
    drawCard();
  }

  function drawCard() {
    if (usedCards.length >= cards.length) {
      gameOver = true;
      return;
    }

    let availableCards = cards.filter(card => !usedCards.includes(card.id));
    let randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    
    activeCard = randomCard;
    usedCards.push(randomCard.id);
  }

  function trickCompleted() {
    if (!activeCard || flying || gameOver) return;
    
    saveGameState();
    
    let currentPlayerObj = players.find(p => p.id === currentPlayer);
    let points = getPointsForCategory(activeCard.category);
    currentPlayerObj.position += points;
    
    flying = true;
    
    setTimeout(() => {
      flying = false;
      
      if (currentPlayerObj.position >= 20) {
        gameOver = true;
        return;
      }
      
      nextTurn();
    }, 1500);
  }

  function trickFailed() {
    if (!activeCard || flying || gameOver) return;
    
    saveGameState();
    nextTurn();
  }

  function actionCompleted() {
    if (!activeCard || flying || gameOver) return;
    
    saveGameState();
    executeActionCard();
  }

  function actionCardFailed() {
    if (!activeCard || flying || gameOver) return;
    
    saveGameState();
    nextTurn();
  }

  function executeActionCard() {
    let currentPlayerObj = players.find(p => p.id === currentPlayer);
    
    switch(activeCard.name) {
      case 'Advantage':
        let randomAdvantage = advantages[Math.floor(Math.random() * advantages.length)];
        currentPlayerObj.advantages.push(randomAdvantage);
        break;
      case 'Extra Turn':
        // Don't change currentPlayer, effectively giving an extra turn
        break;
      case 'Bonus Move':
        currentPlayerObj.position += 2;
        break;
      default:
        // For other action cards, just proceed to next turn
        break;
    }
    
    flying = true;
    
    setTimeout(() => {
      flying = false;
      
      if (currentPlayerObj.position >= 20) {
        gameOver = true;
        return;
      }
      
      if (activeCard.name !== 'Extra Turn') {
        nextTurn();
      } else {
        drawCard();
      }
    }, 1500);
  }

  function nextTurn() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    drawCard();
  }

  function getPointsForCategory(category) {
    switch(category) {
      case 'Basic': return 1;
      case 'Intermediate': return 2;
      case 'Advanced': return 3;
      case 'Expert': return 4;
      default: return 1;
    }
  }

  function removeAdvantage(playerId, advantage) {
    saveGameState();
    let player = players.find(p => p.id === playerId);
    player.advantages = player.advantages.filter(a => a !== advantage);
  }

  function toggleInstructions() {
    showInstructions = !showInstructions;
  }

  function toggleVideoRecorder() {
    showVideoRecorder = !showVideoRecorder;
  }

  function handleRecordedVideo(event) {
    if (event.detail.status === 'completed') {
      if (activeCard.category === 'Action') {
        actionCompleted();
      } else {
        trickCompleted();
      }
    } else if (event.detail.status === 'failed') {
      if (activeCard.category === 'Action') {
        actionCardFailed();
      } else {
        trickFailed();
      }
    }
    showVideoRecorder = false;
  }

  function resetGame() {
    gameStarted = false;
    gameOver = false;
    currentPlayer = 1;
    players = [
      { id: 1, name: 'Player 1', position: 0, advantages: [] },
      { id: 2, name: 'Player 2', position: 0, advantages: [] }
    ];
    activeCard = null;
    usedCards = [];
    flying = false;
    gameHistory = [];
  }
</script>

<button class="undo-btn" onclick={undoLastAction} disabled={gameHistory.length === 0}>
  ↶
</button>

<button class="instructions-btn" onclick={toggleInstructions} disabled={flying}>
  {showInstructions ? 'Hide' : 'Show'} Instructions
</button>

<button class="video-recorder-btn" onclick={toggleVideoRecorder} disabled={flying || !gameStarted}>
  📹 Record
</button>

{#if showInstructions}
  <div class="instructions-overlay" onclick={toggleInstructions}>
    <div class="instructions-content" onclick={(e) => e.stopPropagation()}>
      <h2>Ready, Sit, Play! - Game Instructions</h2>
      
      <div class="instructions-section">
        <h3>🎯 Objective</h3>
        <p>Be the first player to reach 20 points by successfully completing dog tricks and using action cards strategically!</p>
      </div>

      <div class="instructions-section">
        <h3>🃏 Card Types</h3>
        <div class="card-types">
          <div class="card-type">
            <h4>Trick Cards</h4>
            <ul>
              <li><strong>Basic (1 point):</strong> Sit, Stay, Come, Down</li>
              <li><strong>Intermediate (2 points):</strong> Shake, Roll Over, Play Dead, Spin, High Five</li>
              <li><strong>Advanced (3 points):</strong> Bow, Crawl, Back Up, Weave</li>
              <li><strong>Expert (4 points):</strong> Balance, Fetch Specific</li>
            </ul>
          </div>
          <div class="card-type">
            <h4>Action Cards</h4>
            <p>Special cards that provide advantages, challenges, or game-changing effects like extra turns, position swaps, and advantage stealing.</p>
          </div>
        </div>
      </div>

      <div class="instructions-section">
        <h3>🎮 How to Play</h3>
        <ol>
          <li><strong>Start:</strong> Click "Start Game" to begin</li>
          <li><strong>Draw Card:</strong> A random card is drawn for the current player</li>
          <li><strong>Perform Action:</strong>
            <ul>
              <li>For <strong>Trick Cards:</strong> Teach/perform the trick with your dog</li>
              <li>For <strong>Action Cards:</strong> Follow the card's instructions</li>
            </ul>
          </li>
          <li><strong>Mark Success/Failure:</strong> Click ✓ for success or ✗ for failure</li>
          <li><strong>Scoring:</strong> Successful tricks award points based on difficulty</li>
          <li><strong>Win Condition:</strong> First player to reach 20 points wins!</li>
        </ol>
      </div>

      <div class="instructions-section">
        <h3>🏆 Advantage Cards</h3>
        <p>Some action cards give you advantage cards that can help with difficult tricks:</p>
        <ul>
          <li>Treat Motivation, Toy Reward, Extra Time</li>
          <li>Second Chance, Easier Variation</li>
          <li>Verbal Encouragement, Physical Guidance, Practice Round</li>
        </ul>
        <p><em>Click on advantage cards to use them (removes them from your collection)</em></p>
      </div>

      <div class="instructions-section">
        <h3>📱 Video Recording</h3>
        <p>Use the "📹 Record" button to record yourself performing tricks! The video recorder helps you:</p>
        <ul>
          <li>Document successful trick performances</li>
          <li>Review and improve your training technique</li>
          <li>Share your dog's progress with others</li>
        </ul>
      </div>

      <button class="close-instructions" onclick={toggleInstructions}>Close Instructions</button>
    </div>
  </div>
{/if}

{#if showVideoRecorder}
  <div class="video-overlay">
    <div class="video-content">
      <VideoRecorder on:videoAction={handleRecordedVideo} />
      <button class="close-video" onclick={() => showVideoRecorder = false}>Close</button>
    </div>
  </div>
{/if}

<main>
  <h1>Ready, Sit, Play!</h1>
  
  {#if !gameStarted}
    <button onclick={startGame}>Start Game</button>
  {:else if gameOver}
    <div class="game-over">
      <h2>🎉 Game Over! 🎉</h2>
      <p>
        {players.find(p => p.position >= 20)?.name || 'Someone'} wins with {Math.max(...players.map(p => p.position))} points!
      </p>
      <button onclick={resetGame}>Play Again</button>
    </div>
  {:else}
    <div class="game-board">
      {#each players as player}
        <div class="player-section" class:active={player.id === currentPlayer}>
          <h3>{player.name} {player.id === currentPlayer ? '(Current Turn)' : ''}</h3>
          <p>Position: {player.position}/20</p>
          
          {#if player.advantages.length > 0}
            <div class="advantage-cards">
              <strong>Advantages:</strong>
              {#each player.advantages as advantage}
                <span 
                  class="advantage-card" 
                  onclick={() => removeAdvantage(player.id, advantage)}
                  title="Click to use this advantage"
                >
                  {advantage}
                </span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    {#if activeCard}
      <div class="active-card">
        <div class="card-header">
          <h3>{activeCard.name}</h3>
          <button class="card-info-btn" title="Card Information">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
          </button>
        </div>
        <div class="card-content">
          <div class="card-image-container">
            <img src={activeCard.image} alt={activeCard.name} class="card-image" />
          </div>
          <div class="card-details">
            <p class="card-category">{activeCard.category}</p>
            <p class="card-description">{activeCard.description}</p>
            {#if activeCard.type === 'trick'}
              <p class="card-points">Points: {getPointsForCategory(activeCard.category)}</p>
            {/if}
          </div>
        </div>
        
        <div class="card-actions">
          {#if activeCard.category === 'Action'}
            <button 
              class="action-completed-btn" 
              onclick={actionCompleted} 
              disabled={flying || gameOver}
            >
              ✓
            </button>
            <button 
              class="action-failed-btn" 
              onclick={actionCardFailed} 
              disabled={flying || gameOver}
            >
              ✗
            </button>
          {:else}
            <button 
              class="trick-completed-btn" 
              onclick={trickCompleted} 
              disabled={flying || gameOver}
            >
              ✓ Completed
            </button>
            <button 
              class="trick-failed-btn" 
              onclick={trickFailed} 
              disabled={flying || gameOver}
            >
              ✗ Failed
            </button>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</main>

<style>
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
    background-color: white;
    color: #333;
    padding: 2rem;
    border-radius: 12px;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .instructions-content h2 {
    color: #646cff;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .instructions-section {
    margin-bottom: 1.5rem;
  }

  .instructions-section h3 {
    color: #646cff;
    margin-bottom: 0.5rem;
  }

  .card-types {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  .card-type {
    background-color: #f5f5f5;
    padding: 1rem;
    border-radius: 8px;
  }

  .card-type h4 {
    margin-bottom: 0.5rem;
    color: #333;
  }

  .close-instructions {
    background-color: #646cff;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    margin-top: 1rem;
    width: 100%;
  }

  .close-instructions:hover {
    background-color: #535bf2;
  }

  .video-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
    box-sizing: border-box;
  }

  .video-content {
    background-color: #1a1a1a;
    padding: 2rem;
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  .close-video {
    background-color: #ff6b35;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    margin-top: 1rem;
    width: 100%;
  }

  .close-video:hover {
    background-color: #ff5722;
  }

  .game-board {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .player-section.active {
    border-color: #ffd700;
    background-color: rgba(255, 215, 0, 0.1);
  }

  .active-card {
    border: 3px solid #646cff;
    border-radius: 12px;
    padding: 1.5rem;
    background-color: rgba(100, 108, 255, 0.05);
    max-width: 500px;
    margin: 0 auto;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .card-header h3 {
    margin: 0;
    color: #646cff;
  }

  .card-info-btn {
    background: none;
    border: 2px solid #646cff;
    color: #646cff;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    padding: 0;
  }

  .card-info-btn:hover {
    background-color: #646cff;
    color: white;
    transform: scale(1.1);
  }

  .card-info-btn svg {
    width: 16px;
    height: 16px;
  }

  .card-content {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .card-image-container {
    flex-shrink: 0;
    width: 120px;
    height: 120px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #ddd;
  }

  .card-details {
    flex: 1;
  }

  .card-category {
    font-weight: bold;
    color: #646cff;
    margin-bottom: 0.5rem;
  }

  .card-description {
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }

  .card-points {
    font-weight: bold;
    color: #22c55e;
  }

  .card-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .trick-completed-btn, .action-completed-btn {
    background-color: #22c55e;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.25s;
  }

  .trick-completed-btn:hover:not(:disabled), .action-completed-btn:hover:not(:disabled) {
    background-color: #16a34a;
    transform: translateY(-2px);
  }

  .trick-failed-btn, .action-failed-btn {
    background-color: #ef4444;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.25s;
  }

  .trick-failed-btn:hover:not(:disabled), .action-failed-btn:hover:not(:disabled) {
    background-color: #dc2626;
    transform: translateY(-2px);
  }

  .trick-completed-btn:disabled, .trick-failed-btn:disabled,
  .action-completed-btn:disabled, .action-failed-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .game-over {
    text-align: center;
    padding: 2rem;
    border: 3px solid #ffd700;
    border-radius: 12px;
    background-color: rgba(255, 215, 0, 0.1);
  }

  .game-over h2 {
    color: #ffd700;
    margin-bottom: 1rem;
  }

  .game-over button {
    background-color: #646cff;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    font-size: 1.1rem;
    margin-top: 1rem;
  }

  .game-over button:hover {
    background-color: #535bf2;
  }

  @media (max-width: 600px) {
    .card-content {
      flex-direction: column;
    }

    .card-image-container {
      width: 100%;
      height: 200px;
    }

    .card-actions {
      flex-direction: column;
    }

    .game-board {
      flex-direction: column;
      gap: 1rem;
    }

    .instructions-content {
      padding: 1rem;
      margin: 0.5rem;
    }

    .card-types {
      grid-template-columns: 1fr;
    }
  }
</style>