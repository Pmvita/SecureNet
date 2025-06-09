import React from 'react';
import * as HeroIcons from '@heroicons/react/24/outline';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  'alert-triangle': HeroIcons.ExclamationTriangleIcon,
  'globe': HeroIcons.GlobeAltIcon,
  'clock': HeroIcons.ClockIcon,
  'shield': HeroIcons.ShieldCheckIcon,
  'trending-up': HeroIcons.ArrowTrendingUpIcon,
  'trending-down': HeroIcons.ArrowTrendingDownIcon,
  'check-circle': HeroIcons.CheckCircleIcon,
};

export const Icon: React.FC<IconProps> = ({ name, className = '', ...props }) => {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return <IconComponent className={`w-6 h-6 ${className}`} {...props} />;
}; 