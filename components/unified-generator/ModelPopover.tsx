'use client';

import { Check, ChevronDown, Sparkles } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getModelIconConfig } from '@/lib/utils/modelIcons';

type GeneratorModel = { model: string; name: string; provider: string };

export default function ModelPopover({
  models,
  selectedModel,
  label,
  onChange,
}: {
  models: GeneratorModel[];
  selectedModel: GeneratorModel;
  label: string;
  onChange: (model: string) => void;
}) {
  const selectedIcon = getModelIconConfig(selectedModel.model);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='border-color-b1 bg-color-c3 text-color-t1 hover:bg-color-c4 flex h-9 w-full min-w-0 items-center gap-2 rounded-md border px-3 text-sm transition-colors sm:min-w-[280px] sm:max-w-[360px]'
          aria-label={label}
        >
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center overflow-hidden rounded',
              selectedIcon.background === 'light' && 'bg-white p-0.5',
            )}
          >
            {selectedIcon.src ? <img src={selectedIcon.src} alt='' className='size-full object-contain' /> : <Sparkles className='size-4' />}
          </span>
          <span className='min-w-0 flex-1 truncate text-left'>{selectedModel.name}</span>
          <ChevronDown className='text-color-t3 size-4 shrink-0' />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side='top'
        align='start'
        sideOffset={8}
        className='border-color-b1 bg-color-c1 text-color-t1 w-[min(420px,calc(100vw-32px))] rounded-xl border p-2 shadow-2xl'
      >
        <div className='custom-scrollbar max-h-[330px] space-y-1 overflow-y-auto'>
          {models.map((model) => {
            const icon = getModelIconConfig(model.model);
            const active = model.model === selectedModel.model;
            return (
              <button
                key={model.model}
                type='button'
                onClick={() => onChange(model.model)}
                className='hover:bg-color-c4 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors'
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md',
                    icon.background === 'light' && 'bg-white p-0.5',
                  )}
                >
                  {icon.src ? <img src={icon.src} alt='' className='size-full object-contain' /> : <Sparkles className='text-color-main size-4' />}
                </span>
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm'>{model.name}</span>
                  <span className='text-color-t3 block truncate text-xs'>{model.provider}</span>
                </span>
                {active ? <Check className='text-color-main size-4 shrink-0' /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
