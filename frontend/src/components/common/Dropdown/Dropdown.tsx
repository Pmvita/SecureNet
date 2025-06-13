import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DropdownProps, DropdownItem, DropdownPosition, DropdownAlignment } from './Dropdown.types';
import { LoadingSpinner } from '../LoadingSpinner';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * Dropdown component for displaying a menu of options
 * 
 * @example
 * ```tsx
 * <Dropdown
 *   trigger={<Button>Open Menu</Button>}
 *   items={[
 *     { id: '1', label: 'Option 1', onClick: () => {} },
 *     { id: '2', label: 'Option 2', icon: '🔒', onClick: () => {} }
 *   ]}
 * />
 * ```
 */
export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  isOpen: controlledIsOpen,
  onOpen,
  onClose,
  position = 'bottom',
  alignment = 'start',
  triggerType = 'click',
  showDividers = false,
  closeOnSelect = true,
  menuClassName,
  itemClassName,
  disabled = false,
  maxHeight = '300px',
  isLoading = false,
  emptyText = 'No options available',
  className,
  ...props
}) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleOpen = useCallback(() => {
    if (!isControlled) {
      setUncontrolledIsOpen(true);
    }
    onOpen?.();
  }, [isControlled, onOpen]);

  const handleClose = useCallback(() => {
    if (!isControlled) {
      setUncontrolledIsOpen(false);
    }
    onClose?.();
  }, [isControlled, onClose]);

  const handleItemClick = useCallback((item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick?.();
    if (closeOnSelect) {
      handleClose();
    }
  }, [closeOnSelect, handleClose]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node) &&
      triggerRef.current &&
      !triggerRef.current.contains(event.target as Node)
    ) {
      handleClose();
    }
  }, [handleClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    } else if (isOpen && event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const activeItem = items.find(item => !item.disabled);
      if (activeItem) {
        handleItemClick(activeItem);
      }
    }
  }, [handleClose, isOpen, items, handleItemClick]);

  const getPositionStyles = (): string => {
    const positions: Record<DropdownPosition, string> = {
      top: 'bottom-full mb-2',
      bottom: 'top-full mt-2',
      left: 'right-full mr-2',
      right: 'left-full ml-2'
    };
    return positions[position];
  };

  const getAlignmentStyles = (): string => {
    const alignments: Record<DropdownAlignment, string> = {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0'
    };
    return alignments[alignment];
  };

  const renderItem = (item: DropdownItem) => (
    <div
      key={item.id}
      role="menuitem"
      tabIndex={0}
      className={`dropdown-item ${item.disabled ? 'disabled' : ''}`}
      onClick={() => handleItemClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleItemClick(item);
        }
      }}
    >
      {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
      <span className={`dropdown-item-label ${itemClassName || ''}`}>{item.label}</span>
      {item.children && <span className="dropdown-item-arrow">›</span>}
    </div>
  );

  const renderIcon = (icon: string | React.ComponentType<{ className?: string }> | undefined) => {
    if (!icon) return null;
    
    if (typeof icon === 'string') {
      // Handle emoji strings
      return <span className="dropdown-icon-emoji">{icon}</span>;
    } else {
      // Handle React component icons
      return React.createElement(icon, { className: 'w-4 h-4' });
    }
  };

  return (
    <div
      className={`dropdown ${className || ''}`}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      {...props}
    >
      <div
        ref={triggerRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : handleOpen}
        onMouseEnter={triggerType === 'hover' ? handleOpen : undefined}
        onMouseLeave={triggerType === 'hover' ? handleClose : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-disabled={disabled}
      >
        <span>{trigger}</span>
        <ChevronDownIcon className={`dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </div>

      {isOpen && (
        <div
          role="menu"
          className={`dropdown-menu ${getPositionStyles()} ${getAlignmentStyles()} ${menuClassName || ''}`}
          style={{ maxHeight }}
        >
          {isLoading ? (
            <div className="dropdown-loading">
              <LoadingSpinner size="sm" />
            </div>
          ) : items.length === 0 ? (
            <div className="dropdown-empty">{emptyText}</div>
          ) : (
            items.map((item, index) => (
              <div key={item.id}>
                {renderItem(item)}
                {showDividers && index < items.length - 1 && (
                  <div className="dropdown-divider" />
                )}
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        .dropdown {
          position: relative;
          display: inline-block;
        }

        .dropdown-menu {
          position: absolute;
          z-index: 50;
          min-width: 200px;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          box-shadow: var(--shadow-lg);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          cursor: pointer;
          color: var(--text-primary);
          transition: background-color 0.2s ease;
        }

        .dropdown-item:hover:not(.disabled) {
          background-color: var(--bg-hover);
        }

        .dropdown-item:focus {
          outline: none;
          background-color: var(--bg-hover);
        }

        .dropdown-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropdown-item-icon {
          display: inline-flex;
          align-items: center;
          font-size: 1.125em;
        }

        .dropdown-item-label {
          flex: 1;
        }

        .dropdown-item-arrow {
          margin-left: 0.5rem;
          opacity: 0.5;
        }

        .dropdown-divider {
          height: 1px;
          background-color: var(--border-color);
          margin: 0.25rem 0;
        }

        .dropdown-loading,
        .dropdown-empty {
          padding: 1rem;
          text-align: center;
          color: var(--text-secondary);
        }

        .dropdown-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100px;
        }
      `}</style>
    </div>
  );
}; 