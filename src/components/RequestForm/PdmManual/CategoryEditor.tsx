import React from 'react';
import { PdmCategoria } from '../../../types';
import { Plus, CheckCircle, Package, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { FilterBar } from '../../ui/FilterBar';
import { FormField } from '../../ui/FormField';
import { Textarea } from '../../ui/Textarea';
import { Input } from '../../ui/Input';
import { DynamicListInput } from './DynamicListInput';
import { ExampleListInput } from './ExampleListInput';
import toast from 'react-hot-toast';

interface CategoryEditorProps {
  categorias: PdmCategoria[];
  filteredCategorias: PdmCategoria[];
  selectedCategory?: PdmCategoria;
  editingCategoryId: string;
  setEditingCategoryId: (id: string) => void;
  catForm: {
    nome: string;
    descricao: string;
    estrutura_linear: string;
    diretrizes: string[];
    exemplos: string[];
  };
  setCatForm: (form: any) => void;
  updateLocalCat: (newState: any) => void;
  isAdmin: boolean;
  hasUnsavedChanges: (id: string) => boolean;
  setShowNewCatModal: (val: boolean) => void;
  categorySearch: string;
  setCategorySearch: (val: string) => void;
  handleDeleteCategory: (id: string, name: string) => void;
}

export function CategoryEditor({
  filteredCategorias,
  selectedCategory,
  editingCategoryId,
  setEditingCategoryId,
  catForm,
  setCatForm,
  updateLocalCat,
  isAdmin,
  hasUnsavedChanges,
  setShowNewCatModal,
  categorySearch,
  setCategorySearch,
  handleDeleteCategory
}: CategoryEditorProps) {

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
      {/* Sidebar List */}
      <div className="w-full lg:w-1/3 flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1.5">
            <Package size={14} className="text-blue-600" /> Categorias Base
          </label>
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowNewCatModal(true)}
              icon={Plus}
              className="h-7 text-[11px] px-2"
            >
              Nova Categoria
            </Button>
          )}
        </div>

        <FilterBar 
          searchValue={categorySearch}
          onSearch={setCategorySearch}
          searchPlaceholder="Buscar por código ou nome..."
        />
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar min-h-[400px] h-[calc(100vh-350px)]">
          {filteredCategorias.map(cat => {
            const isEditing = editingCategoryId === cat.id;
            const unsaved = hasUnsavedChanges(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setEditingCategoryId(cat.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 group ${
                  isEditing
                    ? 'bg-blue-50/50 border-blue-200 shadow-sm ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start w-full gap-2">
                   <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        isEditing ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {cat.id}
                      </span>
                      <span className={`text-[13px] font-bold truncate ${
                        isEditing ? 'text-blue-900' : 'text-slate-700'
                      }`}>
                        {cat.nome}
                      </span>
                   </div>
                   {unsaved && (
                     <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-sm" title="Alterações não salvas" />
                   )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="flex-1">
        {!selectedCategory ? (
          <div className="h-full min-h-[400px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <div className="text-center space-y-2">
               <Package className="mx-auto text-slate-300" size={32} />
               <p className="text-slate-500 text-sm font-medium">Selecione uma categoria para editar</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
            {/* Editor Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[11px] font-black">{selectedCategory.id}</span>
                  {isAdmin ? (
                    <input
                      type="text"
                      value={catForm.nome !== undefined ? catForm.nome : selectedCategory.nome}
                      onChange={(e) => {
                        const newState = { ...catForm, nome: e.target.value };
                        setCatForm(newState);
                      }}
                      onBlur={() => updateLocalCat(catForm)}
                      className="text-[15px] font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 min-w-[300px]"
                    />
                  ) : (
                    <h3 className="text-[15px] font-bold text-slate-800">{catForm.nome || selectedCategory.nome}</h3>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Configure como a IA deve analisar os itens desta família.</p>
              </div>
              <div className="flex items-center gap-2">
                 {hasUnsavedChanges(selectedCategory.id) && (
                   <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      EDIÇÃO PENDENTE
                   </span>
                 )}
                 {isAdmin && (
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleDeleteCategory(selectedCategory.id, selectedCategory.nome)}
                     icon={Trash2}
                     className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                     title="Excluir Categoria"
                   />
                 )}
              </div>
            </div>

            {/* Editor Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              
              {/* Conceito Geral & Estrutura */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField label="Conceito Geral" hint="O que é este item? Resuma para a IA.">
                  <Textarea
                    value={catForm.descricao}
                    onChange={(e) => {
                      const newState = { ...catForm, descricao: e.target.value };
                      setCatForm(newState);
                    }}
                    onBlur={() => updateLocalCat(catForm)}
                    rows={4}
                    placeholder="Ex: É um equipamento usado para..."
                  />
                </FormField>

                <FormField label="Estrutura Linear Esperada" hint="A fórmula final do padrão PDM.">
                  <div className="space-y-2">
                     <Textarea
                        value={catForm.estrutura_linear}
                        onChange={(e) => {
                          const newState = { ...catForm, estrutura_linear: e.target.value };
                          setCatForm(newState);
                        }}
                        onBlur={() => updateLocalCat(catForm)}
                        rows={2}
                        placeholder="Ex: [CATEGORIA] [TIPO] [MARCA] [MEDIDA]"
                        className="font-mono text-[11px] text-blue-900 bg-blue-50 border-blue-200 focus:border-blue-500 focus:ring-blue-500/20"
                     />
                     <div className="flex items-start gap-1.5 bg-amber-50 p-2.5 rounded-lg border border-amber-200/60">
                        <ArrowRight size={12} className="text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-[10px] text-amber-800 leading-tight">
                           As tags como <strong>[MARCA]</strong> indicam à IA onde inserir os atributos extraídos.
                        </span>
                     </div>
                  </div>
                </FormField>
              </div>

              {/* Dynamic Lists: Diretrizes & Exemplos */}
              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <DynamicListInput
                    label="Diretrizes de Padronização"
                    hint="Adicione regras específicas de negócio."
                    items={catForm.diretrizes}
                    onChange={(newItems) => {
                      const newState = { ...catForm, diretrizes: newItems };
                      setCatForm(newState);
                      updateLocalCat(newState);
                    }}
                    placeholder="EX: 1. Nomenclatura curta obrigatória fixa: ABRAC."
                  />

                  <ExampleListInput
                    label="Exemplos Práticos"
                    hint="Bruto -> Padronizado"
                    items={catForm.exemplos}
                    onChange={(newItems) => {
                      const newState = { ...catForm, exemplos: newItems };
                      setCatForm(newState);
                      updateLocalCat(newState);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
