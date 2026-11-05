import React from 'react';
import { ScheduleLessonStatus } from '../../types';
import { CheckCircle2, Clock } from 'lucide-react';

interface Props {
  status: ScheduleLessonStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const ScheduleStatusBadge: React.FC<Props> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  if (status === 'Berlangsung') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-extrabold rounded-full border shadow-2xs ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : size === 'lg'
            ? 'px-3.5 py-1.5 text-xs'
            : 'px-2.5 py-1 text-[11px]'
        } bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Berlangsung</span>
      </span>
    );
  }

  if (status === 'Selesai') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : size === 'lg'
            ? 'px-3.5 py-1.5 text-xs'
            : 'px-2.5 py-1 text-[11px]'
        } bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700`}
      >
        {showIcon && <CheckCircle2 className="w-3 h-3 text-slate-500 shrink-0" />}
        <span>Selesai</span>
      </span>
    );
  }

  // Terjadwal
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border ${
        size === 'sm'
          ? 'px-2 py-0.5 text-[10px]'
          : size === 'lg'
          ? 'px-3.5 py-1.5 text-xs'
          : 'px-2.5 py-1 text-[11px]'
      } bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700`}
    >
      {showIcon && <Clock className="w-3 h-3 text-sky-600 shrink-0" />}
      <span>Terjadwal</span>
    </span>
  );
};
