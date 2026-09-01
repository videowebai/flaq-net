'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import ToolbarButton from './ToolbarButton';

interface ParameterLabels {
  resolution: string;
  ratio: string;
  duration: string;
  seed: string;
  negativePrompt: string;
  optional: string;
}

function RatioIcon({ value, active }: { value: string; active: boolean }) {
  const [width, height] = value.split(':').map(Number);
  const safeWidth = width || 1;
  const safeHeight = height || 1;
  const scale = 16 / Math.max(safeWidth, safeHeight);
  return (
    <span
      className={cn('rounded-[2px] border-[1.25px]', active ? 'border-color-main' : 'border-color-t3')}
      style={{ width: `${safeWidth * scale}px`, height: `${safeHeight * scale}px` }}
    />
  );
}

export default function ParameterPopover({
  resolutions,
  ratios,
  durations,
  durationRange,
  resolution,
  ratio,
  duration,
  seed,
  seedRange,
  supportsSeed,
  negativePrompt,
  supportsNegativePrompt,
  labels,
  onResolutionChange,
  onRatioChange,
  onDurationChange,
  onSeedChange,
  onNegativePromptChange,
}: {
  resolutions: string[];
  ratios: string[];
  durations: number[];
  durationRange?: { min: number; max: number };
  resolution: string;
  ratio: string;
  duration?: number;
  seed?: number;
  seedRange?: { min: number; max: number };
  supportsSeed: boolean;
  negativePrompt: string;
  supportsNegativePrompt: boolean;
  labels: ParameterLabels;
  onResolutionChange: (value: string) => void;
  onRatioChange: (value: string) => void;
  onDurationChange: (value: number) => void;
  onSeedChange: (value?: number) => void;
  onNegativePromptChange: (value: string) => void;
}) {
  const summary = [resolution?.toUpperCase(), ratio, duration ? `${duration}s` : ''].filter(Boolean);
  if (!summary.length && !supportsSeed && !supportsNegativePrompt) return null;

  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <ToolbarButton>
          {summary.map((item, index) => (
            <span key={item} className='inline-flex items-center gap-1'>
              {index > 0 ? <span className='bg-color-b1 h-[19px] w-px' /> : null}
              <span>{item}</span>
            </span>
          ))}
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        side='top'
        align='start'
        sideOffset={8}
        className='border-color-b1 bg-color-c1 text-color-t1 w-[437px] max-w-[calc(100vw-32px)] rounded-lg border p-2 shadow-xl'
      >
        <div className='flex flex-col gap-2'>
          {resolutions.length ? (
            <div className='space-y-2'>
              <div className='text-color-t2 text-sm'>{labels.resolution}</div>
              <div className='flex items-center gap-2'>
                {resolutions.map((value) => (
                  <button
                    key={value}
                    type='button'
                    className={cn(
                      'flex h-[30px] flex-1 items-center justify-center rounded px-2 text-sm transition-colors',
                      resolution === value ? 'bg-color-c4 text-color-main' : 'text-color-t3 hover:bg-color-c4 hover:text-color-t1',
                    )}
                    onClick={() => onResolutionChange(value)}
                  >
                    {value.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {resolutions.length && ratios.length ? <div className='border-color-b1 border-t' /> : null}
          {ratios.length ? (
            <div className='space-y-2'>
              <div className='text-color-t2 text-sm'>{labels.ratio}</div>
              <div className='grid grid-cols-6 gap-2'>
                {ratios.map((value) => (
                  <button
                    key={value}
                    type='button'
                    className={cn(
                      'flex h-[57px] flex-col items-center justify-center gap-1 rounded px-2 text-sm transition-colors',
                      ratio === value ? 'bg-color-c4 text-color-main' : 'text-color-t3 hover:bg-color-c4 hover:text-color-t1',
                    )}
                    onClick={() => onRatioChange(value)}
                  >
                    <RatioIcon value={value} active={ratio === value} />
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {(resolutions.length || ratios.length) && (durationRange || durations.length) ? <div className='border-color-b1 border-t' /> : null}
          {durationRange || durations.length ? (
            <div className='space-y-2'>
              <div className='text-color-t2 text-sm'>{labels.duration}</div>
              <div className='flex flex-wrap items-center gap-2'>
                {(durationRange
                  ? [durationRange.min, Math.round((durationRange.min + durationRange.max) / 2), durationRange.max]
                  : durations).filter((value, index, values) => values.indexOf(value) === index).map((value) => (
                    <button
                      key={value}
                      type='button'
                      className={cn(
                        'flex h-[30px] min-w-12 items-center justify-center rounded px-3 text-sm transition-colors',
                        duration === value ? 'bg-color-c4 text-color-main' : 'text-color-t3 hover:bg-color-c4 hover:text-color-t1',
                      )}
                      onClick={() => onDurationChange(value)}
                    >
                      {value}s
                    </button>
                  ))}
                {durationRange ? (
                  <label className='border-color-b1 bg-color-c3 text-color-t2 focus-within:border-color-main flex h-[30px] w-[104px] items-center rounded border px-2 text-sm'>
                    <input
                      type='number'
                      min={durationRange.min}
                      max={durationRange.max}
                      value={duration ?? ''}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) onDurationChange(value);
                      }}
                      className='text-color-t1 min-w-0 flex-1 bg-transparent outline-none'
                    />
                    <span className='text-color-t3'>s</span>
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}
          {supportsNegativePrompt ? (
            <>
              <div className='border-color-b1 border-t' />
              <label className='space-y-2'>
                <span className='text-color-t2 text-sm'>{labels.negativePrompt}</span>
                <textarea
                  value={negativePrompt}
                  placeholder={labels.optional}
                  className='custom-scrollbar border-color-b1 bg-color-c3 text-color-t1 min-h-[72px] w-full resize-y rounded border px-3 py-2 text-sm outline-none focus:border-color-main'
                  onChange={(event) => onNegativePromptChange(event.target.value)}
                />
              </label>
            </>
          ) : null}
          {supportsSeed ? (
            <>
              <div className='border-color-b1 border-t' />
              <label className='space-y-2'>
                <span className='text-color-t2 text-sm'>{labels.seed}</span>
                <input
                  type='number'
                  min={seedRange?.min}
                  max={seedRange?.max}
                  value={seed ?? ''}
                  placeholder={labels.optional}
                  className='border-color-b1 bg-color-c3 text-color-t1 h-9 w-full rounded border px-3 text-sm outline-none focus:border-color-main'
                  onChange={(event) => onSeedChange(event.target.value ? Number(event.target.value) : undefined)}
                />
              </label>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
