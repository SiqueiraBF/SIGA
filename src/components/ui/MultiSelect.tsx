import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: Option[];
    value: string[]; // Array of selected values
    onChange: (value: string[]) => void;
    placeholder?: string;
    label?: string;
}

export function MultiSelect({ options, value, onChange, placeholder = 'Selecione...', label }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optionValue: string) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    const removeValue = (e: React.MouseEvent, optionValue: string) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== optionValue));
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">{label}</label>}

            {/* Trigger Button */}
            <div
                className={`w-full min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer bg-white flex items-center justify-between transition-all ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-200 hover:border-slate-300'
                    }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-wrap gap-1.5">
                    {value.length > 0 ? (
                        value.map(val => {
                            const opt = options.find(o => o.value === val);
                            return (
                                <span key={val} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-100">
                                    <span
                                        className="truncate max-w-[200px]"
                                        title={opt?.label || val}
                                    >
                                        {opt?.label || val}
                                    </span>
                                    <div
                                        onMouseDown={(e) => removeValue(e, val)}
                                        className="hover:bg-blue-200 rounded p-0.5 cursor-pointer"
                                    >
                                        <X size={12} />
                                    </div>
                                </span>
                            );
                        })
                    ) : (
                        <span className="text-slate-400 text-sm">{placeholder}</span>
                    )}
                </div>
                <div className="flex items-center text-slate-400 pl-2">
                    <ChevronDown size={16} />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-96 w-max min-w-full overflow-y-auto p-1 animate-in fade-in zoom-in-95 duration-100">
                    {options.map((option) => {
                        const isSelected = value.includes(option.value);
                        return (
                            <div
                                key={option.value}
                                onClick={() => toggleOption(option.value)}
                                className={`flex items-center justify-between px-3 py-2.5 text-sm rounded-md cursor-pointer transition-colors whitespace-nowrap ${isSelected
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <span>{option.label}</span>
                                {isSelected && <Check size={16} className="text-blue-600" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
