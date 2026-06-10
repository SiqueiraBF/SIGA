const maxSize = 10 * 1024 * 1024; // 10MB
const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

function validateFiles(fileList) {
    return fileList.filter(file => {
      if (file.size > maxSize) {
        console.log(`Error: O arquivo ${file.name} excede o limite de 10MB.`);
        return false;
      }
      if (!validTypes.includes(file.type)) {
        console.log(`Error: O arquivo ${file.name} tem um formato não suportado. Use PDF, PNG ou JPG.`);
        return false;
      }
      return true;
    });
}

const mockFiles = [
    { name: 'valid.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 },
    { name: 'large.pdf', type: 'application/pdf', size: 11 * 1024 * 1024 },
    { name: 'invalid.txt', type: 'text/plain', size: 1 * 1024 * 1024 },
];

const valid = validateFiles(mockFiles);
console.log('Valid files count:', valid.length);
if (valid.length !== 1 || valid[0].name !== 'valid.pdf') {
    process.exit(1);
}
console.log('Test passed');
