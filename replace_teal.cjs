const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/DirectReceiptList.tsx',
  'src/components/direct-receipt/DirectReceiptFormModal.tsx',
  'src/components/direct-receipt/DirectReceiptSidePanel.tsx',
  'src/components/direct-receipt/DirectReceiptFooter.tsx',
  'src/components/direct-receipt/DirectReceiptHeader.tsx',
  'src/components/direct-receipt/DirectReceiptEmailSettingsModal.tsx'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    // We only want to replace lowercase 'teal' with 'blue' for tailwind classes
    content = content.replace(/teal/g, 'blue');
    content = content.replace(/TEAL/g, 'BLUE');
    content = content.replace(/Teal/g, 'Blue');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Replaced teal with blue in ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
