'use client';

import { useEffect } from 'react';

import UnifiedGeneratorForm from '@/components/unified-generator/UnifiedGeneratorForm';
import useUnifiedGeneratorStore from '@/store/unified-generator/useUnifiedGeneratorStore';

export default function ReferenceToVideoForm() {
  const setMediaType = useUnifiedGeneratorStore((state) => state.setMediaType);
  const setVideoType = useUnifiedGeneratorStore((state) => state.setVideoType);

  useEffect(() => {
    setMediaType('video');
    setVideoType('reference-to-video');
  }, [setMediaType, setVideoType]);

  return <UnifiedGeneratorForm submitMode='transfer' />;
}
