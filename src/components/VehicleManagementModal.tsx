import { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, Truck } from 'lucide-react';
import { vehicleService } from '../services/vehicleService';
import type { Veiculo } from '../types';

// UI
import { ModalHeader } from './ui/ModalHeader';
import { ModalFooter } from './ui/ModalFooter';

interface VehicleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VehicleManagementModal({ isOpen, onClose }: VehicleManagementModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [vehicles, setVehicles] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'import'>('list');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load vehicles on mount/open
  useEffect(() => {
    if (isOpen) {
      loadVehicles();
    }
  }, [isOpen]);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getAll(false); // Get all to show status
      setVehicles(data);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar veículos.');
    } finally {
      setLoading(false);
    }
  };

  // --- Drag & Drop logic ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleFiles = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('Por favor, envie um arquivo .csv');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      await processCSV(text);
    };
    reader.readAsText(file, 'ISO-8859-1'); // Force Latin1 to handle accents like Ã
  };

  const processCSV = async (text: string) => {
    setImporting(true);
    try {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error('Arquivo vazio ou sem cabeçalho.');

      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0]
        .toLowerCase()
        .split(separator)
        .map((h) => h.trim().replace(/^"|"$/g, ''));

      const idIndex = headers.indexOf('id');
      const nameIndex = headers.findIndex(
        (h) => h.includes('identificacao') || h.includes('identificação'),
      );

      if (idIndex === -1 || nameIndex === -1) {
        throw new Error("As colunas 'id' e 'identificacao' não foram encontradas no cabeçalho.");
      }

      const parsedVehicles: Partial<Veiculo>[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Handle split carefully (basic implementation)
        const cols = lines[i].split(separator).map((c) => c.trim().replace(/^"|"$/g, ''));

        if (cols.length > Math.max(idIndex, nameIndex)) {
          parsedVehicles.push({
            id: cols[idIndex],
            identificacao: cols[nameIndex],
          });
        }
      }

      console.log(`Processando ${parsedVehicles.length} veículos...`);

      await vehicleService.upsertBatch(parsedVehicles);

      alert(`Sucesso! ${parsedVehicles.length} veículos processados.`);
      loadVehicles(); // Reload list
      setActiveTab('list'); // Go back to list
    } catch (error: any) {
      console.error(error);
      alert(`Erro na importação: ${error.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          title="Gestão de Frota"
          subtitle="Nuntec Agro Mobile"
          icon={Truck}
          onClose={onClose}
        />

        {/* Tabs / Filters */}
        <div className="px-6 py-3 border-b border-slate-100 flex gap-4 bg-white">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'list' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Veículos Cadastrados ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'import' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Importar CSV
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div
                className={`
                                    border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300
                                    ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                                    ${importing ? 'opacity-50 pointer-events-none' : ''}
                                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv,.txt"
                  onChange={handleFileInput}
                />

                {importing ? (
                  <div className="flex flex-col items-center animate-pulse">
                    <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">Processando arquivo...</h3>
                    <p className="text-sm text-slate-500">Isso pode levar alguns segundos.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      Arraste seu arquivo CSV aqui
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      ou clique para selecionar do computador
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                      <FileSpreadsheet size={14} />
                      <span>Formato esperado: id; identificacao</span>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-800">Importante</h4>
                  <p className="text-xs text-yellow-700 mt-1">
                    O arquivo deve conter cabeçalho. IDs existentes serão atualizados (Upsert).
                    Novos IDs serão criados.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-500">Carregando...</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 w-24">ID</th>
                      <th className="px-4 py-3">Identificação</th>
                      <th className="px-4 py-3 w-32 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {vehicles.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-400">
                          Nenhum veículo cadastrado.
                        </td>
                      </tr>
                    ) : (
                      vehicles.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-500">{v.id}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {v.identificacao}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {v.ativo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                <CheckCircle size={12} /> Ativo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                                Inativo
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <ModalFooter>
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            Fechar
          </button>
        </ModalFooter>
      </div>
    </div>
  );
}
