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
import { useProjectStore } from './store/projectStore';
import { useMediaPlanStore } from './store/mediaPlanStore';
import {
  BarChart3, CalendarDays, PieChart, ShieldCheck, Megaphone,
  LayoutGrid, ArrowRight, ListChecks
} from 'lucide-react';

type Tab = 'summary' | 'dashboard' | 'create-task' | 'graph' | 'mediaplan' | 'tasks' | 'analytics' | 'moderation' | 'ads';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

  return <TasksPage onOpenTask={(id) => setSelectedTaskId(id)} />;
}

function AppContent() {
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
            <div className="flex-1 min-h-[400px]"><CubeScene /></div>
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

function App() { return <ErrorBoundary><AppContent /></ErrorBoundary>; }
export default App;