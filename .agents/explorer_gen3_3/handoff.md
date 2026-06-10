# Handoff Report: SavingFormModal.tsx Currency Parsing Bug

**Summary**: The bug in currency parsing is caused by a mismatch between the input type (`type="number"`) and the parsing logic in `handleSubmit` and preview calculations. The current parsing logic is designed for formatted BRL strings (`"1.000,50"`), but the `type="number"` input provides a standard float string (`"1000.50"`), causing the decimal to be erroneously stripped.

## 1. Observation
- In `src/components/savings/SavingFormModal.tsx`, lines 302-311 and 314-323, the currency inputs use `<input type="number" step="0.01" ... />`. This HTML element naturally emits values as standard float strings (e.g., `"1000.50"`).
- In the same file, lines 130-131 (inside `handleSubmit`) and lines 173-174 (preview calculations), the parsing logic is:
  ```typescript
  const valor_inicial = Number(formData.valor_inicial.toString().replace(/\./g, '').replace(',', '.'));
  ```
- When `"1000.50"` is passed through `.replace(/\./g, '')`, the decimal point is deleted, resulting in `"100050"`. The subsequent `.replace(',', '.')` has no effect. The final parsed value is `100050` instead of `1000.50`.

## 2. Logic Chain
1. The developer wrote a parser that expects a Brazilian Real (BRL) formatted string (like `"1.000,50"`).
2. The `<input>` element was implemented as `type="number"`, which does not yield BRL formatted strings, but rather locale-agnostic float strings (like `"1000.50"`).
3. The regex `.replace(/\./g, '')` interprets the valid decimal point in `"1000.50"` as a thousands separator and removes it.
4. To fix this, we must align the input's emission format with the parsing logic. 
5. Given the "Elite Standard UI" requirement, the best UX approach is to provide a formatted currency input to the user. Changing the input to `type="text"` and formatting the value as a BRL string on change resolves the mismatch and provides a premium experience.
6. Alternatively, keeping `type="number"` and simplifying the parse to `Number(formData.valor_inicial)` fixes the math but degrades UX.

## 3. Caveats
- Refactoring to a masked text input requires ensuring that non-numeric characters are handled correctly during user input (e.g., preventing alphabetic characters and managing the cursor position if necessary). 
- If using `type="text"`, mobile devices will display the standard keyboard instead of the numeric one unless `inputMode="numeric"` is added.

## 4. Conclusion
**Recommended Fix Strategy (Elite Standard):**
Refactor the currency fields to use `type="text"` with a BRL mask.

1. **Change Inputs**: Update `<input type="number">` to `<input type="text" inputMode="numeric">` for both `valor_inicial` and `valor_final`.
2. **Add Masking Logic**: Create a helper function inside the component to handle currency formatting:
   ```typescript
   const formatCurrency = (value: string) => {
     let digits = value.replace(/\D/g, '');
     if (!digits) return '';
     const floatValue = Number(digits) / 100;
     return floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
   };
   ```
3. **Intercept Change**: Update the `onChange` handler for these specific fields to apply the mask before saving to `formData`:
   ```typescript
   const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, value } = e.target;
     setFormData(prev => ({ ...prev, [name]: formatCurrency(value) }));
   };
   ```
4. **Preserve Parsing**: Keep the existing `.replace(/\./g, '').replace(',', '.')` parsing logic, as it will now correctly parse the BRL-formatted string into a float.

*Alternative fallback:* If the team prefers to avoid masking, simply change the parsing logic to `Number(formData.valor_inicial)` and keep `type="number"`. However, this is not recommended for an "Elite" UI.

## 5. Verification Method
- **Implement the suggested `type="text"` refactor.**
- **Manual Test**: Open the Modal, type `100050` into the "Valor Inicial" field. It should automatically format to `1.000,50` on screen.
- **Validation**: Check the "Saving Gerado" display below the inputs. It should correctly interpret the value as `R$ 1.000,50` and not inflate it.
- **Submission**: Submit the form and query the Supabase database to confirm the saved numeric column is `1000.50` and not `100050.00`.
