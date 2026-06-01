// src/services/authService.js
import api from './api';

const guardarPerfilEnLocal = (perfil, fallbackUsername = '') => {
  if (perfil?.id) {
    localStorage.setItem('user_id', String(perfil.id));
  }

  if (perfil?.username) {
    localStorage.setItem('username', perfil.username);
    return;
  }

  if (fallbackUsername) {
    localStorage.setItem('username', fallbackUsername);
  }
};

export const login = async (username, password) => {
  const response = await api.post('token/', { username, password });
  if (response.data.access) {
    localStorage.setItem('token', response.data.access);
    localStorage.setItem('refresh', response.data.refresh);
    const perfil = await api.get('usuarios/me/');
    guardarPerfilEnLocal(perfil.data, username);
  }
  return response.data;
};

export const registrarUsuario = async ({ username, email, password }) => {
  const response = await api.post('registro/', { username, email, password });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  localStorage.removeItem('username');
  localStorage.removeItem('user_id');
};

export const getUsuarioActual = () => {
  return localStorage.getItem('username');
};

export const getUsuarioIdActual = () => {
  const valor = localStorage.getItem('user_id');
  return valor ? Number(valor) : null;
};
