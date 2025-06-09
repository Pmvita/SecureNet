import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  const defaultProps = {
    content: 'Tooltip content',
    children: <button>Hover me</button>,
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders trigger element', () => {
    render(<Tooltip {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
  });

  it('shows tooltip on hover', async () => {
    render(<Tooltip {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await userEvent.hover(trigger);
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Tooltip content')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', async () => {
    render(<Tooltip {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await userEvent.hover(trigger);
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await userEvent.unhover(trigger);
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on click when click prop is true', async () => {
    render(<Tooltip {...defaultProps} click />);
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await userEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await userEvent.click(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on focus when focus prop is true', async () => {
    render(<Tooltip {...defaultProps} focus />);
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await userEvent.tab();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await userEvent.tab();
    expect(trigger).not.toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('applies custom class names', () => {
    render(
      <Tooltip
        {...defaultProps}
        className="custom-tooltip"
        contentClassName="custom-content"
      />
    );
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    fireEvent.mouseEnter(trigger);
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('custom-tooltip');
    expect(tooltip.firstChild).toHaveClass('custom-content');
  });

  it('renders with different variants', () => {
    const variants = ['dark', 'light', 'primary', 'success', 'warning', 'error'] as const;

    variants.forEach((variant) => {
      const { unmount } = render(
        <Tooltip {...defaultProps} variant={variant} />
      );
      const trigger = screen.getByRole('button', { name: 'Hover me' });

      fireEvent.mouseEnter(trigger);
      act(() => {
        jest.advanceTimersByTime(0);
      });

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass(`tooltip-${variant}`);

      unmount();
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const { unmount } = render(
        <Tooltip {...defaultProps} size={size} />
      );
      const trigger = screen.getByRole('button', { name: 'Hover me' });

      fireEvent.mouseEnter(trigger);
      act(() => {
        jest.advanceTimersByTime(0);
      });

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveClass(`tooltip-${size}`);

      unmount();
    });
  });

  it('respects delay prop', async () => {
    const delay = 500;
    render(<Tooltip {...defaultProps} delay={delay} />);
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await userEvent.hover(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(delay);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('handles controlled mode', () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const { rerender } = render(
      <Tooltip
        {...defaultProps}
        controlled
        open={false}
        onOpen={onOpen}
        onClose={onClose}
      />
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    rerender(
      <Tooltip
        {...defaultProps}
        controlled
        open={true}
        onOpen={onOpen}
        onClose={onClose}
      />
    );

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('does not show tooltip when disabled', async () => {
    render(<Tooltip {...defaultProps} disabled />);
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await userEvent.hover(trigger);
    act(() => {
      jest.advanceTimersByTime(0);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip immediately when immediate prop is true', async () => {
    render(<Tooltip {...defaultProps} immediate />);
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await userEvent.hover(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('renders with arrow when arrow prop is true', async () => {
    render(<Tooltip {...defaultProps} arrow />);
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await userEvent.hover(trigger);
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.querySelector('[data-popper-arrow]')).toBeInTheDocument();
  });

  it('does not render arrow when arrow prop is false', async () => {
    render(<Tooltip {...defaultProps} arrow={false} />);
    const trigger = screen.getByRole('button', { name: 'Hover me' });

    await userEvent.hover(trigger);
    act(() => {
      jest.advanceTimersByTime(0);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.querySelector('[data-popper-arrow]')).not.toBeInTheDocument();
  });
}); 