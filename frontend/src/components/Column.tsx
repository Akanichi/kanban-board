import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Column as ColumnType, Task, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { NewTaskModal } from './NewTaskModal';
import './Column.css';

interface ColumnProps {
  column: ColumnType;
  onDeleteTask: (id: number) => void;
  onAddCard?: (title: string, description: string) => void;
  onUpdateTask: (id: number, updates: Partial<Task>) => Promise<void>;
  onAddComment: (taskId: number, content: string) => Promise<void>;
  onAddAttachment: (taskId: number, file: File) => Promise<void>;
  onAddLabel: (taskId: number, label: { name: string; color: string }) => Promise<void>;
  onToggleChecklistItem: (taskId: number, itemId: number) => Promise<void>;
  onAddChecklistItem: (taskId: number, content: string) => Promise<void>;
  onDeleteComment: (taskId: number, commentId: number) => Promise<void>;
  onRemoveList?: (columnId: string) => void;
}

const Column: React.FC<ColumnProps> = ({ 
  column, 
  onDeleteTask, 
  onAddCard, 
  onUpdateTask,
  onAddComment,
  onAddAttachment,
  onAddLabel,
  onToggleChecklistItem,
  onAddChecklistItem,
  onDeleteComment,
  onRemoveList
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="column">
      <div className="column-header">
        <h2>{column.title}</h2>
        {onRemoveList && column.id !== 'todo' && column.id !== 'in_progress' && column.id !== 'done' && (
          <button
            onClick={() => onRemoveList(column.id)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <Droppable droppableId={column.id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="column-content"
          >
            {column.tasks
              .sort((a, b) => (a.position || 0) - (b.position || 0))
              .map((task: Task, index: number) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onDelete={onDeleteTask}
                onUpdate={onUpdateTask}
                onAddComment={onAddComment}
                onAddAttachment={onAddAttachment}
                onAddLabel={onAddLabel}
                onToggleChecklistItem={onToggleChecklistItem}
                onAddChecklistItem={onAddChecklistItem}
                onDeleteComment={onDeleteComment}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      {onAddCard && (
        <>
          <button 
            className="add-card-button"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            <span>Add a card</span>
          </button>
          {isModalOpen && (
            <NewTaskModal
              onClose={() => setIsModalOpen(false)}
              onSubmit={(title: string, description: string) => {
                onAddCard(title, description);
                setIsModalOpen(false);
              }}
              status={column.id as TaskStatus}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Column; 