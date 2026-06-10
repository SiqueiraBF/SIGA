import { describe, it, expect } from 'vitest';

describe('Number conversion logic in SavingFormModal', () => {
  it('fails with standard Brazilian currency format', () => {
    // A standard Brazilian format input from a user: "1.000,50"
    const input = "1.000,50";
    
    // The code in SavingFormModal:
    const valor = Number(input.replace(',', '.'));
    
    // Evaluate it:
    expect(Number.isNaN(valor)).toBe(true);
  });
  
  it('fails with multiple commas', () => {
    const input = "100,00,00";
    const valor = Number(input.replace(',', '.'));
    expect(Number.isNaN(valor)).toBe(true);
  });
});
