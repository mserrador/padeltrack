import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import api from '../services/api';
import { obtenerUsuarioActual, obtenerUsuarioIdActual } from '../services/authService';
import MarcadorClasico from '../components/MarcadorClasico';
import MarcadorMiniPartido from '../components/MarcadorMiniPartido';
import ResultadosSesion from '../components/ResultadosSesion';

const DetalleSesionPublica = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const miUsuarioId = obtenerUsuarioIdActual();
  const miUsername = obtenerUsuarioActual();
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [mostrandoEdicion, setMostrandoEdicion] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState({
    lugar: '',
    google_maps_url: '',
    fecha_hora: '',
    coste_total: '',
    plazas_maximas: '',
    descripcion: '',
    pagador: '',
  });

  const fechaInputDesdeSesion = (valor) => {
    if (!valor) return '';
    const fecha = new Date(valor);
    const offset = fecha.getTimezoneOffset();
    const local = new Date(fecha.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const cargarSesion = async () => {
    try {
      const respuesta = await api.get(`sesiones-publicas/${id}/`);
      const data = respuesta.data;
      setSesion(data);
      setDatosEdicion({
        lugar: data.lugar || '',
        google_maps_url: data.google_maps_url || '',
        fecha_hora: fechaInputDesdeSesion(data.fecha_hora),
        coste_total: data.coste_total || '',
        plazas_maximas: data.plazas_maximas || '',
        descripcion: data.descripcion || '',
        pagador: data.pagador || '',
      });
    } catch (error) {
      console.error('Error al cargar la sesión pública:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarSesion();
  }, [id]);

  const miAsistencia = useMemo(
    () => sesion?.asistentes?.find((a) => a.usuario === miUsuarioId || a.usuario_nombre === miUsername),
    [miUsuarioId, miUsername, sesion]
  );
  const esCreador = sesion?.creado_por === miUsuarioId;
  const confirmados = sesion?.asistentes?.filter((a) => a.estado_asistencia === 'CONFIRMADO') || [];
  const numConfirmados = confirmados.length;

  const manejarAsistencia = async (estado) => {
    try {
      if (miAsistencia) {
        await api.patch(`asistencias-sesiones-publicas/${miAsistencia.id}/`, { estado_asistencia: estado });
      } else {
        await api.post('asistencias-sesiones-publicas/', { sesion_publica: id, estado_asistencia: estado });
      }
      await cargarSesion();
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje =
        (Array.isArray(detalle?.estado_asistencia) ? detalle.estado_asistencia[0] : null) ||
        (Array.isArray(detalle?.usuario) ? detalle.usuario[0] : null) ||
        detalle?.detail ||
        'No se pudo actualizar tu asistencia.';
      alert(mensaje);
    }
  };

  const cambiarEstadoSesion = async (nuevoEstado) => {
    try {
      await api.patch(`sesiones-publicas/${id}/`, { estado: nuevoEstado });
      await cargarSesion();
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje =
        (Array.isArray(detalle?.estado) ? detalle.estado[0] : null) ||
        detalle?.detail ||
        'No se pudo cambiar el estado de la sesión pública.';
      alert(mensaje);
    }
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setGuardandoEdicion(true);
    try {
      await api.patch(`sesiones-publicas/${id}/`, {
        lugar: datosEdicion.lugar,
        google_maps_url: datosEdicion.google_maps_url,
        fecha_hora: datosEdicion.fecha_hora,
        coste_total: datosEdicion.coste_total,
        plazas_maximas: datosEdicion.plazas_maximas,
        descripcion: datosEdicion.descripcion,
        ...(sesion.estado === 'FINALIZADA' ? { pagador: datosEdicion.pagador || null } : {}),
      });
      setMostrandoEdicion(false);
      await cargarSesion();
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje =
        (Array.isArray(detalle?.fecha_hora) ? detalle.fecha_hora[0] : null) ||
        (Array.isArray(detalle?.coste_total) ? detalle.coste_total[0] : null) ||
        (Array.isArray(detalle?.plazas_maximas) ? detalle.plazas_maximas[0] : null) ||
        (Array.isArray(detalle?.pagador) ? detalle.pagador[0] : null) ||
        detalle?.detail ||
        'No se pudo guardar la sesión pública.';
      alert(mensaje);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarSesion = async () => {
    if (!window.confirm('¿Seguro que quieres eliminar esta sesión pública?')) return;
    try {
      await api.delete(`sesiones-publicas/${id}/`);
      navigate('/app');
    } catch (error) {
      alert(error.response?.data?.detail || 'No se pudo eliminar la sesión pública.');
    }
  };

  if (cargando) {
    return <div className="text-center mt-5"><div className="spinner-border text-success" role="status"></div></div>;
  }

  if (!sesion) {
    return <div className="alert alert-danger">No se pudo cargar la sesión pública.</div>;
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="fw-bold mb-1">Sesión pública en {sesion.provincia}</h2>
          <p className="text-muted mb-0">Creada por {sesion.creado_por_username}</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {sesion.google_maps_url && (
            <a href={sesion.google_maps_url} target="_blank" rel="noreferrer" className="btn btn-outline-primary">Abrir en Google Maps</a>
          )}
          <Link to="/app" className="btn btn-outline-secondary">Volver al hub</Link>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div>
              <h3 className="fw-bold mb-2">{sesion.lugar}</h3>
              <p className="text-muted mb-2">{new Date(sesion.fecha_hora).toLocaleString()}</p>
              <p className="text-muted mb-2">Estado: {sesion.estado.replace('_', ' ')}</p>
              {sesion.descripcion && <p className="mb-0">{sesion.descripcion}</p>}
            </div>
            {esCreador && sesion.estado === 'PLANIFICADA' && (
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-success" onClick={() => setMostrandoEdicion((previo) => !previo)}>
                  {mostrandoEdicion ? 'Cancelar edición' : 'Editar sesión'}
                </button>
                <button className="btn btn-outline-danger" onClick={eliminarSesion}>Eliminar</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mostrandoEdicion && esCreador && sesion.estado === 'PLANIFICADA' && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body p-4">
            <h4 className="fw-bold mb-3">Editar sesión pública</h4>
            <form onSubmit={guardarEdicion}>
              <div className="mb-3">
                <label className="form-label">Lugar</label>
                <input className="form-control" value={datosEdicion.lugar} onChange={(e) => setDatosEdicion((previo) => ({ ...previo, lugar: e.target.value }))} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Google Maps (opcional)</label>
                <input className="form-control" value={datosEdicion.google_maps_url} onChange={(e) => setDatosEdicion((previo) => ({ ...previo, google_maps_url: e.target.value }))} />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Fecha y hora</label>
                  <input type="datetime-local" className="form-control" value={datosEdicion.fecha_hora} onChange={(e) => setDatosEdicion((previo) => ({ ...previo, fecha_hora: e.target.value }))} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Plazas máximas</label>
                  <input type="number" min="2" step="1" className="form-control" value={datosEdicion.plazas_maximas} onChange={(e) => setDatosEdicion((previo) => ({ ...previo, plazas_maximas: e.target.value }))} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Coste total</label>
                  <input type="number" min="0" step="0.01" className="form-control" value={datosEdicion.coste_total} onChange={(e) => setDatosEdicion((previo) => ({ ...previo, coste_total: e.target.value }))} required />
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label">Descripción</label>
                <textarea className="form-control" rows="4" value={datosEdicion.descripcion} onChange={(e) => setDatosEdicion((previo) => ({ ...previo, descripcion: e.target.value }))}></textarea>
              </div>
              <button type="submit" className="btn btn-success" disabled={guardandoEdicion}>{guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}</button>
            </form>
          </div>
        </div>
      )}

      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-3">Mi asistencia</h4>
              {sesion.estado === 'PLANIFICADA' ? (
                <>
                  <div className="d-flex gap-2 mb-3">
                    <button className="btn btn-outline-success w-100 fw-bold" onClick={() => manejarAsistencia('CONFIRMADO')}>Voy a ir</button>
                    <button className="btn btn-outline-danger w-100 fw-bold" onClick={() => manejarAsistencia('DECLINADO')}>No puedo</button>
                  </div>
                  <p className="text-muted small mb-0">Tu estado actual: <strong>{miAsistencia ? miAsistencia.estado_asistencia.toLowerCase() : 'pendiente'}</strong></p>
                </>
              ) : (
                <p className="text-muted small mb-0">La asistencia está bloqueada porque la sesión ya no está en planificación.</p>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body p-4">
              <h4 className="fw-bold mb-3">Asistentes y coste</h4>
              <p className="text-muted mb-2">Confirmados: {sesion.confirmados}/{sesion.plazas_maximas}</p>
              <p className="text-muted mb-2">Coste total: {sesion.coste_total}€</p>
              <p className="text-muted mb-3">Coste por persona: {sesion.coste_por_persona ? `${sesion.coste_por_persona}€` : 'Pendiente de confirmados'}</p>
              <p className="text-muted mb-4">Pagador: {sesion.pagador_username || 'Sin definir'}</p>

              {esCreador && sesion.estado === 'PLANIFICADA' && (
                <div className="mb-4">
                  <button className="btn btn-success w-100" onClick={() => cambiarEstadoSesion('EN_CURSO')} disabled={numConfirmados < 4}>
                    Iniciar sesión pública
                  </button>
                  {numConfirmados < 4 && <p className="text-muted small mt-2 mb-0 text-center">Se necesitan al menos 4 confirmados para iniciarla.</p>}
                </div>
              )}

              <div className="list-group">
                {sesion.asistentes.map((asistencia) => (
                  <div key={asistencia.id} className="list-group-item fila-responsive">
                    <div className="fila-responsive-info">
                      <span className="texto-largo-fuerte">{asistencia.usuario_nombre}</span>
                    </div>
                    <div className="fila-responsive-acciones">
                      <span className={`badge ${asistencia.estado_asistencia === 'CONFIRMADO' ? 'bg-success' : asistencia.estado_asistencia === 'DECLINADO' ? 'bg-danger' : 'bg-secondary'}`}>
                        {asistencia.estado_asistencia}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {sesion.estado === 'EN_CURSO' && (
        <div className="mt-5">
          {numConfirmados === 4 ? (
            <MarcadorClasico asistentes={sesion.asistentes} sesionPublicaId={sesion.id} recargarSesion={cargarSesion} />
          ) : numConfirmados > 4 ? (
            <MarcadorMiniPartido asistentes={sesion.asistentes} sesionPublica={sesion} recargarSesion={cargarSesion} />
          ) : (
            <div className="alert alert-warning mt-4">No hay suficientes jugadores confirmados para usar el marcador.</div>
          )}

          {esCreador && (
            <div className="mt-4 pt-2">
              <button className="btn btn-danger w-100 py-3 fw-bold" onClick={() => cambiarEstadoSesion('FINALIZADA')}>
                Finalizar sesión pública
              </button>
            </div>
          )}
        </div>
      )}

      {sesion.estado === 'FINALIZADA' && (
        <div className="mt-5">
          <ResultadosSesion sesion={sesion} />
          {esCreador && (
            <div className="card shadow-sm border-0 mt-4">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3">Pagador de la sesión</h4>
                <form onSubmit={guardarEdicion}>
                  <div className="mb-3">
                    <label className="form-label">Selecciona quién pagó la pista</label>
                    <select className="form-select" value={datosEdicion.pagador} onChange={(e) => setDatosEdicion((previo) => ({ ...previo, pagador: e.target.value }))}>
                      <option value="">Sin definir</option>
                      {confirmados.map((asistencia) => (
                        <option key={asistencia.id} value={asistencia.usuario}>{asistencia.usuario_nombre}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-success" disabled={guardandoEdicion}>{guardandoEdicion ? 'Guardando...' : 'Guardar pagador'}</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DetalleSesionPublica;
