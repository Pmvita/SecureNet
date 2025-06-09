import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CardImageProps } from './Card.types';

const aspectRatioClasses = {
  auto: 'aspect-auto',
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-video',
  '21/9': 'aspect-[21/9]',
} as const;

const objectFitClasses = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
} as const;

export const CardImage = React.forwardRef<HTMLImageElement, CardImageProps>(
  ({
    className,
    src,
    alt,
    aspectRatio = '16/9',
    objectFit = 'cover',
    'data-testid': dataTestId,
    ...props
  }, ref) => {
    return (
      <div className={cn('relative w-full overflow-hidden', aspectRatioClasses[aspectRatio])}>
        <img
          ref={ref}
          src={src}
          alt={alt}
          className={cn(
            'h-full w-full',
            objectFitClasses[objectFit],
            className
          )}
          data-testid={dataTestId}
          {...props}
        />
      </div>
    );
  }
);

CardImage.displayName = 'CardImage'; 