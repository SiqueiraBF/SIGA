function parseCurrency(input) {
  return Number(input.toString().replace(/\./g, '').replace(',', '.'));
}

console.log("Input '1.500,00' ->", parseCurrency('1.500,00'));
console.log("Input '1500.00' (from type=\"number\") ->", parseCurrency('1500.00'));
console.log("Input 1500.00 (from initialData) ->", parseCurrency(1500.00));
