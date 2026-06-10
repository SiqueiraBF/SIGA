# Handoff Report: SavingFormModal.tsx Currency Formatting Fix

## Observation
The `SavingFormModal.tsx` file had `<input type="number">` fields for currency inputs (`valor_inicial` and `valor_final`). When submitting the form, `valor_inicial` and `valor_final` were being parsed with `.replace(/\./g, '')`, which incorrectly stripped the decimal point from floats like `"1000.50"`, resulting in inflated values like `100050`. The prompt requested upgrading these to `<input type="text" inputMode="numeric">` with a `pt-BR` mask (`1.000,50`) applied during `onChange`, while keeping the parsing logic intact because `pt-BR` formatting strings can safely be parsed by the existing logic.

## Logic Chain
1. Added a `formatCurrency` function to `SavingFormModal.tsx` that removes non-digits, divides by 100, and formats the output with `toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`. I made sure floats incoming from initial data via the DB get explicitly formatted to two decimal places before processing to maintain precision.
2. Updated the `valor_inicial` and `valor_final` fields from `<input type="number">` to `<input type="text" inputMode="numeric">`.
3. Added a `handleCurrencyChange` function to intercept `onChange` for currency fields. This applies the `formatCurrency` mask before updating `formData`.
4. The existing calculate and submit logic effectively parses `pt-BR` strings (e.g., `Number("1.000,50".replace(/\./g, '').replace(',', '.'))`), turning `"1.000,50"` into `"1000,50"` and then into `1000.50`, which evaluates natively as `1000.5`. This remains valid and untouched.

## Caveats
I only targeted `valor_inicial` and `valor_final` inside `SavingFormModal.tsx`. The user mentioned `valor_mensal` and `custo_projeto_atual` as examples, but those do not exist in `SavingFormModal.tsx`. The change handles floats passed in initial data seamlessly.

## Conclusion
The currency input fields in `SavingFormModal.tsx` have been successfully upgraded to `<input type="text" inputMode="numeric">` using an Elite Standard mask, solving the float calculation bug. The module was successfully type-checked via TypeScript.

## Verification Method
Run `npx tsc --noEmit` and launch the application. Attempt to create or edit a Saving record: the input should dynamically format as `pt-BR` currency (e.g. `R$ 1.000,50`) while typing. The generated saving calculation and final save should yield correct decimal results instead of inflated integers.
