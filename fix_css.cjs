const fs = require('fs');
const path = require('path');

// 1. Fix DirectReceiptSidePanel.tsx input fields to match PCM Request Modal
const sidePanelPath = path.join(process.cwd(), 'src/components/direct-receipt/DirectReceiptSidePanel.tsx');
let sideContent = fs.readFileSync(sidePanelPath, 'utf8');

// replace the input/select classes
sideContent = sideContent.replace(/bg-slate-50 border border-slate-200 rounded-xl text-blue-700 font-mono text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none/g,
  'bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono');

sideContent = sideContent.replace(/bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none/g,
  'bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none');

sideContent = sideContent.replace(/bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none/g,
  'bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none');

sideContent = sideContent.replace(/border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all/g,
  'border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none');

sideContent = sideContent.replace(/bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none/g,
  'bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono');

sideContent = sideContent.replace(/bg-slate-50 border-slate-200 text-slate-700/g,
  'bg-white border-slate-200 text-slate-800');

fs.writeFileSync(sidePanelPath, sideContent, 'utf8');
console.log('Fixed DirectReceiptSidePanel.tsx');

// 2. Fix DirectReceiptList.tsx table classes to match PCM Request List
const listPath = path.join(process.cwd(), 'src/pages/DirectReceiptList.tsx');
let listContent = fs.readFileSync(listPath, 'utf8');

// TH classes
listContent = listContent.replace(/px-3 py-2\.5 text-left text-\[10px\] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors/g,
  'px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap');

listContent = listContent.replace(/px-3 py-2\.5 text-left text-\[10px\] font-bold text-slate-400 uppercase tracking-widest/g,
  'px-4 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap');

listContent = listContent.replace(/px-3 py-2\.5 text-right text-\[10px\] font-bold text-slate-400 uppercase tracking-widest/g,
  'px-4 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap');

// TD classes
listContent = listContent.replace(/px-3 py-2\.5/g, 'px-4 py-4');
listContent = listContent.replace(/text-\[11px\]/g, 'text-sm');
listContent = listContent.replace(/text-\[10px\]/g, 'text-xs');

fs.writeFileSync(listPath, listContent, 'utf8');
console.log('Fixed DirectReceiptList.tsx');

// 3. Fix DirectReceiptFormModal.tsx table classes
const modalPath = path.join(process.cwd(), 'src/components/direct-receipt/DirectReceiptFormModal.tsx');
let modalContent = fs.readFileSync(modalPath, 'utf8');

// Replace table header in modal
modalContent = modalContent.replace(/px-3 py-3 text-\[10px\] font-black text-slate-400 uppercase tracking-widest/g,
  'px-4 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap');
modalContent = modalContent.replace(/px-3 py-3 w-12/g, 'px-4 py-4 w-12');

// Replace table cells in modal
modalContent = modalContent.replace(/px-3 py-3/g, 'px-4 py-4');
modalContent = modalContent.replace(/text-\[10px\]/g, 'text-xs');
modalContent = modalContent.replace(/text-\[11px\]/g, 'text-xs'); // because it's a tight modal table

fs.writeFileSync(modalPath, modalContent, 'utf8');
console.log('Fixed DirectReceiptFormModal.tsx');

