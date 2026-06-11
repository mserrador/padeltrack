import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { obtenerUsuarioActual } from '../services/authService';

const RutaProtegida = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const usuario = obtenerUsuarioActual();
  const autenticado = Boolean(token && usuario);

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ desde: location }} />;
  }

  return children;
};

export default RutaProtegida;
