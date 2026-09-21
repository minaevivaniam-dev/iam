import { TaskDetailLayout, type TaskConfig } from '../components/TaskDetailLayout';
import type { ColumnConfig, TaskRow } from '../components/ReviewableTable';

const COLUMNS: ColumnConfig[] = [
  { key: 'date', label: 'Дата', type: 'date', width: 140 },
  { key: 'status', label: 'Статус', type: 'status', width: 130 },
  { key: 'rubric', label: 'Рубрика', type: 'text', width: 140 },
  { key: 'platforms', label: 'Соцсети', type: 'platforms', width: 130 },
  { key: 'attachments', label: 'Вложения', type: 'attachments', width: 130 },
  { key: 'description', label: 'Описание', type: 'text', width: 200 },
  { key: 'text', label: 'Текст', type: 'text', width: 280, isKpiField: true },
];

function generateRows(): TaskRow[] {
  const rows: TaskRow[] = [];
  const start = new Date(2026, 9, 12);
  for (let i = 0; i < 30; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    rows.push({ id: `attach-row-${i}`, date: d.toISOString().split('T')[0], status: 'запланирован', rubric: '', platforms: [], attachments: 3, description: '', text: '' });
  }
  return rows;
}

const CONFIG: TaskConfig = {
  title: 'Подготовка вложений',
  assignee: 'Дизайнер, Копирайтер, Менеджер',
  description: 'Подбор и обработка визуальных материалов: ретушь, ресайзы, цветокоррекция. Графические карточки — не менее 1920×1080. Видеоматериалы — не менее 4 единиц ежемесячно, длительностью от 90 секунд.',
  metrics: { progress: 10, time: 15, quality: 100, cost: 80 },
  columns: COLUMNS,
  initialRows: generateRows(),
  kpiTarget: 5,
};

export function AttachmentPreparation({ onBack }: { onBack: () => void }) {
  return <TaskDetailLayout config={CONFIG} taskPrefix="attachments" onBack={onBack} />;
}