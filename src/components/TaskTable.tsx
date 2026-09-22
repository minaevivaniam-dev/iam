import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, GripVertical, Image as ImageIcon, Video, FileText, Check,
  Send, MessageCircle, LayoutGrid, ChevronLeft, RotateCcw, X, Bold, Italic, List
} from 'lucide-react';
import { loadRemoteDocument, persistDocument, readDocument, uploadFileToStorage, writeDocument, type UploadedDocument } from '../lib/documentWorkspace';

type Status = 'запланирован' | 'в работе' | 'на согласовании' | 'опубликован' | 'отменен';

interface TaskRow {
  id: string;
  date: string;
  rubric: string;
  platforms: string[];
  attachments: number | UploadedDocument[];
  description: string;
  text: string;
  status: Status;
}

const PLATFORMS = [
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'vk', label: 'ВКонтакте', icon: MessageCircle },
  { id: 'max', label: 'Max', icon: MessageCircle },
  { id: 'vc', label: 'VC.ru', icon: FileText },
  { id: 'dzen', label: 'Дзен', icon: LayoutGrid },
];

const INITIAL_COL_WIDTHS = {
  date: 160,
  status: 130,
  rubric: 140,
  platforms: 130,
  attachments: 130,
  description: 220,
  text: 280,
};

export interface ColumnConfig {
  key: string;
  label: string;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'date', label: 'Дата' },
  { key: 'status', label: 'Статус' },
  { key: 'rubric', label: 'Рубрика' },
  { key: 'platforms', label: 'Соцсети' },
  { key: 'attachments', label: 'Вложения' },
  { key: 'description', label: 'Описание' },
  { key: 'text', label: 'Текст' },
];

function generateRows(prefix: string, count = 30): TaskRow[] {
  const rows: TaskRow[] = [];
  const start = new Date(2026, 9, 12);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    rows.push({
      id: `${prefix}-row-${i}`,
      date: d.toISOString().split('T')[0],
      rubric: '',
      platforms: [],
      attachments: 3,
      description: '',
      text: '',
      status: 'запланирован',
    });
  }
  return rows;
}

