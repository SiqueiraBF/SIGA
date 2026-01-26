import React from 'react';

interface SimpleDonutChartProps {
    data: { name: string; value: number; color: string }[];
}

export const SimpleDonutChart = ({ data }: SimpleDonutChartProps) => {
    const total = data.reduce((acc, cur) => acc + cur.value, 0) || 1;
    let cumulativePercent = 0;

    return (
        <div className="relative w-40 h-40 mx-auto transform transition-transform hover:scale-105 duration-300">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full drop-shadow-sm">
                {data.map((slice, i) => {
                    const percent = slice.value / total;
                    const strokeDasharray = `${percent * 100} 100`;
                    const strokeDashoffset = -cumulativePercent * 100;
                    cumulativePercent += percent;

                    return (
                        <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={slice.color}
                            strokeWidth="15"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            pathLength="100"
                            className="transition-all duration-500 hover:opacity-90"
                            strokeLinecap="round"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total</span>
                <span className="text-2xl font-bold text-slate-800">{data.reduce((a, b) => a + b.value, 0)}</span>
            </div>
        </div>
    );
};
