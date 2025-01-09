// Task Status and Priority Types
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'canceled';
export type TaskPriority = 'high' | 'medium' | 'low';

// User Interface
export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  created_at: string;
}

// Label Interface
export interface Label {
  id: number;
  name: string;
  color: string;
}

// Checklist Item Interface
export interface ChecklistItem {
  id: number;
  content: string;
  is_completed: boolean;
}

// Comment Interface
export interface Comment {
  id: number;
  content: string;
  created_at: string;
  updated_at?: string;
  task_id: number;
  user_id: number;
  user_name: string;
}

// Attachment Interface
export interface Attachment {
  id: number;
  filename: string;
  url: string;
  created_at: string;
  task_id: number;
  user_id?: number;
}

// Task Interface
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  position?: number;
  due_date?: string;
  created_at: string;
  updated_at?: string;
  creator_id?: number;
  board_id: number;
  is_archived: boolean;
  creator?: User;
  board: Board;
  assigned_to: User[];
  labels: Label[];
  comments: Comment[];
  attachments: Attachment[];
  checklist: ChecklistItem[];
  checklist_completion?: {
    total: number;
    completed: number;
    percentage: number;
  };
  cover_image?: string;
}

// Column Interface
export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

// Activity Interface
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

export interface TeamMember {
  role: 'admin' | 'member';
  user: User;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  created_by_id: number;
  created_by: User;
  members: TeamMember[];
}

export interface BoardMember {
  role: 'admin' | 'member';
  user: User;
}

export interface Board {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  created_by_id: number;
  team_id: number;
  is_public: boolean;
  created_by: User;
  team: Team;
  members: BoardMember[];
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  position?: number;
  due_date?: string;
  checklist?: ChecklistItem[];
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  position?: number;
  due_date?: string;
  checklist?: ChecklistItem[];
  is_archived?: boolean;
}

export interface LabelCreateInput {
  name: string;
  color: string;
}

export interface CommentCreateInput {
  content: string;
  task_id: number;
}

export interface TeamCreateInput {
  name: string;
  description?: string;
}

export interface BoardCreateInput {
  name: string;
  description?: string;
  team_id: number;
  is_public?: boolean;
}

export interface TeamMemberCreateInput {
  user_id: number;
  role?: 'admin' | 'member';
}

export interface BoardMemberCreateInput {
  user_id: number;
  role?: 'admin' | 'member';
} 