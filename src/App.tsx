import { useState, useEffect, Component, type ReactNode } from 'react';
import { IdeasTopicsPage } from './pages/IdeasTopicsPage';
import { CreateMaterialsPage } from './pages/CreateMaterialsPage';
import { CubeScene } from './components/CubeScene';
import { MediaPlanTable } from './components/MediaPlanTable';
import { ProjectDashboard } from './components/ProjectDashboard';
import { CreateTaskPage } from './pages/CreateTaskPage';
import { TasksPage } from './pages/TasksPage';
import { ContentPlan } from './pages/ContentPlan';
import { TextPreparation } from './pages/TextPreparation';
import { AttachmentPreparation } from './pages/AttachmentPreparation';
import { TaskDetailLayout } from './components/TaskDetailLayout';
import { useProjectStore } from './store/projectStore';
import { useMediaPlanStore } from './store/mediaPlanStore';
import { AuthPage } from './components/AuthPage';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import {
  BarChart3, CalendarDays, PieChart, ShieldCheck, Megaphone,
  LayoutGrid, ArrowRight, ListChecks
} from 'lucide-react';

type Tab = 'summary' | 'dashboard' | 'create-task' | 'graph' | 'mediaplan' | 'tasks' | 'analytics' | 'moderation' | 'ads';

const PREPARATION_TASKS: Record<string, { title: string; description: string; assignee: string; notesPlaceholder: string; notesDefault: string }> = {
  'audit-channels': {
    title: 'Аудит действующих каналов Заказчика',
    description: 'Определение текущего состояния каналов, сильных и слабых сторон, целевой аудитории, контентной матрицы и рекомендаций по развитию.',
    assignee: 'Аналитик',
    notesPlaceholder: 'Опишите аудит текущих каналов, сильные стороны, пробелы и рекомендации...',
    notesDefault: '## Аудит действующих каналов Заказчика\n\n### 1. Общая характеристика каналов\n- \n\n### 2. Сильные стороны\n- \n\n### 3. Слабые стороны и риски\n- \n\n### 4. Рекомендации по развитию\n- ',
  },
  'rubricator-update': {
    title: 'Актуализация рубрикатора',
    description: 'Обновление структуры рубрик и категорий для логичного и целостного контентного позиционирования всех коммуникаций.',
    assignee: 'Менеджер',
    notesPlaceholder: 'Опишите актуальные рубрики, категории, ключевые темы и принципы их использования...',
    notesDefault: '## Актуализация рубрикатора\n\n### Основные рубрики\n- \n\n### Принципы классификации\n- \n\n### Изменения относительно текущей структуры\n- ',
  },
  'tone-of-voice': {
    title: 'Актуализация руководства по стилю коммуникации',
    description: 'Формулирование принципов и правил подачи бренда: tone of voice, темп речи, язык, эмоции и коммуникационный стиль.',
    assignee: 'Редактор',
    notesPlaceholder: 'Опишите стиль коммуникации, ключевые принципы, формулировки и правила общения с аудиторией...',
    notesDefault: '## Руководство по стилю коммуникации\n\n### Tone of voice\n- \n\n### Ключевые принципы\n- \n\n### Запрещенные/нежелательные формулировки\n- ',
  },
  'content-matrix': {
    title: 'Актуализация контент-матрицы',
    description: 'Проверка и обновление соответствия контента целям, аудиториям, форматам и стадиям воронки.',
    assignee: 'Менеджер',
    notesPlaceholder: 'Опишите актуальную контент-матрицу по темам, целям, аудиториям и форматам...',
    notesDefault: '## Контент-матрица\n\n| Цель | Аудитория | Формат | Тема | Канал |\n| --- | --- | --- | --- | --- |\n|  |  |  |  |  |\n',
  },
  'visual-template-kit': {
    title: 'Актуализация комплекта шаблонов визуального оформления публикаций',
    description: 'Обновление визуальных шаблонов, правил оформления и единой системы графической коммуникации для публикаций.',
    assignee: 'Дизайнер',
    notesPlaceholder: 'Опишите актуальные визуальные шаблоны, палитру, правила и требования к оформлению публикаций...',
    notesDefault: '## Комплект шаблонов визуального оформления\n\n### Базовые элементы\n- \n\n### Цветовая палитра\n- \n\n### Форматы и требования\n- ',
  },
  'strategic-document': {
    title: 'Формирование и согласование якорного стратегического документа',
    description: 'Вывод всех подготовительных материалов в единый стратегический документ с целями, позиционированием и планом действий.',
    assignee: 'Менеджер',
    notesPlaceholder: 'Опишите стратегические цели, позиции, приоритеты, дорожную карту и ключевые решения для согласования...',
    notesDefault: '## Якорный стратегический документ\n\n### Цель и задачи\n- \n\n### Позиционирование\n- \n\n### Приоритеты на квартал\n- \n\n### Согласованные решения\n- ',
  },
  'channel-concept': {
    title: 'Утверждение концепции новых каналов',
    description: 'Утверждение названий, рубрикатора и общей концепции новых каналов коммуникации.',
    assignee: 'Менеджер',
    notesPlaceholder: 'Опишите концепцию, названия, рубрикатор и ключевые решения по новым каналам...',
    notesDefault: '## Концепция новых каналов\n\n### Названия\n- \n\n### Рубрикатор\n- \n\n### Концепция\n- ',
  },
  'graphic-materials': {
    title: 'Разработка графических материалов',
    description: 'Подготовка аватара, обложки и системы брендинга публикаций.',
    assignee: 'Дизайнер',
    notesPlaceholder: 'Опишите графические материалы, форматы, промежуточные результаты и требования...',
    notesDefault: '## Графические материалы\n\n### Аватар\n- \n\n### Обложка\n- \n\n### Брендинг публикаций\n- ',
  },
  'community-pages': {
    title: 'Создание страниц сообществ в социальных сетях',
    description: 'Создание и первичная настройка страниц сообществ для выбранных каналов.',
    assignee: 'Менеджер',
    notesPlaceholder: 'Укажите созданные сообщества, ссылки, статусы и оставшиеся настройки...',
    notesDefault: '## Страницы сообществ\n\n### Каналы\n- \n\n### Ссылки\n- \n\n### Статус настройки\n- ',
  },
};

