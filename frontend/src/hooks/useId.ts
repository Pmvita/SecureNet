import { useId as useReactId } from 'react';

let idCounter = 0;

export const useId = (prefix: string): string => {
  const reactId = useReactId();
  const uniqueId = `${prefix}-${reactId}-${idCounter++}`;
  return uniqueId;
}; 