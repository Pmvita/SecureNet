import { cn } from '../lib/utils';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  tabClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  tabClassName,
  contentClassName,
  children,
}: TabsProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && onChange(tab.id)}
              className={cn(
                'group inline-flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium',
                tab.disabled
                  ? 'cursor-not-allowed border-transparent text-gray-500'
                  : activeTab === tab.id
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-400 hover:border-gray-600 hover:text-gray-300',
                tabClassName
              )}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              disabled={tab.disabled}
            >
              {tab.icon && (
                <span
                  className={cn('h-5 w-5', {
                    'text-primary-500': activeTab === tab.id,
                    'text-gray-400 group-hover:text-gray-300': activeTab !== tab.id,
                  })}
                >
                  {tab.icon}
                </span>
              )}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className={cn('mt-4', contentClassName)}>{children}</div>
    </div>
  );
}

export interface TabPanelProps {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ id, activeTab, children, className }: TabPanelProps) {
  if (id !== activeTab) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={className}
    >
      {children}
    </div>
  );
}

export interface TabListProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  tabClassName?: string;
}

export function TabList({
  tabs,
  activeTab,
  onChange,
  className,
  tabClassName,
}: TabListProps) {
  return (
    <div className={cn('flex space-x-4', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => !tab.disabled && onChange(tab.id)}
          className={cn(
            'group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            tab.disabled
              ? 'cursor-not-allowed text-gray-500'
              : activeTab === tab.id
              ? 'bg-primary-500/10 text-primary-500'
              : 'text-gray-400 hover:bg-gray-700 hover:text-gray-300',
            tabClassName
          )}
          disabled={tab.disabled}
        >
          {tab.icon && (
            <span
              className={cn('h-5 w-5', {
                'text-primary-500': activeTab === tab.id,
                'text-gray-400 group-hover:text-gray-300': activeTab !== tab.id,
              })}
            >
              {tab.icon}
            </span>
          )}
          {tab.label}
        </button>
      ))}
    </div>
  );
} 