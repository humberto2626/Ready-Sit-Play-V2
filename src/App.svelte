<script>
  import { onMount } from 'svelte';
  import Counter from './lib/Counter.svelte';
  import VideoRecorder from './lib/VideoRecorder.svelte';

  let showVideoRecorder = false;

  function toggleVideoRecorder() {
    showVideoRecorder = !showVideoRecorder;
  }

  function handleRecordedVideo(event) {
    console.log('Video action received:', event.detail);
    const { url, status } = event.detail;
    
    if (status === 'completed') {
      console.log('Video completed successfully:', url);
      // Add your success logic here
    } else if (status === 'failed') {
      console.log('Video failed:', url);
      // Add your failure logic here
    }
    
    // Hide the video recorder after any action
    showVideoRecorder = false;
  }
</script>

<main>
  <div>
    <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
      <img src="/vite.svg" class="logo" alt="Vite Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank" rel="noreferrer">
      <img src="/src/assets/svelte.svg" class="logo svelte" alt="Svelte Logo" />
    </a>
  </div>
  <h1>Vite + Svelte</h1>

  <div class="card">
    <Counter />
  </div>

  <button class="instructions-btn" on:click={toggleVideoRecorder}>
    Record Video
  </button>

  {#if showVideoRecorder}
    <VideoRecorder on:videoAction={handleRecordedVideo} />
  {/if}

  <p>
    Check out <a href="https://github.com/sveltejs/kit#readme" target="_blank" rel="noreferrer">SvelteKit</a>, the official Svelte app framework powered by Vite!
  </p>

  <p class="read-the-docs">
    Click on the Vite and Svelte logos to learn more
  </p>
</main>

<style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
  .read-the-docs {
    color: #888;
  }
</style>