import React from 'react';

interface DataTableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export const DataTableSkeleton: React.FC<DataTableSkeletonProps> = ({
  rows = 5,
  columns = 6,
  showHeader = true,
}) => {
  return (
    <div className="animate-pulse">
      {/* Table Header */}
      {showHeader && (
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-700 bg-gray-800">
          {Array.from({ length: columns }).map((_, index) => (
            <div
              key={`header-${index}`}
              className="h-4 bg-gray-600 rounded"
            />
          ))}
        </div>
      )}
      
      {/* Table Rows */}
      <div className="divide-y divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid grid-cols-6 gap-4 p-4 hover:bg-gray-800/50"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                className={`h-4 bg-gray-700 rounded ${
                  colIndex === 0 ? 'bg-gray-600' : ''
                } ${colIndex === columns - 1 ? 'w-16' : ''}`}
                style={{
                  animationDelay: `${(rowIndex + colIndex) * 0.1}s`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Loading Footer */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-600 rounded w-32" />
          <div className="flex space-x-2">
            <div className="h-8 w-16 bg-gray-600 rounded" />
            <div className="h-8 w-16 bg-gray-600 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTableSkeleton; 