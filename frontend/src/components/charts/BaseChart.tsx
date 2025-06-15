import React from 'react';

// Define Theme type for nivo charts
interface Theme {
  background?: string;
  text?: {
    fontSize?: number;
    fill?: string;
    outlineWidth?: number;
    outlineColor?: string;
  };
  axis?: {
    domain?: {
      line?: {
        stroke?: string;
        strokeWidth?: number;
      };
    };
    legend?: {
      text?: {
        fontSize?: number;
        fill?: string;
      };
    };
    ticks?: {
      line?: {
        stroke?: string;
        strokeWidth?: number;
      };
      text?: {
        fontSize?: number;
        fill?: string;
      };
    };
  };
  grid?: {
    line?: {
      stroke?: string;
      strokeWidth?: number;
    };
  };
  legends?: {
    title?: {
      text?: {
        fontSize?: number;
        fill?: string;
      };
    };
    text?: {
      fontSize?: number;
      fill?: string;
    };
    ticks?: {
      line?: Record<string, unknown>;
      text?: {
        fontSize?: number;
        fill?: string;
      };
    };
  };
  annotations?: {
    text?: {
      fontSize?: number;
      fill?: string;
      outlineWidth?: number;
      outlineColor?: string;
      outlineOpacity?: number;
    };
    link?: {
      stroke?: string;
      strokeWidth?: number;
      outlineWidth?: number;
      outlineColor?: string;
      outlineOpacity?: number;
    };
    outline?: {
      stroke?: string;
      strokeWidth?: number;
      outlineWidth?: number;
      outlineColor?: string;
      outlineOpacity?: number;
    };
    symbol?: {
      fill?: string;
      outlineWidth?: number;
      outlineColor?: string;
      outlineOpacity?: number;
    };
  };
  tooltip?: {
    container?: {
      background?: string;
      color?: string;
      fontSize?: number;
      borderRadius?: string;
      boxShadow?: string;
      border?: string;
      padding?: string;
    };
  };
}

// SecureNet dark theme for all charts
export const secureNetTheme: Theme = {
  background: 'transparent',
  text: {
    fontSize: 11,
    fill: '#d1d5db', // Light gray text for dark theme
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  axis: {
    domain: {
      line: {
        stroke: '#4b5563', // Darker gray for axis lines
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fontSize: 12,
        fill: '#e5e7eb', // Light text for legends
      },
    },
    ticks: {
      line: {
        stroke: '#4b5563', // Darker gray for tick lines
        strokeWidth: 1,
      },
      text: {
        fontSize: 11,
        fill: '#9ca3af', // Medium gray for tick text
      },
    },
  },
  grid: {
    line: {
      stroke: '#374151', // Dark gray grid lines
      strokeWidth: 1,
    },
  },
  legends: {
    title: {
      text: {
        fontSize: 11,
        fill: '#e5e7eb', // Light text for legend titles
      },
    },
    text: {
      fontSize: 11,
      fill: '#d1d5db', // Light text for legend items
    },
    ticks: {
      line: {},
      text: {
        fontSize: 10,
        fill: '#d1d5db', // Light text for legend ticks
      },
    },
  },
  annotations: {
    text: {
      fontSize: 13,
      fill: '#e5e7eb', // Light text for annotations
      outlineWidth: 2,
      outlineColor: '#1f2937', // Dark outline
      outlineOpacity: 1,
    },
    link: {
      stroke: '#e5e7eb', // Light stroke for links
      strokeWidth: 1,
      outlineWidth: 2,
      outlineColor: '#1f2937', // Dark outline
      outlineOpacity: 1,
    },
    outline: {
      stroke: '#e5e7eb', // Light outline
      strokeWidth: 2,
      outlineWidth: 2,
      outlineColor: '#1f2937', // Dark background
      outlineOpacity: 1,
    },
    symbol: {
      fill: '#e5e7eb', // Light fill for symbols
      outlineWidth: 2,
      outlineColor: '#1f2937', // Dark outline
      outlineOpacity: 1,
    },
  },
  tooltip: {
    container: {
      background: '#1f2937', // Dark background for tooltips
      color: '#e5e7eb', // Light text for tooltips
      fontSize: 12,
      borderRadius: '6px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
      border: '1px solid #374151', // Dark border
      padding: '8px 12px',
    },
  },
};

// Security-focused color schemes
export const securityColorSchemes = {
  threat: ['#dc2626', '#ea580c', '#f59e0b', '#84cc16', '#22c55e'], // Red to Green (High to Low risk)
  severity: ['#7f1d1d', '#dc2626', '#f97316', '#fbbf24'], // Critical, High, Medium, Low
  status: ['#22c55e', '#f59e0b', '#dc2626'], // Good, Warning, Critical
  categorical: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'], // Blue, Purple, Cyan, Green, Orange, Red
};

interface BaseChartProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
}

export const BaseChart: React.FC<BaseChartProps> = ({
  children,
  height = 400,
  className = '',
  title,
  subtitle,
  loading = false,
  error
}) => {
  if (loading) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-6 ${className}`}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          </div>
        )}
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900 border border-gray-700 rounded-lg p-6 ${className}`}>
        {title && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          </div>
        )}
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="text-red-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg p-6 ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      <div style={{ height }}>
        {children}
      </div>
    </div>
  );
};

export default BaseChart; 