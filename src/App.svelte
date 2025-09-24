<script>
  import { onMount } from 'svelte';
  import VideoRecorder from './lib/VideoRecorder.svelte';

  let gameState = $state('menu'); // 'menu', 'playing', 'instructions'
  let currentPlayer = $state(1);
  let players = $state([
    { id: 1, name: 'Player 1', position: 0, advantages: [] },
    { id: 2, name: 'Player 2', position: 0, advantages: [] }
  ]);
  let gameHistory = $state([]);
  let showVideoRecorder = $state(false);

  // Card data with images and descriptions
  const cards = [
    { id: 1, name: 'Sit', description: 'Your dog must sit and stay in position for 5 seconds.', image: '/card-images/1.png' },
    { id: 2, name: 'Down', description: 'Your dog must lie down and stay for 5 seconds.', image: '/card-images/2.png' },
    { id: 3, name: 'Stay', description: 'Your dog must stay in current position for 10 seconds.', image: '/card-images/3.png' },
    { id: 4, name: 'Come', description: 'Call your dog to come to you from a distance.', image: '/card-images/4.png' },
    { id: 5, name: 'Heel', description: 'Your dog must walk beside you for 10 steps.', image: '/card-images/5.png' },
    { id: 6, name: 'Shake', description: 'Your dog must give you their paw.', image: '/card-images/6.png' },
    { id: 7, name: 'Roll Over', description: 'Your dog must roll over completely.', image: '/card-images/7.png' },
    { id: 8, name: 'Play Dead', description: 'Your dog must lie on their side and stay still.', image: '/card-images/8.png' },
    { id: 9, name: 'Spin', description: 'Your dog must turn in a complete circle.', image: '/card-images/9.png' },
    { id: 10, name: 'Fetch', description: 'Throw an object and your dog must bring it back.', image: '/card-images/10.png' },
    { id: 11, name: 'High Five', description: 'Your dog must touch your raised hand with their paw.', image: '/card-images/11.png' },
    { id: 12, name: 'Bow', description: 'Your dog must lower their front end while keeping rear up.', image: '/card-images/12.png' },
    { id: 13, name: 'Back Up', description: 'Your dog must take 3 steps backward.', image: '/card-images/13.png' },
    { id: 14, name: 'Touch', description: 'Your dog must touch your hand with their nose.', image: '/card-images/14.png' },
    { id: 15, name: 'Wait', description: 'Your dog must wait before eating a treat for 5 seconds.', image: '/card-images/15.png' },
    { id: 16, name: 'Crawl', description: 'Your dog must crawl forward on their belly for 3 feet.', image: '/card-images/16.png' },
    { id: 17, name: 'Jump', description: 'Your dog must jump over an obstacle or through a hoop.', image: '/card-images/17.png' },
    { id: 18, name: 'Speak', description: 'Your dog must bark on command.', image: '/card-images/18.png' },
    { id: 19, name: 'Quiet', description: 'Your dog must stop barking on command.', image: '/card-images/19.png' },
    { id: 20, name: 'Balance', description: 'Your dog must balance a treat on their nose for 3 seconds.', image: '/card-images/20.png' },
    { id: 21, name: 'Weave', description: 'Your dog must weave through your legs as you walk.', image: '/card-images/21.png' },
    { id: 22, name: 'Circle', description: 'Your dog must walk in a circle around you.', image: '/card-images/22.png' },
    { id: 23, name: 'Cross Paws', description: 'Your dog must cross their front paws.', image: '/card-images/23.png' },
    { id: 24, name: 'Take a Bow', description: 'Your dog must perform a play bow and hold it.', image: '/card-images/24.png' },
    { id: 25, name: 'Army Crawl', description: 'Your dog must crawl using only front legs.', image: '/card-images/25.png' },
    { id: 26, name: 'Figure 8', description: 'Your dog must walk in a figure-8 pattern around two objects.', image: '/card-images/26.png' },
    { id: 27, name: 'Side Step', description: 'Your dog must step sideways for 3 steps.', image: '/card-images/27.png' },
    { id: 28, name: 'Pivot', description: 'Your dog must turn 180 degrees while keeping front paws in place.', image: '/card-images/28.png' },
    { id: 29, name: 'Free Choice', description: 'Perform any trick of your choice that your dog knows well.', image: '/card-images/29.png' }
  ];

  let selectedCard = $state(null);
  let showCardInfo = $state(false);

  function startGame() {
    gameState = 'playing';
    // Reset game state
    players = [
      { id: 1, name: 'Player 1', position: 0, advantages: [] },
      { id: 2, name: 'Player 2', position: 0, advantages: [] }
    ];
    currentPlayer = 1;
    gameHistory = [];
  }

  function showInstructions() {
    gameState = 'instructions';
  }

  function backToMenu() {
    gameState = 'menu';
  }

  function drawCard() {
    const randomIndex = Math.floor(Math.random() * cards.length);
    selectedCard = cards[randomIndex];
    showCardInfo = false;
  }

  function toggleCardInfo() {
    showCardInfo = !showCardInfo;
  }

  function completeChallenge() {
    saveGameState();
    
    const currentPlayerObj = players.find(p => p.id === currentPlayer);
    currentPlayerObj.position += 1;
    
    // Check for win condition
    if (currentPlayerObj.position >= 10) {
      alert(`${currentPlayerObj.name} wins!`);
      gameState = 'menu';
      return;
    }
    
    // Switch to next player
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    selectedCard = null;
  }

  function failChallenge() {
    saveGameState();
    
    // Switch to next player without advancing position
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    selectedCard = null;
  }

  function addAdvantage(advantage) {
    saveGameState();
    
    const currentPlayerObj = players.find(p => p.id === currentPlayer);
    if (!currentPlayerObj.advantages.includes(advantage)) {
      currentPlayerObj.advantages.push(advantage);
    }
  }

  function saveGameState() {
    gameHistory.push({
      players: JSON.parse(JSON.stringify(players)),
      currentPlayer: currentPlayer,
      selectedCard: selectedCard ? JSON.parse(JSON.stringify(selectedCard)) : null
    });
  }

  function undoLastAction() {
    if (gameHistory.length > 0) {
      const lastState = gameHistory.pop();
      players = lastState.players;
      currentPlayer = lastState.currentPlayer;
      selectedCard = lastState.selectedCard;
    }
  }

  function handleRecordedVideo(event) {
    const { url, status } = event.detail;
    
    if (status === 'completed') {
      // Video was successfully recorded and confirmed
      completeChallenge();
    } else if (status === 'failed') {
      // Video recording failed or was rejected
      failChallenge();
    }
    
    // Hide the video recorder
    showVideoRecorder = false;
  }

  function toggleVideoRecorder() {
    showVideoRecorder = !showVideoRecorder;
  }
