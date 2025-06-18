import React from 'react';

interface ChartSkeletonProps {
  height?: string;
  showLegend?: boolean;
  chartType?: 'line' | 'bar' | 'pie' | 'area';
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 'h-64',
  showLegend = true,
  chartType = 'line',
}) => {
  return (
    <div className="animate-pulse bg-gray-800 rounded-lg p-6">
      {/* Chart Title */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-6 bg-gray-600 rounded w-48" />
        <div className="h-4 bg-gray-700 rounded w-20" />
      </div>
      
      {/* Chart Area */}
      <div className={`${height} bg-gray-750 rounded relative overflow-hidden`}>
        {chartType === 'line' && (
          <>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full w-8 flex flex-col justify-between py-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-3 bg-gray-600 rounded w-6" />
              ))}
            </div>
            
            {/* Chart lines */}
            <div className="absolute left-10 top-4 right-4 bottom-8">
              <svg className="w-full h-full">
                <path
                  d="M0,60 Q50,40 100,50 T200,30 T300,45 T400,20"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="2"
                  fill="none"
                  className="opacity-60"
                />
                <path
                  d="M0,80 Q50,70 100,85 T200,75 T300,90 T400,70"
                  stroke="rgb(16, 185, 129)"
                  strokeWidth="2"
                  fill="none"
                  className="opacity-60"
                />
              </svg>
            </div>
            
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-10 right-4 h-6 flex justify-between items-center">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-3 bg-gray-600 rounded w-8" />
              ))}
            </div>
          </>
        )}
        
        {chartType === 'bar' && (
          <div className="flex items-end justify-center space-x-2 h-full p-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="bg-gray-600 rounded-t w-8"
                style={{
                  height: `${Math.random() * 80 + 20}%`,
                  animationDelay: `${index * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
        
        {chartType === 'pie' && (
          <div className="flex items-center justify-center h-full">
            <div className="w-32 h-32 rounded-full bg-gray-600 relative">
              <div className="absolute inset-4 rounded-full bg-gray-800" />
            </div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex flex-wrap gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded ${
                  index === 0 ? 'bg-blue-500' : 
                  index === 1 ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              <div className="h-3 bg-gray-600 rounded w-16" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChartSkeleton; 