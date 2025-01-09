import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { Task, TaskPriority } from '../types';
import { 
  CalendarIcon, 
  ChatBubbleLeftIcon, 
  PaperClipIcon, 
  PencilIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { format, isPast, isToday, addDays } from 'date-fns';
import { TaskDetailsModal } from './TaskDetailsModal';

interface Props {
  task: Task;
  index: number;
  onDelete: (id: number) => void;
  onUpdate: (id: number, updates: Partial<Task>) => Promise<void>;
  onAddComment: (taskId: number, content: string) => Promise<void>;
  onAddAttachment: (taskId: number, file: File) => Promise<void>;
  onAddLabel: (taskId: number, label: { name: string; color: string }) => Promise<void>;
  onToggleChecklistItem: (taskId: number, itemId: number) => Promise<void>;
  onAddChecklistItem: (taskId: number, content: string) => Promise<void>;
  onUpdatePriority?: (taskId: number, priority: TaskPriority) => Promise<void>;
  onDeleteComment: (taskId: number, commentId: number) => Promise<void>;
}

export const TaskCard: React.FC<Props> = ({
  task,
  index,
  onDelete,
  onUpdate,
  onAddComment,
  onAddAttachment,
  onAddLabel,
  onToggleChecklistItem,
  onAddChecklistItem,
  onUpdatePriority,
  onDeleteComment,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const completedItems = task.checklist?.filter(item => item.is_completed)?.length || 0;
  const totalItems = task.checklist?.length || 0;
  const checklistProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const getDueDateStatus = () => {
    if (!task.due_date) return null;
    const dueDate = new Date(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
    if (isToday(dueDate) || isPast(addDays(dueDate, 2))) return 'soon';
    return 'upcoming';
  };

  const dueDateStatus = getDueDateStatus();

  const handleQuickEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleQuickDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
    }
  };

  const handlePriorityChange = (e: React.MouseEvent, priority: TaskPriority) => {
    e.stopPropagation();
    onUpdatePriority?.(task.id, priority);
  };

  return (
    <>
      <Draggable draggableId={task.id.toString()} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className="task-card"
            onClick={() => setIsModalOpen(true)}
          >
            {/* Priority Indicator */}
            {task.priority && (
              <div className={`priority-indicator priority-${task.priority}`} />
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
              <button onClick={handleQuickEdit} title="Edit">
                <PencilIcon className="h-4 w-4" />
              </button>
              <button onClick={handleQuickDelete} title="Delete">
                <TrashIcon className="h-4 w-4" />
              </button>
              {onUpdatePriority && (
                <>
                  <button 
                    onClick={(e) => handlePriorityChange(e, 'high')}
                    title="Set High Priority"
                  >
                    <ArrowUpIcon className="h-4 w-4 text-red-500" />
                  </button>
                  <button
                    onClick={(e) => handlePriorityChange(e, 'low')}
                    title="Set Low Priority"
                  >
                    <ArrowDownIcon className="h-4 w-4 text-blue-500" />
                  </button>
                </>
              )}
            </div>

            {/* Cover Image */}
            {task.cover_image && (
              <img
                src={task.cover_image}
                alt="Task cover"
                className="card-cover-image"
              />
            )}

            {/* Title */}
            <h3 className="text-sm font-medium">{task.title}</h3>

            {/* Description Preview */}
            {task.description && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Labels */}
            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.labels.map((label) => (
                  <span
                    key={label.id}
                    className="task-label"
                    style={{ backgroundColor: label.color, color: 'white' }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            {/* Checklist Progress */}
            {totalItems > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{`${completedItems}/${totalItems}`}</span>
                  <span>{`${Math.round(checklistProgress)}%`}</span>
                </div>
                <div className="checklist-progress">
                  <div 
                    className="checklist-progress-bar"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="task-metadata">
              {task.due_date && (
                <div className={`task-metadata-item due-date due-date-${dueDateStatus}`}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>{format(new Date(task.due_date), 'MMM d')}</span>
                </div>
              )}
              
              {task.comments && task.comments.length > 0 && (
                <div className="task-metadata-item">
                  <ChatBubbleLeftIcon className="h-3.5 w-3.5" />
                  <span>{task.comments.length}</span>
                </div>
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="task-metadata-item">
                  <PaperClipIcon className="h-3.5 w-3.5" />
                  <span>{task.attachments.length}</span>
                </div>
              )}
            </div>

            {/* Assigned User */}
            {task.assigned_to[0]?.full_name && (
              <div className="mt-2 flex items-center">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                  {task.assigned_to[0].full_name.charAt(0).toUpperCase()}
                </div>
                <span className="ml-2 text-xs text-gray-600">{task.assigned_to[0].full_name}</span>
              </div>
            )}
          </div>
        )}
      </Draggable>

      <TaskDetailsModal
        task={task}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={onUpdate}
        onAddComment={onAddComment}
        onAddAttachment={onAddAttachment}
        onAddLabel={onAddLabel}
        onToggleChecklistItem={onToggleChecklistItem}
        onAddChecklistItem={onAddChecklistItem}
        onDeleteComment={onDeleteComment}
      />
    </>
  );
}; 