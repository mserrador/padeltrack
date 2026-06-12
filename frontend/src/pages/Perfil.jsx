import React, { useEffect, useState } from 'react';

import api from '../services/api';
import { PROVINCIAS_ESPANA } from '../constants/provincias';

const Perfil = () => {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [provincia, setProvincia] = useState('');
  const [datosPassword, setDatosPassword] = useState({
    password_actual: '',
    nueva_password: '',
    confirmar_nueva_password: '',
  });

  useEffect(() => {
    const cargarPerfil = async () => {
      try {
        const respuesta = await api.get('usuarios/me/');
        setPerfil(respuesta.data);
        setProvincia(respuesta.data?.provincia || '');
      } catch (error) {
        console.error('Error al cargar el perfil:', error);
      } finally {
        setCargando(false);
      }
    };

    cargarPerfil();
  }, []);

  const manejarCambioPassword = async (e) => {
    e.preventDefault();
    setGuardandoPassword(true);

    try {
      const respuesta = await api.post('usuarios/cambiar-password/', datosPassword);
      setDatosPassword({
        password_actual: '',
        nueva_password: '',
        confirmar_nueva_password: '',
      });
      alert(respuesta.data?.detail || 'Contraseña actualizada correctamente.');
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje =
        (Array.isArray(detalle?.password_actual) ? detalle.password_actual[0] : null) ||
        (Array.isArray(detalle?.nueva_password) ? detalle.nueva_password[0] : null) ||
        (Array.isArray(detalle?.confirmar_nueva_password) ? detalle.confirmar_nueva_password[0] : null) ||
        (Array.isArray(detalle?.non_field_errors) ? detalle.non_field_errors[0] : null) ||
        detalle?.detail ||
        'No se pudo actualizar la contraseña.';
      alert(mensaje);
    } finally {
      setGuardandoPassword(false);
    }
  };

  const manejarCambioProvincia = async (e) => {
    e.preventDefault();
    setGuardandoPerfil(true);

    try {
      const respuesta = await api.patch('usuarios/me/', { provincia });
      setPerfil(respuesta.data);
      setProvincia(respuesta.data?.provincia || '');
      alert('Provincia actualizada correctamente.');
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje =
        (Array.isArray(detalle?.provincia) ? detalle.provincia[0] : null) ||
        detalle?.detail ||
        'No se pudo actualizar la provincia.';
      alert(mensaje);
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const fechaAlta = perfil?.date_joined ? new Date(perfil.date_joined).toLocaleDateString() : 'No disponible';

  if (cargando) {
    return <div className="text-center mt-5"><div className="spinner-border text-success" role="status"></div></div>;
  }

  return (
    <div className="row g-4">
      <div className="col-12 col-xl-4">
        <div className="card border-0 shadow-sm h-100">
          <div className="card-body p-4">
            <h2 className="fw-bold mb-3">Mi perfil</h2>
            <div className="d-grid gap-3">
              <div>
                <p className="text-muted small mb-1">Usuario</p>
                <p className="fw-bold mb-0">{perfil?.username}</p>
              </div>
              <div>
                <p className="text-muted small mb-1">Correo</p>
                <p className="fw-bold mb-0">{perfil?.email}</p>
              </div>
              <div>
                <p className="text-muted small mb-1">Estado del correo</p>
                <span className={`badge ${perfil?.email_verificado ? 'bg-success' : 'bg-warning text-dark'}`}>
                  {perfil?.email_verificado ? 'Verificado' : 'Pendiente de verificar'}
                </span>
              </div>
              <div>
                <p className="text-muted small mb-1">Miembro desde</p>
                <p className="fw-bold mb-0">{fechaAlta}</p>
              </div>
              <form onSubmit={manejarCambioProvincia}>
                <label className="text-muted small mb-1 d-block">Provincia</label>
                <div className="d-flex flex-column gap-2">
                  <select className="form-select" value={provincia} onChange={(e) => setProvincia(e.target.value)} required>
                    <option value="">Selecciona tu provincia</option>
                    {PROVINCIAS_ESPANA.map((nombreProvincia) => (
                      <option key={nombreProvincia} value={nombreProvincia}>{nombreProvincia}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-outline-success btn-sm align-self-start" disabled={guardandoPerfil}>
                    {guardandoPerfil ? 'Guardando...' : 'Guardar provincia'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-8">
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h3 className="fw-bold mb-4">Resumen de actividad</h3>
            <div className="row g-3">
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-0 bg-light">
                  <div className="card-body">
                    <p className="text-muted small mb-1">Grupos</p>
                    <h4 className="fw-bold mb-0">{perfil?.total_grupos ?? 0}</h4>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-0 bg-light">
                  <div className="card-body">
                    <p className="text-muted small mb-1">Sesiones creadas</p>
                    <h4 className="fw-bold mb-0">{perfil?.total_sesiones_creadas ?? 0}</h4>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-0 bg-light">
                  <div className="card-body">
                    <p className="text-muted small mb-1">Sesiones confirmadas</p>
                    <h4 className="fw-bold mb-0">{perfil?.total_sesiones_confirmadas ?? 0}</h4>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-0 bg-light">
                  <div className="card-body">
                    <p className="text-muted small mb-1">Sesiones finalizadas jugadas</p>
                    <h4 className="fw-bold mb-0">{perfil?.total_sesiones_finalizadas_jugadas ?? 0}</h4>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-0 bg-light">
                  <div className="card-body">
                    <p className="text-muted small mb-1">Pagado en pistas</p>
                    <h4 className="fw-bold mb-0">{perfil?.total_pagado_pistas ?? '0.00'}€</h4>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-0 bg-light">
                  <div className="card-body">
                    <p className="text-muted small mb-1">Bizums enviados</p>
                    <h4 className="fw-bold mb-0">{perfil?.total_bizums_enviados ?? '0.00'}€</h4>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 border-0 bg-light">
                  <div className="card-body">
                    <p className="text-muted small mb-1">Bizums recibidos</p>
                    <h4 className="fw-bold mb-0">{perfil?.total_bizums_recibidos ?? '0.00'}€</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h3 className="fw-bold mb-3">Cambiar contraseña</h3>
            <p className="text-muted small mb-4">
              Usa este formulario cuando recuerdes tu contraseña actual y quieras cambiarla por otra nueva.
            </p>
            <form onSubmit={manejarCambioPassword}>
              <div className="mb-3">
                <label className="form-label">Contraseña actual</label>
                <input
                  type="password"
                  className="form-control"
                  value={datosPassword.password_actual}
                  onChange={(e) => setDatosPassword((previo) => ({ ...previo, password_actual: e.target.value }))}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Nueva contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={datosPassword.nueva_password}
                  onChange={(e) => setDatosPassword((previo) => ({ ...previo, nueva_password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <div className="mb-4">
                <label className="form-label">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  value={datosPassword.confirmar_nueva_password}
                  onChange={(e) => setDatosPassword((previo) => ({ ...previo, confirmar_nueva_password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
              <button type="submit" className="btn btn-success" disabled={guardandoPassword}>
                {guardandoPassword ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
