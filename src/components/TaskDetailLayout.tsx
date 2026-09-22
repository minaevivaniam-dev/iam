import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, FileText,
  Edit3, Eye, Upload, Download, Clock3
} from 'lucide-react';
import { ReviewableTable, type ReviewData, type ColumnConfig, type TaskRow } from './ReviewableTable';
import {
  downloadTextFile,
  fileToDataUrl,
  loadRemoteActivity,
  loadRemoteDocument,
  persistActivity,
  persistDocument,
  readDocument,
  subscribeToTask,
  type ActivityEntry,
  type UploadedDocument,
  writeDocument,
} from '../lib/documentWorkspace';
import { supabase } from '../lib/supabase';

export interface TaskConfig {
  title: string;
  assignee: string;
  description: string;
  metrics: { progress: number; time: number; quality: number; cost: number };
  startDate?: string;
  endDate?: string;
  columns?: ColumnConfig[];
  initialRows?: TaskRow[];
  kpiTarget?: number;
  mode?: 'table' | 'notes';
  notesPlaceholder?: string;
  notesDefault?: string;
}

type TaskMetrics = { startDate: string; endDate: string; quality: number; cost: number };

function normalizeMetrics(config: TaskConfig): TaskMetrics {
  return {
    startDate: config.startDate ?? '2026-09-14',
    endDate: config.endDate ?? '2026-09-22',
    quality: 10,
    cost: 10,
  };
}

const ASSIGNEES = [
  { id: 'copywriter', name: 'Копирайтер' },
  { id: 'designer', name: 'Дизайнер' },
  { id: 'manager', name: 'Менеджер' },
  { id: 'analyst', name: 'Аналитик' },
  { id: 'editor', name: 'Редактор' },
  { id: 'smm', name: 'SMM-специалист' },
];

