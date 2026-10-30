import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { HealthStatus } from '../../types/finance';

interface StatusBadgeProps {
  status: HealthStatus;
  sublabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  sublabel,
  size = 'md',
  className = '',
}) => {
  const configs = {
    healthy: {
      word: 'Healthy',
      icon: CheckCircle2,
      badgeStyle:
        'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      iconStyle: 'text-emerald-600 dark:text-emerald-400',
    },
    watch: {
      word: 'Watch',
      icon: AlertTriangle,
      badgeStyle:
        'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      iconStyle: 'text-amber-600 dark:text-amber-400',
    },
    critical: {
      word: 'Critical',
      icon: AlertOctagon,
      badgeStyle:
        'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      iconStyle: 'text-rose-600 dark:text-rose-400',
    },
  };

  const config = configs[status] || configs.healthy;
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border shadow-2xs whitespace-nowrap tracking-wide ${sizeClasses[size]} ${config.badgeStyle} ${className}`}
    >
      <IconComponent className={`${iconSizes[size]} ${config.iconStyle} shrink-0`} />
      <span>{config.word}</span>
      {sublabel && (
        <>
          <span className="opacity-40" aria-hidden="true">·</span>
          <span className="font-medium text-[11px] opacity-90">{sublabel}</span>
        </>
      )}
    </span>
  );
};
