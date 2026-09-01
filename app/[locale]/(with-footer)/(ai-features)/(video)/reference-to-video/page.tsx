import ReferenceToVideoForm from './_components/ReferenceToVideoForm';
import ReferenceToVideoPublicSections from './_components/ReferenceToVideoPublicSections';

export default function Page() {
  return (
    <div className='relative w-full flex-1'>
      <div className='container-centered pt-3 pb-10 lg:py-10'>
        <ReferenceToVideoForm />
      </div>
      <ReferenceToVideoPublicSections />
    </div>
  );
}
