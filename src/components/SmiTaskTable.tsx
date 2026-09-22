import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, ChevronLeft, RotateCcw } from 'lucide-react';
import { loadRemoteDocument, persistDocument, readDocument, writeDocument } from '../lib/documentWorkspace';

type Status = 'запланирован' | 'в работе' | 'на согласовании' | 'опубликован' | 'отменен';

export interface SmiColumn {
  key: string; label: string;
  type: 'text' | 'date' | 'select' | 'status';
  width: number; options?: string[];
}

export interface SmiRow {
  id: string; date: string; topic: string; status: Status; category: string;
  description: string; smi_channels: string; smi_format: string; social_type: string;
  social_format: string; geography: string; speaker: string; publish_date: string; link: string;
}

export const SMI_COLUMNS: SmiColumn[] = [
  { key: 'date', label: 'Дата', type: 'date', width: 130 },
  { key: 'topic', label: 'Тема', type: 'text', width: 200 },
  { key: 'status', label: 'Статус', type: 'status', width: 130 },
  { key: 'category', label: 'Категория', type: 'select', width: 170,
    options: ['Сезонный инфоповод', 'Отраслевое мероприятие', 'Экспертный материал', 'Внешняя повестка', 'Входящий запрос', 'Отраслевая аналитика'] },
  { key: 'description', label: 'Описание инфоповода', type: 'text', width: 250 },
  { key: 'smi_channels', label: 'Каналы СМИ', type: 'select', width: 150,
    options: ['Деловые', 'Отраслевые', 'Общие', 'Профильные', 'Региональные', 'Технологические'] },
  { key: 'smi_format', label: 'Формат для СМИ', type: 'select', width: 150,
    options: ['Пресс-релиз', 'Колонка', 'Комментарий', 'Интервью'] },
  { key: 'social_type', label: 'Тип соцмедиа', type: 'select', width: 130,
    options: ['ВК', 'ТГ', 'Макс', 'VC', 'Дзен'] },
  { key: 'social_format', label: 'Формат соцмедиа', type: 'select', width: 140,
    options: ['Лангрид', 'Карусель', 'Сторис', 'Шорты', 'Пост', 'Опрос'] },
  { key: 'geography', label: 'География', type: 'text', width: 130 },
  { key: 'speaker', label: 'Спикер', type: 'text', width: 130 },
  { key: 'publish_date', label: 'Дата выхода', type: 'date', width: 130 },
  { key: 'link', label: 'Ссылка', type: 'text', width: 150 },
];

function generateRows(prefix: string, count: number): SmiRow[] {
  const rows: SmiRow[] = [];
  const start = new Date(2026, 9, 1);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 2);
    rows.push({
      id: `${prefix}-row-${i}`, date: d.toISOString().split('T')[0],
      topic: '', status: 'запланирован', category: '', description: '',
      smi_channels: '', smi_format: '', social_type: '', social_format: '',
      geography: '', speaker: '', publish_date: '', link: '',
    });
  }
  return rows;
}

