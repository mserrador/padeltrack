// src/services/authService.js
import api from './api';

const guardarPerfilEnLocal = (perfil, nombreUsuarioAlternativo = '') => {
  if (perfil?.id) {
    localStorage.setItem('user_id', String(perfil.id));
  }

  if (perfil?.username) {
    localStorage.setItem('username', perfil.username);
    return;
  }

  if (nombreUsuarioAlternativo) {
    localStorage.setItem('username', nombreUsuarioAlternativo);
  }
};

export const iniciarSesion = async (username, password) => {
  const respuesta = await api.post('token/', { username, password });
  if (respuesta.data.access) {
    localStorage.setItem('token', respuesta.data.access);
    localStorage.setItem('refresh', respuesta.data.refresh);
    const perfil = await api.get('usuarios/me/');
    guardarPerfilEnLocal(perfil.data, username);
  }
  return respuesta.data;
};

export const registrarUsuario = async ({ username, email, password }) => {
  const respuesta = await api.post('registro/', { username, email, password });
  return respuesta.data;
};

export const verificarCorreo = async ({ uid, token }) => {
  const respuesta = await api.post('verificar-email/', { uid, token });
  return respuesta.data;
};

export const reenviarVerificacion = async ({ email }) => {
  const respuesta = await api.post('reenviar-verificacion/', { email });
  return respuesta.data;
};

export const cerrarSesion = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
  localStorage.removeItem('username');
  localStorage.removeItem('user_id');
};

export const obtenerUsuarioActual = () => {
  return localStorage.getItem('username');
};

export const obtenerUsuarioIdActual = () => {
  const valor = localStorage.getItem('user_id');
  return valor ? Number(valor) : null;
};
