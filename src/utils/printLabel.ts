import logoBase64 from '../assets/logo-nadiana.txt?raw';

const NADIANA_LOGO_BASE64 = `data:image/png;base64,${logoBase64.trim()}`;

export function printUsedItemLabel(
  produtoNome: string,
  size: '100x50' | '50x30',
  codigoItem?: number
) {
  // Para a etiqueta 50x30 dupla, a largura total física da página é de aprox 104mm (50mm + 4mm gap + 50mm)
  const pageWidth = size === '100x50' ? '100mm' : '104mm';
  const pageHeight = size === '100x50' ? '50mm' : '30mm';
  
  const labelWidth = size === '100x50' ? '100mm' : '50mm';
  const labelHeight = size === '100x50' ? '50mm' : '30mm';
  
  const printWindow = window.open('', '_blank', 'width=600,height=400');
  if (!printWindow) {
    alert('Por favor, permita pop-ups neste site para imprimir a etiqueta.');
    return;
  }

  const codFormatado = codigoItem ? String(codigoItem).padStart(5, '0') : '-';

  const labelContent = `
    <div class="header">NADIANA AGRONEGOCIOS</div>
    <div class="code">CÓD: ${codFormatado}</div>
    <div class="product-container">
      <img src="${NADIANA_LOGO_BASE64}" class="logo" />
      <div class="title">${produtoNome}</div>
    </div>
    <div class="footer">PEÇAS USADAS - ESTOQUE</div>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Imprimir Etiqueta - ${produtoNome}</title>
        <style>
          @page {
            size: ${pageWidth} ${pageHeight};
            margin: 0 !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            width: ${pageWidth};
            height: ${pageHeight};
            display: flex;
            flex-direction: ${size === '100x50' ? 'column' : 'row'};
            justify-content: ${size === '100x50' ? 'center' : 'space-between'};
            align-items: center;
            box-sizing: border-box;
            background: white;
            ${size === '100x50' ? 'padding: 2mm;' : 'padding: 0;'}
          }
          .label-box {
            width: ${labelWidth};
            height: ${labelHeight};
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            padding: ${size === '100x50' ? '4mm' : '2mm'};
            border: 1px dashed #ccc; /* Guia visual fraco para não sujar a impressão */
            border-radius: 4px;
          }
          .header {
            font-size: ${size === '100x50' ? '12px' : '7px'};
            font-weight: bold;
            text-align: center;
            border-bottom: 1px solid black;
            padding-bottom: 1mm;
            margin-bottom: 1mm;
            text-transform: uppercase;
          }
          .code {
            font-size: ${size === '100x50' ? '18px' : '12px'};
            font-weight: 800;
            text-align: center;
            margin-bottom: 0.5mm;
            color: #000;
            letter-spacing: 0.5px;
          }
          .product-container {
            display: flex;
            align-items: center;
            gap: 2mm;
            flex-grow: 1;
            margin: 1mm 0;
            overflow: hidden;
          }
          .logo {
            height: ${size === '100x50' ? '12mm' : '8mm'};
            width: auto;
            object-fit: contain;
            flex-shrink: 0;
          }
          .title {
            font-size: ${size === '100x50' ? '16px' : '10px'};
            font-weight: 900;
            text-align: left;
            text-transform: uppercase;
            line-height: 1.1;
            flex-grow: 1;
          }
          .footer {
            font-size: ${size === '100x50' ? '10px' : '6px'};
            text-align: center;
            margin-top: auto;
            border-top: 1px solid #ccc;
            padding-top: 1mm;
          }
        </style>
      </head>
      <body>
        ${size === '100x50' ? `
          <div class="label-box">
            ${labelContent}
          </div>
        ` : `
          <div class="label-box">
            ${labelContent}
          </div>
          <div class="label-box">
            ${labelContent}
          </div>
        `}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 200);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
