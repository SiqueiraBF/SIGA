---
name: layout_patterns_elite
description: Padrões estruturais de renderização TSX do layout "Elite" (Tabelas, Modais, Wrapper).
---

# Layout Patterns Elite

Use estes blocos de construção para montar interfaces padronizadas e coesas.

## 1. Page Wrapper (Base da Aplicação)
Todo módulo deve envolver sua página em um `max-w-7xl` e utilizar os componentes genéricos `PageHeader` e `FilterBar`.
```tsx
<div className="max-w-7xl mx-auto space-y-6">
  <PageHeader
    title="Nome do Módulo"
    subtitle="Descrição curta e clara sobre a ação principal"
    icon={BriefcaseIcon}
  >
    {/* Slot para Botões de Ação Primária. Exemplo de inserção de botão: */}
    <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-95">
      <Plus size={18} /> Nova Ação
    </button>
  </PageHeader>

  {/* Opcional: Abas (Tabs) logo abaixo do header */}
  <div className="border-b border-slate-200 mt-2">
    <div className="flex gap-8">
      <button className="pb-4 text-sm font-bold flex items-center gap-2 border-b-2 border-blue-600 text-blue-600 transition-colors">
        <FileText size={16} /> Visão Atual
      </button>
      <button className="pb-4 text-sm font-bold flex items-center gap-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition-colors">
        <LayoutGrid size={16} /> Outra Visão
      </button>
    </div>
  </div>

  <FilterBar onSearch={setSearchTerm} searchValue={searchTerm} searchPlaceholder="Buscar por X, Y..." />

  {/* Aqui entra a Elite Data Table ou o Empty State */}
</div>
```

## 2. Elite Data Table
Jamais use tables sem esta estrutura externa de wrapper.
```tsx
<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          {/* Use text-xs, font-bold, tracking-wider em uppercase para os THs */}
          <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">
            Identificador
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        <tr className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
          <td className="px-6 py-4">
             {/* Exemplo de rendering Monospace técnico */}
             <div className="text-sm font-mono font-medium text-slate-500">
               #{item.id}
             </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

## 3. Empty State Elegante
Renderizar quando não houver dados.
```tsx
<div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
    <FileText className="text-slate-400" size={32} />
  </div>
  <h3 className="text-lg font-bold text-slate-800">Nenhum registro encontrado</h3>
  <p className="text-slate-500 max-w-sm mt-2">
    Não há dados que correspondam aos filtros selecionados.
  </p>
</div>
```

## 4. Split Layout Modal
Utilizado para criação de formulários complexos ou visualização com painel lateral de metadados focados na classe `[1100px]`.
```tsx
<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
  <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[1100px] h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
    
    {/* HEADER COMPLETO AQUI: Com Título, Ícone rounded-2xl bg-slate-100 e Botão Fechar X */}

    <div className="flex flex-1 overflow-hidden">
      {/* SIDEBAR DE CONTEXTO (Esquerda) */}
      <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
             <Info size={12} /> Contexto
          </div>
          {/* Inputs readonly e selects vêm aqui */}
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (Direita) */}
      <div className="flex-1 overflow-y-auto p-8 bg-white/50">
        {/* Formulários e Ações. Textos organizados com prefixos de Título Nano com sinal + Azul */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <span className="text-blue-500 text-lg">+</span> SESSÃO DE DADOS
        </div>
      </div>
    </div>

    {/* FOOTER AQUI */}

  </div>
</div>
```

## 5. Elite Attachment Dropzone
Sempre que um formulário exigir envio de arquivos/anexos, ESTE é o padrão inviolável a ser seguido. Ele engloba a tríade de alta acessibilidade: **Clique, Drag & Drop e Clipboard Paste (Ctrl+V)**, acompanhado de visualização prévia imersiva em modal.

### Regras Obrigatórias:
- **Área Tracejada (Dropzone)**: `border-2 border-dashed rounded-2xl` com transição e interatividade de escala (`scale-[1.02]`).
- **Estado de Arraste (isDragging)**: O fundo e as bordas devem acender com as cores primárias do tema local (`border-blue-500 bg-blue-50/50`).
- **Event Listeners**: Devem estar mapeados no Dropzone: `onDragOver`, `onDragLeave`, `onDrop`.
- **Global Clipboard Listener**: Deve existir um `useEffect` ouvindo `window.addEventListener('paste', handlePaste)` condicionado ao estado de exibição do componente, extraindo imagens do `e.clipboardData.files`.
- **Visualização In-Screen (Lightbox)**: O clique no arquivo já anexado não deve mais abrir uma nova janela cega, mas sim invocar um overlay (`z-[200] bg-slate-900/95 backdrop-blur-xl`) que apresentará:
  - `<img />` com `zoom-in-95` e `shadow-2xl` caso o arquivo comece com `image/`.
  - `<iframe />` com fundo branco ocupando 85% da tela caso seja `application/pdf`.
  - Um painel formatado de Fallback com botão de download nativo caso seja um formato incompatível com browser (Word, Zip, Excel).

```tsx
// 1. Estado essencial para Anexos Elite
const [file, setFile] = useState<File | null>(null);
const [isDragging, setIsDragging] = useState(false);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);

// 2. Componente de Dropzone Completo
<div 
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={`flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
  isDragging
    ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' 
    : file 
      ? 'border-blue-200 bg-blue-50/20' 
      : 'border-slate-200 bg-slate-50 hover:border-blue-300'
}`}>
  {file ? (
    <div className="flex flex-col items-center">
      <div 
        className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-2 cursor-pointer hover:bg-blue-200 transition-all shadow-sm active:scale-95"
        onClick={(e) => { e.stopPropagation(); setPreviewUrl(URL.createObjectURL(file)); }}
      >
         <FileIcon size={24} />
      </div>
      <p className="text-sm font-bold text-slate-700">{file.name}</p>
      <button onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remover</button>
    </div>
  ) : (
    <div>
      <label htmlFor="file-upload" className="cursor-pointer font-bold text-blue-600 hover:text-blue-700">
        <span className="text-base block text-center">Clique, cole, ou arraste um arquivo</span>
        <input id="file-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0])} />
      </label>
    </div>
  )}
</div>

{/* 3. Renderização do Lightbox Preview (No final do Modal) */}
{previewUrl && (
  <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={() => setPreviewUrl(null)}>
    <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md" onClick={() => setPreviewUrl(null)}>
      <X size={24} />
    </button>
    
    {file?.type.startsWith('image/') ? (
       <img src={previewUrl} className="max-w-full max-h-full rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()} />
    ) : file?.type === 'application/pdf' ? (
       <iframe src={previewUrl} className="w-full max-w-5xl h-[85vh] bg-slate-100 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 border-0" onClick={(e) => e.stopPropagation()} />
    ) : (
       <div className="bg-white p-8 rounded-3xl flex flex-col items-center shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
         {/* O Fallback Pattern de Ícone aqui (ex: text-slate-400 e botão fallback) */}
       </div>
    )}
  </div>
)}
```
