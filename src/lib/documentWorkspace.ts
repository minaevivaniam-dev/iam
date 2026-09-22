import { supabase } from './supabase';

export type UploadedDocument = {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  dataUrl?: string;
  storagePath?: string;
  url?: string;
};

export type ActivityEntry = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type StoredDocument = {
  id: string;
  taskId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  uploads: UploadedDocument[];
  description?: string;
  assignee?: string;
  metrics?: { time: number; quality: number; cost: number };
};

const getStorageKey = (taskId: string) => `fc-bas-document:${taskId}`;
const getActivityKey = (taskId: string) => `fc-bas-activity:${taskId}`;

const emptyDocument = (taskId: string, title: string): StoredDocument => ({
  id: taskId,
  taskId,
  title,
  content: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  uploads: [],
});

const isSupabaseTableMissing = (error: { message?: string } | null | undefined) => {
  if (!error) return false;
  const message = error.message ?? '';
  return message.toLowerCase().includes('does not exist') || message.toLowerCase().includes('relation') || message.toLowerCase().includes('not found');
};

export function readDocument(taskId: string, fallbackTitle: string): StoredDocument {
  if (typeof window === 'undefined') return emptyDocument(taskId, fallbackTitle);

  try {
    const raw = window.localStorage.getItem(getStorageKey(taskId));
    if (!raw) return emptyDocument(taskId, fallbackTitle);

    const parsed = JSON.parse(raw) as Partial<StoredDocument>;
    return {
      id: parsed.id ?? taskId,
      taskId: parsed.taskId ?? taskId,
      title: parsed.title ?? fallbackTitle,
      content: parsed.content ?? '',
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      uploads: parsed.uploads ?? [],
      description: parsed.description,
      assignee: parsed.assignee,
      metrics: parsed.metrics,
    };
  } catch {
    return emptyDocument(taskId, fallbackTitle);
  }
}

export function writeDocument(taskId: string, record: StoredDocument) {
  if (typeof window === 'undefined') return;

  const next = {
    ...record,
    id: taskId,
    taskId,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(getStorageKey(taskId), JSON.stringify(next));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('fc-bas-documents');
    channel.postMessage({ taskId, type: 'document-update' });
    channel.close();
  }
}

export function readActivity(taskId: string): ActivityEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getActivityKey(taskId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendActivity(taskId: string, action: string, detail: string) {
  if (typeof window === 'undefined') return;

  const next: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    detail,
    createdAt: new Date().toISOString(),
  };

  const items = [...readActivity(taskId), next].slice(-25);
  window.localStorage.setItem(getActivityKey(taskId), JSON.stringify(items));

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('fc-bas-documents');
    channel.postMessage({ taskId, type: 'activity-update' });
    channel.close();
  }
}

export async function persistDocument(taskId: string, record: StoredDocument): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    writeDocument(taskId, record);
    console.error('[Documents] Нет авторизованного пользователя');
    return false;
  }

  const remoteRow = {
    id: taskId,
    task_id: taskId,
    owner_id: userData.user.id,
    title: record.title,
    content: record.content,
    uploads: record.uploads,
    description: record.description ?? null,
    assignee: record.assignee ?? null,
    metrics: record.metrics ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };

  try {
    let { error } = await supabase.from('documents').upsert(remoteRow, { onConflict: 'id' });
    if (error && /description|assignee|column/i.test(error.message ?? '')) {
      const { description: _description, assignee: _assignee, ...legacyRow } = remoteRow;
      ({ error } = await supabase.from('documents').upsert(legacyRow, { onConflict: 'id' }));
    }
    if (error && isSupabaseTableMissing(error)) {
      writeDocument(taskId, record);
      console.error('[Documents] Таблица или поле не найдены:', error.message);
      return false;
    }
    if (error) {
      writeDocument(taskId, record);
      console.error('[Documents] Supabase отклонил сохранение:', error.message, error.details ?? '');
      return false;
    }
    writeDocument(taskId, record);
    return true;
  } catch (error) {
    writeDocument(taskId, record);
    console.error('[Documents] Ошибка сохранения:', error);
    return false;
  }
}

