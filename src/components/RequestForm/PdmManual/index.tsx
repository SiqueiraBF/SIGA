import React, { useState, useEffect } from 'react';
import { db } from '../../../services/supabaseService';
import { useAuth } from '../../../context/AuthContext';
import { DEFAULT_CATEGORIAS, DEFAULT_GRUPOS, DEFAULT_ABREVIACOES } from '../pdmDefaults';
import { 
  Search, Plus, Trash2, Save, RotateCcw, BookOpen, Settings,
  ChevronRight, Info, List, FileText, CheckCircle, Loader2, AlertTriangle, FileCode, Edit,
  Package, ArrowRight, Tag, Sparkles, X
} from 'lucide-react';
import { PdmCategoria, PdmGrupoTipo, PdmAbreviacao } from '../../../types';
import { DynamicListInput } from './DynamicListInput';
import { SimulatorModal } from './SimulatorModal';
import { MarkdownPreview } from './MarkdownPreview';
import { AbbreviationEditor } from './AbbreviationEditor';
import { CategoryEditor } from './CategoryEditor';
import { AiLogsTab } from './AiLogsTab';
import { AiConfigTab } from './AiConfigTab';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Button } from '../../ui/Button';
import { TabBar } from '../../ui/TabBar';
import { DataTable } from '../../ui/DataTable';
import { Modal } from '../../ui/Modal';
import { ModalHeader } from '../../ui/ModalHeader';
import { ModalFooter } from '../../ui/ModalFooter';
import { FormField } from '../../ui/FormField';
import { Input } from '../../ui/Input';
import { FilterBar } from '../../ui/FilterBar';
import { Textarea } from '../../ui/Textarea';
import { StatusBadge } from '../../ui/StatusBadge';
import toast from 'react-hot-toast';

