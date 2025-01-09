import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Toaster, toast } from 'react-hot-toast';
import Column from './components/Column';
import { NewTaskModal } from './components/NewTaskModal';
import { Task, Column as ColumnType, TaskStatus, Team, Board } from './types';
import * as api from './services/api';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import './App.css';

function KanbanBoard() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [columns, setColumns] = useState<ColumnType[]>(() => {
    const savedColumns = localStorage.getItem('kanban_columns');
    return savedColumns ? JSON.parse(savedColumns) : [
      { id: 'todo', title: 'To Do', tasks: [] },
      { id: 'in_progress', title: 'In Progress', tasks: [] },
      { id: 'done', title: 'Done', tasks: [] }
    ];
  });
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadBoards(selectedTeam.id);
    }
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedBoard) {
      loadTasks();
    }
  }, [selectedBoard]);

  useEffect(() => {
    const updatedColumns = columns.map(col => ({
      ...col,
      tasks: tasks.filter(t => t.status === col.id as TaskStatus)
    }));
    setColumns(updatedColumns);
    localStorage.setItem('kanban_columns', JSON.stringify(updatedColumns));
  }, [tasks, columns.length]);

  const loadTeams = async () => {
    try {
      const fetchedTeams = await api.getUserTeams();
      setTeams(fetchedTeams);
      if (fetchedTeams.length > 0) {
        setSelectedTeam(fetchedTeams[0]);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams');
    }
  };

  const loadBoards = async (teamId: number) => {
    try {
      const fetchedBoards = await api.getTeamBoards(teamId);
      setBoards(fetchedBoards);
      if (fetchedBoards.length > 0) {
        setSelectedBoard(fetchedBoards[0]);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      toast.error('Failed to load boards');
    }
  };

  const loadTasks = async () => {
    if (!selectedBoard) return;
    
    try {
      const fetchedTasks = await api.getTasks(selectedBoard.id);
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Failed to load tasks');
    }
  };

  const handleCreateTask = async (title: string, description: string, status: TaskStatus) => {
    if (!selectedBoard) return;

    try {
      const newTask = await api.createTask(selectedBoard.id, { title, description, status });
      setTasks(prevTasks => [...prevTasks, newTask]);
      setIsModalOpen(false);
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const taskId = parseInt(draggableId);
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;

    const newTasks = Array.from(tasks);
    const updatedTask = { ...task, status: destination.droppableId as TaskStatus };
    const taskIndex = newTasks.findIndex(t => t.id === taskId);
    newTasks[taskIndex] = updatedTask;

    // Calculate new positions for tasks in the destination column
    const destinationTasks = newTasks
      .filter(t => t.status === destination.droppableId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    // Remove the dragged task from the array
    const withoutDraggedTask = destinationTasks.filter(t => t.id !== taskId);
    
    // Insert the dragged task at the new position
    withoutDraggedTask.splice(destination.index, 0, updatedTask);
    
    // Reassign positions sequentially
    const updatedTasks = withoutDraggedTask.map((t, index) => ({
      ...t,
      position: index + 1
    }));

    // Update local state
    setTasks(newTasks.map(t => {
      const updatedTask = updatedTasks.find(ut => ut.id === t.id);
      return updatedTask || t;
    }));

    try {
      // First update the dragged task's status and position
      await api.updateTask(taskId, {
        status: destination.droppableId as TaskStatus,
        position: destination.index + 1
      });

      // Then sequentially update other tasks' positions
      for (const task of updatedTasks) {
        if (task.id !== taskId) {
          await api.updateTask(task.id, { position: task.position });
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setTasks(tasks); // Revert to original state on error
      toast.error('Failed to update task positions');
    }
  };

  const handleUpdateTask = async (id: number, updates: Partial<Task>) => {
    try {
      const updatedTask = await api.updateTask(id, updates);
      setTasks(prevTasks => prevTasks.map(t => t.id === id ? updatedTask : t));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await api.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleAddList = () => {
    if (!newListTitle.trim()) return;
    
    const newColumnId = newListTitle.toLowerCase().replace(/\s+/g, '_');
    const newColumn: ColumnType = {
      id: newColumnId,
      title: newListTitle,
      tasks: []
    };

    setColumns([...columns, newColumn]);
    setNewListTitle('');
    setIsAddingList(false);
  };

  const handleAddComment = async (taskId: number, content: string) => {
    if (!selectedBoard) return;
    
    try {
      await api.addComment(taskId, { content, task_id: taskId });
      await loadTasks();
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleAddAttachment = async (taskId: number, file: File) => {
    if (!selectedBoard) return;
    
    try {
      await api.addAttachment(taskId, file);
      await loadTasks();
      toast.success('Attachment added');
    } catch (error) {
      console.error('Error adding attachment:', error);
      toast.error('Failed to add attachment');
    }
  };

  const handleAddLabel = async (taskId: number, label: { name: string; color: string }) => {
    if (!selectedBoard) return;
    
    try {
      await api.addLabel(taskId, label);
      await loadTasks();
      toast.success('Label added');
    } catch (error) {
      console.error('Error adding label:', error);
      toast.error('Failed to add label');
    }
  };

  const handleToggleChecklistItem = async (taskId: number, itemId: number) => {
    try {
      const updatedTask = await api.toggleChecklistItem(taskId, itemId);
      setTasks(prevTasks => {
        const newTasks = prevTasks.map(task => task.id === taskId ? updatedTask : task);
        return newTasks;
      });
    } catch (error) {
      toast.error('Failed to update checklist item');
    }
  };

  const handleAddChecklistItem = async (taskId: number, content: string) => {
    try {
      const updatedTask = await api.addChecklistItem(taskId, content);
      setTasks(prevTasks => prevTasks.map(task => 
        task.id === taskId ? updatedTask : task
      ));
      toast.success('Checklist item added');
    } catch (error) {
      toast.error('Failed to add checklist item');
    }
  };

  const handleRemoveList = (columnId: string) => {
    // Move all tasks from this column to 'todo'
    const tasksToMove = tasks.filter(t => t.status === columnId);
    tasksToMove.forEach(async task => {
      await handleUpdateTask(task.id, { status: 'todo' });
    });

    // Remove the column
    setColumns(prevColumns => prevColumns.filter(col => col.id !== columnId));
    toast.success('List removed successfully');
  };

  const handleDeleteComment = async (taskId: number, commentId: number) => {
    if (!selectedBoard) return;
    
    try {
      await api.deleteComment(taskId, commentId);
      await loadTasks();
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  // Get unique labels from all tasks
  const allLabels = useMemo(() => {
    const labelMap = new Map();
    tasks.forEach(task => {
      task.labels?.forEach(label => {
        labelMap.set(label.id, label);
      });
    });
    return Array.from(labelMap.values());
  }, [tasks]);

  // Filter tasks based on selected label
  const filteredTasks = useMemo(() => {
    if (!selectedLabel) return tasks;
    return tasks.filter(task => 
      task.labels?.some(label => String(label.id) === selectedLabel)
    );
  }, [tasks, selectedLabel]);

  const boardColumns = useMemo(() => [
    { id: 'todo', title: 'To Do', tasks: filteredTasks.filter(t => t.status === 'todo') },
    { id: 'in_progress', title: 'In Progress', tasks: filteredTasks.filter(t => t.status === 'in_progress') },
    { id: 'done', title: 'Done', tasks: filteredTasks.filter(t => t.status === 'done') }
  ], [filteredTasks]);

  return (
    <div className="app-container">
      <header className="nav-header">
        <a href="/" className="nav-brand">
          Kanban Board
        </a>
        <div className="nav-controls">
          <select 
            className="nav-select"
            value={selectedTeam?.id || ''}
            onChange={(e) => {
              const team = teams.find(t => t.id === Number(e.target.value));
              setSelectedTeam(team || null);
            }}
          >
            <option value="">Select Team</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <select 
            className="nav-select"
            value={selectedBoard?.id || ''}
            onChange={(e) => {
              const board = boards.find(b => b.id === Number(e.target.value));
              setSelectedBoard(board || null);
            }}
          >
            <option value="">Select Board</option>
            {boards.map(board => (
              <option key={board.id} value={board.id}>{board.name}</option>
            ))}
          </select>
          {/* Label Filter */}
          <select
            className="nav-select"
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
          >
            <option value="">All Labels</option>
            {allLabels.map(label => (
              <option 
                key={label.id} 
                value={String(label.id)}
                style={{ backgroundColor: label.color, color: 'white' }}
              >
                {label.name}
              </option>
            ))}
          </select>
          <div className="user-menu">
            <div className="user-avatar">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <span>{user?.username}</span>
            <button className="logout-button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="board-container">
        <div className="board-header">
          <h1 className="board-title">
            {selectedBoard?.name || 'Select a Board'}
          </h1>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="board-columns">
            {boardColumns.map(column => (
              <Column
                key={column.id}
                column={column}
                onDeleteTask={handleDeleteTask}
                onAddCard={(title: string, description: string) => handleCreateTask(title, description, column.id as TaskStatus)}
                onUpdateTask={handleUpdateTask}
                onAddComment={handleAddComment}
                onAddAttachment={handleAddAttachment}
                onAddLabel={handleAddLabel}
                onToggleChecklistItem={handleToggleChecklistItem}
                onAddChecklistItem={handleAddChecklistItem}
                onDeleteComment={handleDeleteComment}
                onRemoveList={column.id !== 'todo' && column.id !== 'in_progress' && column.id !== 'done' ? handleRemoveList : undefined}
              />
            ))}
            {isAddingList ? (
              <div className="add-list-form">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Enter list title..."
                  autoFocus
                  onBlur={() => {
                    handleAddList();
                    setIsAddingList(false);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddList();
                      setIsAddingList(false);
                    }
                  }}
                />
              </div>
            ) : (
              <button
                className="add-list-button"
                onClick={() => setIsAddingList(true)}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add another list
              </button>
            )}
          </div>
        </DragDropContext>
      </main>

      {isModalOpen && (
        <NewTaskModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={(title: string, description: string) => handleCreateTask(title, description, 'todo')}
          status="todo"
        />
      )}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user } = useAuth();
  return user ? <KanbanBoard /> : <AuthPage />;
}

export default App;
