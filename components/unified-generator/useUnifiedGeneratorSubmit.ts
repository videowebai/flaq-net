'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import type { ImageModel } from '@/lib/constants/image';
import type { VideoGenerationType, VideoModel } from '@/lib/constants/video';
import { createImageTask } from '@/network/image/client';
import { addPendingImageHistory } from '@/network/image/history';
import { getClientOpenApiConfigAsync } from '@/network/clientFetch';
import { startTaskPolling } from '@/network/task-polling';
import { createVideoTask } from '@/network/video/client';
import { addPendingVideoHistory } from '@/network/video/history';
import useUploadFiles from '@/hooks/use-upload-files';

interface UnifiedSubmitInput {
  mediaType: 'image' | 'video';
  videoType: Exclude<VideoGenerationType, 'video-edit'>;
  imageModel?: ImageModel;
  videoModel?: VideoModel;
  prompt: string;
  images: File[];
  videos: File[];
  audios: File[];
  files: File[];
  links: string[];
  ratio?: string;
  resolution?: string;
  duration?: number;
  sound?: boolean;
  seed?: number;
  negativePrompt?: string;
  guidanceScale?: number;
}

function getImageDimensions(ratio?: string, resolution?: string) {
  const base = resolution?.toLowerCase() === '2k' ? 2048 : 1024;
  const [widthRatio, heightRatio] = (ratio || '1:1').split(':').map(Number);
  if (!widthRatio || !heightRatio) return { width: base, height: base };

  if (widthRatio >= heightRatio) {
    return { width: base, height: Math.round((base * heightRatio) / widthRatio) };
  }
  return { width: Math.round((base * widthRatio) / heightRatio), height: base };
}

async function getMediaDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const element = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
    const objectUrl = URL.createObjectURL(file);
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      const duration = element.duration;
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };
    element.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('media-metadata'));
    };
    element.src = objectUrl;
  });
}

function serializeReferencePrompt(prompt: string, imageCount: number, videoCount: number, audioCount: number) {
  const validReferences = new Set([
    ...Array.from({ length: imageCount }, (_, index) => `image_${index + 1}`),
    ...Array.from({ length: videoCount }, (_, index) => `video_${index + 1}`),
    ...Array.from({ length: audioCount }, (_, index) => `audio_${index + 1}`),
  ]);
  const missingReferences = new Set<string>();
  const serialized = prompt.replace(
    /@((?:image|video|audio)_\d+)|<<<((?:image|video|audio)_\d+)>>>/g,
    (token, mentionId: string | undefined, serializedId: string | undefined) => {
      const id = mentionId || serializedId;
      if (!id) return token;
      if (!validReferences.has(id)) {
        missingReferences.add(id);
        return token;
      }
      return `<<<${id}>>>`;
    },
  );

  return { serialized, missingReferences: Array.from(missingReferences) };
}

