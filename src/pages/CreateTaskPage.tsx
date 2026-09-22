import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import type { ProjectTask, TaskStatus, Channel, ContentFormat } from '../types/project';

export function CreateTaskPage() {
  const { addTask, executors } = useProjectStore();

  const [title, setTitle] = useState('');
  const [technicalSpec, setTechnicalSpec] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [selectedExecutors, setSelectedExecutors] = useState<string[]>([]);
  const [executionOrder, setExecutionOrder] = useState<number>(1);
  const [deadline, setDeadline] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [qualityTarget, setQualityTarget] = useState<number>(100);
  const [dependencies, setDependencies] = useState('');
  const [status, setStatus] = useState<TaskStatus>('planned');
  const [channel, setChannel] = useState<Channel | ''>('');
  const [format, setFormat] = useState<ContentFormat | ''>('');

  const handleExecutorChange = (executorId: string) => {
    if (selectedExecutors.includes(executorId)) {
      setSelectedExecutors(selectedExecutors.filter(id => id !== executorId));
    } else {
      setSelectedExecutors([...selectedExecutors, executorId]);
    }
  };

  const handleSubmit = async () => {
    if (!title || !deadline) return;

    const newTask: ProjectTask = {
      id: `task-${Date.now()}`,
      title,
      technicalSpec,
      description,
      assignee,
      executorIds: selectedExecutors,
      executionOrder,
      deadline,
      cost,
      qualityTarget,
      dependencies: dependencies ? dependencies.split(',').map(d => d.trim()) : [],
      status,
      parentId: null,
      channel: channel || undefined,
      format: format || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await addTask(newTask);
    if (!saved) return;
    
    // Сброс формы
    setTitle('');
    setTechnicalSpec('');
    setDescription('');
    setAssignee('');
    setSelectedExecutors([]);
    setExecutionOrder(1);
    setDeadline('');
    setCost(0);
    setQualityTarget(100);
    setDependencies('');
    setStatus('planned');
    setChannel('');
    setFormat('');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-left">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Создание задачи</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-3xl space-y-4">
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Название задачи</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Техническое задание</label>
          <textarea 
            value={technicalSpec} 
            onChange={(e) => setTechnicalSpec(e.target.value)}
            rows={4}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Описание задачи</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ответственный</label>
          <input 
            type="text" 
            value={assignee} 
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="ФИО или роль"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Исполнители</label>
          <div className="border border-slate-300 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
            {executors.length === 0 && <p className="text-sm text-slate-400 p-1">Нет доступных исполнителей</p>}
            {executors.map(executor => (
              <label key={executor.id} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer text-sm">
                <input 
                  type="checkbox" 
                  checked={selectedExecutors.includes(executor.id)}
                  onChange={() => handleExecutorChange(executor.id)}
                />
                <span>{executor.name} ({executor.role})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Порядок выполнения</label>
            <input 
              type="number" 
              min="1"
              value={executionOrder} 
              onChange={(e) => setExecutionOrder(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="planned">Запланирована</option>
              <option value="fact_gathering">Сбор фактуры</option>
              <option value="copywriting">Копирайтинг</option>
              <option value="editing">Редактура</option>
              <option value="design">Дизайн</option>
              <option value="review">На согласовании</option>
              <option value="revision">На доработке</option>
              <option value="approved">Согласовано</option>
              <option value="adaptation">Адаптация</option>
              <option value="published">Опубликовано</option>
              <option value="overdue">Просрочена</option>
              <option value="cancelled">Отменена</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Срок (дедлайн)</label>
            <input 
              type="date" 
              value={deadline} 
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Стоимость (руб.)</label>
            <input 
              type="number" 
              min="0"
              value={cost} 
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Целевое качество (%)</label>
            <input 
              type="number" 
              min="0" 
              max="100"
              value={qualityTarget} 
              onChange={(e) => setQualityTarget(Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Зависимости (ID через запятую)</label>
            <input 
              type="text" 
              value={dependencies} 
              onChange={(e) => setDependencies(e.target.value)}
              placeholder="task-1, task-2"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Канал</label>
            <select 
              value={channel} 
              onChange={(e) => setChannel(e.target.value as Channel)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Не выбрано</option>
              <option value="МАКС">МАКС</option>
              <option value="Telegram">Telegram</option>
              <option value="ВКонтакте">ВКонтакте</option>
              <option value="Дзен">Дзен</option>
              <option value="VC.ru">VC.ru</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Формат</label>
            <select 
              value={format} 
              onChange={(e) => setFormat(e.target.value as ContentFormat)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Не выбрано</option>
              <option value="Новостная">Новостная</option>
              <option value="Информационная">Информационная</option>
              <option value="Экспертная">Экспертная</option>
              <option value="Карусель">Карусель</option>
              <option value="Инфографика">Инфографика</option>
              <option value="Интерактив">Интерактив</option>
              <option value="Портретная">Портретная</option>
              <option value="Видео">Видео</option>
              <option value="Лонгрид">Лонгрид</option>
              <option value="Посев">Посев</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button 
            onClick={handleSubmit}
            disabled={!title || !deadline}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Создать задачу
          </button>
        </div>
      </div>
    </div>
  );
}