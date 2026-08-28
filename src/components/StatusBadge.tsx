import { ProcessingStatus } from '../types';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: ProcessingStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const configs = {
    uploading: {
      label: 'UPLOADING',
      icon: Loader2,
      styles: 'bg-blue-950/60 text-blue-400 border-blue-800/50 shadow-sm shadow-blue-900/30',
      iconStyles: 'animate-spin',
    },
    processing: {
      label: 'PROCESSING',
      icon: Loader2,
      styles: 'bg-blue-950/60 text-blue-400 border-blue-800/50 shadow-sm shadow-blue-900/30',
      iconStyles: 'animate-spin',
    },
    completed: {
      label: 'COMPLETED',
      icon: CheckCircle2,
      styles: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50 shadow-sm shadow-emerald-900/30',
      iconStyles: '',
    },
    failed: {
      label: 'FAILED',
      icon: AlertCircle,
      styles: 'bg-rose-950/60 text-rose-400 border-rose-800/50 shadow-sm shadow-rose-900/30',
      iconStyles: '',
    },
  };

  const config = configs[status] || configs.processing;
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center space-x-1.5 px-3 py-1 rounded-sm text-[9px] font-mono font-bold uppercase tracking-widest border",
      config.styles,
      className
    )}>
      <Icon className={cn("h-3 w-3", config.iconStyles)} />
      <span>{config.label}</span>
    </span>
  );
}
