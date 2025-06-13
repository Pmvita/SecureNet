import type { Meta, StoryObj } from '@storybook/react';
import { Dropdown } from './Dropdown';
import { UserIcon, Cog6ToothIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Common/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible dropdown component with support for icons, disabled states, and custom positioning.',
      },
    },
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['bottom', 'top'],
      description: 'Position of the dropdown menu relative to the trigger',
    },
    alignment: {
      control: 'select', 
      options: ['start', 'center', 'end'],
      description: 'Alignment of the dropdown menu',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the dropdown is disabled',
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether the dropdown is in loading state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

// Sample dropdown items with proper icons
const sampleItems = [
  { id: '1', label: 'Profile', icon: UserIcon, onClick: () => console.log('Profile clicked') },
  { id: '2', label: 'Settings', icon: Cog6ToothIcon, onClick: () => console.log('Settings clicked') },
  { id: '3', label: 'Logout', onClick: () => console.log('Logout clicked') },
  { id: '4', label: 'Disabled Option', icon: LockClosedIcon, disabled: true, onClick: () => console.log('Disabled clicked') }
];

export const Default: Story = {
  args: {
    trigger: 'Select Option',
    items: sampleItems,
  },
};

export const WithIcons: Story = {
  args: {
    trigger: 'User Menu',
    items: sampleItems,
  },
};

export const Disabled: Story = {
  args: {
    trigger: 'Disabled Dropdown',
    items: sampleItems,
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    trigger: 'Loading...',
    items: sampleItems,
    isLoading: true,
  },
};

export const TopPosition: Story = {
  args: {
    trigger: 'Top Dropdown',
    items: sampleItems,
    position: 'top',
  },
};

export const RightAligned: Story = {
  args: {
    trigger: 'Right Aligned',
    items: sampleItems,
    alignment: 'end',
  },
};

export const LongList: Story = {
  args: {
    trigger: 'Long List',
    items: [
      ...sampleItems,
      { id: '5', label: 'Option 5', onClick: () => console.log('Option 5') },
      { id: '6', label: 'Option 6', onClick: () => console.log('Option 6') },
      { id: '7', label: 'Option 7', onClick: () => console.log('Option 7') },
      { id: '8', label: 'Option 8', onClick: () => console.log('Option 8') },
    ],
  },
};

export const CustomTrigger: Story = {
  args: {
    trigger: (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        padding: '8px 12px',
        background: '#3b82f6',
        color: 'white',
        borderRadius: '6px',
        cursor: 'pointer'
      }}>
        <UserIcon style={{ width: '16px', height: '16px' }} />
        Custom Trigger
      </div>
    ),
    items: [
      { id: '1', label: 'Profile', icon: UserIcon, onClick: () => console.log('Profile clicked') },
      { 
        id: '2', 
        label: 'Settings', 
        icon: Cog6ToothIcon,
        onClick: () => console.log('Settings clicked') 
      },
    ],
  },
}; 