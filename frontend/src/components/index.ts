// Phase 1 Frontend Enhancements - Exports
export { AppErrorBoundary } from './error/AppErrorBoundary';
export { SecurityErrorBoundary } from './error/SecurityErrorBoundary';
export { ErrorFallback } from './error/ErrorFallback';

export { BaseTable } from './tables/BaseTable';
export { SecurityLogsTable } from './tables/SecurityLogsTable';

export { VirtualLogList, useVirtualLogs } from './virtual/VirtualLogList';

// Re-export existing components
export { Table, Pagination } from './Table';
export { default as Layout } from './Layout';
export { default as LoadingSpinner } from './LoadingSpinner';
export { Progress } from './Progress';
export { Switch } from './Switch';
export { Dropdown } from './Dropdown';
export { Tabs } from './Tabs'; 