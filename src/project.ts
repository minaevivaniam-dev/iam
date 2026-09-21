// src/types/project.ts

/**
 * Исполнитель задачи
 */
export interface Executor {
  id: string;
  name: string;          // ФИО или роль
  role: string;          // Копирайтер, Дизайнер, Аналитик и т.д.
  email?: string;
}

/**
 * Статус задачи
 */
export type TaskStatus = 
  | 'planned'      // Запланирована
  | 'in_progress' // В работе
  | 'review'      // На согласовании
  | 'done'        // Выполнена
  | 'overdue';    // Просрочена

/**
 * Задача проекта
 */
export interface ProjectTask {
  id: string;
  
  // Основные параметры из вашего запроса
  title: string;              // Название
  technicalSpec: string;      // Техническое задание (текст или ссылка)
  executorIds: string[];      // Список ID исполнителей
  executionOrder: number;     // Порядок выполнения (1, 2, 3...)
  deadline: string;           // Срок (ISO дата)
  cost: number;               // Стоимость в рублях
  qualityTarget: number;      // Целевое качество (0-100%)
  
  // Связи
  dependencies: string[];     // ID задач, от которых зависит эта задача
  
  // Системные поля
  status: TaskStatus;
  parentId: string | null;    // Для иерархии (если нужно)
  createdAt: string;
  updatedAt: string;
}
