const formatCurrency = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  let stringValue = String(value);
  
  if (typeof value === 'number') {
    stringValue = value.toFixed(2);
  }

  const numericValue = stringValue.replace(/\D/g, '');
  if (!numericValue) return '';
  
  const number = Number(numericValue) / 100;
  return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const value1 = formatCurrency('100050');
console.log('formatCurrency("100050") ->', value1);

const parseCurrency = (str) => {
    return Number(str.toString().replace(/\./g, '').replace(',', '.'));
};

const parsedValue1 = parseCurrency(value1);
console.log('parseCurrency(value1) ->', parsedValue1);

const testValues = ['1', '10', '100', '1000', '10000', '100000', '100050', '1.000,50'];
for (const val of testValues) {
    const formatted = formatCurrency(val);
    const parsed = parseCurrency(formatted);
    console.log(`Input: ${val} | Formatted: ${formatted} | Parsed: ${parsed}`);
}
