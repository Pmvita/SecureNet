import React, { useState } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  arrow,
  useId
} from '@floating-ui/react';

interface TooltipProps {
  children: React.ReactElement;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  placement = 'top',
  delay = 300,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = React.useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift({ padding: 8 }),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const hover = useHover(context, { move: false, delay: { open: delay } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const headingId = useId();

  if (disabled) {
    return children;
  }

  return (
    <>
      {React.cloneElement(
        children,
        getReferenceProps({ ref: refs.setReference, ...children.props })
      )}
      <FloatingPortal>
        {isOpen && (
          <div
            className={`z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm transition-opacity duration-300 ${className}`}
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            id={headingId}
          >
            {content}
            <div
              ref={arrowRef}
              className="absolute bg-gray-900 w-2 h-2 rotate-45"
              style={{
                left: placement === 'left' ? '100%' : placement === 'right' ? '-4px' : '50%',
                top: placement === 'top' ? '100%' : placement === 'bottom' ? '-4px' : '50%',
                transform: placement === 'left' || placement === 'right' 
                  ? 'translateY(-50%) rotate(45deg)' 
                  : 'translateX(-50%) rotate(45deg)',
              }}
            />
          </div>
        )}
      </FloatingPortal>
    </>
  );
};

// Popover component for more complex content
interface PopoverProps {
  children: React.ReactElement;
  content: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'click' | 'hover';
  className?: string;
  disabled?: boolean;
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  placement = 'bottom',
  trigger = 'click',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const arrowRef = React.useRef(null);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({
        fallbackAxisSideDirection: "start",
      }),
      shift({ padding: 8 }),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  const hover = useHover(context, { 
    enabled: trigger === 'hover',
    move: false, 
    delay: { open: 100 } 
  });
  
  const focus = useFocus(context, { enabled: trigger === 'click' });
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const headingId = useId();

  if (disabled) {
    return children;
  }

  return (
    <>
      {React.cloneElement(
        children,
        getReferenceProps({ 
          ref: refs.setReference, 
          ...children.props,
          onClick: trigger === 'click' ? () => setIsOpen(!isOpen) : children.props.onClick
        })
      )}
      <FloatingPortal>
        {isOpen && (
          <div
            className={`z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm transition-opacity duration-300 ${className}`}
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            id={headingId}
          >
            {content}
            <div
              ref={arrowRef}
              className="absolute bg-white border-l border-t border-gray-200 w-2 h-2 rotate-45"
              style={{
                left: placement === 'left' ? '100%' : placement === 'right' ? '-4px' : '50%',
                top: placement === 'top' ? '100%' : placement === 'bottom' ? '-4px' : '50%',
                transform: placement === 'left' || placement === 'right' 
                  ? 'translateY(-50%) rotate(45deg)' 
                  : 'translateX(-50%) rotate(45deg)',
              }}
            />
          </div>
        )}
      </FloatingPortal>
    </>
  );
};

export default Tooltip; 