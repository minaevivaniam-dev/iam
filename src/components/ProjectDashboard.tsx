import { useProjectStore } from '../store/projectStore';

const statusLabels: Record<string, string> = {
  planned: 'Запланирована',
  fact_gathering: 'Сбор фактуры',
  copywriting: 'Копирайтинг',
  editing: 'Редактура',
  design: 'Дизайн',
  review: 'На согласовании',
  revision: 'На доработке',
  approved: 'Согласовано',
  adaptation: 'Адаптация',
  published: 'Опубликовано',
  overdue: 'Просрочена',
  cancelled: 'Отменена',
};

const statusColors: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-600',
  fact_gathering: 'bg-blue-100 text-blue-700',
  copywriting: 'bg-indigo-100 text-indigo-700',
  editing: 'bg-purple-100 text-purple-700',
  design: 'bg-pink-100 text-pink-700',
  review: 'bg-amber-100 text-amber-700',
  revision: 'bg-red-100 text-red-700',
  approved: 'bg-emerald-100 text-emerald-700',
  adaptation: 'bg-cyan-100 text-cyan-700',
  published: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-800 font-semibold',
  cancelled: 'bg-gray-100 text-gray-500',
};

interface ProjectDashboardProps {
  onCreateTaskClick: () => void;
}

export function ProjectDashboard({ onCreateTaskClick }: ProjectDashboardProps) {
  const { tasks, executors } = useProjectStore();

  const getExecutorNames = (ids: string[]) =>
    ids.map((id) => executors.find((e) => e.id === id)?.name || 'Не назначен').join(', ');

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-left">
      
      {/* Заголовок */}
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Панель управления проектом</h1>
        <p className="text-slate-500">ФЦ БАС — SMM-проект</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* БЛОК: Текущие задачи */}
        <div className="lg:col-span-2 text-left">
          
          {/* Шапка блока задач */}
          <div className="mb-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold text-slate-800">Текущие задачи</h2>
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-sm font-medium">
                {tasks.length}
              </span>
            </div>
            <button
              onClick={onCreateTaskClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              Создать задачу
            </button>
          </div>

          {/* Список задач */}
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded p-6 text-left text-slate-400">
                Нет задач. Перейдите к созданию задачи.
              </div>
            ) : (
              tasks
                .sort((a, b) => a.executionOrder - b.executionOrder)
                .map((task) => (
                  <div
                    key={task.id}
                    className="bg-white border border-slate-200 rounded p-4 hover:shadow-md transition-shadow text-left"
                  >
                    {/* Строка 1: Номер + Название + Статус + Теги */}
                    <div className="flex items-start gap-3 mb-2 flex-wrap">
                      <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {task.executionOrder}
                      </span>
                      <div className="flex flex-col gap-1">
                        <h3 className="font-semibold text-slate-900">{task.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[task.status] || statusColors.planned}`}>
                            {statusLabels[task.status] || task.status}
                          </span>
                          {task.channel && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              {task.channel}
                            </span>
                          )}
                          {task.format && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              {task.format}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Строка 2: ТЗ */}
                    {task.technicalSpec && (
                      <p className="text-sm text-slate-500 mb-3 ml-9 text-left">{task.technicalSpec}</p>
                    )}

                    {/* Строка 3: Метаданные */}
                    <div className="ml-9 text-xs text-slate-400 space-y-1 text-left">
                      <div>Срок: {new Date(task.deadline).toLocaleDateString('ru-RU')}</div>
                      <div>Стоимость: {task.cost.toLocaleString('ru-RU')} руб.</div>
                      <div>Качество: {task.qualityTarget}%</div>
                      <div>Исполнители: {getExecutorNames(task.executorIds)}</div>
                      {task.dependencies.length > 0 && (
                        <div>Зависимости: {task.dependencies.length}</div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* БЛОК: Исполнители */}
        <div className="text-left">
          
          {/* Шапка блока исполнителей */}
          <div className="mb-4 text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-800">Исполнители</h2>
              <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-sm font-medium">
                {executors.length}
              </span>
            </div>
          </div>

          {/* Список исполнителей */}
          <div className="bg-white border border-slate-200 rounded overflow-hidden text-left">
            {executors.length === 0 ? (
              <div className="p-6 text-left text-slate-400 text-sm">Нет исполнителей</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {executors.map((executor) => (
                  <div key={executor.id} className="p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {executor.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">{executor.name}</p>
                      <p className="text-xs text-slate-500">{executor.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}