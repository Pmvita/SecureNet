// NavigationItem interface used across the application
// Note: icon is required as it's used in the DashboardLayout component
export interface NavigationItem {
  path: string;
  label: string;
  icon: string;  // Required for DashboardLayout navigation
  children?: NavigationItem[];
  disabled?: boolean;
  hidden?: boolean;
} 