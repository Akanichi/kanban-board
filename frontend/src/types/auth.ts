export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  username: string;
  password: string;
  remember_me?: boolean;
} 