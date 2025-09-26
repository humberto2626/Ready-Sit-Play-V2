<script>
  import VideoRecorder from './lib/VideoRecorder.svelte';
  import GameReview from './lib/GameReview.svelte';

  // Game state
  let selectedCard = $state(null);
  let recordedGameActions = $state([]);
  let showGameReview = $state(false);
  let showInstructions = $state(false);

  // Card data - you can expand this with your actual card data
  const cards = [
    { id: 1, image: '/card-images/1.png', name: 'Card 1' },
    { id: 2, image: '/card-images/2.png', name: 'Card 2' },
    { id: 3, image: '/card-images/3.png', name: 'Card 3' },
    { id: 4, image: '/card-images/4.png', name: 'Card 4' },
    { id: 5, image: '/card-images/5.png', name: 'Card 5' },
    { id: 6, image: '/card-images/6.png', name: 'Card 6' },
    { id: 7, image: '/card-images/7.png', name: 'Card 7' },
    { id: 8, image: '/card-images/8.png', name: 'Card 8' },
  ];

  function selectCard(card) {
    selectedCard = card;
    console.log('Card selected:', card);
  }

  function handleVideoAction(event) {
    const { url, status, cardImage } = event.detail;
    console.log('Video action received:', { url, status, cardImage });
    
    if (status === 'completed' && url) {
      // Add the completed action to our recorded actions
      recordedGameActions.push({
        videoUrl: url,
        cardImage: cardImage || (selectedCard ? selectedCard.image : null)
      });
      console.log('Added to recorded actions:', recordedGameActions);
      
      // Clear selected card after successful recording
      selectedCard = null;
    }
  }

  function openGameReview() {
    console.log('Opening game review with actions:', recordedGameActions);
    showGameReview = true;
  }

  function closeGameReview() {
    showGameReview = false;
  }

  function clearRecordedActions() {
    recordedGameActions = [];
    console.log('Cleared recorded actions');
  }

  function toggleInstructions() {
    showInstructions = !showInstructions;
  }
</script>

<main>
  <h1>Ready, Sit, Play!</h1>
  
  <!-- Instructions Button -->
  <button class="instructions-btn" onclick={toggleInstructions}>
    <img src="/Info.svg" alt="Instructions" />
  </button>

  <!-- Game Review Button -->
  <button 
    class="review-btn" 
    onclick={openGameReview}
    disabled={recordedGameActions.length === 0}
  >
    Review Game ({recordedGameActions.length})
  </button>

  <!-- Clear Actions Button (for testing) -->
  {#if recordedGameActions.length > 0}
    <button class="clear-btn" onclick={clearRecordedActions}>
      Clear Recordings
    </button>
  {/if}

  <!-- Instructions Overlay -->
  {#if showInstructions}
    <div class="instructions-overlay" onclick={toggleInstructions}>
      <div class="instructions-content" onclick={(e) => e.stopPropagation()}>
        <h2>How to Play</h2>
        <ol>
          <li>Select a card from the deck below</li>
          <li>Click the record button to start recording your action</li>
          <li>Perform the action shown on the card</li>
          <li>Mark the action as completed (✓) or failed (✗)</li>
          <li>Review all your recorded actions at the end</li>
        </ol>
        <button onclick={toggleInstructions}>Close</button>
      </div>
    </div>
  {/if}

  <!-- Card Selection -->
  <div class="game-section">
    <h2>Select a Card</h2>
    <div class="cards-container">
      {#each cards as card}
        <div 
          class="card" 
          class:selected={selectedCard?.id === card.id}
          onclick={() => selectCard(card)}
        >
          <img src={card.image} alt={card.name} class="card-image" />
        </div>
      {/each}
    </div>
  </div>

  <!-- Selected Card Display -->
  {#if selectedCard}
    <div class="selected-card-section">
      <h3>Selected Card: {selectedCard.name}</h3>
      <div class="selected-card-display">
        <img src={selectedCard.image} alt={selectedCard.name} class="selected-card-image" />
      </div>
    </div>
  {/if}

  <!-- Video Recorder -->
  <div class="recorder-section">
    <h2>Record Your Action</h2>
    <VideoRecorder 
      activeCardImage={selectedCard?.image}
      on:videoAction={handleVideoAction}
    />
  </div>

  <!-- Game Review Overlay -->
  {#if showGameReview}
    <GameReview 
      recordedActions={recordedGameActions}
      onClose={closeGameReview}
    />
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    text-align: center;
    color: #646cff;
    margin-bottom: 2rem;
  }

  .instructions-btn {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1000;
    background-color: #646cff;
    color: white;
    border: none;
    padding: 0.8rem;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.25s;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .instructions-btn:hover {
    background-color: #535bf2;
    transform: scale(1.05);
  }

  .review-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    background-color: #22c55e;
    color: white;
    border: none;
    padding: 0.8rem 1.2rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s;
  }

  .review-btn:hover:not(:disabled) {
    background-color: #16a34a;
    transform: translateY(-2px);
  }

  .review-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #9ca3af;
  }

  .clear-btn {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 1000;
    background-color: #ef4444;
    color: white;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.25s;
  }

  .clear-btn:hover {
    background-color: #dc2626;
    transform: translateY(-2px);
  }

  .instructions-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .instructions-content {
    background: white;
    color: #333;
    padding: 2rem;
    border-radius: 12px;
    max-width: 500px;
    text-align: left;
  }

  .instructions-content h2 {
    color: #646cff;
    margin-bottom: 1rem;
  }

  .instructions-content ol {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .instructions-content li {
    margin-bottom: 0.5rem;
  }

  .game-section {
    text-align: center;
  }

  .cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    justify-content: center;
    max-width: 800px;
    margin: 0 auto;
  }

  .card {
    position: relative;
    width: 120px;
    height: 180px;
    border: 3px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    overflow: hidden;
    background: #f0f0f0;
  }

  .card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  }

  .card.selected {
    border-color: #646cff;
    box-shadow: 0 0 20px rgba(100, 108, 255, 0.5);
    transform: translateY(-5px) scale(1.05);
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }

  .selected-card-section {
    text-align: center;
    padding: 1rem;
    background: rgba(100, 108, 255, 0.1);
    border-radius: 12px;
    border: 2px solid #646cff;
  }

  .selected-card-display {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }

  .selected-card-image {
    width: 150px;
    height: 225px;
    object-fit: cover;
    border-radius: 12px;
    border: 3px solid #646cff;
    box-shadow: 0 4px 15px rgba(100, 108, 255, 0.3);
  }

  .recorder-section {
    text-align: center;
    padding: 2rem;
    background: rgba(255, 107, 53, 0.1);
    border-radius: 12px;
    border: 2px solid #ff6b35;
  }

  @media (max-width: 768px) {
    main {
      padding: 1rem;
    }

    .cards-container {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.5rem;
    }

    .card {
      width: 100px;
      height: 150px;
    }

    .selected-card-image {
      width: 120px;
      height: 180px;
    }

    .instructions-btn,
    .review-btn {
      position: relative;
      top: auto;
      left: auto;
      right: auto;
      margin: 0.5rem;
    }
  }
</style>