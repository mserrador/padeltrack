// src/services/authService.js
import api from './api';

export const login = async (username, password) => {
  const response = await api.post('token/', { username, password });
  if (response.data.access) {
    localStorage.setItem('token', response.data.access);
    localStorage.setItem('refresh', response.data.refresh);
    localStorage.setItem('username', username);
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  localStorage.removeItem('username');
};

export const getUsuarioActual = () => {
  return localStorage.getItem('username');
};