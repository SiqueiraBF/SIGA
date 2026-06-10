# Handoff Report: SavingFormModal.tsx Currency Bug

## 1. Observation
- In `src/components/savings/SavingFormModal.tsx`, lines 302 and 314, the value inputs (`valor_inicial` and `valor_final`) are defined as `<input type="number" step="0.01" />`.
- At lines 130-131 (and 173-174 for live calculations), the component parses these values using:
  `Number(formData.valor_inicial.toString().replace(/\./g, '').replace(',', '.'))`
- The project's `package.json` does not include an external masking library like `react-number-format` or `react-imask`.

## 2. Logic Chain
1. When `<input type="number">` is used, modern browsers return the `value` as a standardized JavaScript float string, strictly using `.` as the decimal separator (e.g., `"1000.50"`), regardless of the user's OS locale.
2. The current parsing logic (`.replace(/\./g, '')`) is designed to remove thousands separators from formatted pt-BR text (e.g., changing `"1.000,50"` to `"1000,50"`).
3. Because the input value is actually `"1000.50"`, the regex inadvertently removes the actual decimal point, changing `"1000.50"` to `"100050"`. The subsequent `.replace(',', '.')` has no effect. 
4. The string `"100050"` is cast to a number, resulting in a value 100x larger than intended.
5. To align with the Elite Standard UI (which demands high-quality, robust user experiences and BRL formatting), the input should be converted to a masked text field rather than relying on the native (and often clunky) number input.

## 3. Caveats
- No external masking library is installed, so a lightweight custom formatting function is needed within the component.
- `Intl.NumberFormat` or `toLocaleString('pt-BR')` can sometimes insert non-breaking spaces instead of dots in newer V8 engines, but for standard digits up to a few millions, the existing parsing logic should hold. We recommend slightly hardening the parse logic just in case.

## 4. Conclusion
Refactor the currency inputs to use `type="text"` with a custom change handler that formats the string as a BRL currency value. This achieves the desired Elite Standard UI while resolving the parsing bug.

**Recommended Fix Strategy:**
1. **Add a Currency Formatter Handler:**
   ```typescript
   const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, value } = e.target;
     // Remove everything except digits
     let digits = value.replace(/\D/g, '');
     if (!digits) digits = '0';
     // Convert to decimal (cents)
     const amount = parseInt(digits, 10) / 100;
     // Format to pt-BR (e.g., "1.000,50")
     const formatted = amount.toLocaleString('pt-BR', {
       minimumFractionDigits: 2,
       maximumFractionDigits: 2,
     });
     setFormData(prev => ({ ...prev, [name]: formatted }));
   };
   ```
2. **Update Inputs:**
   Change `<input type="number" ... onChange={handleChange} />` to `<input type="text" ... onChange={handleCurrencyChange} />` for both `valor_inicial` and `valor_final`.
3. **Keep (or slightly harden) Parsing Logic:**
   The existing parsing logic `Number(val.replace(/\./g, '').replace(',', '.'))` will now correctly process the formatted strings (`"1.000,50"` -> `1000.50`). For extra safety against whitespace from `toLocaleString`, you can use `val.replace(/[^\\d,]/g, '').replace(',', '.')`.

## 5. Verification Method
1. Modify `src/components/savings/SavingFormModal.tsx` as recommended.
2. Run the development server with the project's equivalent of `npm run dev` (`npm run dev` or `vite`).
3. Open the "Novo Registro de Saving" modal.
4. Type `100050` into the "Valor Inicial" field. It should automatically format to `1.000,50`.
5. Check the live calculation preview (Saving Gerado). It should compute based on `1000.50` rather than `100050`.
6. Submit the form and verify the API payload in the Network tab sends `1000.5` as the numeric value.
