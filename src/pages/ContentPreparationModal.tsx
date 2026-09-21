import { useState } from 'react';
import { X, FileText, Clock, Award, DollarSign, User, PenTool, Paperclip } from 'lucide-react';
import { TaskTable } from '../components/TaskTable';

type SubTask = 'plan' | 'writing' | 'attachments';

interface SubTaskConfig {
  id: SubTask;
  label: string;
  icon: React.ElementType;
  assignee: string;
  description: string;
  metrics: {
    progress: number;
    time: number;
    quality: number;
    cost: number;
  };
}

const SUBTASKS: SubTaskConfig[] = [
  {
    id: 'plan',
    label: 'Контент-план',
    icon: FileText,
    assignee: 'Копирайтер, Менеджер',
    description: 'Разработка ежемесячного контент-плана для всех каналов присутствия ФЦ БАС: ВКонтакте, Max, Telegram, Дзен, VC.ru. Контент-план формируется на основании анализа трендовых тем, актуальных новостей, крупных мероприятий и высказываний лидеров общественного мнения в сфере беспилотных авиационных и робототехнических систем. План предусматривает размещение не менее 20 текстовых материалов «Пост» ежемесячно и не менее 5 графических карточек.',
    metrics: { progress: 75, time: 60, quality: 90, cost: 85 },
  },
  {
    id: 'writing',
    label: 'Написание постов',
    icon: PenTool,
    assignee: 'Копирайтер, Менеджер',
    description: 'Генерация текстовых и графических составляющих публикаций согласно утвержденному контент-плану. Включает разработку, редактуру и написание текстов с проверкой информации на правдивость, точность и достоверность, стилистическую обработку текста под целевую аудиторию каждой площадки. Объём текстового материала «Пост» — не менее 200 знаков с пробелами.',
    metrics: { progress: 30, time: 40, quality: 95, cost: 100 },
  },
  {
    id: 'attachments',
    label: 'Подготовка вложений',
    icon: Paperclip,
    assignee: 'Дизайнер, Копирайтер, Менеджер',
    description: 'Подбор и обработка визуальных материалов для публикаций: ретушь, ресайзы, цветокоррекция, звуковое оформление видеоматериалов, подбор и/или разработка иллюстраций для визуального сопровождения контента. Графические карточки — разрешение не менее 1920×1080, форматы .jpeg/.jpg/.png. Видеоматериалы — не менее 4 единиц ежемесячно, длительностью от 90 секунд.',
    metrics: { progress: 10, time: 15, quality: 100, cost: 80 },
  },
];

function MetricCube({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white border border-slate-200 rounded-lg">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-md ${color} flex items-center justify-center`}>
          <Icon size={14} className="text-white" />
        </div>
        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}%</div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export function ContentPreparationModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SubTask>('plan');
  const current = SUBTASKS.find(t => t.id === activeTab)!;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-[1400px] h-[90vh] flex flex-col overflow-hidden">
        {/* Шапка модалки */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Подготовка контента</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Вкладки */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-2 bg-white border-b border-slate-200 shrink-0">
          {SUBTASKS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-50 text-slate-900 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Контент вкладки */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 min-h-0">
          {/* Верхняя панель: описание + метрики */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex gap-5 shrink-0">
            {/* Левая половина: описание и ответственный */}
            <div className="w-1/2 flex flex-col gap-3">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Ответственный</p>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <User size={14} className="text-blue-600" />
                  {current.assignee}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Описание задачи</p>
                <p className="text-sm text-slate-600 leading-relaxed">{current.description}</p>
              </div>
            </div>

            {/* Правая половина: 4 кубика метрик */}
            <div className="w-1/2 grid grid-cols-2 gap-3">
              <MetricCube label="Прогресс" value={current.metrics.progress} icon={FileText} color="bg-blue-500" />
              <MetricCube label="Время" value={current.metrics.time} icon={Clock} color="bg-indigo-500" />
              <MetricCube label="Качество" value={current.metrics.quality} icon={Award} color="bg-emerald-500" />
              <MetricCube label="Деньги" value={current.metrics.cost} icon={DollarSign} color="bg-amber-500" />
            </div>
          </div>

          {/* Таблица задачи */}
          <div className="flex-1 flex flex-col min-h-0">
            <TaskTable taskPrefix={current.id} />
          </div>
        </div>
      </div>
    </div>
  );
}