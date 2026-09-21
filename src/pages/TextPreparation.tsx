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
    rows.push({ id: `writing-row-${i}`, date: d.toISOString().split('T')[0], status: 'запланирован', rubric: '', platforms: [], attachments: 3, description: '', text: '' });
  }
  return rows;
}

const CONFIG: TaskConfig = {
  title: 'Подготовка текстов',
  assignee: 'Копирайтер, Менеджер',
  description: 'Генерация текстовых и графических составляющих публикаций согласно утверждённому контент-плану. Включает разработку, редактуру и написание текстов с проверкой информации на правдивость и стилистическую обработку.',
  metrics: { progress: 30, time: 40, quality: 95, cost: 100 },
  columns: COLUMNS,
  initialRows: generateRows(),
  kpiTarget: 20,
};

export function TextPreparation({ onBack }: { onBack: () => void }) {
  return <TaskDetailLayout config={CONFIG} taskPrefix="writing" onBack={onBack} />;
}