</script>

<main>
  {#if gameState === 'menu'}
    <h1>Ready, Sit, Play!</h1>
    <p>A fun dog training card game for the whole family</p>
    
    <div class="menu-buttons">
      <button on:click={startGame}>Start Game</button>
      <button on:click={showInstructions}>Instructions</button>
    </div>
    
  {:else if gameState === 'instructions'}
    <button class="instructions-btn" on:click={backToMenu}>Back to Menu</button>
    
    <h1>How to Play</h1>
    
    <div class="instructions-content">
      <h2>Game Setup</h2>
      <ul>
        <li>2 players take turns</li>
        <li>First player to reach position 10 wins</li>
        <li>Each player needs their dog to participate</li>
      </ul>
      
      <h2>Turn Sequence</h2>
      <ol>
        <li>Draw a card by clicking "Draw Card"</li>
        <li>Read the challenge aloud</li>
        <li>Attempt the trick with your dog</li>
        <li>Click "Success" if completed, "Failed" if not</li>
        <li>Successful attempts advance 1 space</li>
        <li>Failed attempts pass turn to next player</li>
      </ol>
      
      <h2>Advantage Cards</h2>
      <p>Collect advantage cards during play:</p>
      <ul>
        <li><strong>Extra Turn:</strong> Take another turn immediately</li>
        <li><strong>Skip Challenge:</strong> Advance without doing the trick</li>
        <li><strong>Double Move:</strong> Move 2 spaces instead of 1</li>
      </ul>
      
      <h2>Video Recording</h2>
      <p>Use the video recorder to capture your dog's performance and share your progress!</p>
    </div>
    
  {:else if gameState === 'playing'}
    <button class="instructions-btn" on:click={backToMenu} disabled={showVideoRecorder}>Back to Menu</button>
    
    {#if gameHistory.length > 0}
      <button class="undo-btn" on:click={undoLastAction} disabled={showVideoRecorder}>Undo</button>
    {/if}
    
    <button class="video-recorder-btn" on:click={toggleVideoRecorder} disabled={showVideoRecorder}>
      {showVideoRecorder ? 'Close Recorder' : 'Video Recorder'}
    </button>
    
    <h1>Ready, Sit, Play!</h1>
    
    <!-- Player Status -->
    <div class="players-status">
      {#each players as player}
        <div class="player-section" class:active={player.id === currentPlayer}>
          <h2>{player.name} {player.id === currentPlayer ? '(Current Turn)' : ''}</h2>
          <p>Position: {player.position}/10</p>
          
          {#if player.advantages.length > 0}
            <div class="advantage-cards">
              {#each player.advantages as advantage}
                <span class="advantage-card">{advantage}</span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
    
    <!-- Card Drawing Section -->
    {#if !selectedCard}
      <div class="card-section">
        <button on:click={drawCard} disabled={showVideoRecorder}>Draw Card</button>
      </div>
    {:else}
      <div class="card-section">
        <div class="card">
          <div class="card-header">
            <h3>{selectedCard.name}</h3>
            <button class="card-info-btn" on:click={toggleCardInfo}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="rgba(255, 255, 255, 0.1)"/>
                <path d="M12 16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
          
          <div class="card-content">
            <img src={selectedCard.image} alt={selectedCard.name} class="card-image" />
            
            {#if showCardInfo}
              <div class="card-description">
                <p>{selectedCard.description}</p>
              </div>
            {/if}
          </div>
        </div>
        
        <div class="card-actions">
          <button on:click={completeChallenge} disabled={showVideoRecorder}>Success ✓</button>
          <button on:click={failChallenge} disabled={showVideoRecorder}>Failed ✗</button>
        </div>
        
        <div class="advantage-section">
          <p>Collect an advantage card:</p>
          <div class="advantage-cards">
            <button class="advantage-card" on:click={() => addAdvantage('Extra Turn')} disabled={showVideoRecorder}>
              Extra Turn
            </button>
            <button class="advantage-card" on:click={() => addAdvantage('Skip Challenge')} disabled={showVideoRecorder}>
              Skip Challenge
            </button>
            <button class="advantage-card" on:click={() => addAdvantage('Double Move')} disabled={showVideoRecorder}>
              Double Move
            </button>
          </div>
        </div>
      </div>
    {/if}
    
    {#if showVideoRecorder}
      <div class="video-recorder-overlay">
        <VideoRecorder on:videoAction={handleRecordedVideo} />
      </div>
    {/if}
  {/if}
</main>

<style>
  .menu-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
  }
  
  .instructions-content {
    max-width: 600px;
    margin: 0 auto;
    text-align: left;
  }
  
  .instructions-content h2 {
    color: #646cff;
    margin-top: 2rem;
  }
  
  .instructions-content ul, .instructions-content ol {
    margin: 1rem 0;
    padding-left: 2rem;
  }
  
  .instructions-content li {
    margin: 0.5rem 0;
  }
  
  .players-status {
    display: flex;
    gap: 2rem;
    justify-content: center;
    margin: 2rem 0;
  }
  
  .player-section.active {
    border-color: #ffd700;
    background-color: rgba(255, 215, 0, 0.1);
  }
  
  .card-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin: 2rem 0;
  }
  
  .card {
    background: white;
    border: 2px solid #ddd;
    border-radius: 12px;
    padding: 0;
    max-width: 300px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    position: relative;
  }
  
  .card-header {
    background: #646cff;
    color: white;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .card-header h3 {
    margin: 0;
    font-size: 1.2rem;
  }
  
  .card-info-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.6);
    color: white;
    padding: 0.3rem;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-weight: bold;
    font-size: 1.1rem;
  }
  
  .card-info-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.9);
    transform: scale(1.1);
  }
  
  .card-info-btn svg {
    width: 20px;
    height: 20px;
    stroke-width: 2.5;
  }
  
  .card-content {
    position: relative;
    height: 200px;
  }
  
  .card-description {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  
  .card-description p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
  }
  
  .card-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .card-actions button {
    flex: 1;
    padding: 0.8rem;
    font-size: 1rem;
    font-weight: 500;
  }
  
  .card-actions button:first-child {
    background-color: #22c55e;
    color: white;
  }
  
  .card-actions button:first-child:hover:not(:disabled) {
    background-color: #16a34a;
  }
  
  .card-actions button:last-child {
    background-color: #ef4444;
    color: white;
  }
  
  .card-actions button:last-child:hover:not(:disabled) {
    background-color: #dc2626;
  }
  
  .advantage-section {
    margin-top: 2rem;
    text-align: center;
  }
  
  .advantage-section p {
    margin-bottom: 1rem;
    font-weight: 500;
  }
  
  .video-recorder-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  @media (max-width: 768px) {
    .players-status {
      flex-direction: column;
      gap: 1rem;
    }
    
    .menu-buttons {
      flex-direction: column;
      align-items: center;
    }
    
    .card {
      max-width: 280px;
    }
    
    .advantage-cards {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>