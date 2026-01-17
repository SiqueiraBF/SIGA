import { useRef } from 'react';
import { Pencil, Trash2, AlertTriangle, ArrowUpDown, Tag, Scale, Package } from 'lucide-react';
import type { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form';

interface RequestItemsTableProps {
  fields: any[];
  itemsAccessor: UseFieldArrayReturn<any, 'items', 'id'>;
  form: UseFormReturn<any>;
  isAnalystMode: boolean;
  isItemEditable: boolean;
  isFinalized: boolean;
  isReturned: boolean;
  isInProgress: boolean;
  onEdit: (index: number, item: any) => void;
  onDelete: (index: number, item: any) => void;
  onSort: (key: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
}

export function RequestItemsTable({
  fields,
  isAnalystMode,
  isItemEditable,
  isFinalized,
  isReturned,
  isInProgress,
  onEdit,
  onDelete,
  onSort,
  sortConfig,
}: RequestItemsTableProps) {
  // Helpers
  const showUniCode = isAnalystMode || isFinalized || isReturned || isInProgress;
  const showActionColumn = isAnalystMode || isItemEditable;

  const SortIcon = ({ colKey }: { colKey: string }) => {
    return (
      <ArrowUpDown
        size={12}
        className={`ml-1 inline cursor-pointer transition-colors ${
          sortConfig?.key === colKey ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'
        }`}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return (
          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">
            Aprovado
          </span>
        );
      case 'Reprovado':
        return (
          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
            Devolvido
          </span>
        ); // UI diz Devolvido
      case 'Devolvido':
        return (
          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
            Devolvido
          </span>
        );
      case 'Existente':
        return (
          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
            Existente
          </span>
        );
      case 'Reativado':
        return (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
            Reativado
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/30">
      {fields.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
          <Package className="w-12 h-12 mb-3 text-slate-300" />
          <p className="text-sm font-medium">Nenhum item adicionado à lista.</p>
          <p className="text-xs">Use o formulário à esquerda para incluir produtos.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold text-slate-600 w-12 text-center text-xs uppercase tracking-wider">
                  #
                </th>
                <th
                  className="py-2.5 px-4 font-semibold text-slate-600 cursor-pointer select-none group"
                  onClick={() => onSort('descricao')}
                >
                  <div className="flex items-center text-xs uppercase tracking-wider">
                    Descrição
                    <SortIcon colKey="descricao" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-4 font-semibold text-slate-600 w-24 cursor-pointer select-none"
                  onClick={() => onSort('unidade')}
                >
                  <div className="flex items-center text-xs uppercase tracking-wider">
                    Unid.
                    <SortIcon colKey="unidade" />
                  </div>
                </th>
                <th className="py-2.5 px-4 font-semibold text-slate-600 w-32 hidden md:table-cell text-xs uppercase tracking-wider">
                  Marca/Ref
                </th>
                {showUniCode && (
                  <th className="py-2.5 px-4 font-semibold text-slate-600 w-24 text-center text-xs uppercase tracking-wider">
                    Cód. UNI
                  </th>
                )}
                <th
                  className="py-2.5 px-4 font-semibold text-slate-600 w-28 text-center cursor-pointer select-none"
                  onClick={() => onSort('status_item')}
                >
                  <div className="flex items-center justify-center text-xs uppercase tracking-wider">
                    Status
                    <SortIcon colKey="status_item" />
                  </div>
                </th>
                {showActionColumn && (
                  <th className="py-2.5 px-4 font-semibold text-slate-600 w-20 text-right text-xs uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((item: any, index: number) => (
                <tr
                  key={item.id} // react-hook-form ID
                  className={`group transition-colors hover:bg-blue-50/30 ${
                    item.status_item === 'Reprovado' || item.status_item === 'Devolvido'
                      ? 'bg-red-50/30'
                      : ''
                  }`}
                >
                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                    {(index + 1).toString().padStart(2, '0')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-700 block text-sm">
                      {item.descricao}
                    </span>
                    {item.motivo_reprovacao &&
                      (item.status_item === 'Reprovado' || item.status_item === 'Devolvido') && (
                        <span className="flex items-center gap-1 text-[10px] text-red-500 mt-1 font-medium bg-red-50 w-fit px-1.5 py-0.5 rounded">
                          <AlertTriangle size={10} />
                          Motivo: {item.motivo_reprovacao}
                        </span>
                      )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1.5 text-slate-600 bg-slate-100 w-fit px-2 py-0.5 rounded text-xs font-mono">
                      <Scale size={10} className="text-slate-400" />
                      {item.unidade}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="space-y-1">
                      {item.marca && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Tag size={10} /> {item.marca}
                        </span>
                      )}
                      {item.referencia && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          # {item.referencia}
                        </span>
                      )}
                      {!item.marca && !item.referencia && (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </div>
                  </td>
                  {showUniCode && (
                    <td className="py-3 px-4 text-center">
                      {item.cod_reduzido_unisystem ? (
                        <span className="font-mono font-bold text-blue-600 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {item.cod_reduzido_unisystem}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">{getStatusBadge(item.status_item)}</td>
                  {showActionColumn && (
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(index, item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title={isAnalystMode ? 'Analisar Item' : 'Editar Item'}
                        >
                          <Pencil size={14} />
                        </button>
                        {isItemEditable && (
                          <button
                            onClick={() => onDelete(index, item)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Remover Item"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
