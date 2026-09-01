'use client';

import { useEffect } from 'react';

import UnifiedGeneratorForm from '@/components/unified-generator/UnifiedGeneratorForm';
import useUnifiedGeneratorStore from '@/store/unified-generator/useUnifiedGeneratorStore';

export default function ReferenceToVideoForm() {
  const openReferenceDraft = useUnifiedGeneratorStore((state) => state.openReferenceDraft);

  useEffect(() => {
    openReferenceDraft();
  }, [openReferenceDraft]);

  return <UnifiedGeneratorForm submitMode='transfer' />;
}
