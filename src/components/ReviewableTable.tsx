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
  Send, MessageCircle, LayoutGrid, ChevronLeft, RotateCcw, X, Bold, Italic, List,
  MessageSquare, ThumbsUp, ThumbsDown
} from 'lucide-react';

type Status = 'запланирован' | 'в работе' | 'на согласовании' | 'опубликован' | 'отменен';

export type ReviewStatus = 'approved' | 'rejected' | 'none';

export interface ReviewComment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface ReviewData {
  status: ReviewStatus;
  comments: ReviewComment[];
}

export interface ColumnConfig {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'status' | 'platforms' | 'attachments';
  width: number;
  options?: string[];
  isKpiField?: boolean;
}

export interface TaskRow {
  id: string;
  [key: string]: any;
}

const GRIP_WIDTH = 64; // увеличено с 32 до 64

const PLATFORMS = [
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'vk', label: 'ВКонтакте', icon: MessageCircle },
  { id: 'max', label: 'Max', icon: MessageCircle },
  { id: 'vc', label: 'VC.ru', icon: FileText },
  { id: 'dzen', label: 'Дзен', icon: LayoutGrid },
];

function CommentBubble({
  x, y, comments, onSave, onClose
}: {
  x: number; y: number;
  comments: ReviewComment[];
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      ref={bubbleRef}
      className="fixed z-[100] bg-white border border-slate-200 rounded-xl shadow-2xl w-80 max-h-96 flex flex-col"
      style={{ top: y + 10, left: Math.min(x, window.innerWidth - 340) }}
    >
      <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-l border-t border-slate-200 rotate-45" />
      
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
        <span className="text-sm font-semibold text-slate-800">Комментарий</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
      </div>

      {comments.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-100 max-h-40 overflow-y-auto space-y-2">
          {comments.map(c => (
            <div key={c.id} className="text-xs">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-slate-700">{c.author}</span>
                <span className="text-slate-400">{c.timestamp}</span>
              </div>
              <p className="text-slate-600">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 p-3 min-h-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Напишите комментарий..."
          className="w-full h-20 resize-none outline-none text-sm text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-200 focus:border-blue-400"
          autoFocus
        />
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-slate-100 shrink-0">
        <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
          Отменить
        </button>
        <button
          onClick={() => { if (text.trim()) { onSave(text.trim()); setText(''); } }}
          disabled={!text.trim()}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
            text.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}

function ReviewableRow({
  row, columns, colWidths, hiddenCols, reviewMode, reviewMap,
  onUpdate, onInsert, onTogglePlatform, onStatusChange,
  onCellClick
}: {
  row: TaskRow; columns: ColumnConfig[]; colWidths: Record<string, number>;
  hiddenCols: Set<string>; reviewMode: boolean;
  reviewMap: Map<string, ReviewData>;
  onUpdate: (id: string, field: string, val: any) => void;
  onInsert: (id: string) => void;
  onTogglePlatform: (id: string, platformId: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onCellClick: (rowId: string, colKey: string, zone: 'top' | 'bottom-left' | 'bottom-right', event: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  
  const rowReview = reviewMap.get(`${row.id}_row`) || { status: 'none', comments: [] };
  
  // Обводка всей строки через outline (применяется ко всему tr)
  const rowOutlineStyle: React.CSSProperties = {
    ...(transform ? { transform: CSS.Transform.toString(transform) } : {}),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.9 : 1,
    boxShadow: isDragging ? '0 10px 25px -5px rgba(0,0,0,0.1)' : 'none',
    backgroundColor: isDragging ? '#f8fafc' : 'transparent',
    outline: rowReview.status === 'approved' 
      ? '1px solid rgb(34, 197, 94)' 
      : rowReview.status === 'rejected' 
      ? '1px solid rgb(239, 68, 68)' 
      : 'none',
    outlineOffset: '-1px'
  };

  const getReviewData = (colKey: string): ReviewData => {
    return reviewMap.get(`${row.id}_${colKey}`) || { status: 'none', comments: [] };
  };

  const renderCell = (col: ColumnConfig) => {
    const value = row[col.key];

    if (col.type === 'date') {
      return <input type="date" value={value || ''} onChange={(e) => onUpdate(row.id, col.key, e.target.value)}
        className="w-full bg-transparent outline-none text-slate-700 text-sm" readOnly={reviewMode} />;
    }
    if (col.type === 'status') {
      return (
        <select value={value || 'запланирован'} onChange={(e) => onStatusChange(row.id, e.target.value as Status)}
          className={`w-full bg-transparent outline-none rounded px-1 py-0.5 text-xs font-medium ${
            value === 'опубликован' ? 'text-green-700 bg-green-50' : value === 'отменен' ? 'text-red-700 bg-red-50' :
            value === 'в работе' ? 'text-blue-700 bg-blue-50' : value === 'на согласовании' ? 'text-amber-700 bg-amber-50' : 'text-slate-600 bg-slate-100'
          }`} disabled={reviewMode}>
          <option value="запланирован">Запланирован</option><option value="в работе">В работе</option>
          <option value="на согласовании">На согласовании</option><option value="опубликован">Опубликован</option><option value="отменен">Отменен</option>
        </select>
      );
    }
    if (col.type === 'select' && col.options) {
      return (
        <select value={value || ''} onChange={(e) => onUpdate(row.id, col.key, e.target.value)}
          className="w-full bg-transparent outline-none text-slate-700 text-sm" disabled={reviewMode}>
          <option value="">—</option>
          {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    if (col.type === 'platforms') {
      const selected: string[] = value || [];
      return (
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            {PLATFORMS.slice(0, 3).map(p => {
              const Icon = p.icon; const isSelected = selected.includes(p.id);
              return (
                <label key={p.id} className={`cursor-pointer ${reviewMode ? 'pointer-events-none opacity-60' : ''}`} title={p.label}>
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
              const Icon = p.icon; const isSelected = selected.includes(p.id);
              return (
                <label key={p.id} className={`cursor-pointer ${reviewMode ? 'pointer-events-none opacity-60' : ''}`} title={p.label}>
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
      );
    }
    if (col.type === 'attachments') {
      return (
        <div className={`flex gap-2 ${reviewMode ? 'pointer-events-none opacity-60' : ''}`}>
          {[1, 2, 3].map((si) => (
            <label key={si} className="w-8 h-8 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-400 cursor-pointer transition-colors relative overflow-hidden" title={`Слот ${si}`}>
              {si === 1 ? <ImageIcon size={14} /> : si === 2 ? <Video size={14} /> : <FileText size={14} />}
              <input type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          ))}
        </div>
      );
    }
    if (reviewMode) {
      return <p className="truncate whitespace-nowrap overflow-hidden text-slate-700 text-sm">{value || <span className="text-slate-300 italic">—</span>}</p>;
    }
    return (
      <input type="text" value={value || ''} onChange={(e) => onUpdate(row.id, col.key, e.target.value)}
        placeholder={col.label + '...'}
        className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-300 text-sm" />
    );
  };

  const isVisible = (col: string) => !hiddenCols.has(col);
  const visibleCols = columns.filter(c => isVisible(c.key));

  // Зоны review для ячейки (border-1 вместо border-2 для тонкой обводки)
  const renderReviewZones = (colKey: string) => {
    if (!reviewMode) return null;
    const review = getReviewData(colKey);
    const borderColor = review.status === 'approved' ? 'border-green-500' : review.status === 'rejected' ? 'border-red-500' : 'border-transparent';
    const hasComment = review.comments.length > 0;

    return (
      <>
        {review.status !== 'none' && (
          <div className={`absolute inset-0 border ${borderColor} rounded pointer-events-none z-10`}
            style={{ boxShadow: review.status === 'approved' ? 'inset 0 0 6px rgba(34,197,94,0.12)' : 'inset 0 0 6px rgba(239,68,68,0.12)' }} />
        )}
        {hasComment && (
          <div className="absolute top-0 right-0 w-0 h-0 z-20 pointer-events-none"
            style={{ borderStyle: 'solid', borderWidth: '0 14px 14px 0', borderColor: 'transparent #eab308 transparent transparent' }} />
        )}
        <div
          className="absolute top-0 left-0 right-0 h-1/4 z-30 cursor-pointer group/comment"
          onClick={(e) => onCellClick(row.id, colKey, 'top', e)}
        >
          <div className="absolute inset-0 bg-blue-50/0 group-hover/comment:bg-blue-50/30 transition-colors rounded-t flex items-start justify-center pt-1">
            <MessageSquare size={12} className="text-blue-400 opacity-0 group-hover/comment:opacity-100 transition-opacity" />
          </div>
        </div>
        <div
          className="absolute bottom-0 left-0 w-1/2 h-1/4 z-30 cursor-pointer group/reject"
          onClick={(e) => onCellClick(row.id, colKey, 'bottom-left', e)}
        >
          <div className="absolute inset-0 bg-red-50/0 group-hover/reject:bg-red-100/50 transition-colors flex items-end justify-start pl-1 pb-0.5">
            <ThumbsDown size={10} className="text-red-400 opacity-0 group-hover/reject:opacity-100 transition-opacity" />
          </div>
        </div>
        <div
          className="absolute bottom-0 right-0 w-1/2 h-1/4 z-30 cursor-pointer group/approve"
          onClick={(e) => onCellClick(row.id, colKey, 'bottom-right', e)}
        >
          <div className="absolute inset-0 bg-green-50/0 group-hover/approve:bg-green-100/50 transition-colors rounded-br flex items-end justify-end pr-1 pb-0.5">
            <ThumbsUp size={10} className="text-green-500 opacity-0 group-hover/approve:opacity-100 transition-opacity" />
          </div>
        </div>
      </>
    );
  };

  const rowHasComment = rowReview.comments.length > 0;

  return (
    <tr ref={setNodeRef} style={rowOutlineStyle} className="group hover:bg-slate-50 transition-colors border-b border-slate-100 relative">
      {/* Grip ячейка - теперь шире (w-16) */}
      <td className="relative border-r border-slate-200 px-1" style={{ width: GRIP_WIDTH, minWidth: GRIP_WIDTH }}>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-blue-500 transition-colors" />
        <div className="flex items-center justify-center h-full">
          {!reviewMode && (
            <button className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 touch-none" {...attributes} {...listeners}>
              <GripVertical size={16} />
            </button>
          )}
          {reviewMode && (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <GripVertical size={16} />
            </div>
          )}
        </div>
        {!reviewMode && (
          <button onClick={() => onInsert(row.id)} className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20 hover:bg-blue-700">
            <Plus size={14} />
          </button>
        )}
        
        {/* Зоны review для всей строки (внутри Grip ячейки, но действия на всю строку) */}
        {reviewMode && (
          <>
            {/* Жёлтый треугольник комментария строки */}
            {rowHasComment && (
              <div className="absolute top-0 right-0 w-0 h-0 z-20 pointer-events-none"
                style={{ borderStyle: 'solid', borderWidth: '0 12px 12px 0', borderColor: 'transparent #eab308 transparent transparent' }} />
            )}
            <div className="absolute top-0 left-0 right-0 h-1/4 z-30 cursor-pointer group/rcomment" onClick={(e) => onCellClick(row.id, 'row', 'top', e)}>
              <div className="absolute inset-0 bg-blue-50/0 group-hover/rcomment:bg-blue-50/30 transition-colors flex items-start justify-center pt-1">
                <MessageSquare size={11} className="text-blue-400 opacity-0 group-hover/rcomment:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 w-1/2 h-1/4 z-30 cursor-pointer group/rreject" onClick={(e) => onCellClick(row.id, 'row', 'bottom-left', e)}>
              <div className="absolute inset-0 bg-red-50/0 group-hover/rreject:bg-red-100/50 transition-colors flex items-end justify-start pl-1 pb-0.5">
                <ThumbsDown size={10} className="text-red-400 opacity-0 group-hover/rreject:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-1/2 h-1/4 z-30 cursor-pointer group/rapprove" onClick={(e) => onCellClick(row.id, 'row', 'bottom-right', e)}>
              <div className="absolute inset-0 bg-green-50/0 group-hover/rapprove:bg-green-100/50 transition-colors flex items-end justify-end pr-1 pb-0.5">
                <ThumbsUp size={10} className="text-green-500 opacity-0 group-hover/rapprove:opacity-100 transition-opacity" />
              </div>
            </div>
          </>
        )}
      </td>

      {visibleCols.map((col) => {
        return (
          <td key={col.key} className="relative px-3 py-2 border-r border-slate-200 last:border-r-0" style={{ width: colWidths[col.key], minWidth: colWidths[col.key] }}>
            {renderCell(col)}
            {renderReviewZones(col.key)}
          </td>
        );
      })}
    </tr>
  );
}

export function ReviewableTable({
  taskPrefix, columns, initialRows, reviewMode, reviewMap, onReviewChange, kpiTarget
}: {
  taskPrefix: string;
  columns: ColumnConfig[];
  initialRows: TaskRow[];
  reviewMode: boolean;
  reviewMap: Map<string, ReviewData>;
  onReviewChange: (key: string, data: ReviewData) => void;
  kpiTarget?: number;
}) {
  const [rows, setRows] = useState<TaskRow[]>(initialRows);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [colWidths, setColWidths] = useState<Record<string, number>>(
    Object.fromEntries(columns.map(c => [c.key, c.width]))
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [tempText, setTempText] = useState('');
  const [commentBubble, setCommentBubble] = useState<{ key: string; x: number; y: number } | null>(null);

  const resizingCol = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const editorRef = useRef<HTMLDivElement>(null);

  const kpiField = columns.find(c => c.isKpiField);
  const kpiCount = kpiField ? rows.filter(r => r[kpiField.key] && String(r[kpiField.key]).trim().length > 0).length : 0;

  const handleCellClick = useCallback((rowId: string, colKey: string, zone: 'top' | 'bottom-left' | 'bottom-right', event: React.MouseEvent) => {
    const key = `${rowId}_${colKey}`;
    const current = reviewMap.get(key) || { status: 'none', comments: [] };

    if (zone === 'top') {
      setCommentBubble({ key, x: event.clientX, y: event.clientY });
      return;
    }

    if (zone === 'bottom-right') {
      const newStatus: ReviewStatus = current.status === 'approved' ? 'none' : 'approved';
      onReviewChange(key, { ...current, status: newStatus });
    }

    if (zone === 'bottom-left') {
      const newStatus: ReviewStatus = current.status === 'rejected' ? 'none' : 'rejected';
      onReviewChange(key, { ...current, status: newStatus });
    }
  }, [reviewMap, onReviewChange]);

  const handleCommentSave = useCallback((text: string) => {
    if (!commentBubble) return;
    const current = reviewMap.get(commentBubble.key) || { status: 'none', comments: [] };
    const newComment: ReviewComment = {
      id: `c-${Date.now()}`,
      text,
      author: 'ФЦ БАС',
      timestamp: new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    };
    onReviewChange(commentBubble.key, { ...current, comments: [...current.comments, newComment] });
    setCommentBubble(null);
  }, [commentBubble, reviewMap, onReviewChange]);

  const handleMouseDown = (e: React.MouseEvent, col: string) => {
    if (hiddenCols.has(col) || reviewMode) return;
    resizingCol.current = col; startX.current = e.clientX; startWidth.current = colWidths[col];
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

  const toggleHideColumn = (colKey: string) => {
    setHiddenCols(prev => { const next = new Set(prev); if (next.has(colKey)) next.delete(colKey); else next.add(colKey); return next; });
  };
  const resetColumnWidth = (colKey: string) => {
    const col = columns.find(c => c.key === colKey);
    if (col) setColWidths(prev => ({ ...prev, [colKey]: col.width }));
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
    if (reviewMode) return;
    const idx = rows.findIndex(r => r.id === afterId);
    const newRow: TaskRow = { id: `${taskPrefix}-row-${Date.now()}` };
    columns.forEach(c => { newRow[c.key] = c.type === 'status' ? 'запланирован' : c.type === 'platforms' ? [] : c.type === 'attachments' ? 3 : ''; });
    const n = [...rows]; n.splice(idx + 1, 0, newRow); setRows(n);
  };
  const updateCell = (id: string, field: string, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const onStatusChange = (id: string, status: Status) => updateCell(id, 'status', status);
  const togglePlatform = (rowId: string, platformId: string) => {
    const row = rows.find(r => r.id === rowId); if (!row) return;
    const current: string[] = row.platforms || [];
    updateCell(rowId, 'platforms', current.includes(platformId) ? current.filter(p => p !== platformId) : [...current, platformId]);
  };

  // Функция openTextEdit удалена как неиспользуемая
  useEffect(() => { if (editingCell && editorRef.current) editorRef.current.innerHTML = tempText; }, [editingCell]);
  const handleEditorInput = () => { if (editorRef.current) setTempText(editorRef.current.innerHTML); };
  const execFormat = (command: string) => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(command, false);
    if (editorRef.current) setTempText(editorRef.current.innerHTML);
  };
  const saveText = () => {
    if (editingCell) { updateCell(editingCell.rowId, editingCell.colKey, tempText); setEditingCell(null); }
  };

  const activeRow = activeId ? rows.find(r => r.id === activeId) : null;
  const visibleColumns = columns.filter(c => !hiddenCols.has(c.key));
  
  // Итоговая minWidth таблицы = Grip + сумма видимых колонок
  const tableMinWidth = GRIP_WIDTH + visibleColumns.reduce((s, c) => s + colWidths[c.key], 0);

  return (
    <>
      {kpiTarget && (
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {kpiField?.label || 'Записей'}: {kpiCount}/{kpiTarget}
          </span>
          <div className="flex-1 max-w-xs h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                kpiCount >= kpiTarget ? 'bg-green-500' : kpiCount >= kpiTarget * 0.5 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (kpiCount / kpiTarget) * 100)}%` }}
            />
          </div>
          {kpiCount >= kpiTarget && <Check size={16} className="text-green-500" />}
        </div>
      )}

      {hiddenCols.size > 0 && (
        <div className="flex items-center gap-2 mb-2 shrink-0 flex-wrap">
          <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">Скрыто:</span>
          {Array.from(hiddenCols).map(colKey => {
            const col = columns.find(c => c.key === colKey);
            return (
              <button key={colKey} onClick={() => toggleHideColumn(colKey)} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                <ChevronLeft size={12} />{col?.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Контейнер таблицы с горизонтальным скроллом */}
      <div className="flex-1 min-h-[400px] overflow-auto bg-white border border-slate-200 rounded-xl select-none" style={{ maxWidth: '100%' }}>
        <DndContext sensors={reviewMode ? [] : sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {/* Убрали w-full — таблица теперь расширяется за пределы контейнера по minWidth */}
          <table className="border-collapse text-sm text-left" style={{ tableLayout: 'fixed', minWidth: tableMinWidth }}>
            <colgroup>
              <col style={{ width: GRIP_WIDTH }} />
              {visibleColumns.map(col => <col key={col.key} style={{ width: colWidths[col.key] }} />)}
            </colgroup>
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="border-b border-r border-slate-200" style={{ width: GRIP_WIDTH, minWidth: GRIP_WIDTH }} />
                {visibleColumns.map((col, colIndex) => {
                  const nextCol = visibleColumns[colIndex + 1];
                  const isNextHidden = nextCol ? hiddenCols.has(nextCol.key) : false;
                  const isLastCol = colIndex === visibleColumns.length - 1;
                  return (
                    <th key={col.key} className="relative px-3 py-3 font-semibold text-slate-700 border-b border-r border-slate-200 last:border-r-0" style={{ width: colWidths[col.key], minWidth: colWidths[col.key] }}>
                      {col.label}
                      {!isLastCol && !reviewMode && (
                        <div className={`absolute right-0 top-0 bottom-0 cursor-col-resize transition-colors flex items-center justify-center group/border ${isNextHidden ? 'w-2 bg-amber-200 hover:bg-amber-300' : 'w-1 hover:bg-blue-400 bg-transparent'}`} onMouseDown={(e) => handleMouseDown(e, col.key)}>
                          {!isNextHidden && nextCol && (
                            <button onClick={(e) => { e.stopPropagation(); toggleHideColumn(nextCol.key); }} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center opacity-0 group-hover/border:opacity-100 transition-opacity hover:bg-blue-50 hover:border-blue-400 z-30">
                              <ChevronLeft size={12} className="text-slate-500" />
                            </button>
                          )}
                          {isNextHidden && nextCol && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col gap-1 opacity-0 group-hover/border:opacity-100 transition-opacity z-30">
                              <button onClick={(e) => { e.stopPropagation(); toggleHideColumn(nextCol.key); }} className="w-5 h-5 rounded-full bg-white border border-amber-400 shadow-sm flex items-center justify-center hover:bg-amber-50"><ChevronLeft size={12} className="text-amber-700" /></button>
                              <button onClick={(e) => { e.stopPropagation(); resetColumnWidth(col.key); }} className="w-5 h-5 rounded-full bg-white border border-amber-400 shadow-sm flex items-center justify-center hover:bg-amber-50"><RotateCcw size={10} className="text-amber-700" /></button>
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
                  <ReviewableRow
                    key={row.id} row={row} columns={columns} colWidths={colWidths}
                    hiddenCols={hiddenCols} reviewMode={reviewMode} reviewMap={reviewMap}
                    onUpdate={updateCell} onInsert={insertRow}
                    onTogglePlatform={togglePlatform} onStatusChange={onStatusChange}
                    onCellClick={handleCellClick}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
          <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
            {activeRow ? (
              <table className="bg-white shadow-2xl rounded-lg border border-blue-200 opacity-90"><tbody>
                <tr className="bg-blue-50/50">
                  <td className="px-2 py-2 border-r border-slate-200"><GripVertical size={14} className="text-slate-400" /></td>
                  {visibleColumns.map(col => <td key={col.key} className="px-3 py-2 border-r border-slate-200 text-sm text-slate-700 max-w-[150px] truncate">{String(activeRow[col.key] || '—')}</td>)}
                </tr>
              </tbody></table>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {commentBubble && (
        <CommentBubble
          x={commentBubble.x} y={commentBubble.y}
          comments={(reviewMap.get(commentBubble.key) || { comments: [] }).comments}
          onSave={handleCommentSave}
          onClose={() => setCommentBubble(null)}
        />
      )}

      {editingCell && !reviewMode && (
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