function SortableTableRow({
  row, colWidths, hiddenCols, onUpdate, onInsert, onEditClick, onTogglePlatform, onStatusChange, onAttachmentUpload
}: {
  row: TaskRow;
  colWidths: Record<string, number>;
  hiddenCols: Set<string>;
  onUpdate: (id: string, field: string, val: any) => void;
  onInsert: (afterId: string, id: string) => number;
  onEditClick: (id: string, txt: string) => void;
  onTogglePlatform: (id: string, platformId: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onAttachmentUpload: (id: string, file: File) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.9 : 1,
    boxShadow: isDragging ? '0 10px 25px -5px rgba(0,0,0,0.1)' : 'none',
    backgroundColor: isDragging ? '#f8fafc' : 'transparent'
  };

  const isVisible = (col: string) => !hiddenCols.has(col);

  return (
    <tr ref={setNodeRef} style={style} className="group hover:bg-slate-50 transition-colors border-b border-slate-100">
      {isVisible('date') && (
        <td className="relative px-3 py-2 border-r border-slate-200" style={{ width: colWidths.date }}>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-blue-500 transition-colors" />
          <div className="flex items-center gap-2">
            <button className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 touch-none" {...attributes} {...listeners}><GripVertical size={16} /></button>
            <input type="date" value={row.date} onChange={(e) => onUpdate(row.id, 'date', e.target.value)} className="w-full bg-transparent outline-none text-slate-700 text-sm" />
          </div>
          <button onClick={() => { onInsert(row.id, row.id); }} className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20 hover:bg-blue-700"><Plus size={14} /></button>
        </td>
      )}

      {isVisible('status') && (
        <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.status }}>
          <select value={row.status} onChange={(e) => onStatusChange(row.id, e.target.value as Status)} className={`w-full bg-transparent outline-none rounded px-1 py-0.5 text-xs font-medium ${
            row.status === 'опубликован' ? 'text-green-700 bg-green-50' :
            row.status === 'отменен' ? 'text-red-700 bg-red-50' :
            row.status === 'в работе' ? 'text-blue-700 bg-blue-50' :
            row.status === 'на согласовании' ? 'text-amber-700 bg-amber-50' :
            'text-slate-600 bg-slate-100'}`}>
            <option value="запланирован">Запланирован</option>
            <option value="в работе">В работе</option>
            <option value="на согласовании">На согласовании</option>
            <option value="опубликован">Опубликован</option>
            <option value="отменен">Отменен</option>
          </select>
        </td>
      )}

      {isVisible('rubric') && (
        <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.rubric }}>
          <input type="text" value={row.rubric} onChange={(e) => onUpdate(row.id, 'rubric', e.target.value)} placeholder="Рубрика..." className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-300 text-sm" />
        </td>
      )}

      {isVisible('platforms') && (
        <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.platforms }}>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {PLATFORMS.slice(0, 3).map(p => {
                const Icon = p.icon;
                const isSelected = row.platforms.includes(p.id);
                return (
                  <label key={p.id} className="cursor-pointer" title={p.label}>
                    <div className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white hover:border-blue-400'
                    }`}>
                      {isSelected ? <Check size={14} className="text-white" /> : <Icon size={14} className="text-slate-400" />}
                    </div>
                    <input type="checkbox" checked={isSelected} onChange={() => onTogglePlatform(row.id, p.id)} className="hidden" />
                  </label>
                );
              })}
            </div>
            <div className="flex gap-1 ml-3.5">
              {PLATFORMS.slice(3, 5).map(p => {
                const Icon = p.icon;
                const isSelected = row.platforms.includes(p.id);
                return (
                  <label key={p.id} className="cursor-pointer" title={p.label}>
                    <div className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white hover:border-blue-400'
                    }`}>
                      {isSelected ? <Check size={14} className="text-white" /> : <Icon size={14} className="text-slate-400" />}
                    </div>
                    <input type="checkbox" checked={isSelected} onChange={() => onTogglePlatform(row.id, p.id)} className="hidden" />
                  </label>
                );
              })}
            </div>
          </div>
        </td>
      )}

      {isVisible('attachments') && (
        <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.attachments }}>
          <div className="flex gap-2">
            {[1, 2, 3].map((si) => (
              <label key={si} className="w-8 h-8 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-400 cursor-pointer transition-colors relative overflow-hidden" title={`Слот ${si}`}>
                {si === 1 ? <ImageIcon size={14} /> : si === 2 ? <Video size={14} /> : <FileText size={14} />}
                <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { const file = e.target.files?.[0]; if (file) onAttachmentUpload(row.id, file); e.target.value = ''; }} />
              </label>
            ))}
          </div>
        </td>
      )}

      {isVisible('description') && (
        <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.description }}>
          <input type="text" value={row.description} onChange={(e) => onUpdate(row.id, 'description', e.target.value)} placeholder="Описание..." className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-300 text-sm" />
        </td>
      )}

      {isVisible('text') && (
        <td className="px-3 py-2 cursor-pointer hover:bg-blue-50/30 transition-colors overflow-hidden" style={{ width: colWidths.text }} onClick={() => onEditClick(row.id, row.text)}>
          <p className="truncate whitespace-nowrap overflow-hidden text-slate-700 text-sm">{row.text || <span className="text-slate-300 italic">Нажмите для ввода...</span>}</p>
        </td>
      )}
    </tr>
  );
}

