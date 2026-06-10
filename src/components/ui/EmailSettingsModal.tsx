import React, { useState, useEffect } from 'react';
import { Save, Mail, AlertCircle, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { farmService } from '../../services/farmService';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Modal } from './Modal';
import { ModalHeader } from './ModalHeader';
import { ModalFooter } from './ModalFooter';
import { Button } from './Button';
import { FormField } from './FormField';
import { Select } from './Select';
import { EmailChipsInput } from './EmailChipsInput';

interface EmailStep {
  title: string;
  subtitle: string;
  configKeyPrefix: string;
}

interface EmailSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  steps: EmailStep[];
  globalMode?: boolean;
}

export function EmailSettingsModal({ isOpen, onClose, title, subtitle, steps, globalMode }: EmailSettingsModalProps) {
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  
  const [stepData, setStepData] = useState<Record<string, { to: string; cc: string }>>({});

  const isAdmin = role?.nome === 'Administrador';

  useEffect(() => {
    if (isOpen) {
      if (globalMode) {
        loadGlobalParameters();
      } else {
        loadFarms();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedFarm && !globalMode) {
      loadParameters();
    }
  }, [selectedFarm]);

  const loadFarms = async () => {
    try {
      const data = await farmService.getFarms();
      setFarms(data);
      if (data.length > 0 && !selectedFarm) {
        setSelectedFarm(data[0].id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadGlobalParameters = async () => {
    setLoading(true);
    const initialData: Record<string, { to: string; cc: string }> = {};
    steps.forEach(s => {
      initialData[s.configKeyPrefix] = { to: '', cc: '' };
    });
    setStepData(initialData);

    try {
      // Buscar tanto as chaves novas (JSON) quanto as legadas (_to/_cc)
      const newKeys = steps.map(s => s.configKeyPrefix);
      const legacyKeys = steps.flatMap(s => [`${s.configKeyPrefix}_to`, `${s.configKeyPrefix}_cc`]);
      const allKeys = [...newKeys, ...legacyKeys];

      const { data, error } = await supabase
        .from('system_parameters')
        .select('*')
        .in('key', allKeys);

      if (error) throw error;

      const newStepData = { ...initialData };
      steps.forEach(step => {
        const param = data?.find(p => p.key === step.configKeyPrefix);
        if (param) {
          // Novo formato JSON encontrado
          try {
            const parsed = JSON.parse(param.value);
            newStepData[step.configKeyPrefix] = {
              to: parsed.to || '',
              cc: parsed.cc || ''
            };
          } catch {
            newStepData[step.configKeyPrefix] = {
              to: param.value || '',
              cc: ''
            };
          }
        } else {
          // Fallback: ler chaves legadas _to e _cc
          const legacyTo = data?.find(p => p.key === `${step.configKeyPrefix}_to`);
          const legacyCc = data?.find(p => p.key === `${step.configKeyPrefix}_cc`);
          if (legacyTo || legacyCc) {
            newStepData[step.configKeyPrefix] = {
              to: (legacyTo?.value || '').replace(/,/g, ';'),
              cc: (legacyCc?.value || '').replace(/,/g, ';')
            };
          }
        }
      });
      setStepData(newStepData);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadParameters = async () => {
    setLoading(true);
    const initialData: Record<string, { to: string; cc: string }> = {};
    steps.forEach(s => {
      initialData[s.configKeyPrefix] = { to: '', cc: '' };
    });
    setStepData(initialData);

    try {
      const keys = steps.map(s => `${s.configKeyPrefix}_${selectedFarm}`);
      const { data, error } = await supabase
        .from('system_parameters')
        .select('*')
        .in('key', keys);

      if (error) throw error;

      const newStepData = { ...initialData };

      steps.forEach(step => {
        const param = data?.find(p => p.key === `${step.configKeyPrefix}_${selectedFarm}`);
        if (param) {
          try {
            const parsed = JSON.parse(param.value);
            newStepData[step.configKeyPrefix] = {
              to: parsed.to || '',
              cc: parsed.cc || ''
            };
          } catch {
            // Fallback legacy value
            newStepData[step.configKeyPrefix] = {
              to: param.value || '',
              cc: ''
            };
          }
        }
      });

      setStepData(newStepData);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleStepDataChange = (prefix: string, field: 'to' | 'cc', value: string) => {
    setStepData(prev => ({
      ...prev,
      [prefix]: {
        ...prev[prefix],
        [field]: value
      }
    }));
  };

  const saveParameters = async () => {
    if (!globalMode && !selectedFarm) return;
    setLoading(true);

    try {
      const upserts = steps.map(step => ({
        key: globalMode ? step.configKeyPrefix : `${step.configKeyPrefix}_${selectedFarm}`,
        value: JSON.stringify(stepData[step.configKeyPrefix]),
        description: globalMode
          ? `Destinatários da etapa (${step.title}) - Global (JSON)`
          : `Destinatários da etapa (${step.title}) da fazenda ${selectedFarm} (JSON)`
      }));

      for (const upsert of upserts) {
        await supabase
          .from('system_parameters')
          .upsert(upsert, { onConflict: 'key' });
      }

      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleReplicateToAll = async () => {
    if (!selectedFarm || farms.length <= 1) return;
    
    if (!window.confirm('Tem certeza que deseja aplicar as MESMAS configurações atuais para TODAS as filiais? Essa ação reescreverá as configurações existentes nas outras fazendas.')) return;
    
    setLoading(true);
    try {
      const upserts: any[] = [];
      farms.forEach(farm => {
        steps.forEach(step => {
          upserts.push({
            key: `${step.configKeyPrefix}_${farm.id}`,
            value: JSON.stringify(stepData[step.configKeyPrefix]),
            description: `Destinatários da etapa (${step.title}) da fazenda ${farm.id} (JSON)`
          });
        });
      });

      for (const upsert of upserts) {
        await supabase
          .from('system_parameters')
          .upsert(upsert, { onConflict: 'key' });
      }

      toast.success('Configurações replicadas para todas as filiais com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao replicar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleReplicateSingleField = async (prefix: string, field: 'to' | 'cc', title: string) => {
    if (!selectedFarm || farms.length <= 1) return;
    
    const fieldName = field === 'to' ? 'Para (To)' : 'Com Cópia (CC)';
    if (!window.confirm(`Tem certeza que deseja aplicar o campo "${fieldName}" da etapa "${title}" para TODAS as filiais? Essa ação reescreverá apenas este campo nas outras fazendas.`)) return;
    
    setLoading(true);
    try {
      const keys = farms.map(f => `${prefix}_${f.id}`);
      const { data: existingData } = await supabase
        .from('system_parameters')
        .select('*')
        .in('key', keys);

      const upserts: any[] = [];
      farms.forEach(farm => {
        const key = `${prefix}_${farm.id}`;
        const existingParam = existingData?.find(d => d.key === key);
        
        let currentJson = { to: '', cc: '' };
        if (existingParam) {
          try {
            currentJson = JSON.parse(existingParam.value);
          } catch {
            currentJson = { to: existingParam.value || '', cc: '' };
          }
        }
        
        currentJson[field] = stepData[prefix][field] || '';

        upserts.push({
          key,
          value: JSON.stringify(currentJson),
          description: `Destinatários da etapa (${title}) da fazenda ${farm.id} (JSON)`
        });
      });

      for (const upsert of upserts) {
        await supabase
          .from('system_parameters')
          .upsert(upsert, { onConflict: 'key' });
      }

      toast.success(`Campo replicado para todas as filiais com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao replicar campo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" className="!rounded-2xl">
      <ModalHeader 
        title={title}
        icon={Mail}
        onClose={onClose}
        subtitle={subtitle || "Separar contatos por ponto e vírgula (;)"}
      />

      <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh] bg-slate-50/50">
        {/* Seletor de Fazenda (oculto no modo global) */}
        {!globalMode && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <FormField label="Selecione a Unidade (Fazenda)">
                <Select
                  value={selectedFarm}
                  onChange={(e) => setSelectedFarm(e.target.value)}
                  options={farms.map((f) => ({ value: f.id, label: f.nome }))}
                />
              </FormField>
            </div>
            {isAdmin && (
              <Button
                variant="secondary"
                icon={Copy}
                onClick={handleReplicateToAll}
                disabled={loading || farms.length <= 1}
                className="h-[42px] whitespace-nowrap"
              >
                Copiar p/ Todas
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {steps.map((step, index) => (
            <div key={step.configKeyPrefix} className="bg-white border-2 border-slate-100 p-5 rounded-2xl relative shadow-sm">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 text-sm mb-0.5">{step.title}</h3>
                <span className="block text-[11px] text-slate-400 mb-3">{step.subtitle}</span>
                
                <FormField 
                  label="Para (To)"
                  actionRight={
                    !globalMode && isAdmin && farms.length > 1 ? (
                      <button 
                        onClick={() => handleReplicateSingleField(step.configKeyPrefix, 'to', step.title)}
                        className="text-blue-500 hover:text-blue-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                        title="Replicar este campo para todas as filiais"
                      >
                        <Copy size={12} /> Replicar
                      </button>
                    ) : null
                  }
                >
                  <EmailChipsInput
                    value={stepData[step.configKeyPrefix]?.to || ''}
                    onChange={(val) => handleStepDataChange(step.configKeyPrefix, 'to', val)}
                    placeholder="Digite e aperte Espaço ou Enter"
                    disabled={!isAdmin}
                  />
                </FormField>
              </div>

              <div>
                <FormField 
                  label="Com Cópia (CC)"
                  actionRight={
                    !globalMode && isAdmin && farms.length > 1 ? (
                      <button 
                        onClick={() => handleReplicateSingleField(step.configKeyPrefix, 'cc', step.title)}
                        className="text-blue-500 hover:text-blue-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                        title="Replicar este campo para todas as filiais"
                      >
                        <Copy size={12} /> Replicar
                      </button>
                    ) : null
                  }
                >
                  <EmailChipsInput
                    value={stepData[step.configKeyPrefix]?.cc || ''}
                    onChange={(val) => handleStepDataChange(step.configKeyPrefix, 'cc', val)}
                    placeholder="Opcional..."
                    disabled={!isAdmin}
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-amber-50 rounded-xl flex gap-3 text-amber-800 text-sm border border-amber-100 shadow-sm">
          <AlertCircle className="flex-shrink-0" size={20} />
          <p>
            Os remetentes (Quem envia) sempre serão definidos automaticamente pelo usuário logado no sistema que apertou o botão "Salvar".
          </p>
        </div>
      </div>

      <ModalFooter className="justify-between bg-white border-t border-slate-200">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Fechar
        </Button>
        
        {isAdmin && (
          <Button
            variant="primary"
            onClick={saveParameters}
            icon={Save}
            isLoading={loading}
            disabled={loading || (!globalMode && !selectedFarm)}
          >
            Salvar Destinatários
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
