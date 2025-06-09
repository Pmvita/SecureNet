import * as React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { Input } from '../';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input data-testid="input" />);

    const input = screen.getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('w-full', 'rounded-lg', 'border');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).not.toBeDisabled();
    expect(input).not.toBeRequired();
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('renders with label', () => {
    render(<Input label="Username" data-testid="input" />);

    const label = screen.getByText('Username');
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass('font-medium', 'text-gray-200');
  });

  it('renders with description', () => {
    render(
      <Input
        label="Username"
        description="Enter your username"
        data-testid="input"
      />
    );

    const description = screen.getByText('Enter your username');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-sm', 'text-gray-400');
  });

  it('renders with error message', () => {
    render(
      <Input
        label="Username"
        error="Username is required"
        data-testid="input"
      />
    );

    const error = screen.getByText('Username is required');
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass('text-sm', 'text-red-500');
    expect(screen.getByTestId('input')).toHaveClass('border-red-500');
  });

  it('renders with required indicator', () => {
    render(<Input label="Username" required data-testid="input" />);

    const requiredIndicator = screen.getByText('*');
    expect(requiredIndicator).toBeInTheDocument();
    expect(requiredIndicator).toHaveClass('text-red-500');
  });

  it('renders with custom size', () => {
    render(<Input size="lg" data-testid="input" />);

    const input = screen.getByTestId('input');
    expect(input).toHaveClass('px-4', 'py-2.5', 'text-lg');
  });

  it('renders as disabled', () => {
    render(<Input disabled data-testid="input" />);

    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('cursor-not-allowed', 'opacity-50');
  });

  it('renders as read-only', () => {
    render(<Input readOnly data-testid="input" />);

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('readOnly');
    expect(input).toHaveClass('cursor-default');
  });

  it('renders with start icon', () => {
    render(
      <Input
        startIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
        data-testid="input"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveClass('pl-10');
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('renders with end icon', () => {
    render(
      <Input
        endIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
        data-testid="input"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveClass('pr-10');
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('renders with clearable button when value is present', () => {
    render(<Input clearable defaultValue="test" data-testid="input" />);

    const clearButton = screen.getByRole('button', { name: 'Clear input' });
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toHaveClass('rounded-full', 'p-1');
  });

  it('clears input value when clear button is clicked', () => {
    render(<Input clearable defaultValue="test" data-testid="input" />);

    const input = screen.getByTestId('input');
    const clearButton = screen.getByRole('button', { name: 'Clear input' });

    expect(input).toHaveValue('test');
    fireEvent.click(clearButton);
    expect(input).toHaveValue('');
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} data-testid="input" />);

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('new value');
  });

  it('renders with custom type', () => {
    render(<Input type="email" data-testid="input" />);

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders with custom placeholder', () => {
    render(<Input placeholder="Enter your email" data-testid="input" />);

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('placeholder', 'Enter your email');
  });

  it('renders with custom aria attributes', () => {
    render(
      <Input
        aria-label="Custom label"
        aria-describedby="custom-description"
        data-testid="input"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('aria-label', 'Custom label');
    expect(input).toHaveAttribute('aria-describedby', 'custom-description');
  });

  it('renders with custom class names', () => {
    render(
      <Input
        className="custom-wrapper"
        labelClassName="custom-label"
        descriptionClassName="custom-description"
        errorClassName="custom-error"
        inputClassName="custom-input"
        wrapperClassName="custom-container"
        labelWrapperClassName="custom-label-wrapper"
        descriptionWrapperClassName="custom-description-wrapper"
        errorWrapperClassName="custom-error-wrapper"
        iconWrapperClassName="custom-icon-wrapper"
        startIconClassName="custom-start-icon"
        endIconClassName="custom-end-icon"
        clearClassName="custom-clear"
        clearWrapperClassName="custom-clear-wrapper"
        clearIconClassName="custom-clear-icon"
        data-testid="input"
      />
    );

    const input = screen.getByTestId('input');
    expect(input.parentElement?.parentElement).toHaveClass('custom-container');
    expect(input).toHaveClass('custom-input');
  });

  it('renders with custom id and name', () => {
    render(<Input id="custom-id" name="custom-name" data-testid="input" />);

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('id', 'custom-id');
    expect(input).toHaveAttribute('name', 'custom-name');
  });

  it('renders with form attributes', () => {
    render(
      <Input
        form="test-form"
        formAction="/submit"
        formMethod="post"
        formEncType="multipart/form-data"
        formNoValidate
        formTarget="_blank"
        data-testid="input"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('form', 'test-form');
    expect(input).toHaveAttribute('formAction', '/submit');
    expect(input).toHaveAttribute('formMethod', 'post');
    expect(input).toHaveAttribute('formEncType', 'multipart/form-data');
    expect(input).toHaveAttribute('formNoValidate', '');
    expect(input).toHaveAttribute('formTarget', '_blank');
  });

  it('renders with min and max attributes for number type', () => {
    render(
      <Input
        type="number"
        min={0}
        max={100}
        step={1}
        data-testid="input"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '100');
    expect(input).toHaveAttribute('step', '1');
  });

  it('renders with pattern attribute for validation', () => {
    render(
      <Input
        pattern="[A-Za-z]{3}"
        title="Three letter code"
        data-testid="input"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('pattern', '[A-Za-z]{3}');
    expect(input).toHaveAttribute('title', 'Three letter code');
  });

  it('renders with autocomplete attribute', () => {
    render(
      <Input
        autoComplete="email"
        data-testid="input"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('renders with spellcheck attribute', () => {
    render(
      <Input
        spellCheck={false}
        data-testid="input"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('spellcheck', 'false');
  });

  it('renders with custom data attributes', () => {
    render(
      <Input
        data-testid="input"
        data-cy="email-input"
        data-role="email"
        data-type="email"
        data-required="true"
        data-disabled="false"
        data-readonly="false"
      />
    );

    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('data-cy', 'email-input');
    expect(input).toHaveAttribute('data-role', 'email');
    expect(input).toHaveAttribute('data-type', 'email');
    expect(input).toHaveAttribute('data-required', 'true');
    expect(input).toHaveAttribute('data-disabled', 'false');
    expect(input).toHaveAttribute('data-readonly', 'false');
  });
}); 