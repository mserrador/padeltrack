import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { verificarCorreo } from '../services/authService';

const VerificarEmail = () => {
  const [parametrosBusqueda] = useSearchParams();
  const [estado, setEstado] = useState('cargando');
  const [mensaje, setMensaje] = useState('Estamos validando tu enlace de verificación...');

  useEffect(() => {
    const uid = parametrosBusqueda.get('uid');
    const token = parametrosBusqueda.get('token');

    if (!uid || !token) {
      setEstado('error');
      setMensaje('El enlace de verificación no es válido.');
      return;
    }

    const verificarEnlace = async () => {
      try {
        const respuesta = await verificarCorreo({ uid, token });
        setEstado('ok');
        setMensaje(respuesta.detail || 'Correo verificado correctamente. Ya puedes iniciar sesión.');
      } catch (error) {
        const detalle = error.response?.data;
        const texto = detalle?.detail || 'El enlace de verificación no es válido o ha caducado.';
        setEstado('error');
        setMensaje(texto);
      }
    };

    verificarEnlace();
  }, [parametrosBusqueda]);

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow p-4 login-panel text-center">
            <h2 className="mb-3">Verificación de correo</h2>
            {estado === 'cargando' && <div className="spinner-border text-success mb-3" role="status"></div>}
            <p className="text-muted mb-4">{mensaje}</p>
            <Link to="/login" className={`btn ${estado === 'ok' ? 'btn-success' : 'btn-outline-success'} w-100`}>
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificarEmail;
