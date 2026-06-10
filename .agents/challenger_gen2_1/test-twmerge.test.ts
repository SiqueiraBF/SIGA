import { test, expect, describe, afterEach } from 'vitest';
import { twMerge } from 'tailwind-merge';

describe('Modal twMerge', () => {
    test('twMerge overrides default classes', () => {
        const baseClasses = "bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200";
        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-2xl',
        };
        const customClasses = "bg-red-500 max-h-screen";
        
        const result = twMerge(baseClasses, sizeClasses['md'], customClasses);
        
        expect(result).toContain('bg-red-500');
        expect(result).not.toContain('bg-white');
        
        expect(result).toContain('max-h-screen');
        expect(result).not.toContain('max-h-[92vh]');
        
        expect(result).toContain('max-w-2xl');
    });
});
