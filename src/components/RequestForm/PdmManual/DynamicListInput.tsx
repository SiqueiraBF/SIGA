import React, { useState } from 'react';
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '../../ui/Button';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface DynamicListInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  hint?: string;
}

export function DynamicListInput({ label, items, onChange, placeholder, hint }: DynamicListInputProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editItemText, setEditItemText] = useState('');

  const handleAdd = () => {
    if (newItemText.trim()) {
      onChange([...items, newItemText.trim()]);
      setNewItemText('');
      setIsAdding(false);
    }
  };

  const handleSaveEdit = (index: number) => {
    if (editItemText.trim()) {
      const newItems = [...items];
      newItems[index] = editItemText.trim();
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

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center ml-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>

      <div className="space-y-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dynamic-list">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {items.map((item, index) => (
                  <Draggable key={`item-${index}`} draggableId={`item-${index}`} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex flex-col gap-2 p-3 bg-white border rounded-lg shadow-sm group ${
                          snapshot.isDragging ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-200 hover:border-blue-300'
                        } transition-colors`}
                      >
                        {editingIndex === index ? (
                          <div className="space-y-2">
                            <textarea
                              value={editItemText}
                              onChange={(e) => setEditItemText(e.target.value)}
                              className="w-full text-xs rounded-md bg-white border border-blue-400 shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 p-2 min-h-[60px]"
                              autoFocus
                            />
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
                            <div className="flex-1 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pt-0.5">
                              {item.replace(/^[0-9]+\.\s*/, '')}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                type="button" 
                                onClick={() => { setEditingIndex(index); setEditItemText(item); }} 
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
                ))}
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
            <Plus size={14} /> Adicionar {label}
          </button>
        ) : (
          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg shadow-sm space-y-2">
            <label className="text-[10px] font-bold text-blue-700 uppercase ml-1">Nova {label}</label>
            <textarea
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder={placeholder || 'Digite aqui...'}
              className="w-full text-xs rounded-md bg-white border border-blue-300 shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 p-2 min-h-[60px]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="h-7 text-xs px-2 text-slate-500">Cancelar</Button>
              <Button type="button" variant="primary" onClick={handleAdd} className="h-7 text-xs px-3 bg-blue-600">Adicionar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
