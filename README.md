# Kanban Board Project

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.68+-green.svg)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)

A full-stack Kanban board application built with React and FastAPI, featuring real-time task management, team collaboration, and user authentication.

Created by Mohamed Akaarir with the assistance of Cursor AI Composer and Anthropic's Claude-3.5-Sonnet model.

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/Akanichi/kanban-board.git
cd kanban-board

# Backend: Install and run
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r ../requirements.txt  # Install from root requirements.txt
cp .env.example .env     # Create and configure your .env file
alembic upgrade head     # Run database migrations
uvicorn app.main:app --reload

# Frontend: Install and run (in a new terminal)
cd frontend
npm install
cp .env.example .env    # Create and configure your .env file
npm start
```

Visit:
- 🌐 Frontend: http://localhost:3000
- 📚 API Docs: http://localhost:8000/docs
- 💻 API: http://localhost:8000

Default Admin Account:
- Email: admin@example.com
- Password: admin123

## 🚀 Table of Contents
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#-architecture)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Frontend Documentation](#-frontend-documentation)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Features

- **User Authentication**: 
  - JWT-based authentication system
  - Token refresh mechanism
  - Password hashing with bcrypt
  - Session management
  
- **Task Management**:
  - Real-time updates using WebSocket
  - Drag-and-drop functionality
  - Task prioritization
  - Due date tracking
  - Task assignments
  
- **Team Collaboration**:
  - Team creation and management
  - Role-based access control
  - Team member invitations
  - Activity logging
  
- **Board Management**:
  - Customizable columns
  - Task filtering and sorting
  - Board sharing
  - Archive functionality

## 🛠️ Tech Stack

### Frontend
- **Core**:
  - React.js 18.x with TypeScript
  - Context API for state management
  - React Query for data fetching
  - React DnD for drag-and-drop
  
- **Styling**:
  - CSS Modules
  - TailwindCSS
  - HeadlessUI components
  
- **Networking**:
  - Axios for REST API calls
  - Socket.io-client for real-time updates

### Backend
- **Core**:
  - FastAPI 0.68+
  - Python 3.8+
  - Uvicorn ASGI server
  
- **Database**:
  - SQLAlchemy ORM
  - SQLite (development)
  - PostgreSQL (production)
  - Alembic for migrations
  
- **Authentication**:
  - JWT with python-jose
  - Passlib for password hashing
  - OAuth2 with Password flow

## 🏛 Architecture

### Backend Architecture

```
backend/
├── app/
│   ├── main.py                 # FastAPI application initialization
│   ├── dependencies.py         # Dependency injection
│   ├── config.py              # Configuration management
│   │
│   ├── auth/
│   │   ├── jwt.py             # JWT token handling
│   │   ├── utils.py           # Authentication utilities
│   │   └── deps.py            # Auth dependencies
│   │
│   ├── models/                # SQLAlchemy models
│   │   ├── user.py
│   │   ├── task.py
│   │   ├── team.py
│   │   └── board.py
│   │
│   ├── schemas/               # Pydantic schemas
│   │   ├── user.py
│   │   ├── task.py
│   │   ├── team.py
│   │   └── board.py
│   │
│   ├── crud/                  # Database operations
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── task.py
│   │   └── team.py
│   │
│   ├── routers/               # API endpoints
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── tasks.py
│   │   └── teams.py
│   │
│   └── utils/                 # Utility functions
       ├── logging.py
       └── security.py
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── components/            # React components
│   │   ├── auth/             # Authentication components
│   │   ├── board/            # Board-related components
│   │   ├── task/             # Task-related components
│   │   └── team/             # Team-related components
│   │
│   ├── contexts/             # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── BoardContext.tsx
│   │   └── TeamContext.tsx
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useBoard.ts
│   │   └── useWebSocket.ts
│   │
│   ├── services/             # API services
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── team.ts
│   │
│   └── utils/                # Utility functions
       ├── date.ts
       └── validation.ts
```

## 📚 API Documentation

### Authentication API

#### Register New User
```http
POST /api/auth/register
```
**Request Body:**
```json
{
  "email": "string",
  "password": "string",
  "full_name": "string"
}
```
**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "string",
  "full_name": "string",
  "created_at": "datetime"
}
```

#### Login
```http
POST /api/auth/login
```
**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```
**Response:** `200 OK`
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Tasks API

#### Create Task
```http
POST /api/tasks
```
**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "due_date": "datetime",
  "priority": "enum(LOW, MEDIUM, HIGH)",
  "column_id": "uuid",
  "assignee_id": "uuid"
}
```
**Response:** `201 Created`
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

#### Update Task
```http
PUT /api/tasks/{task_id}
```
**Path Parameters:**
- `task_id`: UUID of the task

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "status": "string",
  "due_date": "datetime",
  "priority": "string"
}
```

### Teams API

#### Create Team
```http
POST /api/teams
```
**Request Body:**
```json
{
  "name": "string",
  "description": "string"
}
```

#### Add Team Member
```http
POST /api/teams/{team_id}/members
```
**Request Body:**
```json
{
  "email": "string",
  "role": "enum(ADMIN, MEMBER)"
}
```

## 💾 Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    priority VARCHAR(50),
    due_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    column_id UUID REFERENCES columns(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Teams Table
```sql
CREATE TABLE teams (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 Frontend Documentation

### Key Components

#### TaskCard
The `TaskCard` component is responsible for rendering individual task cards with drag-and-drop functionality.

```typescript
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}
```

#### Board
The `Board` component manages the overall Kanban board layout and column organization.

```typescript
interface BoardProps {
  teamId: string;
  onColumnAdd: (column: Column) => void;
  onTaskMove: (taskId: string, sourceCol: string, targetCol: string) => void;
}
```

### Context Usage

```typescript
// Authentication Context
const { user, login, logout } = useAuth();

// Board Context
const { tasks, columns, moveTask, addTask } = useBoard();

// Team Context
const { team, members, inviteMember } = useTeam();
```

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/kanban-board.git
   cd kanban-board
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   pip install -r ../requirements.txt  # Install from root requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## 🔐 Environment Variables

### Backend (.env)
```env
# Application
DEBUG=True
ENVIRONMENT=development
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=sqlite:///./kanban.db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=kanban
POSTGRES_HOST=localhost

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws
REACT_APP_ENVIRONMENT=development
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Mohamed Akaarir** - Initial work and project maintainer

## 🙏 Acknowledgments

- React.js community
- FastAPI community
- Cursor AI Composer for development assistance
- Anthropic's Claude-3.5-Sonnet model for technical guidance
- All contributors who help improve this project