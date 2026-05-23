import * as XLSX from 'xlsx';

/**
 * Exporta um array de objetos para um arquivo Excel (.xlsx)
 * @param data Array de objetos com os dados
 * @param fileName Nome do arquivo (sem extensão)
 * @param sheetName Nome da aba (default: 'Dados')
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Dados') {
  try {
    if (!data || data.length === 0) {
      console.warn('Exportação ignorada: Nenhum dado fornecido.');
      return;
    }

    // Criar a planilha a partir dos dados JSON
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Criar um novo livro de trabalho (Workbook)
    const workbook = XLSX.utils.book_new();
    
    // Adicionar a planilha ao livro
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Gerar o nome do arquivo com a data atual
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const fullFileName = `${fileName.replace(/\s+/g, '_')}_${dateStr}.xlsx`;

    // Disparar o download do arquivo
    XLSX.writeFile(workbook, fullFileName);
  } catch (error) {
    console.error('Erro crítico ao exportar para Excel:', error);
    throw new Error('Falha ao gerar arquivo Excel. Verifique o console para detalhes.');
  }
}
