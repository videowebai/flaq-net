'use client';

import { useEffect, useMemo, useState } from 'react';
import { AudioLines, Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import { ALL_IMAGE_MODELS } from '@/lib/constants/image';
import {
  ALL_VIDEO_MODELS,
  getVersionConfig,
  type VideoGenerationType,
} from '@/lib/constants/video';
import useUnifiedGeneratorStore from '@/store/unified-generator/useUnifiedGeneratorStore';

import GenerationTypeTabs from './GenerationTypeTabs';
import ModelPopover from './ModelPopover';
import ParameterPopover from './ParameterPopover';
import ReferenceLinkField from './ReferenceLinkField';
import ReferenceMediaField from './ReferenceMediaField';
import ReferenceMentionBar from './ReferenceMentionBar';
import ToolbarButton from './ToolbarButton';
import TypeTabs from './TypeTabs';
import useUnifiedGeneratorSubmit from './useUnifiedGeneratorSubmit';

type SupportedVideoType = Exclude<VideoGenerationType, 'video-edit'>;

interface UnifiedGeneratorFormProps {
  submitMode?: 'generate' | 'transfer';
}

export default function UnifiedGeneratorForm({
  submitMode = 'generate',
}: UnifiedGeneratorFormProps) {
  const t = useTranslations('UnifiedGenerator');
  const store = useUnifiedGeneratorStore();
  const { submit, isSubmitting } = useUnifiedGeneratorSubmit();
  const [ratio, setRatio] = useState('');
  const [resolution, setResolution] = useState('');
  const [duration, setDuration] = useState<number | undefined>();
  const [sound, setSound] = useState(false);
  const [seed, setSeed] = useState<number | undefined>();
  const [negativePrompt, setNegativePrompt] = useState('');

  const mediaType = store.mediaType;
  const videoType = store.videoType;
  const availableImageModels = useMemo(
    () => ALL_IMAGE_MODELS.filter((model) => store.imageType === 'image-to-image'
      ? !!model.options.imageInput?.isSupported
      : !model.options.imageInput?.isSupported),
    [store.imageType],
  );
  const availableVideoModels = useMemo(
    () => ALL_VIDEO_MODELS.filter((model) => model.generationType === videoType && !model.disabled),
    [videoType],
  );
  const selectedImageModel = availableImageModels.find((model) => model.model === store.imageModel)
    || availableImageModels[0];
  const selectedVideoModel = availableVideoModels.find((model) => model.model === store.videoModels[videoType])
    || availableVideoModels[0];
  const videoVersion = selectedVideoModel ? getVersionConfig(selectedVideoModel.modelVersion) : undefined;

  useEffect(() => {
    if (selectedImageModel && selectedImageModel.model !== store.imageModel) {
      store.setImageModel(selectedImageModel.model);
    }
  }, [selectedImageModel, store.imageModel, store.setImageModel]);

  useEffect(() => {
    if (selectedVideoModel && selectedVideoModel.model !== store.videoModels[videoType]) {
      store.setVideoModel(videoType, selectedVideoModel.model);
    }
  }, [selectedVideoModel, store.videoModels, store.setVideoModel, videoType]);

  useEffect(() => {
    const ratios = mediaType === 'image'
      ? selectedImageModel?.options.ratio?.map((item) => item.value)
      : selectedVideoModel?.options.ratio?.map((item) => item.value);
    const resolutions = mediaType === 'image'
      ? selectedImageModel?.options.resolution?.map((item) => item.value)
      : videoVersion?.options.resolution;
    const durations = videoVersion?.options.duration?.map((value) => Number(value.replace('s', '')));
    setRatio(ratios?.[0] || '');
    setResolution(resolutions?.[0] || '');
    setDuration(durations?.[0] ?? selectedVideoModel?.options.duration);
    setSound(!!selectedVideoModel?.options.defaultSound);
    setSeed(undefined);
    setNegativePrompt('');
  }, [mediaType, selectedImageModel?.model, selectedVideoModel?.model, videoVersion]);

  const imageLimit = mediaType === 'image'
    ? selectedImageModel?.options.imageInput?.max || 1
    : videoType === 'image-to-video'
      ? selectedVideoModel?.options.endFrame?.isSupported ? 2 : 1
      : selectedVideoModel?.options.multiImage?.maxImages || 0;
  const showImageInput = mediaType === 'image'
    ? !!selectedImageModel?.options.imageInput?.isSupported
    : videoType === 'image-to-video' || !!selectedVideoModel?.options.multiImage?.isSupported;
  const ratioOptions = mediaType === 'image'
    ? selectedImageModel?.options.ratio?.map((item) => item.value) || []
    : selectedVideoModel?.options.ratio?.map((item) => item.value) || [];
  const resolutionOptions = mediaType === 'image'
    ? selectedImageModel?.options.resolution?.map((item) => item.value) || []
    : videoVersion?.options.resolution || [];
  const durationOptions = videoVersion?.options.duration?.map((value) => Number(value.replace('s', ''))) || [];
  const seedConfig = mediaType === 'image' ? selectedImageModel?.options.seed : selectedVideoModel?.options.seed;
  const supportsSeed = !!seedConfig;
  const seedRange = typeof seedConfig === 'object' ? seedConfig : undefined;
  const isReferenceVideo = mediaType === 'video' && videoType === 'reference-to-video';

  const handleSubmit = async () => {
    await submit({
      mediaType,
      videoType,
      imageModel: selectedImageModel,
      videoModel: selectedVideoModel,
      prompt: store.prompt,
      images: store.referenceImages,
      videos: store.referenceVideos,
      audios: store.referenceAudios,
      files: store.referenceFiles,
      links: store.referenceLinks,
      ratio: ratio || undefined,
      resolution: resolution || undefined,
      duration,
      sound,
      seed,
      negativePrompt,
    });
  };

  const handleReset = () => {
    store.reset();
    setRatio('');
    setResolution('');
    setDuration(undefined);
    setSound(false);
    setSeed(undefined);
    setNegativePrompt('');
  };
  const appendMention = (mention: string) => {
    const separator = store.prompt && !/\s$/.test(store.prompt) ? ' ' : '';
    store.setPrompt(`${store.prompt}${separator}${mention} `);
  };
  const limitReached = () => toast.error(t('errors.max-files'));

  return (
    <section className='flex w-full flex-col gap-3'>
      <div className='flex w-full justify-center'>
        <TypeTabs
          value={mediaType}
          labels={{ image: t('media-type.image'), video: t('media-type.video') }}
          onChange={store.setMediaType}
        />
      </div>

      <div className='border-color-b1 bg-color-bg overflow-hidden rounded-xl border'>
        <div className='bg-color-c1 flex min-h-12 shrink-0 items-center justify-between gap-2 px-3'>
          <GenerationTypeTabs
            mediaType={mediaType}
            imageType={store.imageType}
            videoType={videoType}
            labels={{
              'text-to-image': t('image-type.text-to-image'),
              'image-to-image': t('image-type.image-to-image'),
              'text-to-video': t('video-type.text-to-video'),
              'image-to-video': t('video-type.image-to-video'),
              'reference-to-video': t('video-type.reference-to-video'),
            }}
            onImageTypeChange={store.setImageType}
            onVideoTypeChange={store.setVideoType}
          />
          <button
            type='button'
            onClick={handleReset}
            className='text-color-t2 hover:text-color-t1 inline-flex shrink-0 items-center gap-2 text-sm whitespace-nowrap transition-colors'
          >
            <RefreshCcw className='size-4' />
            {t('reset')}
          </button>
        </div>

        <div className='bg-color-bg0 flex h-[clamp(360px,calc(100dvh-200px),470px)] flex-col gap-2 p-3 sm:h-[400px] sm:gap-3 lg:h-[355px]'>
          <div className='flex min-h-[140px] flex-1 flex-col gap-3 sm:min-h-[190px] sm:flex-row'>
            <div className='empty:hidden sm:w-fit sm:max-w-[240px] sm:shrink-0'>
              <div className='custom-scrollbar flex max-h-full flex-col gap-3 overflow-y-auto pr-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  {showImageInput && imageLimit > 0 ? (
                    <ReferenceMediaField
                      kind='image'
                      label={videoType === 'image-to-video' ? t('start-image') : t('reference-images')}
                      files={store.referenceImages}
                      max={imageLimit}
                      accept={selectedVideoModel?.options.multiImage?.acceptedFormats}
                      onChange={store.setReferenceImages}
                      onLimitReached={limitReached}
                    />
                  ) : null}
                  {isReferenceVideo && selectedVideoModel?.options.multiVideo?.isSupported ? (
                    <ReferenceMediaField
                      kind='video'
                      label={t('reference-videos')}
                      files={store.referenceVideos}
                      max={selectedVideoModel.options.multiVideo.maxVideos}
                      accept={selectedVideoModel.options.multiVideo.acceptedFormats}
                      onChange={store.setReferenceVideos}
                      onLimitReached={limitReached}
                    />
                  ) : null}
                  {isReferenceVideo && selectedVideoModel?.options.multiAudio?.isSupported ? (
                    <ReferenceMediaField
                      kind='audio'
                      label={t('reference-audios')}
                      files={store.referenceAudios}
                      max={selectedVideoModel.options.multiAudio.maxAudios}
                      accept={selectedVideoModel.options.multiAudio.acceptedFormats}
                      onChange={store.setReferenceAudios}
                      onLimitReached={limitReached}
                    />
                  ) : null}
                  {isReferenceVideo && selectedVideoModel?.options.referenceFile?.isSupported ? (
                    <ReferenceMediaField
                      kind='file'
                      label={t('reference-files')}
                      files={store.referenceFiles}
                      max={selectedVideoModel.options.referenceFile.maxFiles}
                      accept={selectedVideoModel.options.referenceFile.acceptedFormats}
                      onChange={(files) => {
                        store.setReferenceFiles(files);
                        if (files.length) store.setReferenceLinks([]);
                      }}
                      onLimitReached={limitReached}
                    />
                  ) : null}
                </div>
                {isReferenceVideo && selectedVideoModel?.options.referenceLink?.isSupported ? (
                  <ReferenceLinkField
                    label={t('reference-links')}
                    placeholder={t('reference-link-placeholder')}
                    links={store.referenceLinks}
                    max={selectedVideoModel.options.referenceLink.maxLinks}
                    onChange={(links) => {
                      store.setReferenceLinks(links);
                      if (links.some(Boolean)) store.setReferenceFiles([]);
                    }}
                  />
                ) : null}
              </div>
            </div>

            <div className='relative flex min-h-[140px] min-w-0 flex-1 flex-col overflow-hidden rounded-md bg-transparent sm:min-h-[190px]'>
              {isReferenceVideo ? (
                <ReferenceMentionBar
                  label={t('mention-reference')}
                  imageCount={store.referenceImages.length}
                  videoCount={store.referenceVideos.length}
                  audioCount={store.referenceAudios.length}
                  onInsert={appendMention}
                />
              ) : null}
              <textarea
                value={store.prompt}
                maxLength={2000}
                onChange={(event) => store.setPrompt(event.target.value)}
                placeholder={t('prompt-placeholder')}
                className='custom-scrollbar text-color-t1 placeholder:text-color-t3 min-h-0 w-full flex-1 resize-none overflow-y-auto bg-transparent px-0 py-0 pr-24 text-[15px] leading-7 outline-none'
              />
              <div className='text-color-t3 pointer-events-none absolute right-3 bottom-3 text-sm'>
                {store.prompt.length} / 2000
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
              <ParameterPopover
                resolutions={resolutionOptions}
                ratios={ratioOptions}
                durations={mediaType === 'video' ? durationOptions : []}
                durationRange={mediaType === 'video' ? videoVersion?.options.durationRange : undefined}
                resolution={resolution}
                ratio={ratio}
                duration={duration}
                seed={seed}
                seedRange={seedRange}
                supportsSeed={supportsSeed}
                negativePrompt={negativePrompt}
                supportsNegativePrompt={mediaType === 'video' && !!selectedVideoModel?.options.negativePrompt}
                labels={{
                  resolution: t('resolution'),
                  ratio: t('ratio'),
                  duration: t('duration'),
                  seed: t('seed'),
                  negativePrompt: t('negative-prompt'),
                  optional: t('optional'),
                }}
                onResolutionChange={setResolution}
                onRatioChange={setRatio}
                onDurationChange={setDuration}
                onSeedChange={setSeed}
                onNegativePromptChange={setNegativePrompt}
              />
              {mediaType === 'image' && selectedImageModel ? (
                <ModelPopover
                  models={availableImageModels}
                  selectedModel={selectedImageModel}
                  label={t('model')}
                  onChange={store.setImageModel}
                />
              ) : null}
              {mediaType === 'video' && selectedVideoModel ? (
                <ModelPopover
                  models={availableVideoModels}
                  selectedModel={selectedVideoModel}
                  label={t('model')}
                  onChange={(model) => store.setVideoModel(videoType, model)}
                />
              ) : null}
              {mediaType === 'video' && selectedVideoModel?.options.sound ? (
                <ToolbarButton active={sound} onClick={() => setSound((value) => !value)}>
                  <AudioLines className='size-4' />
                  {t('sound')}
                </ToolbarButton>
              ) : null}
            </div>

            {submitMode === 'transfer' ? (
              <Link
                href='/ai-media-creator'
                className='bg-color-main inline-flex h-9 w-full min-w-[120px] shrink-0 items-center justify-center gap-2 rounded-md px-4 text-base leading-none font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90 sm:w-auto'
              >
                {t('generate')}
              </Link>
            ) : (
              <button
                type='button'
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || (mediaType === 'video' && !selectedVideoModel)}
                className='bg-color-main inline-flex h-9 w-full min-w-[120px] shrink-0 items-center justify-center gap-2 rounded-md px-4 text-base leading-none font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'
              >
                {t('generate')}
                {isSubmitting ? <Loader2 className='size-4 animate-spin' /> : null}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
