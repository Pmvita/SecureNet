import { LinkProps } from 'react-router-dom';
import { VariantProps } from 'class-variance-authority';
import { buttonVariants } from './Button.variants';

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export type IconProps = {
  /**
   * The icon component to render
   */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /**
   * Additional props to pass to the icon
   */
  iconProps?: React.SVGProps<SVGSVGElement>;
};

export type ButtonBaseProps = {
  /**
   * Whether to render as a child component
   * @default false
   */
  asChild?: boolean;

  /**
   * Whether the button is in a loading state
   * @default false
   */
  isLoading?: boolean;

  /**
   * Icon to display on the left side of the button
   */
  leftIcon?: React.ReactNode | IconProps;

  /**
   * Icon to display on the right side of the button
   */
  rightIcon?: React.ReactNode | IconProps;

  /**
   * Custom class name for the button
   */
  className?: string;

  /**
   * The content of the button
   */
  children?: React.ReactNode;

  /**
   * Whether the button is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether the button should take up the full width of its container
   * @default false
   */
  fullWidth?: boolean;

  /**
   * The type of the button
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';

  /**
   * The name of the button, used for form submission
   */
  name?: string;

  /**
   * The value of the button, used for form submission
   */
  value?: string;

  /**
   * The form that the button is associated with
   */
  form?: string;

  /**
   * The form action to perform when the button is clicked
   */
  formAction?: string;

  /**
   * The form method to use when the button is clicked
   */
  formMethod?: 'get' | 'post';

  /**
   * The form encoding type to use when the button is clicked
   */
  formEncType?: string;

  /**
   * Whether the form should be validated before submission
   */
  formNoValidate?: boolean;

  /**
   * The target of the form submission
   */
  formTarget?: string;

  /**
   * The ARIA label for the button
   */
  'aria-label'?: string;

  /**
   * The ARIA described by for the button
   */
  'aria-describedby'?: string;

  /**
   * The ARIA controls for the button
   */
  'aria-controls'?: string;

  /**
   * The ARIA expanded state for the button
   */
  'aria-expanded'?: boolean;

  /**
   * The ARIA pressed state for the button
   */
  'aria-pressed'?: boolean;

  /**
   * The ARIA has popup for the button
   */
  'aria-haspopup'?: boolean;

  /**
   * The ARIA current for the button
   */
  'aria-current'?: boolean;

  /**
   * The ARIA live region for the button
   */
  'aria-live'?: 'off' | 'polite' | 'assertive';

  /**
   * The ARIA atomic for the button
   */
  'aria-atomic'?: boolean;

  /**
   * The ARIA relevant for the button
   */
  'aria-relevant'?: 'additions' | 'additions removals' | 'additions text' | 'all' | 'removals' | 'removals additions' | 'removals text' | 'text' | 'text additions' | 'text removals';

  /**
   * The ARIA busy for the button
   */
  'aria-busy'?: boolean;

  /**
   * The ARIA disabled for the button
   */
  'aria-disabled'?: boolean;

  /**
   * The ARIA hidden for the button
   */
  'aria-hidden'?: boolean;

  /**
   * The ARIA invalid for the button
   */
  'aria-invalid'?: boolean;

  /**
   * The ARIA required for the button
   */
  'aria-required'?: boolean;

  /**
   * The ARIA selected for the button
   */
  'aria-selected'?: boolean;

  /**
   * The ARIA sort for the button
   */
  'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';

  /**
   * The ARIA checked for the button
   */
  'aria-checked'?: boolean;

  /**
   * The ARIA level for the button
   */
  'aria-level'?: number;

  /**
   * The ARIA posinset for the button
   */
  'aria-posinset'?: number;

  /**
   * The ARIA setsize for the button
   */
  'aria-setsize'?: number;

  /**
   * The ARIA valuemin for the button
   */
  'aria-valuemin'?: number;

  /**
   * The ARIA valuemax for the button
   */
  'aria-valuemax'?: number;

  /**
   * The ARIA valuenow for the button
   */
  'aria-valuenow'?: number;

  /**
   * The ARIA valuetext for the button
   */
  'aria-valuetext'?: string;

  /**
   * The ARIA orientation for the button
   */
  'aria-orientation'?: 'horizontal' | 'vertical';

  /**
   * The ARIA multiselectable for the button
   */
  'aria-multiselectable'?: boolean;

  /**
   * The ARIA readonly for the button
   */
  'aria-readonly'?: boolean;

  /**
   * The ARIA placeholder for the button
   */
  'aria-placeholder'?: string;

  /**
   * The ARIA role for the button
   */
  role?: string;

  /**
   * The tab index for the button
   */
  tabIndex?: number;

  /**
   * The data test id for the button
   */
  'data-testid'?: string;

  /**
   * The data cy for the button (for Cypress testing)
   */
  'data-cy'?: string;

  /**
   * The data role for the button (for testing)
   */
  'data-role'?: string;

  /**
   * The data variant for the button (for testing)
   */
  'data-variant'?: ButtonVariant;

  /**
   * The data size for the button (for testing)
   */
  'data-size'?: ButtonSize;

  /**
   * The data loading for the button (for testing)
   */
  'data-loading'?: boolean;

  /**
   * The data disabled for the button (for testing)
   */
  'data-disabled'?: boolean;

  /**
   * The data full width for the button (for testing)
   */
  'data-full-width'?: boolean;
} & VariantProps<typeof buttonVariants>;

export type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    asChild?: false;
    href?: never;
    to?: never;
  };

export type ButtonAsLink = ButtonBaseProps &
  Omit<LinkProps, keyof ButtonBaseProps> & {
    asChild?: false;
    href?: never;
    to: string | { pathname: string; search?: string; hash?: string };
  };

export type ButtonAsAnchor = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    asChild?: false;
    href: string;
    to?: never;
  };

export type ButtonAsChild = ButtonBaseProps & {
  asChild: true;
  href?: never;
  to?: never;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor | ButtonAsChild; 