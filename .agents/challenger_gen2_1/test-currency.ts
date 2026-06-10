import { test, expect } from 'vitest';

function parseCurrency(input: string | number) {
  return Number(input.toString().replace(/\./g, '').replace(',', '.'));
}

test('parseCurrency parses standard string with comma', () => {
  expect(parseCurrency('1.500,00')).toBe(1500);
});

test('parseCurrency behaves badly on browser native type="number" output', () => {
  // If the input is type="number", the browser gives a string like "1500.00"
  // The replace logic will strip the period!
  expect(parseCurrency('1500.00')).toBe(1500);
});
