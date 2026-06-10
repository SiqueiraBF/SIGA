import React, { useState } from 'react';
import { db } from '../../../services/supabaseService';
import { PdmAbreviacao } from '../../../types';
import { Plus, Trash2, Tag, Search } from 'lucide-react';
import { FormField } from '../../ui/FormField';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { FilterBar } from '../../ui/FilterBar';
import { DataTable } from '../../ui/DataTable';
import toast from 'react-hot-toast';

interface AbbreviationEditorProps {
  abreviacoes: PdmAbreviacao[];
  setAbreviacoes: (abrevs: PdmAbreviacao[]) => void;
  isAdmin: boolean;
  setPdmConfirmDialog: (dialog: any) => void;
  setSuccessMsg: (msg: string) => void;
  setSuccess: (val: boolean) => void;
}

export function AbbreviationEditor({ 
  abreviacoes, 
  setAbreviacoes, 
  isAdmin, 
  setPdmConfirmDialog,
  setSuccessMsg,
  setSuccess
}: AbbreviationEditorProps) {
  const [newAbrevTerm, setNewAbrevTerm] = useState('');
  const [newAbrevVal, setNewAbrevVal] = useState('');
  const [abbrevSearch, setAbbrevSearch] = useState('');

  // Add Abbreviation
  const handleAddAbbrev = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const term = newAbrevTerm.trim().toUpperCase();
    const val = newAbrevVal.trim().toUpperCase();
    if (!term || !val) return;

    if (abreviacoes.some(a => a.termo === term)) {
      toast.error('Esta abreviação já está cadastrada.');
      return;
    }

    try {
      const newAbrev: PdmAbreviacao = { termo: term, abreviacao: val };
      await db.insertPdmAbreviacao(newAbrev);
      const updated = [...abreviacoes, newAbrev].sort((a, b) => a.termo.localeCompare(b.termo));
      setAbreviacoes(updated);
      setNewAbrevTerm('');
      setNewAbrevVal('');
      setSuccessMsg('Abreviação adicionada!');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error('Erro ao adicionar abreviação:', err);
      toast.error('Erro ao salvar no banco.');
    }
  };

  // Delete Abbreviation
  const handleDeleteAbbrev = (termo: string) => {
    if (!isAdmin) return;
    setPdmConfirmDialog({
      isOpen: true,
      title: 'Remover Abreviação',
      description: `Deseja remover a abreviação para "${termo}"?`,
      variant: 'danger',
      confirmLabel: 'Remover',
      onConfirm: async () => {
        try {
          await db.deletePdmAbreviacao(termo);
          setAbreviacoes(abreviacoes.filter(a => a.termo !== termo));
          toast.success('Abreviação removida!');
        } catch (err) {
          console.error('Erro ao excluir abreviação:', err);
          toast.error('Erro ao remover do banco.');
        }
      },
    });
  };

  const filteredAbreviacoes = abreviacoes.filter(a => 
    a.termo.includes(abbrevSearch.toUpperCase()) || 
    a.abreviacao.includes(abbrevSearch.toUpperCase())
  );

  return (
    <div className="space-y-4">
      <form onSubmit={handleAddAbbrev} className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl flex flex-col sm:flex-row items-end gap-4">
        <FormField label="Novo Termo" className="w-full sm:w-48">
          <Input
            placeholder="EX: SEXTAVADO"
            value={newAbrevTerm}
            onChange={(e) => setNewAbrevTerm(e.target.value)}
            className="font-mono uppercase"
          />
        </FormField>
        <FormField label="Abreviação" className="w-full sm:w-40">
          <Input
            placeholder="EX: SEXT"
            value={newAbrevVal}
            onChange={(e) => setNewAbrevVal(e.target.value)}
            className="font-mono uppercase"
          />
        </FormField>
        <Button type="submit" variant="primary" icon={Plus} className="w-full sm:w-auto mb-1">
          Adicionar
        </Button>
      </form>

      {/* Table & Search */}
      <div className="space-y-3">
        <FilterBar
          searchValue={abbrevSearch}
          onSearch={setAbbrevSearch}
          searchPlaceholder="Buscar termos ou abreviações..."
        />

        <DataTable
          data={filteredAbreviacoes}
          rowKey={(a) => a.termo}
          pageSize={8}
          emptyTitle="Nenhuma abreviação"
          emptyDescription="Cadastre novas siglas e regras acima."
          emptyIcon={Tag}
          columns={[
            {
              key: 'termo',
              label: 'Termo Original',
              sortable: true,
              sortValue: (r) => r.termo,
              render: (r) => <span className="font-medium text-slate-700">{r.termo}</span>
            },
            {
              key: 'abreviacao',
              label: 'Abreviação Obrigatória',
              sortable: true,
              sortValue: (r) => r.abreviacao,
              render: (r) => <span className="font-mono font-bold text-blue-700">{r.abreviacao}</span>
            }
          ]}
          renderActions={(r) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteAbbrev(r.termo)}
              icon={Trash2}
              className="text-slate-400 hover:text-red-600 hover:bg-red-50"
            />
          )}
        />
      </div>
    </div>
  );
}
