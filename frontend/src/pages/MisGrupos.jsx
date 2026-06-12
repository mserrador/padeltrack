import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import api from '../services/api';

const MisGrupos = () => {
  const [grupos, setGrupos] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [sesionesPublicas, setSesionesPublicas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [guardandoGrupo, setGuardandoGrupo] = useState(false);

  const cargarDatos = async () => {
    try {
      const [respuestaGrupos, respuestaPerfil, respuestaSesionesPublicas] = await Promise.all([
        api.get('grupos/'),
        api.get('usuarios/me/'),
        api.get('sesiones-publicas/'),
      ]);

      const data = respuestaGrupos.data;
      const listaGrupos = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.grupos)
            ? data.grupos
            : [];

      const listaSesionesPublicas = Array.isArray(respuestaSesionesPublicas.data)
        ? respuestaSesionesPublicas.data
        : Array.isArray(respuestaSesionesPublicas.data?.results)
          ? respuestaSesionesPublicas.data.results
          : [];

      setGrupos(listaGrupos);
      setPerfil(respuestaPerfil.data);
      setSesionesPublicas(listaSesionesPublicas);
    } catch (error) {
      console.error('Error al cargar el hub:', error);
      setGrupos([]);
      setSesionesPublicas([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const crearGrupo = async (e) => {
    e.preventDefault();
    const nombreLimpio = nombreGrupo.trim();

    if (nombreLimpio.length < 3) {
      alert('El nombre del grupo debe tener al menos 3 caracteres.');
      return;
    }

    setGuardandoGrupo(true);
    try {
      await api.post('grupos/', { nombre: nombreLimpio });
      setNombreGrupo('');
      setMostrarFormulario(false);
      await cargarDatos();
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje = Array.isArray(detalle?.nombre)
        ? detalle.nombre[0]
        : detalle?.detail || 'No se pudo crear el grupo.';
      alert(mensaje);
    } finally {
      setGuardandoGrupo(false);
    }
  };

  if (cargando) {
    return <div className="text-center mt-5"><div className="spinner-border text-success" role="status"></div></div>;
  }

  return (
    <div>
      <div className="panel-head d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Hub</h2>
          <p className="text-muted mb-0">Gestiona tus grupos y descubre sesiones públicas de tu provincia.</p>
        </div>
      </div>

      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold mb-0">Mis Grupos</h3>
          <button className="btn btn-success hub-cta-btn" onClick={() => setMostrarFormulario((v) => !v)}>
            {mostrarFormulario ? 'Cancelar' : '+ Nuevo Grupo'}
          </button>
        </div>

        {mostrarFormulario && (
          <div className="card p-3 mb-4">
            <form onSubmit={crearGrupo}>
              <label className="form-label fw-bold">Nombre del grupo</label>
              <div className="d-flex flex-column flex-md-row gap-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Padel Uni Jueves"
                  value={nombreGrupo}
                  onChange={(e) => setNombreGrupo(e.target.value)}
                  minLength={3}
                  required
                />
                <button type="submit" className="btn btn-success hub-cta-btn" disabled={guardandoGrupo}>
                  {guardandoGrupo ? 'Creando...' : 'Crear grupo'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="row">
          {grupos.length === 0 ? (
            <p className="text-muted text-center">Aún no tienes grupos. ¡Crea uno para empezar a jugar!</p>
          ) : (
            grupos.map((grupo) => (
              <div className="col-12 col-md-6 col-lg-4 mb-3" key={grupo.id}>
                <div className="card shadow-sm h-100 border-0">
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title fw-bold">{grupo.nombre}</h5>
                    <p className="card-text text-muted small mb-4">
                      Creado el: {new Date(grupo.fecha_creacion).toLocaleDateString()}
                    </p>
                    <Link to={`/grupos/${grupo.id}`} className="btn btn-outline-success hub-card-btn mt-auto">
                      Ver Grupo
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
          <div>
            <h3 className="fw-bold mb-1">Sesiones públicas</h3>
            <p className="text-muted mb-0">
              {perfil?.provincia ? `Mostrando sesiones activas de ${perfil.provincia}` : 'Completa tu provincia en el perfil para ver sesiones públicas.'}
            </p>
          </div>
          <Link to="/sesiones-publicas/nueva" className="btn btn-success hub-cta-btn">+ Nueva sesión pública</Link>
        </div>

        {!perfil?.provincia ? (
          <div className="alert alert-warning mb-0">
            Antes de crear o descubrir sesiones públicas, completa tu provincia en <Link to="/perfil">Mi perfil</Link>.
          </div>
        ) : (
          <div className="row">
            {sesionesPublicas.length === 0 ? (
              <p className="text-muted text-center">No hay sesiones públicas activas en tu provincia ahora mismo.</p>
            ) : (
              sesionesPublicas.map((sesion) => (
                <div className="col-12 col-md-6 col-lg-4 mb-3" key={sesion.id}>
                  <div className="card shadow-sm h-100 border-0">
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <h5 className="card-title fw-bold mb-0">{sesion.lugar}</h5>
                        <span className={`badge ${sesion.estado === 'EN_CURSO' ? 'bg-success' : 'bg-secondary'}`}>
                          {sesion.estado.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-muted small mb-2">{new Date(sesion.fecha_hora).toLocaleString()}</p>
                      <p className="text-muted small mb-2">Creador: {sesion.creado_por_username}</p>
                      <p className="text-muted small mb-4">
                        {sesion.confirmados}/{sesion.plazas_maximas} confirmados · {sesion.plazas_disponibles} plazas libres
                      </p>
                      <Link to={`/sesiones-publicas/${sesion.id}`} className="btn btn-outline-success hub-card-btn mt-auto">
                        Ver sesión pública
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default MisGrupos;
