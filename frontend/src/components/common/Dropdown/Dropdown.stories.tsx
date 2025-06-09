import type { Meta, StoryObj } from '@storybook/react';
import { Dropdown } from './Dropdown';
import { Button } from '../Button';

const meta: Meta<typeof Dropdown> = {
  title: 'Common/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: 'Position of the dropdown relative to trigger'
    },
    alignment: {
      control: 'select',
      options: ['start', 'center', 'end'],
      description: 'Alignment of the dropdown relative to trigger'
    },
    triggerType: {
      control: 'select',
      options: ['click', 'hover'],
      description: 'How the dropdown is triggered'
    },
    showDividers: {
      control: 'boolean',
      description: 'Whether to show dividers between items'
    },
    closeOnSelect: {
      control: 'boolean',
      description: 'Whether to close the dropdown when an item is clicked'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the dropdown is disabled'
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether to show loading state'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

const defaultItems = [
  { id: '1', label: 'Profile', icon: '👤', onClick: () => console.log('Profile clicked') },
  { id: '2', label: 'Settings', icon: '⚙️', onClick: () => console.log('Settings clicked') },
  { id: '3', label: 'Logout', icon: '🚪', onClick: () => console.log('Logout clicked') }
];

export const Default: Story = {
  args: {
    trigger: <Button>Open Menu</Button>,
    items: defaultItems
  }
};

export const WithDividers: Story = {
  args: {
    ...Default.args,
    showDividers: true
  }
};

export const WithDisabledItem: Story = {
  args: {
    trigger: <Button>Open Menu</Button>,
    items: [
      ...defaultItems,
      { id: '4', label: 'Disabled Option', icon: '🔒', disabled: true, onClick: () => console.log('Disabled clicked') }
    ]
  }
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isLoading: true
  }
};

export const Empty: Story = {
  args: {
    ...Default.args,
    items: [],
    emptyText: 'No options available'
  }
};

export const HoverTrigger: Story = {
  args: {
    ...Default.args,
    triggerType: 'hover'
  }
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true
  }
};

export const TopPosition: Story = {
  args: {
    ...Default.args,
    position: 'top'
  }
};

export const RightPosition: Story = {
  args: {
    ...Default.args,
    position: 'right'
  }
};

export const CenterAligned: Story = {
  args: {
    ...Default.args,
    alignment: 'center'
  }
};

export const CustomStyling: Story = {
  args: {
    ...Default.args,
    className: 'custom-dropdown',
    menuClassName: 'custom-menu',
    itemClassName: 'custom-item'
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of custom styling using className props'
      }
    }
  }
};

export const WithNestedItems: Story = {
  args: {
    trigger: <Button>Open Menu</Button>,
    items: [
      { id: '1', label: 'Profile', icon: '👤', onClick: () => console.log('Profile clicked') },
      {
        id: '2',
        label: 'Settings',
        icon: '⚙️',
        children: [
          { id: '2-1', label: 'Account', onClick: () => console.log('Account clicked') },
          { id: '2-2', label: 'Security', onClick: () => console.log('Security clicked') },
          { id: '2-3', label: 'Notifications', onClick: () => console.log('Notifications clicked') }
        ]
      },
      { id: '3', label: 'Logout', icon: '🚪', onClick: () => console.log('Logout clicked') }
    ]
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of dropdown with nested menu items'
      }
    }
  }
}; 