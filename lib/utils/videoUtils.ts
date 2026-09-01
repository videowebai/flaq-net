'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const waitForVideoEvent = (video: HTMLVideoElement, eventName: keyof HTMLMediaElementEventMap) =>
  new Promise<void>((resolve, reject) => {
    const handleSuccess = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Video ${eventName} failed`));
    };

    const cleanup = () => {
      video.removeEventListener(eventName, handleSuccess);
      video.removeEventListener('error', handleError);
    };

    video.addEventListener(eventName, handleSuccess, { once: true });
    video.addEventListener('error', handleError, { once: true });
  });

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export const loadVideoMetadata = async (source: File | string): Promise<VideoMetadata> => {
  const video = document.createElement('video');
  const objectUrl = source instanceof File ? URL.createObjectURL(source) : source;

  try {
    video.preload = 'metadata';
    video.src = objectUrl;
    await waitForVideoEvent(video, 'loadedmetadata');

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error('Invalid video duration');
    }

    return {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (source instanceof File) {
      URL.revokeObjectURL(objectUrl);
    }
  }
};

export const loadVideoDuration = async (source: File | string): Promise<number> => {
  const metadata = await loadVideoMetadata(source);
  return metadata.duration;
};

const FFMPEG_CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

const getFFmpeg = async () => {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg();

      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })().catch((error) => {
      ffmpegLoadPromise = null;
      throw error;
    });
  }

  return ffmpegLoadPromise;
};

export async function trimVideoFile(videoFile: File, startTime: number, endTime: number): Promise<File> {
  const duration = endTime - startTime;
  if (startTime < 0 || duration <= 0) {
    throw new Error('Invalid trim range');
  }

  const ffmpeg = await getFFmpeg();
  const inputExtension = videoFile.name.split('.').pop() || 'mp4';
  const inputName = `input.${inputExtension}`;
  const outputName = 'output.mp4';

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    const exitCode = await ffmpeg.exec([
      '-i',
      inputName,
      '-ss',
      startTime.toFixed(3),
      '-t',
      duration.toFixed(3),
      '-movflags',
      'faststart',
      outputName,
    ]);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg exited with code ${exitCode}`);
    }

    const data = await ffmpeg.readFile(outputName);
    const originalName = videoFile.name.replace(/\.[^/.]+$/, '');
    const outputBytes = data as Uint8Array;
    const outputBuffer = outputBytes.buffer.slice(
      outputBytes.byteOffset,
      outputBytes.byteOffset + outputBytes.byteLength,
    ) as ArrayBuffer;

    return new File([outputBuffer], `${originalName}_trimmed.mp4`, { type: 'video/mp4' });
  } finally {
    await Promise.allSettled([ffmpeg.deleteFile(inputName), ffmpeg.deleteFile(outputName)]);
  }
}
