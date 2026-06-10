import { test, expect, describe, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { Modal } from '../../src/components/ui/Modal';

describe('Modal Scroll Lock', () => {
    afterEach(() => {
        cleanup();
        document.body.style.overflow = ''; // reset just in case
    });

    test('manages nested scroll locks correctly', () => {
        const { rerender } = render(
            <div>
                <Modal isOpen={true} onClose={() => {}}>Modal 1</Modal>
            </div>
        );
        
        expect(document.body.style.overflow).toBe('hidden');
        
        // Open second modal
        rerender(
            <div>
                <Modal isOpen={true} onClose={() => {}}>Modal 1</Modal>
                <Modal isOpen={true} onClose={() => {}}>Modal 2</Modal>
            </div>
        );
        
        expect(document.body.style.overflow).toBe('hidden');
        
        // Close second modal
        rerender(
            <div>
                <Modal isOpen={true} onClose={() => {}}>Modal 1</Modal>
                <Modal isOpen={false} onClose={() => {}}>Modal 2</Modal>
            </div>
        );
        
        // One is still open, so it should still be hidden
        expect(document.body.style.overflow).toBe('hidden');
        
        // Close first modal
        rerender(
            <div>
                <Modal isOpen={false} onClose={() => {}}>Modal 1</Modal>
                <Modal isOpen={false} onClose={() => {}}>Modal 2</Modal>
            </div>
        );
        
        expect(document.body.style.overflow).toBe('');
    });
});
