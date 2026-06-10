# Handoff Report: SavingFormModal Currency Parsing Bug

## Observation
- `src/components/savings/SavingFormModal.tsx` defines two inputs for currency (`valor_inicial` and `valor_final`) using `<input type="number" step="0.01" />` (Lines 302-311 and 314-323).
- The values are stored in `formData` as float strings (e.g., `"1000.50"`).
- Lines 130-131 and 173-174 attempt to parse these values using `.replace(/\./g, '').replace(',', '.')`.
- Because the input string contains a dot as a decimal separator (`"1000.50"`), `.replace(/\./g, '')` strips the decimal point entirely, resulting in `"100050"`, which inflates the value by 100x. The `.replace(',', '.')` does nothing since there is no comma.

## Logic Chain
1. The `.replace(/\./g, '').replace(',', '.')` parsing logic is designed to parse formatted Brazilian Portuguese currency strings (e.g., `"1.000,50"` -> `"1000.50"`).
2. However, `<input type="number" />` yields standard float strings (`"1000.50"`), making the current parsing logic incompatible and destructive.
3. To fix this, we can either:
   - **Quick Fix:** Keep `type="number"`, remove the `.replace()` logic and simply cast `Number(formData.valor_inicial)` because `type="number"` already outputs valid float strings.
   - **Elite Standard UI Fix:** Change the input to `type="text"`, apply a real-time BRL mask when the user types, and keep the current `.replace()` logic which will then work perfectly with the masked BRL string.
4. Given the project requirement for "Elite Standard UI", the latter option provides a significantly better Premium UX, avoiding the clunky default browser behaviors of `<input type="number">`.

## Caveats
If the Elite Standard UI fix is chosen, `initialData` population (Lines 55-56) must also be updated to format the float into a BRL string, otherwise the edit mode will break the formatting. Also, the zero-value fallbacks must be handled gracefully in the mask handler.

## Conclusion
I recommend **Refactoring to a masked `type="text"` input (Elite Standard UI approach)**.

### Proposed Implementation

**1. Add a Currency Handler:**
Add this function near `handleChange`:
```tsx
const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  const v = value.replace(/\D/g, '');
  if (!v) {
    setFormData(prev => ({ ...prev, [name]: '' }));
    return;
  }
  const num = Number(v) / 100;
  const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  setFormData(prev => ({ ...prev, [name]: formatted }));
};
```

**2. Update the Inputs:**
Change the `valor_inicial` and `valor_final` FormField inputs (around lines 302-323):
- Change `type="number"` to `type="text"`.
- Remove `step="0.01"`.
- Change `onChange={handleChange}` to `onChange={handleCurrencyChange}`.

**3. Format Initial Data:**
Update lines 55-56 to format the numbers when editing an existing record:
```tsx
valor_inicial: Number(initialData.valor_inicial).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
valor_final: Number(initialData.valor_final).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
```

**4. Keep Parsing Logic:**
Leave the parsing logic on lines 130-131 and 173-174 exactly as it is. It will now correctly parse the BRL masked string back into a JS float.

## Verification Method
1. Edit `src/components/savings/SavingFormModal.tsx` and implement the proposed changes.
2. Open the Modal in the application UI.
3. Type `100050` in the value input and visually confirm it masks instantly to `1.000,50`.
4. Submit the form and verify in the payload/DB that the saved numeric value is correctly `1000.50`.
5. Open an existing record to confirm the values are pre-filled correctly as `1.000,50`.
