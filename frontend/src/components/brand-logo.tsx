import { cn } from '@/lib/utils';

type BrandMarkProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export function BrandMark({ className, markClassName, textClassName }: BrandMarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <span
        className={cn(
          'relative size-11 shrink-0 overflow-hidden',
          markClassName,
        )}
        aria-hidden="true"
      >
        <img
          src="/smart-lanka-logo-cropped.png"
          alt=""
          className="pointer-events-none h-full w-full select-none object-contain"
        />
      </span>
      <span className={cn('font-extrabold tracking-[-0.04em]', textClassName)}>Smart Lanka</span>
    </span>
  );
}

export function FullBrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/smart-lanka-logo-cropped.png"
      alt="Smart Lanka"
      className={cn('object-contain', className)}
    />
  );
}