export async function persistActivity(taskId: string, action: string, detail: string): Promise<boolean> {
  const entry: ActivityEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    detail,
    createdAt: new Date().toISOString(),
  };

  try {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('document_activity').insert({
      id: entry.id,
      task_id: taskId,
      owner_id: userData.user?.id,
      action: entry.action,
      detail: entry.detail,
      created_at: entry.createdAt,
    });

    if (error && isSupabaseTableMissing(error)) {
      appendActivity(taskId, action, detail);
      return false;
    }
    if (error) {
      appendActivity(taskId, action, detail);
      return false;
    }

    appendActivity(taskId, action, detail);
    return true;
  } catch (error) {
    appendActivity(taskId, action, detail);
    console.error('[Activity] Ошибка сохранения:', error);
    return false;
  }
}

export async function loadRemoteDocument(taskId: string, fallbackTitle: string): Promise<StoredDocument> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (error && isSupabaseTableMissing(error)) {
      return readDocument(taskId, fallbackTitle);
    }
    if (error || !data) {
      return readDocument(taskId, fallbackTitle);
    }

    const remoteDocument: StoredDocument = {
      id: data.id,
      taskId: data.task_id ?? taskId,
      title: data.title ?? fallbackTitle,
      content: data.content ?? '',
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
      uploads: Array.isArray(data.uploads) ? data.uploads : [],
      description: data.description ?? undefined,
      assignee: data.assignee ?? undefined,
      metrics: data.metrics ?? undefined,
    };

    if (typeof window !== 'undefined' && window.localStorage.getItem(getStorageKey(taskId))) {
      const localDocument = readDocument(taskId, fallbackTitle);
      if (new Date(localDocument.updatedAt).getTime() > new Date(remoteDocument.updatedAt).getTime()) {
        return localDocument;
      }
    }

    return remoteDocument;
  } catch {
    return readDocument(taskId, fallbackTitle);
  }
}

export async function loadRemoteActivity(taskId: string): Promise<ActivityEntry[]> {
  try {
    const { data, error } = await supabase
      .from('document_activity')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error && isSupabaseTableMissing(error)) {
      return readActivity(taskId);
    }
    if (error || !data) {
      return readActivity(taskId);
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      action: item.action,
      detail: item.detail,
      createdAt: item.created_at,
    }));
  } catch {
    return readActivity(taskId);
  }
}

export function subscribeToTask(taskId: string, onChange: () => void) {
  if (typeof window === 'undefined') return () => {};

  const localUnsub = (() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (event.key === getStorageKey(taskId) || event.key === getActivityKey(taskId)) onChange();
    };

    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('fc-bas-documents') : null;
    if (channel) {
      channel.addEventListener('message', (event) => {
        if (event.data?.taskId === taskId) onChange();
      });
    }

    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      channel?.close();
    };
  })();

  try {
    const channel = supabase.channel(`docs:${taskId}`);
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `id=eq.${taskId}` },
        () => onChange()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'document_activity', filter: `task_id=eq.${taskId}` },
        () => onChange()
      )
      .subscribe();

    return () => {
      localUnsub();
      void supabase.removeChannel(channel);
    };
  } catch {
    return localUnsub;
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

export async function uploadFileToStorage(taskId: string, file: File): Promise<UploadedDocument> {
  const timestamp = Date.now();
  const storagePath = `${taskId}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const document: UploadedDocument = {
    id: `${timestamp}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    createdAt: new Date().toISOString(),
    storagePath,
    url: '',
  };

  try {
    const { error } = await supabase.storage.from('documents').upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
    if (error) throw error;
    const { data, error: signedUrlError } = await supabase.storage.from('documents').createSignedUrl(storagePath, 3600);
    if (signedUrlError) throw signedUrlError;
    return { ...document, url: data.signedUrl };
  } catch {
    return { ...document, dataUrl: await fileToDataUrl(file) };
  }
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
