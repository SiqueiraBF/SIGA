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

const parseCurrency = (str) => {
  return Number(str.toString().replace(/\./g, '').replace(',', '.'));
};

const input1 = "100050";
const formatted1 = formatCurrency(input1);
console.log(`Format '${input1}' -> '${formatted1}'`);

const parsed1 = parseCurrency(formatted1);
console.log(`Parse '${formatted1}' -> ${parsed1}`);

const input2 = "1.000,50";
const formatted2 = formatCurrency(input2);
console.log(`Format '${input2}' -> '${formatted2}'`);

const parsed2 = parseCurrency(formatted2);
console.log(`Parse '${formatted2}' -> ${parsed2}`);
