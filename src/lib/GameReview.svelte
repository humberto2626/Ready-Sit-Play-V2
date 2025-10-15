<script>
  let { recordedActions, onClose } = $props(); // recordedActions: array of { videoUrl, cardImage }, onClose: function to call when review is closed
</script>

<div class="game-review-overlay">
  <div class="game-review-content">
    <h2>Game Review</h2>
    {#if recordedActions && recordedActions.length > 0}
      <div class="recorded-actions-grid">
        {#each recordedActions as action}
          <div class="recorded-action-item">
            <div class="card-display">
              {#if action.cardImage}
                <img src={action.cardImage} alt="Played Card" class="review-card-image" />
              {:else}
                <div class="placeholder-card">No Card</div>
              {/if}
            </div>
            <div class="video-display">
              <video
                src={action.videoUrl}
                controls
                playsinline
                webkit-playsinline
                preload="metadata"
                class="review-video"
                onerror={(e) => {
                  console.error('Video playback error in GameReview:', {
                    error: e.target.error,
                    code: e.target.error?.code,
                    message: e.target.error?.message,
                    src: e.target.src,
                    currentSrc: e.target.currentSrc
                  });
                }}
              ></video>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p>No completed actions recorded during the game.</p>
    {/if}
    <button class="close-review-btn" onclick={onClose}>Close Review</button>
  </div>
</div>

<style>
  .game-review-overlay {
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
    padding: 1rem;
    box-sizing: border-box;
  }

  .game-review-content {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    max-width: 900px;
    max-height: 90vh;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h2 {
    font-size: 2.5em;
    margin-bottom: 1rem;
    color: white;
    text-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
  }

  .recorded-actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    justify-content: center;
    flex-grow: 1;
    overflow-y: auto;
    padding-right: 10px;
    min-height: 0;
  }

  .recorded-action-item {
    display: flex;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 1rem;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .card-display {
    flex: 0 0 120px; /* Fixed width for the card */
    margin-right: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .review-card-image {
    width: 100px;
    height: 150px; /* Adjust as needed */
    object-fit: contain;
    border-radius: 8px;
    border: 2px solid #ffd700;
  }

  .placeholder-card {
    width: 100px;
    height: 150px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9em;
    border: 2px dashed rgba(255, 255, 255, 0.4);
  }

  .video-display {
    flex-grow: 1;
    min-width: 150px; /* Ensure video has some minimum width */
  }

  .review-video {
    width: 100%;
    height: auto;
    max-height: 200px; /* Limit video height */
    border-radius: 8px;
    background-color: black;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .close-review-btn {
    background: linear-gradient(45deg, #ff6b35, #ff3535);
    color: white;
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    margin-top: 1.5rem;
    flex-shrink: 0;
  }

  .close-review-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
  }

  @media (max-width: 600px) {
    .recorded-action-item {
      flex-direction: column;
      text-align: center;
    }
    .card-display {
      margin-right: 0;
      margin-bottom: 1rem;
    }
    .game-review-content {
      padding: 1rem;
    }
    h2 {
      font-size: 2em;
    }
  }
</style>