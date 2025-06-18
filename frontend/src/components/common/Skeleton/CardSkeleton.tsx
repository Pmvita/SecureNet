import React from 'react';

interface CardSkeletonProps {
  variant?: 'metric' | 'chart' | 'list' | 'detailed';
  showActions?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  variant = 'metric',
  showActions = false,
}) => {
  return (
    <div className="animate-pulse bg-gray-800 rounded-lg p-6 border border-gray-700">
      {/* Card Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="h-5 bg-gray-600 rounded w-32" />
          <div className="h-3 bg-gray-700 rounded w-24" />
        </div>
        {showActions && (
          <div className="h-8 w-8 bg-gray-600 rounded" />
        )}
      </div>
      
      {/* Card Content Based on Variant */}
      {variant === 'metric' && (
        <div className="space-y-3">
          <div className="h-8 bg-gray-600 rounded w-20" />
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-green-500 rounded" />
            <div className="h-4 bg-gray-700 rounded w-16" />
          </div>
        </div>
      )}
      
      {variant === 'chart' && (
        <div className="space-y-4">
          <div className="h-32 bg-gray-750 rounded relative">
            <div className="absolute bottom-2 left-2 right-2 flex justify-between">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-gray-600 rounded-t w-6"
                  style={{ height: `${Math.random() * 80 + 20}%` }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 bg-gray-700 rounded w-16" />
            <div className="h-3 bg-gray-700 rounded w-16" />
          </div>
        </div>
      )}
      
      {variant === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
              <div className="h-4 bg-gray-600 rounded w-12" />
            </div>
          ))}
        </div>
      )}
      
      {variant === 'detailed' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3 bg-gray-700 rounded w-16" />
              <div className="h-5 bg-gray-600 rounded w-20" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-700 rounded w-20" />
              <div className="h-5 bg-gray-600 rounded w-24" />
            </div>
          </div>
          <div className="h-px bg-gray-700" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-700 rounded w-4/6" />
          </div>
        </div>
      )}
      
      {/* Card Footer */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <div className="h-3 bg-gray-700 rounded w-24" />
          <div className="h-3 bg-gray-700 rounded w-16" />
        </div>
      </div>
    </div>
  );
};

export default CardSkeleton; 