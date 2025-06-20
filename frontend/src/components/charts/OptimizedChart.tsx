import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { optimizeChartData, createIntersectionObserver } from '../../utils/performance';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface OptimizedChartProps {
  type: 'line' | 'bar' | 'doughnut';
  data: ChartData<any>;
  options?: ChartOptions<any>;
  maxDataPoints?: number;
  height?: number;
  width?: number;
  className?: string;
  enableLazyLoading?: boolean;
  onDataPointClick?: (dataPoint: any, index: number) => void;
}

const OptimizedChart: React.FC<OptimizedChartProps> = ({
  type,
  data,
  options = {},
  maxDataPoints = 1000,
  height = 400,
  width,
  className = '',
  enableLazyLoading = true,
  onDataPointClick
}) => {
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!enableLazyLoading);
  const [isLoading, setIsLoading] = useState(enableLazyLoading);

  // Optimize data for performance
  const optimizedData = useMemo(() => {
    if (!data.datasets || data.datasets.length === 0) return data;

    const optimized = { ...data };
    
    // Optimize datasets with large amounts of data
    optimized.datasets = data.datasets.map(dataset => {
      if (dataset.data && Array.isArray(dataset.data) && dataset.data.length > maxDataPoints) {
        return {
          ...dataset,
          data: optimizeChartData(dataset.data, maxDataPoints)
        };
      }
      return dataset;
    });

    // Optimize labels if they exist and are too long
    if (data.labels && Array.isArray(data.labels) && data.labels.length > maxDataPoints) {
      optimized.labels = optimizeChartData(data.labels, maxDataPoints);
    }

    return optimized;
  }, [data, maxDataPoints]);

  // Performance-optimized options
  const performanceOptions = useMemo((): ChartOptions<any> => {
    const baseOptions: ChartOptions<any> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: isVisible ? 750 : 0 // Disable animation if not visible
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          // Optimize tooltip performance
          filter: (tooltipItem) => {
            // Only show tooltip for visible points
            return tooltipItem.parsed !== null;
          }
        }
      },
      // Performance optimizations
      parsing: {
        xAxisKey: 'x',
        yAxisKey: 'y'
      },
      scales: type !== 'doughnut' ? {
        x: {
          type: 'category',
          display: true,
          // Optimize label display for large datasets
          ticks: {
            maxTicksLimit: 20,
            autoSkip: true,
            maxRotation: 45
          }
        },
        y: {
          display: true,
          beginAtZero: true,
          // Optimize grid lines
          grid: {
            drawOnChartArea: true,
            drawTicks: true
          }
        }
      } : undefined,
      // Memory management
      onHover: (event, activeElements) => {
        // Throttle hover events for performance
        if (activeElements.length > 0 && onDataPointClick) {
          const element = activeElements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataPoint = optimizedData.datasets[datasetIndex].data[index];
          // Debounced callback would be ideal here
        }
      },
      onClick: (event, activeElements) => {
        if (activeElements.length > 0 && onDataPointClick) {
          const element = activeElements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataPoint = optimizedData.datasets[datasetIndex].data[index];
          onDataPointClick(dataPoint, index);
        }
      }
    };

    // Merge with custom options
    return {
      ...baseOptions,
      ...options,
      plugins: {
        ...baseOptions.plugins,
        ...options.plugins
      },
      scales: {
        ...baseOptions.scales,
        ...options.scales
      }
    };
  }, [options, isVisible, type, optimizedData, onDataPointClick]);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (!enableLazyLoading || isVisible) return;

    const observer = createIntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setIsLoading(false);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [enableLazyLoading, isVisible]);

  // Memory cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch (error) {
          console.warn('Chart cleanup error:', error);
        }
      }
    };
  }, []);

  // Chart resize handler
  const handleResize = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resize();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const renderChart = () => {
    const commonProps = {
      ref: chartRef,
      data: optimizedData,
      options: performanceOptions,
      height,
      width
    };

    switch (type) {
      case 'line':
        return <Line {...commonProps} />;
      case 'bar':
        return <Bar {...commonProps} />;
      case 'doughnut':
        return <Doughnut {...commonProps} />;
      default:
        return <Line {...commonProps} />;
    }
  };

  const containerStyle: React.CSSProperties = {
    height: height,
    width: width || '100%',
    position: 'relative'
  };

  return (
    <div 
      ref={containerRef} 
      className={`chart-container ${className}`}
      style={containerStyle}
    >
      {isLoading && enableLazyLoading ? (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading chart...</p>
          </div>
        </div>
      ) : isVisible ? (
        <>
          {renderChart()}
          {/* Performance indicator for large datasets */}
          {data.datasets?.[0]?.data && Array.isArray(data.datasets[0].data) && 
           data.datasets[0].data.length > maxDataPoints && (
            <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
              ⚡ Optimized ({maxDataPoints.toLocaleString()} of {data.datasets[0].data.length.toLocaleString()} points)
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Chart will load when visible</p>
        </div>
      )}
    </div>
  );
};

export default OptimizedChart;

// Convenience components with pre-configured optimizations
export const OptimizedLineChart: React.FC<Omit<OptimizedChartProps, 'type'>> = (props) => (
  <OptimizedChart {...props} type="line" />
);

export const OptimizedBarChart: React.FC<Omit<OptimizedChartProps, 'type'>> = (props) => (
  <OptimizedChart {...props} type="bar" />
);

export const OptimizedDoughnutChart: React.FC<Omit<OptimizedChartProps, 'type'>> = (props) => (
  <OptimizedChart {...props} type="doughnut" />
);

// Chart performance monitoring hook
export const useChartPerformance = (chartRef: React.RefObject<any>) => {
  const [renderTime, setRenderTime] = useState<number>(0);
  const [dataPoints, setDataPoints] = useState<number>(0);

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    const startTime = performance.now();

    const handleAnimationComplete = () => {
      const endTime = performance.now();
      setRenderTime(endTime - startTime);
      
      // Count data points
      let totalPoints = 0;
      if (chart.data?.datasets) {
        chart.data.datasets.forEach((dataset: any) => {
          if (dataset.data && Array.isArray(dataset.data)) {
            totalPoints += dataset.data.length;
          }
        });
      }
      setDataPoints(totalPoints);
    };

    chart.options.onAnimationComplete = handleAnimationComplete;

    return () => {
      if (chart.options) {
        delete chart.options.onAnimationComplete;
      }
    };
  }, [chartRef]);

  return { renderTime, dataPoints };
}; 