function SortableSmiRow({
  row, colWidths, hiddenCols, onUpdate, onInsert
}: {
  row: SmiRow; colWidths: Record<string, number>; hiddenCols: Set<string>;
  onUpdate: (id: string, field: string, val: any) => void;
  onInsert: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform), transition,
    zIndex: isDragging ? 50 : 'auto', opacity: isDragging ? 0.9 : 1,
    boxShadow: isDragging ? '0 10px 25px -5px rgba(0,0,0,0.1)' : 'none',
    backgroundColor: isDragging ? '#f8fafc' : 'transparent'
  };
  const isVisible = (col: string) => !hiddenCols.has(col);

  const renderCell = (col: SmiColumn) => {
    const value = (row as any)[col.key];
    if (col.type === 'date') {
      return <input type="date" value={value || ''} onChange={(e) => onUpdate(row.id, col.key, e.target.value)} className="w-full bg-transparent outline-none text-slate-700 text-sm" />;
    }
    if (col.type === 'status') {
      return (
        <select value={value} onChange={(e) => onUpdate(row.id, col.key, e.target.value)} className={`w-full bg-transparent outline-none rounded px-1 py-0.5 text-xs font-medium ${
          value === 'опубликован' ? 'text-green-700 bg-green-50' : value === 'отменен' ? 'text-red-700 bg-red-50' :
          value === 'в работе' ? 'text-blue-700 bg-blue-50' : value === 'на согласовании' ? 'text-amber-700 bg-amber-50' : 'text-slate-600 bg-slate-100'}`}>
          <option value="запланирован">Запланирован</option><option value="в работе">В работе</option>
          <option value="на согласовании">На согласовании</option><option value="опубликован">Опубликован</option><option value="отменен">Отменен</option>
        </select>
      );
    }
    if (col.type === 'select' && col.options) {
      return (
        <select value={value || ''} onChange={(e) => onUpdate(row.id, col.key, e.target.value)} className="w-full bg-transparent outline-none text-slate-700 text-sm">
          <option value="">—</option>
          {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    return (
      <input type="text" value={value || ''} onChange={(e) => onUpdate(row.id, col.key, e.target.value)}
        placeholder={col.label + '...'}
        className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-300 text-sm" />
    );
  };

  return (
    <tr ref={setNodeRef} style={style} className="group hover:bg-slate-50 transition-colors border-b border-slate-100">
      {SMI_COLUMNS.map((col, idx) => {
        if (!isVisible(col.key)) return null;
        const isFirst = idx === SMI_COLUMNS.findIndex(c => isVisible(c.key));
        return (
          <td key={col.key} className="relative px-3 py-2 border-r border-slate-200" style={{ width: colWidths[col.key], minWidth: colWidths[col.key] }}>
            {isFirst && <>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-blue-500 transition-colors" />
              <div className="flex items-center gap-2">
                <button className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 touch-none shrink-0" {...attributes} {...listeners}><GripVertical size={16} /></button>
                <div className="flex-1 min-w-0">{renderCell(col)}</div>
              </div>
              <button onClick={() => onInsert(row.id)} className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20 hover:bg-blue-700"><Plus size={14} /></button>
            </>}
            {!isFirst && renderCell(col)}
          </td>
        );
      })}
    </tr>
  );
}

export function SmiTaskTable({ taskPrefix, rowCount = 20, hiddenCols, onToggleHideColumn, onResetColumnWidth }: {
  taskPrefix: string; rowCount?: number;
  hiddenCols: Set<string>;
  onToggleHideColumn: (key: string) => void;
  onResetColumnWidth: (key: string) => void;
}) {
  const [rows, setRows] = useState<SmiRow[]>(() => generateRows(taskPrefix, rowCount));
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const defaults = Object.fromEntries(SMI_COLUMNS.map(c => [c.key, c.width]));
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(`fc-bas-smi-col-widths:${taskPrefix}`) || '{}') }; } catch { return defaults; }
  });
  const [activeId, setActiveId] = useState<string | null>(null);

  const resizingCol = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const rowsRef = useRef(rows);
  const hydratedRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(`fc-bas-smi-col-widths:${taskPrefix}`, JSON.stringify(colWidths));
  }, [colWidths, taskPrefix]);

  rowsRef.current = rows;

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
        const parsed = JSON.parse(document.content) as { rows?: SmiRow[] };
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
    resizingCol.current = col; startX.current = e.clientX;
    startWidth.current = colWidths[col];
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return;
      setColWidths(prev => ({ ...prev, [resizingCol.current!]: Math.max(60, startWidth.current + ev.clientX - startX.current) }));
    };
    const onUp = () => {
      resizingCol.current = null; document.body.style.cursor = ''; document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); e.preventDefault();
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));
  const handleDragStart = (event: any) => setActiveId(event.active.id as string);
  const handleDragEnd = (event: any) => {
    const { active, over } = event; setActiveId(null);
    if (over && active.id !== over.id) {
      const oi = rows.findIndex(i => i.id === active.id); const ni = rows.findIndex(i => i.id === over.id);
      setRows(items => arrayMove(items, oi, ni));
    }
  };

  const insertRow = (afterId: string) => {
    const idx = rows.findIndex(r => r.id === afterId);
    const newRow: SmiRow = {
      id: `${taskPrefix}-row-${Date.now()}`, date: '', topic: '', status: 'запланирован', category: '', description: '',
      smi_channels: '', smi_format: '', social_type: '', social_format: '', geography: '', speaker: '', publish_date: '', link: '',
    };
    const n = [...rows]; n.splice(idx + 1, 0, newRow); setRows(n);
  };
  const updateCell = (id: string, field: string, value: any) => {
    setRows(currentRows => currentRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const activeRow = activeId ? rows.find(r => r.id === activeId) : null;
  const visibleColumns = SMI_COLUMNS.filter(c => !hiddenCols.has(c.key));

  return (
    <div className="flex-1 min-h-[400px] overflow-auto bg-white border border-slate-200 rounded-xl select-none">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <table className="w-full border-collapse text-sm text-left" style={{ tableLayout: 'fixed', minWidth: visibleColumns.reduce((sum, c) => sum + colWidths[c.key], 0) }}>
          <colgroup>{visibleColumns.map(col => (<col key={col.key} style={{ width: colWidths[col.key] }} />))}</colgroup>
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              {visibleColumns.map((col, colIndex) => {
                const nextCol = visibleColumns[colIndex + 1];
                const isNextHidden = nextCol ? hiddenCols.has(nextCol.key) : false;
                const isLastCol = colIndex === visibleColumns.length - 1;
                return (
                  <th key={col.key} className="relative px-3 py-3 font-semibold text-slate-700 border-b border-r border-slate-200 last:border-r-0" style={{ width: colWidths[col.key], minWidth: colWidths[col.key] }}>
                    {col.label}
                    {!isLastCol && (
                      <div className={`absolute right-0 top-0 bottom-0 cursor-col-resize transition-colors flex items-center justify-center group/border ${isNextHidden ? 'w-2 bg-amber-200 hover:bg-amber-300' : 'w-1 hover:bg-blue-400 bg-transparent'}`} onMouseDown={(e) => handleMouseDown(e, col.key)}>
                        {!isNextHidden && nextCol && (
                          <button onClick={(e) => { e.stopPropagation(); onToggleHideColumn(nextCol.key); }} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center opacity-0 group-hover/border:opacity-100 transition-opacity hover:bg-blue-50 hover:border-blue-400 z-30" title={`Скрыть «${nextCol.label}»`}>
                            <ChevronLeft size={12} className="text-slate-500" />
                          </button>
                        )}
                        {isNextHidden && nextCol && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col gap-1 opacity-0 group-hover/border:opacity-100 transition-opacity z-30">
                            <button onClick={(e) => { e.stopPropagation(); onToggleHideColumn(nextCol.key); }} className="w-5 h-5 rounded-full bg-white border border-amber-400 shadow-sm flex items-center justify-center hover:bg-amber-50" title={`Развернуть «${nextCol.label}»`}>
                              <ChevronLeft size={12} className="text-amber-700" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onResetColumnWidth(col.key); }} className="w-5 h-5 rounded-full bg-white border border-amber-400 shadow-sm flex items-center justify-center hover:bg-amber-50" title={`Вернуть «${col.label}» к начальной ширине`}>
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
                <SortableSmiRow key={row.id} row={row} colWidths={colWidths} hiddenCols={hiddenCols}
                  onUpdate={updateCell} onInsert={insertRow} />
              ))}
            </SortableContext>
          </tbody>
        </table>
        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
          {activeRow ? (
            <table className="w-full border-collapse text-sm text-left bg-white shadow-2xl rounded-lg overflow-hidden border border-blue-200 opacity-90">
              <tbody><tr className="bg-blue-50/50">
                <td className="px-3 py-2 border-r border-slate-200 font-medium">{activeRow.date || 'Без даты'}</td>
                <td className="px-3 py-2 border-r border-slate-200">{activeRow.topic || '-'}</td>
                <td className="px-3 py-2 border-r border-slate-200">{activeRow.status}</td>
                <td className="px-3 py-2 border-r border-slate-200">{activeRow.category || '-'}</td>
                <td className="px-3 py-2 truncate max-w-[200px]">{activeRow.description || '-'}</td>
              </tr></tbody>
            </table>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}