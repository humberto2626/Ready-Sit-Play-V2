<script>
  import VideoRecorder from './lib/VideoRecorder.svelte';
  import GameReview from './lib/GameReview.svelte';

  // Game state
  let recordedGameActions = $state([]);
  let showGameReview = $state(false);
  let activeCardImage = $state('');

  // Handle video recording events
  function handleVideoAction(event) {
    const { url, status, cardImage } = event.detail;
    
    if (status === 'completed') {
      // Add the completed action to our recorded actions
      recordedGameActions.push({
        videoUrl: url,
        cardImage: cardImage
      });
      console.log('Video action completed:', { url, cardImage });
      console.log('Total recorded actions:', recordedGameActions.length);
    }
  }

  // Open game review
  function openGameReview() {
    showGameReview = true;
  }

  // Close game review
  function closeGameReview() {
    showGameReview = false;
  }

  // Clear all recorded actions
  function clearRecordedActions() {
    recordedGameActions = [];
  }

  // Set active card for recording
  function setActiveCard(cardPath) {
    activeCardImage = cardPath;
  }
</script>

<main>
  <h1>Ready, Sit, Play!</h1>
  
  <!-- Game controls -->
  <div class="game-controls">
    <button class="review-btn" onclick={openGameReview} disabled={recordedGameActions.length === 0}>
      Review Game ({recordedGameActions.length})
    </button>
    <button class="clear-btn" onclick={clearRecordedActions} disabled={recordedGameActions.length === 0}>
      Clear Recordings
    </button>
  </div>

  <!-- Card selection for testing -->
  <div class="card-selection">
    <h3>Select a card to record with:</h3>
    <div class="cards-container">
      {#each Array.from({length: 10}, (_, i) => i + 1) as cardNum}
        <button 
          class="card-btn" 
          class:active={activeCardImage === `/card-images/${cardNum}.png`}
          onclick={() => setActiveCard(`/card-images/${cardNum}.png`)}
        >
          <img src="/card-images/{cardNum}.png" alt="Card {cardNum}" class="card-preview" />
        </button>
      {/each}
    </div>
  </div>

  <!-- Video Recorder -->
  <div class="video-section">
    <h3>Video Recording</h3>
    <VideoRecorder 
      {activeCardImage} 
      on:videoAction={handleVideoAction}
    />
  </div>

  <!-- Game Review Modal -->
  {#if showGameReview}
    <GameReview 
      recordedActions={recordedGameActions} 
      onClose={closeGameReview} 
    />
  {/if}
</main>

<style>
  main {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    text-align: center;
    color: #646cff;
    margin-bottom: 2rem;
  }

  .game-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .review-btn {
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .review-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .review-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .clear-btn {
    background: linear-gradient(45deg, #ff6b35, #ff3535);
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .clear-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  }

  .clear-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .card-selection {
    margin-bottom: 2rem;
    text-align: center;
  }

  .card-selection h3 {
    margin-bottom: 1rem;
    color: #333;
  }

  .cards-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    max-width: 600px;
    margin: 0 auto;
  }

  .card-btn {
    background: transparent;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .card-btn:hover {
    border-color: #646cff;
    transform: scale(1.05);
  }

  .card-btn.active {
    border-color: #ff6b35;
    box-shadow: 0 0 10px rgba(255, 107, 53, 0.5);
  }

  .card-preview {
    width: 40px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
  }

  .video-section {
    text-align: center;
    margin-bottom: 2rem;
  }

  .video-section h3 {
    margin-bottom: 1rem;
    color: #333;
  }

  @media (prefers-color-scheme: light) {
    .card-selection h3,
    .video-section h3 {
      color: #213547;
    }
  }
</style>