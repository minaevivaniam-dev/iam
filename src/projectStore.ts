// src/store/projectStore.ts
import { create } from 'zustand';
import type { ProjectTask, Executor } from '../types/project';

interface ProjectState {
  // Данные
  tasks: ProjectTask[];
  executors: Executor[];
  
  // Действия с задачами
  addTask: (task: ProjectTask) => void;
  updateTask: (id: string, updates: Partial<ProjectTask>) => void;
  deleteTask: (id: string) => void;
  
  // Действия с исполнителями
  addExecutor: (executor: Executor) => void;
  removeExecutor: (id: string) => void;
}

// Начальные данные для примера
const initialExecutors: Executor[] = [
  { id: 'exec-1', name: 'Анна Смирнова', role: 'Копирайтер' },
  { id: 'exec-2', name: 'Иван Петров', role: 'Дизайнер' },
  { id: 'exec-3', name: 'Мария Козлова', role: 'Аналитик' },
];

const initialTasks: ProjectTask[] = [
  {
    id: 'task-1',
    title: 'Аудит действующих каналов',
    technicalSpec: 'Провести анализ МАКС, Telegram, ВК. Подготовить аналитическую записку.',
    executorIds: ['exec-3'],
    executionOrder: 1,
    deadline: '2026-09-10',
    cost: 30000,
    qualityTarget: 90,
    dependencies: [],
    status: 'in_progress',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Разработка рубрикатора',
    technicalSpec: 'Сформировать перечень рубрик с описанием ЦА и форматов.',
    executorIds: ['exec-1', 'exec-3'],
    executionOrder: 2,
    deadline: '2026-09-15',
    cost: 25000,
    qualityTarget: 95,
    dependencies: ['task-1'],
    status: 'planned',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useProjectStore = create<ProjectState>((set) => ({
  tasks: initialTasks,
  executors: initialExecutors,
  
  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),
    
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
    })),
    
  deleteTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
    
  addExecutor: (executor) =>
    set((state) => ({ executors: [...state.executors, executor] })),
    
  removeExecutor: (id) =>
    set((state) => ({ executors: state.executors.filter((e) => e.id !== id) })),
}));