import { create } from 'zustand';
import { formatSupabaseNetworkError, supabase, supabaseConfigError } from '../lib/supabase';
import type { ProjectTask, Executor } from '../types/project';

interface ProjectState {
  tasks: ProjectTask[];
  executors: Executor[];
  loading: boolean;
  error: string | null;

  fetchData: () => Promise<void>;
  addTask: (task: ProjectTask) => Promise<boolean>;
  updateTask: (id: string, updates: Partial<ProjectTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addExecutor: (executor: Executor) => Promise<void>;
  removeExecutor: (id: string) => Promise<void>;
}

// Маппинг из camelCase (код) в snake_case (база данных)
function taskToDb(task: ProjectTask) {
  return {
    id: task.id,
    title: task.title,
    technical_spec: task.technicalSpec,
    executor_ids: task.executorIds,
    execution_order: task.executionOrder,
    deadline: task.deadline,
    cost: task.cost,
    quality_target: task.qualityTarget,
    dependencies: task.dependencies,
    status: task.status,
    channel: task.channel || null,
    format: task.format || null,
    description: task.description || null,
    assignee: task.assignee || null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

// Маппинг из snake_case (база данных) в camelCase (код)
function taskFromDb(row: any): ProjectTask {
  return {
    id: row.id,
    title: row.title,
    technicalSpec: row.technical_spec || '',
    executorIds: row.executor_ids || [],
    executionOrder: row.execution_order || 1,
    deadline: row.deadline || '',
    cost: row.cost || 0,
    qualityTarget: row.quality_target || 100,
    dependencies: row.dependencies || [],
    status: row.status || 'planned',
    parentId: row.parent_id || null,
    channel: row.channel || undefined,
    format: row.format || undefined,
    description: row.description || '',
    assignee: row.assignee || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export const useProjectStore = create<ProjectState>((set) => ({
  tasks: [],
  executors: [],
  loading: true,
  error: null,

  fetchData: async () => {
    console.log('[Store] Загрузка данных из Supabase...');
    set({ loading: true, error: null });

    if (supabaseConfigError) {
      set({ loading: false, error: supabaseConfigError });
      return;
    }

    try {
      const [tasksRes, execRes] = await Promise.all([
        supabase.from('tasks').select('*').order('execution_order'),
        supabase.from('executors').select('*'),
      ]);

      if (tasksRes.error) {
        console.error('[Store] Ошибка загрузки задач:', tasksRes.error);
        set({ loading: false, error: tasksRes.error.message });
        return;
      }
      if (execRes.error) {
        console.error('[Store] Ошибка загрузки исполнителей:', execRes.error);
        set({ loading: false, error: execRes.error.message });
        return;
      }

      const tasks = (tasksRes.data || []).map(taskFromDb);
      const executors = (execRes.data || []) as Executor[];

      console.log(`[Store] Загружено задач: ${tasks.length}, исполнителей: ${executors.length}`);
      set({ tasks, executors, loading: false });
    } catch (error) {
      console.error('[Store] Ошибка подключения к Supabase:', error);
      set({ loading: false, error: formatSupabaseNetworkError(error) });
    }
  },

  addTask: async (task) => {
    console.log('[Store] Добавление задачи:', task.title);
    const dbRow = taskToDb(task);
    const { error } = await supabase.from('tasks').insert(dbRow);
    if (error) {
      console.error('[Store] Ошибка добавления:', error.message);
      alert('Ошибка сохранения: ' + error.message);
      return false;
    }
    set((state) => ({ tasks: [...state.tasks, task] }));
    console.log('[Store] Задача сохранена в Supabase');
    return true;
  },

  updateTask: async (id, updates) => {
    // Конвертируем только переданные поля
    const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.technicalSpec !== undefined) dbUpdates.technical_spec = updates.technicalSpec;
    if (updates.executorIds !== undefined) dbUpdates.executor_ids = updates.executorIds;
    if (updates.executionOrder !== undefined) dbUpdates.execution_order = updates.executionOrder;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
    if (updates.cost !== undefined) dbUpdates.cost = updates.cost;
    if (updates.qualityTarget !== undefined) dbUpdates.quality_target = updates.qualityTarget;
    if (updates.dependencies !== undefined) dbUpdates.dependencies = updates.dependencies;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.channel !== undefined) dbUpdates.channel = updates.channel;
    if (updates.format !== undefined) dbUpdates.format = updates.format;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.assignee !== undefined) dbUpdates.assignee = updates.assignee;

    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
    if (error) {
      console.error('[Store] Ошибка обновления:', error.message);
      return;
    }
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: dbUpdates.updated_at } : t
      ),
    }));
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    }
  },

  addExecutor: async (executor) => {
    const { error } = await supabase.from('executors').insert(executor);
    if (!error) {
      set((state) => ({ executors: [...state.executors, executor] }));
    }
  },

  removeExecutor: async (id) => {
    const { error } = await supabase.from('executors').delete().eq('id', id);
    if (!error) {
      set((state) => ({ executors: state.executors.filter((e) => e.id !== id) }));
    }
  },
}));