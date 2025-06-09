import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';
import type { TabItem } from './Tabs.types';

const mockItems: TabItem[] = [
  {
    id: 'tab1',
    label: 'Tab 1',
    content: <div>Content 1</div>,
  },
  {
    id: 'tab2',
    label: 'Tab 2',
    content: <div>Content 2</div>,
    badge: {
      label: 'New',
      variant: 'info',
    },
  },
  {
    id: 'tab3',
    label: 'Tab 3',
    content: <div>Content 3</div>,
    disabled: true,
  },
];

describe('Tabs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders all tabs with correct labels', () => {
    render(<Tabs items={mockItems} />);
    
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 2 New' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
  });

  it('shows badge when provided', () => {
    render(<Tabs items={mockItems} />);
    
    const tabWithBadge = screen.getByRole('tab', { name: /Tab 2/ });
    expect(tabWithBadge).toHaveTextContent('New');
  });

  it('disables tab when disabled prop is true', () => {
    render(<Tabs items={mockItems} />);
    
    const disabledTab = screen.getByRole('tab', { name: 'Tab 3' });
    expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
    expect(disabledTab).toHaveClass('tab-button-disabled');
  });

  it('shows content of active tab', () => {
    render(<Tabs items={mockItems} />);
    
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('changes active tab when clicked', () => {
    render(<Tabs items={mockItems} />);
    
    fireEvent.click(screen.getByRole('tab', { name: 'Tab 2 New' }));
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('does not change active tab when disabled tab is clicked', () => {
    render(<Tabs items={mockItems} />);
    
    fireEvent.click(screen.getByRole('tab', { name: 'Tab 3' }));
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
  });

  it('works in controlled mode', () => {
    const onChange = jest.fn();
    render(<Tabs items={mockItems} activeTab="tab1" onChange={onChange} />);
    
    fireEvent.click(screen.getByRole('tab', { name: 'Tab 2 New' }));
    expect(onChange).toHaveBeenCalledWith('tab2');
    // Content should not change unless parent updates activeTab
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<Tabs items={mockItems} isLoading />);
    
    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveClass('tab-loading');
  });

  it('preserves content when preserveContent is true', () => {
    render(<Tabs items={mockItems} preserveContent />);
    
    // All content should be in the DOM
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.getByText('Content 3')).toBeInTheDocument();
    
    // But only active content should be visible
    expect(screen.getByText('Content 1')).toBeVisible();
    expect(screen.getByText('Content 2')).not.toBeVisible();
    expect(screen.getByText('Content 3')).not.toBeVisible();
  });

  it('applies correct ARIA attributes', () => {
    render(<Tabs items={mockItems} />);
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tabpanel = screen.getByRole('tabpanel');
    
    expect(tab1).toHaveAttribute('aria-selected', 'true');
    expect(tab1).toHaveAttribute('aria-controls', 'tabpanel-tab1');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-tab1');
  });

  it('supports keyboard navigation', () => {
    render(<Tabs items={mockItems} />);
    
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2 New' });
    const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
    
    // Focus first tab
    tab1.focus();
    expect(tab1).toHaveFocus();
    
    // Press arrow right
    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    expect(tab2).toHaveFocus();
    
    // Press arrow right (should skip disabled tab)
    fireEvent.keyDown(tab2, { key: 'ArrowRight' });
    expect(tab1).toHaveFocus();
    
    // Press arrow left
    fireEvent.keyDown(tab1, { key: 'ArrowLeft' });
    expect(tab2).toHaveFocus();
    
    // Press arrow left (should skip disabled tab)
    fireEvent.keyDown(tab2, { key: 'ArrowLeft' });
    expect(tab1).toHaveFocus();
    
    // Press Home
    fireEvent.keyDown(tab2, { key: 'Home' });
    expect(tab1).toHaveFocus();
    
    // Press End
    fireEvent.keyDown(tab1, { key: 'End' });
    expect(tab2).toHaveFocus();
  });

  it('applies custom class names', () => {
    render(
      <Tabs
        items={mockItems}
        className="custom-container"
        tabsClassName="custom-list"
        tabClassName="custom-tab"
        contentClassName="custom-panel"
      />
    );
    
    const tablist = screen.getByRole('tablist');
    const tabs = screen.getAllByRole('tab');
    const tabpanel = screen.getByRole('tabpanel');
    
    expect(tablist.parentElement).toHaveClass('custom-container');
    expect(tablist).toHaveClass('custom-list');
    expect(tabs[0]).toHaveClass('custom-tab');
    expect(tabpanel).toHaveClass('custom-panel');
  });

  it('renders with different variants', () => {
    const { rerender, container } = render(<Tabs items={mockItems} variant="enclosed" />);
    const styleElement = container.querySelector('style');
    expect(styleElement?.textContent).toContain('.tabs-list { border: 1px solid var(--border-color);');

    rerender(<Tabs items={mockItems} variant="soft-rounded" />);
    expect(styleElement?.textContent).toContain('.tab-button { border-radius: 9999px;');
  });

  it('renders with different positions', () => {
    const { rerender, container } = render(<Tabs items={mockItems} position="bottom" />);
    const styleElement = container.querySelector('style');
    expect(styleElement?.textContent).toContain('.tabs-container { flex-direction: column-reverse;');

    rerender(<Tabs items={mockItems} position="left" />);
    expect(styleElement?.textContent).toContain('.tabs-container { flex-direction: row;');
  });

  describe('Error handling', () => {
    it('throws error when items prop is not an array', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<Tabs items={null as any} />)).toThrow(
        'Tabs component requires a non-empty array of items'
      );
      consoleError.mockRestore();
    });

    it('throws error when items array is empty', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<Tabs items={[]} />)).toThrow(
        'Tabs component requires a non-empty array of items'
      );
      consoleError.mockRestore();
    });

    it('throws error when item IDs are not unique', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const itemsWithDuplicateIds = [
        { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
        { id: 'tab1', label: 'Tab 2', content: <div>Content 2</div> },
      ];
      expect(() => render(<Tabs items={itemsWithDuplicateIds} />)).toThrow(
        'Tabs component requires unique IDs for each item'
      );
      consoleError.mockRestore();
    });

    it('throws error when controlled activeTab does not match any item ID', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<Tabs items={mockItems} activeTab="nonexistent" />)).toThrow(
        'Controlled activeTab must match one of the item IDs'
      );
      consoleError.mockRestore();
    });

    it('renders error fallback when content throws error', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      const itemsWithError: TabItem[] = [
        {
          id: 'tab1',
          label: 'Tab 1',
          content: <ErrorComponent />,
        },
      ];

      render(<Tabs items={itemsWithError} />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to render tabs/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('maintains focus within tab list when using keyboard navigation', () => {
      render(<Tabs items={mockItems} />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2 New' });
      
      // Focus first tab
      tab1.focus();
      expect(tab1).toHaveFocus();
      
      // Press Tab key
      fireEvent.keyDown(tab1, { key: 'Tab' });
      expect(tab1).toHaveFocus(); // Should stay focused as it's the active tab
      
      // Press arrow right
      fireEvent.keyDown(tab1, { key: 'ArrowRight' });
      expect(tab2).toHaveFocus();
      
      // Press Tab key
      fireEvent.keyDown(tab2, { key: 'Tab' });
      expect(tab2).toHaveFocus(); // Should stay focused as it's now the active tab
    });

    it('skips disabled tabs during keyboard navigation', () => {
      render(<Tabs items={mockItems} />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2 New' });
      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      
      // Focus first tab
      tab1.focus();
      
      // Press arrow right twice (should skip disabled tab3)
      fireEvent.keyDown(tab1, { key: 'ArrowRight' });
      expect(tab2).toHaveFocus();
      
      fireEvent.keyDown(tab2, { key: 'ArrowRight' });
      expect(tab1).toHaveFocus(); // Should wrap back to first tab
      
      // Press arrow left (should skip disabled tab3)
      fireEvent.keyDown(tab1, { key: 'ArrowLeft' });
      expect(tab2).toHaveFocus();
    });

    it('announces tab changes to screen readers', () => {
      render(<Tabs items={mockItems} />);
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2 New' });
      const tabpanel = screen.getByRole('tabpanel');
      
      // Initial state
      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-tab1');
      
      // Change tab
      fireEvent.click(tab2);
      expect(tab2).toHaveAttribute('aria-selected', 'true');
      expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-tab2');
    });
  });
}); 