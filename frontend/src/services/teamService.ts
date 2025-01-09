import { api } from './api';

export interface Team {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  created_by_id: number;
  team_memberships: TeamMember[];
  created_by: User;
}

export interface TeamCreate {
  name: string;
  description?: string;
}

export interface Board {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  created_by_id: number;
  team_id: number;
  board_memberships: BoardMember[];
  created_by: User;
  team: Team;
}

export interface BoardCreate {
  name: string;
  description?: string;
  is_public?: boolean;
  team_id: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
}

export interface TeamMember {
  role: 'admin' | 'member';
  user: User;
}

export interface BoardMember {
  role: 'admin' | 'member';
  user: User;
}

export const teamService = {
  // Get all teams for the current user
  getUserTeams: async (): Promise<Team[]> => {
    const response = await api.get('/teams');
    return response.data;
  },

  // Create a new team
  createTeam: async (data: TeamCreate): Promise<Team> => {
    const response = await api.post('/teams', data);
    return response.data;
  },

  // Get a specific team by ID
  getTeam: async (teamId: number): Promise<Team> => {
    const response = await api.get(`/teams/${teamId}`);
    return response.data;
  },

  // Get all boards for a team
  getTeamBoards: async (teamId: number): Promise<Board[]> => {
    const response = await api.get(`/teams/${teamId}/boards`);
    return response.data;
  },

  // Create a new board in a team
  createBoard: async (teamId: number, data: Omit<BoardCreate, 'team_id'>): Promise<Board> => {
    const response = await api.post(`/teams/${teamId}/boards`, {
      ...data,
      team_id: teamId
    });
    return response.data;
  },

  // Get a specific board
  getBoard: async (teamId: number, boardId: number): Promise<Board> => {
    const response = await api.get(`/teams/${teamId}/boards/${boardId}`);
    return response.data;
  }
}; 