const TABS: { id: Tab; label: string; icon: React.ElementType<{ size?: number | string; className?: string }> }[] = [
  { id: 'summary', label: 'Сводная', icon: LayoutGrid },
  { id: 'dashboard', label: 'Панель управления', icon: ListChecks },
  { id: 'tasks', label: 'Задачи', icon: ListChecks },
  { id: 'graph', label: 'График', icon: BarChart3 },
  { id: 'mediaplan', label: 'Медиаплан', icon: CalendarDays },
  { id: 'analytics', label: 'Аналитика', icon: PieChart },
  { id: 'moderation', label: 'Модерация', icon: ShieldCheck },
  { id: 'ads', label: 'Реклама', icon: Megaphone },
];

const READY_MODULES = [
  { id: 'dashboard' as Tab, title: 'Панель управления проектом', description: 'Текущие задачи, исполнители, статусы и параметры кубов', icon: ListChecks },
  { id: 'tasks' as Tab, title: 'Задачи', description: 'Управление задачами проекта: список, диаграмма Ганта, фильтры', icon: ListChecks },
  { id: 'graph' as Tab, title: 'График (Система координат)', description: '3D-визуализация кубов План/Факт по осям Время, Бюджет, Качество', icon: BarChart3 },
  { id: 'mediaplan' as Tab, title: 'Медиаплан', description: 'Контент-планирование, статусы публикаций, площадки и вложения', icon: CalendarDays },
];

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[600px]">
      <h2 className="text-3xl font-bold text-slate-300 tracking-wide uppercase text-center">{title} — to be released soon</h2>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false, error: '' }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
          <div className="bg-white border border-red-200 rounded-xl p-6 max-w-lg text-left shadow-lg">
            <h2 className="text-red-800 font-semibold mb-2 text-lg">Ошибка рендеринга</h2>
            <p className="text-red-600 text-sm mb-4 font-mono">{this.state.error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Перезагрузить</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Роутер внутри раздела «Задачи»
function TasksRouter() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => localStorage.getItem('selectedTaskId'));

  useEffect(() => {
    if (selectedTaskId) {
      localStorage.setItem('selectedTaskId', selectedTaskId);
    } else {
      localStorage.removeItem('selectedTaskId');
    }
  }, [selectedTaskId]);

  if (selectedTaskId === 'content-plan') {
    return <ContentPlan onBack={() => setSelectedTaskId(null)} />;
  }
  if (selectedTaskId === 'text-preparation') {
    return <TextPreparation onBack={() => setSelectedTaskId(null)} />;
  }
  if (selectedTaskId === 'attachment-preparation') {
    return <AttachmentPreparation onBack={() => setSelectedTaskId(null)} />;
  }
  if (selectedTaskId === 'ideas-topics') {
    return <IdeasTopicsPage onBack={() => setSelectedTaskId(null)} />;
  }
  if (selectedTaskId === 'create-materials') {
    return <CreateMaterialsPage onBack={() => setSelectedTaskId(null)} />;
  }

  if (selectedTaskId && PREPARATION_TASKS[selectedTaskId]) {
    const task = PREPARATION_TASKS[selectedTaskId];
    return (
      <TaskDetailLayout
        config={{
          title: task.title,
          assignee: task.assignee,
          description: task.description,
          metrics: { progress: 0, time: 0, quality: 0, cost: 0 },
          columns: [],
          initialRows: [],
          mode: 'notes',
          notesPlaceholder: task.notesPlaceholder,
          notesDefault: task.notesDefault,
        }}
        taskPrefix={selectedTaskId}
        onBack={() => setSelectedTaskId(null)}
      />
    );
  }

  return <TasksPage onOpenTask={(id) => setSelectedTaskId(id)} />;
}

