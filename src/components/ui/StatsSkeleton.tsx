import React from 'react';

interface StatsSkeletonProps {
    count?: number;
}

export const StatsSkeleton = ({ count = 4 }: StatsSkeletonProps) => {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${count} gap-6 mb-8 animate-pulse`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-[132px]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-6 h-6 bg-slate-200 rounded"></div>
                        <div className="w-12 h-8 bg-slate-200 rounded"></div>
                    </div>
                    <div className="w-24 h-4 bg-slate-200 rounded mb-2"></div>
                    <div className="w-32 h-3 bg-slate-100 rounded"></div>
                </div>
            ))}
        </div>
    );
};
