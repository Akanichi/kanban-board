import React, { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { 
  XMarkIcon, 
  PaperClipIcon, 
  CalendarIcon, 
  TagIcon, 
  UserIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import type { Task, Label, TaskPriority } from '../types';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface Props {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (taskId: number, updates: Partial<Task>) => Promise<void>;
  onAddComment: (taskId: number, content: string) => Promise<void>;
  onAddAttachment: (taskId: number, file: File) => Promise<void>;
  onAddLabel: (taskId: number, label: Omit<Label, 'id'>) => Promise<void>;
  onToggleChecklistItem: (taskId: number, itemId: number) => Promise<void>;
  onAddChecklistItem: (taskId: number, content: string) => Promise<void>;
  onDeleteComment: (taskId: number, commentId: number) => Promise<void>;
}

const priorityColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800'
} as const;

export const TaskDetailsModal: React.FC<Props> = ({
  task,
  isOpen,
  onClose,
  onUpdate,
  onAddComment,
  onAddAttachment,
  onAddLabel,
  onToggleChecklistItem,
  onAddChecklistItem,
  onDeleteComment,
}) => {
  // State for task fields
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description || '');
  const [selectedDueDate, setSelectedDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>(task.priority as TaskPriority);
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#2563eb');
  const [hasChanges, setHasChanges] = useState(false);

  // Update state when task changes
  useEffect(() => {
    setEditedTitle(task.title);
    setEditedDescription(task.description || '');
    setSelectedDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setTaskPriority(task.priority as TaskPriority);
  }, [task]);

  const completedItems = task.checklist?.filter(item => item.is_completed)?.length || 0;
  const totalItems = task.checklist?.length || 0;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Track changes
  useEffect(() => {
    const hasUnsavedChanges = 
      editedTitle !== task.title ||
      editedDescription !== (task.description || '') ||
      selectedDueDate !== (task.due_date ? task.due_date.split('T')[0] : '');
    setHasChanges(hasUnsavedChanges);
  }, [editedTitle, editedDescription, selectedDueDate, task]);

  // Update priority state when task changes
  useEffect(() => {
    setTaskPriority(task.priority as TaskPriority);
  }, [task.priority]);

  const handleSaveChanges = async () => {
    try {
      if (!editedTitle.trim()) {
        toast.error('Title cannot be empty');
        return;
      }

      const updates: Partial<Task> = {
        title: editedTitle.trim(),
        description: editedDescription.trim(),
        status: task.status,
        priority: task.priority,
        due_date: selectedDueDate || undefined,
        position: task.position
      };
      
      await onUpdate(task.id, updates);
      setHasChanges(false);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    try {
      const updates: Partial<Task> = { priority };
      await onUpdate(task.id, updates);
      setTaskPriority(priority); // Update local state immediately
      toast.success('Priority updated successfully');
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
      setTaskPriority(task.priority as TaskPriority); // Reset on error
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    await onAddComment(task.id, newComment);
    setNewComment('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onAddAttachment(task.id, file);
    }
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;

    try {
      await onAddChecklistItem(task.id, newChecklistItem);
      setNewChecklistItem('');
    } catch (error) {
      // Error is handled by the parent component
    }
  };

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    await onAddLabel(task.id, {
      name: newLabelName,
      color: newLabelColor
    });
    setNewLabelName('');
    setShowLabelPicker(false);
  };

  const handlePriorityClick = (priority: TaskPriority) => {
    handlePriorityChange(priority);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="modal-container" onClose={onClose} style={{ zIndex: 9999 }}>
        <div className="flex min-h-screen items-center justify-center px-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="modal-overlay" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4"
            enterTo="opacity-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-4"
          >
            <div className="modal-content">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  {/* Title */}
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => {
                      setEditedTitle(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  />

                  {/* Description */}
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => {
                        setEditedDescription(e.target.value);
                        setHasChanges(true);
                      }}
                      className="w-full h-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Add a more detailed description..."
                    />
                  </div>

                  {/* Checklist */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">Checklist</h3>
                      {totalItems > 0 && (
                        <span className="text-sm text-gray-500">{progress}%</span>
                      )}
                    </div>
                    {totalItems > 0 && (
                      <div className="checklist-progress mb-3">
                        <div 
                          className="checklist-progress-bar"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      {task.checklist?.map((item) => (
                        <div key={item.id} className="flex items-center group">
                          <input
                            type="checkbox"
                            checked={item.is_completed}
                            onChange={() => onToggleChecklistItem(task.id, item.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className={`ml-2 flex-grow ${item.is_completed ? 'line-through text-gray-400' : ''}`}>
                            {item.content}
                          </span>
                          <button 
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                            onClick={() => onUpdate(task.id, {
                              checklist: task.checklist?.filter(i => i.id !== item.id)
                            })}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                        <input
                          type="text"
                          value={newChecklistItem}
                          onChange={(e) => setNewChecklistItem(e.target.value)}
                          placeholder="Add an item..."
                          className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Add
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Comments</h3>
                    <div className="space-y-4">
                      {task.comments?.map((comment) => (
                        <div key={comment.id} className="comment group">
                          <div className="comment-avatar">
                            {comment.user_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="comment-content">
                            <div className="text-sm flex justify-between">
                              <div>
                                <span className="font-medium">{comment.user_name || 'Unknown User'}</span>
                                <span className="text-gray-500 ml-2">
                                  {format(new Date(comment.created_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                              <button
                                onClick={() => onDeleteComment(task.id, comment.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="mt-1 text-sm text-gray-700">{comment.content}</div>
                          </div>
                        </div>
                      ))}
                      <form onSubmit={handleAddComment}>
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          rows={3}
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Comment
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Priority */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Priority</h3>
                    <Menu as="div" className="relative">
                      <Menu.Button className="w-full flex items-center justify-between px-3 py-2 border rounded-md shadow-sm bg-white hover:bg-gray-50">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[taskPriority]}`}>
                          {taskPriority ? taskPriority.charAt(0).toUpperCase() + taskPriority.slice(1) : 'Low'}
                        </span>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      </Menu.Button>
                      <Menu.Items className="absolute right-0 mt-1 w-full rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          {(['high', 'medium', 'low'] as const).map((priority) => (
                            <Menu.Item key={priority}>
                              {({ active }) => (
                                <button
                                  onClick={() => handlePriorityClick(priority)}
                                  className={`
                                    ${active ? 'bg-gray-100' : ''}
                                    ${taskPriority === priority ? 'bg-gray-50' : ''}
                                    group flex w-full items-center px-4 py-2 text-sm
                                  `}
                                >
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[priority]}`}>
                                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                  </span>
                                  {taskPriority === priority && (
                                    <CheckIcon className="ml-auto h-4 w-4 text-blue-500" />
                                  )}
                                </button>
                              )}
                            </Menu.Item>
                          ))}
                        </div>
                      </Menu.Items>
                    </Menu>
                  </div>

                  {/* Due Date */}
                  <div>
                    <h3 className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Due Date
                    </h3>
                    <input
                      type="date"
                      value={selectedDueDate}
                      onChange={(e) => {
                        setSelectedDueDate(e.target.value);
                        setHasChanges(true);
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  {/* Labels */}
                  <div>
                    <h3 className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <TagIcon className="h-4 w-4 mr-1" />
                      Labels
                    </h3>
                    <div className="space-y-2">
                      {task.labels?.map((label) => (
                        <div key={label.id} className="flex items-center justify-between group">
                          <span
                            className="flex-grow px-2 py-1 rounded text-sm font-medium"
                            style={{ backgroundColor: label.color, color: 'white' }}
                          >
                            {label.name}
                          </span>
                          <button 
                            className="ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                            onClick={() => onUpdate(task.id, {
                              labels: task.labels?.filter(l => l.id !== label.id)
                            })}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {showLabelPicker ? (
                        <form onSubmit={handleAddLabel} className="space-y-2">
                          <input
                            type="text"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder="Label name"
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                          <input
                            type="color"
                            value={newLabelColor}
                            onChange={(e) => setNewLabelColor(e.target.value)}
                            className="w-full h-8 rounded-md cursor-pointer"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowLabelPicker(false)}
                              className="px-2 py-1 text-gray-700 hover:bg-gray-100 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Add
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowLabelPicker(true)}
                          className="flex items-center text-gray-700 hover:bg-gray-100 rounded p-1 text-sm w-full"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add a label
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attachments */}
                  <div>
                    <h3 className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <PaperClipIcon className="h-4 w-4 mr-1" />
                      Attachments
                    </h3>
                    <div className="space-y-2">
                      {task.attachments?.map((attachment) => (
                        <div key={attachment.id} className="attachment-preview">
                          <PaperClipIcon className="h-5 w-5 text-gray-400" />
                          <div className="flex-grow min-w-0">
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm font-medium text-blue-600 hover:underline truncate"
                            >
                              {attachment.filename}
                            </a>
                            <p className="text-xs text-gray-500">
                              {format(new Date(attachment.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                      <label className="block">
                        <span className="sr-only">Choose file</span>
                        <input
                          type="file"
                          onChange={handleFileUpload}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Assigned To */}
                  <div>
                    <h3 className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <UserIcon className="h-4 w-4 mr-1" />
                      Assigned To
                    </h3>
                    {task.assigned_to[0]?.full_name ? (
                      <div className="flex items-center justify-between group">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                            {task.assigned_to[0].full_name[0].toUpperCase()}
                          </div>
                          <span className="ml-2 text-sm">{task.assigned_to[0].full_name}</span>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                          onClick={() => onUpdate(task.id, { assigned_to: [] })}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="flex items-center text-gray-700 hover:bg-gray-100 rounded p-1 text-sm w-full"
                        onClick={() => {/* Implement user assignment */}}
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Assign member
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Save/Cancel buttons */}
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditedTitle(task.title);
                    setEditedDescription(task.description || '');
                    setSelectedDueDate(task.due_date ? task.due_date.split('T')[0] : '');
                    setHasChanges(false);
                  }}
                  className={`px-4 py-2 text-gray-700 rounded-md ${hasChanges ? 'hover:bg-gray-100' : 'opacity-50 cursor-not-allowed'}`}
                  disabled={!hasChanges}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md ${hasChanges ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'}`}
                  disabled={!hasChanges}
                >
                  Save
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}; 