import React from 'react';

interface FormSkeletonProps {
  fields?: number;
  showSubmitButton?: boolean;
  showTitle?: boolean;
  layout?: 'vertical' | 'horizontal';
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  showSubmitButton = true,
  showTitle = true,
  layout = 'vertical',
}) => {
  return (
    <div className="animate-pulse bg-gray-800 rounded-lg p-6">
      {/* Form Title */}
      {showTitle && (
        <div className="mb-6">
          <div className="h-6 bg-gray-600 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-700 rounded w-64" />
        </div>
      )}
      
      {/* Form Fields */}
      <div className={`space-y-6 ${layout === 'horizontal' ? 'grid grid-cols-2 gap-6' : ''}`}>
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            {/* Field Label */}
            <div className="h-4 bg-gray-600 rounded w-24" />
            
            {/* Field Input */}
            <div className="h-10 bg-gray-700 rounded w-full" />
            
            {/* Occasional Helper Text */}
            {index % 3 === 0 && (
              <div className="h-3 bg-gray-700 rounded w-32 opacity-60" />
            )}
          </div>
        ))}
        
        {/* Special Fields */}
        <div className="space-y-2">
          {/* Checkbox/Toggle Field */}
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-gray-600 rounded" />
            <div className="h-4 bg-gray-600 rounded w-40" />
          </div>
        </div>
        
        <div className="space-y-2">
          {/* Select/Dropdown Field */}
          <div className="h-4 bg-gray-600 rounded w-28" />
          <div className="h-10 bg-gray-700 rounded w-full relative">
            <div className="absolute right-3 top-3 w-4 h-4 bg-gray-600 rounded" />
          </div>
        </div>
      </div>
      
      {/* Form Actions */}
      {showSubmitButton && (
        <div className="mt-8 flex justify-end space-x-4">
          <div className="h-10 bg-gray-700 rounded w-20" />
          <div className="h-10 bg-blue-600 rounded w-24" />
        </div>
      )}
    </div>
  );
};

export default FormSkeleton; 