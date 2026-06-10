import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from './src/components/ui/ConfirmDialog';
import React, { useState } from 'react';

// Wrapper to simulate parent state
function TestWrapper() {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  const handleConfirm = async () => {
    setLoading(true);
    setCount(c => c + 1);
    await new Promise(r => setTimeout(r, 100));
    setLoading(false);
  };

  return (
    <>
      <div data-testid="count">{count}</div>
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={handleConfirm}
        title="Test"
        isLoading={loading}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('prevents double submitting', async () => {
    render(<TestWrapper />);
    const button = screen.getByText('Confirmar');
    
    // Fire click twice synchronously
    fireEvent.click(button);
    fireEvent.click(button);
    
    // In React 18, if state isn't flushed synchronously, the second click might trigger it!
    // Let's see if count is 1 or 2
    await waitFor(() => {
        expect(screen.getByTestId('count').textContent).toBe('1');
    });
  });
});
