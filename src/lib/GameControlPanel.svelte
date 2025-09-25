<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let recordingStatus = 'idle'; // 'idle', 'recording', 'recorded'
  export let activeCardCategory = null;
  export let countdown = 0;
  export let canStartTimer = false;
  export let flying = false;
  export let gameOver = false;

  function handleStartRecording() {
    dispatch('startRecording');
  }

  function handleStartTimer() {
    dispatch('startTimer');
  }

  function handleActionCompleted() {
    dispatch('actionCompleted');
  }

  function handleActionFailed() {
    dispatch('actionFailed');
  }
</script>

<div class="control-panel">
  <!-- Record Button (only show when idle) -->
  {#if recordingStatus === 'idle'}
    <button 
      class="record-btn" 
      on:click={handleStartRecording}
      disabled={flying || gameOver}
    >
      <img src="/Rec.svg" alt="Record" />
    </button>
  {/if}

  <!-- Timer Button (show when active card exists and can start timer) -->
  {#if activeCardCategory && canStartTimer}
    <button 
      class="timer-button" 
      on:click={handleStartTimer}
      disabled={!canStartTimer || flying || gameOver}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 2V4H16V2H8Z" fill="currentColor"/>
        <path d="M7 6C7 5.44772 7.44772 5 8 5H16C16.5523 5 17 5.44772 17 6V7C17 7.55228 16.5523 8 16 8H15V9C15 10.1046 14.1046 11 13 11H12.5L16 14.5V16C16 17.1046 15.1046 18 14 18H10C8.89543 18 8 17.1046 8 16V14.5L11.5 11H11C9.89543 11 9 10.1046 9 9V8H8C7.44772 8 7 7.55228 7 7V6Z" fill="currentColor"/>
        <path d="M8 19V20H16V19H8Z" fill="currentColor"/>
        <circle cx="12" cy="14" r="1" fill="currentColor"/>
      </svg>
      {#if countdown > 0}
        <span class="timer-text">{countdown}s</span>
      {/if}
    </button>
  {/if}

  <!-- Action Completed Button (show for Action cards) -->
  {#if activeCardCategory === 'Action'}
    <button 
      class="action-completed-btn" 
      on:click={handleActionCompleted}
      disabled={flying || gameOver}
    >
      ✓
    </button>
  {/if}

  <!-- Action Failed Button (show for Action cards) -->
  {#if activeCardCategory === 'Action'}
    <button 
      class="action-failed-btn" 
      on:click={handleActionFailed}
      disabled={flying || gameOver}
    >
      ✗
    </button>
  {/if}
</div>

<style>
  .control-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
  }

  .record-btn {
    width: 60px;
    height: 60px;
    background: linear-gradient(45deg, #ff6b35, #ff3535);
    color: #ffffff;
    border: none;
    padding: 0;
    font-size: 0.9rem;
    font-weight: bold;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .record-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
  }

  .record-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .record-btn img {
    width: 24px;
    height: 24px;
    filter: brightness(0) invert(1);
  }

  .timer-button {
    width: 60px;
    height: 60px;
    background: linear-gradient(45deg, #333, #000);
    color: #ffffff;
    border: none;
    padding: 0;
    font-size: 0.8rem;
    font-weight: bold;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }

  .timer-button:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .timer-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .timer-button svg {
    width: 24px;
    height: 24px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  .timer-text {
    font-size: 0.7rem;
    margin-top: 2px;
  }

  .action-completed-btn {
    width: 60px;
    height: 60px;
    background: linear-gradient(45deg, #22c55e, #16a34a);
    color: #ffffff;
    border: none;
    padding: 0;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-completed-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4);
  }

  .action-completed-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .action-failed-btn {
    width: 60px;
    height: 60px;
    background: linear-gradient(45deg, #ef4444, #dc2626);
    color: #ffffff;
    border: none;
    padding: 0;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-failed-btn:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  }

  .action-failed-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
</style>