export default function useUnifiedGeneratorSubmit() {
  const t = useTranslations('UnifiedGenerator');
  const uploadFiles = useUploadFiles();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const upload = async (files: File[]) => {
    if (!files.length) return [];
    return uploadFiles(files.map((file) => ({ data: file, type: file.type || 'application/octet-stream' })));
  };

  const validateMediaDurations = async (model: VideoModel, videos: File[], audios: File[]) => {
    const validateGroup = async (
      items: File[],
      constraints?: { minDurationSeconds?: number; maxDurationSeconds?: number; maxTotalDurationSeconds?: number },
    ) => {
      if (!items.length || !constraints) return;
      const durations = await Promise.all(items.map(getMediaDuration));
      const invalid = durations.some((duration) =>
        (constraints.minDurationSeconds !== undefined && duration < constraints.minDurationSeconds)
        || (constraints.maxDurationSeconds !== undefined && duration > constraints.maxDurationSeconds));
      if (invalid) {
        throw new Error(t('errors.media-duration', {
          min: constraints.minDurationSeconds ?? 0,
          max: constraints.maxDurationSeconds ?? 0,
        }));
      }
      if (
        constraints.maxTotalDurationSeconds !== undefined
        && durations.reduce((sum, duration) => sum + duration, 0) > constraints.maxTotalDurationSeconds
      ) {
        throw new Error(t('errors.total-duration', { max: constraints.maxTotalDurationSeconds }));
      }
    };

    await validateGroup(videos, model.options.multiVideo);
    await validateGroup(audios, model.options.multiAudio);
  };

  const submit = async (input: UnifiedSubmitInput) => {
    if (isSubmitting) return false;
    if (!input.prompt.trim()) {
      toast.error(t('errors.prompt'));
      return false;
    }

    setIsSubmitting(true);
    try {
      if (input.mediaType === 'image') {
        if (!input.imageModel) throw new Error(t('errors.model'));
        const imageOptions = input.imageModel.options.imageInput;
        const minimum = imageOptions?.required ? imageOptions.min || 1 : 0;
        if (input.images.length < minimum) throw new Error(t('errors.reference-required'));

        const imageUrls = await upload(input.images);
        const dimensions = getImageDimensions(input.ratio, input.resolution);
        const response = await createImageTask(await getClientOpenApiConfigAsync(), {
          model_name: input.imageModel.model,
          prompt: input.prompt.trim(),
          width: dimensions.width,
          height: dimensions.height,
          resolution: input.resolution,
          image_url_list: imageUrls.length ? imageUrls : undefined,
          seed: input.seed,
          negative_prompt: input.negativePrompt || undefined,
        });
        if (response.code !== 0 || !response.data?.task_id) throw new Error(response.message);

        addPendingImageHistory({
          id: response.data.task_id,
          taskId: response.data.task_id,
          prompt: input.prompt.trim(),
          createTime: Date.now(),
          url: '',
          thumbnailUrl: imageUrls[0] || '',
          resolution: input.resolution || input.ratio || '1:1',
          modelName: input.imageModel.model,
          modelInfo: input.imageModel.name,
          userImageUrlList: imageUrls,
        });
        startTaskPolling(response.data.task_id, 'image');
        toast.success(response.message || t('submitted'));
        return true;
      }

      if (!input.videoModel) throw new Error(t('errors.model'));
      const model = input.videoModel;
      const isReferenceVideo = input.videoType === 'reference-to-video';
      const referenceImages = input.videoType === 'text-to-video' ? [] : input.images;
      const referenceVideos = isReferenceVideo ? input.videos : [];
      const referenceAudios = isReferenceVideo ? input.audios : [];
      const referenceFiles = isReferenceVideo ? input.files : [];
      const referenceLinks = isReferenceVideo ? input.links : [];
      const requiredImages = model.options.multiImage?.required
        ? model.options.multiImage.minImages || 1
        : model.options.startFrame?.required ? 1 : 0;
      if (referenceImages.length < requiredImages) throw new Error(t('errors.reference-required'));

      const minReferenceSubjects = model.options.minReferenceSubjects
        ?? (model.options.independentReferenceLimits ? 0 : input.videoType === 'reference-to-video' ? 1 : 0);
      const totalReferenceSubjects = referenceImages.length + referenceVideos.length;
      if (totalReferenceSubjects < minReferenceSubjects) {
        throw new Error(t('errors.reference-required'));
      }
      if (
        model.options.maxReferenceSubjects !== undefined
        && totalReferenceSubjects > model.options.maxReferenceSubjects
      ) {
        throw new Error(t('errors.max-files'));
      }
      if (model.options.multiVideo?.required && referenceVideos.length < (model.options.multiVideo.minVideos || 1)) {
        throw new Error(t('errors.reference-required'));
      }
      if (model.options.multiAudio?.required && referenceAudios.length < (model.options.multiAudio.minAudios || 1)) {
        throw new Error(t('errors.reference-required'));
      }
      if (referenceFiles.length && referenceLinks.some(Boolean)) {
        throw new Error(t('errors.reference-source-exclusive'));
      }
      const acceptedFormats = model.options.referenceFile?.acceptedFormats.map((format) => format.toLowerCase()) || [];
      if (referenceFiles.some((file) => !acceptedFormats.includes(file.name.split('.').pop()?.toLowerCase() || ''))) {
        throw new Error(t('errors.reference-file-format'));
      }
      if (referenceLinks.filter(Boolean).some((link) => {
        try {
          const url = new URL(link);
          return url.protocol !== 'http:' && url.protocol !== 'https:';
        } catch {
          return true;
        }
      })) {
        throw new Error(t('errors.reference-link'));
      }

      const referencePrompt = input.videoType === 'reference-to-video'
        ? serializeReferencePrompt(
          input.prompt.trim(),
          referenceImages.length,
          referenceVideos.length,
          referenceAudios.length,
        )
        : { serialized: input.prompt.trim(), missingReferences: [] };
      if (referencePrompt.missingReferences.length) {
        throw new Error(t('errors.missing-references', { references: referencePrompt.missingReferences.join(', ') }));
      }

      await validateMediaDurations(model, referenceVideos, referenceAudios);
      const [imageUrls, videoUrls, audioUrls, fileUrls] = await Promise.all([
        upload(referenceImages),
        upload(referenceVideos),
        upload(referenceAudios),
        upload(referenceFiles),
      ]);
      const response = await createVideoTask(await getClientOpenApiConfigAsync(), {
        model_name: model.model,
        prompt: referencePrompt.serialized,
        aspect_ratio: input.ratio,
        resolution: input.resolution,
        duration: input.duration,
        image_url: input.videoType === 'image-to-video' ? imageUrls[0] : undefined,
        image_end_url: input.videoType === 'image-to-video' ? imageUrls[1] : undefined,
        images: input.videoType === 'reference-to-video' && imageUrls.length ? imageUrls : undefined,
        videos: videoUrls.length ? videoUrls : undefined,
        audios: audioUrls.length ? audioUrls : undefined,
        files: fileUrls.length ? fileUrls : undefined,
        links: referenceLinks.filter(Boolean).length ? referenceLinks.filter(Boolean) : undefined,
        sound: model.options.sound ? input.sound : undefined,
        seed: input.seed,
        negative_prompt: input.negativePrompt || undefined,
        guidance_scale: input.guidanceScale,
      });
      if (response.code !== 0 || !response.data?.task_id) throw new Error(response.message);

      addPendingVideoHistory({
        id: response.data.task_id,
        traceId: response.data.task_id,
        platformName: model.model,
        coverImage: imageUrls[0] || '',
        categoryName: '',
        createTime: Date.now(),
        duration: input.duration || 0,
        errorInfo: '',
        imageEndUrl: imageUrls[1] || '',
        imageUrl: imageUrls[0] || '',
        prompt: referencePrompt.serialized,
        videoId: response.data.task_id,
        videoThumbnailUrl: imageUrls[0] || '',
        videoUrl: '',
        videoType: input.videoType === 'reference-to-video'
          ? 'Reference-to-video'
          : input.videoType === 'image-to-video' ? 'Image-to-video' : 'Text-to-video',
        ratio: input.ratio,
      });
      startTaskPolling(response.data.task_id, 'video');
      toast.success(response.message || t('submitted'));
      return true;
    } catch (error) {
      toast.error(error instanceof Error && error.message !== 'media-metadata'
        ? error.message
        : t('errors.media-metadata'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting };
}
