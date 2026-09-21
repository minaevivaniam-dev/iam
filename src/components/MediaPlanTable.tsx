import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, Bold, Italic, List, Image as ImageIcon, Video, FileText, Check, GripVertical, Save } from 'lucide-react';
import { useMediaPlanStore } from '../store/mediaPlanStore';

type Status = 'запланирован' | 'в работе' | 'на согласовании' | 'опубликован' | 'отменен';
type Platform = 'ВК' | 'Telegram' | 'МАКС' | 'Дзен' | 'VC.ru';
type MediaTab = 'social' | 'smi';

interface MediaRow {
  id: string;
  date: string;
  status: Status;
  rubric: string;
  attachments: number;
  platforms: Platform[];
  text: string;
}

const generateInitialRows = (prefix: string): MediaRow[] => {
  const rows: MediaRow[] = [];
  const startDate = new Date(2026, 8, 17);
  for (let i = 0; i < 30; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    rows.push({ id: `${prefix}-row-${i}`, date: d.toISOString().split('T')[0], status: 'запланирован', rubric: '', attachments: 3, platforms: [], text: '' });
  }
  return rows;
};

// Безопасный рендеринг HTML-текста с truncation
function RichTextCell({ html, maxWidth }: { html: string; maxWidth: number }) {
  if (!html) return <span className="text-slate-300 italic">Нажмите для ввода...</span>;
  // Убираем теги для plain-text fallback, но рендерим HTML визуально
  return (
    <div
      className="truncate whitespace-nowrap overflow-hidden text-slate-700 text-sm prose prose-sm max-w-none m-0 p-0 [&>p]:m-0 [&>ul]:m-0 [&>li]:m-0"
      style={{ maxWidth: `${maxWidth - 24}px` }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SortableTableRow({ row, index, colWidths, onUpdate, onInsert, onEditClick }: {
  row: MediaRow; index: number; colWidths: Record<string, number>;
  onUpdate: (id: string, field: keyof MediaRow, val: any) => void;
  onInsert: (idx: number) => void;
  onEditClick: (id: string, txt: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto', opacity: isDragging ? 0.9 : 1, boxShadow: isDragging ? '0 10px 25px -5px rgba(0,0,0,0.1)' : 'none', backgroundColor: isDragging ? '#f8fafc' : 'transparent' };

  return (
    <tr ref={setNodeRef} style={style} className="group hover:bg-slate-50 transition-colors border-b border-slate-100">
      <td className="relative px-3 py-2 border-r border-slate-200" style={{ width: colWidths.date }}>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-blue-500 transition-colors" />
        <div className="flex items-center gap-2">
          <button className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 touch-none" {...attributes} {...listeners}><GripVertical size={16} /></button>
          <input type="date" value={row.date} onChange={(e) => onUpdate(row.id, 'date', e.target.value)} className="w-full bg-transparent outline-none text-slate-700 text-sm" />
        </div>
        <button onClick={() => onInsert(index)} className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20 hover:bg-blue-700"><Plus size={14} /></button>
      </td>
      <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.status }}>
        <select value={row.status} onChange={(e) => onUpdate(row.id, 'status', e.target.value)} className={`w-full bg-transparent outline-none rounded px-1 py-0.5 text-xs font-medium ${
          row.status === 'опубликован' ? 'text-green-700 bg-green-50' : row.status === 'отменен' ? 'text-red-700 bg-red-50' : row.status === 'в работе' ? 'text-blue-700 bg-blue-50' : row.status === 'на согласовании' ? 'text-amber-700 bg-amber-50' : 'text-slate-600 bg-slate-100'}`}>
          <option value="запланирован">Запланирован</option><option value="в работе">В работе</option><option value="на согласовании">На согласовании</option><option value="опубликован">Опубликован</option><option value="отменен">Отменен</option>
        </select>
      </td>
      <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.rubric }}><input type="text" value={row.rubric} onChange={(e) => onUpdate(row.id, 'rubric', e.target.value)} placeholder="Рубрика..." className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-300 text-sm" /></td>
      <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.attach }}>
        <div className="flex gap-2">{[1, 2, 3].map((si) => (<label key={si} className="w-8 h-8 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-400 cursor-pointer transition-colors relative overflow-hidden" title={`Слот ${si}`}>{si === 1 ? <ImageIcon size={14} /> : si === 2 ? <Video size={14} /> : <FileText size={14} />}<input type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="absolute inset-0 opacity-0 cursor-pointer" /></label>))}</div>
      </td>
      <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.platform }}>
        <div className="flex flex-wrap gap-1">{(['ВК', 'Telegram', 'МАКС', 'Дзен', 'VC.ru'] as Platform[]).map(p => (<label key={p} className="flex items-center gap-1 cursor-pointer select-none"><div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${row.platforms.includes(p) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>{row.platforms.includes(p) && <Check size={10} className="text-white" />}</div><input type="checkbox" checked={row.platforms.includes(p)} onChange={() => { const ps = row.platforms.includes(p) ? row.platforms.filter(x => x !== p) : [...row.platforms, p]; onUpdate(row.id, 'platforms', ps); }} className="hidden" /><span className="text-xs text-slate-600">{p}</span></label>))}</div>
      </td>
      <td className="px-3 py-2 cursor-pointer hover:bg-blue-50/30 transition-colors overflow-hidden" style={{ width: colWidths.text }} onClick={() => onEditClick(row.id, row.text)}>
        <RichTextCell html={row.text} maxWidth={colWidths.text} />
      </td>
    </tr>
  );
}

