<script>
  import { onMount, onDestroy } from 'svelte';

  let videoStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordingStatus = 'idle'; // 'idle', 'recording', 'recorded'
  let recordedVideoUrl = '';
  let countdown = 30;
  let countdownInterval = null;
  let liveVideoElement = null;
  let recordedVideoElement = null;

  async function startRecording() {
    try {
      // Request camera and microphone access
      videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
      });

      // Display live feed
      if (liveVideoElement) {
        liveVideoElement.srcObject = videoStream;
      }

      // Set up MediaRecorder
      mediaRecorder = new MediaRecorder(videoStream);
      recordedChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        recordedVideoUrl = URL.createObjectURL(blob);
        recordingStatus = 'recorded';
        
        // Stop all tracks
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
          videoStream = null;
        }
      };

      // Start recording
      mediaRecorder.start();
      recordingStatus = 'recording';
      countdown = 30;

      // Start countdown
      countdownInterval = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
          stopRecording();
        }
      }, 1000);

    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please make sure you have granted camera permissions.');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function resetRecording() {
    recordingStatus = 'idle';
    recordedVideoUrl = '';
    recordedChunks = [];
    countdown = 30;
    
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
  }

  function downloadVideo() {
    if (recordedVideoUrl) {
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = `training-video-${new Date().toISOString().slice(0, 19)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  onDestroy(() => {
    // Clean up resources
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
  });
</script>

<div class="video-recorder">
  {#if recordingStatus === 'idle'}
    <button class="record-btn" on:click={startRecording}>
      📹 Record Training Video
    </button>
  {:else if recordingStatus === 'recording'}
    <div class="recording-container">
      <video 
        bind:this={liveVideoElement}
        autoplay 
        muted 
        playsinline
        class="live-video"
      ></video>
      <div class="recording-controls">
        <div class="countdown">⏱️ {countdown}s</div>
        <button class="stop-btn" on:click={stopRecording}>
          ⏹️ Stop Recording
        </button>
      </div>
    </div>
  {:else if recordingStatus === 'recorded'}
    <div class="recorded-container">
      <video 
        bind:this={recordedVideoElement}
        src={recordedVideoUrl}
        controls
        playsinline
        class="recorded-video"
      ></video>
      <div class="recorded-controls">
        <button class="download-btn" on:click={downloadVideo}>
          💾 Download Video
        </button>
        <button class="reset-btn" on:click={resetRecording}>
          🔄 Record Again
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .video-recorder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    padding: 1rem;
    border: 2px solid #646cff;
    border-radius: 12px;
    background-color: rgba(100, 108, 255, 0.1);
  }

  .record-btn {
    background: linear-gradient(45deg, #ff6b35, #ffd700);
    color: #333;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: bold;
    border-radius: 25px;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .record-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(255, 107, 53, 0.5);
  }

  .recording-container, .recorded-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .live-video, .recorded-video {
    width: 300px;
    height: 200px;
    border-radius: 8px;
    border: 2px solid #333;
    object-fit: cover;
  }

  .recording-controls, .recorded-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .countdown {
    font-size: 1.2rem;
    font-weight: bold;
    color: #ff6b35;
    background: rgba(255, 255, 255, 0.9);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    border: 2px solid #ff6b35;
  }

  .stop-btn, .download-btn, .reset-btn {
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background 0.2s ease;
  }

  .download-btn {
    background: #22c55e;
  }

  .reset-btn {
    background: #646cff;
  }

  .stop-btn:hover {
    background: #ff5252;
  }

  .download-btn:hover {
    background: #16a34a;
  }

  .reset-btn:hover {
    background: #535bf2;
  }

  @media (max-width: 800px) {
    .live-video, .recorded-video {
      width: 250px;
      height: 167px;
    }

    .video-recorder {
      padding: 0.75rem;
    }

    .recording-controls, .recorded-controls {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>