import * as React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { Button } from '../';
import { HomeIcon } from '@heroicons/react/24/outline';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button data-testid="button">Click me</Button>);

    const button = screen.getByTestId('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(button).toHaveClass('h-10', 'px-4', 'py-2');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(button).not.toHaveAttribute('aria-busy');
  });

  it('renders with custom variant', () => {
    render(
      <Button variant="primary" data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveClass('bg-blue-600', 'text-white');
  });

  it('renders with custom size', () => {
    render(
      <Button size="lg" data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveClass('h-12', 'px-8', 'text-base');
  });

  it('renders as full width', () => {
    render(
      <Button fullWidth data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveClass('w-full');
  });

  it('renders as disabled', () => {
    render(
      <Button disabled data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('renders in loading state', () => {
    render(
      <Button isLoading data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveClass('text-transparent');
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders as a link', () => {
    render(
      <Button href="https://example.com" data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button.tagName).toBe('A');
    expect(button).toHaveAttribute('href', 'https://example.com');
  });

  it('renders as a router link', () => {
    render(
      <Button to="/dashboard" data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button.tagName).toBe('A');
    expect(button).toHaveAttribute('href', '/dashboard');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(
      <Button onClick={handleClick} data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not handle click events when disabled', () => {
    const handleClick = jest.fn();
    render(
      <Button disabled onClick={handleClick} data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with left icon', () => {
    render(
      <Button leftIcon={{ icon: HomeIcon }} data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-4', 'w-4');
    expect(icon?.parentElement).toHaveClass('mr-2');
  });

  it('renders with right icon', () => {
    render(
      <Button rightIcon={{ icon: HomeIcon }} data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('h-4', 'w-4');
    expect(icon?.parentElement).toHaveClass('ml-2');
  });

  it('renders with custom icon props', () => {
    render(
      <Button
        leftIcon={{
          icon: HomeIcon,
          iconProps: { className: 'custom-icon' },
        }}
        data-testid="button"
      >
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    const icon = button.querySelector('svg');
    expect(icon).toHaveClass('custom-icon');
  });

  it('renders with custom aria label', () => {
    render(
      <Button aria-label="Custom label" data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
  });

  it('uses children as aria label when no aria-label is provided', () => {
    render(
      <Button data-testid="button">
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('aria-label', 'Click me');
  });

  it('renders with custom type', () => {
    render(
      <Button type="submit" data-testid="button">
        Submit
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('renders with form attributes', () => {
    render(
      <Button
        form="test-form"
        formAction="/submit"
        formMethod="post"
        formEncType="multipart/form-data"
        formNoValidate
        formTarget="_blank"
        data-testid="button"
      >
        Submit
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('form', 'test-form');
    expect(button).toHaveAttribute('formAction', '/submit');
    expect(button).toHaveAttribute('formMethod', 'post');
    expect(button).toHaveAttribute('formEncType', 'multipart/form-data');
    expect(button).toHaveAttribute('formNoValidate', '');
    expect(button).toHaveAttribute('formTarget', '_blank');
  });

  it('renders with custom data attributes', () => {
    render(
      <Button
        data-testid="button"
        data-cy="submit-button"
        data-role="submit"
        data-variant="primary"
        data-size="lg"
        data-loading={false}
        data-disabled={false}
        data-full-width={false}
      >
        Click me
      </Button>
    );

    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('data-cy', 'submit-button');
    expect(button).toHaveAttribute('data-role', 'submit');
    expect(button).toHaveAttribute('data-variant', 'primary');
    expect(button).toHaveAttribute('data-size', 'lg');
    expect(button).toHaveAttribute('data-loading', 'false');
    expect(button).toHaveAttribute('data-disabled', 'false');
    expect(button).toHaveAttribute('data-full-width', 'false');
  });

  it('renders as a child component', () => {
    const CustomButton = React.forwardRef<
      HTMLButtonElement,
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >((props, ref) => (
      <button ref={ref} {...props} data-testid="custom-button" />
    ));
    CustomButton.displayName = 'CustomButton';

    render(
      <Button asChild>
        <CustomButton>Click me</CustomButton>
      </Button>
    );

    const button = screen.getByTestId('custom-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground');
  });
}); 