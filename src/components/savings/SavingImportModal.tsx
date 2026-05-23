import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';
import { savingService } from '../../services/savingService';
import { supplierService } from '../../services/supplierService';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SavingImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SavingImportModal({ isOpen, onClose, onSuccess }: SavingImportModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, success: 0, failed: 0 });

  const parseValue = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    // Remove "R$ ", "." e troca "," por "."
    let s = val.toString().replace(/R\$\s?/g, '').trim();
    if (s.includes(',') && s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    return Number(s) || 0;
  };

  const parseDate = (val: any): string => {
    try {
      if (!val) return new Date().toISOString().split('T')[0];
      
      if (val instanceof Date) {
        if (!isNaN(val.getTime())) {
          return val.toISOString().split('T')[0];
        }
      }
      
      const s = val.toString().trim();
      
      // Excel date serial number (trata tanto number quanto string com números ex: "46177.999")
      const num = Number(s);
      if (!isNaN(num) && s !== '') {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // Formato com barras
      if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length === 3) {
          const [p1, p2, yearStr] = parts;
          let cleanYear = yearStr.split(' ')[0];
          if (cleanYear.length === 2) {
            cleanYear = '20' + cleanYear;
          }
          
          let day = p1;
          let month = p2;
          // Se p2 > 12, é impossível ser o mês (DD/MM), então deve ser formato MM/DD
          if (Number(p2) > 12) {
            month = p1;
            day = p2;
          }
          
          return `${cleanYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      
      // Fallback ISO padrão
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      
      return new Date().toISOString().split('T')[0];
    } catch (err) {
      return new Date().toISOString().split('T')[0];
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          setPreviewData(data.slice(0, 5)); // show first 5
        } catch (err) {
          console.error(err);
          toast.error("Erro ao ler o arquivo Excel/CSV.");
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          let successCount = 0;
          let failCount = 0;

          // Puxa todos fornecedores ativos para tentar fazer o match
          const suppliers = await supplierService.getActive();
          // Puxa usuários para vincular o criador (comprador)
          const { data: usersDb } = await supabase.from('usuarios').select('id, nome');

          let rowIndex = 0;
          for (const row of data as any[]) {
            rowIndex++;
            try {
              // Normaliza as chaves da linha para lowercase para evitar problemas de case-sensitive
              const normalizedRow: Record<string, any> = {};
              Object.keys(row).forEach(k => {
                normalizedRow[k.toLowerCase().trim()] = row[k];
              });

              const normalizeBuyerName = (name: string) => {
                const upperName = name.trim().toUpperCase();
                if (upperName.startsWith('ENIO CARLOS')) return 'ENIO CARLOS NASCIMENTO';
                if (upperName.startsWith('LUCIANA SILVA')) return 'LUCIANA SILVA COSTA';
                if (upperName.startsWith('MAURICIO FIOR')) return 'MAURICIO FIOR GUTSTEIN';
                if (upperName.startsWith('RAIMUNDA MARQU')) return 'RAIMUNDA MARQUES SOUSA';
                return upperName;
              };

              // Extração dos campos (case-insensitive)
              const dataRow = normalizedRow['data'];
              const compradorRaw = (normalizedRow['comprador'] || user?.nome || 'Importado').toString();
              const comprador = normalizeBuyerName(compradorRaw);
              const n_cotacao = (normalizedRow['n_cotacao'] || normalizedRow['cotação'] || normalizedRow['cotacao'] || 'S/N').toString().toUpperCase();
              const fornecedorNome = normalizedRow['fornecedor'] || '';
              const valorInicialStr = normalizedRow['valor_inicial'] || normalizedRow['valor inicial'] || 0;
              const valorFinalStr = normalizedRow['valor_final'] || normalizedRow['valor final'] || 0;

              const valor_inicial = parseValue(valorInicialStr);
              const valor_final = parseValue(valorFinalStr);
              const dataParsed = parseDate(dataRow);

              // Tenta achar o fornecedor
              let fornecedorId = null;
              const nomeRealFornecedor = fornecedorNome || 'FORNECEDOR NÃO INFORMADO';
              
              const found = suppliers.find(s => s.razao_social.toLowerCase().includes(nomeRealFornecedor.toLowerCase()) || nomeRealFornecedor.toLowerCase().includes(s.razao_social.toLowerCase()));
              if (found) {
                fornecedorId = found.id;
              } else {
                // Para facilitar a migração massiva, geramos um CNPJ fake único usando o rowIndex
                const dummyCnpj = String(Date.now()).slice(-8) + String(rowIndex).padStart(6, '0');
                
                const newSup = await supplierService.create({
                  razao_social: nomeRealFornecedor,
                  nome_fantasia: nomeRealFornecedor,
                  cnpj: dummyCnpj,
                  ativo: true
                });
                  suppliers.push(newSup); // add para proximas iteracoes
                  fornecedorId = newSup.id;
                }

              // Tenta achar o usuário para vincular como dono do registro
              let createdById = user?.id;
              if (comprador && usersDb) {
                const foundUser = usersDb.find(u => 
                  u.nome.toLowerCase().trim() === comprador.toLowerCase().trim() ||
                  comprador.toLowerCase().trim().includes(u.nome.toLowerCase().trim())
                );
                if (foundUser) {
                  createdById = foundUser.id;
                }
              }

              if (fornecedorId) {
                await savingService.create({
                  data: dataParsed,
                  comprador,
                  n_cotacao: String(n_cotacao),
                  fornecedor_id: fornecedorId,
                  valor_inicial,
                  valor_final,
                  created_by: createdById
                });
                successCount++;
              } else {
                failCount++;
              }
            } catch (err) {
              console.error('Erro na linha', row, err);
              failCount++;
            }
          }

          setImportStats({ total: data.length, success: successCount, failed: failCount });
          toast.success(`Importação concluída: ${successCount} salvos.`);
          onSuccess();
        } catch (err) {
          console.error(err);
          toast.error("Falha ao processar dados da planilha.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error(error);
      setLoading(false);
      toast.error('Erro no arquivo.');
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setImportStats({ total: 0, success: 0, failed: 0 });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Importar Planilha (XLSX / CSV)</h2>
              <p className="text-sm text-slate-500">Migre dados históricos de Saving para o sistema.</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!file && (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <FileText size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Selecione o arquivo</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                O arquivo deve conter as colunas: Data, Comprador, N_Cotacao, Fornecedor, Valor_Inicial e Valor_Final.
              </p>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all">
                Escolher Arquivo
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}

          {file && previewData.length > 0 && importStats.total === 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setFile(null); setPreviewData([]); }}
                  className="text-sm text-red-500 font-bold hover:underline"
                >
                  Trocar Arquivo
                </button>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-amber-800">
                  <strong>Atenção:</strong> Fornecedores não encontrados no sistema serão criados automaticamente (sem CNPJ) para garantir a integridade da importação.
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pré-visualização (5 primeiras linhas)</p>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50">
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="p-2 border-b border-slate-200 font-bold text-slate-600">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.map((row, i) => (
                        <tr key={i}>
                          {Object.entries(row).map(([key, val]: [string, any], j) => {
                            let displayVal = String(val).substring(0, 30);
                            if (key.toLowerCase() === 'data') {
                              displayVal = parseDate(val).split('-').reverse().join('/'); // Mostra DD/MM/YYYY na preview
                            }
                            return (
                              <td key={j} className="p-2 text-slate-600">{displayVal}</td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {importStats.total > 0 && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Processamento Concluído</h3>
              <div className="grid grid-cols-3 gap-4 w-full">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold">Total Linhas</p>
                  <p className="text-2xl font-black text-slate-700">{importStats.total}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-xs text-emerald-600 font-bold">Sucesso</p>
                  <p className="text-2xl font-black text-emerald-700">{importStats.success}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <p className="text-xs text-red-600 font-bold">Falhas</p>
                  <p className="text-2xl font-black text-red-700">{importStats.failed}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {importStats.total > 0 ? 'Fechar' : 'Cancelar'}
          </button>
          
          {file && importStats.total === 0 && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload size={18} />
              )}
              Iniciar Importação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
