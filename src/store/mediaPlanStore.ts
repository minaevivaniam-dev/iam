import { create } from 'zustand';
import { formatSupabaseNetworkError, supabase, supabaseConfigError } from '../lib/supabase';
import type { UploadedDocument } from '../lib/documentWorkspace';

export interface MediaRow {
  id: string;
  date: string;
  status: string;
  rubric: string;
  platforms: string[];
  text_content: string;
  sort_order: number;
  attachments?: UploadedDocument[];
}

interface MediaPlanState {
  rows: MediaRow[];
  loading: boolean;
  error: string | null;

  fetchRows: () => Promise<void>;
  addRow: (row: MediaRow) => Promise<void>;
  updateRow: (id: string, updates: Partial<MediaRow>) => Promise<void>;
  deleteRow: (id: string) => Promise<void>;
  reorderRows: (newRows: MediaRow[]) => Promise<void>;
}

function rowFromDb(row: any): MediaRow {
  return {
    id: row.id,
    date: row.date || '',
    status: row.status || 'запланирован',
    rubric: row.rubric || '',
    platforms: row.platforms || [],
    text_content: row.text_content || '',
    sort_order: row.sort_order || 0,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

export const useMediaPlanStore = create<MediaPlanState>((set) => ({
  rows: [],
  loading: true,
  error: null,

  fetchRows: async () => {
    set({ loading: true, error: null });
    if (supabaseConfigError) {
      set({ loading: false, error: supabaseConfigError });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('media_plan_rows')
        .select('*')
        .order('sort_order');

      if (error) {
        set({ loading: false, error: error.message });
        return;
      }
      set({ rows: (data || []).map(rowFromDb), loading: false });
    } catch (error) {
      set({ loading: false, error: formatSupabaseNetworkError(error) });
    }
  },

  addRow: async (row) => {
    const { error } = await supabase.from('media_plan_rows').insert(row);
    if (!error) {
      set((state) => ({ rows: [...state.rows, row] }));
    }
  },

  updateRow: async (id, updates) => {
    const { error } = await supabase
      .from('media_plan_rows')
      .update(updates)
      .eq('id', id);
    if (!error) {
      set((state) => ({
        rows: state.rows.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      }));
    }
  },

  deleteRow: async (id) => {
    const { error } = await supabase.from('media_plan_rows').delete().eq('id', id);
    if (!error) {
      set((state) => ({ rows: state.rows.filter((r) => r.id !== id) }));
    }
  },

  reorderRows: async (newRows) => {
    // Обновляем sort_order для всех строк пакетно
    const updates = newRows.map((r, i) => ({ id: r.id, sort_order: i }));
    const { error } = await supabase.from('media_plan_rows').upsert(updates);
    if (!error) {
      set({ rows: newRows });
    }
  },
}));