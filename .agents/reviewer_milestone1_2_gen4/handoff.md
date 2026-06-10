## Observation
- Verified `src/components/savings/SavingFormModal.tsx` at line 109-123: The `formatCurrency` function was correctly implemented to strip non-digits and reformat them as a valid `pt-BR` decimal number (`.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`). It correctly avoids the `currency: 'BRL'` style config, preventing the addition of "R$ " inside the input value.
- Verified line 324, 336: `type="text"` and `inputMode="numeric"` replaced `type="number"`.
- Verified line 130: `handleCurrencyChange` applies the mask successfully on change.
- Verified line 151-152: `Number(formData.valor_inicial.toString().replace(/\./g, '').replace(',', '.'))` accurately converts the formatted text back into a valid float for submission and business logic.
- Ran `npx tsc --noEmit` as task `91326110-b600-41e9-89ef-9a972e523b5c/task-5`. The task returned successfully with no `Stdout` or `Stderr`, meaning all type checks passed.

## Logic Chain
- The core bug was that `type="number"` doesn't accept a comma `,` natively in forms depending on the browser locale, and prevents formatting with thousand separators. 
- Using `type="text" inputMode="numeric"` allows us to visually mask the value as `"1.234,56"` while keeping the mobile keyboard set to a number pad.
- `formatCurrency` securely parses numbers right-to-left. By extracting only digits `replace(/\D/g, '')` and dividing by 100, the user seamlessly edits decimals by typing normally, bypassing the floating-point jump bugs typical of simple string appends.
- Pre-submission hooks properly strip the `pt-BR` punctuation so the payload correctly parses as standard IEEE 754 floats.
- `tsc` completed without errors, ensuring our updated components comply with TS typing constraints.

## Caveats
- No immediate caveats. One minor edge-case is that in some extremely specific, non-standard locale polyfills `toLocaleString('pt-BR')` might use non-breaking spaces instead of dots `.` for thousands, but in modern V8/Webkit implementations on React it guarantees standard dots. Even if it did, stripping non-digits would still work on type-in (the user doesn't type non-breaking spaces), and the logic resolves safely.

## Conclusion
- The changes successfully remediate the currency parsing bug and conform to the application's UX and codebase standards. 
- **Verdict**: APPROVE. The fix is robust and precise.

## Verification Method
- I ran `npx tsc --noEmit`. No TypeScript errors were present.
- Manually inspected the Regex and conversion steps (`replace(/\D/g, '')` then `/100` then `toLocaleString`) to simulate backspacing and pasting. They reliably construct the desired currency format in `pt-BR`.
- Checked `calcValorInicial` and `calcValorFinal` to ensure the preview logic was also updated to parse the new comma-separated strings (it uses the same `.replace(/\./g, '').replace(',', '.')` strategy).
