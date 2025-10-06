export async function generateVideoThumbnail(videoBlob) {
  return new Promise((resolve, reject) => {
    const videoElement = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    videoElement.preload = 'metadata';
    videoElement.muted = true;
    videoElement.playsInline = true;

    const videoURL = URL.createObjectURL(videoBlob);
    videoElement.src = videoURL;

    videoElement.onloadedmetadata = () => {
      videoElement.currentTime = Math.min(1, videoElement.duration / 2);
    };

    videoElement.onseeked = () => {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((thumbnailBlob) => {
        URL.revokeObjectURL(videoURL);

        if (thumbnailBlob) {
          resolve(thumbnailBlob);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      }, 'image/jpeg', 0.7);
    };

    videoElement.onerror = (error) => {
      URL.revokeObjectURL(videoURL);
      reject(error);
    };
  });
}

export function downloadVideo(videoBlob, filename) {
  const url = URL.createObjectURL(videoBlob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function generateVideoFilename(playerName, cardLabel, success, timestamp, mimeType = 'video/webm') {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
  const status = success ? 'Success' : 'Failed';

  const sanitize = (str) => str.replace(/[^a-z0-9]/gi, '_');

  // Determine file extension based on MIME type
  let extension = 'webm';
  if (mimeType.includes('mp4')) {
    extension = 'mp4';
  } else if (mimeType.includes('webm')) {
    extension = 'webm';
  }

  return `${sanitize(playerName)}_${sanitize(cardLabel)}_${status}_${dateStr}_${timeStr}.${extension}`;
}

export async function compileVideos(videoBlobs, options = {}) {
  const {
    width = 1280,
    height = 720,
    fps = 30,
    transitionDuration = 0.5
  } = options;

  if (!videoBlobs || videoBlobs.length === 0) {
    throw new Error('No videos to compile');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const stream = canvas.captureStream(fps);

  // Select best supported MIME type for compilation
  const supportedTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  let selectedMimeType = 'video/webm';
  for (const type of supportedTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      selectedMimeType = type;
      break;
    }
  }

  console.log('Compilation using MIME type:', selectedMimeType);

  const recorderOptions = {
    mimeType: selectedMimeType,
    videoBitsPerSecond: 2500000
  };

  const mediaRecorder = new MediaRecorder(stream, recorderOptions);

  const chunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const compiledBlob = new Blob(chunks, { type: selectedMimeType });
      resolve(compiledBlob);
    };

    mediaRecorder.onerror = (error) => {
      reject(error);
    };

    mediaRecorder.start();

    const videoElements = [];
    const promises = videoBlobs.map((blob) => {
      return new Promise((resolveVideo) => {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.src = URL.createObjectURL(blob.videoBlob);

        video.onloadedmetadata = () => {
          videoElements.push({
            video,
            metadata: blob
          });
          resolveVideo();
        };
      });
    });

    Promise.all(promises).then(async () => {
      for (let i = 0; i < videoElements.length; i++) {
        const { video, metadata } = videoElements[i];

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(metadata.playerName, canvas.width / 2, 100);
        ctx.font = '36px Arial';
        ctx.fillText(metadata.cardLabel, canvas.width / 2, 160);

        await new Promise(resolve => setTimeout(resolve, transitionDuration * 1000));

        video.currentTime = 0;
        await video.play();

        const playVideo = () => {
          if (video.ended || video.paused) {
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(playVideo);
        };

        playVideo();

        await new Promise(resolve => {
          video.onended = resolve;
        });

        video.pause();
        URL.revokeObjectURL(video.src);
      }

      mediaRecorder.stop();
    }).catch(reject);
  });
}

export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return Promise.resolve();
    } catch (error) {
      document.body.removeChild(textArea);
      return Promise.reject(error);
    }
  }
}
