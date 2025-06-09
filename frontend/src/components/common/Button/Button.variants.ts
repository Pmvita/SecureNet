import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800',
        info: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        subtle: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
        transparent: 'bg-transparent text-gray-900 hover:bg-gray-100 active:bg-gray-200',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        xl: 'h-14 rounded-md px-10 text-lg',
        '2xl': 'h-16 rounded-md px-12 text-xl',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
        'icon-xl': 'h-14 w-14',
      },
      fullWidth: {
        true: 'w-full',
      },
      isLoading: {
        true: 'relative text-transparent transition-none hover:text-transparent',
      },
      isDisabled: {
        true: 'opacity-50 cursor-not-allowed',
      },
    },
    compoundVariants: [
      {
        variant: 'outline',
        size: 'default',
        className: 'border-2',
      },
      {
        variant: 'outline',
        size: 'sm',
        className: 'border',
      },
      {
        variant: 'outline',
        size: 'lg',
        className: 'border-2',
      },
      {
        variant: 'outline',
        size: 'xl',
        className: 'border-2',
      },
      {
        variant: 'outline',
        size: '2xl',
        className: 'border-2',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
      isLoading: false,
      isDisabled: false,
    },
  }
); 