// === ОСНОВНОЙ КОМПОНЕНТ ТАБЛИЦЫ ===
export function TaskTable({
  taskPrefix,
  columns = DEFAULT_COLUMNS,
}: {
  taskPrefix: string;
  columns?: ColumnConfig[];
}) {
  const [rows, setRows] = useState<TaskRow[]>(() => generateRows(taskPrefix));
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(`fc-bas-hidden-cols:${taskPrefix}`) || '[]')); } catch { return new Set(); }
  });
  const [colWidths, setColWidths] = useState<typeof INITIAL_COL_WIDTHS>(() => {
    try { return { ...INITIAL_COL_WIDTHS, ...JSON.parse(localStorage.getItem(`fc-bas-col-widths:${taskPrefix}`) || '{}') }; } catch { return INITIAL_COL_WIDTHS; }
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');

  const resizingCol = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef(rows);
  const hydratedRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  rowsRef.current = rows;

  useEffect(() => {
    localStorage.setItem(`fc-bas-hidden-cols:${taskPrefix}`, JSON.stringify(Array.from(hiddenCols)));
    localStorage.setItem(`fc-bas-col-widths:${taskPrefix}`, JSON.stringify(colWidths));
  }, [colWidths, hiddenCols, taskPrefix]);

  const saveRows = useCallback(async () => {
    const current = readDocument(taskPrefix, taskPrefix);
    const next = { ...current, taskId: taskPrefix, content: JSON.stringify({ rows: rowsRef.current }), updatedAt: new Date().toISOString() };
    writeDocument(taskPrefix, next);
    await persistDocument(taskPrefix, next);
  }, [taskPrefix]);

  useEffect(() => {
    let isMounted = true;
    const hydrateRows = async () => {
      const document = await loadRemoteDocument(taskPrefix, taskPrefix);
      if (!isMounted) return;
      try {
        const parsed = JSON.parse(document.content) as { rows?: TaskRow[] };
        if (Array.isArray(parsed.rows)) setRows(parsed.rows);
      } catch {
        // Keep generated rows for a new table.
      }
      hydratedRef.current = true;
    };
    void hydrateRows();
    return () => { isMounted = false; };
  }, [taskPrefix]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { void saveRows(); }, 700);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [rows, saveRows]);

  const handleMouseDown = (e: React.MouseEvent, col: string) => {
    if (hiddenCols.has(col)) return;
    resizingCol.current = col;
    startX.current = e.clientX;
    startWidth.current = colWidths[col as keyof typeof colWidths];
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return;
      const newWidth = Math.max(60, startWidth.current + ev.clientX - startX.current);
      setColWidths(prev => ({ ...prev, [resizingCol.current!]: newWidth }));
    };
    const onUp = () => {
      resizingCol.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  };

  const toggleHideColumn = (colKey: string) => {
    setHiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(colKey)) next.delete(colKey); else next.add(colKey);
      return next;
    });
  };

  const resetColumnWidth = (colKey: string) => {
    const initialWidth = INITIAL_COL_WIDTHS[colKey as keyof typeof INITIAL_COL_WIDTHS];
    if (initialWidth) {
      setColWidths(prev => ({ ...prev, [colKey]: initialWidth }));
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (editingCell && editorRef.current) {
      editorRef.current.innerHTML = tempText;
    }
  }, [editingCell]);

  const handleDragStart = (event: any) => setActiveId(event.active.id as string);
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oi = rows.findIndex(i => i.id === active.id);
      const ni = rows.findIndex(i => i.id === over.id);
      setRows(items => arrayMove(items, oi, ni));
    }
  };

  const insertRow = (afterId: string) => {
    const idx = rows.findIndex(r => r.id === afterId);
    const newRow: TaskRow = {
      id: `${taskPrefix}-row-${Date.now()}`,
      date: '', rubric: '', platforms: [], attachments: 3, description: '', text: '', status: 'запланирован',
    };
    const n = [...rows];
    n.splice(idx + 1, 0, newRow);
    setRows(n);
    return idx + 1;
  };

  const updateCell = (id: string, field: string, value: any) => {
    setRows(currentRows => currentRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const onStatusChange = (id: string, status: Status) => updateCell(id, 'status', status);

  const togglePlatform = (rowId: string, platformId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const newPlatforms = row.platforms.includes(platformId)
      ? row.platforms.filter(p => p !== platformId)
      : [...row.platforms, platformId];
    updateCell(rowId, 'platforms', newPlatforms);
  };

  const handleAttachmentUpload = async (rowId: string, file: File) => {
    const uploaded = await uploadFileToStorage(taskPrefix, file);
    setRows(currentRows => currentRows.map(row => {
      if (row.id !== rowId) return row;
      const existing = Array.isArray(row.attachments) ? row.attachments : [];
      return { ...row, attachments: [...existing, uploaded] };
    }));
  };

  const openTextEdit = (id: string, t: string) => { setEditingCell(id); setTempText(t); };
  const handleEditorInput = () => {
    if (editorRef.current) setTempText(editorRef.current.innerHTML);
  };
  const execFormat = (command: string) => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(command, false);
    if (editorRef.current) setTempText(editorRef.current.innerHTML);
  };
  const saveText = () => {
    if (editingCell) {
      updateCell(editingCell, 'text', tempText);
      setEditingCell(null);
    }
  };

  const activeRow = activeId ? rows.find(r => r.id === activeId) : null;
  const visibleColumns = columns.filter(c => !hiddenCols.has(c.key));

  return (
    <>
      {/* Панель скрытых столбцов */}
      {hiddenCols.size > 0 && (
        <div className="flex items-center gap-2 mb-2 shrink-0 flex-wrap">
          <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">Скрыто:</span>
          {Array.from(hiddenCols).map(colKey => {
            const col = columns.find(c => c.key === colKey);
            return (
              <button key={colKey} onClick={() => toggleHideColumn(colKey)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                <ChevronLeft size={12} />
                {col?.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Таблица */}
      <div className="flex-1 min-h-[400px] overflow-auto bg-white border border-slate-200 rounded-xl select-none">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <table className="w-full border-collapse text-sm text-left" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {visibleColumns.map(col => (
                <col key={col.key} style={{ width: colWidths[col.key as keyof typeof colWidths] }} />
              ))}
            </colgroup>
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {visibleColumns.map((col, colIndex) => {
                  const nextCol = visibleColumns[colIndex + 1];
                  const isNextHidden = nextCol ? hiddenCols.has(nextCol.key) : false;
                  const isLastCol = colIndex === visibleColumns.length - 1;

                  return (
                    <th key={col.key} className="relative px-3 py-3 font-semibold text-slate-700 border-b border-r border-slate-200 last:border-r-0" style={{ width: colWidths[col.key as keyof typeof colWidths] }}>
                      {col.label}

                      {!isLastCol && (
                        <div
                          className={`absolute right-0 top-0 bottom-0 cursor-col-resize transition-colors flex items-center justify-center group/border ${
                            isNextHidden ? 'w-2 bg-amber-200 hover:bg-amber-300' : 'w-1 hover:bg-blue-400 bg-transparent'
                          }`}
                          onMouseDown={(e) => handleMouseDown(e, col.key)}
                        >
                          {!isNextHidden && nextCol && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleHideColumn(nextCol.key); }}
                              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center opacity-0 group-hover/border:opacity-100 transition-opacity hover:bg-blue-50 hover:border-blue-400 z-30"
                              title={`Скрыть «${nextCol.label}»`}
                            >
                              <ChevronLeft size={12} className="text-slate-500" />
                            </button>
                          )}

                          {isNextHidden && nextCol && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col gap-1 opacity-0 group-hover/border:opacity-100 transition-opacity z-30">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleHideColumn(nextCol.key); }}
                                className="w-5 h-5 rounded-full bg-white border border-amber-400 shadow-sm flex items-center justify-center hover:bg-amber-50"
                                title={`Развернуть «${nextCol.label}»`}
                              >
                                <ChevronLeft size={12} className="text-amber-700" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); resetColumnWidth(col.key); }}
                                className="w-5 h-5 rounded-full bg-white border border-amber-400 shadow-sm flex items-center justify-center hover:bg-amber-50"
                                title={`Вернуть «${col.label}» к начальной ширине`}
                              >
                                <RotateCcw size={10} className="text-amber-700" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                {rows.map((row) => (
                  <SortableTableRow
                    key={row.id}
                    row={row}
                    colWidths={colWidths}
                    hiddenCols={hiddenCols}
                    onUpdate={updateCell}
                    onInsert={insertRow}
                    onEditClick={openTextEdit}
                    onTogglePlatform={togglePlatform}
                    onStatusChange={onStatusChange}
                    onAttachmentUpload={handleAttachmentUpload}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>

          <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
            {activeRow ? (
              <table className="w-full border-collapse text-sm text-left bg-white shadow-2xl rounded-lg overflow-hidden border border-blue-200 opacity-90">
                <tbody>
                  <tr className="bg-blue-50/50">
                    <td className="px-3 py-2 border-r border-slate-200 font-medium text-slate-900">{activeRow.date || 'Без даты'}</td>
                    <td className="px-3 py-2 border-r border-slate-200">{activeRow.status}</td>
                    <td className="px-3 py-2 border-r border-slate-200">{activeRow.rubric || '-'}</td>
                    <td className="px-3 py-2 border-r border-slate-200">{activeRow.platforms.length} пл.</td>
                    <td className="px-3 py-2 border-r border-slate-200">3 слота</td>
                    <td className="px-3 py-2 border-r border-slate-200">{activeRow.description || '-'}</td>
                    <td className="px-3 py-2 truncate max-w-[200px]">{activeRow.text || 'Нет текста'}</td>
                  </tr>
                </tbody>
              </table>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Модалка редактора текста */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Редактирование текста</h3>
              <button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-2 border-b border-slate-100 flex gap-2">
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 font-bold"><Bold size={16} /></button>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-600 italic"><Italic size={16} /></button>
              <button onMouseDown={(e) => { e.preventDefault(); execFormat('insertUnorderedList'); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><List size={16} /></button>
            </div>
            <div ref={editorRef} contentEditable onInput={handleEditorInput} className="flex-1 p-6 outline-none resize-none text-slate-700 leading-relaxed text-sm min-h-[300px] overflow-y-auto prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5" style={{ whiteSpace: 'pre-wrap' }} />
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setEditingCell(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Закрыть</button>
              <button onClick={saveText} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}