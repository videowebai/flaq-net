import CreatorHistory from '@/components/unified-generator/CreatorHistory';
import UnifiedGeneratorForm from '@/components/unified-generator/UnifiedGeneratorForm';

import AIMediaCreatorPublicSections from './_components/AIMediaCreatorPublicSections';

export default function Page() {
  return (
    <main className='relative w-full flex-1'>
      <div className='container-centered space-y-10 pt-3 pb-10 lg:py-10'>
        <UnifiedGeneratorForm />
        <CreatorHistory />
      </div>
      <AIMediaCreatorPublicSections />
    </main>
  );
}
