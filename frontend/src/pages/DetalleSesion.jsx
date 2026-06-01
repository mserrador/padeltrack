import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { getUsuarioActual, getUsuarioIdActual } from '../services/authService';
import MarcadorClasico from '../components/MarcadorClasico';
import MarcadorMiniPartido from '../components/MarcadorMiniPartido';
import ResumenEconomico from '../components/ResumenEconomico';
import ResultadosSesion from '../components/ResultadosSesion';

const DetalleSesion = () => {
  const { id } = useParams();
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [puedeEditarSesion, setPuedeEditarSesion] = useState(false);
  const [esAdminGrupo, setEsAdminGrupo] = useState(false);
  const [mostrandoEdicion, setMostrandoEdicion] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [miembrosGrupo, setMiembrosGrupo] = useState([]);
  const [usuarioNuevoAsistente, setUsuarioNuevoAsistente] = useState('');
  const [datosEdicion, setDatosEdicion] = useState({
    lugar: '',
    fecha_hora: '',
    coste_total: '',
  });

  const miUsuarioId = getUsuarioIdActual();
  const miUsername = getUsuarioActual();

  const fechaInputDesdeSesion = (valor) => {
    if (!valor) return '';
    const fecha = new Date(valor);
    const offset = fecha.getTimezoneOffset();
    const local = new Date(fecha.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const cargarPermisosSesion = async (sesionData) => {
    if (!sesionData?.grupo) {
      setPuedeEditarSesion(false);
      return;
    }

    try {
      const respuestaMiembros = await api.get(`grupos/${sesionData.grupo}/miembros/`);
      const miembros = Array.isArray(respuestaMiembros.data) ? respuestaMiembros.data : [];
      setMiembrosGrupo(miembros);
      const miMiembro = miembros.find((m) => m.usuario === miUsuarioId || m.username === miUsername);
      const soyAdmin = Boolean(miMiembro?.es_admin);
      const soyOwner = Number(sesionData.creado_por) === Number(miUsuarioId);
      setEsAdminGrupo(soyAdmin);
      setPuedeEditarSesion(soyAdmin || soyOwner);
    } catch (error) {
      setEsAdminGrupo(false);
      setPuedeEditarSesion(false);
      setMiembrosGrupo([]);
    }
  };

  const fetchSesion = async () => {
    try {
      const respuesta = await api.get(`sesiones/${id}/`);
      const sesionData = respuesta.data;
      setSesion(sesionData);
      setDatosEdicion({
        lugar: sesionData.lugar || '',
        fecha_hora: fechaInputDesdeSesion(sesionData.fecha_hora),
        coste_total: sesionData.coste_total || '',
      });
      await cargarPermisosSesion(sesionData);
    } catch (error) {
      console.error("Error al cargar:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchSesion();
  }, [id]);

  const handleAsistencia = async (estado) => {
    try {
      const miUsuarioIdGuardado = miUsuarioId;
      const asistenciaExistente = sesion.asistentes.find((a) => a.usuario === miUsuarioIdGuardado || a.usuario_nombre === miUsername);

      if (asistenciaExistente) {
        await api.patch(`asistencias/${asistenciaExistente.id}/`, { estado_asistencia: estado });
      } else {
        await api.post('asistencias/', { sesion: id, estado_asistencia: estado });
      }
      fetchSesion();
    } catch (error) {
      console.error("Error al registrar asistencia:", error);
      const detalle = error.response?.data;
      const mensaje =
        detalle?.detail ||
        (Array.isArray(detalle?.usuario) ? detalle.usuario[0] : null) ||
        (Array.isArray(detalle?.sesion) ? detalle.sesion[0] : null) ||
        'No se pudo actualizar la asistencia.';
      alert(mensaje);
    }
  };

  const actualizarAsistenciaDeUsuario = async (asistenteId, estado) => {
    try {
      await api.patch(`asistencias/${asistenteId}/`, { estado_asistencia: estado });
      await fetchSesion();
    } catch (error) {
      const detalle = error.response?.data;
      alert(detalle?.detail || 'No se pudo actualizar la asistencia de este jugador.');
    }
  };

  const agregarAsistente = async (estadoInicial) => {
    if (!usuarioNuevoAsistente) {
      alert('Selecciona un usuario del grupo.');
      return;
    }

    try {
      await api.post('asistencias/', {
        sesion: id,
        usuario: Number(usuarioNuevoAsistente),
        estado_asistencia: estadoInicial,
      });
      setUsuarioNuevoAsistente('');
      await fetchSesion();
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje =
        detalle?.detail ||
        (Array.isArray(detalle?.usuario) ? detalle.usuario[0] : null) ||
        'No se pudo agregar el asistente.';
      alert(mensaje);
    }
  };

  const fechaSesion = sesion?.fecha_hora ? new Date(sesion.fecha_hora) : null;
  const fechaTexto = fechaSesion ? fechaSesion.toLocaleDateString() : 'Pendiente de definir';
  const horaTexto = fechaSesion ? fechaSesion.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pendiente de definir';
  const costeTexto = Number(sesion?.coste_total || 0).toFixed(2);

  const cambiarEstadoSesion = async (nuevoEstado) => {
    if (!puedeEditarSesion) {
      alert('No tienes permisos para cambiar el estado de esta sesión.');
      return;
    }

    const mensaje = nuevoEstado === 'EN_CURSO' 
      ? "¿Activar sesión? Se bloqueará la asistencia." 
      : "¿Finalizar partido e ir a los pagos?";
      
    if(window.confirm(mensaje)) {
      try {
        await api.patch(`sesiones/${id}/`, { estado: nuevoEstado });
        fetchSesion();
      } catch (error) {
        console.error("Error al cambiar estado:", error);
      }
    }
  };

  const guardarEdicionSesion = async (e) => {
    e.preventDefault();
    if (!puedeEditarSesion) {
      alert('No tienes permisos para editar esta sesión.');
      return;
    }

    setGuardandoEdicion(true);
    try {
      await api.patch(`sesiones/${id}/`, {
        lugar: datosEdicion.lugar,
        fecha_hora: datosEdicion.fecha_hora,
        coste_total: datosEdicion.coste_total,
      });
      setMostrandoEdicion(false);
      await fetchSesion();
    } catch (error) {
      const detalle = error.response?.data;
      const mensaje = detalle?.detail || 'No se pudo guardar la edición de la sesión.';
      alert(mensaje);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  if (cargando) return <div className="text-center mt-5"><div className="spinner-border text-success"></div></div>;
  if (!sesion) return <div className="alert alert-danger mt-4">Sesión no encontrada.</div>;

  // Calculamos cuántos han confirmado
  const confirmados = sesion.asistentes?.filter(a => a.estado_asistencia === 'CONFIRMADO') || [];
  const numConfirmados = confirmados.length;
  const idsAsistentes = new Set((sesion.asistentes || []).map((a) => Number(a.usuario)));
  const miembrosSinAsistencia = miembrosGrupo.filter((m) => !idsAsistentes.has(Number(m.usuario)));

  return (
    <div>
      <div className="panel-head mb-4">
        <Link to={`/grupos/${sesion.grupo}`} className="text-decoration-none text-muted mb-2 d-block">← Volver al Grupo</Link>
        <div className="d-flex justify-content-between align-items-center">
          <h2 className="fw-bold mb-0">{sesion.lugar}</h2>
          <span className={`badge rounded-pill fs-6 ${sesion.estado === 'PLANIFICADA' ? 'bg-warning text-dark' : sesion.estado === 'EN_CURSO' ? 'bg-success' : 'bg-secondary'}`}>
            {sesion.estado.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Información de la sesión</h5>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <p className="mb-1 text-muted small">Lugar</p>
              <p className="mb-0 fw-bold">{sesion.lugar || 'Pendiente de definir'}</p>
            </div>
            <div className="col-12 col-md-6">
              <p className="mb-1 text-muted small">Fecha</p>
              <p className="mb-0 fw-bold">{fechaTexto}</p>
            </div>
            <div className="col-12 col-md-6">
              <p className="mb-1 text-muted small">Hora</p>
              <p className="mb-0 fw-bold">{horaTexto}</p>
            </div>
            <div className="col-12 col-md-6">
              <p className="mb-1 text-muted small">Coste total</p>
              <p className="mb-0 fw-bold">{costeTexto} €</p>
            </div>
            <div className="col-12 col-md-6">
              <p className="mb-1 text-muted small">Sesión creada por</p>
              <p className="mb-0 fw-bold">{sesion.creado_por_username || 'No disponible'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ESTADO: PLANIFICADA */}
      {sesion.estado === 'PLANIFICADA' && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h5 className="fw-bold mb-3">Gestión de Asistencia</h5>
            <div className="d-flex gap-2 mb-4">
              <button onClick={() => handleAsistencia('CONFIRMADO')} className="btn btn-outline-success w-100 fw-bold">Voy a ir</button>
              <button onClick={() => handleAsistencia('DECLINADO')} className="btn btn-outline-danger w-100 fw-bold">No puedo</button>
            </div>

            {puedeEditarSesion && (
              <div className="d-flex gap-2 mb-4">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => setMostrandoEdicion((valor) => !valor)}
                >
                  {mostrandoEdicion ? 'Cancelar edición' : 'Editar sesión'}
                </button>
              </div>
            )}

            {mostrandoEdicion && puedeEditarSesion && (
              <form className="card bg-light border-0 p-3 mb-4" onSubmit={guardarEdicionSesion}>
                <div className="mb-2">
                  <label className="form-label fw-bold small text-muted">Lugar</label>
                  <input
                    type="text"
                    className="form-control"
                    value={datosEdicion.lugar}
                    onChange={(e) => setDatosEdicion((previo) => ({ ...previo, lugar: e.target.value }))}
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label fw-bold small text-muted">Fecha y hora</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={datosEdicion.fecha_hora}
                    onChange={(e) => setDatosEdicion((previo) => ({ ...previo, fecha_hora: e.target.value }))}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold small text-muted">Coste total de la pista (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={datosEdicion.coste_total}
                    onChange={(e) => setDatosEdicion((previo) => ({ ...previo, coste_total: e.target.value }))}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary fw-bold" disabled={guardandoEdicion}>
                  {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            )}
            
            <h6 className="fw-bold text-secondary">Apuntados ({numConfirmados})</h6>
            <ul className="list-group list-group-flush mb-4">
              {sesion.asistentes?.map(asistente => (
                <li key={asistente.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <span>{asistente.usuario_nombre}</span>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${asistente.estado_asistencia === 'CONFIRMADO' ? 'bg-success' : asistente.estado_asistencia === 'DECLINADO' ? 'bg-danger' : 'bg-secondary'}`}>{asistente.estado_asistencia}</span>
                    {puedeEditarSesion && (
                      <>
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => actualizarAsistenciaDeUsuario(asistente.id, 'CONFIRMADO')}>
                          Confirmar
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => actualizarAsistenciaDeUsuario(asistente.id, 'DECLINADO')}>
                          Declinar
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => actualizarAsistenciaDeUsuario(asistente.id, 'PENDIENTE')}>
                          Pendiente
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {puedeEditarSesion && miembrosSinAsistencia.length > 0 && (
              <div className="card bg-light border-0 p-3 mb-4">
                <h6 className="fw-bold mb-3">Agregar miembro a la sesión</h6>
                <div className="d-flex flex-column flex-md-row gap-2">
                  <select
                    className="form-select"
                    value={usuarioNuevoAsistente}
                    onChange={(e) => setUsuarioNuevoAsistente(e.target.value)}
                  >
                    <option value="">Seleccionar jugador...</option>
                    {miembrosSinAsistencia.map((miembro) => (
                      <option key={miembro.id} value={miembro.usuario}>{miembro.username}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-outline-success" onClick={() => agregarAsistente('CONFIRMADO')}>
                    Agregar confirmado
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => agregarAsistente('PENDIENTE')}>
                    Agregar pendiente
                  </button>
                </div>
              </div>
            )}

            {puedeEditarSesion && (
              <button onClick={() => cambiarEstadoSesion('EN_CURSO')} className="btn btn-success w-100 py-3 fw-bold fs-5 shadow-sm">
                Iniciar Sesión en Pista
              </button>
            )}
          </div>
        </div>
      )}

      {/* ESTADO: EN_CURSO */}
      {sesion.estado === 'EN_CURSO' && (
        <div className="mb-4">
          {/* Lógica Automática del Marcador */}
          {numConfirmados === 4 ? (
            <MarcadorClasico asistentes={sesion.asistentes} sesionId={sesion.id} recargarSesion={fetchSesion} />
          ) : numConfirmados > 4 ? (
            <MarcadorMiniPartido asistentes={sesion.asistentes} sesion={sesion} recargarSesion={fetchSesion} />
          ) : (
            <div className="alert alert-danger text-center fw-bold shadow-sm">
              No hay suficientes jugadores. Se necesitan al menos 4 confirmados para jugar.
            </div>
          )}

          {puedeEditarSesion && (
            <button onClick={() => cambiarEstadoSesion('FINALIZADA')} className="btn btn-danger w-100 py-3 mt-4 fw-bold shadow-sm">
              Terminar Partido y Calcular Pagos
            </button>
          )}
        </div>
      )}

      {/* ESTADO: FINALIZADA */}
      {sesion.estado === 'FINALIZADA' && (
        <>
          <ResumenEconomico sesion={sesion} recargarSesion={fetchSesion} esAdminGrupo={esAdminGrupo} />
          <ResultadosSesion sesion={sesion} />
        </>
      )}
    </div>
  );
};

export default DetalleSesion;