export function TaskDetailLayout({ config, taskPrefix, onBack }: { config: TaskConfig; taskPrefix: string; onBack: () => void }) {
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewMap, setReviewMap] = useState<Map<string, ReviewData>>(new Map());
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [descriptionText, setDescriptionText] = useState(config.description);
  const [notesText, setNotesText] = useState(config.notesDefault ?? config.description);
  const [selectedAssignee, setSelectedAssignee] = useState(config.assignee);
  const [editableMetrics, setEditableMetrics] = useState<TaskMetrics>(() => normalizeMetrics(config));
  const [approvalStatus, setApprovalStatus] = useState<'draft' | 'pending' | 'approved' | 'rework'>('draft');
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [uploads, setUploads] = useState<UploadedDocument[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  const notesDirtyRef = useRef(false);
  const descriptionDirtyRef = useRef(false);
  const metricsDirtyRef = useRef(false);
  const metricsHydratedRef = useRef(false);
  const metricsSaveTimer = useRef<number | null>(null);
  const tableSaveRef = useRef<(() => Promise<boolean>) | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const registerTableSave = useCallback((save: () => Promise<boolean>) => {
    tableSaveRef.current = save;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      const doc = await loadRemoteDocument(taskPrefix, config.title);
      const items = await loadRemoteActivity(taskPrefix);

      if (!isMounted) return;
      setActivity(items);
      setUploads(doc.uploads);
      setNotesText(doc.content || config.notesDefault || config.description);
      setDescriptionText(doc.description ?? config.description);
      setSelectedAssignee(doc.assignee ?? config.assignee);
      setEditableMetrics(doc.metrics ?? normalizeMetrics(config));
      setApprovalStatus(doc.approvalStatus ?? 'draft');
      notesDirtyRef.current = false;
      descriptionDirtyRef.current = false;
      metricsHydratedRef.current = true;
    };

    void hydrate();

    const unsubscribe = subscribeToTask(taskPrefix, async () => {
      const doc = await loadRemoteDocument(taskPrefix, config.title);
      const items = await loadRemoteActivity(taskPrefix);
      setActivity(items);
      setUploads(doc.uploads);
      if (!notesDirtyRef.current && doc.content !== notesText) {
        setNotesText(doc.content || config.notesDefault || config.description);
      }
      if (!descriptionDirtyRef.current && doc.description !== descriptionText) {
        setDescriptionText(doc.description ?? config.description);
      }
      if (!descriptionDirtyRef.current && doc.assignee !== selectedAssignee) {
        setSelectedAssignee(doc.assignee ?? config.assignee);
      }
      if (metricsHydratedRef.current && !metricsDirtyRef.current && doc.metrics) {
        setEditableMetrics(doc.metrics);
      }
      setApprovalStatus(doc.approvalStatus ?? 'draft');
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [config.description, config.notesDefault, config.title, taskPrefix]);

  useEffect(() => {
    if (!metricsHydratedRef.current) return;
    if (metricsSaveTimer.current) window.clearTimeout(metricsSaveTimer.current);
    metricsSaveTimer.current = window.setTimeout(async () => {
      const current = readDocument(taskPrefix, config.title);
      const next = { ...current, title: config.title, taskId: taskPrefix, description: descriptionText, assignee: selectedAssignee, metrics: editableMetrics, updatedAt: new Date().toISOString() };
      writeDocument(taskPrefix, next);
      await persistDocument(taskPrefix, next);
      metricsDirtyRef.current = false;
    }, 600);
    return () => { if (metricsSaveTimer.current) window.clearTimeout(metricsSaveTimer.current); };
  }, [config.title, descriptionText, editableMetrics, selectedAssignee, taskPrefix]);

  useEffect(() => {
    if (config.mode !== 'notes') return;

    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = window.setTimeout(async () => {
      const current = readDocument(taskPrefix, config.title);
      const next = {
        ...current,
        title: config.title,
        taskId: taskPrefix,
        content: notesText,
        description: descriptionText,
        assignee: selectedAssignee,
        metrics: editableMetrics,
        updatedAt: new Date().toISOString(),
        uploads,
      };
      writeDocument(taskPrefix, next);
      await persistDocument(taskPrefix, next);
      notesDirtyRef.current = false;
      descriptionDirtyRef.current = false;
      await persistActivity(taskPrefix, 'autosave', 'Документ сохранён автоматически');
      const items = await loadRemoteActivity(taskPrefix);
      setActivity(items);
    }, 600);

    return () => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current);
      }
    };
  }, [config.assignee, config.description, config.mode, config.title, descriptionText, notesText, selectedAssignee, taskPrefix, uploads]);

  const handleReviewChange = useCallback((key: string, data: ReviewData) => {
    setReviewMap(prev => {
      const next = new Map(prev);
      next.set(key, data);
      return next;
    });
  }, []);

  const reviewStats = {
    approved: Array.from(reviewMap.values()).filter(r => r.status === 'approved').length,
    rejected: Array.from(reviewMap.values()).filter(r => r.status === 'rejected').length,
    commented: Array.from(reviewMap.values()).filter(r => r.comments.length > 0).length,
  };

  const handleManualSave = async () => {
    setSaveState('saving');
    try {
      let saved = false;
      if (config.mode === 'table' && tableSaveRef.current) {
        saved = await tableSaveRef.current();
      } else {
        const current = readDocument(taskPrefix, config.title);
        const next = {
          ...current,
          title: config.title,
          taskId: taskPrefix,
          content: notesText,
          description: descriptionText,
          assignee: selectedAssignee,
          metrics: editableMetrics,
          updatedAt: new Date().toISOString(),
          uploads,
        };
        writeDocument(taskPrefix, next);
        saved = await persistDocument(taskPrefix, next);
        await persistActivity(taskPrefix, 'save', 'Документ сохранён вручную');
        setActivity(await loadRemoteActivity(taskPrefix));
      }
      setSaveState(saved ? 'saved' : 'error');
      window.setTimeout(() => setSaveState('idle'), 1800);
    } catch {
      setSaveState('error');
    }
  };

  const saveApprovalStatus = async (nextStatus: 'pending' | 'approved' | 'rework') => {
    const current = readDocument(taskPrefix, config.title);
    const next = {
      ...current,
      title: config.title,
      taskId: taskPrefix,
      content: notesText,
      description: descriptionText,
      assignee: selectedAssignee,
      metrics: editableMetrics,
      approvalStatus: nextStatus,
      updatedAt: new Date().toISOString(),
      uploads,
    };
    setApprovalStatus(nextStatus);
    writeDocument(taskPrefix, next);
    const saved = await persistDocument(taskPrefix, next);
    await persistActivity(taskPrefix, nextStatus === 'pending' ? 'submit-review' : nextStatus, nextStatus === 'approved' ? 'Задача согласована: деньги 10/10, качество 10/10' : nextStatus === 'rework' ? 'Задача отправлена на доработку' : 'Задача отправлена на согласование');
    return saved;
  };

  const handleApprove = async () => {
    const confirmed = window.confirm('Подтвердить выполнение задачи на 10 из 10 по деньгам и качеству?');
    if (!confirmed) return;
    await saveApprovalStatus('approved');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const timestamp = Date.now();
    const storagePath = `${taskPrefix}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    let uploadedDoc: UploadedDocument = {
      id: `${timestamp}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: new Date().toISOString(),
      storagePath,
      url: '',
    };

    try {
      const { error } = await supabase.storage.from('documents').upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

      if (error) {
        throw error;
      }

      const { data, error: signedUrlError } = await supabase.storage.from('documents').createSignedUrl(storagePath, 3600);
      if (signedUrlError) throw signedUrlError;
      uploadedDoc = {
        ...uploadedDoc,
        url: data?.signedUrl || '',
      };
    } catch {
      const dataUrl = await fileToDataUrl(file);
      uploadedDoc = {
        ...uploadedDoc,
        dataUrl,
      };
    }

    const current = readDocument(taskPrefix, config.title);
    const next = {
      ...current,
      title: config.title,
      taskId: taskPrefix,
      content: notesText,
      uploads: [...current.uploads, uploadedDoc],
      updatedAt: new Date().toISOString(),
    };
    writeDocument(taskPrefix, next);
    setUploads(next.uploads);
    await persistDocument(taskPrefix, next);
    await persistActivity(taskPrefix, 'upload', `Загружен файл: ${file.name}. Ссылка сохранена в документе.`);
    setActivity(await loadRemoteActivity(taskPrefix));
    event.target.value = '';
  };

  const handleDownload = async (doc: UploadedDocument) => {
    let url = doc.url || doc.dataUrl;

    if (doc.storagePath) {
      const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storagePath, 3600);
      url = data?.signedUrl || url;
    }

    if (!url) return;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (url.startsWith('data:text/plain')) {
      const [, raw] = (doc.dataUrl ?? '').split(',');
      downloadTextFile(doc.name, decodeURIComponent(raw || ''));
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = doc.name;
    link.click();
  };

  return (
    <div className="flex flex-col">
      {/* === ШАПКА === */}
      <div className="flex items-start justify-between mb-4 shrink-0 gap-4">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <button onClick={onBack} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors self-start">
            <ArrowLeft size={14} /> К списку задач
          </button>
          <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setIsDescriptionOpen(!isDescriptionOpen)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isDescriptionOpen ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
              <FileText size={16} />{isDescriptionOpen ? 'Скрыть описание' : 'Описание задачи'}
            </button>

            {/* Переключатель режима */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setReviewMode(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!reviewMode ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Edit3 size={13} /> Редактирование
              </button>
              <button
                onClick={() => setReviewMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${reviewMode ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Eye size={13} /> Согласование
              </button>
            </div>

            {/* Статистика review */}
            {reviewMode && (reviewStats.approved > 0 || reviewStats.rejected > 0 || reviewStats.commented > 0) && (
              <div className="flex items-center gap-2 text-xs">
                {reviewStats.approved > 0 && <span className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">✓ {reviewStats.approved}</span>}
                {reviewStats.rejected > 0 && <span className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200">✗ {reviewStats.rejected}</span>}
                {reviewStats.commented > 0 && <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">💬 {reviewStats.commented}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
        {!reviewMode && approvalStatus !== 'approved' && (
          <button onClick={() => { void saveApprovalStatus('pending'); setReviewMode(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100">
            Отправить на согласование
          </button>
        )}
        {reviewMode && approvalStatus === 'pending' && (
          <>
            <button onClick={() => { void handleApprove(); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700">Согласовать</button>
            <button onClick={() => { void saveApprovalStatus('rework'); setReviewMode(false); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 text-white hover:bg-rose-700">Отправить на доработку</button>
          </>
        )}
        <button
          onClick={handleManualSave}
          disabled={saveState === 'saving'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm shrink-0 transition-colors ${
            saveState === 'saved' ? 'bg-emerald-600' : saveState === 'error' ? 'bg-red-600' : saveState === 'saving' ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Save size={16} />{saveState === 'saving' ? 'Сохранение...' : saveState === 'saved' ? 'Сохранено в базе' : saveState === 'error' ? 'Локально сохранено' : 'Сохранить'}
        </button>
        </div>
      </div>

      {/* === ОПИСАНИЕ === */}
      {isDescriptionOpen && (
        <div className="description-container bg-slate-50 p-4 flex mb-2 rounded-xl" style={{ height: 280 }}>
          <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto flex flex-col w-1/2">
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Ответственный</p>
              <select
                value={selectedAssignee}
                onChange={(e) => {
                  descriptionDirtyRef.current = true;
                  setSelectedAssignee(e.target.value);
                }}
                className="flex items-center gap-2 text-sm font-medium text-slate-900 bg-transparent border border-slate-200 rounded px-2 py-1 hover:border-blue-400 transition-colors cursor-pointer outline-none focus:border-blue-500"
              >
                {ASSIGNEES.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2 shrink-0">Описание задачи</h3>
            <textarea
              value={descriptionText}
              onChange={(e) => {
                descriptionDirtyRef.current = true;
                setDescriptionText(e.target.value);
              }}
              className="flex-1 text-sm text-slate-600 leading-relaxed w-full resize-none outline-none bg-transparent"
              placeholder="Введите описание задачи..."
            />
          </div>
          <div className="w-2 bg-slate-300 rounded-full mx-2 shrink-0" />
          <div className="flex flex-col gap-3 w-1/2">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-center shrink-0" style={{ perspective: '600px' }}>
              <div className="flex items-center gap-2">
                <div className="relative" style={{ width: 40, height: 40, transformStyle: 'preserve-3d', transform: 'rotateX(-20deg) rotateY(-30deg)' }}>
                  <div className="absolute inset-0 bg-transparent border-2 border-blue-500" style={{ transform: 'translateZ(20px)' }} />
                  <div className="absolute inset-0 bg-transparent border-2 border-blue-500" style={{ transform: 'rotateY(90deg) translateZ(20px)' }} />
                  <div className="absolute inset-0 bg-transparent border-2 border-blue-500" style={{ transform: 'rotateX(90deg) translateZ(20px)' }} />
                </div>
                <div className="flex items-center"><div className="w-6 h-0.5 bg-slate-400" /><div className="w-2 h-2 rounded-full bg-slate-500" /><div className="w-6 h-0.5 bg-slate-400" /></div>
                <div className="relative" style={{ width: 40, height: 40, transformStyle: 'preserve-3d', transform: 'rotateX(-20deg) rotateY(-30deg)' }}>
                  <div className="absolute inset-0 bg-transparent border-2 border-indigo-500" style={{ transform: 'translateZ(20px)' }} />
                  <div className="absolute inset-0 bg-transparent border-2 border-indigo-500" style={{ transform: 'rotateY(90deg) translateZ(20px)' }} />
                  <div className="absolute inset-0 bg-transparent border-2 border-indigo-500" style={{ transform: 'rotateX(90deg) translateZ(20px)' }} />
                </div>
                <div className="flex items-center"><div className="w-6 h-0.5 bg-slate-400" /><div className="w-2 h-2 rounded-full bg-slate-500" /><div className="w-6 h-0.5 bg-slate-400" /></div>
                <div className="relative" style={{ width: 40, height: 40, transformStyle: 'preserve-3d', transform: 'rotateX(-20deg) rotateY(-30deg)' }}>
                  <div className="absolute inset-0 bg-transparent border-2 border-emerald-500" style={{ transform: 'translateZ(20px)' }} />
                  <div className="absolute inset-0 bg-transparent border-2 border-emerald-500" style={{ transform: 'rotateY(90deg) translateZ(20px)' }} />
                  <div className="absolute inset-0 bg-transparent border-2 border-emerald-500" style={{ transform: 'rotateX(90deg) translateZ(20px)' }} />
                </div>
              </div>
            </div>
            <div className="flex-1 flex gap-3 min-h-0">
              <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-2.5 justify-center">
                {[
                  { key: 'quality' as const, label: 'Качество' },
                  { key: 'cost' as const, label: 'Деньги' },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-20 shrink-0">{m.label}</span>
                    <input type="number" min="1" max="10" step="1" value={editableMetrics[m.key]} onChange={(e) => { metricsDirtyRef.current = true; setEditableMetrics((current) => ({ ...current, [m.key]: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })); }} className="w-20 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500" />
                    <span className="text-xs text-slate-400">из 10</span>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-20 shrink-0">Период</span>
                  <input type="date" value={editableMetrics.startDate} onChange={(e) => { metricsDirtyRef.current = true; setEditableMetrics((current) => ({ ...current, startDate: e.target.value })); }} className="min-w-0 flex-1 border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500" />
                  <span className="text-xs text-slate-400">до</span>
                  <input type="date" value={editableMetrics.endDate} min={editableMetrics.startDate} onChange={(e) => { metricsDirtyRef.current = true; setEditableMetrics((current) => ({ ...current, endDate: e.target.value })); }} className="min-w-0 flex-1 border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="w-40 bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-center shrink-0">
                <select className="text-xs text-slate-500 bg-transparent outline-none cursor-pointer border border-slate-200 rounded px-2 py-1 hover:border-blue-400 transition-colors">
                  <option>Участники</option><option>Копирайтер</option><option>Дизайнер</option><option>Менеджер</option><option>ФЦ БАС</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === ПОДСКАЗКА ПО РЕЖИМУ СОГЛАСОВАНИЯ === */}
      {reviewMode && (
        <div className="mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-xs text-amber-800 shrink-0">
          <Eye size={14} className="shrink-0" />
          <span>
            <strong>Режим согласования.</strong> Наведите на верх ячейки — 💬 комментарий. На низ слева — ✗ отклонить. На низ справа — ✓ согласовать. Повторный клик снимает действие.
          </span>
        </div>
      )}

      {/* === ТАБЛИЦА / ТЕКСТОВЫЙ РЕДАКТОР === */}
      <div className="flex-1 min-h-0">
        {config.mode === 'notes' ? (
          <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-slate-900">Текст документа</h2>
              <span className="text-xs text-slate-500 px-2 py-1 rounded-full bg-slate-100 border border-slate-200">Черновик</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 hover:border-blue-400 hover:text-blue-600"
              >
                <Upload size={15} /> Загрузить документ
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
              <span className="text-xs text-slate-500">Автосохранение включено</span>
            </div>

            {uploads.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uploads.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleDownload(doc)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700 hover:bg-slate-200"
                  >
                    <Download size={12} /> {doc.name}
                  </button>
                ))}
              </div>
            )}

            <textarea
              value={notesText}
              onChange={(e) => {
                notesDirtyRef.current = true;
                setNotesText(e.target.value);
              }}
              placeholder={config.notesPlaceholder ?? 'Введите текст документа...'}
              className="w-full flex-1 min-h-[420px] resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 leading-6 outline-none transition focus:border-blue-400 focus:bg-white"
            />

            <div className="border border-slate-200 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Clock3 size={12} /> Лог действий
              </div>
              <div className="space-y-2 max-h-28 overflow-y-auto">
                {activity.length === 0 ? (
                  <p className="text-xs text-slate-400">Пока нет записей в логе.</p>
                ) : (
                  activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 font-medium">{item.action}</span>
                      <span className="flex-1">{item.detail}</span>
                      <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <ReviewableTable
            taskPrefix={taskPrefix}
            columns={config.columns ?? []}
            initialRows={config.initialRows ?? []}
            reviewMode={reviewMode}
            reviewMap={reviewMap}
            onReviewChange={handleReviewChange}
            kpiTarget={config.kpiTarget}
            onSaveReady={registerTableSave}
          />
        )}
      </div>
    </div>
  );
}