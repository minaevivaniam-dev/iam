import { TaskDetailLayout, type TaskConfig } from '../components/TaskDetailLayout';
import type { ColumnConfig, TaskRow } from '../components/ReviewableTable';

const COLUMNS: ColumnConfig[] = [
  { key: 'date', label: 'Дата', type: 'date', width: 130 },
  { key: 'topic', label: 'Тема', type: 'text', width: 200, isKpiField: true },
  { key: 'status', label: 'Статус', type: 'status', width: 130 },
  { key: 'category', label: 'Категория', type: 'select', width: 170, options: ['Сезонный инфоповод', 'Отраслевое мероприятие', 'Экспертный материал', 'Внешняя повестка', 'Входящий запрос', 'Отраслевая аналитика'] },
  { key: 'description', label: 'Описание инфоповода', type: 'text', width: 250 },
  { key: 'smi_channels', label: 'Каналы СМИ', type: 'select', width: 150, options: ['Деловые', 'Отраслевые', 'Общие', 'Профильные', 'Региональные', 'Технологические'] },
  { key: 'smi_format', label: 'Формат для СМИ', type: 'select', width: 150, options: ['Пресс-релиз', 'Колонка', 'Комментарий', 'Интервью'] },
  { key: 'social_type', label: 'Тип соцмедиа', type: 'select', width: 130, options: ['ВК', 'ТГ', 'Макс', 'VC', 'Дзен'] },
  { key: 'social_format', label: 'Формат соцмедиа', type: 'select', width: 140, options: ['Лангрид', 'Карусель', 'Сторис', 'Шорты', 'Пост', 'Опрос'] },
  { key: 'geography', label: 'География', type: 'text', width: 130 },
  { key: 'speaker', label: 'Спикер', type: 'text', width: 130 },
  { key: 'publish_date', label: 'Дата выхода', type: 'date', width: 130 },
  { key: 'link', label: 'Ссылка', type: 'text', width: 150 },
];

function generateRows(): TaskRow[] {
  const rows: TaskRow[] = [];
  const start = new Date(2026, 9, 1);
  for (let i = 0; i < 20; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i * 2);
    rows.push({ id: `ideas-row-${i}`, date: d.toISOString().split('T')[0], topic: '', status: 'запланирован', category: '', description: '', smi_channels: '', smi_format: '', social_type: '', social_format: '', geography: '', speaker: '', publish_date: '', link: '' });
  }
  return rows;
}

const CONFIG: TaskConfig = {
  title: 'Идеи тем',
  assignee: 'ППЛ Пиар / ФЦ БАС',
  description: 'Формирование пула тем и инфоповодов для публикаций в СМИ и соцмедиа. Включает анализ трендовых тем и категоризацию по типам.',
  metrics: { progress: 45, time: 50, quality: 95, cost: 90 },
  columns: COLUMNS,
  initialRows: generateRows(),
  kpiTarget: 10,
};

export function IdeasTopicsPage({ onBack }: { onBack: () => void }) {
  return <TaskDetailLayout config={CONFIG} taskPrefix="ideas" onBack={onBack} />;
}