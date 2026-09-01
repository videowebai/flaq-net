import { create } from 'zustand';

import type { VideoGenerationType } from '@/lib/constants/video';

export type UnifiedMediaType = 'image' | 'video';

interface UnifiedGeneratorState {
  mediaType: UnifiedMediaType;
  imageType: 'text-to-image' | 'image-to-image';
  videoType: Exclude<VideoGenerationType, 'video-edit'>;
  imageModel: string;
  videoModels: Partial<Record<Exclude<VideoGenerationType, 'video-edit'>, string>>;
  prompt: string;
  referenceImages: File[];
  referenceVideos: File[];
  referenceAudios: File[];
  referenceFiles: File[];
  referenceLinks: string[];
  setMediaType: (mediaType: UnifiedMediaType) => void;
  setImageType: (imageType: 'text-to-image' | 'image-to-image') => void;
  setVideoType: (videoType: Exclude<VideoGenerationType, 'video-edit'>) => void;
  setImageModel: (imageModel: string) => void;
  setVideoModel: (type: Exclude<VideoGenerationType, 'video-edit'>, model: string) => void;
  setPrompt: (prompt: string) => void;
  setReferenceImages: (files: File[]) => void;
  setReferenceVideos: (files: File[]) => void;
  setReferenceAudios: (files: File[]) => void;
  setReferenceFiles: (files: File[]) => void;
  setReferenceLinks: (links: string[]) => void;
  openReferenceDraft: () => void;
  reset: () => void;
}

const initialState = {
  mediaType: 'video' as const,
  imageType: 'text-to-image' as const,
  videoType: 'text-to-video' as const,
  imageModel: '',
  videoModels: {},
  prompt: '',
  referenceImages: [],
  referenceVideos: [],
  referenceAudios: [],
  referenceFiles: [],
  referenceLinks: [],
};

const useUnifiedGeneratorStore = create<UnifiedGeneratorState>((set) => ({
  ...initialState,
  setMediaType: (mediaType) => set({ mediaType }),
  setImageType: (imageType) => set({ mediaType: 'image', imageType }),
  setVideoType: (videoType) => set({ mediaType: 'video', videoType }),
  setImageModel: (imageModel) => set({ imageModel }),
  setVideoModel: (type, model) => set((state) => ({
    videoModels: { ...state.videoModels, [type]: model },
  })),
  setPrompt: (prompt) => set({ prompt }),
  setReferenceImages: (referenceImages) => set({ referenceImages }),
  setReferenceVideos: (referenceVideos) => set({ referenceVideos }),
  setReferenceAudios: (referenceAudios) => set({ referenceAudios }),
  setReferenceFiles: (referenceFiles) => set({ referenceFiles }),
  setReferenceLinks: (referenceLinks) => set({ referenceLinks }),
  openReferenceDraft: () => set({ mediaType: 'video', videoType: 'reference-to-video' }),
  reset: () => set(initialState),
}));

export default useUnifiedGeneratorStore;
