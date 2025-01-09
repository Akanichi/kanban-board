import React from 'react';
import './Board.css';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  checklist_items: Array<{ id: number; content: string; is_completed: boolean }>;
  comments_count: number;
  attachments_count: number;
}

interface BoardProps {
  currentTeam: string;
  currentBoard: string;
  username: string;
  onLogout: () => void;
  tasks: Task[];
}

const Board: React.FC<BoardProps> = ({
  currentTeam,
  currentBoard,
  username,
  onLogout,
  tasks
}) => {
  const columns = ['To Do', 'In Progress', 'Done'];

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getCompletionPercentage = (task: Task) => {
    if (task.checklist_items.length === 0) return 0;
    const completed = task.checklist_items.filter(item => item.is_completed).length;
    return Math.round((completed / task.checklist_items.length) * 100);
  };

  return (
    <div>
      <header className="nav-header">
        <a href="/" className="nav-brand">Kanban Board</a>
        <div className="nav-controls">
          <select className="nav-select" value={currentTeam}>
            <option value="">Select Team</option>
            <option value="my-team">My Team</option>
          </select>
          <select className="nav-select" value={currentBoard}>
            <option value="">Select Board</option>
            <option value="my-board">My Board</option>
          </select>
          <div className="user-menu">
            <div className="user-avatar">
              {username.charAt(0).toUpperCase()}
            </div>
            <span>{username}</span>
            <button className="logout-button" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="board-container">
        <div className="board-header">
          <h1 className="board-title">{currentBoard || 'My Board'}</h1>
        </div>

        <div className="board-columns">
          {columns.map(columnTitle => (
            <div key={columnTitle} className="board-column">
              <div className="column-header">
                <h2 className="column-title">{columnTitle}</h2>
                <span className="column-count">
                  {getTasksByStatus(columnTitle.toLowerCase()).length}
                </span>
              </div>
              
              <div className="column-content">
                {getTasksByStatus(columnTitle.toLowerCase()).map(task => (
                  <div key={task.id} className="task-card">
                    <h3 className="task-title">{task.title}</h3>
                    <p className="task-description">{task.description}</p>
                    <div className="task-footer">
                      <div className="task-metadata">
                        {task.checklist_items.length > 0 && (
                          <div className="task-progress">
                            <span>✓ {getCompletionPercentage(task)}%</span>
                          </div>
                        )}
                        {task.comments_count > 0 && (
                          <div>💬 {task.comments_count}</div>
                        )}
                        {task.attachments_count > 0 && (
                          <div>📎 {task.attachments_count}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button className="add-card-button">+ Add a card</button>
              </div>
            </div>
          ))}
          <button className="add-list-button">+ Add another list</button>
        </div>
      </main>
    </div>
  );
};

export default Board; 