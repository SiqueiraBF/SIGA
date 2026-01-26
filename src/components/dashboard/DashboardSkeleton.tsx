import React from 'react';

export const DashboardSkeleton = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <div className="h-8 w-64 bg-slate-200 rounded-lg mb-2"></div>
                    <div className="h-4 w-48 bg-slate-200 rounded-lg"></div>
                </div>
                <div className="hidden sm:block text-right">
                    <div className="h-4 w-32 bg-slate-200 rounded-lg mb-1 ml-auto"></div>
                    <div className="h-4 w-24 bg-slate-200 rounded-lg ml-auto"></div>
                </div>
            </div>

            {/* KPI Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 h-32">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                            <div className="w-16 h-4 bg-slate-200 rounded-lg"></div>
                        </div>
                        <div className="w-24 h-8 bg-slate-200 rounded-lg"></div>
                    </div>
                ))}
            </div>

            {/* Main Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Priority Skeleton */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 h-[500px] flex flex-col items-center justify-center">
                            <div className="w-40 h-40 rounded-full border-8 border-slate-100 mb-6"></div>
                            <div className="w-full grid grid-cols-2 gap-4 px-4">
                                <div className="h-16 bg-slate-50 rounded-lg"></div>
                                <div className="h-16 bg-slate-50 rounded-lg"></div>
                            </div>
                        </div>
                        {/* Timeline Skeleton */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 h-[500px]">
                            <div className="w-32 h-6 bg-slate-200 rounded-lg mb-6"></div>
                            <div className="space-y-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex gap-4">
                                        <div className="w-2 bg-slate-100 rounded-full"></div>
                                        <div className="flex-1">
                                            <div className="w-20 h-3 bg-slate-200 rounded mb-2"></div>
                                            <div className="w-full h-4 bg-slate-200 rounded mb-2"></div>
                                            <div className="w-3/4 h-3 bg-slate-100 rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    {/* Feed Skeleton */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 h-[500px]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="w-32 h-6 bg-slate-200 rounded-lg"></div>
                            <div className="w-16 h-5 bg-slate-200 rounded-full"></div>
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex gap-4 p-3 bg-slate-50 rounded-xl">
                                    <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                                        <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