function SingleMediaTable({ tabPrefix }: { tabPrefix: string }) {
  const storeRows = useMediaPlanStore((s) => s.rows);
  const updateRowInStore = useMediaPlanStore((s) => s.updateRow);
  const addRowInStore = useMediaPlanStore((s) => s.addRow);
  const initialized = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<MediaRow[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempText, setTempText] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [colWidths, setColWidths] = useState({ date: 160, status: 150, rubric: 150, attach: 140, platform: 220, text: 300 });
  const resizingCol = useRef<keyof typeof colWidths | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<Range | null>(null);

  useEffect(() => {
    if (!initialized.current) {
      const filtered = storeRows.filter(r => r.id.startsWith(tabPrefix));
      if (filtered.length > 0) {
        setRows(filtered.map(r => ({ id: r.id, date: r.date || '', status: (r.status as Status) || 'запланирован', rubric: r.rubric || '', attachments: 3, platforms: (r.platforms as Platform[]) || [], text: r.text_content || '' })));
      } else {
        setRows(generateInitialRows(tabPrefix));
      }
      initialized.current = true;
    }
  }, [storeRows, tabPrefix]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));

  // Ресайз с гарантированным cleanup
  const handleMouseDown = useCallback((e: React.MouseEvent, col: keyof typeof colWidths) => {
    resizingCol.current = col;
    startX.current = e.clientX;
    startWidth.current = colWidths[col];
    const onMove = (ev: MouseEvent) => {
      if (!resizingCol.current) return;
      const newWidth = Math.max(40, startWidth.current + ev.clientX - startX.current);
      setColWidths(prev => ({ ...prev, [resizingCol.current!]: newWidth }));
    };
    const onUp = () => {
      resizingCol.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  }, [colWidths]);

  const handleDragStart = (event: any) => setActiveId(event.active.id as string);
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oi = rows.findIndex(i => i.id === active.id);
      const ni = rows.findIndex(i => i.id === over.id);
      setRows(items => arrayMove(items, oi, ni));
      setHasChanges(true);
    }
  };

  const insertRow = (afterIndex: number) => {
    const newRow: MediaRow = { id: `${tabPrefix}-row-${Date.now()}`, date: '', status: 'запланирован', rubric: '', attachments: 3, platforms: [], text: '' };
    const n = [...rows]; n.splice(afterIndex + 1, 0, newRow); setRows(n);
    setHasChanges(true);
  };

  const updateCell = (id: string, field: keyof MediaRow, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    setHasChanges(true);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const row of rows) {
        const existing = storeRows.find(r => r.id === row.id);
        if (existing) {
          await updateRowInStore(row.id, { date: row.date, status: row.status, rubric: row.rubric, platforms: row.platforms, text_content: row.text });
        } else {
          await addRowInStore({ id: row.id, date: row.date, status: row.status, rubric: row.rubric, platforms: row.platforms, text_content: row.text, sort_order: rows.indexOf(row) });
        }
      }
      setHasChanges(false);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert('Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  // Сохраняем позицию курсора перед открытием модалки
  const openTextEdit = (id: string, t: string) => {
    setEditingCell(id);
    setTempText(t);
  };

  useEffect(() => {
    if (editingCell && editorRef.current) {
      editorRef.current.innerHTML = tempText;
      // Ставим курсор в конец после установки контента
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editingCell]);

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      setTempText(editorRef.current.innerHTML);
      setHasChanges(true);
    }
  }, []);

  // Форматирование с сохранением/восстановлением фокуса
  const execFormat = useCallback((command: string) => {
    // Восстанавливаем selection в contentEditable перед выполнением команды
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false);
    if (editorRef.current) {
      setTempText(editorRef.current.innerHTML);
      setHasChanges(true);
    }
  }, []);

  const saveText = () => {
    if (editingCell) {
      updateCell(editingCell, 'text', tempText);
      setEditingCell(null);
    }
  };

  const activeRow = activeId ? rows.find(r => r.id === activeId) : null;

  const columns = [
    { key: 'date', label: 'Дата' },
    { key: 'status', label: 'Статус' },
    { key: 'rubric', label: 'Рубрика' },
    { key: 'attach', label: 'Вложения' },
    { key: 'platform', label: 'Площадка' },
    { key: 'text', label: 'Текст' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end mb-3 shrink-0">
        <button
          onClick={saveAll}
          disabled={!hasChanges || saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            hasChanges ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Save size={16} />
          {saving ? 'Сохранение...' : hasChanges ? 'Сохранить изменения' : 'Нет изменений'}
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl relative select-none">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <table className="w-full border-collapse text-sm text-left" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {columns.map(col => (
                <col key={col.key} style={{ width: colWidths[col.key as keyof typeof colWidths] }} />
              ))}
            </colgroup>
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="relative px-3 py-3 font-semibold text-slate-700 border-b border-r border-slate-200">
                    {col.label}
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors" onMouseDown={(e) => handleMouseDown(e, col.key as keyof typeof colWidths)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                {rows.map((row, index) => (
                  <SortableTableRow key={row.id} row={row} index={index} colWidths={colWidths} onUpdate={updateCell} onInsert={insertRow} onEditClick={openTextEdit} />
                ))}
              </SortableContext>
            </tbody>
          </table>
          <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
            {activeRow ? (
              <table className="w-full border-collapse text-sm text-left bg-white shadow-2xl rounded-lg overflow-hidden border border-blue-200 opacity-90" style={{ tableLayout: 'fixed' }}>
                <tbody><tr className="bg-blue-50/50">
                  <td className="px-3 py-2 border-r border-slate-200 font-medium text-slate-900" style={{ width: colWidths.date }}>{activeRow.date || 'Без даты'}</td>
                  <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.status }}>{activeRow.status}</td>
                  <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.rubric }}>{activeRow.rubric || '-'}</td>
                  <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.attach }}>3 слота</td>
                  <td className="px-3 py-2 border-r border-slate-200" style={{ width: colWidths.platform }}>{activeRow.platforms.length} пл.</td>
                  <td className="px-3 py-2 truncate" style={{ width: colWidths.text }}>{activeRow.text || 'Нет текста'}</td>
                </tr></tbody>
              </table>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {editingCell && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Редактирование текста</h3>
              <button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-2 border-b border-slate-100 flex gap-2">
              <button
                onMouseDown={(e) => { e.preventDefault(); execFormat('bold'); }}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 font-bold"
              ><Bold size={16} /></button>
              <button
                onMouseDown={(e) => { e.preventDefault(); execFormat('italic'); }}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 italic"
              ><Italic size={16} /></button>
              <button
                onMouseDown={(e) => { e.preventDefault(); execFormat('insertUnorderedList'); }}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
              ><List size={16} /></button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              className="flex-1 p-6 outline-none resize-none text-slate-700 leading-relaxed text-sm min-h-[300px] overflow-y-auto prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5"
              style={{ whiteSpace: 'pre-wrap' }}
            />
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setEditingCell(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Закрыть</button>
              <button onClick={saveText} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MediaPlanTable() {
  const [activeMediaTab, setActiveMediaTab] = useState<MediaTab>('social');

  const mediaTabs: { id: MediaTab; label: string }[] = [
    { id: 'social', label: 'Соцмедиа' },
    { id: 'smi', label: 'СМИ' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center gap-1 mb-3 shrink-0">
        {mediaTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveMediaTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeMediaTab === tab.id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {activeMediaTab === 'social' && <SingleMediaTable tabPrefix="social" />}
        {activeMediaTab === 'smi' && <SingleMediaTable tabPrefix="smi" />}
      </div>
    </div>
  );
}