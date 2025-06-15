import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  category: 'navigation' | 'security' | 'system' | 'data';
  icon: React.ReactNode;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Define available commands
  const commands: Command[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      shortcut: '⌘D',
      category: 'navigation',
      action: () => navigate('/dashboard'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'nav-security',
      label: 'Go to Security',
      shortcut: '⌘S',
      category: 'navigation',
      action: () => navigate('/security'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'nav-network',
      label: 'Go to Network',
      shortcut: '⌘N',
      category: 'navigation',
      action: () => navigate('/network'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'nav-logs',
      label: 'Go to Logs',
      shortcut: '⌘L',
      category: 'navigation',
      action: () => navigate('/logs'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'nav-anomalies',
      label: 'Go to Anomalies',
      shortcut: '⌘A',
      category: 'navigation',
      action: () => navigate('/anomalies'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      shortcut: '⌘,',
      category: 'navigation',
      action: () => navigate('/settings'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    // Security Actions
    {
      id: 'security-scan',
      label: 'Run Security Scan',
      category: 'security',
      action: () => {
        // Simulate security scan
        alert('Security scan initiated...');
      },
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      id: 'security-block-ip',
      label: 'Block IP Address',
      category: 'security',
      action: () => {
        const ip = prompt('Enter IP address to block:');
        if (ip) {
          alert(`IP ${ip} has been blocked.`);
        }
      },
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
        </svg>
      )
    },
    {
      id: 'security-quarantine',
      label: 'Quarantine Device',
      category: 'security',
      action: () => {
        const device = prompt('Enter device ID to quarantine:');
        if (device) {
          alert(`Device ${device} has been quarantined.`);
        }
      },
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    // System Actions
    {
      id: 'system-refresh',
      label: 'Refresh Dashboard',
      shortcut: '⌘R',
      category: 'system',
      action: () => {
        window.location.reload();
      },
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    },
    {
      id: 'system-export',
      label: 'Export Data',
      category: 'data',
      action: () => {
        alert('Data export initiated...');
      },
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Handle command shortcuts when palette is closed
      if (!isOpen && (e.metaKey || e.ctrlKey)) {
        const command = commands.find(cmd => {
          if (!cmd.shortcut) return false;
          const key = cmd.shortcut.split('⌘')[1] || cmd.shortcut.split('Ctrl+')[1];
          return key && e.key.toLowerCase() === key.toLowerCase();
        });
        
        if (command) {
          e.preventDefault();
          command.action();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, commands]);

  // Clear search when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black bg-opacity-50">
      <div className="w-full max-w-lg mx-4">
        <Command 
          className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
          shouldFilter={false}
        >
          <div className="flex items-center border-b border-gray-200 px-3">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Command.Input
              placeholder="Type a command or search..."
              className="flex-1 py-3 px-1 text-sm outline-none placeholder-gray-400"
              value={search}
              onValueChange={setSearch}
            />
            <div className="text-xs text-gray-400 ml-2">ESC</div>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </Command.Empty>

            {/* Navigation Commands */}
            <Command.Group heading="Navigation" className="text-xs font-medium text-gray-500 px-2 py-1">
              {commands
                .filter(cmd => cmd.category === 'navigation')
                .filter(cmd => cmd.label.toLowerCase().includes(search.toLowerCase()))
                .map(cmd => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => {
                      cmd.action();
                      onClose();
                    }}
                    className="flex items-center px-2 py-2 text-sm rounded cursor-pointer hover:bg-blue-50 data-[selected=true]:bg-blue-50"
                  >
                    <div className="mr-2 text-gray-400">{cmd.icon}</div>
                    <span className="flex-1">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="text-xs text-gray-400 ml-2">{cmd.shortcut}</span>
                    )}
                  </Command.Item>
                ))}
            </Command.Group>

            {/* Security Commands */}
            <Command.Group heading="Security" className="text-xs font-medium text-gray-500 px-2 py-1">
              {commands
                .filter(cmd => cmd.category === 'security')
                .filter(cmd => cmd.label.toLowerCase().includes(search.toLowerCase()))
                .map(cmd => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => {
                      cmd.action();
                      onClose();
                    }}
                    className="flex items-center px-2 py-2 text-sm rounded cursor-pointer hover:bg-red-50 data-[selected=true]:bg-red-50"
                  >
                    <div className="mr-2 text-gray-400">{cmd.icon}</div>
                    <span className="flex-1">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="text-xs text-gray-400 ml-2">{cmd.shortcut}</span>
                    )}
                  </Command.Item>
                ))}
            </Command.Group>

            {/* System Commands */}
            <Command.Group heading="System" className="text-xs font-medium text-gray-500 px-2 py-1">
              {commands
                .filter(cmd => cmd.category === 'system' || cmd.category === 'data')
                .filter(cmd => cmd.label.toLowerCase().includes(search.toLowerCase()))
                .map(cmd => (
                  <Command.Item
                    key={cmd.id}
                    value={cmd.label}
                    onSelect={() => {
                      cmd.action();
                      onClose();
                    }}
                    className="flex items-center px-2 py-2 text-sm rounded cursor-pointer hover:bg-green-50 data-[selected=true]:bg-green-50"
                  >
                    <div className="mr-2 text-gray-400">{cmd.icon}</div>
                    <span className="flex-1">{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="text-xs text-gray-400 ml-2">{cmd.shortcut}</span>
                    )}
                  </Command.Item>
                ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};

export default CommandPalette; 