export function PdmManual() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Salvo com sucesso!');
  
  // Database States
  const [categorias, setCategorias] = useState<PdmCategoria[]>([]);
  const [originalCategorias, setOriginalCategorias] = useState<PdmCategoria[]>([]);
  const [abreviacoes, setAbreviacoes] = useState<PdmAbreviacao[]>([]);

  // Navigation & UI States
  const [mode, setMode] = useState<'READ' | 'CONFIG'>('READ');
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [configTab, setConfigTab] = useState<'CATEGORIAS' | 'ABREVIACOES' | 'CONFIG_IA' | 'MARKDOWN' | 'LOGS'>('CATEGORIAS');

  // IA Config State
  const [aiConfig, setAiConfig] = useState<{
    enabled: boolean;
    model: string;
    api_key: string;
  }>({
    enabled: true,
    model: '',
    api_key: ''
  });

  // Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Selected Category/Group for editing
  const [editingCategoryId, setEditingCategoryId] = useState<string>('');
  const [editingGroupSpecId, setEditingGroupSpecId] = useState<string>('');

  // Form states for edits
  const [catForm, setCatForm] = useState<{
    nome: string;
    descricao: string;
    estrutura_linear: string;
    diretrizes: string[];
    exemplos: string[];
  }>({ nome: '', descricao: '', estrutura_linear: '', diretrizes: [], exemplos: [] });

  // Confirm Dialog State
  const [pdmConfirmDialog, setPdmConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    variant: 'danger' | 'warning' | 'info';
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false, title: '', description: '', variant: 'danger', confirmLabel: 'Confirmar', onConfirm: () => {},
  });

  const isAdmin = role?.nome === 'Administrador';

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [catsData, abbrevsData, aiConfigData] = await Promise.all([
        db.getPdmCategorias(),
        db.getPdmAbreviacoes(),
        db.getSysSetting('pdm_ai_config')
      ]);
      
      setCategorias(catsData);
      setOriginalCategorias(JSON.parse(JSON.stringify(catsData)));
      setAbreviacoes(abbrevsData);

      if (aiConfigData) {
        setAiConfig({
          enabled: aiConfigData.enabled ?? true,
          model: aiConfigData.model ?? '',
          api_key: aiConfigData.api_key ?? ''
        });
      }

      if (catsData.length > 0) {
        setSelectedCategoryId(catsData[0].id);
        setEditingCategoryId(catsData[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do PDM:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync Category Form
  useEffect(() => {
    const cat = categorias.find(c => c.id === editingCategoryId);
    if (cat) {
      setCatForm({
        nome: cat.nome || '',
        descricao: cat.descricao || '',
        estrutura_linear: cat.estrutura_linear || '',
        diretrizes: cat.diretrizes || [],
        exemplos: cat.exemplos || []
      });
    }
  }, [editingCategoryId, categorias]);

  // Client-side Match of Abbreviations
  const getLinkedAbbreviations = (category: PdmCategoria) => {
    if (!category) return [];
    const textToScan = [
      category.descricao || '',
      category.estrutura_linear || '',
      ...(category.diretrizes || []),
      ...(category.exemplos || [])
    ].join(' ').toUpperCase();

    return abreviacoes.filter(abrev => {
      if (!abrev.termo) return false;
      const escapedTerm = abrev.termo.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
      return regex.test(textToScan) || textToScan.includes(abrev.termo.toUpperCase());
    });
  };

  // Helper: Compile Markdown
  const compilePromptMarkdown = (
    catsList: PdmCategoria[],
    abbrevsList: PdmAbreviacao[]
  ) => {
    const abbrevsSection = abbrevsList.map(a => `${a.termo} -> ${a.abreviacao}`).join('\n');

    const catsSection = catsList.map(c => {
      const dirStr = c.diretrizes && c.diretrizes.length > 0
        ? `\nDiretrizes de Padronização:\n${c.diretrizes.map((d, i) => `- ${i + 1}. ${d.replace(/^[0-9]+\.\s*/, '')}`).join('\n')}`
        : '';
      const exStr = c.exemplos && c.exemplos.length > 0
        ? `\nExemplos de Padronização (Bruto -> Padronizado):\n${c.exemplos.map(e => `- ${e}`).join('\n')}`
        : '';
      return `### CATEGORIA: ${c.nome.toUpperCase()} (ID: ${c.id})
Descrição: ${c.descricao || 'Sem descrição.'}
Estrutura Linear Padrão: ${c.estrutura_linear || 'Sem estrutura linear.'}${dirStr}${exStr}`;
    }).join('\n\n');

    // ESTRUTURA OTIMIZADA:
    // 1. Instrução geral + Categorias (contexto de trabalho)
    // 2. Dicionário de abreviações (perto do final para evitar "lost-in-the-middle")
    // 3. Roteiro Chain-of-Thought (passos obrigatórios)
    // 4. Reforço de varredura de abreviações
    // 5. Fallback para categoria desconhecida
    // OBS: O contrato JSON de retorno fica EXCLUSIVAMENTE na Edge Function (analyze-pdm)
    //       para evitar dois JSONs conflitantes que confundem o modelo.
    return `# INSTRUÇÕES GERAIS DE PADRONIZAÇÃO DE MATERIAIS (PDM)

Você é um assistente de Inteligência Artificial especialista em Higienização, Classificação e Padronização de descrições de materiais agrícolas e administrativos. Seu objetivo é higienizar a descrição bruta fornecida pelo usuário, associá-la à categoria correta do PDM, extrair as informações necessárias para preencher a estrutura linear padrão correspondente e verificar se há dados faltantes.

## REGRAS ESPECÍFICAS POR CATEGORIA
Abaixo estão as categorias de PDM suportadas. Cada uma possui uma estrutura linear padrão que define a ordem das especificações, diretrizes especiais e exemplos de conversão:

${catsSection}

## CATEGORIA DESCONHECIDA (FALLBACK)
Se o item analisado NÃO se encaixar em NENHUMA das categorias listadas acima, retorne obrigatoriamente:
- status: "FALTANDO_INFO"
- message: "Categoria não identificada no PDM. O item não se encaixa em nenhuma categoria cadastrada. Solicite ao analista que classifique manualmente."
- descricao_padronizada: A descrição bruta convertida para CAIXA ALTA, com abreviações do dicionário aplicadas.
- categoria_detectada: null

## DICIONÁRIO DE ABREVIAÇÕES OBRIGATÓRIAS
A lista abaixo é MANDATÓRIA. Sempre que um dos termos (ou variações próximas, incluindo acentuação) for identificado na descrição final padronizada, ele DEVE ser substituído pela abreviação correspondente. Não existe exceção.

\`\`\`
${abbrevsSection}
\`\`\`

## ROTEIRO DE ANÁLISE (SIGA EXATAMENTE NESTA ORDEM)
1. CLASSIFICAÇÃO: Identifique a categoria PDM correta do item baseando-se no texto bruto.
2. EXTRAÇÃO: Extraia os atributos da descrição bruta conforme a estrutura linear da categoria identificada.
3. MONTAGEM: Monte a string padronizada na ordem exata da estrutura linear, respeitando as diretrizes da categoria. REGRA ESTRITA: NUNCA inclua o nome da categoria no início ou no meio da descrição final. A descrição padronizada deve começar diretamente pelo primeiro atributo extraído (ex: o nome base do componente ou produto).
4. VARREDURA DE ABREVIAÇÕES (OBRIGATÓRIO): Percorra CADA PALAVRA da string montada no passo 3 e compare com o Dicionário de Abreviações acima. Se houver correspondência, substitua obrigatoriamente. Exemplos: "SEXTAVADO" vira "SEXT", "GALVANIZADO" vira "GALV", "HIDRAULICO" vira "HIDR", "PARAFUSO" vira "PARAF", "ACO CARBONO" vira "AC", "ACO INOX" vira "AI", "POLEGADA" vira "P", "ROLAMENTO" vira "ROL". Esta etapa é INEGOCIÁVEL.
5. VALIDAÇÃO: Verifique se todos os campos marcados como obrigatórios (sem chaves {}) na estrutura linear foram preenchidos. Se algum estiver vazio, mude o status para "FALTANDO_INFO".
6. RETORNO: Gere o JSON final com os quatro campos: status, descricao_padronizada, message e categoria_detectada.

## REGRA FINAL DE SEGURANÇA (ANTI-ALUCINAÇÃO)
- NUNCA invente, adivinhe ou deduza informações que não estejam explícitas no texto bruto.
- Se um dado técnico obrigatório estiver ausente (medida, referência, fabricante), altere o status para "FALTANDO_INFO" e liste o dado faltante na mensagem.
- Remova SEMPRE ruídos comerciais ("original", "reforçado", "alta qualidade", "excelente", "melhor preço") e ruídos de aplicação ("para trator", "da colhedora", "do motor") do texto final.
`;
  };

  // Compile Dynamic markdown prompt based on current state
  const compiledMarkdown = compilePromptMarkdown(categorias, abreviacoes);

  const handleNewCatNameChange = (val: string) => {
    setNewCatName(val);
    const generatedId = val
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9\s_-]/g, '')
      .replace(/[\s-]+/g, '_');
    setNewCatId(generatedId);
  };

  // Local state update when inputting values (Categorias)
  const updateLocalCat = (formState = catForm) => {
    const updated = categorias.map(c => {
      if (c.id === editingCategoryId) {
        return {
          ...c,
          nome: formState.nome !== undefined ? formState.nome : c.nome,
          descricao: formState.descricao,
          estrutura_linear: formState.estrutura_linear,
          diretrizes: formState.diretrizes,
          exemplos: formState.exemplos
        };
      }
      return c;
    });
    setCategorias(updated);
  };

  // Save Manual on Server
  const handleSaveAll = async () => {
    if (!isAdmin) return;
    setSaving(true);
    setSuccess(false);

    try {
      // 1. Save all edited categories in DB
      for (const cat of categorias) {
        await db.updatePdmCategoria(cat.id, {
          nome: cat.nome,
          descricao: cat.descricao,
          estrutura_linear: cat.estrutura_linear,
          diretrizes: cat.diretrizes,
          exemplos: cat.exemplos
        });
      }

      // 3. Compile markdown prompt
      const newPrompt = compilePromptMarkdown(categorias, abreviacoes);

      // 4. Save pdm_ai_config in sys_settings
      const finalConfig = {
        enabled: aiConfig.enabled,
        model: aiConfig.model,
        api_key: aiConfig.api_key,
        prompt: newPrompt
      };

      await db.updateSysSetting(
        'pdm_ai_config',
        finalConfig,
        'Configurações da Inteligência Artificial e prompt consolidado do PDM'
      );

      setOriginalCategorias(JSON.parse(JSON.stringify(categorias)));
      setSuccessMsg('Manual e Configurações da IA atualizados com sucesso!');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (error) {
      console.error('Erro ao salvar configurações do PDM:', error);
      toast.error('Ocorreu um erro ao salvar o manual no servidor.');
    } finally {
      setSaving(false);
    }
  };


  // Filtering Categories
  const filteredCategorias = categorias.filter(c => 
    c.nome.toLowerCase().includes(categorySearch.toLowerCase()) ||
    c.id.toLowerCase().includes(categorySearch.toLowerCase())
  );
  // Delete Category
  const handleDeleteCategory = (id: string, name: string) => {
    if (!isAdmin) return;
    setPdmConfirmDialog({
      isOpen: true,
      title: 'Excluir Categoria',
      description: `Tem certeza que deseja excluir a categoria "${name}" (${id})? Isso também removerá os grupos associados.`,
      variant: 'danger',
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        try {
          await db.deletePdmCategoria(id);
          setCategorias(categorias.filter(c => c.id !== id));
          if (editingCategoryId === id) {
            setEditingCategoryId('');
          }
          toast.success('Categoria excluída!');
        } catch (err: any) {
          console.error('Erro ao excluir:', err);
          toast.error(err.message || 'Erro ao excluir do banco.');
        }
      },
    });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const name = newCatName.trim();
    const id = newCatId.trim().toUpperCase();

    if (!name || !id) {
      toast.error('Nome da categoria e Código ID são obrigatórios.');
      return;
    }

    if (categorias.some(c => c.id === id)) {
      toast.error(`O Código ID "${id}" já está cadastrado.`);
      return;
    }

    setIsCreatingCat(true);
    try {
      const newCategory: PdmCategoria = {
        id,
        nome: name,
        descricao: '',
        estrutura_linear: '',
        diretrizes: [],
        exemplos: []
      };

      await db.insertPdmCategoria(newCategory);

      const updated = [...categorias, newCategory].sort((a, b) => a.nome.localeCompare(b.nome));
      setCategorias(updated);
      setOriginalCategorias(JSON.parse(JSON.stringify(updated)));
      setEditingCategoryId(id);

      setNewCatName('');
      setNewCatId('');
      setShowNewCatModal(false);

      setSuccessMsg('Categoria criada com sucesso!');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
      toast.error('Erro ao salvar categoria no banco.');
    } finally {
      setIsCreatingCat(false);
    }
  };

  const selectedCategory = categorias.find(c => c.id === selectedCategoryId);
  const matchedAbbrevs = selectedCategory ? getLinkedAbbreviations(selectedCategory) : [];

  const hasUnsavedChanges = (catId: string) => {
    const orig = originalCategorias.find(c => c.id === catId);
    const curr = categorias.find(c => c.id === catId);
    if (!orig || !curr) return false;
    if (editingCategoryId === catId) {
      return (
        orig.nome !== catForm.nome ||
        orig.descricao !== catForm.descricao ||
        orig.estrutura_linear !== catForm.estrutura_linear ||
        JSON.stringify(orig.diretrizes || []) !== JSON.stringify(catForm.diretrizes) ||
        JSON.stringify(orig.exemplos || []) !== JSON.stringify(catForm.exemplos)
      );
    }
    return (
      orig.descricao !== curr.descricao ||
      orig.estrutura_linear !== curr.estrutura_linear ||
      JSON.stringify(orig.diretrizes || []) !== JSON.stringify(curr.diretrizes || []) ||
      JSON.stringify(orig.exemplos || []) !== JSON.stringify(curr.exemplos || [])
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 min-h-[350px]">
        <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
        <span className="text-sm font-semibold">Carregando Manual do PDM...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Admin Action Bar */}
      {isAdmin && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Diretrizes de padronização, siglas obrigatórias e regras de cadastro.
          </p>
          <Button
            variant="secondary"
            onClick={() => setMode(mode === 'READ' ? 'CONFIG' : 'READ')}
            icon={mode === 'READ' ? Settings : BookOpen}
            className={mode === 'READ' ? 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100/70' : ''}
          >
            {mode === 'READ' ? 'Configurar IA & PDM' : 'Visualizar Manual'}
          </Button>
        </div>
      )}

      {/* Mode: READING */}
      {mode === 'READ' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Sidebar */}
          <div className="md:col-span-4 p-4 flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="mb-3">
              <Input
                placeholder="Buscar categorias..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-[400px] h-[calc(100vh-280px)] space-y-1 pr-1 mt-2">
              {filteredCategorias.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all text-xs font-medium border-l-4 ${
                    selectedCategoryId === cat.id
                      ? 'bg-blue-50 text-blue-700 shadow-sm border-blue-500'
                      : 'text-slate-600 hover:bg-slate-100/70 border-transparent hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Package size={14} className={selectedCategoryId === cat.id ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="truncate pr-2">{cat.nome}</span>
                  </div>
                  <ChevronRight size={13} className={selectedCategoryId === cat.id ? 'text-blue-600' : 'text-slate-400 opacity-0 group-hover:opacity-100'} />
                </button>
              ))}
              {filteredCategorias.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  Nenhuma categoria encontrada.
                </div>
              )}
            </div>
          </div>

          {/* Main Area */}
          <div className="md:col-span-8 p-5 flex flex-col space-y-5 overflow-y-auto min-h-[500px] h-[calc(100vh-220px)] bg-white rounded-2xl border border-slate-200/60 shadow-sm">
            {selectedCategory ? (
              <>
                {/* Title */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200 bg-slate-50 text-slate-500">
                      ID: {selectedCategory.id}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedCategory.nome}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{selectedCategory.descricao}</p>
                </div>

                {/* Linear Structure */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
                  <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                    <FileCode size={13} /> Estrutura Linear de Cadastro
                  </span>
                  <div className="font-mono text-sm font-bold text-blue-400 break-words leading-relaxed">
                    {selectedCategory.estrutura_linear || 'Não definida'}
                  </div>
                </div>

                {/* Directives & Guidelines */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <List size={14} className="text-blue-600" /> Diretrizes de Higienização
                  </h4>
                  <div className="border border-slate-100 rounded-xl bg-white overflow-hidden shadow-sm">
                    <ul className="divide-y divide-slate-50 text-xs text-slate-600 leading-relaxed">
                      {selectedCategory.diretrizes && selectedCategory.diretrizes.length > 0 ? (
                        selectedCategory.diretrizes.map((dir, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 p-3 hover:bg-slate-50/50 transition-colors">
                            <CheckCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                            <span>{dir}</span>
                          </li>
                        ))
                      ) : (
                        <div className="p-4 text-slate-400 italic">Sem diretrizes específicas registradas.</div>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Abbreviations Matcher */}
                {matchedAbbrevs.length > 0 && (
                  <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-xl">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Tag size={13} className="text-blue-600" /> Abreviações Recomendadas:
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {matchedAbbrevs.map((ab, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-full px-3 py-1 flex items-center gap-2 text-xs shadow-sm hover:border-blue-300 transition-colors cursor-default">
                          <span className="font-medium text-slate-600" title={ab.termo}>{ab.termo}</span>
                          <ArrowRight size={10} className="text-slate-300" />
                          <span className="font-mono font-bold text-blue-700">{ab.abreviacao}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Examples */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <FileText size={14} className="text-blue-600" /> Exemplos de Padronização
                  </h4>
                  <div className="space-y-2">
                    {selectedCategory.exemplos && selectedCategory.exemplos.length > 0 ? (
                      selectedCategory.exemplos.map((ex, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 font-mono text-xs text-slate-700 break-all shadow-sm flex items-start gap-2">
                          <ArrowRight size={14} className="text-blue-500 shrink-0 mt-0.5" />
                          <span>{ex}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Sem exemplos registrados.</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic">
                Selecione uma categoria para visualizar.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mode: CONFIG (Admin Tabbed View) */
        <div className="flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <TabBar<'CATEGORIAS' | 'ABREVIACOES' | 'CONFIG_IA' | 'MARKDOWN' | 'LOGS'>
            tabs={[
              { id: 'CATEGORIAS' as const, label: `Categorias PDM`, badge: categorias.length },
              { id: 'ABREVIACOES' as const, label: `Abreviações`, badge: abreviacoes.length },
              { id: 'CONFIG_IA' as const, label: `Configuração da IA` },
              { id: 'MARKDOWN' as const, label: 'Prompt Markdown (IA)' },
              { id: 'LOGS' as const, label: 'Análise de IA' }
            ]}
            activeTab={configTab}
            onTabChange={(id) => setConfigTab(id)}
            className="px-5 pt-3 bg-slate-50/50"
          />

          <div className="flex-1 p-5 overflow-y-auto min-h-[600px] h-[calc(100vh-280px)]">
            {/* Configuration: CATEGORIAS */}
            {configTab === 'CATEGORIAS' && (
              <CategoryEditor 
                categorias={categorias}
                filteredCategorias={filteredCategorias}
                selectedCategory={categorias.find(c => c.id === editingCategoryId)}
                editingCategoryId={editingCategoryId}
                setEditingCategoryId={setEditingCategoryId}
                catForm={catForm}
                setCatForm={setCatForm}
                updateLocalCat={updateLocalCat}
                isAdmin={isAdmin}
                hasUnsavedChanges={hasUnsavedChanges}
                setShowNewCatModal={setShowNewCatModal}
                categorySearch={categorySearch}
                setCategorySearch={setCategorySearch}
                handleDeleteCategory={handleDeleteCategory}
              />
            )}

            {/* Configuration: ABREVIACOES */}
            {configTab === 'ABREVIACOES' && (
              <AbbreviationEditor 
                abreviacoes={abreviacoes}
                setAbreviacoes={setAbreviacoes}
                isAdmin={isAdmin}
                setPdmConfirmDialog={setPdmConfirmDialog}
                setSuccessMsg={setSuccessMsg}
                setSuccess={setSuccess}
              />
            )}



            {/* Configuration: CONFIG_IA */}
            {configTab === 'CONFIG_IA' && (
              <AiConfigTab
                config={aiConfig}
                onChange={setAiConfig}
                isAdmin={isAdmin}
              />
            )}

            {/* Configuration: MARKDOWN VIEW */}
            {configTab === 'MARKDOWN' && (
              <MarkdownPreview compiledMarkdown={compiledMarkdown} />
            )}

            {/* Configuration: LOGS */}
            {configTab === 'LOGS' && (
              <AiLogsTab />
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-4">
            <div className="flex items-center gap-4">
              {success && (
                <span className="text-blue-600 text-sm font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle size={16} /> {successMsg}
                </span>
              )}
              <Button
                variant="secondary"
                onClick={() => setIsSimulatorOpen(true)}
                icon={Sparkles}
              >
                Simulador IA
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAll}
                isLoading={saving}
                icon={Save}
                className="bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
              >
                Salvar Alterações (Todas as Abas)
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showNewCatModal} onClose={() => { setShowNewCatModal(false); setNewCatName(''); setNewCatId(''); }} size="sm">
        <ModalHeader title="Nova Categoria PDM" icon={Plus} onClose={() => { setShowNewCatModal(false); setNewCatName(''); setNewCatId(''); }} iconClassName="text-blue-600" />
        <form onSubmit={handleCreateCategory}>
          <div className="p-6 space-y-5">
            <FormField label="Nome da Categoria" required>
              <Input
                required
                placeholder="EX: Filtro de Combustível"
                value={newCatName}
                onChange={(e) => handleNewCatNameChange(e.target.value)}
              />
            </FormField>

            <FormField label="Código ID" required hint="(Auto-gerado, editável)">
              <Input
                required
                placeholder="EX: FILTRO_DE_COMBUSTIVEL"
                value={newCatId}
                onChange={(e) => setNewCatId(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                className="font-mono uppercase"
              />
            </FormField>
          </div>
          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowNewCatModal(false); setNewCatName(''); setNewCatId(''); }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isCreatingCat}
              icon={Save}
              className="bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
            >
              Criar Categoria
            </Button>
          </ModalFooter>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={pdmConfirmDialog.isOpen}
        onClose={() => setPdmConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={pdmConfirmDialog.onConfirm}
        title={pdmConfirmDialog.title}
        description={pdmConfirmDialog.description}
        variant={pdmConfirmDialog.variant}
        confirmLabel={pdmConfirmDialog.confirmLabel}
      />

      {/* SIMULATOR MODAL */}
      <SimulatorModal 
        isOpen={isSimulatorOpen} 
        onClose={() => setIsSimulatorOpen(false)} 
      />
    </div>
  );
}
