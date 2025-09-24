<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let shouldRecord = false;
  export let facingMode = 'environment';
  export let recordedVideoUrl = '';

  let videoStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let liveVideoElement = null;
  let recordedVideoElement = null;

  // Watch for shouldRecord changes
  $: if (shouldRecord && !videoStream) {
    startMediaRecording();
  } else if (!shouldRecord && videoStream) {
    stopMediaRecording();
  }

  // Watch for facingMode changes during recording
  $: if (shouldRecord && videoStream && facingMode) {
    restartWithNewCamera();
  }

  async function restartWithNewCamera() {
    if (!shouldRecord) return;
    
    // Stop current recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    // Stop current stream
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      videoStream = null;
    }
    
    // Clear video element
    if (liveVideoElement) {
      liveVideoElement.srcObject = null;
    }
    
    // Reset chunks
    recordedChunks = [];
    
    // Wait for camera to be released
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Start recording with new camera
    await startMediaRecording();
  }

  async function startMediaRecording() {
    try {
      console.log('Starting recording process...');
      console.log('Requested facingMode:', facingMode);
      
      // Request camera and microphone access
      videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode }, 
        audio: true 
      });
      console.log('Video stream obtained:', videoStream);
      console.log('Video tracks:', videoStream.getVideoTracks());
      console.log('Audio tracks:', videoStream.getAudioTracks());
      
      // Wait for the next tick to ensure DOM is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if tracks are active
      const videoTracks = videoStream.getVideoTracks();
      const audioTracks = videoStream.getAudioTracks();
      console.log('Video track details:', videoTracks.map(track => ({
        id: track.id,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      })));
      console.log('Audio track details:', audioTracks.map(track => ({
        id: track.id,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      })));

      // Display live feed
      if (liveVideoElement) {
        console.log('Live video element found:', liveVideoElement);
        console.log('Live video element initial state:', {
          tagName: liveVideoElement.tagName,
          readyState: liveVideoElement.readyState,
          networkState: liveVideoElement.networkState,
          currentSrc: liveVideoElement.currentSrc,
          srcObject: liveVideoElement.srcObject
        });
        
        liveVideoElement.srcObject = videoStream;
        console.log('Live video element srcObject set:', liveVideoElement.srcObject);
        console.log('Live video element after srcObject assignment:', {
          readyState: liveVideoElement.readyState,
          networkState: liveVideoElement.networkState,
          videoWidth: liveVideoElement.videoWidth,
          videoHeight: liveVideoElement.videoHeight
        });
        
        console.log('Live video element dimensions:', {
          width: liveVideoElement.offsetWidth,
          height: liveVideoElement.offsetHeight,
          clientWidth: liveVideoElement.clientWidth,
          clientHeight: liveVideoElement.clientHeight,
          scrollWidth: liveVideoElement.scrollWidth,
          scrollHeight: liveVideoElement.scrollHeight
        });
        
        // Add event listeners for debugging
        liveVideoElement.addEventListener('loadstart', () => console.log('Video: loadstart event'));
        liveVideoElement.addEventListener('loadedmetadata', () => {
          console.log('Video: loadedmetadata event');
          console.log('Video metadata:', {
            videoWidth: liveVideoElement.videoWidth,
            videoHeight: liveVideoElement.videoHeight,
            duration: liveVideoElement.duration
          });
        });
        liveVideoElement.addEventListener('loadeddata', () => console.log('Video: loadeddata event'));
        liveVideoElement.addEventListener('canplay', () => console.log('Video: canplay event'));
        liveVideoElement.addEventListener('canplaythrough', () => console.log('Video: canplaythrough event'));
        liveVideoElement.addEventListener('playing', () => console.log('Video: playing event'));
        liveVideoElement.addEventListener('error', (e) => {
          console.error('Video: error event', e);
          console.error('Video error details:', {
            error: liveVideoElement.error,
            code: liveVideoElement.error?.code,
            message: liveVideoElement.error?.message
          });
        });
        
        // Explicitly try to play the video
        try {
          console.log('Attempting to play video...');
          await liveVideoElement.play();
          console.log('Live video play() succeeded');
          console.log('Video state after play():', {
            paused: liveVideoElement.paused,
            ended: liveVideoElement.ended,
            readyState: liveVideoElement.readyState,
            currentTime: liveVideoElement.currentTime
          });
        } catch (playError) {
          console.error('Live video play() failed:', playError);
          console.error('Play error details:', playError.name, playError.message);
          console.error('Video element state during play error:', {
            readyState: liveVideoElement.readyState,
            networkState: liveVideoElement.networkState,
            error: liveVideoElement.error
          });
        }
      } else {
        console.error('Live video element not found!');
        console.error('Available elements:', document.querySelectorAll('video'));
      }

      // Determine best supported MIME type for better mobile compatibility
      let mimeType = '';
      const supportedTypes = [
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      console.log('Selected MIME type:', mimeType);
      
      // Set up MediaRecorder with optimal MIME type
      mediaRecorder = mimeType 
        ? new MediaRecorder(videoStream, { mimeType })
        : new MediaRecorder(videoStream);
        
      console.log('MediaRecorder created with state:', mediaRecorder.state);
      recordedChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available, chunk size:', event.data.size);
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, total chunks:', recordedChunks.length);
        console.log('Total data size:', recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0));
        
        const blobType = mimeType || 'video/webm';
        const blob = new Blob(recordedChunks, { type: blobType });
        console.log('Blob created:', blob.size, 'bytes, type:', blob.type);
        
        recordedVideoUrl = URL.createObjectURL(blob);
        console.log('Video URL created:', recordedVideoUrl);
        recordingStatus = 'recorded';
        
        // Stop all tracks
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
          videoStream = null;
        }
      };

      // Start recording
      mediaRecorder.start();
      console.log('Recording started, status:', recordingStatus);
      countdown = 30;
    } catch (error) {
      console.error('Error accessing camera:', error);
      console.error('Error details:', error.name, error.message);
      dispatch('videoError', { error: error.message });
    }
  }

  function stopMediaRecording() {
    console.log('Stopping recording...');
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      console.log('MediaRecorder stopped');
    }
  }

  onDestroy(() => {
    // Clean up resources
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
  });
</script>

<div class="video-recorder">
  {#if shouldRecord && !recordedVideoUrl}
    <div class="recording-container">
      <video 
        bind:this={liveVideoElement}
        autoplay 
        muted 
        playsinline
        class="live-video"
      ></video>
    </div>
  {:else if recordedVideoUrl}
    <div class="recorded-container">
      <video 
        bind:this={recordedVideoElement}
        src={recordedVideoUrl}
        controls
        playsinline
        class="recorded-video"
      ></video>
    </div>
  {/if}
</div>

<style>
  .video-recorder {
    width: 100%;
    max-width: 400px;
  }

  .recording-container, .recorded-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .live-video, .recorded-video {
    width: 100%;
    height: auto;
    max-height: 300px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    object-fit: contain;
    background-color: #000;
  }

  @media (max-width: 768px) {
    .live-video, .recorded-video {
      max-height: 200px;
    }
  }
</style>