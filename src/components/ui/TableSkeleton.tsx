import React from 'react';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    showActions?: boolean;
}

export const TableSkeleton = ({ rows = 5, columns = 4, showActions = true }: TableSkeletonProps) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
            {/* Header */}
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex gap-4">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={`head-${i}`} className="h-4 bg-slate-200 rounded flex-1"></div>
                ))}
                {showActions && <div className="w-20 h-4 bg-slate-200 rounded shrink-0"></div>}
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="px-6 py-4 flex gap-4 items-center">
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <div
                                key={`cell-${rowIndex}-${colIndex}`}
                                className="h-4 bg-slate-100 rounded flex-1"
                                style={{ width: `${Math.random() * 40 + 60}%` }} // Random width for realism
                            ></div>
                        ))}
                        {showActions && (
                            <div className="flex gap-2 shrink-0 w-20 justify-end">
                                <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                                <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
