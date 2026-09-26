type ExportTiktokVideoParams = {
  videoUrl: string;
  logoUrl: string;
  title: string;
  honorific: string;
  role: string;
  subtitle: string;
  tagline: string;
  district: string;
  accent: string;
  position: number;
  onProgress?: (progress: number) => void;
};

type ExportedVideo = {
  blob: Blob;
  extension: string;
};

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

function supportedMimeType() {
  const types = [
    'video/mp4;codecs=h264,aac',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function extensionFromMime(mimeType: string) {
  return mimeType.includes('mp4') ? 'mp4' : 'webm';
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar el logo para exportar el video.'));
    image.src = src;
  });
}

function loadVideo(src: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = false;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error('No se pudo cargar el video para exportarlo.'));
    video.src = src;
  });
}

function coverRect(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number, position: number) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const maxX = Math.max(0, width - targetWidth);

  return {
    x: -maxX * (position / 100),
    y: -(height - targetHeight) / 2,
    width,
    height
  };
}

function splitName(value: string) {
  const words = value.trim().split(/\s+/);
  return {
    first: words[0] || 'RICHARD',
    rest: words.slice(1).join(' ') || 'MELO TTUPA'
  };
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number, font: string) {
  let size = startSize;
  do {
    ctx.font = font.replace('{size}', String(size));
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 4;
  } while (size >= 28);

  return size;
}

function drawCenteredText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, fontSize: number, font: string) {
  const size = fitText(ctx, text, maxWidth, fontSize, font);
  ctx.font = font.replace('{size}', String(size));
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawOverlay(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, params: ExportTiktokVideoParams) {
  const name = splitName(params.title);
  const accent = params.accent || '#ed1c24';

  const topGradient = ctx.createLinearGradient(0, 0, 0, 520);
  topGradient.addColorStop(0, 'rgba(0,0,0,.22)');
  topGradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, WIDTH, 520);

  const bottomGradient = ctx.createLinearGradient(0, HEIGHT - 760, 0, HEIGHT);
  bottomGradient.addColorStop(0, 'rgba(0,0,0,0)');
  bottomGradient.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, HEIGHT - 760, WIDTH, 760);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 7;
  ctx.strokeRect(22, 22, WIDTH - 44, HEIGHT - 44);

  roundRect(ctx, 54, 54, 700, 88, 44);
  ctx.fillStyle = 'rgba(237,0,0,.94)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.82)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.drawImage(logo, 78, 72, 86, 52);
  ctx.fillStyle = '#fff';
  ctx.font = '400 48px Anton, Arial Black, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('AHORA NACIÓN', 184, 112);
  if (params.district) {
    roundRect(ctx, 520, 74, 206, 46, 23);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.fillStyle = '#ed0000';
    drawCenteredText(ctx, params.district.toUpperCase(), 623, 107, 176, 30, '900 {size}px Roboto Condensed, Arial, sans-serif');
  }

  const badgeX = WIDTH - 270;
  const badgeY = 168;
  const badgeW = 220;
  const badgeH = 236;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 22);
  ctx.fillStyle = '#ed0000';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.drawImage(logo, badgeX + 24, badgeY + 18, badgeW - 48, 92);
  ctx.fillStyle = '#fff';
  ctx.font = '400 40px Anton, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('AHORA', badgeX + badgeW / 2, badgeY + 148);
  ctx.fillStyle = '#fff';
  roundRect(ctx, badgeX + 36, badgeY + 160, badgeW - 72, 42, 4);
  ctx.fill();
  ctx.fillStyle = '#ed0000';
  ctx.font = '400 34px Anton, Arial Black, sans-serif';
  ctx.fillText('NACIÓN', badgeX + badgeW / 2, badgeY + 194);
  if (params.district) {
    ctx.fillStyle = '#fff';
    ctx.font = '900 24px Roboto Condensed, Arial, sans-serif';
    ctx.fillText(params.district.toUpperCase(), badgeX + badgeW / 2, badgeY + 226);
  }

  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,.55)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#fff';
  ctx.font = '400 82px Anton, Arial Black, sans-serif';
  ctx.fillText(params.honorific.toUpperCase(), 76, HEIGHT - 520);
  ctx.font = '900 118px Roboto Condensed, Arial, sans-serif';
  ctx.fillText(name.first.toUpperCase(), 76, HEIGHT - 410);
  ctx.font = '900 78px Roboto Condensed, Arial, sans-serif';
  ctx.fillText(name.rest.toUpperCase(), 138, HEIGHT - 328);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = '#fff';
  roundRect(ctx, 76, HEIGHT - 278, 430, 58, 8);
  ctx.fill();
  ctx.fillStyle = '#202522';
  drawCenteredText(ctx, params.role.toUpperCase(), 291, HEIGHT - 236, 390, 42, '900 {size}px Roboto Condensed, Arial, sans-serif');

  ctx.fillStyle = '#fff';
  roundRect(ctx, 76, HEIGHT - 198, 520, 72, 8);
  ctx.fill();
  ctx.fillStyle = accent;
  drawCenteredText(ctx, params.subtitle.toUpperCase(), 336, HEIGHT - 148, 468, 50, '900 {size}px Roboto Condensed, Arial, sans-serif');

  ctx.fillStyle = 'rgba(237,28,36,.95)';
  ctx.fillRect(22, HEIGHT - 146, WIDTH - 44, 124);
  ctx.fillStyle = '#fff';
  drawCenteredText(ctx, params.tagline, WIDTH / 2, HEIGHT - 66, WIDTH - 140, 66, '700 {size}px Dancing Script, cursive');
}

export async function exportTiktokVideo(params: ExportTiktokVideoParams): Promise<ExportedVideo> {
  if (!('MediaRecorder' in window)) {
    throw new Error('Este navegador no permite exportar video. Prueba con Chrome o Edge actualizado.');
  }

  await document.fonts.ready;

  const [video, logo] = await Promise.all([
    loadVideo(params.videoUrl),
    loadImage(params.logoUrl)
  ]);

  const duration = Math.min(Number.isFinite(video.duration) ? video.duration : 90, 90);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar el lienzo de exportación.');
  const context = ctx;

  const canvasStream = canvas.captureStream(FPS);
  const audioContext = new AudioContext();

  try {
    const source = audioContext.createMediaElementSource(video);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);
    destination.stream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
    await audioContext.resume();
  } catch {
    await audioContext.close().catch(() => undefined);
    throw new Error('No se pudo incluir el audio en el video exportado. Prueba con Chrome o Edge actualizado.');
  }

  const mimeType = supportedMimeType();
  const recorder = new MediaRecorder(canvasStream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];
  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error('No se pudo grabar el video compuesto.'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
  });

  function drawFrame() {
    context.fillStyle = '#111';
    context.fillRect(0, 0, WIDTH, HEIGHT);

    if (video.videoWidth && video.videoHeight) {
      const rect = coverRect(video.videoWidth, video.videoHeight, WIDTH, HEIGHT, params.position);
      context.drawImage(video, rect.x, rect.y, rect.width, rect.height);
    }

    drawOverlay(context, logo, params);
    params.onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)));

    if (!video.ended && video.currentTime < duration && recorder.state === 'recording') {
      requestAnimationFrame(drawFrame);
      return;
    }

    if (recorder.state === 'recording') recorder.stop();
  }

  video.currentTime = 0;
  recorder.start(1000);
  await video.play();
  drawFrame();

  const blob = await finished;
  video.pause();
  await audioContext.close().catch(() => undefined);
  params.onProgress?.(100);

  return {
    blob,
    extension: extensionFromMime(blob.type || recorder.mimeType)
  };
}
