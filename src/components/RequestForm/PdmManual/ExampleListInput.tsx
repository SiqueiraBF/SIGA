import React, { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical, ArrowRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface ExampleListInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  hint?: string;
}

export function ExampleListInput({ label, items, onChange, hint }: ExampleListInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newBruto, setNewBruto] = useState('');
  const [newPadronizado, setNewPadronizado] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editBruto, setEditBruto] = useState('');
  const [editPadronizado, setEditPadronizado] = useState('');

  const handleAdd = () => {
    if (newBruto.trim() && newPadronizado.trim()) {
      onChange([...items, `${newBruto.trim()} -> ${newPadronizado.trim()}`]);
      setNewBruto('');
      setNewPadronizado('');
      setIsAdding(false);
    }
  };

  const handleSaveEdit = (index: number) => {
    if (editBruto.trim() && editPadronizado.trim()) {
      const newItems = [...items];
      newItems[index] = `${editBruto.trim()} -> ${editPadronizado.trim()}`;
      onChange(newItems);
      setEditingIndex(null);
    }
  };

  const handleDelete = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(destinationIndex, 0, reorderedItem);
    onChange(newItems);
  };

  const parseItem = (item: string) => {
    const parts = item.split(' -> ');
    return {
      bruto: parts[0] || item,
      padronizado: parts[1] || ''
    };
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center ml-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>

      <div className="space-y-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="example-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {items.map((item, index) => {
                  const { bruto, padronizado } = parseItem(item);
                  return (
                    <Draggable key={`example-${index}`} draggableId={`example-${index}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex flex-col gap-2 p-3 bg-white border rounded-lg shadow-sm group ${
                            snapshot.isDragging ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-200 hover:border-blue-300'
                          } transition-colors`}
                        >
                          {editingIndex === index ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Texto Bruto</label>
                                  <textarea
                                    value={editBruto}
                                    onChange={(e) => setEditBruto(e.target.value)}
                                    className="w-full text-xs rounded-md bg-white border border-slate-300 shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 p-2 min-h-[60px]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block">Descrição Padronizada</label>
                                  <textarea
                                    value={editPadronizado}
                                    onChange={(e) => setEditPadronizado(e.target.value)}
                                    className="w-full text-xs rounded-md bg-blue-50 border border-blue-300 shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 p-2 min-h-[60px] text-blue-900 font-mono"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setEditingIndex(null)} className="h-7 text-xs px-2 text-slate-500">Cancelar</Button>
                                <Button type="button" variant="primary" onClick={() => handleSaveEdit(index)} className="h-7 text-xs px-3 bg-blue-600">Salvar</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div
                                {...provided.dragHandleProps}
                                className="flex flex-col items-center gap-0.5 mt-0.5 text-slate-300 hover:text-blue-600 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical size={16} />
                                <span className="text-[10px] font-bold text-slate-400 w-4 text-center">{index + 1}</span>
                              </div>
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                  {bruto}
                                </div>
                                <div className="text-xs font-mono font-semibold text-blue-700 bg-blue-50/50 p-2 rounded border border-blue-100 flex items-start gap-2">
                                  <ArrowRight size={14} className="text-blue-400 shrink-0 mt-0.5" />
                                  <span>{padronizado}</span>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  type="button" 
                                  onClick={() => { setEditingIndex(index); setEditBruto(bruto); setEditPadronizado(padronizado); }} 
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleDelete(index)} 
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {!isAdding ? (
          <button 
            type="button" 
            onClick={() => setIsAdding(true)}
            className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-blue-400 text-slate-400 hover:text-blue-600 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors bg-slate-50 hover:bg-blue-50/50"
          >
            <Plus size={14} /> Adicionar Exemplo
          </button>
        ) : (
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg shadow-sm space-y-3">
            <label className="text-[10px] font-bold text-blue-700 uppercase">Novo Exemplo</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Texto Bruto</label>
                <textarea
                  value={newBruto}
                  onChange={(e) => setNewBruto(e.target.value)}
                  placeholder="Ex: PARAFUSO ALLEN SEXTAVADO..."
                  className="w-full text-xs rounded-md bg-white border border-slate-300 shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 p-2 min-h-[60px]"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block">Descrição Padronizada</label>
                <textarea
                  value={newPadronizado}
                  onChange={(e) => setNewPadronizado(e.target.value)}
                  placeholder="Ex: PARAF ALLEN SEXT..."
                  className="w-full text-xs rounded-md bg-blue-50 border border-blue-300 shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 p-2 min-h-[60px] text-blue-900 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="h-7 text-xs px-2 text-slate-500">Cancelar</Button>
              <Button type="button" variant="primary" onClick={handleAdd} disabled={!newBruto.trim() || !newPadronizado.trim()} className="h-7 text-xs px-3 bg-blue-600">Adicionar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
