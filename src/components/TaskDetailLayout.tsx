import { useState, useCallback } from 'react';
import {
  ArrowLeft, Save, FileText, Clock, Award, DollarSign, User,
  Edit3, Eye, ChevronLeft
} from 'lucide-react';
import { ReviewableTable, type ReviewData, type ColumnConfig, type TaskRow } from './ReviewableTable';

export interface TaskConfig {
  title: string;
  assignee: string;
  description: string;
  metrics: { progress: number; time: number; quality: number; cost: number };
  columns: ColumnConfig[];
  initialRows: TaskRow[];
  kpiTarget?: number;
}

export function TaskDetailLayout({ config, taskPrefix, onBack }: { config: TaskConfig; taskPrefix: string; onBack: () => void }) {
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewMap, setReviewMap] = useState<Map<string, ReviewData>>(new Map());
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

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
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm shrink-0">
          <Save size={16} />Сохранить
        </button>
      </div>

      {/* === ОПИСАНИЕ === */}
      {isDescriptionOpen && (
        <div className="description-container bg-slate-50 p-4 flex mb-2 rounded-xl" style={{ height: 280 }}>
          <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto flex flex-col w-1/2">
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Ответственный</p>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-900"><User size={14} className="text-blue-600" />{config.assignee}</div>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2 shrink-0">Описание задачи</h3>
            <p className="flex-1 text-sm text-slate-600 leading-relaxed">{config.description}</p>
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
                  { label: 'Прогресс', value: config.metrics.progress, color: 'bg-blue-500' },
                  { label: 'Время', value: config.metrics.time, color: 'bg-indigo-500' },
                  { label: 'Качество', value: config.metrics.quality, color: 'bg-emerald-500' },
                  { label: 'Деньги', value: config.metrics.cost, color: 'bg-amber-500' },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-20 shrink-0">{m.label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${m.color} rounded-full transition-all`} style={{ width: `${m.value}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{m.value}%</span>
                  </div>
                ))}
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

      {/* === ТАБЛИЦА === */}
      <div className="flex-1 min-h-0">
        <ReviewableTable
          taskPrefix={taskPrefix}
          columns={config.columns}
          initialRows={config.initialRows}
          reviewMode={reviewMode}
          reviewMap={reviewMap}
          onReviewChange={handleReviewChange}
          kpiTarget={config.kpiTarget}
        />
      </div>
    </div>
  );
}