import type { VariantProps } from 'class-variance-authority';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cardVariants } from './Card.variants';

export type CardVariantProps = VariantProps<typeof cardVariants>;

export interface CardBaseProps extends ComponentPropsWithoutRef<'div'> {
  /** Optional className for custom styling */
  className?: string;
  /** Optional test ID for testing */
  'data-testid'?: string;
  /** Optional Cypress test ID */
  'data-cy'?: string;
  /** Optional role for accessibility */
  'data-role'?: string;
  /** Optional variant data attribute */
  'data-variant'?: CardVariantProps['variant'];
  /** Optional padding data attribute */
  'data-padding'?: CardVariantProps['padding'];
  /** Optional radius data attribute */
  'data-radius'?: CardVariantProps['radius'];
  /** Optional shadow data attribute */
  'data-shadow'?: CardVariantProps['shadow'];
  /** Optional border data attribute */
  'data-border'?: CardVariantProps['border'];
  /** Optional interactive data attribute */
  'data-interactive'?: CardVariantProps['interactive'];
  /** Optional disabled data attribute */
  'data-disabled'?: CardVariantProps['disabled'];
  /** Optional loading data attribute */
  'data-loading'?: CardVariantProps['loading'];
  /** Optional selected data attribute */
  'data-selected'?: CardVariantProps['selected'];
  /** Optional full width data attribute */
  'data-full-width'?: CardVariantProps['fullWidth'];
}

export interface CardProps extends CardBaseProps, CardVariantProps {
  /** Card content */
  children: ReactNode;
}

export interface CardHeaderProps extends CardBaseProps {
  /** Whether to show a border at the bottom */
  withBorder?: boolean;
  /** Header content */
  children: ReactNode;
}

export interface CardTitleProps extends ComponentPropsWithoutRef<'h3'> {
  /** Optional className for custom styling */
  className?: string;
  /** Optional test ID for testing */
  'data-testid'?: string;
  /** The element type to render (defaults to h3) */
  as?: ElementType;
  /** Title content */
  children: ReactNode;
}

export interface CardDescriptionProps extends ComponentPropsWithoutRef<'p'> {
  /** Optional className for custom styling */
  className?: string;
  /** Optional test ID for testing */
  'data-testid'?: string;
  /** Description content */
  children: ReactNode;
}

export interface CardContentProps extends CardBaseProps {
  /** Whether to add padding at the top */
  withPadding?: boolean;
  /** Content */
  children: ReactNode;
}

export interface CardFooterProps extends CardBaseProps {
  /** Whether to show a border at the top */
  withBorder?: boolean;
  /** Footer content */
  children: ReactNode;
}

export interface CardImageProps extends ComponentPropsWithoutRef<'img'> {
  /** Optional className for custom styling */
  className?: string;
  /** Optional test ID for testing */
  'data-testid'?: string;
  /** Image source */
  src: string;
  /** Image alt text */
  alt: string;
  /** Aspect ratio of the image container */
  aspectRatio?: 'auto' | '1/1' | '4/3' | '16/9' | '21/9';
  /** How the image should fit within its container */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

export interface CardMediaProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The content of the card media
   */
  children?: ReactNode;

  /**
   * The aspect ratio of the media
   * @default '16/9'
   */
  aspectRatio?: 'auto' | '1/1' | '4/3' | '16/9' | '21/9';

  /**
   * Custom class name for the media
   */
  className?: string;

  /**
   * The data test id for the media
   */
  'data-testid'?: string;
} 