import React from 'react';
import { useThemeClasses } from '../../hooks/useThemeClasses';

interface SkeletonProps {
  className?: string;
}

/** Animated shimmer placeholder for loading states (Rule 3) */
export function Skeleton({ className = '' }: SkeletonProps) {
  const tc = useThemeClasses();
  return (
    <div
      className={`animate-pulse rounded-lg ${tc.isDark ? 'bg-white/[0.06]' : 'bg-slate-200/60'} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Full page loading skeleton with metric cards + chart placeholders */
export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6" role="status" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

/** Table loading skeleton */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading table">
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}
