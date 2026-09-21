import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabaseConfigError = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY
  ? 'Переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY не настроены в окружении деплоя.'
  : null;

export const formatSupabaseNetworkError = (error: unknown) => {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return 'Не удалось подключиться к Supabase. Проверьте VITE_SUPABASE_URL, настройки сети и переменные окружения Vercel.';
  }
  return error instanceof Error ? error.message : 'Неизвестная ошибка подключения к Supabase.';
};

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase env variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production access.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);