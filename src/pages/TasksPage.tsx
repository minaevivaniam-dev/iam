import { useState, useRef, useEffect } from 'react';
import { FolderOpen, ChevronDown, FileText, PenTool, Paperclip, Lightbulb, FileEdit } from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface TaskCard {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType<LucideProps>;
  subtasks?: { id: string; label: string; icon: React.ElementType<LucideProps> }[];
}

const TASKS: TaskCard[] = [
  {
    id: 'content-social',
    title: 'Контент Соцмедиа',
    description: 'Комплекс работ по подготовке контента для социальных сетей: разработка контент-плана, написание постов и подготовка вложений для ВКонтакте, Max, Telegram, Дзен, VC.ru.',
    icon: FolderOpen,
    subtasks: [
      { id: 'content-plan', label: 'Контент-план', icon: FileText },
      { id: 'text-preparation', label: 'Подготовка текстов', icon: PenTool },
      { id: 'attachment-preparation', label: 'Подготовка вложений', icon: Paperclip },
    ],
  },
  {
    id: 'content-smi',
    title: 'Контент СМИ',
    description: 'Работа со СМИ: генерация идей тем и инфоповодов, создание пресс-релизов, колонок, комментариев и интервью для деловых, отраслевых и профильных изданий.',
    icon: FolderOpen,
    subtasks: [
      { id: 'ideas-topics', label: 'Идеи тем', icon: Lightbulb },
      { id: 'create-materials', label: 'Создание материалов', icon: FileEdit },
    ],
  },
  {
    id: 'preparation-stage',
    title: 'Подготовительный этап',
    description: 'Подготовка базовых документов для запуска эффективной коммуникационной стратегии: аудит, рубрикатор, tone of voice, контент-матрица и стратегические основы.',
    icon: FolderOpen,
    subtasks: [
      { id: 'audit-channels', label: 'Аудит действующих каналов Заказчика', icon: FileText },
      { id: 'rubricator-update', label: 'Актуализация рубрикатора', icon: FileText },
      { id: 'tone-of-voice', label: 'Актуализация руководства по стилю коммуникации', icon: FileText },
      { id: 'content-matrix', label: 'Актуализация контент-матрицы', icon: FileText },
      { id: 'visual-template-kit', label: 'Актуализация комплекта шаблонов визуального оформления публикаций', icon: FileText },
      { id: 'strategic-document', label: 'Формирование и согласование якорного стратегического документа', icon: FileText },
      { id: 'channel-concept', label: 'Утверждение концепции новых каналов', icon: FileText },
      { id: 'graphic-materials', label: 'Разработка графических материалов', icon: FileText },
      { id: 'community-pages', label: 'Создание страниц сообществ в социальных сетях', icon: FileText },
    ],
  },
];

export function TasksPage({ onOpenTask }: { onOpenTask: (taskId: string) => void }) {
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const clickedInside = Object.values(dropdownRefs.current).some(
        ref => ref && ref.contains(e.target as Node)
      );
      if (!clickedInside) setDropdownOpen(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Задачи</h1>
        <p className="text-sm text-slate-500">Управление задачами проекта. Выберите задачу для работы.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TASKS.map(task => {
          const Icon = task.icon;
          const isOpen = dropdownOpen === task.id;
          return (
            <div key={task.id} className="relative" ref={el => { dropdownRefs.current[task.id] = el; }}>
              <button
                onClick={() => task.subtasks ? setDropdownOpen(isOpen ? null : task.id) : onOpenTask(task.id)}
                className="group bg-white border border-slate-200 rounded-xl p-6 text-left hover:border-blue-400 hover:shadow-md transition-all w-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Icon size={20} />
                  </div>
                  {task.subtasks ? (
                    <ChevronDown size={16} className={`text-slate-400 group-hover:text-blue-600 transition-all mt-1 ${isOpen ? 'rotate-180' : ''}`} />
                  ) : null}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{task.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{task.description}</p>
              </button>

              {isOpen && task.subtasks && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20">
                  {task.subtasks.map((subtask, idx) => {
                    const SubIcon = subtask.icon;
                    return (
                      <button
                        key={subtask.id}
                        onClick={() => { onOpenTask(subtask.id); setDropdownOpen(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors ${idx < task.subtasks!.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <SubIcon size={15} className="text-slate-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">{subtask.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}