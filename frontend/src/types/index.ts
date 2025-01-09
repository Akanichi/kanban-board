export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: number;
  user_name: string;
}

export interface Attachment {
  id: number;
  filename: string;
  url: string;
  created_at: string;
}

export interface ChecklistItem {
  id: number;
  content: string;
  is_completed: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  due_date?: string;
  labels: Label[];
  comments: Comment[];
  attachments: Attachment[];
  checklist: ChecklistItem[];
  cover_image?: string;
  position: number;
  assigned_to?: number;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Activity {
  id: number;
  action: string;
  entity_type: 'task' | 'comment' | 'attachment';
  entity_id: number;
  user_id: number;
  user_name: string;
  created_at: string;
  details?: Record<string, any>;
} 