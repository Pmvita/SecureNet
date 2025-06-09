import { cva } from 'class-variance-authority';

export const cardVariants = cva(
  'relative flex flex-col overflow-hidden transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        success: 'bg-success text-success-foreground',
        danger: 'bg-danger text-danger-foreground',
        warning: 'bg-warning text-warning-foreground',
        info: 'bg-info text-info-foreground',
        ghost: 'bg-transparent hover:bg-accent hover:text-accent-foreground',
        glass: 'bg-white/10 backdrop-blur-lg border border-white/20',
        outline: 'border border-input bg-background',
        subtle: 'bg-gray-100 text-gray-900',
        transparent: 'bg-transparent',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      radius: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
        full: 'rounded-full',
      },
      shadow: {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg',
        xl: 'shadow-xl',
        '2xl': 'shadow-2xl',
        inner: 'shadow-inner',
      },
      border: {
        none: 'border-0',
        default: 'border border-border',
        sm: 'border border-border/50',
        lg: 'border-2 border-border',
        xl: 'border-4 border-border',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-lg active:shadow-inner',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed pointer-events-none',
      },
      loading: {
        true: 'animate-pulse',
      },
      selected: {
        true: 'ring-2 ring-primary ring-offset-2',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    compoundVariants: [
      {
        variant: 'glass',
        shadow: 'none',
        className: 'shadow-none',
      },
      {
        variant: 'outline',
        border: 'none',
        className: 'border border-input',
      },
      {
        variant: 'ghost',
        border: ['default', 'sm', 'lg', 'xl'],
        className: 'border-transparent',
      },
      {
        interactive: true,
        disabled: true,
        className: 'cursor-not-allowed hover:shadow-none active:shadow-none',
      },
      {
        interactive: true,
        loading: true,
        className: 'cursor-wait hover:shadow-none active:shadow-none',
      },
      {
        selected: true,
        disabled: true,
        className: 'ring-0',
      },
    ],
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      radius: 'md',
      shadow: 'md',
      border: 'default',
      interactive: false,
      disabled: false,
      loading: false,
      selected: false,
      fullWidth: false,
    },
  }
); 