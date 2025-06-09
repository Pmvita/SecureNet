import { useEffect, useRef, useCallback } from 'react';

type ClickOutsideHandler = (event: MouseEvent) => void;

/**
 * Hook that handles clicks outside a specified element
 * 
 * @param handler - Function to call when a click outside occurs
 * @param enabled - Whether the hook is enabled
 * @returns A ref to attach to the element to monitor
 * 
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const ref = useClickOutside(() => {
 *     console.log('Clicked outside!');
 *   });
 * 
 *   return <div ref={ref}>Click outside me</div>;
 * };
 * ```
 */
export const useClickOutside = (handler: ClickOutsideHandler, enabled = true) => {
  const ref = useRef<HTMLElement>(null);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler(event);
      }
    },
    [handler]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [enabled, handleClickOutside]);

  return ref;
}; 