function AppContent({ session }: { session: Session }) {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved && TABS.some(t => t.id === saved)) ? saved as Tab : 'summary';
  });
  const fetchData = useProjectStore((s) => s.fetchData);
  const fetchRows = useMediaPlanStore((s) => s.fetchRows);
  const loadingTasks = useProjectStore((s) => s.loading);
  const loadingMedia = useMediaPlanStore((s) => s.loading);
  const errorTasks = useProjectStore((s) => s.error);
  const errorMedia = useMediaPlanStore((s) => s.error);

  useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]);
  useEffect(() => { fetchData(); fetchRows(); }, [fetchData, fetchRows]);

  const loading = loadingTasks || loadingMedia;
  const error = errorTasks || errorMedia;

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500 text-lg">Загрузка данных...</p></div>;
  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-lg text-left">
        <h2 className="text-red-800 font-semibold mb-2">Ошибка базы данных</h2>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button onClick={() => { fetchData(); fetchRows(); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Повторить</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col text-left overflow-hidden">
      <nav className="bg-white border-b border-slate-200 px-6 shrink-0 z-30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>
                  <Icon size={16} />{tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden md:block text-xs text-slate-500 max-w-48 truncate">{session.user.email}</span>
            <button onClick={() => { void supabase.auth.signOut(); }} className="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">Выйти</button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-6 flex flex-col min-h-0">
        {activeTab === 'summary' && (
          <div className="max-w-4xl overflow-y-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Сводная</h1>
            <p className="text-slate-500 mb-8">Доступные модули системы управления проектом ФЦ БАС</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {READY_MODULES.map(m => { const I = m.icon; return (
                <button key={m.id} onClick={() => setActiveTab(m.id)} className="group bg-white border border-slate-200 rounded-xl p-6 text-left hover:border-blue-400 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors"><I size={20} /></div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors mt-1" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{m.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{m.description}</p>
                </button>
              ); })}
            </div>
          </div>
        )}
        {activeTab === 'dashboard' && <div className="overflow-y-auto"><ProjectDashboard onCreateTaskClick={() => setActiveTab('create-task')} /></div>}
        {activeTab === 'create-task' && (
          <div className="flex flex-col h-full overflow-y-auto">
            <button onClick={() => setActiveTab('dashboard')} className="text-sm text-blue-600 hover:text-blue-800 mb-2 self-start">← Назад к панели управления</button>
            <CreateTaskPage />
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
            <TasksRouter />
          </div>
        )}
        {activeTab === 'graph' && (
          <div className="flex-1 flex flex-col min-h-0">
            <h1 className="text-2xl font-bold text-slate-900 mb-4 shrink-0">Система координат проекта</h1>
            <div className="flex-1 min-h-[400px]"><CubeScene onOpenTask={(taskId) => { localStorage.setItem('activeTab', 'tasks'); localStorage.setItem('selectedTaskId', taskId); setActiveTab('tasks'); }} /></div>
          </div>
        )}
        {activeTab === 'mediaplan' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h1 className="text-2xl font-bold text-slate-900">Медиаплан</h1>
              <span className="text-sm text-slate-500">30 дней с 17.09.2026</span>
            </div>
            <MediaPlanTable />
          </div>
        )}
        {activeTab === 'analytics' && <PlaceholderPage title="Аналитика" />}
        {activeTab === 'moderation' && <PlaceholderPage title="Модерация" />}
        {activeTab === 'ads' && <PlaceholderPage title="Реклама" />}
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (authLoading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">Проверка авторизации...</div>;
  if (!session) return <AuthPage />;
  return <ErrorBoundary><AppContent session={session} /></ErrorBoundary>;
}
export default App;