import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Modal } from '../../src/components/ui/Modal';

describe('Modal Scroll Lock Logic Flaw', () => {
  it('unlocks scroll prematurely when a nested modal is closed', () => {
    const TestComponent = () => {
      const [showModal1, setShowModal1] = useState(true);
      const [showModal2, setShowModal2] = useState(false);

      return (
        <div>
          <button data-testid="open-modal2" onClick={() => setShowModal2(true)}>Open 2</button>
          
          <Modal isOpen={showModal1} onClose={() => setShowModal1(false)}>
            Modal 1
          </Modal>

          <Modal isOpen={showModal2} onClose={() => setShowModal2(false)}>
            Modal 2
            <button data-testid="close-modal2" onClick={() => setShowModal2(false)}>Close 2</button>
          </Modal>
        </div>
      );
    };

    render(<TestComponent />);
    
    // Initial state: Modal 1 is open, body scroll should be hidden
    expect(document.body.style.overflow).toBe('hidden');

    // Open Modal 2
    fireEvent.click(screen.getByTestId('open-modal2'));
    expect(document.body.style.overflow).toBe('hidden');

    // Close Modal 2
    fireEvent.click(screen.getByTestId('close-modal2'));
    
    // BUG: Closing Modal 2 resets the body overflow, even though Modal 1 is STILL OPEN
    expect(document.body.style.overflow).toBe('');
  });
});
