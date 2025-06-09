import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePopper } from 'react-popper';
import { TooltipProps } from './Tooltip.types';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useDebounce } from '../../hooks/useDebounce';
import { useId } from '../../hooks/useId';
import styles from './Tooltip.module.css';
import { cn } from '@/lib/utils';
import type { TooltipPosition } from './Tooltip.types';
import { sideClasses, alignClasses } from './Tooltip.types';

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delay = 200,
  className,
  contentClassName,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number>();

  useEffect(() => {
    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return;

      const trigger = triggerRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current.getBoundingClientRect();

      let x = 0;
      let y = 0;

      switch (side) {
        case 'top':
          x = trigger.left + trigger.width / 2;
          y = trigger.top;
          break;
        case 'right':
          x = trigger.right;
          y = trigger.top + trigger.height / 2;
          break;
        case 'bottom':
          x = trigger.left + trigger.width / 2;
          y = trigger.bottom;
          break;
        case 'left':
          x = trigger.left;
          y = trigger.top + trigger.height / 2;
          break;
      }

      setPosition({ x, y });
    };

    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, side]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <div
      ref={triggerRef}
      className={cn('inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            'fixed z-50 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white shadow-lg',
            sideClasses[side],
            alignClasses[align],
            'animate-in fade-in-0 zoom-in-95',
            contentClassName
          )}
          style={{
            left: position.x,
            top: position.y,
          }}
          role="tooltip"
        >
          {content}
          <div
            className={cn(
              'absolute h-2 w-2 rotate-45 bg-gray-900',
              side === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
              side === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2',
              side === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
              side === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2'
            )}
          />
        </div>
      )}
    </div>
  );
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  variant = 'dark',
  size = 'md',
  disabled = false,
  className = '',
  contentClassName = '',
  delay = 0,
  immediate = false,
  hover = true,
  click = false,
  focus = true,
  interactive = true,
  offset = 8,
  zIndex = 1000,
  arrow = true,
  animate = true,
  animationDuration = 200,
  preventOverflow = true,
  flip = true,
  shift = true,
  padding = '8px 12px',
  maxWidth = '300px',
  maxHeight = 'none',
  defaultOpen = false,
  controlled = false,
  open: controlledOpen,
  onOpen,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const [tooltipElement, setTooltipElement] = useState<HTMLElement | null>(null);
  const [arrowElement, setArrowElement] = useState<HTMLElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipId = useId('tooltip');
  const triggerId = useId('tooltip-trigger');

  const open = controlled ? controlledOpen : isOpen;

  const { styles: popperStyles, attributes, update } = usePopper(triggerElement, tooltipElement, {
    placement: position,
    modifiers: [
      {
        name: 'offset',
        options: {
          offset: [0, offset],
        },
      },
      {
        name: 'arrow',
        options: {
          element: arrowElement,
        },
      },
      {
        name: 'flip',
        enabled: flip,
      },
      {
        name: 'preventOverflow',
        enabled: preventOverflow,
        options: {
          padding: 8,
        },
      },
      {
        name: 'shift',
        enabled: shift,
      },
    ],
  });

  const debouncedSetOpen = useDebounce((value: boolean) => {
    if (controlled) {
      if (value) onOpen?.();
      else onClose?.();
    } else {
      setIsOpen(value);
      if (value) onOpen?.();
      else onClose?.();
    }
  }, delay);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    if (immediate) {
      debouncedSetOpen(true);
    } else {
      timeoutRef.current = setTimeout(() => {
        debouncedSetOpen(true);
      }, delay);
    }
  }, [disabled, immediate, delay, debouncedSetOpen]);

  const handleClose = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    debouncedSetOpen(false);
  }, [debouncedSetOpen]);

  useClickOutside(tooltipElement, () => {
    if (click && !interactive) {
      handleClose();
    }
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open && update) {
      update();
    }
  }, [open, update]);

  const handleMouseEnter = () => {
    if (hover) handleOpen();
  };

  const handleMouseLeave = () => {
    if (hover && !interactive) handleClose();
  };

  const handleClick = () => {
    if (click) {
      if (open) handleClose();
      else handleOpen();
    }
  };

  const handleFocus = () => {
    if (focus) handleOpen();
  };

  const handleBlur = () => {
    if (focus) handleClose();
  };

  const triggerProps = {
    ref: setTriggerElement,
    id: triggerId,
    'aria-describedby': open ? tooltipId : undefined,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };

  const tooltipContent = (
    <div
      id={tooltipId}
      role="tooltip"
      ref={setTooltipElement}
      className={`${styles.tooltip} ${styles[`tooltip-${variant}`]} ${styles[`tooltip-${size}`]} ${
        interactive ? styles['tooltip-interactive'] : ''
      } ${className}`}
      style={{
        ...popperStyles.popper,
        zIndex,
        padding,
        maxWidth,
        maxHeight,
        opacity: open ? 1 : 0,
        transition: animate ? `opacity ${animationDuration}ms ease-in-out` : 'none',
      }}
      {...attributes.popper}
    >
      <div className={`${styles['tooltip-content']} ${contentClassName}`}>{content}</div>
      {arrow && (
        <div
          ref={setArrowElement}
          className={styles['tooltip-arrow']}
          style={popperStyles.arrow}
          data-popper-arrow
        />
      )}
    </div>
  );

  return (
    <>
      {React.cloneElement(children, triggerProps)}
      {open && createPortal(tooltipContent, document.body)}
    </>
  );
}; 