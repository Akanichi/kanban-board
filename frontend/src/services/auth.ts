import axios from 'axios';
import { LoginData, RegisterData, LoginResponse, User } from '../types/auth';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

export const register = async (data: RegisterData): Promise<User> => {
  const response = await api.post('/auth/register', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export const login = async (data: LoginData): Promise<LoginResponse> => {
  const formData = new URLSearchParams();
  formData.append('grant_type', 'password');
  formData.append('username', data.username);
  formData.append('password', data.password);

  const response = await api.post('/auth/login', formData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  return response.data;
};

// Add token to all requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}); 