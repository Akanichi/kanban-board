import axios from 'axios';
import {
    Task, Label, Comment, Attachment,
    TaskCreateInput, TaskUpdateInput, LabelCreateInput, CommentCreateInput,
    Team, Board, TeamCreateInput, BoardCreateInput,
    TeamMemberCreateInput, BoardMemberCreateInput
} from '../types';

// Debug logging control
let isDebugEnabled = false;

export const enableDebugLogging = () => {
    isDebugEnabled = true;
};

export const disableDebugLogging = () => {
    isDebugEnabled = false;
};

const debugLog = (...args: any[]) => {
    if (isDebugEnabled) {
        console.log(...args);
    }
};

export const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth interceptor to add token
api.interceptors.request.use((config) => {
    debugLog('Making request to:', config.url);
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
});

// Response interceptor for debugging
api.interceptors.response.use((response) => {
    debugLog('Response from:', response.config.url, response.status);
    return response;
}, (error) => {
    if (error.response) {
        console.error('API Error Response:', {
            url: error.config?.url,
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
        });
    } else if (error.request) {
        console.error('API No Response:', {
            url: error.config?.url,
            request: error.request
        });
    } else {
        console.error('API Error:', error.message);
    }
    return Promise.reject(error);
});

// Teams
export const createTeam = async (team: TeamCreateInput): Promise<Team> => {
    const response = await api.post('/teams', team);
    return response.data;
};

export const getUserTeams = async (): Promise<Team[]> => {
    debugLog('Fetching user teams...');
    const response = await api.get('/teams');
    debugLog('Teams response:', response.data);
    return response.data;
};

export const getTeam = async (teamId: number): Promise<Team> => {
    const response = await api.get(`/teams/${teamId}`);
    return response.data;
};

export const addTeamMember = async (teamId: number, member: TeamMemberCreateInput): Promise<void> => {
    await api.post(`/teams/${teamId}/members`, member);
};

export const removeTeamMember = async (teamId: number, userId: number): Promise<void> => {
    await api.delete(`/teams/${teamId}/members/${userId}`);
};

// Boards
export const createBoard = async (teamId: number, board: BoardCreateInput): Promise<Board> => {
    const response = await api.post(`/teams/${teamId}/boards`, board);
    return response.data;
};

export const getTeamBoards = async (teamId: number): Promise<Board[]> => {
    const response = await api.get(`/teams/${teamId}/boards`);
    return response.data;
};

export const getBoard = async (teamId: number, boardId: number): Promise<Board> => {
    const response = await api.get(`/teams/${teamId}/boards/${boardId}`);
    return response.data;
};

export const addBoardMember = async (
    teamId: number,
    boardId: number,
    member: BoardMemberCreateInput
): Promise<void> => {
    await api.post(`/teams/${teamId}/boards/${boardId}/members`, member);
};

export const removeBoardMember = async (
    teamId: number,
    boardId: number,
    userId: number
): Promise<void> => {
    await api.delete(`/teams/${teamId}/boards/${boardId}/members/${userId}`);
};

// Tasks
export const createTask = async (boardId: number, task: TaskCreateInput): Promise<Task> => {
    const response = await api.post('/tasks', task, {
        params: { board_id: boardId }
    });
    return response.data;
};

export const getTasks = async (boardId: number): Promise<Task[]> => {
    const response = await api.get('/tasks', {
        params: { board_id: boardId }
    });
    return response.data;
};

export const getTask = async (taskId: number): Promise<Task> => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
};

export const updateTask = async (taskId: number, task: TaskUpdateInput): Promise<Task> => {
    const response = await api.put(`/tasks/${taskId}`, task);
    return response.data;
};

export const deleteTask = async (taskId: number): Promise<void> => {
    await api.delete(`/tasks/${taskId}`);
};

// Labels
export const addLabel = async (taskId: number, label: LabelCreateInput): Promise<Label> => {
    const response = await api.post(`/tasks/${taskId}/labels`, label);
    return response.data;
};

export const getTaskLabels = async (taskId: number): Promise<Label[]> => {
    const response = await api.get(`/tasks/${taskId}/labels`);
    return response.data;
};

export const removeLabel = async (taskId: number, labelId: number): Promise<void> => {
    await api.delete(`/tasks/${taskId}/labels/${labelId}`);
};

// Comments
export const addComment = async (taskId: number, comment: CommentCreateInput): Promise<Comment> => {
    const response = await api.post(`/tasks/${taskId}/comments`, comment);
    return response.data;
};

export const getTaskComments = async (taskId: number): Promise<Comment[]> => {
    const response = await api.get(`/tasks/${taskId}/comments`);
    return response.data;
};

export const deleteComment = async (taskId: number, commentId: number): Promise<void> => {
    await api.delete(`/tasks/${taskId}/comments/${commentId}`);
};

// Attachments
export const addAttachment = async (taskId: number, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getTaskAttachments = async (taskId: number): Promise<Attachment[]> => {
    const response = await api.get(`/tasks/${taskId}/attachments`);
    return response.data;
};

// Checklist
export const addChecklistItem = async (taskId: number, content: string): Promise<Task> => {
    const response = await api.post(`/tasks/${taskId}/checklist`, { content });
    return response.data;
};

export const toggleChecklistItem = async (taskId: number, itemId: number): Promise<Task> => {
    const response = await api.put(`/tasks/${taskId}/checklist/${itemId}/toggle`);
    return response.data;
}; 