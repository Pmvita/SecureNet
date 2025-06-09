import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from './Dropdown';

const mockItems = [
  { id: '1', label: 'Option 1', onClick: jest.fn() },
  { id: '2', label: 'Option 2', icon: '🔒', onClick: jest.fn() },
  { id: '3', label: 'Option 3', disabled: true, onClick: jest.fn() }
];

describe('Dropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trigger element', () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
      />
    );
    expect(screen.getByText('Open Menu')).toBeInTheDocument();
  });

  it('opens dropdown on trigger click', async () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
      />
    );

    const trigger = screen.getByText('Open Menu');
    await userEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <Dropdown
          trigger={<button>Open Menu</button>}
          items={mockItems}
        />
        <button>Outside</button>
      </div>
    );

    // Open dropdown
    await userEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click outside
    await userEvent.click(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes dropdown when pressing Escape', async () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
      />
    );

    // Open dropdown
    await userEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Press Escape
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls onClick handler when clicking an item', async () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
      />
    );

    // Open dropdown
    await userEvent.click(screen.getByText('Open Menu'));

    // Click first item
    await userEvent.click(screen.getByText('Option 1'));
    expect(mockItems[0].onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick handler for disabled items', async () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
      />
    );

    // Open dropdown
    await userEvent.click(screen.getByText('Open Menu'));

    // Click disabled item
    await userEvent.click(screen.getByText('Option 3'));
    expect(mockItems[2].onClick).not.toHaveBeenCalled();
  });

  it('shows loading state', async () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
        isLoading
      />
    );

    // Open dropdown
    await userEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows empty state when no items', async () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={[]}
        emptyText="No items available"
      />
    );

    // Open dropdown
    await userEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByText('No items available')).toBeInTheDocument();
  });

  it('supports hover trigger type', async () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
        triggerType="hover"
      />
    );

    const trigger = screen.getByText('Open Menu');

    // Hover over trigger
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Move mouse away
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('supports controlled mode', async () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();

    const { rerender } = render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
        isOpen={false}
        onOpen={onOpen}
        onClose={onClose}
      />
    );

    // Click trigger when closed
    await userEvent.click(screen.getByText('Open Menu'));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Rerender with isOpen=true
    rerender(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
        isOpen={true}
        onOpen={onOpen}
        onClose={onClose}
      />
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click outside
    await userEvent.click(document.body);
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeInTheDocument(); // Still open because controlled
  });

  it('handles keyboard navigation', async () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
      />
    );

    // Open dropdown
    await userEvent.click(screen.getByText('Open Menu'));

    // Focus first item
    const firstItem = screen.getByText('Option 1');
    firstItem.focus();

    // Press Enter
    await userEvent.keyboard('{Enter}');
    expect(mockItems[0].onClick).toHaveBeenCalledTimes(1);

    // Press Space
    await userEvent.keyboard(' ');
    expect(mockItems[0].onClick).toHaveBeenCalledTimes(2);
  });

  it('renders with custom class names', async () => {
    render(
      <Dropdown
        trigger={<button>Open Menu</button>}
        items={mockItems}
        className="custom-dropdown"
        menuClassName="custom-menu"
        itemClassName="custom-item"
      />
    );

    // Open dropdown
    await userEvent.click(screen.getByText('Open Menu'));

    expect(screen.getByRole('menu').parentElement).toHaveClass('custom-dropdown');
    expect(screen.getByRole('menu')).toHaveClass('custom-menu');
    expect(screen.getByText('Option 1')).toHaveClass('custom-item');
  });
}); 