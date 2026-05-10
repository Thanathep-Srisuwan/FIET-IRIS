import React from 'react';

export const Skeleton = ({ className = '', variant = 'rect' }) => {
  const baseClasses = 'animate-pulse bg-slate-200 dark:bg-slate-700';
  const variantClasses = {
    rect: 'rounded-md',
    circle: 'rounded-full',
    text: 'rounded h-4 w-full',
  };

  return <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />;
};

export const CardSkeleton = () => (
  <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton variant="circle" className="w-12 h-12" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-1/3 h-5" />
        <Skeleton variant="text" className="w-1/2 h-3" />
      </div>
    </div>
    <div className="space-y-2 pt-2">
      <Skeleton variant="text" className="h-4" />
      <Skeleton variant="text" className="h-4" />
      <Skeleton variant="text" className="w-4/5 h-4" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="w-full space-y-4">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex gap-4 items-center px-4 py-3 border-b border-slate-50 dark:border-slate-800 last:border-0">
        <Skeleton variant="circle" className="w-8 h-8" />
        <Skeleton variant="text" className="flex-1 h-4" />
        <Skeleton variant="text" className="w-24 h-4" />
        <Skeleton variant="text" className="w-16 h-4" />
      </div>
    ))}
  </div>
);

export const ListSkeleton = ({ items = 3 }) => (
  <div className="space-y-3">
    {[...Array(items)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
        <Skeleton variant="rect" className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-1/2 h-3" />
          <Skeleton variant="text" className="w-1/4 h-2" />
        </div>
      </div>
    ))}
  </div>
);
