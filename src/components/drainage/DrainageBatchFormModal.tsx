import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, AlertCircle, ChevronDown, ChevronUp, Trash2, Camera } from 'lucide-react';
import { MultiSelect } from '../ui/MultiSelect'; // Import component
import { fuelService } from '../../services/fuelService';
import { notificationService } from '../../services/notificationService';
import { drainageService } from '../../services/drainageService';
import type { Posto, Fazenda } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDrainageSubmit } from '../../hooks/useDrainageSubmit';
import { toast } from 'react-hot-toast';
import { PhotoEvidenceUploader } from '../ui/PhotoEvidenceUploader';
import { StationEntry, ASPECT_OPTIONS } from './SharedDrainageTypes';
import { DrainageBatchStationCard } from './DrainageBatchStationCard';

interface DrainageBatchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}
export function DrainageBatchFormModal({ isOpen, onClose }: DrainageBatchFormModalProps) {
  const { user } = useAuth();
  const { mutateAsync: submitBatch } = useDrainageSubmit();
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [selectedFazendaId, setSelectedFazendaId] = useState('');
  const [entries, setEntries] = useState<StationEntry[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]); // Posto IDs that are expanded
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dataDrenagem, setDataDrenagem] = useState(new Date().toISOString().split('T')[0]);

  // Load farms on mount
  useEffect(() => {
    if (isOpen) {
      loadFazendas();
      // Reset state
      setSelectedFazendaId('');
      setEntries([]);
      setExpandedGroupIds([]);
      setDataDrenagem(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  // Load stations when farm is selected
  useEffect(() => {
    if (selectedFazendaId) {
      loadStations(selectedFazendaId);
    } else {
      setEntries([]);
    }
  }, [selectedFazendaId]);

  async function loadFazendas() {
    try {
      // Only load farms that have stations configured for drainage
      const data = await drainageService.getFarmsWithDrainageStations();
      setFazendas(data);

      // Default logic:
      // 1. If user has a specific farm assigned, select it (but still allow changing if they have permissions)
      if (user?.fazenda_id) {
        const userFarm = data.find((f) => f.id === user.fazenda_id);
        if (userFarm) {
          setSelectedFazendaId(userFarm.id);
        }
      } else if (data.length === 1) {
        // If only one farm available, select it
        setSelectedFazendaId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar fazendas:', error);
    }
  }

  async function loadStations(fazendaId: string) {
    setLoading(true);
    try {
      const data = await fuelService.getPostos(fazendaId);
      // Filter: Active AND Physical AND Show in Drainage (default true if undefined)
      const physicalStations = data.filter(
        (p) => p.ativo && p.tipo === 'FISICO' && p.exibir_na_drenagem !== false, // Treat undefined/null as true
      );

      // Initialize entries
      const initialEntries: StationEntry[] = [];

      physicalStations.forEach((p) => {
        const hasSubTanks =
          p.tanques_adicionais &&
          Array.isArray(p.tanques_adicionais) &&
          p.tanques_adicionais.length > 0;

        // 1. Posto Only (If no sub-tanks)
        if (!hasSubTanks) {
          initialEntries.push({
            postoId: p.id,
            stationName: p.nome,
            tankName: 'Tanque Principal',
            tanqueIdentificador: undefined,
            litros: '',
            aspecto: '',
            destino: '',
            observacoes: '',
            photos: [],
            photoPreviews: [],
          });
        }

        // 2. Additional Tanks (If present)
        if (hasSubTanks) {
          p.tanques_adicionais!.forEach((t: { id: string; nome: string }) => {
            initialEntries.push({
              postoId: p.id,
              stationName: p.nome,
              tankName: t.nome,
              tanqueIdentificador: t.nome,
              litros: '',
              aspecto: '',
              destino: '',
              observacoes: '',
              photos: [],
              photoPreviews: [],
            });
          });
        }
      });
      setEntries(initialEntries);
      setExpandedGroupIds([]); // Start all collapsed as requested ("minimizados")
    } catch (error) {
      console.error('Erro ao carregar postos:', error);
    } finally {
      setLoading(false);
    }
  }

  // Handlers for entry updates...
  const updateEntry = (index: number, field: keyof StationEntry, value: any) => {
    setEntries((prev) => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], [field]: value };
      return newEntries;
    });
  };

  const handlePhotoSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      addFilesToEntry(index, newFiles);
    }
  };

  const handleDropFiles = (index: number, newFiles: File[]) => {
    if (newFiles.length > 0) {
      addFilesToEntry(index, newFiles);
    }
  };

  const addFilesToEntry = (index: number, newFiles: File[]) => {
    setEntries((prev) => {
      const newEntries = [...prev];
      const currentEntry = newEntries[index];

      const updatedPhotos = [...currentEntry.photos, ...newFiles];
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      const updatedPreviews = [...currentEntry.photoPreviews, ...newPreviews];

      newEntries[index] = {
        ...currentEntry,
        photos: updatedPhotos,
        photoPreviews: updatedPreviews,
      };
      return newEntries;
    });
  };

  const removePhoto = (entryIndex: number, photoIndex: number) => {
    setEntries((prev) => {
      const newEntries = [...prev];
      const currentEntry = newEntries[entryIndex];

      // Revoke URL
      URL.revokeObjectURL(currentEntry.photoPreviews[photoIndex]);

      const updatedPhotos = currentEntry.photos.filter((_, i) => i !== photoIndex);
      const updatedPreviews = currentEntry.photoPreviews.filter((_, i) => i !== photoIndex);

      newEntries[entryIndex] = {
        ...currentEntry,
        photos: updatedPhotos,
        photoPreviews: updatedPreviews,
      };
      return newEntries;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter entries that have at least some data filled (Litros is a good indicator)
    const filledEntries = entries.filter((ent) => ent.litros && parseFloat(ent.litros) > 0);

    if (filledEntries.length === 0) {
      toast.error('Preencha os dados de pelo menos um posto para salvar.');
      return;
    }

    // Validate required fields for filled entries
    const invalid = filledEntries.some((ent) => !ent.aspecto || !ent.destino);
    if (invalid) {
      toast.error('Para os postos preenchidos, Aspecto e Destino são obrigatórios.');
      return;
    }

    // Validate photos for filled entries (NEW REQUIREMENT)
    const missingPhotos = filledEntries.some((ent) => ent.photos.length === 0);
    if (missingPhotos) {
      toast.error(
        'É obrigatório anexar pelo menos uma foto (Evidência) para cada posto preenchido.',
      );
      return;
    }

    // NEW VALIDATION: Check for partial multi-tank stations
    const involvedStationIds = new Set(filledEntries.map((e) => e.postoId));

    for (const postoId of involvedStationIds) {
      const stationEntries = entries.filter((e) => e.postoId === postoId); // All entries for this station
      const filledStationEntries = stationEntries.filter(
        (e) => e.litros && parseFloat(e.litros) > 0,
      ); // Filled ones

      if (filledStationEntries.length < stationEntries.length) {
        // Found a partial fill
        const stationName = stationEntries[0].stationName;
        toast.error(
          `O posto "${stationName}" possui tanques não preenchidos. Por favor, preencha todos os tanques deste posto.`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const selectedFazenda = fazendas.find((f) => f.id === selectedFazendaId);
      const args = filledEntries.map((entry) => {
        const aspectValues = entry.aspecto ? entry.aspecto.split(', ') : [];
        const aspectLabels = aspectValues.map((val) => {
          const option = ASPECT_OPTIONS.find((o) => o.value === val);
          return option ? option.label : val;
        });
        const emailAspecto = aspectLabels.join('<br/>');

        return {
          drainage: {
            posto_id: entry.postoId,
            fazenda_id: selectedFazendaId || user?.fazenda_id || '',
            usuario_id: user?.id || '',
            data_drenagem: new Date(dataDrenagem).toISOString(),
            litros_drenados: Number(entry.litros),
            aspecto_residuo: entry.aspecto,
            destino_residuo: entry.destino,
            observacoes: entry.observacoes,
            tanque_identificador: entry.tanqueIdentificador,
          },
          photos: entry.photos,
          fazendaNome: selectedFazenda?.nome,
          stationName: entry.stationName,
          usuarioEmail: user?.email,
          usuarioNome: user?.nome,
          sendEmail: true,
        };
      });

      // Submeter a mutação para o Lote inteiro
      const { records, emailSent, emailError } = await submitBatch(args);

      let msg = `${records.length} drenagens registradas com sucesso!`;
      if (emailSent) {
        msg += '\n✅ Relatório enviado por e-mail.';
        toast.success(msg, { duration: 5000 });
      } else if (emailError) {
        msg += `\n⚠️ Mas houve um erro no e-mail: ${emailError}`;
        toast.success(msg, { duration: 6000, icon: '⚠️' });
      } else {
        toast.success(msg);
      }

      onClose();
    } catch (error: any) {
      console.error('Erro no salvamento em lote:', error);
      toast.error('Erro ao salvar algumas drenagens. Verifique as fotos ou tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Registrar Drenagem em Lote</h2>
            <p className="text-xs text-slate-400 font-medium">
              Preencha os dados dos tanques drenados
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Context Data */}
          <div className="w-[300px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                <AlertCircle size={12} /> Contexto
              </div>

              {/* Data */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">
                  Data da Drenagem
                </label>
                <input
                  type="date"
                  required
                  value={dataDrenagem}
                  onChange={(e) => setDataDrenagem(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Usuário (Travado) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">
                  Responsável
                </label>
                <input
                  type="text"
                  value={user?.nome || ''}
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 border border-transparent rounded-lg text-slate-500 text-sm font-medium select-none"
                />
              </div>

              {/* Fazenda */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">
                  Fazenda
                </label>
                <select
                  value={selectedFazendaId}
                  onChange={(e) => setSelectedFazendaId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  disabled={loading && fazendas.length === 0}
                >
                  <option value="">Selecione uma fazenda...</option>
                  {fazendas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="text-xs font-bold text-blue-800 mb-2">Resumo</h4>
                <div className="text-sm text-blue-600">
                  <span className="font-bold text-lg">
                    {entries.filter((e) => e.litros && parseFloat(e.litros) > 0).length}
                  </span>
                  <span className="opacity-80 ml-1">postos preenchidos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Station List */}
          <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-4xl mx-auto space-y-4">
                  {loading ? (
                    <div className="text-center py-20">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-slate-400 font-medium">Carregando postos...</p>
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} className="text-slate-400 opacity-50" />
                      </div>
                      <h3 className="text-slate-600 font-bold text-lg mb-1">
                        Nenhum posto encontrado
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Selecione uma fazenda para carregar os postos de monitoramento.
                      </p>
                    </div>
                  ) : (
                    // Group entries by postoId for rendering
                    Array.from(new Set(entries.map((e) => e.postoId))).map((postoId) => {
                      const stationEntries = entries.filter((e) => e.postoId === postoId);
                      const firstEntry = stationEntries[0];
                      const isExpanded = expandedGroupIds.includes(postoId);
                      const isFilled = stationEntries.some(
                        (e) => e.litros && parseFloat(e.litros) > 0,
                      );

                      return (
                        <DrainageBatchStationCard
                          key={postoId}
                          postoId={postoId}
                          stationEntries={stationEntries}
                          globalIndices={stationEntries.map((e) => entries.indexOf(e))}
                          isExpanded={isExpanded}
                          onToggleExpand={() => {
                            setExpandedGroupIds((prev) =>
                              prev.includes(postoId)
                                ? prev.filter((id) => id !== postoId)
                                : [...prev, postoId],
                            );
                          }}
                          onUpdateEntry={updateEntry}
                          onPhotoSelect={handlePhotoSelect}
                          onDropFiles={handleDropFiles}
                          onRemovePhoto={removePhoto}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white z-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-sm transition-colors"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || entries.filter((e) => e.litros).length === 0}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-blue-200 transition-all active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Salvar Lote
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
