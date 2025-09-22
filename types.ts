
export enum TaskStatus {
  Todo = 'todo',
  Doing = 'doing',
  Done = 'done',
  Skipped = 'skipped'
}

export enum TaskType {
  Study = 'study',
  Practice = 'practice',
  Review = 'review'
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  estimated_minutes: number;
  status: TaskStatus;
}

export interface Day {
  id: string;
  date: string; // YYYY-MM-DD
  planned_minutes: number;
  tasks: Task[];
}

export interface Week {
  id: string;
  number: number;
  title: string;
  goal: string;
  status: 'pending' | 'in-progress' | 'completed';
  days: Day[];
}

export interface KPI {
  id: string;
  name: string;
  baseline: number;
  target: number;
  current: number;
  unit: string;
}

export interface Session {
  id: string;
  taskId: string;
  start_ts: string;
  end_ts: string;
  minutes: number;
  pomodoro_count: number;
}

export interface Note {
    id: string;
    dayId: string;
    content: string;
    createdAt: string;
}

export interface TemplateTask {
    id: string;
    title: string;
    type: TaskType;
    estimated_minutes: number;
}

export interface Template {
    id: string;
    week_number: number;
    title: string;
    goal: string;
    tasks: TemplateTask[];
}

export type View = 'dashboard' | 'weeks' | 'today' | 'templates';
